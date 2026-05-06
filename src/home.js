import { updateContent } from './components/Layout.js';
import { renderGrid } from './components/Grid.js';
import { getArticles } from './data/articles.js';

export async function renderHome() {
    const heroHtml = `
        <div class="govuk-!-margin-bottom-6">
            <h1 class="govuk-heading-xl">Home</h1>
            <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible">
        </div>
    `;

    // Show skeleton immediately
    updateContent(heroHtml + renderGrid([], { loading: true }));

    try {
        const articles = await getArticles();
        updateContent(heroHtml + renderGrid(articles, { columns: 3 }));
    } catch (err) {
        console.error('[home] failed to load articles:', err);
        updateContent(heroHtml + `
            <div class="govuk-error-summary" role="alert">
                <h2 class="govuk-error-summary__title">There is a problem</h2>
                <div class="govuk-error-summary__body">
                    <p class="govuk-body">Could not load articles. Please try again later.</p>
                </div>
            </div>
        `);
    }
}
