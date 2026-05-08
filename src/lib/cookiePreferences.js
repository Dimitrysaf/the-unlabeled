// src/lib/cookiePreferences.js
export const COOKIE_PREF_KEY = 'cookie-preferences-v1';
export const COOKIE_POLICY_COOKIE_NAME = 'cookie_policy';
export const SESSION_COOKIE_NAME = 'session_cookie';

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
const TWENTY_HOURS_SECONDS = 20 * 60 * 60;

function readCookieValue(name) {
    for (const pair of (document.cookie || '').split(';')) {
        const trimmed = pair.trim();
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        if (trimmed.slice(0, eqIdx) === name) return trimmed.slice(eqIdx + 1);
    }
    return null;
}

function writeCookie(name, value, maxAgeSeconds) {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function deleteCookie(name) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function parsePreferences(raw) {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.analytics !== 'boolean') return null;
        return { analytics: parsed.analytics, bannerHidden: Boolean(parsed.bannerHidden) };
    } catch {
        return null;
    }
}

/** @returns {boolean} */
export function hasSessionCookie() {
    return Boolean(readCookieValue(SESSION_COOKIE_NAME));
}

/** @returns {boolean} */
export function hasCookiePolicyCookie() {
    return Boolean(readCookieValue(COOKIE_POLICY_COOKIE_NAME));
}

/** Returns parsed preferences or null if the user has not chosen yet. */
export function readCookiePreferences() {
    const rawPolicy = readCookieValue(COOKIE_POLICY_COOKIE_NAME);
    if (rawPolicy) {
        const parsed = parsePreferences(decodeURIComponent(rawPolicy));
        if (parsed) return parsed;
    }

    try {
        const raw = window.localStorage.getItem(COOKIE_PREF_KEY);
        const parsed = parsePreferences(raw);
        if (!parsed) return null;
        // Backfill the real cookie when only legacy localStorage data exists.
        writeCookiePreferences(parsed.analytics, { bannerHidden: parsed.bannerHidden });
        return parsed;
    } catch {
        return null;
    }
}

/** Writes preferences to both the policy cookie and localStorage for backwards compat. */
export function writeCookiePreferences(analytics, options = {}) {
    const nextPrefs = {
        analytics: Boolean(analytics),
        bannerHidden: Boolean(options.bannerHidden),
    };
    try {
        writeCookie(COOKIE_POLICY_COOKIE_NAME, encodeURIComponent(JSON.stringify(nextPrefs)), ONE_YEAR_SECONDS);
    } catch { /* ignore */ }
    try {
        window.localStorage.setItem(COOKIE_PREF_KEY, JSON.stringify(nextPrefs));
    } catch { /* ignore */ }
    return nextPrefs;
}

/** Sets or clears the short-lived session cookie used for SSR auth hints. */
export function setSessionCookie(isSignedIn) {
    if (isSignedIn) {
        writeCookie(SESSION_COOKIE_NAME, '1', TWENTY_HOURS_SECONDS);
    } else {
        deleteCookie(SESSION_COOKIE_NAME);
    }
}
