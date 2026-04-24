import { renderLogo } from './Logo.js';

const menuItems = [
    { label: 'Home', link: '/' },
    { label: 'Electoral Calculator', link: '/electoral-calc' },
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
                ${renderLogo()}
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