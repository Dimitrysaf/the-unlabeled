import { updateContent } from '../components/Layout.js';
import { signUp } from '../lib/auth.js';
import { validateEmail, validateDisplayName, validatePassword, clearFieldErrors, setFieldError, setButtonLoading, resetButton, showErrorSummary } from '../lib/validation.js';

export function renderSignup() {
    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">
                    <h1 class="govuk-heading-xl">Sign up</h1>

                    <form class="auth-form" id="signup-form">
                        <div class="govuk-error-summary" id="signup-error-summary" hidden role="alert" tabindex="-1">
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

                    <div class="auth-message" id="auth-message" style="display: none;"></div>
                </div>
            </div>
        </div>
    `);

    initSignupForm();
}

function initSignupForm() {
    const signupForm = document.getElementById('signup-form');
    const messageDiv = document.getElementById('auth-message');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors(signupForm);
        messageDiv.style.display = 'none';

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
            window.location.href = '/login';
        } catch (error) {
            showMessage(error.message || 'Unable to create an account. Please try again.', 'error');
            resetButton(submitBtn, 'Sign up');
        }
    });
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('auth-message');
    if (!messageDiv) return;
    messageDiv.textContent = message;
    messageDiv.className = `auth-message auth-message--${type}`;
    messageDiv.style.display = 'block';
}