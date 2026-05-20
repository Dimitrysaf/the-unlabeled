// src/pages/search.js
import { updateContent } from '../components/Layout.js';
import { renderGrid } from '../components/Grid.js';
import { searchArticles } from '../data/articles.js';
import { escapeHtml } from '../lib/escape.js';
import { logger } from '../lib/logger.js';

export async function renderSearch() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';

    const heroHtml = `
        <div class="govuk-!-padding-bottom-9">
            <h1 class="govuk-heading-xl govuk-!-margin-bottom-2">Search</h1>
            <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible govuk-!-margin-bottom-4">
    `;

    if (!query) {
        updateContent(heroHtml + `
            <p class="govuk-body govuk-!-colour-secondary">Enter a search term above to find articles.</p>
        </div>`);
        return;
    }

    // Skeleton while fetching
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

        updateContent(heroHtml + countLine +
            `<div class="search-results">${bodyHtml}</div></div>`);
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

