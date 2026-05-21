// src/pages/admin/users.js
import { escapeHtml } from '../../lib/escape.js';
import { logger } from '../../lib/logger.js';
import { updateContent } from '../../components/Layout.js';
import {
    listAllUsers,
    getUserById,
    banUser,
    unbanUser,
    adminDeleteUser,
    removeMfa,
    sendPasswordResetEmail,
    sendMagicLinkEmail,
    checkIsAdmin,
} from '../../data/admin.js';
import { go } from './utils.js';

export async function loadUsersSection() {
    try {
        renderUsersSection(await listAllUsers());
    } catch (err) {
        const el = document.getElementById('admin-users-body');
        if (el) el.innerHTML = `
            <div class="govuk-error-summary" data-module="govuk-error-summary">
                <div role="alert">
                    <h2 class="govuk-error-summary__title">Could not load users</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(err.message)}</p>
                    </div>
                </div>
            </div>`;
    }
}

export function renderUsersSection(result) {
    const el = document.getElementById('admin-users-body');
    const users = result?.users ?? [];
    if (!users.length) {
        el.innerHTML = `<p class="govuk-body govuk-hint">No users found.</p>`;
        return;
    }
    const plural = users.length === 1 ? 'user' : 'users';
    el.innerHTML = `
        <p class="govuk-body govuk-hint govuk-!-margin-bottom-2">${users.length} ${plural}</p>
        <div class="table-scroll table-truncate">
            <table class="govuk-table govuk-!-margin-bottom-0">
                <caption class="govuk-table__caption govuk-visually-hidden">All users</caption>
                <thead class="govuk-table__head">
                    <tr class="govuk-table__row">
                        <th class="govuk-table__header col-important" scope="col">Email</th>
                        <th class="govuk-table__header" scope="col">UID</th>
                        <th class="govuk-table__header" scope="col">Provider</th>
                        <th class="govuk-table__header col-important" scope="col">Status</th>
                        <th class="govuk-table__header" scope="col">Created</th>
                        <th class="govuk-table__header col-important" scope="col">Actions</th>
                    </tr>
                </thead>
                <tbody class="govuk-table__body">
                    ${users.map(u => userRow(u)).join('')}
                </tbody>
            </table>
        </div>
    `;
    users.forEach(u => {
        document.getElementById(`view-user-${u.id}`)?.addEventListener('click', e => {
            e.preventDefault();
            go(`view-user=${u.id}`);
        });
    });
}

function userRow(u) {
    const email = escapeHtml(u.email || '—');
    const uid = escapeHtml(u.id.slice(0, 8) + '…');
    const provider = escapeHtml(u.app_metadata?.provider || '—');
    const date = u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—';
    const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
    const status = isBanned
        ? `<strong class="govuk-tag govuk-tag--red">Banned</strong>`
        : `<strong class="govuk-tag govuk-tag--green">Active</strong>`;
    return `
        <tr class="govuk-table__row">
            <td class="govuk-table__cell col-important">${email}</td>
            <td class="govuk-table__cell admin-nowrap"><code class="admin-slug">${uid}</code></td>
            <td class="govuk-table__cell">${provider}</td>
            <td class="govuk-table__cell col-important">${status}</td>
            <td class="govuk-table__cell admin-nowrap">${date}</td>
            <td class="govuk-table__cell col-important">
                <a class="govuk-link govuk-link--no-visited-state" href="#" id="view-user-${u.id}">
                    View<span class="govuk-visually-hidden"> ${email}</span>
                </a>
            </td>
        </tr>`;
}

