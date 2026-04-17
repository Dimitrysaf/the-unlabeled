// home.js
import { updateContent } from './components/Layout.js';
import { renderGrid } from './components/Grid.js';
import { sampleArticles } from './data/articles.test.js';

const articles = [];

export function renderHome() {
    const heroHtml = `
        <div>
            <h1 class="ui header">
                Latest stories
                <div class="sub header">No labels. No agenda. Just the logic.</div>
            </h1>
            <div class="ui divider"></div>
        </div>
    `;

    const placeholderHtml = renderGrid([], { columns: 3, loading: true });
    updateContent(heroHtml + placeholderHtml);

    setTimeout(() => {
        const gridHtml = renderGrid(articles, { columns: 3 });
        updateContent(heroHtml + gridHtml);
    }, 150);
}