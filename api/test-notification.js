// api/test-notification.js
// Sends a test push notification to all subscribers.
// Requires a valid Supabase session belonging to an admin user.

import webpush from 'web-push';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = 'https://the-unlabeled.com';

async function dbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...options.headers
    }
  });
  if (!res.ok) throw new Error(`DB ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const missing = ['VAPID_SUBJECT', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
    .filter(k => !process.env[k]);
  if (missing.length) {
    return res.status(500).json({ error: `Missing env vars: ${missing.join(', ')}` });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  // Verify the token and get the user
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` }
  });
  if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });
  const { id: userId } = await userRes.json();

  // Check admin status
  const admins = await dbFetch(`admin_users?user_id=eq.${userId}&select=id`);
  if (!admins?.length) return res.status(403).json({ error: 'Not admin' });

  const { endpoint } = req.body ?? {};
  if (!endpoint) return res.status(400).json({ error: 'No endpoint provided' });

  const subs = await dbFetch(
    `push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}&select=endpoint,p256dh,auth`
  );
  if (!subs?.length) return res.status(400).json({ error: 'This device is not subscribed to notifications.' });

  const sub = subs[0];
  const payload = JSON.stringify({
    title: 'Test notification',
    body: 'Push notifications are working correctly.',
    url: SITE_URL
  });

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      { urgency: 'high', TTL: 86400 }
    );
  } catch (err) {
    if (err.statusCode === 410) {
      await dbFetch(
        `push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
        { method: 'DELETE' }
      );
      return res.status(400).json({ error: 'Subscription has expired. Please re-enable notifications.' });
    }
    throw err;
  }

  return res.status(200).json({ sent: 1 });
}
