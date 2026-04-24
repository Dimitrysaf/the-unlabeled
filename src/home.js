import { updateContent } from './components/Layout.js';
import { renderGrid } from './components/Grid.js';
import { sampleArticles } from './data/articles.test.js';

export function renderHome() {
    const heroHtml = `
        <div class="govuk-!-margin-bottom-6">
            <h1 class="govuk-heading-xl">Latest stories</h1>
            <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible">
        </div>
    `;

    updateContent(heroHtml + renderGrid([], { columns: 3, loading: true }));

    setTimeout(() => {
        updateContent(heroHtml + renderGrid(sampleArticles, { columns: 3 }));
    }, 150);
}