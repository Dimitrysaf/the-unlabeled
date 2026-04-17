// main.js
import $ from 'jquery';
import { initLayout } from './components/Layout.js';
import { renderHome } from './home.js';
import { renderError } from './components/ErrorPage.js';

$(document).ready(function () {
    initLayout();

    const path = window.location.pathname;

    if (path === '/' || path === '/index.html') {
        renderHome();
    } else {
        renderError('404');
    }
});