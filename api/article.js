// api/article.js
// Intercepts /a/:slug requests so that:
// - Search engine bots (Google, Bing, etc.) receive full article HTML for indexing
// - Social-media crawlers (Slack, Discord, Twitter) receive correct Open Graph meta tags
// - Real browsers receive the full SPA so the Vite router initialises normally

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = 'https://the-unlabeled.com';

const SEARCH_BOTS = /googlebot|bingbot|yandex|duckduckbot|slurp/i;
const SOCIAL_BOTS = /facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|imessage/i;

export default async function handler(req, res) {
    const slug = String(req.query.slug || '').replace(/[^\w-]/g, '');
    if (!slug) {
        res.writeHead(302, { Location: '/' });
        return res.end();
    }

    const userAgent = req.headers['user-agent'] || '';
    const isSearchBot = SEARCH_BOTS.test(userAgent);
    const isSocialBot = SOCIAL_BOTS.test(userAgent);
    const isBot = isSearchBot || isSocialBot;

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'the-unlabeled.com';
    const baseUrl = `${proto}://${host}`;

    if (isSearchBot) {
        const article = await fetchArticle(slug);

        if (!article) {
            res.writeHead(404);
            return res.end('Not found');
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
        return res.status(200).send(renderArticleHtml(article, slug));
    }

    // Social bots and real browsers: fetch both in parallel
    const [articleResult, htmlResult] = await Promise.allSettled([
        fetchArticle(slug),
        fetchIndexHtml(baseUrl),
    ]);

    if (htmlResult.status === 'rejected') {
        res.writeHead(302, { Location: '/' });
        return res.end();
    }

    const article = articleResult.status === 'fulfilled' ? articleResult.value : null;
    const html = injectMeta(htmlResult.value, slug, article);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).send(html);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchArticle(slug) {
    const url =
        `${SUPABASE_URL}/rest/v1/articles` +
        `?slug=eq.${encodeURIComponent(slug)}` +
        `&is_draft=eq.false` +
        `&select=title,excerpt,image,slug,content,author,created_at` +
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

function renderArticleHtml(article, slug) {
    const title = `${e(article.title)} | The Unlabeled`;
    const canonicalUrl = `${SITE_URL}/a/${slug}`;
    const rawImage = article.image;
    const image = rawImage
        ? (rawImage.startsWith('http') ? rawImage : `${SITE_URL}${rawImage}`)
        : `${SITE_URL}/favicon.png`;

    const dateStr = article.created_at
        ? new Date(article.created_at).toISOString().split('T')[0]
        : '';

    const bodyContent = article.content || '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${e(article.excerpt)}">
  <link rel="canonical" href="${e(canonicalUrl)}">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${e(canonicalUrl)}">
  <meta property="og:title" content="${e(article.title)}">
  <meta property="og:description" content="${e(article.excerpt)}">
  <meta property="og:image" content="${e(image)}">
  <meta property="og:site_name" content="The Unlabeled">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${e(canonicalUrl)}">
  <meta property="twitter:title" content="${e(article.title)}">
  <meta property="twitter:description" content="${e(article.excerpt)}">
  <meta property="twitter:image" content="${e(image)}">

  <!-- Article structured data for Google -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${e(article.title)}",
    "description": "${e(article.excerpt)}",
    "image": "${e(image)}",
    "url": "${e(canonicalUrl)}",
    "datePublished": "${dateStr}",
    "author": {
      "@type": "Person",
      "name": "${e(article.author || 'The Unlabeled')}"
    },
    "publisher": {
      "@type": "Organization",
      "name": "The Unlabeled",
      "url": "${SITE_URL}"
    }
  }
  </script>

  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem 1rem; color: #222; }
    h1 { font-size: 2rem; line-height: 1.2; margin-bottom: 0.5rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
    .content { line-height: 1.7; font-size: 1.1rem; }
    a { color: #1d4e89; }
  </style>
</head>
<body>
  <article>
    <h1>${e(article.title)}</h1>
    <p class="meta">
      ${article.author ? `By ${e(article.author)}` : 'The Unlabeled'}
      ${dateStr ? ` · ${dateStr}` : ''}
    </p>
    <div class="content">${bodyContent}</div>
  </article>

  <script>
    // If a real browser somehow receives this page (rare edge case),
    // redirect them to the SPA version which has the full UI.
    if (typeof window !== 'undefined' && !navigator.userAgent.match(/googlebot|bingbot|yandex/i)) {
      window.location.replace('/a/${slug}?spa=1');
    }
  </script>
</body>
</html>`;
}

function injectMeta(html, slug, article) {
    const title = article?.title ? `${article.title} | The Unlabeled` : 'The Unlabeled';
    const description = article?.excerpt ?? 'A political blog and data initiative providing analysis, political facts, and commentary rooted in evidence.';
    const rawImage = article?.image;
    const image = rawImage
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