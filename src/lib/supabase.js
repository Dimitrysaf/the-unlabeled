/**
 * Minimal Supabase REST client.
 *
 * Vite exposes env vars prefixed with VITE_ on the client.
 * Add these two to your Vercel project settings (same values as the
 * NEXT_PUBLIC_SUPABASE_URL / SUPABASE_ANON_KEY the integration set):
 *
 *   VITE_SUPABASE_URL   = https://zapruosojosnbdttkvab.supabase.co
 *   VITE_SUPABASE_ANON_KEY = <your anon key>
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
        '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
        'Add them to your .env.local and to Vercel project settings.'
    );
}

const BASE = `${SUPABASE_URL}/rest/v1`;

const HEADERS = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
};

/**
 * GET /rest/v1/{table}
 * @param {string} table
 * @param {Record<string, string>} params  - PostgREST query params
 * @returns {Promise<any[]>}
 */
export async function from(table, params = {}) {
    const qs = new URLSearchParams({ select: '*', ...params }).toString();
    const res = await fetch(`${BASE}/${table}?${qs}`, { headers: HEADERS });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Supabase error ${res.status}: ${body}`);
    }
    return res.json();
}