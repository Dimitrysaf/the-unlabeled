import { renderLogo } from './Logo.js';

const menuItems = [
    { label: 'Home', link: '/' },
    { label: 'About', link: '/about' },
];

export function initLayout() {
    const app = document.querySelector('#app');
    const currentPath = window.location.pathname;

    const navItemsHtml = menuItems.map(({ label, link }) => {
        const isActive = link !== '#' && (
            link === '/' ? currentPath === '/' : currentPath.startsWith(link)
        );
        return isActive
            ? `<li class="govuk-service-navigation__item govuk-service-navigation__item--active">
                   <a class="govuk-service-navigation__link" href="${link}" aria-current="true">
                       <strong class="govuk-service-navigation__active-fallback">${label}</strong>
                   </a>
               </li>`
            : `<li class="govuk-service-navigation__item">
                   <a class="govuk-service-navigation__link" href="${link}">${label}</a>
               </li>`;
    }).join('');

    app.innerHTML = `
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
}

function _initSearchForm() {
    const form = document.getElementById('header-search-form');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        const q = form.querySelector('input[name="q"]').value.trim();
        if (q) {
            window.location.href = '/search?q=' + encodeURIComponent(q);
        }
    });
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
    }
}