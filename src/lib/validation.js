// src/lib/validation.js

/** Returns an error message string, or '' if valid. */
export function validateEmail(email) {
    if (!email?.trim()) return 'Enter your email address';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address';
    return '';
}

/** Returns an error message string, or '' if valid. */
export function validateDisplayName(name) {
    if (!name?.trim()) return 'Enter a display name';
    if (!/^[A-Za-z0-9][A-Za-z0-9 _.-]{1,49}$/.test(name.trim())) {
        return 'Use only letters, numbers, spaces, hyphens, underscores or periods';
    }
    return '';
}

/** Returns an error message string, or '' if valid. */
export function validatePassword(password) {
    if (!password?.trim()) return 'Enter a password';
    const v = password.trim();
    if (v.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(v)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(v)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(v)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/.test(v)) return 'Password must contain at least one special character';
    return '';
}

/** Resets all GOV.UK error states on a form element. */
export function clearFieldErrors(form) {
    if (!form) return;
    form.querySelectorAll('.govuk-form-group--error').forEach(g => g.classList.remove('govuk-form-group--error'));
    form.querySelectorAll('.govuk-input--error').forEach(i => {
        i.classList.remove('govuk-input--error');
        i.removeAttribute('aria-invalid');
    });
    form.querySelectorAll('.govuk-error-message').forEach(m => {
        m.hidden = true;
        if (m.dataset.defaultText) m.textContent = m.dataset.defaultText;
    });
    const summary = form.querySelector('.govuk-error-summary');
    if (summary) {
        summary.hidden = true;
        summary.querySelector('.govuk-error-summary__list')?.replaceChildren();
    }
}

/** Marks a form field in the GOV.UK error state. */
export function setFieldError(fieldId, message) {
    document.getElementById(`${fieldId}-group`)?.classList.add('govuk-form-group--error');
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('govuk-input--error');
        field.setAttribute('aria-invalid', 'true');
    }
    const err = document.getElementById(`${fieldId}-error`);
    if (err) { err.hidden = false; err.textContent = message; }
}

/** Puts a button into the loading spinner state. */
export function setButtonLoading(button, text) {
    if (!button) return;
    button.disabled = true;
    button.classList.add('button-loading');
    button.innerHTML = `<span class="button-spinner" aria-hidden="true"></span>${text}`;
}

/** Restores a button from the loading state. */
export function resetButton(button, text) {
    if (!button) return;
    button.disabled = false;
    button.classList.remove('button-loading');
    button.textContent = text;
}

/** Populates and reveals the GOV.UK error summary on a form. */
export function showErrorSummary(form, errors) {
    if (!form || !errors?.length) return;
    const summary = form.querySelector('.govuk-error-summary');
    const list = summary?.querySelector('.govuk-error-summary__list');
    if (!list) return;
    list.innerHTML = errors.map(e => `<li><a href="#${e.fieldId}">${e.message}</a></li>`).join('');
    summary.hidden = false;
    summary.focus();
}

/** Shows a single auth error message in the GOV.UK error summary on a form. */
export function showAuthErrorSummary(form, message) {
    const summary = form.querySelector('.govuk-error-summary');
    const list = summary?.querySelector('.govuk-error-summary__list');
    if (!summary || !list) return;
    list.innerHTML = `<li><a href="#">${message}</a></li>`;
    summary.hidden = false;
    summary.focus();
}
