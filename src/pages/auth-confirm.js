import { updateContent } from '../components/Layout.js';

// ─────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────

/**
 * Handles the Supabase email-confirmation redirect.
 *
 * Supabase appends auth info as a URL hash fragment, e.g.:
 *   Success: #access_token=…&type=email_change
 *   Error:   #error=access_denied&error_code=otp_expired&error_description=…
 *
 * The Supabase JS client (detectSessionInUrl: true by default) automatically
 * processes the hash on page load — we only need to read the raw params
 * to decide which UI to show.
 *
 * Remember to set your Supabase "Redirect URL" to:
 *   https://your-domain.com/auth/confirm   (or http://localhost:5173/auth/confirm)
 */
export function renderAuthConfirm() {
    const params = new URLSearchParams(window.location.hash.slice(1));

    const error = params.get('error');
    const errorDescription = params.get('error_description');
    const type = params.get('type');

    if (error) {
        renderErrorPage(getFriendlyError(error, errorDescription));
    } else {
        renderSuccessPage(type);
    }
}

// ─────────────────────────────────────────────
// SUCCESS PAGE
// ─────────────────────────────────────────────

const SUCCESS_COPY = {
    email_change: {
        heading: 'Email address confirmed',
        body: 'Your email address has been updated. You can now sign in with your new address.',
    },
    signup: {
        heading: 'Email address confirmed',
        body: 'Your account is now active. You can sign in.',
    },
    recovery: {
        heading: 'Password reset link verified',
        body: 'Your identity has been confirmed. You can now set a new password.',
    },
    magiclink: {
        heading: 'Sign-in link confirmed',
        body: 'You have been signed in successfully.',
    },
};

function renderSuccessPage(type) {
    const copy = SUCCESS_COPY[type] || {
        heading: 'Confirmation successful',
        body: 'Your request has been confirmed.',
    };

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">

                <div class="govuk-notification-banner govuk-notification-banner--success"
                     role="alert"
                     aria-labelledby="auth-confirm-banner-title"
                     data-module="govuk-notification-banner">
                    <div class="govuk-notification-banner__header">
                        <h2 class="govuk-notification-banner__title" id="auth-confirm-banner-title">
                            Success
                        </h2>
                    </div>
                    <div class="govuk-notification-banner__content">
                        <h3 class="govuk-notification-banner__heading">
                            ${copy.heading}
                        </h3>
                        <p class="govuk-body">${copy.body}</p>
                    </div>
                </div>

                <p class="govuk-body govuk-!-colour-secondary govuk-!-margin-top-6">
                    You may close this tab.
                </p>

            </div>
        </div>
    `);
}

// ─────────────────────────────────────────────
// ERROR PAGE
// ─────────────────────────────────────────────

function renderErrorPage(message) {
    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">

                <div class="govuk-notification-banner"
                     role="region"
                     aria-labelledby="auth-confirm-banner-title"
                     data-module="govuk-notification-banner">
                    <div class="govuk-notification-banner__header">
                        <h2 class="govuk-notification-banner__title" id="auth-confirm-banner-title">
                            Important
                        </h2>
                    </div>
                    <div class="govuk-notification-banner__content">
                        <h3 class="govuk-notification-banner__heading">
                            There is a problem with this link
                        </h3>
                        <p class="govuk-body">${escapeHtml(message)}</p>
                    </div>
                </div>

                <p class="govuk-body govuk-!-colour-secondary govuk-!-margin-top-6">
                    You may close this tab.
                </p>

            </div>
        </div>
    `);
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getFriendlyError(error, description) {
    if (error === 'access_denied') {
        const desc = (description || '').toLowerCase();
        if (desc.includes('expired') || desc.includes('invalid')) {
            return 'This confirmation link has expired or is no longer valid. Please return to your account settings and try again.';
        }
        return 'Access was denied. Please return to your account settings and try again.';
    }
    return description
        ? decodeURIComponent(description.replace(/\+/g, ' '))
        : 'An unexpected error occurred. Please try again.';
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}