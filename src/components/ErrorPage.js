// src/components/ErrorPage.js
import { updateContent } from './Layout.js';

const ERROR_MESSAGES = {
    '404': 'The page you are looking for cannot be found.',
    '500': 'Sorry, there is a problem with this service. Try again later.',
    '505': 'The HTTP version is not supported.',
};

/** Renders an error page into the main content area. */
export function renderError(code = 'Unknown') {
    const message = ERROR_MESSAGES[code] || 'An unknown error occurred.';
    updateContent(`
        <div class="govuk-!-padding-top-6">
            <h1 class="govuk-heading-l">
                <span class="govuk-caption-l">Error ${code}</span>
                ${code === '404' ? 'Page not found' : 'Sorry, there is a problem with the service'}
            </h1>
            <p class="govuk-body">${message}</p>
            <ul class="govuk-list govuk-list--bullet">
                <li>If you typed the web address, check it is correct.</li>
                <li>If you pasted the web address, check you copied the entire address.</li>
            </ul>
            <a href="/" class="govuk-button">Go to homepage</a>
        </div>
    `);
}
