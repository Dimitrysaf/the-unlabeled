import { updateContent } from '../../components/Layout.js';
import { renderError } from '../../components/ErrorPage.js';
import { sampleArticleContent } from '../../data/articleContent.test.js';

function buildBreadcrumb(title) {
    return `
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span class="breadcrumb-sep">/</span>
            <a href="/">Articles</a>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-current">${title}</span>
        </nav>`;
}

function buildShare() {
    return `
        <div class="share-wrapper">
            <button class="share-btn" id="share-btn" aria-haspopup="true" aria-expanded="false">
                <i class="fa-solid fa-share-nodes"></i>
                Share
                <i class="fa-solid fa-chevron-down" style="font-size:0.7em;"></i>
            </button>
            <div class="share-menu" id="share-menu" role="menu">
                <a class="share-menu-item" href="#twitter">
                    <i class="fa-brands fa-x-twitter"></i> Twitter / X
                </a>
                <a class="share-menu-item" href="#facebook">
                    <i class="fa-brands fa-facebook"></i> Facebook
                </a>
                <a class="share-menu-item" href="#email">
                    <i class="fa-solid fa-at"></i> E-mail
                </a>
                <a class="share-menu-item" href="#link">
                    <i class="fa-solid fa-link"></i> Copy link
                </a>
            </div>
        </div>`;
}

function buildMeta(author, date) {
    const authorHtml = author?.name
        ? `<span class="article-meta-item">
               <i class="fa-regular fa-user"></i> ${author.name}
           </span>`
        : '';
    const dateHtml = date
        ? `<span class="article-meta-item">
               <i class="fa-regular fa-calendar"></i> ${date}
           </span>`
        : '';
    return (authorHtml || dateHtml)
        ? `<div class="article-meta">${authorHtml}${dateHtml}</div>`
        : '';
}

function buildTags(tags = []) {
    if (!tags.length) return '';
    return `
        <div class="article-tags">
            ${tags.map(({ label }) => `<span class="tag">${label}</span>`).join('')}
        </div>`;
}

function buildBody(body = []) {
    return `<div class="article-body">${body.map(p => `<p>${p}</p>`).join('')}</div>`;
}

function buildPage(article) {
    const { title = 'Untitled', subtitle = '', image = '', tags = [], author = {}, date = '', body = [] } = article;

    const imageHtml = image
        ? `<img class="article-image" src="${image}" alt="${title}">`
        : '';

    return `
        ${imageHtml}
        <div class="article-meta-row">
            <div>${buildBreadcrumb(title)}</div>
            <div>${buildShare()}</div>
        </div>
        <h1 class="article-title">${title}</h1>
        ${subtitle ? `<p class="article-subtitle">${subtitle}</p>` : ''}
        ${buildMeta(author, date)}
        ${buildTags(tags)}
        <hr class="divider">
        ${buildBody(body)}
    `;
}

function initShare() {
    const btn  = document.getElementById('share-btn');
    const menu = document.getElementById('share-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = menu.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', isOpen);
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