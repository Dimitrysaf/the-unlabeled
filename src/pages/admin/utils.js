// src/pages/admin/utils.js
import { navigate } from '../../router.js';
import { escapeHtml } from '../../lib/escape.js';

export function go(search) {
    navigate('/admin' + (search ? '?' + search : ''));
}

export function showBanner(type, message) {
    const el = document.getElementById('admin-banner');
    if (!el) return;
    if (type === 'error') {
        el.innerHTML = `
            <div class="govuk-error-summary" role="alert">
                <div>
                    <h2 class="govuk-error-summary__title">There is a problem</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(message)}</p>
                    </div>
                </div>
            </div>`;
    } else {
        el.innerHTML = `
            <div class="govuk-notification-banner govuk-notification-banner--success" role="alert"
                 aria-labelledby="admin-banner-title" data-module="govuk-notification-banner">
                <div class="govuk-notification-banner__header">
                    <h2 class="govuk-notification-banner__title" id="admin-banner-title">Success</h2>
                </div>
                <div class="govuk-notification-banner__content">
                    <p class="govuk-notification-banner__heading">${escapeHtml(message)}</p>
                </div>
            </div>`;
        setTimeout(() => { if (el) el.innerHTML = ''; }, 3000);
    }
}
