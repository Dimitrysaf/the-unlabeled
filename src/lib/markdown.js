import { marked } from 'marked';

marked.use({
    gfm: true,
    breaks: true,
    renderer: {
        heading({ text, depth }) {
            const classes = {
                1: 'govuk-heading-xl',
                2: 'govuk-heading-l',
                3: 'govuk-heading-m',
                4: 'govuk-heading-s',
                5: 'govuk-heading-s',
                6: 'govuk-heading-s',
            };
            return `<h${depth} class="${classes[depth] || 'govuk-heading-m'}">${text}</h${depth}>\n`;
        },

        paragraph({ text }) {
            return `<p class="govuk-body">${text}</p>\n`;
        },

        list({ body, ordered }) {
            const tag = ordered ? 'ol' : 'ul';
            const cls = ordered
                ? 'govuk-list govuk-list--number'
                : 'govuk-list govuk-list--bullet';
            return `<${tag} class="${cls}">\n${body}</${tag}>\n`;
        },

        listitem({ text }) {
            return `<li>${text}</li>\n`;
        },

        blockquote({ text }) {
            return `<div class="govuk-inset-text">${text}</div>\n`;
        },

        link({ href, title, text }) {
            const t = title ? ` title="${title}"` : '';
            return `<a class="govuk-link" href="${href}"${t}>${text}</a>`;
        },

        hr() {
            return `<hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible">\n`;
        },

        image({ href, title, text }) {
            const t = title ? ` title="${title}"` : '';
            return `<img class="article-image" src="${href}" alt="${text || ''}"${t}>\n`;
        },

        code({ text, lang }) {
            const langAttr = lang ? ` class="language-${lang}"` : '';
            return `<pre class="md-code-block"><code${langAttr}>${escapeHtml(text)}</code></pre>\n`;
        },

        codespan({ text }) {
            return `<code class="md-code-inline">${text}</code>`;
        },

        strong({ text }) {
            return `<strong>${text}</strong>`;
        },

        em({ text }) {
            return `<em>${text}</em>`;
        },

        table({ header, rows }) {
            return `
<table class="govuk-table">
  <thead class="govuk-table__head">
    <tr class="govuk-table__row">${header}</tr>
  </thead>
  <tbody class="govuk-table__body">
    ${rows.map(row => `<tr class="govuk-table__row">${row}</tr>`).join('\n')}
  </tbody>
</table>\n`;
        },

        tablerow({ text }) {
            return text;
        },

        tablecell({ text, header }) {
            const tag = header ? 'th' : 'td';
            const cls = header ? 'govuk-table__header' : 'govuk-table__cell';
            return `<${tag} class="${cls}">${text}</${tag}>`;
        },
    },
});

export function renderMarkdown(md) {
    if (!md) return '';
    return marked.parse(md);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
