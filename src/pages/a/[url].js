// src/pages/a/[url].js
import { updateContent } from '../../components/Layout.js';
import { renderError } from '../../components/ErrorPage.js';
import { navigate, getBackSteps } from '../../router.js';
import { getArticleBySlug } from '../../data/articles.js';
import { checkIsAdmin } from '../../data/admin.js';
import { renderMarkdown, renderMarkdownParts } from '../../lib/markdown.js';
import { setMetaTags, addStructuredData } from '../../lib/seo.js';
import { sanitizeHtml } from '../../lib/sanitize.js';
import { escapeHtml, escapeAttr } from '../../lib/escape.js';
import { renderEngagementSection } from '../../components/Comments.js';

// ── Module registry ───────────────────────────────────────────────────────
const MODULE_REGISTRY = {
    'electoral-calc': () => import('../electoral-calc.js'),
};


// ── Builders ──────────────────────────────────────────────────────────────

function buildBreadcrumb() {
    return `<a class="govuk-back-link" href="/" id="article-back-link">Back</a>`;
}

function buildShare(slug) {
    return `
        <span class="article-actions">
            <a class="govuk-link" href="#" id="copy-link-btn" aria-label="Copy link to this article">Copy link</a>
            <a class="govuk-link" href="/a/${slug}/history" id="history-btn" aria-label="View revision history of this article">History</a>
            <a class="govuk-link" href="#" id="print-btn" aria-label="Print this article">Print</a>
        </span>`;
}

function buildTags(tags = []) {
    if (!tags.length) return '';
    return `
        <p class="govuk-!-margin-bottom-4">
            ${tags.map(({ label }) =>
        `<strong class="govuk-tag govuk-tag--blue govuk-!-margin-right-1">${escapeHtml(label)}</strong>`
    ).join('')}
        </p>`;
}

function buildMeta(author, date) {
    if (!author?.name && !date) return '';
    const parts = [];
    if (author?.name) parts.push(`By <strong>${escapeHtml(author.name)}</strong>`);
    if (date) parts.push(`at <strong>${escapeHtml(date)}</strong>`);
    return `
        <p class="article-meta-sidebar__meta govuk-body-s govuk-!-colour-secondary govuk-!-margin-bottom-4">
            ${parts.join(' ')}
        </p>`;
}

function buildDraftBanner(articleId) {
    return `
        <div class="govuk-notification-banner" role="region" aria-labelledby="draft-banner-title"
             data-module="govuk-notification-banner">
            <div class="govuk-notification-banner__header">
                <h2 class="govuk-notification-banner__title" id="draft-banner-title">Draft preview</h2>
            </div>
            <div class="govuk-notification-banner__content">
                <p class="govuk-notification-banner__heading">
                    This article is not published. Only admins can see this page.
                </p>
                <p class="govuk-body govuk-!-margin-bottom-0">
                    <a class="govuk-link" href="/admin?edit=${articleId}">Edit in admin</a>
                </p>
            </div>
        </div>`;
}

function buildMarkdownLayout(bodyHtml, sidebarHtml) {
    return `
        <div class="govuk-grid-row article-markdown-layout">
            <aside class="govuk-grid-column-one-third article-meta-sidebar">
                ${sidebarHtml}
            </aside>
            <div class="govuk-grid-column-two-thirds article-body-column">
                ${bodyHtml}
            </div>
        </div>`;
}

/**
 * Wraps article content.
 * Includes a #article-engagement div at the bottom — populated asynchronously
 * by loadEngagement() after the article body is in the DOM.
 *
 * Vote widget placement:
 *   markdown  → inside .article-meta-sidebar (sticky left column)
 *   other     → inside .article-meta-row__end (far right of the meta row)
 */
function buildPage(article, bodyHtml, options = {}) {
    const { title = 'Untitled', subtitle = '', image = '', tags = [], author = {}, date = '' } = article;
    const sidebarHtml = `${buildMeta(author, date)}${buildTags(tags)}${options.toc || ''}`;

    const imageHtml = image
        ? `<img class="article-image" src="${escapeAttr(image)}" alt="${escapeAttr(title)}">`
        : '';

    const metaRowRight = `<div>${buildShare(article.slug)}</div>`;

    return `
        <div class="article-header-band">
            ${article.is_draft ? buildDraftBanner(article.id) : ''}
            <div class="govuk-width-container article-header-band__inner">
                ${imageHtml}
                <div class="article-meta-row">
                    <div class="article-meta-row__breadcrumb">${buildBreadcrumb()}</div>
                    ${metaRowRight}
                </div>
                <h1 class="govuk-heading-xl govuk-!-margin-bottom-2">${title}</h1>
                ${subtitle ? `<p class="govuk-body-l govuk-!-colour-secondary govuk-!-margin-bottom-4">${subtitle}</p>` : ''}
            </div>
        </div>
        ${options.markdown ? buildMarkdownLayout(bodyHtml, sidebarHtml) : `${sidebarHtml}${bodyHtml}`}
    `;
}

