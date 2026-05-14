// src/pages/account.js
import { updateContent } from '../components/Layout.js';
import { navigate } from '../router.js';
import { getCurrentUser, signOut } from '../lib/auth.js';
import { checkIsAdmin } from '../data/admin.js';
import { isPushSupported, getSubscriptionState, subscribe, unsubscribe } from '../lib/notifications.js';

export async function renderAccount() {
    let user, isAdmin;
    try {
        [user, isAdmin] = await Promise.all([getCurrentUser(), checkIsAdmin()]);
    } catch (error) {
        console.error('Error retrieving user data:', error);
        updateContent(`
            <div class="govuk-!-padding-bottom-9">
                <div class="govuk-grid-row">
                    <div class="govuk-grid-column-two-thirds">
                        <h1 class="govuk-heading-xl">Your account</h1>
                        <p class="govuk-body">Error retrieving data. Please try refreshing the page.</p>
                    </div>
                </div>
            </div>
        `);
        return;
    }

    if (!user) {
        navigate('/login');
        return;
    }

    const displayName = user.user_metadata?.display_name ||
        user.user_metadata?.name ||
        user.app_metadata?.display_name ||
        user.app_metadata?.name ||
        'Not provided';

    const email = user.email || 'Not provided';

    const createdAt = user.created_at
        ? new Date(user.created_at).toLocaleDateString('en-GB') : 'Not available';
    const lastSignIn = user.last_sign_in_at
        ? new Date(user.last_sign_in_at).toLocaleDateString('en-GB') +
        ' at ' + new Date(user.last_sign_in_at).toLocaleTimeString('en-GB')
        : 'Never';
    const emailConfirmed = user.email_confirmed_at
        ? 'Yes (' + new Date(user.email_confirmed_at).toLocaleDateString('en-GB') + ')'
        : 'No';
    const accountConfirmed = user.confirmed_at
        ? new Date(user.confirmed_at).toLocaleDateString('en-GB')
        : 'Not confirmed';
    const lastUpdated = user.updated_at
        ? new Date(user.updated_at).toLocaleDateString('en-GB') : 'Not available';

    // ── Ban status ──
    const isBanned = user.banned_until && new Date(user.banned_until) > new Date();
    const banUntilFormatted = isBanned
        ? new Date(user.banned_until).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
        : '';

    const banBanner = isBanned ? `
        <div class="govuk-notification-banner" role="region"
             aria-labelledby="ban-banner-title"
             data-module="govuk-notification-banner">
            <div class="govuk-notification-banner__header">
                <h2 class="govuk-notification-banner__title" id="ban-banner-title">Important</h2>
            </div>
            <div class="govuk-notification-banner__content">
                <p class="govuk-notification-banner__heading">Your account is banned until ${banUntilFormatted}.</p>
                <p class="govuk-body">You cannot post comments until your ban expires.</p>
            </div>
        </div>
    ` : '';

    const banRow = isBanned ? `
        <div class="govuk-summary-list__row">
            <dt class="govuk-summary-list__key">Account status</dt>
            <dd class="govuk-summary-list__value">
                <strong class="govuk-tag govuk-tag--red">Banned</strong>
                <span class="govuk-body-s" style="display:block;margin-top:4px">Until ${banUntilFormatted}</span>
            </dd>
        </div>
    ` : '';

    // ── Success banner after a direct field update ──
    const searchParams = new URLSearchParams(window.location.search);
    const updateParam = searchParams.get('updated');
    const updateMessages = {
        'display-name': 'Your display name has been updated.',
        'password': 'Your password has been updated.',
    };
    const successBanner = updateParam && updateMessages[updateParam] ? `
        <div class="govuk-notification-banner govuk-notification-banner--success"
             role="alert"
             aria-labelledby="account-success-banner-title"
             data-module="govuk-notification-banner">
            <div class="govuk-notification-banner__header">
                <h2 class="govuk-notification-banner__title" id="account-success-banner-title">
                    Success
                </h2>
            </div>
            <div class="govuk-notification-banner__content">
                <p class="govuk-notification-banner__heading">
                    ${updateMessages[updateParam]}
                </p>
            </div>
        </div>
    ` : '';

    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">
                    <h1 class="govuk-heading-xl">Your account</h1>

                    ${successBanner}
                    ${banBanner}

                    <dl class="govuk-summary-list">
                        <div class="govuk-summary-list__row">
                            <dt class="govuk-summary-list__key">
                                Display name
                            </dt>
                            <dd class="govuk-summary-list__value">
                                ${displayName}
                            </dd>
                            <dd class="govuk-summary-list__actions">
                                <a class="govuk-link" href="/c/display-name">Change<span class="govuk-visually-hidden"> display name</span></a>
                            </dd>
                        </div>
                        <div class="govuk-summary-list__row">
                            <dt class="govuk-summary-list__key">
                                Email address
                            </dt>
                            <dd class="govuk-summary-list__value">
                                ${email}
                            </dd>
                            <dd class="govuk-summary-list__actions">
                                <a class="govuk-link" href="/c/email">Change<span class="govuk-visually-hidden"> email address</span></a>
                            </dd>
                        </div>
                        <div class="govuk-summary-list__row">
                            <dt class="govuk-summary-list__key">
                                Password
                            </dt>
                            <dd class="govuk-summary-list__value">
                                ••••••••
                            </dd>
                            <dd class="govuk-summary-list__actions">
                                <a class="govuk-link" href="/c/password">Change<span class="govuk-visually-hidden"> password</span></a>
                            </dd>
                        </div>
                        <div class="govuk-summary-list__row">
                            <dt class="govuk-summary-list__key">
                                Account created
                            </dt>
                            <dd class="govuk-summary-list__value">
                                ${createdAt}
                            </dd>
                        </div>
                        <div class="govuk-summary-list__row">
                            <dt class="govuk-summary-list__key">
                                Last sign in
                            </dt>
                            <dd class="govuk-summary-list__value">
                                ${lastSignIn}
                            </dd>
                        </div>
                        ${banRow}
                        <div class="govuk-summary-list__row">
                            <dt class="govuk-summary-list__key">
                                Email confirmed
                            </dt>
                            <dd class="govuk-summary-list__value">
                                ${emailConfirmed}
                            </dd>
                        </div>
                        <div class="govuk-summary-list__row">
                            <dt class="govuk-summary-list__key">
                                Account confirmed
                            </dt>
                            <dd class="govuk-summary-list__value">
                                ${accountConfirmed}
                            </dd>
                        </div>
                        <div class="govuk-summary-list__row">
                            <dt class="govuk-summary-list__key">
                                Last updated
                            </dt>
                            <dd class="govuk-summary-list__value">
                                ${lastUpdated}
                            </dd>
                        </div>
                        <div class="govuk-summary-list__row">
                            <dt class="govuk-summary-list__key">
                                User ID
                            </dt>
                            <dd class="govuk-summary-list__value">
                                ${user.id}
                            </dd>
                        </div>
                    </dl>

                    ${isPushSupported ? `
                    <h2 class="govuk-heading-m govuk-!-margin-top-6">Notifications</h2>
                    <p class="govuk-body" id="notify-status-text">Checking notification status…</p>
                    <div class="govuk-button-group">
                        <button class="govuk-button govuk-button--secondary" id="notify-btn" disabled>
                            Subscribe to notifications
                        </button>
                    </div>
                    ` : ''}

                    ${isAdmin ? `
                    <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible govuk-!-margin-top-6">
                    <h2 class="govuk-heading-m">Admin</h2>
                    <p class="govuk-body">Manage content and review user submissions.</p>
                    <div class="govuk-button-group">
                        <a href="/admin" class="govuk-button govuk-button--secondary">Admin panel</a>
                        <a href="/admin#admin-submissions-body" class="govuk-link">View submissions</a>
                    </div>
                    ` : ''}

                    <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible govuk-!-margin-top-6">
                    <h2 class="govuk-heading-m">Sign out</h2>
                    <p class="govuk-body">Sign out of your account on this device.</p>
                    <p class="govuk-error-message" id="sign-out-error" style="display:none">Failed to sign out. Please try again.</p>
                    <div class="govuk-button-group">
                        <button class="govuk-button govuk-button--warning" id="sign-out-btn">
                            Sign out
                        </button>
                    </div>

                    <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible">

                    <h2 class="govuk-heading-m">Danger zone</h2>
                    <p class="govuk-body">Deleting your account is permanent and cannot be undone.</p>
                    <a href="/account/delete" class="govuk-button govuk-button--warning" data-module="govuk-button">
                        Delete account
                    </a>
                </div>
            </div>
        </div>
    `);

    initAccountPage();
}

function initAccountPage() {
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            try {
                await signOut();
                navigate('/');
            } catch (error) {
                console.error('Sign out error:', error);
                const errEl = document.getElementById('sign-out-error');
                if (errEl) errEl.style.display = 'block';
            }
        });
    }

    const notifyBtn = document.getElementById('notify-btn');
    const notifyText = document.getElementById('notify-status-text');
    if (!notifyBtn || !notifyText) return;

    getSubscriptionState().then(state => {
        if (state === 'denied') {
            notifyText.textContent = 'Notifications are blocked in your browser settings.';
            notifyBtn.textContent = 'Notifications blocked';
            notifyBtn.disabled = true;
            return;
        }
        const subscribed = state === 'subscribed';
        notifyText.textContent = subscribed
            ? 'You are subscribed to notifications for new articles.'
            : 'Subscribe to receive a notification when a new article is published.';
        notifyBtn.textContent = subscribed ? 'Unsubscribe from notifications' : 'Subscribe to notifications';
        notifyBtn.disabled = false;

        notifyBtn.addEventListener('click', async () => {
            notifyBtn.disabled = true;
            const current = await getSubscriptionState();
            if (current === 'subscribed') {
                await unsubscribe();
                notifyText.textContent = 'Subscribe to receive a notification when a new article is published.';
                notifyBtn.textContent = 'Subscribe to notifications';
            } else {
                const ok = await subscribe();
                notifyText.textContent = ok
                    ? 'You are subscribed to notifications for new articles.'
                    : 'Subscribe to receive a notification when a new article is published.';
                notifyBtn.textContent = ok ? 'Unsubscribe from notifications' : 'Subscribe to notifications';
            }
            notifyBtn.disabled = false;
        });
    });
}