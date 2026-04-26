export function validateEmail(email) {
    if (!email || !email.trim()) {
        return 'Enter your email address';
    }

    const normalized = email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalized)) {
        return 'Enter a valid email address';
    }

    return '';
}

export function validateDisplayName(name) {
    if (!name || !name.trim()) {
        return 'Enter a display name';
    }

    const trimmed = name.trim();
    const namePattern = /^[A-Za-z0-9][A-Za-z0-9 _.-]{1,49}$/;
    if (!namePattern.test(trimmed)) {
        return 'Use only letters, numbers, spaces, hyphens, underscores or periods';
    }

    return '';
}

export function validatePassword(password) {
    if (!password || !password.trim()) {
        return 'Enter a password';
    }

    const value = password.trim();
    if (value.length < 8) {
        return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(value)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(value)) {
        return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(value)) {
        return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/.test(value)) {
        return 'Password must contain at least one special character';
    }

    return '';
}

export function clearFieldErrors(form) {
    if (!form) return;
    const errorGroups = form.querySelectorAll('.govuk-form-group--error');
    errorGroups.forEach(group => group.classList.remove('govuk-form-group--error'));

    const errorInputs = form.querySelectorAll('.govuk-input--error');
    errorInputs.forEach(input => {
        input.classList.remove('govuk-input--error');
        input.removeAttribute('aria-invalid');
    });

    const errorMessages = form.querySelectorAll('.govuk-error-message');
    errorMessages.forEach(message => {
        message.hidden = true;
        if (message.dataset.defaultText) {
            message.textContent = message.dataset.defaultText;
        }
    });

    const errorSummary = form.querySelector('.govuk-error-summary');
    if (errorSummary) {
        errorSummary.hidden = true;
        const list = errorSummary.querySelector('.govuk-error-summary__list');
        if (list) {
            list.innerHTML = '';
        }
    }
}

export function setFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const group = document.getElementById(`${fieldId}-group`);
    const errorMessage = document.getElementById(`${fieldId}-error`);

    if (group) {
        group.classList.add('govuk-form-group--error');
    }
    if (field) {
        field.classList.add('govuk-input--error');
        field.setAttribute('aria-invalid', 'true');
    }
    if (errorMessage) {
        errorMessage.hidden = false;
        errorMessage.textContent = message;
    }
}

export function setButtonLoading(button, text) {
    if (!button) return;
    button.disabled = true;
    button.classList.add('button-loading');
    button.innerHTML = `<span class="button-spinner" aria-hidden="true"></span>${text}`;
}

export function resetButton(button, text) {
    if (!button) return;
    button.disabled = false;
    button.classList.remove('button-loading');
    button.textContent = text;
}

export function showErrorSummary(form, errors) {
    if (!form || !Array.isArray(errors) || errors.length === 0) return;

    const summary = form.querySelector('.govuk-error-summary');
    if (!summary) return;

    const list = summary.querySelector('.govuk-error-summary__list');
    if (!list) return;

    list.innerHTML = errors.map(error => `
        <li>
          <a href="#${error.fieldId}">${error.message}</a>
        </li>
    `).join('');

    summary.hidden = false;
    summary.focus();
}
