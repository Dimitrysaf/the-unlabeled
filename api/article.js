// api/article.js

import { marked } from 'marked';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = 'https://the-unlabeled.com';

const CRAWLERS = /googlebot|bingbot|yandex|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot/i;

export default async function handler(req, res) {
    const slug = String(req.query.slug || '').replace(/[^\w-]/g, '');
    if (!slug) {
        res.writeHead(302, { Location: '/' });
        return res.end();
    }

    const userAgent = req.headers['user-agent'] || '';
    const isCrawler = CRAWLERS.test(userAgent);

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'the-unlabeled.com';
    const baseUrl = `${proto}://${host}`;

    if (isCrawler) {
        const article = await fetchArticle(slug);

        if (!article || article.is_draft) {
            res.writeHead(404);
            return res.end('Not found');
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).send(renderArticleHtml(article, slug));
    }

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
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).send(html);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchArticle(slug) {
    const url =
        `${SUPABASE_URL}/rest/v1/articles` +
        `?slug=eq.${encodeURIComponent(slug)}` +
        `&select=id,title,subtitle,excerpt,image,slug,is_draft,` +
        `md_content,html_content,code_module,` +
        `author,published_at,updated_at,tags` +
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
    const buf = await res.arrayBuffer();
    return new TextDecoder('utf-8').decode(buf);
}

function resolveBodyHtml(article) {
    if (article.md_content) {
        return marked.parse(article.md_content);
    }
    if (article.html_content) {
        return article.html_content;
    }
    if (article.code_module) {
        return `<p>${e(article.excerpt || article.subtitle || '')}</p>
                <p><em>This article contains an interactive tool. Visit the full page to use it.</em></p>`;
    }
    return '';
}

function renderArticleHtml(article, slug) {
    const title = `${e(article.title)} | The Unlabeled`;
    const canonicalUrl = `${SITE_URL}/a/${slug}`;
    const rawImage = article.image;
    const image = rawImage
        ? (rawImage.startsWith('http') ? rawImage : `${SITE_URL}${rawImage}`)
        : `${SITE_URL}/favicon.png`;

    const publishedDate = article.published_at
        ? new Date(article.published_at).toISOString().split('T')[0]
        : '';
    const modifiedDate = article.updated_at
        ? new Date(article.updated_at).toISOString().split('T')[0]
        : '';

    const authorName = article.author?.name || 'The Unlabeled';

    const tags = Array.isArray(article.tags)
        ? article.tags.map(t => e(t.label)).join(', ')
        : '';

    const bodyHtml = resolveBodyHtml(article);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${e(article.excerpt || article.subtitle || '')}">
  <link rel="canonical" href="${e(canonicalUrl)}">
  ${tags ? `<meta name="keywords" content="${tags}">` : ''}

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${e(canonicalUrl)}">
  <meta property="og:title" content="${e(article.title)}">
  <meta property="og:description" content="${e(article.excerpt || article.subtitle || '')}">
  <meta property="og:image" content="${e(image)}">
  <meta property="og:site_name" content="The Unlabeled">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${e(canonicalUrl)}">
  <meta property="twitter:title" content="${e(article.title)}">
  <meta property="twitter:description" content="${e(article.excerpt || article.subtitle || '')}">
  <meta property="twitter:image" content="${e(image)}">

  <!-- Schema.org structured data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${e(article.title)}",
    "description": "${e(article.excerpt || article.subtitle || '')}",
    "image": "${e(image)}",
    "url": "${e(canonicalUrl)}",
    "datePublished": "${publishedDate}",
    "dateModified": "${modifiedDate}",
    "author": {
      "@type": "Person",
      "name": "${e(authorName)}"
    },
    "publisher": {
      "@type": "Organization",
      "name": "The Unlabeled",
      "url": "${SITE_URL}",
      "logo": {
        "@type": "ImageObject",
        "url": "${SITE_URL}/favicon.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${e(canonicalUrl)}"
    }
    ${tags ? `,"keywords": "${tags}"` : ''}
  }
  </script>

</head>
<body>
  <article>
    ${rawImage ? `<img src="${e(image)}" alt="${e(article.title)}" style="width:100%;max-height:400px;object-fit:cover;margin-bottom:1.5rem;">` : ''}

    <h1>${e(article.title)}</h1>

    ${article.subtitle ? `<p style="font-size:1.15rem;color:#444;margin-bottom:1rem;">${e(article.subtitle)}</p>` : ''}

    <p class="meta">
      By <strong>${e(authorName)}</strong>
      ${publishedDate ? ` · ${publishedDate}` : ''}
    </p>

    ${tags ? `<p class="tags">${article.tags.map(t => `<span class="tag">${e(t.label)}</span>`).join('')
            }</p>` : ''}

    <div class="content">
      ${bodyHtml}
    </div>
  </article>

  <p class="site-link">
    Read more at <a href="${SITE_URL}">${SITE_URL}</a>
  </p>
</body>
</html>`;
}

function injectMeta(html, slug, article) {
    const title = article?.title ? `${article.title} | The Unlabeled` : 'The Unlabeled';
    const description = article?.excerpt ?? article?.subtitle ?? 'A political blog and data initiative providing analysis, political facts, and commentary rooted in evidence.';
    const rawImage = article?.image;
    const image = rawImage
        ? (rawImage.startsWith('http') ? rawImage : `${SITE_URL}${rawImage}`)
        : `${SITE_URL}/favicon.png`;
    const canonicalUrl = `${SITE_URL}/a/${slug}`;

    return html
        .replace(/<title>[^<]*<\/title>/,
            `<title>${e(title)}</title>`)
        .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/,
            `$1${e(description)}$2`)
        .replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/,
            `$1${e(canonicalUrl)}$2`)
        .replace(/(<meta\s+property="og:type"\s+content=")[^"]*(")/,
            `$1article$2`)
        .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/,
            `$1${e(canonicalUrl)}$2`)
        .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/,
            `$1${e(title)}$2`)
        .replace(/(<meta\s+property="og:description"[\s\S]*?content=")[^"]*(")/,
            `$1${e(description)}$2`)
        .replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/,
            `$1${e(image)}$2`)
        .replace(/(<meta\s+property="twitter:url"\s+content=")[^"]*(")/,
            `$1${e(canonicalUrl)}$2`)
        .replace(/(<meta\s+property="twitter:title"\s+content=")[^"]*(")/,
            `$1${e(title)}$2`)
        .replace(/(<meta\s+property="twitter:description"[\s\S]*?content=")[^"]*(")/,
            `$1${e(description)}$2`)
        .replace(/(<meta\s+property="twitter:image"\s+content=")[^"]*(")/,
            `$1${e(image)}$2`);
}

function e(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}