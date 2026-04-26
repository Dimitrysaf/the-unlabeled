import { updateContent } from '../components/Layout.js';
import { signIn } from '../lib/auth.js';

export function renderLogin() {
    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">
                    <h1 class="govuk-heading-xl">Login</h1>

                    <form class="auth-form" id="login-form">
                        <div class="govuk-form-group">
                            <label class="govuk-label" for="login-email">
                                Email address
                            </label>
                            <input
                                class="govuk-input"
                                id="login-email"
                                name="email"
                                type="email"
                                autocomplete="email"
                                required
                            >
                        </div>

                        <div class="govuk-form-group">
                            <label class="govuk-label" for="login-password">
                                Password
                            </label>
                            <input
                                class="govuk-input"
                                id="login-password"
                                name="password"
                                type="password"
                                autocomplete="current-password"
                                required
                            >
                        </div>

                        <button class="govuk-button" type="submit" id="login-submit-btn">
                            Login
                        </button>
                    </form>

                    <p class="govuk-body">
                        Don't have an account? <a class="govuk-link" href="/signup">Sign up</a>
                    </p>

                    <div class="auth-message" id="auth-message" style="display: none;"></div>
                </div>
            </div>
        </div>
    `);

    initLoginForm();
}

function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    const messageDiv = document.getElementById('auth-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');

        const submitBtn = document.getElementById('login-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Please wait...';
        messageDiv.style.display = 'none';

        try {
            await signIn(email, password);
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
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