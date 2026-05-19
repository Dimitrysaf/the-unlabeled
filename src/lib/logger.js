// src/lib/logger.js
// Admin-gated verbose console logger.
//
// Usage:
//   import { logger } from './logger.js';
//   logger.debug('fetching articles', { url, params });
//   logger.route('/about');
//   logger.auth('SIGNED_IN', user);
//
// To activate, call enableAdminDebug() once admin status is confirmed.
// window.__debug is then exposed for ad-hoc inspection in DevTools.

const NS = 'Unlabeled';
const S = {
    ns:   'background:#1d70b8;color:#fff;padding:1px 5px;border-radius:3px;font-weight:bold',
    dim:  'color:#505a5f',
    ok:   'color:#00703c;font-weight:bold',
    warn: 'color:#b58900;font-weight:bold',
    err:  'color:#d4351c;font-weight:bold',
};

let _enabled = false;

/** Activates verbose debug mode. Must be called after admin status is confirmed. */
export function enableAdminDebug() {
    _enabled = true;
    console.info(`%c ${NS} %c admin debug mode active`, S.ns, S.ok);
    window.__debug = logger;
}

/** Returns true when admin debug mode is active. */
export function isDebugEnabled() {
    return _enabled;
}

function _pfx(level) {
    return [`%c ${NS} %c`, S.ns, S[level] ?? S.dim];
}

export const logger = {
    /**
     * Verbose debug log with optional collapsed payload group.
     * No-op for non-admins.
     */
    debug(msg, ...payload) {
        if (!_enabled) return;
        if (payload.length) {
            console.groupCollapsed(..._pfx('dim'), msg);
            payload.forEach(p => console.debug(p));
            console.groupEnd();
        } else {
            console.debug(..._pfx('dim'), msg);
        }
    },

    /** Informational log. No-op for non-admins. */
    info(msg, ...data) {
        if (!_enabled) return;
        console.info(..._pfx('ok'), msg, ...data);
    },

    /** Warning log. No-op for non-admins. */
    warn(msg, ...data) {
        if (!_enabled) return;
        console.warn(..._pfx('warn'), msg, ...data);
    },

    /**
     * Error log. Always visible; full stack trace only for admins.
     * Use in place of console.error throughout the app.
     */
    error(msg, err) {
        if (_enabled) {
            console.error(..._pfx('err'), msg, err);
        } else {
            console.error(`[${NS}] ${msg}`, err?.message ?? err);
        }
    },

    /** Route-change breadcrumb. No-op for non-admins. */
    route(path) {
        if (!_enabled) return;
        console.debug(..._pfx('ok'), `→ ${path}`);
    },

    /**
     * Auth lifecycle event. No-op for non-admins.
     * @param {string} event  e.g. 'SIGNED_IN', 'SIGNED_OUT', 'admin:confirmed'
     * @param {*}      [data] optional payload (user object, session, etc.)
     */
    auth(event, data) {
        if (!_enabled) return;
        console.groupCollapsed(..._pfx('ok'), `auth: ${event}`);
        if (data !== undefined) console.debug(data);
        console.groupEnd();
    },

    /**
     * Page-render timing log. No-op for non-admins.
     * @param {string} path
     * @param {number} [ms]  optional duration in milliseconds
     */
    render(path, ms) {
        if (!_enabled) return;
        const suffix = ms !== undefined ? ` (${ms}ms)` : '';
        console.debug(..._pfx('dim'), `render: ${path}${suffix}`);
    },
};
