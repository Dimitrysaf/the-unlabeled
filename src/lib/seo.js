// src/lib/seo.js

const DEFAULTS = {
    title: 'The Unlabeled',
    description: 'A political blog and data initiative providing analysis, facts, and commentary rooted in evidence that mainstream media often overlooks.',
    keywords: 'politics, political analysis, data journalism, facts, unlabeled data, evidence-based politics',
    url: '',
    image: '/favicon.png',
    type: 'website',
    robots: 'index, follow',
};

/** Updates all relevant <meta> and <link> tags for the current page. */
export function setMetaTags(meta) {
    const config = { ...DEFAULTS, url: window.location.href, ...meta };

    document.title = config.title;
    updateMeta('name', 'description', config.description);
    updateMeta('name', 'keywords', config.keywords);
    updateMeta('name', 'robots', config.robots);
    updateLink('canonical', config.url);
    updateMeta('property', 'og:title', config.title);
    updateMeta('property', 'og:description', config.description);
    updateMeta('property', 'og:url', config.url);
    updateMeta('property', 'og:image', config.image);
    updateMeta('property', 'og:type', config.type);
    updateMeta('property', 'twitter:title', config.title);
    updateMeta('property', 'twitter:description', config.description);
    updateMeta('property', 'twitter:url', config.url);
    updateMeta('property', 'twitter:image', config.image);
}

function updateMeta(attr, value, content) {
    let el = document.querySelector(`meta[${attr}="${value}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, value);
        document.head.appendChild(el);
    }
    el.content = content;
}

function updateLink(rel, href) {
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        document.head.appendChild(el);
    }
    el.href = href;
}

/** Replaces the page's JSON-LD structured data block. */
export function addStructuredData(data) {
    document.querySelector('script[type="application/ld+json"]')?.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
}