export async function showUserDetail(userId) {
    updateContent(`
        <a href="#" class="govuk-back-link" id="user-back">Back to admin</a>
        <span class="govuk-caption-xl">User management</span>
        <h1 class="govuk-heading-l">User detail</h1>
        <div class="admin-skeleton" style="max-width:40rem;">
            ${Array.from({ length: 8 }, () => `
                <div style="display:flex;gap:2rem;padding:0.6rem 0;border-bottom:1px solid #b1b4b6;">
                    <span class="skeleton-line skeleton-line--shorter" style="flex:1;margin:0;min-width:0;"></span>
                    <span class="skeleton-line" style="flex:2;margin:0;min-width:0;"></span>
                </div>`).join('')}
        </div>
    `);
    document.getElementById('user-back')?.addEventListener('click', e => { e.preventDefault(); go(''); });

    let user;
    try {
        user = await getUserById(userId);
    } catch (err) {
        updateContent(`
            <a href="#" class="govuk-back-link" id="user-back">Back to admin</a>
            <span class="govuk-caption-xl">User management</span>
            <h1 class="govuk-heading-l">User detail</h1>
            <div class="govuk-error-summary" role="alert">
                <div>
                    <h2 class="govuk-error-summary__title">Could not load user</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(err.message)}</p>
                    </div>
                </div>
            </div>`);
        document.getElementById('user-back')?.addEventListener('click', e => { e.preventDefault(); go(''); });
        return;
    }

    const email = escapeHtml(user.email || '—');
    const isBanned = user.banned_until && new Date(user.banned_until) > new Date();
    const banFormatted = isBanned
        ? new Date(user.banned_until).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
        : '';
    const statusTag = isBanned
        ? `<strong class="govuk-tag govuk-tag--red">Banned</strong> <span class="govuk-body-s">until ${escapeHtml(banFormatted)}</span>`
        : `<strong class="govuk-tag govuk-tag--green">Active</strong>`;
    const providers = (user.app_metadata?.providers || [user.app_metadata?.provider])
        .filter(Boolean).map(escapeHtml).join(', ') || '—';
    const hasMfa = (user.factors?.length ?? 0) > 0;
    const fmt = iso => iso
        ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
        : '—';

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">
                <a href="#" class="govuk-back-link" id="user-back">Back to admin</a>
                <span class="govuk-caption-xl">User management</span>
                <h1 class="govuk-heading-l" style="overflow-wrap:break-word;word-break:break-all;">${email}</h1>

                <dl class="govuk-summary-list">
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Email</dt>
                        <dd class="govuk-summary-list__value">${email}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">UUID</dt>
                        <dd class="govuk-summary-list__value"><code class="admin-slug">${escapeHtml(user.id)}</code></dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Status</dt>
                        <dd class="govuk-summary-list__value">${statusTag}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Provider(s)</dt>
                        <dd class="govuk-summary-list__value">${providers}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">MFA factors</dt>
                        <dd class="govuk-summary-list__value">${hasMfa ? escapeHtml(String(user.factors.length)) : 'None'}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Role</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(user.role || '—')}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Phone</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(user.phone || '—')}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Created</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(fmt(user.created_at))}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Last sign in</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(fmt(user.last_sign_in_at))}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Email confirmed</dt>
                        <dd class="govuk-summary-list__value">${user.email_confirmed_at ? escapeHtml(new Date(user.email_confirmed_at).toLocaleDateString('en-GB')) : 'No'}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Last updated</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(fmt(user.updated_at))}</dd>
                    </div>
                </dl>

                <h2 class="govuk-heading-m govuk-!-margin-top-6">Actions</h2>
                <div id="user-action-status" class="govuk-!-margin-bottom-4"></div>
                <div class="govuk-button-group">
                    ${isBanned
            ? `<button class="govuk-button govuk-button--secondary" id="btn-unban">Unban</button>`
            : `<button class="govuk-button govuk-button--secondary" id="btn-ban">Ban user</button>`
        }
                    <button class="govuk-button govuk-button--secondary" id="btn-reset-pwd">Send password reset</button>
                    <button class="govuk-button govuk-button--secondary" id="btn-magic-link">Send magic link</button>
                    ${hasMfa ? `<button class="govuk-button govuk-button--secondary" id="btn-remove-mfa">Remove 2FA</button>` : ''}
                    <button class="govuk-button govuk-button--warning" id="btn-delete-user">Delete user</button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('user-back')?.addEventListener('click', e => { e.preventDefault(); go(''); });
    document.getElementById('btn-ban')?.addEventListener('click', () => go(`ban-user=${user.id}`));

    document.getElementById('btn-delete-user')?.addEventListener('click', () => go(`delete-user=${user.id}`));

    checkIsAdmin(user.id)
        .then(targetIsAdmin => {
            if (!targetIsAdmin) return;
            const btn = document.getElementById('btn-delete-user');
            if (!btn) return;
            btn.disabled = true;
            btn.title = 'Admin accounts cannot be deleted.';
        })
        .catch(err => logger.error('[users] checkIsAdmin failed', err));

    document.getElementById('btn-unban')?.addEventListener('click', () =>
        inlineUserAction('btn-unban', 'Unbanning…', () => unbanUser(user.id), 'User unbanned successfully.'));
    document.getElementById('btn-reset-pwd')?.addEventListener('click', () =>
        inlineUserAction('btn-reset-pwd', 'Sending…', () => sendPasswordResetEmail(user.email), 'Password reset email sent.'));
    document.getElementById('btn-magic-link')?.addEventListener('click', () =>
        inlineUserAction('btn-magic-link', 'Sending…', () => sendMagicLinkEmail(user.email), 'Magic link sent.'));
    document.getElementById('btn-remove-mfa')?.addEventListener('click', () =>
        inlineUserAction('btn-remove-mfa', 'Removing…', () => removeMfa(user.id), 'All 2FA methods removed.'));
}

