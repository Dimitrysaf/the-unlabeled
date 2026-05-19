// src/router.js
import { logger } from './lib/logger.js';

let _renderPage = null;
let _onNavigate = null;
let _hasNavigated = false;
let _navStack = []; // paths we navigated FROM, in order

export function initRouter(renderPageFn, onNavigateFn) {
    _renderPage = renderPageFn;
    _onNavigate = onNavigateFn;

    window.addEventListener('popstate', e => {
        const currentBase = window.location.pathname + window.location.search;

        // Hash-scroll entries are the only ones where _path contains '#'.
        // Their base path (before '#') matches the current location and the
        // fragment tells us where to scroll. Everything else — including forward
        // navigation and back to the initial page (null state) — must re-render.
        if (e.state?._path?.includes('#')) {
            const [stateBase, stateHash] = e.state._path.split('#');
            if (stateBase === currentBase && stateHash) {
                document.getElementById(stateHash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
        }

        if (_onNavigate) _onNavigate();
        _renderPage(currentBase);
    });

    // Mobile browsers restore pages from bfcache on back/forward; popstate may
    // not fire in that case. pageshow with persisted=true always fires instead.
    window.addEventListener('pageshow', e => {
        if (e.persisted) {
            if (_onNavigate) _onNavigate();
            _renderPage(window.location.pathname + window.location.search);
        }
    });

    document.addEventListener('click', e => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('//') || link.target === '_blank' || link.hasAttribute('download')) return;
        e.preventDefault();
        if (href.startsWith('#')) {
            const id = href.slice(1);
            if (id) {
                const path = window.location.pathname + window.location.search + href;
                history.pushState({ _path: path }, '', path);
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return;
        }
        navigate(href);
    });
}

/** Returns true if the router has performed at least one in-app navigation. */
export function hasNavigated() {
    return _hasNavigated;
}

/**
 * Returns how many browser-history steps to go back to reach the nearest path
 * that is neither the current page nor matches any blacklisted substring.
 * Each navigate() call is one pushState, so the stack index maps 1-to-1 with
 * browser history depth.  Returns 0 when no suitable entry is found — the
 * caller should fall back to navigate('/').
 * @param {string[]} blacklist
 */
export function getBackSteps(blacklist = []) {
    const current = window.location.pathname + window.location.search;
    for (let i = _navStack.length - 1; i >= 0; i--) {
        const p = _navStack[i];
        if (p !== current && !blacklist.some(pat => p.includes(pat))) {
            return _navStack.length - i; // steps = distance from end of stack to target
        }
    }
    return 0;
}

export function navigate(path) {
    logger.route(path);
    const currentBase = window.location.pathname + window.location.search;
    const newBase = path.split('#')[0];

    if (newBase === currentBase && path.includes('#')) {
        history.pushState({ _path: path }, '', path);
        const id = path.split('#')[1];
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    if (window.location.pathname + window.location.search !== path) {
        _navStack.push(window.location.pathname + window.location.search);
        history.pushState({ _path: path }, '', path);
    }
    _hasNavigated = true;
    if (_onNavigate) _onNavigate();
    _renderPage(path);
}
