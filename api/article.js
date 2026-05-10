// api/article.js
// Intercepts /a/:slug requests so that social-media crawlers (Slack, Discord,
// Twitter, iMessage, etc.) receive correct Open Graph meta tags in the
// initial HTML response, without requiring JavaScript execution.
//
// Real browsers also hit this function. It fetches index.html from the same
// deployment (via the x-forwarded-host header), swaps in the article meta
// tags, and returns the full SPA so the Vite router initialises normally.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = 'https://the-unlabeled.com';

export default async function handler(req, res) {
    const slug = String(req.query.slug || '').replace(/[^\w-]/g, '');
    if (!slug) {
        res.writeHead(302, { Location: '/' });
        return res.end();
    }

    // Derive the base URL of the current deployment so preview deployments
    // fetch their own index.html (with the correct hashed asset paths).
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host || 'the-unlabeled.com';
    const baseUrl = `${proto}://${host}`;

    const [articleResult, htmlResult] = await Promise.allSettled([
        fetchArticle(slug),
        fetchIndexHtml(baseUrl),
    ]);

    if (htmlResult.status === 'rejected') {
        // Can't get index.html — fall back to plain redirect so the SPA loads.
        res.writeHead(302, { Location: '/' });
        return res.end();
    }

    const article = articleResult.status === 'fulfilled' ? articleResult.value : null;
    const html = injectMeta(htmlResult.value, slug, article);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache 5 min at the CDN edge; serve stale for up to 1 h while revalidating.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).send(html);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchArticle(slug) {
    const url =
        `${SUPABASE_URL}/rest/v1/articles` +
        `?slug=eq.${encodeURIComponent(slug)}` +
        `&is_draft=eq.false` +
        `&select=title,excerpt,image,slug` +
        `&limit=1`;

    const res = await fetch(url, {
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] ?? null;
}

async function fetchIndexHtml(baseUrl) {
    const res = await fetch(`${baseUrl}/index.html`, {
        headers: { Accept: 'text/html' },
    });
    if (!res.ok) throw new Error(`index.html fetch failed: ${res.status}`);
    return res.text();
}

function injectMeta(html, slug, article) {
    const title       = article?.title ? `${article.title} | The Unlabeled` : 'The Unlabeled';
    const description = article?.excerpt ?? 'A political blog and data initiative providing analysis, political facts, and commentary rooted in evidence.';
    const rawImage    = article?.image;
    const image       = rawImage
        ? (rawImage.startsWith('http') ? rawImage : `${SITE_URL}${rawImage}`)
        : `${SITE_URL}/favicon.png`;
    const canonicalUrl = `${SITE_URL}/a/${slug}`;

    return html
        .replace(
            /<title>[^<]*<\/title>/,
            `<title>${e(title)}</title>`)
        .replace(
            /(<meta\s+name="description"\s+content=")[^"]*(")/,
            `$1${e(description)}$2`)
        .replace(
            /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
            `$1${e(canonicalUrl)}$2`)
        .replace(
            /(<meta\s+property="og:type"\s+content=")[^"]*(")/,
            `$1article$2`)
        .replace(
            /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
            `$1${e(canonicalUrl)}$2`)
        .replace(
            /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
            `$1${e(title)}$2`)
        .replace(
            /(<meta\s+property="og:description"[\s\S]*?content=")[^"]*(")/,
            `$1${e(description)}$2`)
        .replace(
            /(<meta\s+property="og:image"\s+content=")[^"]*(")/,
            `$1${e(image)}$2`)
        .replace(
            /(<meta\s+property="twitter:url"\s+content=")[^"]*(")/,
            `$1${e(canonicalUrl)}$2`)
        .replace(
            /(<meta\s+property="twitter:title"\s+content=")[^"]*(")/,
            `$1${e(title)}$2`)
        .replace(
            /(<meta\s+property="twitter:description"[\s\S]*?content=")[^"]*(")/,
            `$1${e(description)}$2`)
        .replace(
            /(<meta\s+property="twitter:image"\s+content=")[^"]*(")/,
            `$1${e(image)}$2`);
}

function e(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