function inlineUserAction(btnId, loadingText, action, successMessage) {
    const btn = document.getElementById(btnId);
    const statusEl = document.getElementById('user-action-status');
    if (!btn) return;
    const savedText = btn.textContent;
    btn.disabled = true;
    btn.textContent = loadingText;
    if (statusEl) statusEl.innerHTML = '';
    action()
        .then(() => {
            if (statusEl) statusEl.innerHTML = `
                <div class="govuk-notification-banner govuk-notification-banner--success" role="alert"
                     aria-labelledby="ua-success" data-module="govuk-notification-banner">
                    <div class="govuk-notification-banner__header">
                        <h2 class="govuk-notification-banner__title" id="ua-success">Success</h2>
                    </div>
                    <div class="govuk-notification-banner__content">
                        <p class="govuk-notification-banner__heading">${escapeHtml(successMessage)}</p>
                    </div>
                </div>`;
            btn.disabled = false;
            btn.textContent = savedText;
        })
        .catch(err => {
            if (statusEl) statusEl.innerHTML = `
                <div class="govuk-error-summary" role="alert">
                    <div>
                        <h2 class="govuk-error-summary__title">There is a problem</h2>
                        <div class="govuk-error-summary__body">
                            <p class="govuk-body">${escapeHtml(err.message)}</p>
                        </div>
                    </div>
                </div>`;
            btn.disabled = false;
            btn.textContent = savedText;
        });
}

