// src/pages/search.js
import { updateContent } from '../components/Layout.js';
import { renderGrid } from '../components/Grid.js';
import { searchArticles } from '../data/articles.js';
import { escapeHtml } from '../lib/escape.js';
import { logger } from '../lib/logger.js';

function renderSearchForm(query = '') {
    return `
        <form class="search-page__form" role="search" action="/search">
            <label class="govuk-visually-hidden" for="search-input">Search articles</label>
            <input
                class="header-search__input search-page__input"
                type="search"
                id="search-input"
                name="q"
                placeholder="Search…"
                autocomplete="off"
                value="${escapeHtml(query)}"
            >
            <button class="header-search__btn search-page__btn" type="submit" aria-label="Search">
                <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false">
                    <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" stroke-width="2"/>
                    <line x1="11.7" y1="11.7" x2="16" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
                </svg>
            </button>
        </form>
        <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible govuk-!-margin-bottom-6">
    `;
}

export async function renderSearch() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';

    const heroHtml = `
        <div class="govuk-!-padding-bottom-9">
            <h1 class="govuk-heading-xl govuk-!-margin-bottom-4">Search</h1>
            ${renderSearchForm(query)}
    `;

    if (!query) {
        updateContent(heroHtml + `
            <p class="govuk-body govuk-!-colour-secondary">Enter a search term above to find articles.</p>
        </div>`);
        return;
    }

    updateContent(heroHtml + renderGrid([], { loading: true }) + '</div>');

    try {
        const results = await searchArticles(query);

        const countLine = results.length
            ? `<p class="govuk-body-s govuk-!-colour-secondary govuk-!-margin-bottom-6">
                   ${results.length} result${results.length === 1 ? '' : 's'} for <strong>"${escapeHtml(query)}"</strong>
               </p>`
            : '';

        const bodyHtml = results.length
            ? renderGrid(results)
            : `<p class="govuk-body">No results found for <strong>"${escapeHtml(query)}"</strong>.</p>
               <ul class="govuk-list govuk-list--bullet govuk-body-s govuk-!-colour-secondary">
                   <li>Check your spelling.</li>
                   <li>Try different or fewer keywords.</li>
               </ul>`;

        updateContent(heroHtml + countLine + `<div class="search-results">${bodyHtml}</div></div>`);
    } catch (err) {
        logger.error('[search] failed', err);
        updateContent(heroHtml + `
            <div class="govuk-error-summary" role="alert">
                <h2 class="govuk-error-summary__title">There is a problem</h2>
                <div class="govuk-error-summary__body">
                    <p class="govuk-body">Could not load search results. Please try again later.</p>
                </div>
            </div>
        </div>`);
    }
}