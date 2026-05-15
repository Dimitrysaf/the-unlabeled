// src/router.js
let _renderPage = null;
let _onNavigate = null;
let _hasNavigated = false;

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
        if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('//') || link.target === '_blank' || link.hasAttribute('download')) return;
        e.preventDefault();
        navigate(href);
    });
}

/** Returns true if the router has performed at least one in-app navigation. */
export function hasNavigated() {
    return _hasNavigated;
}

export function navigate(path) {
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
        history.pushState({ _path: path }, '', path);
    }
    _hasNavigated = true;
    if (_onNavigate) _onNavigate();
    _renderPage(path);
}
