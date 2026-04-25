import { initLayout } from './components/Layout.js';
import { renderHome } from './home.js';
import { renderError } from './components/ErrorPage.js';
import { renderArticlePage } from './pages/a/[url].js';
import { renderAbout } from './pages/about.js';
import { renderLegal } from './pages/legal.js';
import { renderSearch } from './pages/search.js';

document.addEventListener('DOMContentLoaded', async () => {
    initLayout();

    const path = window.location.pathname;

    if (path === '/' || path === '/index.html') {
        renderHome();
    } else if (path.startsWith('/a/')) {
        const slug = path.replace('/a/', '').replace(/\/+$/, '');
        await renderArticlePage(slug);
    } else if (path === '/search') {
        renderSearch();
    } else if (path === '/about') {
        renderAbout();
    } else if (path === '/legal') {
        renderLegal();
    } else {
        renderError('404');
    }
});