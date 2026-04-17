import { updateContent } from '../../components/Layout.js';
import { sampleArticleContent } from '../../data/articleContent.test.js';

function buildBodyHtml(body = []) {
    return body
        .map(paragraph => `<p>${paragraph}</p>`)
        .join('');
}

function buildTagsHtml(tags = []) {
    if (!tags.length) return '';

    return `
        <div class="ui labels">
            ${tags.map(({ label, color }) => {
                const colorClass = color ? `${color} ` : '';
                return `<a class="ui basic ${colorClass}tag label">${label}</a>`;
            }).join('')}
        </div>`;
}

function buildMetaHtml(author = {}, date = '') {
    const authorHtml = author.name
        ? `<div class="item"><i class="user alternate icon"></i>${author.name}</div>`
        : '';

    const dateHtml = date
        ? `<div class="item"><i class="calendar alternate outline icon"></i>${date}</div>`
        : '';

    return authorHtml || dateHtml
        ? `<div class="ui horizontal list">${authorHtml}${dateHtml}</div>`
        : '';
}

function buildImageHtml(image = '', title = '') {
    if (!image) return '';

    return `
        <div class="ui fluid image">
            <img src="${image}" alt="${title}">
        </div>`;
}

function buildBreadcrumbHtml(title = '') {
    return `
        <div class="ui breadcrumb">
            <a class="section" href="/">Home</a>
            <div class="divider"> / </div>
            <a class="section" href="/">Articles</a>
            <div class="divider"> / </div>
            <div class="active section">${title}</div>
        </div>`;
}

function buildPageHtml(article) {
    const {
        title = 'Untitled article',
        subtitle = '',
        image = '',
        tags = [],
        author = {},
        date = '',
        body = []
    } = article;

    return `
        <div class="ui container">
            ${buildImageHtml(image, title)}
            <div class="ui hidden divider"></div>
            ${buildBreadcrumbHtml(title)}
            <div class="ui hidden divider"></div>
            ${buildTagsHtml(tags)}
            <div class="ui hidden divider"></div>
            <h2 class="ui header">
                ${title}
                ${subtitle ? `<div class="sub header">${subtitle}</div>` : ''}
            </h2>
            <div class="ui hidden divider"></div>
            ${buildMetaHtml(author, date)}
            ${buildBodyHtml(body)}
        </div>`;
}

function renderNotFound(slug) {
    return `
        <div class="ui placeholder segment">
            <h2 class="ui center aligned icon header">
                <i class="circular ban icon"></i>
                Article not found: ${slug}
            </h2>
        </div>`;
}

export function renderArticlePage(slug) {
    const normalizedSlug = slug?.toLowerCase?.().trim();
    const article = sampleArticleContent.slug === normalizedSlug ? sampleArticleContent : null;

    const pageHtml = article ? buildPageHtml(article) : renderNotFound(slug);

    updateContent(pageHtml);
}
