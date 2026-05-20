// src/pages/signup.js
import { updateContent } from '../components/Layout.js';
import { navigate } from '../router.js';
import { getCurrentUser, signUp } from '../lib/auth.js';
import { validateEmail, validateDisplayName, validatePassword, clearFieldErrors, setFieldError, setButtonLoading, resetButton, showErrorSummary, showAuthErrorSummary } from '../lib/validation.js';
import { escapeHtml } from '../lib/escape.js';
import { logger } from '../lib/logger.js';

export async function renderSignup() {
    try {
        const user = await getCurrentUser();
        if (user) {
            navigate('/account');
            return;
        }
    } catch (error) {
        logger.error('Error checking auth state on signup page', error);
    }

    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">
                    <h1 class="govuk-heading-xl">Sign up</h1>

                    <form class="auth-form" id="signup-form">
                        <div class="govuk-error-summary" id="signup-error-summary" data-module="govuk-error-summary" hidden role="alert" tabindex="-1">
                            <div>
                                <h2 class="govuk-error-summary__title">There is a problem</h2>
                                <div class="govuk-error-summary__body">
                                    <ul class="govuk-list govuk-error-summary__list"></ul>
                                </div>
                            </div>
                        </div>

                        <div class="govuk-form-group" id="signup-email-group">
                            <label class="govuk-label" for="signup-email">
                                Email address
                            </label>
                            <p id="signup-email-hint" class="govuk-hint">Enter your email address</p>
                            <input
                                class="govuk-input"
                                id="signup-email"
                                name="email"
                                type="email"
                                autocomplete="email"
                                aria-describedby="signup-email-hint signup-email-error"
                                required
                            >
                            <p id="signup-email-error" class="govuk-error-message" hidden>
                                <span class="govuk-visually-hidden">Error:</span>
                            </p>
                        </div>

                        <div class="govuk-form-group" id="signup-display-name-group">
                            <label class="govuk-label" for="signup-display-name">
                                Display name
                            </label>
                            <p id="signup-display-name-hint" class="govuk-hint">Enter your display name</p>
                            <input
                                class="govuk-input"
                                id="signup-display-name"
                                name="displayName"
                                type="text"
                                autocomplete="name"
                                aria-describedby="signup-display-name-hint signup-display-name-error"
                                required
                            >
                            <p id="signup-display-name-error" class="govuk-error-message" hidden>
                                <span class="govuk-visually-hidden">Error:</span>
                            </p>
                        </div>

                        <div class="govuk-form-group" id="signup-password-group">
                            <label class="govuk-label" for="signup-password">
                                Password
                            </label>
                            <p id="signup-password-hint" class="govuk-hint">Create a password with at least 8 characters</p>
                            <input
                                class="govuk-input"
                                id="signup-password"
                                name="password"
                                type="password"
                                autocomplete="new-password"
                                aria-describedby="signup-password-hint signup-password-error"
                                required
                            >
                            <p id="signup-password-error" class="govuk-error-message" hidden>
                                <span class="govuk-visually-hidden">Error:</span>
                            </p>
                        </div>

                        <button class="govuk-button" type="submit" id="signup-submit-btn">
                            Sign up
                        </button>
                    </form>

                    <p class="govuk-body">
                        Already have an account? <a class="govuk-link" href="/login">Login</a>
                    </p>
                </div>
            </div>
        </div>
    `);

    initSignupForm();
}

function initSignupForm() {
    const signupForm = document.getElementById('signup-form');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors(signupForm);

        const formData = new FormData(signupForm);
        const email = formData.get('email');
        const displayName = formData.get('displayName');
        const password = formData.get('password');

        const emailError = validateEmail(email);
        const displayNameError = validateDisplayName(displayName);
        const passwordError = validatePassword(password);
        const errors = [];

        if (emailError) {
            setFieldError('signup-email', emailError);
            errors.push({ fieldId: 'signup-email', message: emailError });
        }
        if (displayNameError) {
            setFieldError('signup-display-name', displayNameError);
            errors.push({ fieldId: 'signup-display-name', message: displayNameError });
        }
        if (passwordError) {
            setFieldError('signup-password', passwordError);
            errors.push({ fieldId: 'signup-password', message: passwordError });
        }
        if (errors.length) {
            showErrorSummary(signupForm, errors);
            return;
        }

        const submitBtn = document.getElementById('signup-submit-btn');
        setButtonLoading(submitBtn, 'Redirecting...');

        try {
            await signUp(email, password, { display_name: displayName });
            renderEmailSent(email);
        } catch (error) {
            showAuthErrorSummary(signupForm, error.message || 'Unable to create an account. Please try again.');
            resetButton(submitBtn, 'Sign up');
        }
    });
}

function renderEmailSent(email) {
    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">

                    <div class="govuk-notification-banner govuk-notification-banner--success"
                         role="alert"
                         aria-labelledby="signup-success-title"
                         data-module="govuk-notification-banner">
                        <div class="govuk-notification-banner__header">
                            <h2 class="govuk-notification-banner__title" id="signup-success-title">
                                Success
                            </h2>
                        </div>
                        <div class="govuk-notification-banner__content">
                            <p class="govuk-notification-banner__heading">
                                A confirmation email has been sent to <strong>${escapeHtml(email)}</strong>
                            </p>
                        </div>
                    </div>

                    <h1 class="govuk-heading-xl">Check your email</h1>

                    <p class="govuk-body">Click the confirmation link we sent to verify your address and activate your account.</p>
                    <p class="govuk-body">If you do not receive an email within a few minutes, check your spam or junk folder.</p>

                    <p class="govuk-body govuk-!-margin-top-6">
                        Once confirmed, <a class="govuk-link" href="/login">sign in</a> to access your account.
                    </p>

                </div>
            </div>
        </div>
    `);
}

