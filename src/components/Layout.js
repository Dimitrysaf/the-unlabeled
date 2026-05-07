import { renderLogo } from './Logo.js';
import { getCurrentUser, onAuthStateChange, signOut } from '../lib/auth.js';
import { readCookiePreferences, setSessionCookie, writeCookiePreferences } from '../lib/cookiePreferences.js';
import { checkIsAdmin, clearAdminCache } from '../data/admin.js';
import { navigate } from '../router.js';

const baseMenuItems = [
    { label: 'Home', link: '/' },
    { label: 'About', link: '/about' },
];

let currentUser = null;
let isAdmin = false;
let authLoaded = false;

function getMenuItems() {
    const items = [...baseMenuItems];

    if (!authLoaded) return items;

    if (currentUser) {
        if (isAdmin) {
            items.push({ label: 'Dashboard', link: '/admin' });
        }
        items.push({
            label: 'Account',
            link: '/account',
            type: 'account-link'
        });
    } else {
        items.push({
            label: 'Login',
            link: '/login',
            type: 'auth-link'
        });
    }

    return items;
}

export function initLayout() {
    const app = document.querySelector('#app');
    const currentPath = window.location.pathname;

    // Initialize auth state
    initAuth();

    const navItemsHtml = getMenuItems().map((item) => {
        const isActive = item.link !== '#' && (
            item.link === '/' ? currentPath === '/' : currentPath.startsWith(item.link)
        );

        if (item.type === 'account-link') {
            return `<li class="govuk-service-navigation__item">
                       <a class="govuk-service-navigation__link" href="${item.link}">
                           ${item.label}
                       </a>
                   </li>`;
        }

        return isActive
            ? `<li class="govuk-service-navigation__item govuk-service-navigation__item--active">
                   <a class="govuk-service-navigation__link" href="${item.link}" aria-current="true">
                       <strong class="govuk-service-navigation__active-fallback">${item.label}</strong>
                   </a>
               </li>`
            : `<li class="govuk-service-navigation__item">
                   <a class="govuk-service-navigation__link" href="${item.link}">${item.label}</a>
               </li>`;
    }).join('');

    app.innerHTML = `
        <div class="govuk-cookie-banner" data-nosnippet role="region" aria-label="Cookies on The Unlabeled" id="cookie-banner" hidden>
            <div class="govuk-cookie-banner__message govuk-width-container" id="cookie-banner-choice">
                <div class="govuk-grid-row">
                    <div class="govuk-grid-column-two-thirds">
                        <h2 class="govuk-cookie-banner__heading govuk-heading-m">Cookies on The Unlabeled</h2>
                        <div class="govuk-cookie-banner__content">
                            <p class="govuk-body">We use essential cookies to keep this service secure and working properly.</p>
                            <p class="govuk-body">We would also like to use analytics cookies to understand usage and improve the site.</p>
                        </div>
                    </div>
                </div>
                <div class="govuk-button-group">
                    <button type="button" class="govuk-button" data-module="govuk-button" id="cookie-accept-btn">
                        Accept analytics cookies
                    </button>
                    <button type="button" class="govuk-button" data-module="govuk-button" id="cookie-reject-btn">
                        Reject analytics cookies
                    </button>
                    <a class="govuk-link" href="/cookies">View cookies</a>
                </div>
            </div>

            <div class="govuk-cookie-banner__message govuk-width-container" role="alert" id="cookie-banner-accepted" hidden>
                <div class="govuk-grid-row">
                    <div class="govuk-grid-column-two-thirds">
                        <div class="govuk-cookie-banner__content">
                            <p class="govuk-body">You have accepted analytics cookies. You can change this anytime on the cookies page.</p>
                        </div>
                    </div>
                </div>
                <div class="govuk-button-group">
                    <button type="button" class="govuk-button" data-module="govuk-button" id="cookie-hide-accepted-btn">
                        Hide cookie message
                    </button>
                    <a class="govuk-link" href="/cookies">Change cookie settings</a>
                </div>
            </div>

            <div class="govuk-cookie-banner__message govuk-width-container" role="alert" id="cookie-banner-rejected" hidden>
                <div class="govuk-grid-row">
                    <div class="govuk-grid-column-two-thirds">
                        <div class="govuk-cookie-banner__content">
                            <p class="govuk-body">You have rejected analytics cookies. You can change this anytime on the cookies page.</p>
                        </div>
                    </div>
                </div>
                <div class="govuk-button-group">
                    <button type="button" class="govuk-button" data-module="govuk-button" id="cookie-hide-rejected-btn">
                        Hide cookie message
                    </button>
                    <a class="govuk-link" href="/cookies">Change cookie settings</a>
                </div>
            </div>
        </div>

        <header style="background: #f3f2f1; color: #0b0c0c; padding: 12px 0; border-bottom: 1px solid #d4d2cf;">
            <div class="govuk-width-container">
                <div class="header-inner">
                    ${renderLogo()}
                    <form class="header-search" role="search" id="header-search-form" action="/search">
                        <label class="govuk-visually-hidden" for="site-search">Search articles</label>
                        <input
                            class="header-search__input"
                            type="search"
                            id="site-search"
                            name="q"
                            placeholder="Search…"
                            autocomplete="off"
                            value="${new URLSearchParams(window.location.search).get('q') || ''}"
                        >
                        <button class="header-search__btn" type="submit" aria-label="Search">
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false">
                                <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" stroke-width="2"/>
                                <line x1="11.7" y1="11.7" x2="16" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </header>

        <div class="govuk-service-navigation" data-module="govuk-service-navigation">
            <div class="govuk-width-container">
                <div class="govuk-service-navigation__container">
                    <nav aria-label="Menu" class="govuk-service-navigation__wrapper">
                        <button
                            type="button"
                            class="govuk-service-navigation__toggle govuk-js-service-navigation-toggle"
                            aria-controls="service-navigation"
                            hidden>Menu</button>
                        <ul class="govuk-service-navigation__list" id="service-navigation">
                            ${navItemsHtml}
                        </ul>
                    </nav>
                </div>
            </div>
        </div>

        <main class="content-area govuk-main-wrapper" id="main-content" role="main" tabindex="-1"></main>

        <footer class="govuk-footer">
            <div class="govuk-width-container">
                <div class="govuk-footer__meta">
                    <div class="govuk-footer__meta-item govuk-footer__meta-item--grow">
                        <ul class="govuk-footer__inline-list">
                            <li class="govuk-footer__inline-list-item">
                                <a class="govuk-footer__link" href="/legal#privacy">Privacy</a>
                            </li>
                             <li class="govuk-footer__inline-list-item">
                                <a class="govuk-footer__link" target="_blank" href="https://github.com/Dimitrysaf/the-unlabeled">Source code</a>
                            </li>
                        </ul>
                        <span class="govuk-footer__licence-description">
                            © 2026 The Unlabeled. All rights reserved.
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    `;

    _initSearchForm();
    _initServiceNavFallback();
    _initCookieBanner();
}

