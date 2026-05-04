import { updateContent } from '../../components/Layout.js';
import { renderError } from '../../components/ErrorPage.js';
import { navigate } from '../../router.js';
import { sampleArticleContent } from '../../data/~articleContent.test.js';
import { getArticleBySlug } from '../../data/articles.js';
import { checkIsAdmin } from '../../data/admin.js';
import { renderMarkdown } from '../../lib/markdown.js';

// ─────────────────────────────────────────────
// MODULE REGISTRY
// ─────────────────────────────────────────────
const MODULE_REGISTRY = {
    'electoral-calc': () => import('../electoral-calc.js'),
};


// ─────────────────────────────────────────────
// SHARED BUILDERS
// ─────────────────────────────────────────────

function buildBreadcrumb() {
    return `<a class="govuk-back-link" href="/" id="article-back-link">Back</a>`;
}

function buildShare() {
    return `
        <span class="article-actions">
            <a class="govuk-link" href="#" id="copy-link-btn" aria-label="Copy link to this article">Copy link</a>
            <a class="govuk-link" href="#" id="print-btn" aria-label="Print this article">Print</a>
        </span>`;
}

function buildTags(tags = []) {
    if (!tags.length) return '';
    return `
        <p class="govuk-!-margin-bottom-4">
            ${tags.map(({ label }) =>
        `<strong class="govuk-tag govuk-tag--blue govuk-!-margin-right-1">${label}</strong>`
    ).join('')}
        </p>`;
}

function buildMeta(author, date) {
    const parts = [];
    if (author?.name) parts.push(`<i class="fa-regular fa-user" aria-hidden="true"></i> ${author.name}`);
    if (date) parts.push(`<i class="fa-regular fa-calendar" aria-hidden="true"></i> ${date}`);
    if (!parts.length) return '';
    return `
        <p class="govuk-body-s govuk-!-colour-secondary govuk-!-margin-bottom-4" style="display:flex; gap:1.5rem; flex-wrap:wrap;">
            ${parts.map(p => `<span>${p}</span>`).join('')}
        </p>`;
}

function buildBody(body = []) {
    return `
        <div class="article-body">
            ${body.map((p, i) => `<p class="govuk-body"${i === 0 ? ' style="font-size:1.1rem;"' : ''}>${p}</p>`).join('')}
        </div>`;
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

function buildPage(article, bodyHtml) {
    const { title = 'Untitled', subtitle = '', image = '', tags = [], author = {}, date = '' } = article;

    const imageHtml = image
        ? `<img class="article-image" style="border-bottom: 3px solid #000;" src="${image}" alt="${title}">`
        : '';

    return `
        ${article.is_draft ? buildDraftBanner(article.id) : ''}
        ${imageHtml}
        <div class="article-meta-row" style="align-items: center;">
            <div style="flex:1;">${buildBreadcrumb()}</div>
            <div>${buildShare()}</div>
        </div>
        <h1 class="govuk-heading-xl govuk-!-margin-bottom-2">${title}</h1>
        ${subtitle ? `<p class="govuk-body-l govuk-!-colour-secondary govuk-!-margin-bottom-4">${subtitle}</p>` : ''}
        <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible">
        ${buildMeta(author, date)}
        ${buildTags(tags)}
        ${bodyHtml}
    `;
}

function setDocumentTitle(title) {
    if (typeof document !== 'undefined') {
        document.title = `The Unlabeled - ${title || 'Untitled'}`;
    }
}

function initArticleActions() {
    const backLink = document.getElementById('article-back-link');
    if (backLink) {
        backLink.addEventListener('click', e => {
            e.preventDefault();
            if (history.length > 1) history.back();
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
            } catch {}
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

function buildLoadingShell() {
    return `
        <div class="govuk-!-padding-top-4">
            <div class="skeleton-line" style="width:40%;height:2rem;margin-bottom:1.5rem;"></div>
            <div class="skeleton-line" style="width:80%;height:1.2rem;margin-bottom:0.5rem;"></div>
            <div class="skeleton-line" style="width:60%;height:1.2rem;"></div>
        </div>`;
}


// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────

export async function renderArticlePage(slug) {
    const normalized = slug?.toLowerCase?.().trim();

    // Show loading skeleton while we hit the DB
    updateContent(buildLoadingShell());

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

    setDocumentTitle(articleMeta.title || 'Untitled');

    if (articleMeta.is_draft) {
        let isAdmin = false;
        try { isAdmin = await checkIsAdmin(); } catch {}
        if (!isAdmin) { renderError('404'); return; }
    }

    // ── Interactive / code article ──
    if (articleMeta.code_module) {
        const loader = MODULE_REGISTRY[articleMeta.code_module];
        if (!loader) { renderError('404'); return; }

        const mod = await loader();
        updateContent(buildPage(articleMeta, mod.getCalcHTML()));
        initArticleActions();
        mod.initCalc();
        return;
    }

    // ── 2. Markdown content ──
    if (articleMeta.md_content) {
        const html = renderMarkdown(articleMeta.md_content);
        updateContent(buildPage(articleMeta, `<div class="article-body">${html}</div>`));
        initArticleActions();
        return;
    }

    // ── 3. Raw HTML content ──
    if (articleMeta.html_content) {
        updateContent(buildPage(articleMeta, `<div class="article-body">${articleMeta.html_content}</div>`));
        initArticleActions();
        return;
    }

    // ── 4. Legacy static text fallback ──
    const article = sampleArticleContent.slug === normalized ? sampleArticleContent : null;
    if (!article) { renderError('404'); return; }

    updateContent(buildPage(article, buildBody(article.body)));
    initArticleActions();
}