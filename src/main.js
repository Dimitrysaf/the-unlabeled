import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { initLayout } from './components/Layout.js';
import { renderHome } from './home.js';
import { renderError } from './components/ErrorPage.js';
import { renderArticlePage } from './pages/a/[url].js';
import { renderAbout } from './pages/about.js';
import { renderLegal } from './pages/legal.js';
import { renderSearch } from './pages/search.js';
import { renderLogin } from './pages/login.js';
import { renderSignup } from './pages/signup.js';
import { renderAccount } from './pages/account.js';
import { renderChange } from './pages/change.js';

// Vercel observability — no-ops in local dev, active on Vercel deployments
injectAnalytics();
injectSpeedInsights();

document.addEventListener('DOMContentLoaded', async () => {
    initLayout();

    const path = window.location.pathname;

    if (path === '/' || path === '/index.html') {
        await renderHome();
    } else if (path.startsWith('/a/')) {
        const slug = path.replace('/a/', '').replace(/\/+$/, '');
        await renderArticlePage(slug);
    } else if (path === '/search') {
        await renderSearch();
    } else if (path === '/about') {
        renderAbout();
    } else if (path === '/legal') {
        renderLegal();
    } else if (path === '/login') {
        renderLogin();
    } else if (path === '/signup') {
        renderSignup();
    } else if (path === '/account') {
        await renderAccount();
    } else if (path.startsWith('/c/')) {
        const field = path.replace('/c/', '').replace(/\/+$/, '');
        await renderChange(field);
    } else {
        renderError('404');
    }
});