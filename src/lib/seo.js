/**
 * SEO utilities for dynamic meta tag updates
 */

export function setMetaTags(meta) {
    const defaults = {
        title: 'The Unlabeled',
        description: 'A political blog and data initiative providing analysis, facts, and commentary rooted in evidence that mainstream media often overlooks.',
        keywords: 'politics, political analysis, data journalism, facts, unlabeled data, evidence-based politics',
        url: window.location.href,
        image: '/favicon.png',
        type: 'website',
        robots: 'index, follow'
    };

    const config = { ...defaults, ...meta };

    // Title
    document.title = config.title;

    // Meta description
    updateMetaTag('name', 'description', config.description);

    // Keywords
    updateMetaTag('name', 'keywords', config.keywords);

    // Robots
    updateMetaTag('name', 'robots', config.robots);

    // Canonical
    updateLinkTag('canonical', config.url);

    // Open Graph
    updateMetaTag('property', 'og:title', config.title);
    updateMetaTag('property', 'og:description', config.description);
    updateMetaTag('property', 'og:url', config.url);
    updateMetaTag('property', 'og:image', config.image);
    updateMetaTag('property', 'og:type', config.type);

    // Twitter
    updateMetaTag('property', 'twitter:title', config.title);
    updateMetaTag('property', 'twitter:description', config.description);
    updateMetaTag('property', 'twitter:url', config.url);
    updateMetaTag('property', 'twitter:image', config.image);
}

function updateMetaTag(attr, value, content) {
    let meta = document.querySelector(`meta[${attr}="${value}"]`);
    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, value);
        document.head.appendChild(meta);
    }
    meta.content = content;
}

function updateLinkTag(rel, href) {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
    }
    link.href = href;
}

export function addStructuredData(data) {
    // Remove existing structured data
    const existing = document.querySelector('script[type="application/ld+json"]');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
}