import { updateContent } from '../../components/Layout.js';
import { renderError } from '../../components/ErrorPage.js';
import { sampleArticleContent } from '../../data/articleContent.test.js';
import { sampleArticles } from '../../data/articles.test.js';

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
    return `<a class="govuk-back-link" href="/" onclick="event.preventDefault();history.length>1?history.back():location.href='/';">Back</a>`;
}

function buildShare() {
    return `
        <a class="govuk-link" href="#"
            onclick="
                var a=this, old=a.textContent, t=document.createElement('textarea');
                t.value=window.location.href;
                document.body.appendChild(t);
                t.select();
                try { document.execCommand('copy'); a.textContent='Copied!'; } catch(e) {}
                document.body.removeChild(t);
                setTimeout(function(){ a.textContent=old; }, 2000);
                return false;
            ">Copy link</a>`;
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

// Builds the article shell. bodyHtml is either rendered paragraphs or
// arbitrary HTML injected by a code module — the shell does not care which.
function buildPage(article, bodyHtml) {
    const { title = 'Untitled', subtitle = '', image = '', tags = [], author = {}, date = '' } = article;

    const imageHtml = image
        ? `<img class="article-image" style="border-bottom: 3px solid #000;" src="${image}" alt="${title}">`
        : '';

    return `
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

function initShare() {
    const btn = document.getElementById('share-btn');
    const menu = document.getElementById('share-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', e => {
        e.stopPropagation();
        const open = menu.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', () => {
        menu.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
    });
}


// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────

export async function renderArticlePage(slug) {
    const normalized = slug?.toLowerCase?.().trim();

    // Look up metadata from the data layer (future: DB query by slug)
    const articleMeta = sampleArticles.find(a => a.slug === normalized);

    // ── Interactive / code article ──
    if (articleMeta?.codeModule) {
        const loader = MODULE_REGISTRY[articleMeta.codeModule];
        if (!loader) { renderError('404'); return; }

        const mod = await loader();
        updateContent(buildPage(articleMeta, mod.getCalcHTML()));
        initShare();
        mod.initCalc();
        return;
    }

    // ── Text article ── (future: fetch body from DB by slug)
    const article = sampleArticleContent.slug === normalized ? sampleArticleContent : null;
    if (!article) { renderError('404'); return; }

    updateContent(buildPage(article, buildBody(article.body)));
    initShare();
}