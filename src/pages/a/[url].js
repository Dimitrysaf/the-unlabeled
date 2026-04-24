import { updateContent } from '../../components/Layout.js';
import { renderError } from '../../components/ErrorPage.js';
import { sampleArticleContent } from '../../data/articleContent.test.js';

function buildBreadcrumb(title) {
    return `
        <nav class="govuk-breadcrumbs govuk-!-margin-bottom-4" aria-label="Breadcrumb">
            <ol class="govuk-breadcrumbs__list">
                <li class="govuk-breadcrumbs__list-item">
                    <a class="govuk-breadcrumbs__link" href="/">Home</a>
                </li>
                <li class="govuk-breadcrumbs__list-item">
                    <a class="govuk-breadcrumbs__link" href="/">Articles</a>
                </li>
                <li class="govuk-breadcrumbs__list-item" aria-current="page">${title}</li>
            </ol>
        </nav>`;
}

function buildShare() {
    return `
        <div class="share-wrapper">
            <button class="govuk-button govuk-button--secondary" id="share-btn"
                aria-haspopup="true" aria-expanded="false" style="margin-bottom:0;">
                <i class="fa-solid fa-share-nodes" aria-hidden="true"></i> Share
            </button>
            <div class="share-menu" id="share-menu" role="menu">
                <a class="share-menu-item" href="#twitter" role="menuitem">
                    <i class="fa-brands fa-x-twitter" aria-hidden="true"></i> Twitter / X
                </a>
                <a class="share-menu-item" href="#facebook" role="menuitem">
                    <i class="fa-brands fa-facebook" aria-hidden="true"></i> Facebook
                </a>
                <a class="share-menu-item" href="#email" role="menuitem">
                    <i class="fa-solid fa-at" aria-hidden="true"></i> Email
                </a>
                <a class="share-menu-item" href="#link" role="menuitem">
                    <i class="fa-solid fa-link" aria-hidden="true"></i> Copy link
                </a>
            </div>
        </div>`;
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

function buildPage(article) {
    const { title = 'Untitled', subtitle = '', image = '', tags = [], author = {}, date = '', body = [] } = article;

    const imageHtml = image
        ? `<img class="article-image" src="${image}" alt="${title}">`
        : '';

    return `
        ${buildBreadcrumb(title)}
        ${imageHtml}
        <div class="article-meta-row">
            <div style="flex:1;"></div>
            <div>${buildShare()}</div>
        </div>
        <h1 class="govuk-heading-xl govuk-!-margin-bottom-2">${title}</h1>
        ${subtitle ? `<p class="govuk-body-l govuk-!-colour-secondary govuk-!-margin-bottom-4">${subtitle}</p>` : ''}
        <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible">
        ${buildMeta(author, date)}
        ${buildTags(tags)}
        ${buildBody(body)}
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

export function renderArticlePage(slug) {
    const normalized = slug?.toLowerCase?.().trim();
    const article = sampleArticleContent.slug === normalized ? sampleArticleContent : null;

    if (!article) {
        renderError('404');
        return;
    }

    updateContent(buildPage(article));
    initShare();
}