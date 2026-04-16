import $ from 'jquery';
import { initLayout } from './components/Layout.js';
import { renderError } from './components/ErrorPage.js';
import './style.css';

$(document).ready(function () {
    initLayout();

    const path = window.location.pathname;

    if (path === '/' || path === '/index.html') {
    } else {
        renderError('404');
    }
});