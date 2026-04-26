import { updateContent } from '../components/Layout.js';
import { renderError } from '../components/ErrorPage.js';
import { getCurrentUser, updateUser, updateUserProfile } from '../lib/auth.js';

const fieldMap = {
    'display-name': {
        title: 'Change display name',
        label: 'Display name',
        placeholder: 'Enter your display name',
        type: 'text',
        submitLabel: 'Save display name',
        save: async (value) => updateUserProfile({ display_name: value })
    },
    email: {
        title: 'Change email address',
        label: 'Email address',
        placeholder: 'Enter your email address',
        type: 'email',
        submitLabel: 'Save email address',
        save: async (value) => updateUser({ email: value })
    },
    password: {
        title: 'Change password',
        label: 'Password',
        placeholder: 'Enter a new password',
        type: 'password',
        submitLabel: 'Save password',
        save: async (value) => updateUser({ password: value })
    }
};

export async function renderChange(field) {
    const config = fieldMap[field];

    if (!config) {
        renderError('404');
        return;
    }

    const user = await getCurrentUser();
    if (!user) {
        window.location.href = '/login';
        return;
    }

    const currentValue = field === 'display-name'
        ? (user.user_metadata?.display_name || user.user_metadata?.name || '')
        : field === 'email'
        ? (user.email || '')
        : '';

    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">
                    <h1 class="govuk-heading-xl">${config.title}</h1>
                    <p class="govuk-body">Update your ${config.label.toLowerCase()} below.</p>
                    <form class="auth-form" id="change-form">
                        <div class="govuk-form-group">
                            <label class="govuk-label" for="change-value">
                                ${config.label}
                            </label>
                            <input
                                class="govuk-input"
                                id="change-value"
                                name="value"
                                type="${config.type}"
                                placeholder="${config.placeholder}"
                                value="${config.type === 'password' ? '' : currentValue}"
                                ${config.type !== 'password' ? 'required' : 'required'}
                            >
                        </div>
                        <button class="govuk-button" type="submit" id="change-submit-btn">
                            ${config.submitLabel}
                        </button>
                    </form>
                    <p class="govuk-body govuk-!-margin-top-4">
                        <a class="govuk-link" href="/account">Back to account</a>
                    </p>
                    <div class="auth-message" id="change-message" style="display: none;"></div>
                </div>
            </div>
        </div>
    `);

    initChangeForm(config);
}

function initChangeForm(config) {
    const changeForm = document.getElementById('change-form');
    const messageDiv = document.getElementById('change-message');

    changeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(changeForm);
        const value = formData.get('value');

        const submitBtn = document.getElementById('change-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Please wait...';
        messageDiv.style.display = 'none';

        try {
            await config.save(value);
            showMessage(`${config.label} updated successfully. Redirecting...`, 'success');
            setTimeout(() => {
                window.location.href = '/account';
            }, 1000);
        } catch (error) {
            showMessage(error.message || 'Unable to save. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = config.submitLabel;
        }
    });
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('change-message');
    if (!messageDiv) return;
    messageDiv.textContent = message;
    messageDiv.className = `auth-message auth-message--${type}`;
    messageDiv.style.display = 'block';
}
