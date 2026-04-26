import { updateContent } from '../components/Layout.js';
import { signIn } from '../lib/auth.js';
import { validateEmail, clearFieldErrors, setFieldError, setButtonLoading, resetButton, showErrorSummary } from '../lib/validation.js';

export function renderLogin() {
    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">
                    <h1 class="govuk-heading-xl">Login</h1>

                    <form class="auth-form" id="login-form">
                        <div class="govuk-error-summary" id="login-error-summary" data-module="govuk-error-summary" hidden role="alert" tabindex="-1">
                            <div>
                                <h2 class="govuk-error-summary__title">There is a problem</h2>
                                <div class="govuk-error-summary__body">
                                    <ul class="govuk-list govuk-error-summary__list"></ul>
                                </div>
                            </div>
                        </div>

                        <div class="govuk-form-group" id="login-email-group">
                            <label class="govuk-label" for="login-email">
                                Email address
                            </label>
                            <p id="login-email-hint" class="govuk-hint">Enter your email address</p>
                            <input
                                class="govuk-input"
                                id="login-email"
                                name="email"
                                type="email"
                                autocomplete="email"
                                aria-describedby="login-email-hint login-email-error"
                                required
                            >
                            <p id="login-email-error" class="govuk-error-message" hidden>
                                <span class="govuk-visually-hidden">Error:</span>
                            </p>
                        </div>

                        <div class="govuk-form-group" id="login-password-group">
                            <label class="govuk-label" for="login-password">
                                Password
                            </label>
                            <p id="login-password-hint" class="govuk-hint">Enter your password</p>
                            <input
                                class="govuk-input"
                                id="login-password"
                                name="password"
                                type="password"
                                autocomplete="current-password"
                                aria-describedby="login-password-hint login-password-error"
                                required
                            >
                            <p id="login-password-error" class="govuk-error-message" hidden>
                                <span class="govuk-visually-hidden">Error:</span>
                            </p>
                        </div>

                        <button class="govuk-button" type="submit" id="login-submit-btn">
                            Login
                        </button>
                    </form>

                    <p class="govuk-body">
                        Don't have an account? <a class="govuk-link" href="/signup">Sign up</a>
                    </p>
                </div>
            </div>
        </div>
    `);

    initLoginForm();
}

function initLoginForm() {
    const loginForm = document.getElementById('login-form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors(loginForm);

        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');

        const emailError = validateEmail(email);
        const passwordError = validateLoginPassword(password);
        const errors = [];

        if (emailError) {
            setFieldError('login-email', emailError);
            errors.push({ fieldId: 'login-email', message: emailError });
        }
        if (passwordError) {
            setFieldError('login-password', passwordError);
            errors.push({ fieldId: 'login-password', message: passwordError });
        }
        if (errors.length) {
            showErrorSummary(loginForm, errors);
            return;
        }

        const submitBtn = document.getElementById('login-submit-btn');
        setButtonLoading(submitBtn, 'Redirecting...');

        try {
            await signIn(email, password);
            window.location.href = '/';
        } catch (error) {
            showAuthErrorSummary(loginForm, error.message || 'Unable to sign in. Please check your details.');
            resetButton(submitBtn, 'Login');
        }
    });
}

function validateLoginPassword(password) {
    if (typeof password !== 'string' || password.length === 0) {
        return 'Enter your password';
    }
    return '';
}

function showAuthErrorSummary(form, message) {
    const summary = form.querySelector('.govuk-error-summary');
    const list = summary?.querySelector('.govuk-error-summary__list');
    if (!summary || !list) return;

    list.innerHTML = `<li><a href="#">${message}</a></li>`;
    summary.hidden = false;
    summary.focus();
}
