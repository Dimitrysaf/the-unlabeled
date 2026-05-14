// src/main.js
import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { initLayout, updateNavigation } from './components/Layout.js';
import { initRouter } from './router.js';
import { renderError } from './components/ErrorPage.js';
import { readCookiePreferences } from './lib/cookiePreferences.js';
import { setMetaTags } from './lib/seo.js';
import { registerServiceWorker } from './lib/notifications.js';

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

async function renderPage(fullPath) {
    const path = fullPath.split('?')[0].split('#')[0];

    if (path === '/' || path === '/index.html') {
        setMetaTags({
            title: 'The Unlabeled - Latest Political Stories & Analysis',
            description: 'Stay informed with the latest political analysis, data-driven insights, and evidence-based commentary from The Unlabeled.',
            url: 'https://the-unlabeled.com/'
        });
        const { renderHome } = await import('./home.js');
        await renderHome();
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

document.addEventListener('DOMContentLoaded', async () => {
    // Must run before initLayout so we don't render the wrong page first.
    if (redirectAuthHashIfNeeded()) return;

    initObservabilityIfAllowed();
    registerServiceWorker();
    initLayout();
    initRouter(renderPage, updateNavigation);

    await renderPage(window.location.pathname + window.location.search);
});

window.addEventListener('cookie-consent-updated', () => {
    initObservabilityIfAllowed();
});
