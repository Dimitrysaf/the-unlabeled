import { marked } from 'marked';

const renderer = {
    heading({ text, depth, tokens }) {
        const classes = {
            1: 'govuk-heading-xl',
            2: 'govuk-heading-l',
            3: 'govuk-heading-m',
            4: 'govuk-heading-s',
            5: 'govuk-heading-s',
            6: 'govuk-heading-s',
        };
        const rendered = this.parser.parseInline(tokens);
        return `<h${depth} class="${classes[depth] || 'govuk-heading-m'}">${rendered}</h${depth}>\n`;
    },

    paragraph({ tokens }) {
        const rendered = this.parser.parseInline(tokens);
        return `<p class="govuk-body">${rendered}</p>\n`;
    },

    list({ items, ordered }) {
        const tag = ordered ? 'ol' : 'ul';
        const cls = ordered
            ? 'govuk-list govuk-list--number'
            : 'govuk-list govuk-list--bullet';
        const body = items.map(item => {
            // Items can contain block tokens (nested lists) — use parse, not parseInline
            const rendered = this.parser.parse(item.tokens);
            return `<li>${rendered}</li>\n`;
        }).join('');
        return `<${tag} class="${cls}">\n${body}</${tag}>\n`;
    },

    blockquote({ tokens }) {
        const rendered = this.parser.parse(tokens);
        return `<div class="govuk-inset-text">${rendered}</div>\n`;
    },

    link({ href, title, tokens }) {
        const t = title ? ` title="${title}"` : '';
        const rendered = this.parser.parseInline(tokens);
        return `<a class="govuk-link" href="${href}"${t}>${rendered}</a>`;
    },

    image({ href, title, text }) {
        const t = title ? ` title="${title}"` : '';
        return `<img class="article-image" src="${href}" alt="${text || ''}"${t}>\n`;
    },

    hr() {
        return `<hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible">\n`;
    },

    code({ text, lang }) {
        const langAttr = lang ? ` class="language-${lang}"` : '';
        return `<pre class="md-code-block"><code${langAttr}>${escapeHtml(text)}</code></pre>\n`;
    },

    codespan({ text }) {
        return `<code class="md-code-inline">${escapeHtml(text)}</code>`;
    },

    strong({ tokens }) {
        const rendered = this.parser.parseInline(tokens);
        return `<strong>${rendered}</strong>`;
    },

    em({ tokens }) {
        const rendered = this.parser.parseInline(tokens);
        return `<em>${rendered}</em>`;
    },

    del({ tokens }) {
        const rendered = this.parser.parseInline(tokens);
        return `<del>${rendered}</del>`;
    },

    table({ header, rows }) {
        const headerHtml = header.map(cell => {
            const rendered = this.parser.parseInline(cell.tokens);
            return `<th class="govuk-table__header">${rendered}</th>`;
        }).join('');

        const rowsHtml = rows.map(row => {
            const cells = row.map(cell => {
                const rendered = this.parser.parseInline(cell.tokens);
                return `<td class="govuk-table__cell">${rendered}</td>`;
            }).join('');
            return `<tr class="govuk-table__row">${cells}</tr>\n`;
        }).join('');

        return `
<table class="govuk-table">
  <thead class="govuk-table__head">
    <tr class="govuk-table__row">${headerHtml}</tr>
  </thead>
  <tbody class="govuk-table__body">
    ${rowsHtml}
  </tbody>
</table>\n`;
    },
};

marked.use({
    gfm: true,
    breaks: true,
    renderer,
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