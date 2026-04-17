// Layout.js
import { renderLogo } from './Logo.js';

export function initLayout() {
    const app = document.querySelector('#app');

    // Menu items array
    const menuItems = [
        { label: 'Latest', link: '#' },
        { label: 'Politics', link: '#' },
        { label: 'Random Logic', link: '#' }
    ];

    // Generate HTML
    const sidebarHtml = menuItems.map(item => `<a class="item" href="${item.link}">${item.label}</a>`).join('');
    const desktopHtml = menuItems.map(item => `<a class="item hide-on-mobile" href="${item.link}">${item.label}</a>`).join('');

    Object.assign(app.style, {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
    });

    app.innerHTML = `
        <div class="ui vertical sidebar menu" id="mobile-sidebar">
            <a class="item" id="sidebar-close">
                <i class="close icon"></i>
                Close
            </a>
            ${sidebarHtml}
        </div>

        <div class="pusher" style="display: flex; flex-direction: column; min-height: 100vh; flex: 1;">
            
            <nav id="navbar" class="ui attached menu" style="flex-shrink: 0;">
                <div class="ui container">
                    <a class="item" id="sidebar-trigger">
                        <i class="hamburger icon"></i>
                    </a>

                    <div id="main-logo-slot"></div>
                    
                    ${desktopHtml}

                    <div class="right menu">
                        <div class="item">
                            <div class="ui transparent icon input">
                                <input type="text" placeholder="Search...">
                                <i class="search link icon"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <main id="content-slot" style="flex: 1 0 auto;">
            </main>

            <footer class="ui vertical segment" style="flex-shrink: 0; margin-top: auto; border-top: 1px solid rgba(34,36,38,.1); padding: 1em 0;">
                <div class="ui container">
                    <div style="display: flex; justify-content: space-between; align-items: center; color: rgba(0,0,0,0.5); font-size: 0.9em;">
                        <span>© 2026 THE UNLABELED</span>
                        <div class="ui horizontal list">
                            <a class="item" href="#">Privacy</a>
                            <a class="item" href="#">Terms</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>

        <style>
            @media only screen and (max-width: 767px) {
                .hide-on-mobile { display: none !important; }
                #content-slot > .ui.container {
                    width: auto !important;
                    margin: 0 !important;
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                }
                #content-slot > .ui.container > * {
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                }
            }
            @media only screen and (min-width: 768px) {
                #sidebar-trigger { display: none !important; }
            }
        </style>
    `;

    renderLogo('#main-logo-slot');

    $('#sidebar-trigger').on('click', function () {
        $('#mobile-sidebar').sidebar('setting', 'transition', 'overlay').sidebar('toggle');
    });

    $('#sidebar-close').on('click', function () {
        $('#mobile-sidebar').sidebar('hide');
    });
}

export function updateContent(htmlContent) {
    const slot = document.querySelector('#content-slot');
    if (slot) {
        slot.innerHTML = `<div class="ui container" style="padding: 2em 0;">${htmlContent}</div>`;
    }
}