function _initSearchForm() {
    const form = document.getElementById('header-search-form');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        const q = form.querySelector('input[name="q"]').value.trim();
        if (q) {
            navigate('/search?q=' + encodeURIComponent(q));
        }
    });
}

function _hideCookieBannerPermanently(currentPrefs) {
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.setAttribute('hidden', '');

    writeCookiePreferences(Boolean(currentPrefs?.analytics), { bannerHidden: true });
}

function _showCookieState(state) {
    const banner = document.getElementById('cookie-banner');
    const choice = document.getElementById('cookie-banner-choice');
    const accepted = document.getElementById('cookie-banner-accepted');
    const rejected = document.getElementById('cookie-banner-rejected');
    if (!banner || !choice || !accepted || !rejected) return;

    banner.removeAttribute('hidden');
    choice.setAttribute('hidden', '');
    accepted.setAttribute('hidden', '');
    rejected.setAttribute('hidden', '');

    if (state === 'choice') choice.removeAttribute('hidden');
    if (state === 'accepted') accepted.removeAttribute('hidden');
    if (state === 'rejected') rejected.removeAttribute('hidden');
}

function _initCookieBanner() {
    const prefs = readCookiePreferences();
    const acceptBtn = document.getElementById('cookie-accept-btn');
    const rejectBtn = document.getElementById('cookie-reject-btn');
    const hideAcceptedBtn = document.getElementById('cookie-hide-accepted-btn');
    const hideRejectedBtn = document.getElementById('cookie-hide-rejected-btn');

    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
            const nextPrefs = writeCookiePreferences(true, { bannerHidden: false });
            _showCookieState('accepted');
            window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: nextPrefs }));
        });
    }

    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => {
            const nextPrefs = writeCookiePreferences(false, { bannerHidden: false });
            _showCookieState('rejected');
            window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: nextPrefs }));
        });
    }

    if (hideAcceptedBtn) {
        hideAcceptedBtn.addEventListener('click', () => {
            _hideCookieBannerPermanently(readCookiePreferences() || { analytics: true, bannerHidden: false });
        });
    }

    if (hideRejectedBtn) {
        hideRejectedBtn.addEventListener('click', () => {
            _hideCookieBannerPermanently(readCookiePreferences() || { analytics: false, bannerHidden: false });
        });
    }

    if (!prefs) {
        _showCookieState('choice');
        return;
    }

    if (prefs.bannerHidden) {
        const banner = document.getElementById('cookie-banner');
        if (banner) banner.setAttribute('hidden', '');
        return;
    }

    _showCookieState(prefs.analytics ? 'accepted' : 'rejected');
}

