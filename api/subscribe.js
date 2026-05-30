// api/subscribe.js
// Stores or removes a browser push subscription in Supabase.
// Called client-side — no auth required; service_role key used server-side.

import { isRateLimited, getClientIp } from './_rateLimit.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseFetch(path, options) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...options.headers
    }
  });
  return res;
}

export default async function handler(req, res) {
  const ip = getClientIp(req);
  if (isRateLimited(ip, { limit: 10, windowMs: 60_000 })) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (req.method === 'POST') {
    const { endpoint, p256dh, auth } = req.body ?? {};
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    try {
      const u = new URL(endpoint);
      if (u.protocol !== 'https:') return res.status(400).json({ error: 'Invalid endpoint' });
    } catch {
      return res.status(400).json({ error: 'Invalid endpoint' });
    }
    if (p256dh.length > 100 || auth.length > 50) {
      return res.status(400).json({ error: 'Invalid subscription keys' });
    }

    const r = await supabaseFetch('push_subscriptions', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ endpoint, p256dh, auth })
    });
    return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
  }

  if (req.method === 'DELETE') {
    const { endpoint } = req.body ?? {};
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

    const r = await supabaseFetch(
      `push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
      { method: 'DELETE' }
    );
    return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
  }

  res.status(405).end();
}
