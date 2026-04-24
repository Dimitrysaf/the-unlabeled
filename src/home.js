import { updateContent } from './components/Layout.js';
import { renderGrid } from './components/Grid.js';
import { sampleArticles } from './data/articles.test.js';

export function renderHome() {
    const heroHtml = `
        <div class="page-header">
            <h1 class="page-title">Latest stories</h1>
            <p class="page-subtitle">No labels. No agenda. Just the logic.</p>
            <hr class="divider">
        </div>
    `;

    updateContent(heroHtml + renderGrid([], { columns: 3, loading: true }));

    setTimeout(() => {
        updateContent(heroHtml + renderGrid(sampleArticles, { columns: 3 }));
    }, 150);
}