function initAuth() {
    // Get initial auth state
    getCurrentUser().then(user => {
        currentUser = user;
        setSessionCookie(Boolean(user));
        if (user) {
            checkIsAdmin().then(result => { isAdmin = result; authLoaded = true; updateNavigation(); }).catch(() => { authLoaded = true; updateNavigation(); });
        } else {
            authLoaded = true;
            updateNavigation();
        }
    }).catch(() => {
        currentUser = null;
        authLoaded = true;
        setSessionCookie(false);
        updateNavigation();
    });

    // Listen for auth changes
    onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
        setSessionCookie(Boolean(currentUser));
        if (currentUser) {
            checkIsAdmin().then(result => { isAdmin = result; authLoaded = true; updateNavigation(); }).catch(() => { isAdmin = false; authLoaded = true; updateNavigation(); });
        } else {
            clearAdminCache();
            isAdmin = false;
            authLoaded = true;
            updateNavigation();
        }
    });
}

export function updateNavigation() {
    const navList = document.getElementById('service-navigation');
    if (navList) {
        const currentPath = window.location.pathname;
        const navItemsHtml = getMenuItems().map((item) => {
            const isActive = item.link !== '#' && (
                item.link === '/' ? currentPath === '/' : currentPath.startsWith(item.link)
            );

            if (item.type === 'user-menu') {
                return `<li class="govuk-service-navigation__item user-menu-nav-item">
                           <button class="govuk-service-navigation__link user-menu__button" id="user-menu-btn" aria-haspopup="true" aria-expanded="false">
                               <span class="user-menu__name">${item.label}</span>
                               <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                   <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                               </svg>
                           </button>
                           <div class="user-menu__dropdown" id="user-menu-dropdown" hidden>
                               <button class="user-menu__item" id="sign-out-btn">Sign out</button>
                           </div>
                       </li>`;
            }

            return isActive
                ? `<li class="govuk-service-navigation__item govuk-service-navigation__item--active">
                       <a class="govuk-service-navigation__link" href="${item.link}" aria-current="true">
                           <strong class="govuk-service-navigation__active-fallback">${item.label}</strong>
                       </a>
                   </li>`
                : `<li class="govuk-service-navigation__item">
                       <a class="govuk-service-navigation__link" href="${item.link}">${item.label}</a>
                   </li>`;
        }).join('');

        navList.innerHTML = navItemsHtml;
    }
}

const MOBILE_MQ = window.matchMedia('(max-width: 640px)');

function _initServiceNavFallback() {
    const btn = document.querySelector('.govuk-js-service-navigation-toggle');
    const list = document.getElementById('service-navigation');
    if (!btn || !list) return;

    function applyViewport(e) {
        if (e.matches) {
            btn.removeAttribute('hidden');
            list.setAttribute('hidden', '');
            btn.setAttribute('aria-expanded', 'false');
            btn.textContent = 'Menu';
        } else {
            btn.setAttribute('hidden', '');
            list.removeAttribute('hidden');
        }
    }

    btn.addEventListener('click', () => {
        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
            list.setAttribute('hidden', '');
            btn.setAttribute('aria-expanded', 'false');
            btn.textContent = 'Menu';
        } else {
            list.removeAttribute('hidden');
            btn.setAttribute('aria-expanded', 'true');
            btn.textContent = 'Close menu';
        }
    });

    MOBILE_MQ.addEventListener('change', applyViewport);
    applyViewport(MOBILE_MQ);
}

export function updateContent(html) {
    const slot = document.getElementById('main-content');
    if (slot) {
        slot.innerHTML = `<div class="govuk-width-container">${html}</div>`;
        const top = slot.getBoundingClientRect().top + window.pageYOffset - 60;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
}
