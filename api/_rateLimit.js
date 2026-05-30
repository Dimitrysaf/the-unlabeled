// Shared in-memory rate limiter for Vercel serverless functions.
// State persists across warm instances within the same process but resets on cold starts.

const _hits = new Map(); // ip -> { count, resetAt }

/**
 * Returns true if the given IP has exceeded the rate limit.
 * @param {string} ip
 * @param {{ limit?: number, windowMs?: number }} options
 */
export function isRateLimited(ip, { limit = 10, windowMs = 60_000 } = {}) {
    const now = Date.now();
    const entry = _hits.get(ip);
    if (!entry || now > entry.resetAt) {
        _hits.set(ip, { count: 1, resetAt: now + windowMs });
        return false;
    }
    if (entry.count >= limit) return true;
    entry.count++;
    return false;
}

/** Extracts the real client IP from Vercel request headers. */
export function getClientIp(req) {
    return (
        (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        'unknown'
    );
}
