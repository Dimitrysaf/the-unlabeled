import { updateContent } from '../components/Layout.js';
import { getCurrentUser, signOut } from '../lib/auth.js';

export async function renderAccount() {
    let user;
    try {
        user = await getCurrentUser();
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
        window.location.href = '/login';
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

                    <div class="govuk-!-margin-top-9">
                        <p class="govuk-error-message" id="sign-out-error" style="display:none">Failed to sign out. Please try again.</p>
                        <div class="govuk-button-group">
                            <button class="govuk-button govuk-button--warning" id="sign-out-btn">
                                Sign out
                            </button>
                        </div>
                    </div>

                    <hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible govuk-!-margin-top-6">

                    <h2 class="govuk-heading-m govuk-!-margin-top-6">Danger zone</h2>
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
                window.location.href = '/';
            } catch (error) {
                console.error('Sign out error:', error);
                const errEl = document.getElementById('sign-out-error');
                if (errEl) errEl.style.display = 'block';
            }
        });
    }
}