function initArticleActions() {
    const backLink = document.getElementById('article-back-link');
    if (backLink) {
        backLink.addEventListener('click', e => {
            e.preventDefault();
            const steps = getBackSteps(['/history']);
            if (steps > 0) history.go(-steps);
            else navigate('/');
        });
    }

    const copyBtn = document.getElementById('copy-link-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async e => {
            e.preventDefault();
            try {
                await navigator.clipboard.writeText(window.location.href);
                const original = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = original; }, 2000);
            } catch { }
        });
    }

    const printBtn = document.getElementById('print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', e => {
            e.preventDefault();
            window.print();
        });
    }
}

/** Moves .article-header-band outside the govuk-width-container so it can span full width. */
function hoistArticleHeader() {
    const main = document.getElementById('main-content');
    const header = main?.querySelector('.article-header-band');
    const container = main?.querySelector(':scope > .govuk-width-container');
    if (!header || !main || !container) return;
    main.insertBefore(header, container);
}

/**
 * Kick off the engagement section (votes + comments) after the article is
 * in the DOM.  The engagement section loads independently of article content.
 */
function loadEngagement(articleId) {
    const main = document.getElementById('main-content');
    if (!main) return;
    const el = document.createElement('div');
    el.id = 'article-engagement';
    main.appendChild(el);
    renderEngagementSection(articleId, el);
}

function buildLoadingShell() {
    return `
        <div class="govuk-!-padding-top-4">
            <div class="skeleton-line" style="width:40%;height:2rem;margin-bottom:1.5rem;"></div>
            <div class="skeleton-line" style="width:80%;height:1.2rem;margin-bottom:0.5rem;"></div>
            <div class="skeleton-line" style="width:60%;height:1.2rem;"></div>
        </div>`;
}


// ── Entry point ───────────────────────────────────────────────────────────

export async function renderArticlePage(slug) {
    const normalized = slug?.toLowerCase?.().trim();

    updateContent(buildLoadingShell(), { final: false });

    let articleMeta;
    try {
        articleMeta = await getArticleBySlug(normalized);
    } catch (err) {
        console.error('[article] DB lookup failed:', err);
        renderError('500');
        return;
    }

    if (!articleMeta) {
        renderError('404');
        return;
    }

    // SEO
    const articleUrl = `https://the-unlabeled.com/a/${articleMeta.slug}`;
    setMetaTags({
        title: `${articleMeta.title} - The Unlabeled`,
        description: articleMeta.excerpt || articleMeta.subtitle || 'Read this political analysis article on The Unlabeled.',
        url: articleUrl,
        image: articleMeta.image || '/favicon.png',
        type: 'article',
    });

    addStructuredData({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: articleMeta.title,
        description: articleMeta.excerpt || articleMeta.subtitle,
        image: articleMeta.image ? [articleMeta.image] : [],
        datePublished: articleMeta.published_at,
        dateModified: articleMeta.updated_at,
        author: {
            '@type': 'Person',
            name: articleMeta.author?.name || 'The Unlabeled',
        },
        publisher: {
            '@type': 'Organization',
            name: 'The Unlabeled',
            logo: { '@type': 'ImageObject', url: 'https://the-unlabeled.com/favicon.png' },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
        keywords: articleMeta.tags?.map(t => t.label).join(', ') || '',
    });

    if (articleMeta.is_draft) {
        let isAdmin = false;
        try { isAdmin = await checkIsAdmin(); } catch { }
        if (!isAdmin) { renderError('404'); return; }
    }

    // ── 1. Interactive / code article ──
    if (articleMeta.code_module) {
        const loader = MODULE_REGISTRY[articleMeta.code_module];
        if (!loader) { renderError('404'); return; }
        try {
            const mod = await loader();
            updateContent(buildPage(articleMeta, mod.getCalcHTML()));
            hoistArticleHeader();
            initArticleActions();
            mod.initCalc();
            loadEngagement(articleMeta.id);
        } catch (err) {
            console.error('[article] module load failed:', err);
            renderError('500');
        }
        return;
    }

    // ── 2. Markdown content ──
    if (articleMeta.md_content) {
        const { body, toc } = renderMarkdownParts(articleMeta.md_content);
        updateContent(buildPage(
            articleMeta,
            `<div class="article-body">${body}</div>`,
            { markdown: true, toc }
        ));
        hoistArticleHeader();
        initArticleActions();
        loadEngagement(articleMeta.id);
        return;
    }

    // ── 3. Raw HTML content ──
    if (articleMeta.html_content) {
        updateContent(buildPage(
            articleMeta,
            `<div class="article-body">${sanitizeHtml(articleMeta.html_content)}</div>`
        ));
        hoistArticleHeader();
        initArticleActions();
        loadEngagement(articleMeta.id);
        return;
    }

    renderError('404');
}