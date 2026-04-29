import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { initLayout } from './components/Layout.js';
import { renderHome } from './home.js';
import { renderError } from './components/ErrorPage.js';
import { renderArticlePage } from './pages/a/[url].js';
import { renderAbout } from './pages/about.js';
import { renderLegal } from './pages/legal.js';
import { renderCookies } from './pages/cookies.js';
import { renderSearch } from './pages/search.js';
import { renderLogin } from './pages/login.js';
import { renderSignup } from './pages/signup.js';
import { renderAccount } from './pages/account.js';
import { renderChange } from './pages/change.js';
import { renderAuthConfirm } from './pages/auth-confirm.js';
import { readCookiePreferences } from './lib/cookiePreferences.js';

let analyticsInitialized = false;

function initObservabilityIfAllowed() {
    if (analyticsInitialized) return;
    const prefs = readCookiePreferences();
    if (!prefs || !prefs.analytics) return;
    injectAnalytics();
    injectSpeedInsights();
    analyticsInitialized = true;
}

document.addEventListener('DOMContentLoaded', async () => {
    initObservabilityIfAllowed();
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
    } else if (path === '/cookies') {
        renderCookies();
    } else if (path === '/login') {
        await renderLogin();
    } else if (path === '/signup') {
        await renderSignup();
    } else if (path === '/account') {
        await renderAccount();
    } else if (path.startsWith('/c/')) {
        const field = path.replace('/c/', '').replace(/\/+$/, '');
        await renderChange(field);
    } else if (path === '/auth/confirm') {
        renderAuthConfirm();
    } else {
        renderError('404');
    }
});

window.addEventListener('cookie-consent-updated', () => {
    initObservabilityIfAllowed();
});