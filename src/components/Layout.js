import { renderLogo } from './Logo.js';

const menuItems = [
    { label: 'Latest', link: '/' },
    { label: 'Politics', link: '#' },
    { label: 'Random Logic', link: '#' },
    { label: 'Electoral Calc', link: '/electoral-calc' },
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
        <header class="govuk-header" role="banner" data-module="govuk-header">
            <div class="govuk-header__container govuk-width-container">
                <div class="govuk-header__logo">
                    ${renderLogo()}
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
                                <a class="govuk-footer__link" href="#">Privacy</a>
                            </li>
                            <li class="govuk-footer__inline-list-item">
                                <a class="govuk-footer__link" href="#">Terms</a>
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

    _initServiceNavFallback();
}

// Fallback toggle for when the govuk-frontend CDN JS hasn't initialised yet
function _initServiceNavFallback() {
    const btn = document.querySelector('.govuk-js-service-navigation-toggle');
    const list = document.getElementById('service-navigation');
    if (!btn || !list) return;

    btn.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', () => {
        const open = list.classList.toggle('govuk-service-navigation__list--open');
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? 'Close menu' : 'Menu';
    });
}

export function updateContent(html) {
    const slot = document.getElementById('main-content');
    if (slot) {
        slot.innerHTML = `<div class="govuk-width-container">${html}</div>`;
    }
}