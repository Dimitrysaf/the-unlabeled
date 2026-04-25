import { updateContent } from '../components/Layout.js';
import { renderGrid } from '../components/Grid.js';
import { sampleArticles } from '../data/articles.test.js';

function searchArticles(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return sampleArticles.filter(article => {
        const inTitle = article.title?.toLowerCase().includes(q);
        const inExcerpt = article.excerpt?.toLowerCase().includes(q);
        const inSubtitle = article.subtitle?.toLowerCase().includes(q);
        const inTags = article.tags?.some(t => t.label?.toLowerCase().includes(q));
        return inTitle || inExcerpt || inSubtitle || inTags;
    });
}

export function renderSearch() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';
    const results = query ? searchArticles(query) : [];

    let bodyHtml;
    if (!query) {
        bodyHtml = `<p class="govuk-body govuk-!-colour-secondary">Enter a search term above to find articles.</p>`;
    } else if (!results.length) {
        bodyHtml = `
            <p class="govuk-body">No results found for <strong>"${escapeHtml(query)}"</strong>.</p>
            <ul class="govuk-list govuk-list--bullet govuk-body-s govuk-!-colour-secondary">
                <li>Check your spelling.</li>
                <li>Try different or fewer keywords.</li>
            </ul>`;
    } else {
        bodyHtml = renderGrid(results);
    }

    const countLine = results.length
        ? `<p class="govuk-body-s govuk-!-colour-secondary govuk-!-margin-bottom-6">
               ${results.length} result${results.length === 1 ? '' : 's'} for <strong>"${escapeHtml(query)}"</strong>
           </p>`
        : '';

    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <h1 class="govuk-heading-xl govuk-!-margin-bottom-2">Search</h1>
            <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible govuk-!-margin-bottom-4">
            ${countLine}
            <div class="search-results">${bodyHtml}</div>
        </div>
    `);
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}