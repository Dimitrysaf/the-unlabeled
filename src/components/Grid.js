// src/components/Grid.js
import { escapeAttr } from '../lib/escape.js';

function buildCard({ title, excerpt, image, tags = [], author, date, link = '#' }, isHero = false) {
    const category = tags[0]?.label ?? '';
    const meta = [author?.name, date].filter(Boolean).join(' · ');
    const heroClass = isHero ? ' news-card--hero' : '';

    return `
        <article class="news-card${heroClass}">
            <div class="news-card__img-col">
                ${image ? `<img class="news-card__img" src="${image}" alt="${escapeAttr(title)}" loading="lazy">` : ''}
            </div>
            <div class="news-card__body">
                <div class="news-card__meta-top">
                    ${category ? `<span class="news-card__category">${category}</span>` : ''}
                    ${meta ? `<span class="news-card__meta">${meta}</span>` : ''}
                </div>
                <h2 class="govuk-heading-m news-card__title">
                    <a href="/a/${link}" class="govuk-link govuk-link--no-visited-state">${title}</a>
                </h2>
                ${excerpt ? `<p class="govuk-body-s news-card__excerpt">${excerpt}</p>` : ''}
            </div>
        </article>`;
}

function buildSkeletons(n = 3) {
    return Array(n).fill(0).map(() => `
        <div class="news-card news-card--skeleton">
            <div class="news-card__img-col">
                <div class="skeleton-img" style="height:100%;min-height:160px;"></div>
            </div>
            <div class="news-card__body">
                <div class="skeleton-line" style="width:30%;"></div>
                <div class="skeleton-line" style="width:80%;margin-top:.75rem;height:1.3em;"></div>
                <div class="skeleton-line skeleton-line--short" style="height:1.3em;"></div>
                <div class="skeleton-line skeleton-line--shorter" style="margin-top:.75rem;"></div>
            </div>
        </div>`).join('');
}

/** Renders a grid of article cards or a skeleton loader. */
export function renderGrid(articles = [], config = {}) {
    const { loading = false } = config;
    if (loading) return `<div class="news-list">${buildSkeletons(3)}</div>`;
    if (!articles.length) return `<div class="empty-state"><p class="govuk-body">No articles found.</p></div>`;
    const cards = articles.map((article, i) => buildCard(article, i === 0));
    return `<div class="news-list">${cards.join('')}</div>`;
}
