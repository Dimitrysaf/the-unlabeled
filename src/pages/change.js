import { updateContent } from '../components/Layout.js';
import { renderError } from '../components/ErrorPage.js';
import { getCurrentUser, updateUser, updateUserProfile } from '../lib/auth.js';
import { validateEmail, validateDisplayName, validatePassword, clearFieldErrors, setFieldError, setButtonLoading, resetButton, showErrorSummary } from '../lib/validation.js';

const fieldMap = {
    'display-name': {
        title: 'Change display name',
        label: 'Display name',
        placeholder: 'Enter your display name',
        type: 'text',
        submitLabel: 'Save display name',
        save: async (value) => updateUserProfile({ display_name: value }),
        validator: validateDisplayName
    },
    email: {
        title: 'Change email address',
        label: 'Email address',
        placeholder: 'Enter your email address',
        type: 'email',
        submitLabel: 'Save email address',
        save: async (value) => updateUser({ email: value }),
        validator: validateEmail
    },
    password: {
        title: 'Change password',
        label: 'Password',
        placeholder: 'Enter a new password',
        type: 'password',
        submitLabel: 'Save password',
        save: async (value) => updateUser({ password: value }),
        validator: validatePassword
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
                    <p class="govuk-body govuk-!-margin-bottom-4">
                        <a href="#" class="govuk-back-link" id="change-back-link">Back</a>
                    </p>
                    <p class="govuk-body">Update your ${config.label.toLowerCase()} below.</p>
                    <form class="auth-form" id="change-form">
                        <div class="govuk-error-summary" id="change-error-summary" hidden role="alert" tabindex="-1">
                            <div>
                                <h2 class="govuk-error-summary__title">There is a problem</h2>
                                <div class="govuk-error-summary__body">
                                    <ul class="govuk-list govuk-error-summary__list"></ul>
                                </div>
                            </div>
                        </div>
                        <div class="govuk-form-group" id="change-value-group">
                            <label class="govuk-label" for="change-value">
                                ${config.label}
                            </label>
                            <p id="change-value-hint" class="govuk-hint">${config.placeholder}</p>
                            <input
                                class="govuk-input"
                                id="change-value"
                                name="value"
                                type="${config.type}"
                                placeholder="${config.placeholder}"
                                value="${config.type === 'password' ? '' : currentValue}"
                                aria-describedby="change-value-hint change-value-error"
                                required
                            >
                            <p id="change-value-error" class="govuk-error-message" hidden>
                                <span class="govuk-visually-hidden">Error:</span>
                            </p>
                        </div>
                        <button class="govuk-button" type="submit" id="change-submit-btn">
                            ${config.submitLabel}
                        </button>
                    </form>
                    <div class="auth-message" id="change-message" style="display: none;"></div>
                </div>
            </div>
        </div>
    `);

    initChangeForm(config);
    initBackLink();
}

function initChangeForm(config) {
    const changeForm = document.getElementById('change-form');
    const messageDiv = document.getElementById('change-message');

    changeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors(changeForm);
        messageDiv.style.display = 'none';

        const formData = new FormData(changeForm);
        const value = formData.get('value');
        const validationError = config.validator(value);

        if (validationError) {
            setFieldError('change-value', validationError);
            showErrorSummary(changeForm, [{ fieldId: 'change-value', message: validationError }]);
            return;
        }

        const submitBtn = document.getElementById('change-submit-btn');
        setButtonLoading(submitBtn, 'Redirecting...');

        try {
            await config.save(value);
            window.location.href = '/account';
        } catch (error) {
            showMessage(error.message || 'Unable to save. Please try again.', 'error');
            resetButton(submitBtn, config.submitLabel);
        }
    });
}

function initBackLink() {
    const backLink = document.getElementById('change-back-link');
    if (!backLink) return;

    backLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (history.length > 1) {
            history.back();
        } else {
            window.location.href = '/account';
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
