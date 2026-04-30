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
import { renderDeleteAccount } from './pages/delete-account.js';
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

/**
 * If a Supabase auth hash fragment (type=, error=, message=) lands on any
 * page other than /auth/confirm — e.g. because the email was generated before
 * the Site URL was updated — forward to the confirm page so the user still
 * sees proper feedback instead of a blank/home screen.
 */
function redirectAuthHashIfNeeded() {
    const hash = window.location.hash.slice(1);
    if (!hash) return false;

    const params = new URLSearchParams(hash);
    const isAuthHash =
        params.has('type') ||
        params.has('error') ||
        params.has('message') ||
        params.has('access_token');

    if (isAuthHash && window.location.pathname !== '/auth/confirm') {
        window.location.replace('/auth/confirm' + window.location.hash);
        return true;
    }
    return false;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Must run before initLayout so we don't render the wrong page first.
    if (redirectAuthHashIfNeeded()) return;

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
    } else if (path === '/account/delete') {
        await renderDeleteAccount();
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