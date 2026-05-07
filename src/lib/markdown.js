import { marked } from 'marked';
import { escapeHtml } from './escape.js';

// ─────────────────────────────────────────────
// SLUG HELPER
// matches GitHub/marked default slug behaviour
// ─────────────────────────────────────────────

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/<[^>]+>/g, '')       // strip inline HTML (<code>, <strong>, etc.)
        .replace(/[^\w\s-]/g, '')      // remove punctuation: —, (, ), :, ?, !, etc.
        .trim()
        .replace(/\s+/g, '-')          // spaces → hyphens
        .replace(/-+/g, '-');          // collapse consecutive hyphens
}

// ─────────────────────────────────────────────
// TOC BUILDER
// ─────────────────────────────────────────────

function buildToc(headings) {
    if (!headings.length) return '';

    const lines = ['<ul class="govuk-list govuk-!-margin-top-3 govuk-!-margin-bottom-0">'];

    for (let i = 0; i < headings.length; i += 1) {
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

// ─────────────────────────────────────────────
// RENDERER
// ─────────────────────────────────────────────

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
        // text = raw string (no HTML) — safe to slugify
        // rendered = HTML string — what the user sees
        const id = slugify(text);
        return `<h${depth} id="${id}" class="${classes[depth] || 'govuk-heading-m'}">${rendered}</h${depth}>\n`;
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
            const rendered = this.parser.parse(item.tokens);
            // strip wrapping <p> that paragraph() adds — invalid inside <li>
            const inner = rendered.replace(/^<p[^>]*>(.*)<\/p>\n?$/s, '$1');
            return `<li>${inner}</li>\n`;
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
        const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
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
            return `<th class="govuk-table__header" scope="col">${rendered}</th>`;
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

marked.use({ gfm: true, breaks: true, renderer });

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

export function renderMarkdown(md) {
    if (!md) return '';

    // ── 1. Collect h2/h3 headings for ToC via the lexer ──
    // Runs on raw markdown — no extra DB call, no HTML parsing.
    const headings = [];
    for (const token of marked.lexer(md)) {
        if (token.type === 'heading' && token.depth >= 2 && token.depth <= 3) {
            headings.push({
                depth: token.depth,
                text: token.text,        // raw, no HTML — used as link label
                id: slugify(token.text), // must match what heading renderer produces
            });
        }
    }

    // ── 2. Render body ──
    const body = marked.parse(md);

    // ── 3. Inject ToC immediately after the opening <h1> ──
    // Falls back to prepending if the article has no h1.
    const toc = buildToc(headings);
    const withToc = body.replace(/(<h1[^>]*>.*?<\/h1>\n?)/s, `$1${toc}`);
    return withToc === body ? toc + body : withToc;
}