export async function showBanUserForm(userId) {
    updateContent(`
        <a href="#" class="govuk-back-link" id="ban-back">Back</a>
        <span class="govuk-caption-xl">User management</span>
        <h1 class="govuk-heading-l">Ban user</h1>
        <div class="skeleton-line skeleton-line--short" style="max-width:24rem;height:1rem;margin-bottom:1rem;"></div>
    `);
    document.getElementById('ban-back')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });

    let user;
    try {
        user = await getUserById(userId);
    } catch (err) {
        updateContent(`
            <a href="#" class="govuk-back-link" id="ban-back">Back to user</a>
            <span class="govuk-caption-xl">User management</span>
            <h1 class="govuk-heading-l">Ban user</h1>
            <div class="govuk-error-summary" role="alert">
                <div>
                    <h2 class="govuk-error-summary__title">Could not load user</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(err.message)}</p>
                    </div>
                </div>
            </div>`);
        document.getElementById('ban-back')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });
        return;
    }

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">
                <a href="#" class="govuk-back-link" id="ban-back">Back to user</a>
                <span class="govuk-caption-xl">User management</span>
                <h1 class="govuk-heading-l">Ban user</h1>

                <dl class="govuk-summary-list govuk-!-margin-bottom-6">
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">User</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(user.email || userId)}</dd>
                    </div>
                </dl>

                <div class="govuk-warning-text">
                    <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
                    <strong class="govuk-warning-text__text">
                        <span class="govuk-warning-text__assistive">Warning</span>
                        The user will be unable to post comments for the duration of the ban.
                    </strong>
                </div>

                <div id="ban-error"></div>

                <form id="ban-form" novalidate>
                    <div class="govuk-form-group" id="ban-duration-group">
                        <label class="govuk-label govuk-label--s" for="ban-amount">Duration</label>
                        <div style="display:flex;gap:0.5rem;align-items:flex-start">
                            <input class="govuk-input govuk-input--width-5" type="number"
                                   id="ban-amount" name="ban-amount" min="1" value="24">
                            <select class="govuk-select" id="ban-unit" name="ban-unit">
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                            </select>
                        </div>
                        <p class="govuk-error-message" id="ban-amount-error" hidden>
                            <span class="govuk-visually-hidden">Error:</span>
                            <span id="ban-amount-error-text"></span>
                        </p>
                    </div>

                    <div class="govuk-button-group govuk-!-margin-top-4">
                        <button class="govuk-button govuk-button--warning" type="submit" id="ban-submit-btn">
                            Ban user
                        </button>
                        <a class="govuk-link" href="#" id="ban-cancel">Cancel</a>
                    </div>
                </form>
            </div>
        </div>
    `);

    document.getElementById('ban-back')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });
    document.getElementById('ban-cancel')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });

    document.getElementById('ban-form').addEventListener('submit', async e => {
        e.preventDefault();
        const amount = Number(document.getElementById('ban-amount').value);
        const unit = document.getElementById('ban-unit').value;
        const errorEl = document.getElementById('ban-amount-error');
        const errorText = document.getElementById('ban-amount-error-text');
        const group = document.getElementById('ban-duration-group');

        group.classList.remove('govuk-form-group--error');
        errorEl.hidden = true;

        if (!amount || amount < 1 || !Number.isFinite(amount)) {
            group.classList.add('govuk-form-group--error');
            errorText.textContent = 'Enter a duration of at least 1.';
            errorEl.hidden = false;
            document.getElementById('ban-amount')?.focus();
            return;
        }

        const hours = unit === 'days' ? amount * 24 : amount;
        const submitBtn = document.getElementById('ban-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Banning…';

        try {
            await banUser(userId, hours);
            go(`view-user=${userId}`);
        } catch (err) {
            document.getElementById('ban-error').innerHTML = `
                <div class="govuk-error-summary" role="alert">
                    <div>
                        <h2 class="govuk-error-summary__title">There is a problem</h2>
                        <div class="govuk-error-summary__body">
                            <p class="govuk-body">${escapeHtml(err.message)}</p>
                        </div>
                    </div>
                </div>`;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Ban user';
        }
    });
}

export async function showDeleteUserConfirm(userId) {
    updateContent(`
        <a href="#" class="govuk-back-link" id="delete-back">Back</a>
        <span class="govuk-caption-xl">User management</span>
        <h1 class="govuk-heading-l">Delete user</h1>
        <div class="skeleton-line skeleton-line--short" style="max-width:24rem;height:1rem;margin-bottom:1rem;"></div>
    `);
    document.getElementById('delete-back')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });

    let user, targetIsAdmin;
    try {
        [user, targetIsAdmin] = await Promise.all([
            getUserById(userId),
            checkIsAdmin(userId).catch(() => false),
        ]);
    } catch (err) {
        updateContent(`
            <a href="#" class="govuk-back-link" id="delete-back">Back to user</a>
            <span class="govuk-caption-xl">User management</span>
            <h1 class="govuk-heading-l">Delete user</h1>
            <div class="govuk-error-summary" role="alert">
                <div>
                    <h2 class="govuk-error-summary__title">Could not load user</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(err.message)}</p>
                    </div>
                </div>
            </div>`);
        document.getElementById('delete-back')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });
        return;
    }

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">
                <a href="#" class="govuk-back-link" id="delete-back">Back to user</a>
                <span class="govuk-caption-xl">User management</span>
                <h1 class="govuk-heading-l">Delete user</h1>

                <dl class="govuk-summary-list govuk-!-margin-bottom-6">
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Email</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(user.email || '—')}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">UUID</dt>
                        <dd class="govuk-summary-list__value"><code class="admin-slug">${escapeHtml(user.id)}</code></dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Created</dt>
                        <dd class="govuk-summary-list__value">${user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : '—'}</dd>
                    </div>
                </dl>

                <div class="govuk-warning-text">
                    <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
                    <strong class="govuk-warning-text__text">
                        <span class="govuk-warning-text__assistive">Warning</span>
                        This user account will be permanently deleted and cannot be recovered.
                    </strong>
                </div>

                <div id="delete-error"></div>

                ${targetIsAdmin
                    ? `<div class="govuk-warning-text govuk-!-margin-top-4">
                        <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
                        <strong class="govuk-warning-text__text">
                            <span class="govuk-warning-text__assistive">Warning</span>
                            Admin accounts cannot be deleted.
                        </strong>
                    </div>
                    <div class="govuk-button-group govuk-!-margin-top-4">
                        <a class="govuk-link" href="#" id="cancel-delete-btn">Go back</a>
                    </div>`
                    : `<div class="govuk-button-group govuk-!-margin-top-4">
                        <button class="govuk-button govuk-button--warning" id="confirm-delete-btn">
                            Delete user
                        </button>
                        <a class="govuk-link" href="#" id="cancel-delete-btn">Cancel</a>
                    </div>`
                }
            </div>
        </div>
    `);

    document.getElementById('delete-back')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });
    document.getElementById('cancel-delete-btn')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });

    const confirmBtn = document.getElementById('confirm-delete-btn');
    confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deleting…';
        try {
            await adminDeleteUser(userId);
            go('');
        } catch (err) {
            document.getElementById('delete-error').innerHTML = `
                <div class="govuk-error-summary" role="alert">
                    <div>
                        <h2 class="govuk-error-summary__title">There is a problem</h2>
                        <div class="govuk-error-summary__body">
                            <p class="govuk-body">${escapeHtml(err.message)}</p>
                        </div>
                    </div>
                </div>`;
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Delete user';
        }
    });
}
