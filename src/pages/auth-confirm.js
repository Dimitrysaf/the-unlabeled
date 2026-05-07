import { updateContent } from '../components/Layout.js';
import { escapeHtml } from '../lib/escape.js';

// ─────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────

/**
 * Handles all Supabase email-confirmation redirects.
 *
 * Supabase appends auth state as a URL hash fragment. There are three cases:
 *
 *   1. Old-email confirmation (step 1 of 2 for email change):
 *      #message=Confirmation+link+accepted.+Please+proceed+to+confirm+link+sent+to+the+other+email
 *
 *   2. New-email / other confirmation (step 2, or signup, recovery etc.):
 *      #access_token=…&type=email_change   (or type=signup, type=recovery…)
 *
 *   3. Error:
 *      #error=access_denied&error_code=otp_expired&error_description=…
 *
 * The Supabase JS client (detectSessionInUrl: true by default) automatically
 * processes cases 2 and 3 on page load — we only read the raw params to
 * decide which UI to show.
 *
 * Supabase dashboard setup required:
 *   Authentication → URL Configuration
 *   Site URL      → https://your-domain.com/auth/confirm
 *   Redirect URLs → http://localhost:5173/auth/confirm
 *                   https://your-domain.com/auth/confirm
 */
export function renderAuthConfirm() {
    const params = new URLSearchParams(window.location.hash.slice(1));

    const error = params.get('error');
    const errorCode = params.get('error_code');
    const errorDescription = params.get('error_description');
    const message = params.get('message');   // old-email confirmation step
    const type = params.get('type');       // new-email / other confirmation

    if (error) {
        renderErrorPage(getFriendlyError(error, errorCode, errorDescription));
        return;
    }

    if (message) {
        // Step 1 of 2: old email confirmed, new email still needs confirming.
        const isEmailChange = message.toLowerCase().includes('other email');
        renderPendingPage(isEmailChange);
        return;
    }

    // Step 2 (or single-step for signup / recovery / magic link).
    renderSuccessPage(type);
}

// ─────────────────────────────────────────────
// STEP 1 PAGE — old email confirmed, awaiting new email
// ─────────────────────────────────────────────

function renderPendingPage(isEmailChange) {
    const heading = isEmailChange
        ? 'Old email address confirmed'
        : 'Confirmation received';

    const body = isEmailChange
        ? `We have confirmed your current email address. To complete the change, open the
           confirmation email sent to your <strong>new</strong> address and click the link inside.`
        : 'One more step is required. Please check your email and click the link we sent you.';

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
                        <h3 class="govuk-notification-banner__heading">${heading}</h3>
                        <p class="govuk-body">${body}</p>
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
// SUCCESS PAGE — confirmation complete
// ─────────────────────────────────────────────

const SUCCESS_COPY = {
    email_change: {
        heading: 'Email address changed',
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

function getFriendlyError(error, code, description) {
    if (code === 'otp_expired' || (description || '').toLowerCase().includes('expired')) {
        return 'This confirmation link has expired. Please return to your account settings and request a new one.';
    }
    if (code === 'otp_disabled' || error === 'access_denied') {
        return 'This link is no longer valid. Please return to your account settings and try again.';
    }
    return description
        ? decodeURIComponent(String(description).replace(/\+/g, ' '))
        : 'An unexpected error occurred. Please try again from your account settings.';
}

