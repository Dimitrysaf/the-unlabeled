// main.js
import $ from 'jquery';
import { initLayout } from './components/Layout.js';
import { renderHome } from './home.js';
import { renderError } from './components/ErrorPage.js';
import { renderArticlePage } from './pages/a/[url].js';

$(document).ready(function () {
    initLayout();

    const path = window.location.pathname;

    if (path === '/' || path === '/index.html') {
        renderHome();
    } else if (path.startsWith('/a/')) {
        const slug = path.replace('/a/', '').replace(/\/+$/, '');
        renderArticlePage(slug);
    } else {
        renderError('404');
    }
});