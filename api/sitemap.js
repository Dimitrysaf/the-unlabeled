// api/sitemap.js

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const STATIC_PAGES = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/about', changefreq: 'monthly', priority: '0.8' },
    { loc: '/search', changefreq: 'weekly', priority: '0.6' },
    { loc: '/legal', changefreq: 'yearly', priority: '0.3' },
    { loc: '/cookies', changefreq: 'yearly', priority: '0.3' },
];

const BASE_URL = 'https://the-unlabeled.com';

function toW3CDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    try {
        return new Date(dateStr).toISOString().split('T')[0];
    } catch {
        return new Date().toISOString().split('T')[0];
    }
}

function buildXml(staticPages, articles, today) {
    const staticUrls = staticPages.map(({ loc, changefreq, priority }) => `
  <url>
    <loc>${BASE_URL}${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('');

    const articleUrls = articles.map(({ slug, updated_at, published_at }) => `
  <url>
    <loc>${BASE_URL}/a/${slug}</loc>
    <lastmod>${toW3CDate(updated_at || published_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${articleUrls}
</urlset>`;
}

export default async function handler(req, res) {
    try {
        // Fetch all published (non-draft) articles from Supabase
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/articles?is_draft=eq.false&select=slug,updated_at,published_at&order=published_at.desc`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Supabase error: ${response.status}`);
        }

        const articles = await response.json();
        const today = new Date().toISOString().split('T')[0];
        const xml = buildXml(STATIC_PAGES, articles, today);

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        // Cache for 1 hour — fresh enough for new articles, not hammering Supabase
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        res.status(200).send(xml);

    } catch (err) {
        console.error('[sitemap] Failed to generate:', err);
        // Fallback: return static pages only rather than a 500
        const today = new Date().toISOString().split('T')[0];
        const xml = buildXml(STATIC_PAGES, [], today);
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(xml);
    }
}