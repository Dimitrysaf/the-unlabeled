// api/send-notifications.js
// Called every 5 minutes by a Supabase pg_cron job via pg_net.
// Finds notifications due to send, pushes them to all subscribers,
// then marks them as sent. Expired subscriptions (410) are auto-removed.

import webpush from 'web-push';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const SITE_URL = 'https://the-unlabeled.com';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

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
  if (!res.ok) throw new Error(`DB error ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (req.headers['x-cron-secret'] !== CRON_SECRET) return res.status(401).end();

  const now = new Date().toISOString();

  const pending = await dbFetch(
    `pending_notifications?select=id,article_id,articles(title,slug,excerpt)&send_at=lte.${now}&sent_at=is.null&cancelled_at=is.null`
  );
  if (!pending?.length) return res.status(200).json({ sent: 0 });

  const subscribers = await dbFetch('push_subscriptions?select=endpoint,p256dh,auth');
  if (!subscribers?.length) {
    for (const n of pending) {
      await dbFetch(`pending_notifications?id=eq.${n.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ sent_at: now })
      });
    }
    return res.status(200).json({ sent: 0 });
  }

  let sent = 0;

  for (const notif of pending) {
    const article = notif.articles;
    const payload = JSON.stringify({
      title: article.title,
      body: article.excerpt || 'A new article is live on The Unlabeled.',
      url: `${SITE_URL}/a/${article.slug}`
    });

    await Promise.allSettled(
      subscribers.map(async sub => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { urgency: 'high', TTL: 86400 }
          );
          sent++;
        } catch (err) {
          if (err.statusCode === 410) {
            await dbFetch(
              `push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
              { method: 'DELETE' }
            );
          }
        }
      })
    );

    await dbFetch(`pending_notifications?id=eq.${notif.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ sent_at: now })
    });
  }

  return res.status(200).json({ sent });
}
