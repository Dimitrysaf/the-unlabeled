import { updateContent } from '../components/Layout.js';
import { getCurrentUser, getCurrentSession, signOut } from '../lib/auth.js';

export async function renderAccount() {
    let user, session;
    try {
        user = await getCurrentUser();
        session = await getCurrentSession();
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

    console.log('Session:', session);
    console.log('Session user:', session?.user);

    if (!user) {
        window.location.href = '/login';
        return;
    }

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
        console.log('User data:', user);
        console.log('User metadata:', user.user_metadata);
        console.log('User app_metadata:', user.app_metadata);
    }

    const displayName = user.user_metadata?.display_name ||
                       user.user_metadata?.name ||
                       user.app_metadata?.display_name ||
                       user.app_metadata?.name ||
                       'Not provided';

    const email = user.email || 'Not provided';

    // Format creation date
    const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : 'Not available';

    // Additional user data
    const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-GB') + ' at ' + new Date(user.last_sign_in_at).toLocaleTimeString('en-GB') : 'Never';
    const emailConfirmed = user.email_confirmed_at ? 'Yes (' + new Date(user.email_confirmed_at).toLocaleDateString('en-GB') + ')' : 'No';
    const accountConfirmed = user.confirmed_at ? new Date(user.confirmed_at).toLocaleDateString('en-GB') : 'Not confirmed';
    const lastUpdated = user.updated_at ? new Date(user.updated_at).toLocaleDateString('en-GB') : 'Not available';

    if (isLocalhost) {
        console.log('Display name:', displayName);
        console.log('Email:', email);
        console.log('Created at:', createdAt);
        console.log('Last sign in:', lastSignIn);
        console.log('Email confirmed:', emailConfirmed);
        console.log('Account confirmed:', accountConfirmed);
        console.log('Last updated:', lastUpdated);
    }

    updateContent(`
        <div class="govuk-!-padding-bottom-9">
            <div class="govuk-grid-row">
                <div class="govuk-grid-column-two-thirds">
                    <h1 class="govuk-heading-xl">Your account</h1>

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
                                <a class="govuk-link" href="#">Change<span class="govuk-visually-hidden"> password</span></a>
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
                        <button class="govuk-button govuk-button--warning" id="sign-out-btn">
                            Sign out
                        </button>
                    </div>
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
                alert('Failed to sign out. Please try again.');
            }
        });
    }
}