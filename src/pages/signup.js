import { updateContent } from '../components/Layout.js';
import { signUp } from '../lib/auth.js';

export function renderSignup() {
    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">
                    <h1 class="govuk-heading-xl">Sign up</h1>

                    <form class="auth-form" id="signup-form">
                        <div class="govuk-form-group">
                            <label class="govuk-label" for="signup-email">
                                Email address
                            </label>
                            <input
                                class="govuk-input"
                                id="signup-email"
                                name="email"
                                type="email"
                                autocomplete="email"
                                required
                            >
                        </div>

                        <div class="govuk-form-group">
                            <label class="govuk-label" for="signup-display-name">
                                Display name
                            </label>
                            <input
                                class="govuk-input"
                                id="signup-display-name"
                                name="displayName"
                                type="text"
                                autocomplete="name"
                                required
                            >
                        </div>

                        <div class="govuk-form-group">
                            <label class="govuk-label" for="signup-password">
                                Password
                            </label>
                            <input
                                class="govuk-input"
                                id="signup-password"
                                name="password"
                                type="password"
                                autocomplete="new-password"
                                required
                            >
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
        const formData = new FormData(signupForm);
        const email = formData.get('email');
        const displayName = formData.get('displayName');
        const password = formData.get('password');

        const submitBtn = document.getElementById('signup-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Please wait...';
        messageDiv.style.display = 'none';

        try {
            await signUp(email, password, { display_name: displayName });
            showMessage('Account created successfully! Please check your email to confirm your account.', 'success');
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign up';
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