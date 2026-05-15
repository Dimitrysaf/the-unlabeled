// src/lib/markdown.js
import { marked } from 'marked';
import { escapeHtml } from './escape.js';

// ── Slug helper ──────────────────────────────────────────────────────────────
// Matches GitHub/marked default slug behaviour so heading IDs are consistent
// with what the ToC links point to.

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// ── Table of contents builder ────────────────────────────────────────────────

function buildToc(headings, sidebar = false) {
    if (!headings.length) return '';

    const topMargin = sidebar ? 'govuk-!-margin-top-0' : 'govuk-!-margin-top-3';
    const lines = [`<ul class="govuk-list ${topMargin} govuk-!-margin-bottom-0">`];

    for (let i = 0; i < headings.length; i++) {
        const { depth, text, id } = headings[i];
        const nextDepth = headings[i + 1]?.depth;
        const link = `<a class="govuk-link" href="#${id}">${text}</a>`;

        if (depth === 2) {
            lines.push(`  <li>${link}${nextDepth === 3 ? '' : '</li>'}`);
        } else {
            if (!headings[i - 1] || headings[i - 1].depth === 1) {
                lines.push(`  <li>${link}</li>`);
                continue;
            }
            if (headings[i - 1].depth !== 3) {
                lines.push('    <ul class="govuk-list govuk-!-margin-top-0 govuk-!-margin-bottom-0">');
            }
            lines.push(`      <li class="article-toc__subitem"><span class="article-toc__dash" aria-hidden="true">— </span>${link}</li>`);
            if (nextDepth !== 3) {
                lines.push('    </ul>');
                lines.push('  </li>');
            }
        }
    }

    lines.push('</ul>');

    if (sidebar) {
        return `
<details class="govuk-details govuk-!-margin-bottom-0 article-toc article-toc-sidebar" open>
  <summary class="govuk-details__summary">
    <span class="govuk-details__summary-text">Contents</span>
  </summary>
  <div class="govuk-details__text">
    ${lines.join('\n    ')}
  </div>
</details>`;
    }

    return `
<details class="govuk-details govuk-!-margin-bottom-6 article-toc">
  <summary class="govuk-details__summary">
    <span class="govuk-details__summary-text">Table of contents</span>
  </summary>
  <div class="govuk-details__text">
    ${lines.join('\n    ')}
  </div>
</details>
`;
}

// ── GOV.UK renderer ──────────────────────────────────────────────────────────

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
        const id = slugify(text);
        return `<h${depth} id="${id}" class="${classes[depth] || 'govuk-heading-m'}">${rendered}</h${depth}>\n`;
    },

    paragraph({ tokens }) {
        return `<p class="govuk-body">${this.parser.parseInline(tokens)}</p>\n`;
    },

    list({ items, ordered }) {
        const tag = ordered ? 'ol' : 'ul';
        const cls = ordered ? 'govuk-list govuk-list--number' : 'govuk-list govuk-list--bullet';
        const body = items.map(item => {
            const rendered = this.parser.parse(item.tokens);
            // Strip wrapping <p> — invalid inside <li>.
            const inner = rendered.replace(/^<p[^>]*>(.*)<\/p>\n?$/s, '$1');
            return `<li>${inner}</li>\n`;
        }).join('');
        return `<${tag} class="${cls}">\n${body}</${tag}>\n`;
    },

    blockquote({ tokens }) {
        return `<div class="govuk-inset-text">${this.parser.parse(tokens)}</div>\n`;
    },

    link({ href, title, tokens }) {
        const t = title ? ` title="${title}"` : '';
        const rendered = this.parser.parseInline(tokens);
        const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
        const external = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a class="govuk-link" href="${href}"${t}${external}>${rendered}</a>`;
    },

    image({ href, title, text }) {
        const t = title ? ` title="${title}"` : '';
        return `<img class="article-image" src="${href}" alt="${text || ''}"${t}>\n`;
    },

    hr() {
        return `<hr class="govuk-section-break govuk-section-break--l govuk-section-break--visible">\n`;
    },

    code({ text, lang }) {
        const langAttr = lang ? ` class="language-${lang}"` : '';
        return `<div class="md-scroll-wrapper md-scroll-wrapper--code"><pre class="md-code-block"><code${langAttr}>${escapeHtml(text)}</code></pre></div>\n`;
    },

    codespan({ text }) {
        return `<code class="md-code-inline">${escapeHtml(text)}</code>`;
    },

    strong({ tokens }) {
        return `<strong>${this.parser.parseInline(tokens)}</strong>`;
    },

    em({ tokens }) {
        return `<em>${this.parser.parseInline(tokens)}</em>`;
    },

    del({ tokens }) {
        return `<del>${this.parser.parseInline(tokens)}</del>`;
    },

    table({ header, rows }) {
        const headerHtml = header.map(cell => {
            const rendered = this.parser.parseInline(cell.tokens);
            return `<th class="govuk-table__header" scope="col">${rendered}</th>`;
        }).join('');

        const rowsHtml = rows.map(row => {
            const cells = row.map(cell => {
                const rendered = this.parser.parseInline(cell.tokens);
                return `<td class="govuk-table__cell">${rendered}</td>`;
            }).join('');
            return `<tr class="govuk-table__row">${cells}</tr>\n`;
        }).join('');

        return `<div class="md-scroll-wrapper">
<table class="govuk-table">
  <thead class="govuk-table__head">
    <tr class="govuk-table__row">${headerHtml}</tr>
  </thead>
  <tbody class="govuk-table__body">
    ${rowsHtml}
  </tbody>
</table>
</div>\n`;
    },
};

marked.use({ gfm: true, breaks: true, renderer });

// ── Public API ───────────────────────────────────────────────────────────────

function collectHeadings(md) {
    const headings = [];
    for (const token of marked.lexer(md)) {
        if (token.type === 'heading' && token.depth >= 2 && token.depth <= 3) {
            headings.push({ depth: token.depth, text: token.text, id: slugify(token.text) });
        }
    }
    return headings;
}

/**
 * Converts Markdown to HTML with GOV.UK styling and an auto-generated ToC.
 * The ToC is injected immediately after the first <h1>, or prepended if none.
 */
export function renderMarkdown(md) {
    if (!md) return '';
    const headings = collectHeadings(md);
    const body = marked.parse(md);
    const toc = buildToc(headings);
    const withToc = body.replace(/(<h1[^>]*>.*?<\/h1>\n?)/s, `$1${toc}`);
    return withToc === body ? toc + body : withToc;
}

/**
 * Returns the article body HTML and a sidebar-style TOC separately,
 * so the TOC can be placed in the sticky sidebar rather than inline.
 * The body HTML contains no embedded TOC.
 */
export function renderMarkdownParts(md) {
    if (!md) return { body: '', toc: '' };
    const headings = collectHeadings(md);
    return {
        body: marked.parse(md),
        toc: buildToc(headings, true),
    };
}
