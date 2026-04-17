import { updateContent } from '../../components/Layout.js';
import { renderError } from '../../components/ErrorPage.js';
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
        ? `<div class="item" style="display: inline-flex; align-items: flex-end; gap: 0.4em;"><i class="user alternate icon"></i>${author.name}</div>`
        : '';

    const dateHtml = date
        ? `<div class="item" style="display: inline-flex; align-items: flex-end; gap: 0.4em;"><i class="calendar alternate outline icon"></i>${date}</div>`
        : '';

    return authorHtml || dateHtml
        ? `<div class="ui horizontal list" style="display: flex; flex-wrap: wrap; gap: 0.75em; width: 100%; color: rgba(0,0,0,0.45); font-size: 0.85em; align-items: flex-end; margin: 0.5rem 0 0 0;">${authorHtml}${dateHtml}</div>`
        : '';
}

function buildShareHtml() {
    return `
        <div style="max-width: 240px; margin: 0;">
            <div class="ui hidden divider"></div>
            <div class="link example">
                <div class="ui floating dropdown icon button">
                    <i class="share icon"></i>
                    <i class="dropdown icon"></i>
                    <div class="menu">
                        <a class="item" href="#twitter"><i class="twitter icon"></i> Twitter</a>
                        <a class="item" href="#facebook"><i class="facebook square icon"></i> Facebook</a>
                        <a class="item" href="#email"><i class="at icon"></i> E-mail</a>
                        <a class="item" href="#link"><i class="linkify icon"></i> Link</a>
                    </div>
                </div>
            </div>
        </div>`;
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
            <div style="margin: 0.3rem 0;"></div>
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                <div style="flex: 1 1 0; min-width: 0;">
                    ${buildBreadcrumbHtml(title)}
                </div>
                <div style="flex: 0 0 auto;">
                    ${buildShareHtml()}
                </div>
            </div>
            <div style="margin: 0.3rem 0;"></div>
            <h2 class="ui header" style="margin: 0.3rem 0;">
                ${title}
                ${buildMetaHtml(author, date)}
                ${subtitle ? `<div class="sub header" style="margin: 0 0 2rem;">${subtitle}</div>` : ''}
            </h2>
            ${buildBodyHtml(body)}
        </div>`;
}

export function renderArticlePage(slug) {
    const normalizedSlug = slug?.toLowerCase?.().trim();
    const article = sampleArticleContent.slug === normalizedSlug ? sampleArticleContent : null;

    if (!article) {
        renderError('404');
        return;
    }

    const pageHtml = buildPageHtml(article);
    updateContent(pageHtml);

    if (window.$ && window.$('.link.example .dropdown').dropdown) {
        window.$('.link.example .dropdown').dropdown({
            action: 'hide'
        });
    }
}
