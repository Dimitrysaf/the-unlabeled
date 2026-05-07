/**
 * Strip executable content from an HTML string using the browser's own parser.
 * Removes <script> and <style> elements and any on* / javascript: attributes.
 * Safe to call on admin-entered html_content before injecting into the DOM.
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
