// src/components/ErrorPage.js
import { updateContent } from './Layout.js';

const ERROR_MESSAGES = {
    '404': 'The page you are looking for cannot be found.',
    '500': 'Sorry, there is a problem with this service. Try again later.',
    '505': 'The HTTP version is not supported.',
};

/** Possible causes shown on connection/timeout error pages. */
export const CONNECTION_ERROR_CAUSES = [
    'you are not connected to the internet',
    'your internet connection is slow or unstable',
    'the page took too long to load',
    'the service is temporarily unavailable',
];

/**
 * Returns true when the error is likely a network or connectivity issue.
 * Used to decide whether to show the retry page instead of a generic 500.
 */
export function isConnectionError(err) {
    if (!navigator.onLine) return true;
    const msg = (err?.message ?? '').toLowerCase();
    return (
        err?.name === 'AbortError' ||
        msg.includes('failed to fetch') ||
        msg.includes('networkerror') ||
        msg.includes('network error') ||
        msg.includes('load failed') ||
        msg.includes('lock')
    );
}

/** Renders a standard HTTP error page into the main content area. */
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

/**
 * Renders a recoverable error page with a "Try again" button.
 * Follows the GOV.UK "problem with the service" pattern.
 *
 * @param {object}   opts
 * @param {string}   opts.message   Body text describing what went wrong.
 * @param {Function} opts.onRetry   Called when the user clicks "Try again".
 * @param {string}   [opts.title]   Override the default heading.
 * @param {string[]} [opts.causes]  Optional list of possible causes (plain text).
 */
export function renderRetryError({ message, onRetry, title = 'Sorry, there is a problem', causes }) {
    const causesHtml = causes?.length ? `
                <p class="govuk-body">This could be because:</p>
                <ul class="govuk-list govuk-list--bullet">
                    ${causes.map(c => `<li>${c}</li>`).join('\n                    ')}
                </ul>` : '';

    updateContent(`
        <div class="govuk-!-padding-top-6">
            <h1 class="govuk-heading-l">${title}</h1>
            <p class="govuk-body">${message}</p>
            ${causesHtml}
            <p class="govuk-body">
                Try again. If the problem keeps happening, check your internet connection or
                <a class="govuk-link" href="/">go to the homepage</a>.
            </p>
            <div class="govuk-button-group">
                <button class="govuk-button" id="error-retry-btn">Try again</button>
                <a class="govuk-link" href="/">Go to homepage</a>
            </div>
        </div>
    `);

    document.getElementById('error-retry-btn')?.addEventListener('click', () => {
        onRetry();
    });
}
