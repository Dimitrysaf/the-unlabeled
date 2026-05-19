// src/pages/change.js
import { updateContent } from '../components/Layout.js';
import { renderError } from '../components/ErrorPage.js';
import { navigate } from '../router.js';
import { getCurrentUser, updateUser, updateUserProfile } from '../lib/auth.js';
import {
    validateEmail,
    validateDisplayName,
    validatePassword,
    setButtonLoading,
    resetButton,
} from '../lib/validation.js';
import { escapeHtml, escapeAttr } from '../lib/escape.js';

// ── Field config ──────────────────────────────────────────────────────────

const FIELD_CONFIG = {
    'display-name': {
        title: 'Change display name',
        caption: 'Your account',
        label: 'Display name',
        hint: 'Between 2 and 50 characters. Letters, numbers, spaces, hyphens, underscores or periods only.',
        type: 'text',
        autocomplete: 'name',
        submitLabel: 'Save display name',
        mode: 'direct',
        getCurrentValue: (user) =>
            user.user_metadata?.display_name || user.user_metadata?.name || '',
        save: (value) => updateUserProfile({ display_name: value }),
        validator: validateDisplayName,
        updatedKey: 'display-name',
    },
    email: {
        title: 'Change email address',
        caption: 'Your account',
        label: 'New email address',
        hint: 'We will send a confirmation link to your new email address. You must click it to confirm the change.',
        type: 'email',
        autocomplete: 'email',
        submitLabel: 'Send confirmation email',
        mode: 'email-confirm',
        getCurrentValue: () => '',
        save: (value) => updateUser({ email: value }),
        validator: validateEmail,
        updatedKey: null,
    },
    password: {
        title: 'Change password',
        caption: 'Your account',
        label: 'New password',
        hint: 'Must be at least 8 characters and include an uppercase letter, lowercase letter, number and special character.',
        type: 'password',
        autocomplete: 'new-password',
        submitLabel: 'Save new password',
        mode: 'direct',
        getCurrentValue: () => '',
        save: (value) => updateUser({ password: value }),
        validator: validatePassword,
        updatedKey: 'password',
    },
};

// ── Entry point ───────────────────────────────────────────────────────────

export async function renderChange(field) {
    const config = FIELD_CONFIG[field];
    if (!config) { renderError('404'); return; }

    let user;
    try {
        user = await getCurrentUser();
    } catch {
        navigate('/login');
        return;
    }
    if (!user) { window.location.href = '/login'; return; }

    renderChangeForm(config, config.getCurrentValue(user));
}

// ── Form page ─────────────────────────────────────────────────────────────

function renderChangeForm(config, currentValue) {
    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">

                <a href="/account" class="govuk-back-link">Back</a>

                <h1 class="govuk-heading-xl">
                    <span class="govuk-caption-l">${config.caption}</span>
                    ${config.title}
                </h1>

                <form id="change-form" novalidate>

                    ${config.type === 'password' ? `
                    <input type="text" name="username" autocomplete="username"
                           style="display:none" aria-hidden="true" tabindex="-1">
                    ` : ''}

                    <div class="govuk-error-summary" data-module="govuk-error-summary" id="change-error-summary" hidden>
                        <div role="alert">
                            <h2 class="govuk-error-summary__title">There is a problem</h2>
                            <div class="govuk-error-summary__body">
                                <ul class="govuk-list govuk-error-summary__list" id="change-error-list"></ul>
                            </div>
                        </div>
                    </div>

                    <div class="govuk-form-group" id="change-field-group">
                        <label class="govuk-label govuk-label--m" for="change-field">
                            ${config.label}
                        </label>
                        <div id="change-field-hint" class="govuk-hint">${config.hint}</div>
                        <p class="govuk-error-message" id="change-field-error" hidden>
                            <span class="govuk-visually-hidden">Error:</span>
                            <span id="change-field-error-text"></span>
                        </p>
                        <input
                            class="govuk-input"
                            id="change-field"
                            name="value"
                            type="${config.type}"
                            autocomplete="${config.autocomplete}"
                            aria-describedby="change-field-hint change-field-error"
                            spellcheck="false"
                            ${config.type !== 'password' ? `value="${escapeAttr(currentValue)}"` : ''}
                        >
                    </div>

                    <div class="govuk-button-group">
                        <button class="govuk-button" type="submit" id="change-submit-btn" data-module="govuk-button">
                            ${config.submitLabel}
                        </button>
                        <a class="govuk-link" href="/account">Cancel</a>
                    </div>

                </form>

            </div>
        </div>
    `);

    initChangeForm(config);
}

// ── Form logic ────────────────────────────────────────────────────────────

function initChangeForm(config) {
    const form = document.getElementById('change-form');
    const submitBtn = document.getElementById('change-submit-btn');
    const input = document.getElementById('change-field');
    const group = document.getElementById('change-field-group');
    const errorMsg = document.getElementById('change-field-error');
    const errorText = document.getElementById('change-field-error-text');
    const errorSummary = document.getElementById('change-error-summary');
    const errorList = document.getElementById('change-error-list');

    function clearErrors() {
        group.classList.remove('govuk-form-group--error');
        input.classList.remove('govuk-input--error');
        input.removeAttribute('aria-invalid');
        errorMsg.hidden = true;
        errorText.textContent = '';
        errorSummary.hidden = true;
        errorList.innerHTML = '';
    }

    function showError(message) {
        group.classList.add('govuk-form-group--error');
        input.classList.add('govuk-input--error');
        input.setAttribute('aria-invalid', 'true');
        errorText.textContent = message;
        errorMsg.hidden = false;

        errorList.innerHTML = `<li><a href="#change-field">${escapeHtml(message)}</a></li>`;
        errorSummary.hidden = false;
        errorSummary.setAttribute('tabindex', '-1');
        errorSummary.focus();
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const value = input.value;
        const validationError = config.validator(value);
        if (validationError) {
            showError(validationError);
            return;
        }

        setButtonLoading(submitBtn, 'Saving…');

        try {
            await config.save(value);

            if (config.mode === 'email-confirm') {
                renderEmailSentPage(value);
            } else {
                navigate('/account?updated=' + encodeURIComponent(config.updatedKey || ''));
            }
        } catch (err) {
            const msg = err?.message || 'Something went wrong. Please try again later.';
            showError(msg);
            resetButton(submitBtn, config.submitLabel);
        }
    });
}

// ── Email sent page ───────────────────────────────────────────────────────

function renderEmailSentPage(email) {
    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">

                <div class="govuk-panel govuk-panel--confirmation">
                    <h1 class="govuk-panel__title">Check your email</h1>
                    <div class="govuk-panel__body">
                        We sent a confirmation link to<br>
                        <strong style="word-break: break-all;">${escapeHtml(email)}</strong>
                    </div>
                </div>

                <h2 class="govuk-heading-m govuk-!-margin-top-6">What happens next</h2>
                <p class="govuk-body">Click the link in the email to confirm your new email address. The link will expire after a short time.</p>
                <p class="govuk-body">If you do not receive an email within a few minutes, check your spam or junk folder.</p>

                <p class="govuk-body govuk-!-margin-top-6">
                    <a class="govuk-link" href="/account">Return to your account</a>
                </p>

            </div>
        </div>
    `);
}
