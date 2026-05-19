// src/main.js
import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { initLayout, updateNavigation, showPageLoading } from './components/Layout.js';
import { initRouter } from './router.js';
import { renderError, renderRetryError, isConnectionError, CONNECTION_ERROR_CAUSES } from './components/ErrorPage.js';
import { readCookiePreferences } from './lib/cookiePreferences.js';
import { setMetaTags } from './lib/seo.js';
import { registerServiceWorker } from './lib/notifications.js';
import { logger } from './lib/logger.js';

const PAGE_LOAD_TIMEOUT_MS = 10_000;

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

/** All routing logic. Called by renderPage inside a timeout race. */
async function _doRender(path, fullPath) {
    if (path === '/' || path === '/index.html') {
        setMetaTags({
            title: 'The Unlabeled - Latest Political Stories & Analysis',
            description: 'Stay informed with the latest political analysis, data-driven insights, and evidence-based commentary from The Unlabeled.',
            url: 'https://the-unlabeled.com/'
        });
        const { renderHome } = await import('./home.js');
        await renderHome();
    } else if (path.startsWith('/a/') && path.endsWith('/history')) {
        const slug = path.replace('/a/', '').replace(/\/history$/, '').replace(/\/+$/, '');
        const searchParams = new URLSearchParams(fullPath.split('?')[1] ?? '');
        setMetaTags({
            title: 'Revision history — The Unlabeled',
            description: 'View the edit history of this article.',
            url: `https://the-unlabeled.com${path}`,
            robots: 'noindex',
        });
        const { renderHistoryPage } = await import('./pages/a/history.js');
        await renderHistoryPage(slug, searchParams);
    } else if (path.startsWith('/a/')) {
        const slug = path.replace('/a/', '').replace(/\/+$/, '');
        const { renderArticlePage } = await import('./pages/a/[url].js');
        await renderArticlePage(slug);
    } else if (path === '/search') {
        setMetaTags({
            title: 'Search Articles - The Unlabeled',
            description: 'Search through our collection of political analysis and data journalism articles.',
            url: 'https://the-unlabeled.com/search'
        });
        const { renderSearch } = await import('./pages/search.js');
        await renderSearch();
    } else if (path === '/request') {
        setMetaTags({
            title: 'Submit a Report - The Unlabeled',
            description: 'Submit a report or tip about corruption and misconduct in Greece.',
            url: 'https://the-unlabeled.com/request'
        });
        const { renderRequest } = await import('./pages/request.js');
        renderRequest();
    } else if (path === '/donate') {
        setMetaTags({
            title: 'Support Us - The Unlabeled',
            description: 'Support The Unlabeled with a one-time or monthly donation via Ko-fi.',
            url: 'https://the-unlabeled.com/donate'
        });
        const { renderDonate } = await import('./pages/donate.js');
        renderDonate();
    } else if (path === '/about') {
        setMetaTags({
            title: 'About Us - The Unlabeled',
            description: 'Learn about our mission to provide evidence-based political analysis and data-driven insights.',
            url: 'https://the-unlabeled.com/about'
        });
        const { renderAbout } = await import('./pages/about.js');
        renderAbout();
    } else if (path === '/legal') {
        setMetaTags({
            title: 'Legal Information - The Unlabeled',
            description: 'Legal notices, terms of service, and privacy policy for The Unlabeled.',
            url: 'https://the-unlabeled.com/legal'
        });
        const { renderLegal } = await import('./pages/legal.js');
        renderLegal();
    } else if (path === '/cookies') {
        setMetaTags({
            title: 'Cookie Policy - The Unlabeled',
            description: 'Information about how we use cookies and your privacy choices.',
            url: 'https://the-unlabeled.com/cookies'
        });
        const { renderCookies } = await import('./pages/cookies.js');
        renderCookies();
    } else if (path === '/login') {
        setMetaTags({
            title: 'Login - The Unlabeled',
            description: 'Sign in to your account on The Unlabeled.',
            url: 'https://the-unlabeled.com/login'
        });
        const { renderLogin } = await import('./pages/login.js');
        await renderLogin();
    } else if (path === '/signup') {
        setMetaTags({
            title: 'Sign Up - The Unlabeled',
            description: 'Create your account on The Unlabeled.',
            url: 'https://the-unlabeled.com/signup'
        });
        const { renderSignup } = await import('./pages/signup.js');
        await renderSignup();
    } else if (path === '/account') {
        setMetaTags({
            title: 'My Account - The Unlabeled',
            description: 'Manage your account settings and preferences.',
            url: 'https://the-unlabeled.com/account'
        });
        const { renderAccount } = await import('./pages/account.js');
        await renderAccount();
    } else if (path === '/account/delete') {
        setMetaTags({
            title: 'Delete Account - The Unlabeled',
            description: 'Request account deletion from The Unlabeled.',
            url: 'https://the-unlabeled.com/account/delete'
        });
        const { renderDeleteAccount } = await import('./pages/delete-account.js');
        await renderDeleteAccount();
    } else if (path.startsWith('/c/')) {
        const field = path.replace('/c/', '').replace(/\/+$/, '');
        setMetaTags({
            title: `Change ${field} - The Unlabeled`,
            description: `Update your ${field} on The Unlabeled.`,
            url: `https://the-unlabeled.com/c/${field}`
        });
        const { renderChange } = await import('./pages/change.js');
        await renderChange(field);
    } else if (path === '/auth/confirm') {
        setMetaTags({
            title: 'Confirm Authentication - The Unlabeled',
            description: 'Complete your authentication process.',
            url: 'https://the-unlabeled.com/auth/confirm'
        });
        const { renderAuthConfirm } = await import('./pages/auth-confirm.js');
        renderAuthConfirm();
    } else if (path === '/admin') {
        setMetaTags({
            title: 'Admin Panel - The Unlabeled',
            description: 'Administrative tools and content management.',
            url: 'https://the-unlabeled.com/admin',
            robots: 'noindex, nofollow'
        });
        const { renderAdmin } = await import('./pages/admin.js');
        await renderAdmin();
    } else {
        setMetaTags({
            title: 'Page Not Found - The Unlabeled',
            description: 'The page you are looking for could not be found.',
            url: window.location.href
        });
        renderError('404');
    }
}

