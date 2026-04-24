import { renderLogo } from './Logo.js';

const menuItems = [
    { label: 'Latest',       link: '#' },
    { label: 'Politics',     link: '#' },
    { label: 'Random Logic', link: '#' },
];

export function initLayout() {
    const app = document.querySelector('#app');

    const navLinksHtml    = menuItems.map(item => `<a class="nav-link" href="${item.link}">${item.label}</a>`).join('');
    const sidebarLinksHtml = menuItems.map(item => `<a class="sidebar-nav-link" href="${item.link}">${item.label}</a>`).join('');

    app.innerHTML = `
        <div class="sidebar-overlay" id="sidebar-overlay"></div>

        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <span class="sidebar-title">MENU</span>
                <button class="sidebar-close" id="sidebar-close" aria-label="Close menu">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <nav class="sidebar-nav">
                ${sidebarLinksHtml}
            </nav>
        </aside>

        <nav class="navbar">
            <div class="container">
                <div class="navbar-inner">
                    <button class="hamburger-btn" id="hamburger-btn" aria-label="Open menu">
                        <i class="fa-solid fa-bars"></i>
                    </button>

                    <div id="main-logo-slot"></div>

                    <div class="nav-links">
                        ${navLinksHtml}
                    </div>

                    <div class="nav-search">
                        <div style="position: relative;">
                            <input class="search-input" type="text" placeholder="Search…" aria-label="Search">
                            <i class="fa-solid fa-magnifying-glass search-icon"></i>
                        </div>
                    </div>
                </div>
            </div>
        </nav>

        <main class="content-area" id="content-slot"></main>

        <footer class="footer">
            <div class="container">
                <div class="footer-inner">
                    <span class="footer-copy">© 2026 THE UNLABELED</span>
                    <div class="footer-links">
                        <a class="footer-link" href="#">Privacy</a>
                        <a class="footer-link" href="#">Terms</a>
                    </div>
                </div>
            </div>
        </footer>
    `;

    renderLogo('#main-logo-slot');
    initSidebar();
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburger = document.getElementById('hamburger-btn');
    const closeBtn  = document.getElementById('sidebar-close');

    function open() {
        sidebar.classList.add('is-open');
        overlay.classList.add('is-visible');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        sidebar.classList.remove('is-open');
        overlay.classList.remove('is-visible');
        document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') close();
    });
}

export function updateContent(html) {
    const slot = document.getElementById('content-slot');
    if (slot) {
        slot.innerHTML = `<div class="container">${html}</div>`;
    }
}