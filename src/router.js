let _renderPage = null;
let _onNavigate = null;

export function initRouter(renderPageFn, onNavigateFn) {
    _renderPage = renderPageFn;
    _onNavigate = onNavigateFn;

    window.addEventListener('popstate', e => {
        if (window.location.pathname + window.location.search ===
            (e.state?._path ?? window.location.pathname + window.location.search)) {
            const id = window.location.hash.slice(1);
            if (id) {
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return;
        }

        if (_onNavigate) _onNavigate();
        _renderPage(window.location.pathname + window.location.search);
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

export function navigate(path) {
    const currentBase = window.location.pathname + window.location.search;
    const newBase = path.split('#')[0];

    if (newBase === currentBase && path.includes('#')) {
        history.pushState({}, '', path);
        const id = path.split('#')[1];
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    if (window.location.pathname + window.location.search !== path) {
        history.pushState({}, '', path);
    }
    window.scrollTo(0, 0);
    if (_onNavigate) _onNavigate();
    _renderPage(path);
}