async function renderPage(fullPath) {
    showPageLoading();
    const path = fullPath.split('?')[0].split('#')[0];

    const renderPromise = _doRender(path, fullPath);
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
            () => reject(Object.assign(new Error('Page load timed out'), { isTimeout: true })),
            PAGE_LOAD_TIMEOUT_MS,
        ),
    );

    try {
        await Promise.race([renderPromise, timeoutPromise]);
    } catch (err) {
        // Silence the losing side of the race so it doesn't surface as an
        // unhandled rejection if it settles after we've already shown the error.
        renderPromise.catch(() => {});

        if (err.isTimeout) {
            logger.warn('Page load timed out', { path, timeout: PAGE_LOAD_TIMEOUT_MS });
            renderRetryError({
                title: 'This page is taking too long to load',
                message: 'The page did not load within the expected time.',
                causes: CONNECTION_ERROR_CAUSES,
                onRetry: () => renderPage(fullPath),
            });
        } else if (isConnectionError(err)) {
            logger.warn('Connection error during page load', err);
            renderRetryError({
                title: 'Sorry, there is a problem loading this page',
                message: 'We could not load this page.',
                causes: CONNECTION_ERROR_CAUSES,
                onRetry: () => renderPage(fullPath),
            });
        } else {
            console.error('Page render error:', err);
            renderError('500');
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Must run before initLayout so we don't render the wrong page first.
    if (redirectAuthHashIfNeeded()) return;

    initObservabilityIfAllowed();
    registerServiceWorker();
    initLayout();

    // Init govuk-frontend modules after the layout is in the DOM so elements exist.
    try {
        const { initAll } = await import('https://cdn.jsdelivr.net/npm/govuk-frontend@5.9.0/dist/govuk/govuk-frontend.min.js');
        initAll();
        logger.debug('govuk-frontend modules initialised');
    } catch (e) {
        logger.warn('govuk-frontend init failed', e);
    }

    initRouter(renderPage, updateNavigation);

    const t0 = performance.now();
    await renderPage(window.location.pathname + window.location.search);
    logger.render(window.location.pathname, Math.round(performance.now() - t0));
});

window.addEventListener('cookie-consent-updated', () => {
    initObservabilityIfAllowed();
});
