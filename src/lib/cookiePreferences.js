export const COOKIE_PREF_KEY = 'cookie-preferences-v1';
export const COOKIE_POLICY_COOKIE_NAME = 'cookie_policy';
export const SESSION_COOKIE_NAME = 'session_cookie';

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
const TWENTY_HOURS_SECONDS = 20 * 60 * 60;

function readCookieValue(name) {
    const cookieString = document.cookie || '';
    const pairs = cookieString.split(';');
    for (const pair of pairs) {
        const trimmed = pair.trim();
        if (!trimmed) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx);
        const value = trimmed.slice(eqIdx + 1);
        if (key === name) return value;
    }
    return null;
}

function writeCookie(name, value, maxAgeSeconds) {
    const secureAttr = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secureAttr}`;
}

function deleteCookie(name) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function parsePreferences(raw) {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.analytics !== 'boolean') return null;
        return {
            analytics: parsed.analytics,
            bannerHidden: Boolean(parsed.bannerHidden)
        };
    } catch {
        return null;
    }
}

export function hasSessionCookie() {
    return Boolean(readCookieValue(SESSION_COOKIE_NAME));
}

export function hasCookiePolicyCookie() {
    return Boolean(readCookieValue(COOKIE_POLICY_COOKIE_NAME));
}

export function readCookiePreferences() {
    const rawPolicyCookie = readCookieValue(COOKIE_POLICY_COOKIE_NAME);
    if (rawPolicyCookie) {
        const parsed = parsePreferences(decodeURIComponent(rawPolicyCookie));
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

export function writeCookiePreferences(analytics, options = {}) {
    const nextPrefs = {
        analytics: Boolean(analytics),
        bannerHidden: Boolean(options.bannerHidden)
    };

    try {
        const encoded = encodeURIComponent(JSON.stringify(nextPrefs));
        writeCookie(COOKIE_POLICY_COOKIE_NAME, encoded, ONE_YEAR_SECONDS);
    } catch {
        // Ignore cookie write errors.
    }

    try {
        // Kept for backward compatibility with existing app state reads.
        window.localStorage.setItem(COOKIE_PREF_KEY, JSON.stringify(nextPrefs));
    } catch {
        // Ignore storage errors.
    }

    return nextPrefs;
}

export function setSessionCookie(isSignedIn) {
    if (isSignedIn) {
        writeCookie(SESSION_COOKIE_NAME, '1', TWENTY_HOURS_SECONDS);
    } else {
        deleteCookie(SESSION_COOKIE_NAME);
    }
}
