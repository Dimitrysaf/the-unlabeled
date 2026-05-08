// src/lib/sanitize.js

/**
 * Strips executable content from an HTML string using the browser's own DOM parser.
 * Removes <script> and <style> tags and any on* / javascript: attributes.
 * Safe to call on admin-provided html_content before DOM injection.
 */
export function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('script, style').forEach(el => el.remove());

    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
        [...node.attributes].forEach(attr => {
            if (/^on/i.test(attr.name) || /^javascript:/i.test(attr.value.trim())) {
                node.removeAttribute(attr.name);
            }
        });
        node = walker.nextNode();
    }

    return doc.body.innerHTML;
}
