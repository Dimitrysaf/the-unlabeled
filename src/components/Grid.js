const GRID_COLS = { 1: 'card-grid--1', 2: 'card-grid--2', 3: 'card-grid--3', 4: 'card-grid--4' };

function buildTagsHtml(tags = []) {
    if (!tags.length) return '';
    const items = tags.map(({ label }) => `<span class="tag">${label}</span>`).join('');
    return `<div class="card__tags">${items}</div>`;
}

function buildCard({ title, excerpt, image, tags = [], author, date, link = '#' }) {
    const imageHtml = image
        ? `<img class="card__image" src="${image}" alt="${title}">`
        : '';

    const tagsHtml = buildTagsHtml(tags);

    const excerptHtml = excerpt
        ? `<p class="card__excerpt">${excerpt}</p>`
        : '';

    const hasFooter = author?.name || date;
    const footerHtml = hasFooter ? `
        <div class="card__footer">
            ${author?.name ? `
                <span class="card__author">
                    <i class="fa-regular fa-user"></i>
                    <span>${author.name}</span>
                </span>` : ''}
            ${date ? `
                <span class="card__date">
                    <i class="fa-regular fa-calendar"></i>
                    ${date}
                </span>` : ''}
        </div>` : '';

    return `
        <article class="card">
            ${imageHtml}
            <div class="card__body">
                ${tagsHtml}
                <h2 class="card__title">
                    <a href="${link}">${title}</a>
                </h2>
                ${excerptHtml}
            </div>
            ${footerHtml}
        </article>`;
}

function buildSkeleton(columns) {
    return Array(columns).fill(0).map(() => `
        <div class="skeleton-card">
            <div class="skeleton-img"></div>
            <div class="skeleton-body">
                <div class="skeleton-line"></div>
                <div class="skeleton-line skeleton-line--short"></div>
                <div class="skeleton-line skeleton-line--shorter"></div>
            </div>
            <div class="skeleton-footer">
                <div class="skeleton-line skeleton-line--short"></div>
            </div>
        </div>`).join('');
}

export function renderGrid(articles = [], config = {}) {
    const { columns = 3, emptyMessage = 'No articles found.', loading = false } = config;
    const colClass = GRID_COLS[columns] || 'card-grid--3';

    if (loading) {
        return `<div class="card-grid ${colClass}">${buildSkeleton(columns)}</div>`;
    }

    if (!articles.length) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-regular fa-file"></i></div>
                <p class="empty-state-text">${emptyMessage}</p>
            </div>`;
    }

    return `<div class="card-grid ${colClass}">${articles.map(buildCard).join('')}</div>`;
}