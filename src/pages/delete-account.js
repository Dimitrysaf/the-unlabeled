// src/pages/delete-account.js
import { updateContent } from '../components/Layout.js';
import { renderError } from '../components/ErrorPage.js';
import { navigate } from '../router.js';
import { getCurrentUser, signIn, signOut, deleteAccount } from '../lib/auth.js';
import { setButtonLoading, resetButton } from '../lib/validation.js';
import { escapeHtml } from '../lib/escape.js';

export async function renderDeleteAccount() {
    let user;
    try {
        user = await getCurrentUser();
    } catch {
        navigate('/login');
        return;
    }
    if (!user) { navigate('/login'); return; }

    renderDeleteForm(user.email);
}

function renderDeleteForm(email) {
    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">

                <a href="/account" class="govuk-back-link">Back</a>

                <h1 class="govuk-heading-xl">
                    <span class="govuk-caption-l">Your account</span>
                    Delete account
                </h1>

                <div class="govuk-warning-text">
                    <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
                    <strong class="govuk-warning-text__text">
                        <span class="govuk-warning-text__assistive">Warning</span>
                        This action is permanent and cannot be undone.
                    </strong>
                </div>

                <p class="govuk-body">Deleting your account will permanently remove:</p>
                <ul class="govuk-list govuk-list--bullet">
                    <li>your login credentials</li>
                    <li>your display name and profile information</li>
                    <li>your account history</li>
                </ul>

                <form id="delete-form" novalidate>

                    <div class="govuk-error-summary" data-module="govuk-error-summary" id="delete-error-summary" hidden>
                        <div role="alert">
                            <h2 class="govuk-error-summary__title">There is a problem</h2>
                            <div class="govuk-error-summary__body">
                                <ul class="govuk-list govuk-error-summary__list" id="delete-error-list"></ul>
                            </div>
                        </div>
                    </div>

                    <div class="govuk-form-group" id="delete-password-group">
                        <label class="govuk-label govuk-label--m" for="delete-password">
                            Enter your current password to confirm
                        </label>
                        <p class="govuk-error-message" id="delete-password-error" hidden>
                            <span class="govuk-visually-hidden">Error:</span>
                            <span id="delete-password-error-text"></span>
                        </p>
                        <input
                            class="govuk-input"
                            id="delete-password"
                            name="password"
                            type="password"
                            autocomplete="current-password"
                            spellcheck="false"
                        >
                    </div>

                    <div class="govuk-form-group" id="delete-confirm-group">
                        <label class="govuk-label govuk-label--m" for="delete-confirm">
                            Type your email address to confirm
                        </label>
                        <div class="govuk-hint" id="delete-confirm-hint">
                            Type <strong>${escapeHtml(email)}</strong> exactly to proceed.
                        </div>
                        <p class="govuk-error-message" id="delete-confirm-error" hidden>
                            <span class="govuk-visually-hidden">Error:</span>
                            <span id="delete-confirm-error-text"></span>
                        </p>
                        <input
                            class="govuk-input"
                            id="delete-confirm"
                            name="confirm"
                            type="email"
                            autocomplete="off"
                            aria-describedby="delete-confirm-hint"
                            spellcheck="false"
                        >
                    </div>

                    <div class="govuk-button-group">
                        <button class="govuk-button govuk-button--warning" type="submit" id="delete-submit-btn" data-module="govuk-button">
                            Delete account
                        </button>
                        <a class="govuk-link" href="/account">Cancel</a>
                    </div>

                </form>

            </div>
        </div>
    `);

    initDeleteForm(email);
}

function initDeleteForm(email) {
    const form = document.getElementById('delete-form');
    const submitBtn = document.getElementById('delete-submit-btn');

    const fields = {
        password: {
            input: document.getElementById('delete-password'),
            group: document.getElementById('delete-password-group'),
            error: document.getElementById('delete-password-error'),
            errorText: document.getElementById('delete-password-error-text'),
        },
        confirm: {
            input: document.getElementById('delete-confirm'),
            group: document.getElementById('delete-confirm-group'),
            error: document.getElementById('delete-confirm-error'),
            errorText: document.getElementById('delete-confirm-error-text'),
        },
    };

    const errorSummary = document.getElementById('delete-error-summary');
    const errorList = document.getElementById('delete-error-list');

    function clearErrors() {
        for (const f of Object.values(fields)) {
            f.group.classList.remove('govuk-form-group--error');
            f.input.classList.remove('govuk-input--error');
            f.input.removeAttribute('aria-invalid');
            f.error.hidden = true;
            f.errorText.textContent = '';
        }
        errorSummary.hidden = true;
        errorList.innerHTML = '';
    }

    function showFieldError(key, message) {
        const f = fields[key];
        f.group.classList.add('govuk-form-group--error');
        f.input.classList.add('govuk-input--error');
        f.input.setAttribute('aria-invalid', 'true');
        f.errorText.textContent = message;
        f.error.hidden = false;
    }

    function showSummary(errors) {
        errorList.innerHTML = errors
            .map(({ id, msg }) => `<li><a href="#${id}">${escapeHtml(msg)}</a></li>`)
            .join('');
        errorSummary.hidden = false;
        errorSummary.setAttribute('tabindex', '-1');
        errorSummary.focus();
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const password = fields.password.input.value;
        const confirm = fields.confirm.input.value.trim();

        const errors = [];

        if (!password) {
            showFieldError('password', 'Enter your current password');
            errors.push({ id: 'delete-password', msg: 'Enter your current password' });
        }

        if (!confirm) {
            showFieldError('confirm', 'Type your email address to confirm');
            errors.push({ id: 'delete-confirm', msg: 'Type your email address to confirm' });
        } else if (confirm.toLowerCase() !== email.toLowerCase()) {
            showFieldError('confirm', 'Email address does not match');
            errors.push({ id: 'delete-confirm', msg: 'Email address does not match' });
        }

        if (errors.length) {
            showSummary(errors);
            return;
        }

        setButtonLoading(submitBtn, 'Deleting account…');

        try {
            // Re-authenticate to verify the user owns this account.
            await signIn(email, password);
        } catch {
            clearErrors();
            showFieldError('password', 'Incorrect password');
            showSummary([{ id: 'delete-password', msg: 'Incorrect password' }]);
            resetButton(submitBtn, 'Delete account');
            return;
        }

        try {
            await deleteAccount();
            await signOut();
            navigate('/?account-deleted=1');
        } catch (err) {
            clearErrors();
            const msg = err?.message || 'Something went wrong. Please try again later.';
            showSummary([{ id: 'delete-password', msg }]);
            resetButton(submitBtn, 'Delete account');
        }
    });
}

