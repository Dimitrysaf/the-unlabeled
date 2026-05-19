// src/pages/cookies.js
import { updateContent } from '../components/Layout.js';
import {
  hasCookiePolicyCookie,
  hasSessionCookie,
  readCookiePreferences,
  writeCookiePreferences
} from '../lib/cookiePreferences.js';

function getReturnPath() {
  const fallback = '/';
  try {
    const ref = document.referrer;
    if (!ref) return fallback;
    const refUrl = new URL(ref);
    if (refUrl.origin !== window.location.origin) return fallback;
    return `${refUrl.pathname}${refUrl.search}${refUrl.hash}`;
  } catch {
    return fallback;
  }
}

function updateBannerReturnLink() {
  const bannerLink = document.getElementById('cookie-success-link');
  if (!bannerLink) return;
  bannerLink.setAttribute('href', getReturnPath());
}

function initCookieSettingsForm() {
  const form = document.getElementById('cookie-settings-form');
  const successBanner = document.getElementById('cookie-success-banner');
  const analyticsYes = document.getElementById('cookies-analytics');
  const analyticsNo = document.getElementById('cookies-analytics-2');
  if (!form || !successBanner || !analyticsYes || !analyticsNo) return;

  const prefs = readCookiePreferences();
  const analyticsEnabled = prefs ? prefs.analytics : false;
  analyticsYes.checked = analyticsEnabled;
  analyticsNo.checked = !analyticsEnabled;

  updateBannerReturnLink();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const analytics = analyticsYes.checked;
    const nextPrefs = writeCookiePreferences(analytics, { bannerHidden: true });
    successBanner.removeAttribute('hidden');
    successBanner.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: nextPrefs }));
  });
}

export function renderCookies() {
  const prefs = readCookiePreferences();
  const sessionCookieExpiry = hasSessionCookie()
    ? '20 hours (rolling from latest sign-in)'
    : 'Not set unless you are signed in';
  const policyCookieExpiry = hasCookiePolicyCookie()
    ? '1 year (from your last saved choice)'
    : 'Not set until you save settings';
  const policyState = prefs
    ? `Current setting: analytics ${prefs.analytics ? 'accepted' : 'rejected'}`
    : 'Current setting: no preference saved yet';

  updateContent(`
    <div class="govuk-grid-row">
      <div class="govuk-grid-column-two-thirds">
        <h1 class="govuk-heading-l">Cookies</h1>
        <p class="govuk-body">Cookies are small files saved on your phone, tablet or computer when you visit a website.</p>
        <p class="govuk-body">We use cookies to make this site work and collect information about how you use our service.</p>
        <h2 class="govuk-heading-m">Essential cookies</h2>
        <p class="govuk-body">Essential cookies keep your information secure while you use this service. We do not need to ask permission to use them.</p>
        <table class="govuk-table">
          <caption class="govuk-table__caption govuk-table__caption--s">Essential cookies we use</caption>
          <thead class="govuk-table__head">
            <tr class="govuk-table__row">
              <th scope="col" class="govuk-table__header">Name</th>
              <th scope="col" class="govuk-table__header">Purpose</th>
              <th scope="col" class="govuk-table__header">Expires</th>
            </tr>
          </thead>
          <tbody class="govuk-table__body">
            <tr class="govuk-table__row">
              <td class="govuk-table__cell">session_cookie</td>
              <td class="govuk-table__cell">Used to keep you signed in</td>
              <td class="govuk-table__cell">${sessionCookieExpiry}</td>
            </tr>
            <tr class="govuk-table__row">
              <td class="govuk-table__cell">cookie_policy</td>
              <td class="govuk-table__cell">Saves your cookie consent settings. ${policyState}</td>
              <td class="govuk-table__cell">${policyCookieExpiry}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="govuk-notification-banner govuk-notification-banner--success" role="alert" aria-labelledby="govuk-notification-banner-title" data-module="govuk-notification-banner" id="cookie-success-banner" hidden>
      <div class="govuk-notification-banner__header">
        <h2 class="govuk-notification-banner__title" id="govuk-notification-banner-title">
          Success
        </h2>
      </div>
      <div class="govuk-notification-banner__content">
        <p class="govuk-notification-banner__heading">
          You have set your cookie preferences. <a class="govuk-notification-banner__link" id="cookie-success-link" href="/">Go back to the page you were looking at</a>.
        </p>
      </div>
    </div>

    <noscript>
      <div class="govuk-grid-row">
        <div class="govuk-grid-column-two-thirds">
          <h2 class="govuk-heading-l">Change your cookie settings</h2>
          <p class="govuk-body">We cannot change your cookie settings at the moment because JavaScript is not running in your browser. To fix this, try:</p>
          <ul class="govuk-list govuk-list--bullet">
            <li>turning on JavaScript in your browser settings</li>
            <li>reloading this page</li>
          </ul>
        </div>
      </div>
    </noscript>

    <div class="govuk-grid-row">
      <div class="govuk-grid-column-two-thirds">
        <h2 class="govuk-heading-l">Change your cookie settings</h2>
        <form action="/form-handler" method="post" novalidate id="cookie-settings-form">
          <div class="govuk-form-group">
            <fieldset class="govuk-fieldset">
              <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">
                Do you want to accept functional cookies?
              </legend>
              <div class="govuk-radios" data-module="govuk-radios">
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="cookies-functional" name="cookies[functional]" type="radio" value="yes" checked disabled>
                  <label class="govuk-label govuk-radios__label" for="cookies-functional">
                    Yes
                  </label>
                </div>
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="cookies-functional-2" name="cookies[functional]" type="radio" value="no" disabled>
                  <label class="govuk-label govuk-radios__label" for="cookies-functional-2">
                    No
                  </label>
                </div>
              </div>
            </fieldset>
            <p class="govuk-hint">Functional cookies are required for core site features and cannot be switched off.</p>
          </div>
          <div class="govuk-form-group">
            <fieldset class="govuk-fieldset">
              <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">
                Do you want to accept analytics cookies?
              </legend>
              <div class="govuk-radios" data-module="govuk-radios">
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="cookies-analytics" name="cookies[analytics]" type="radio" value="yes">
                  <label class="govuk-label govuk-radios__label" for="cookies-analytics">
                    Yes
                  </label>
                </div>
                <div class="govuk-radios__item">
                  <input class="govuk-radios__input" id="cookies-analytics-2" name="cookies[analytics]" type="radio" value="no" checked>
                  <label class="govuk-label govuk-radios__label" for="cookies-analytics-2">
                    No
                  </label>
                </div>
              </div>
            </fieldset>
          </div>
          <button type="submit" class="govuk-button" data-module="govuk-button">
            Save cookie settings
          </button>
        </form>
      </div>
    </div>
`);

  initCookieSettingsForm();
}
