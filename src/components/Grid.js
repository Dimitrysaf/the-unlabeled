// Grid.js
// A reusable card grid renderer.
//
// Article object shape:
// {
//   title:    string               (required)
//   excerpt:  string               (optional)
//   image:    string               (optional – URL)
//   tags:     Array<{ label, color? }>  (optional – e.g. [{ label: 'New' }, { label: 'Featured', color: 'teal' }])
//   author:   { name, avatar? }    (optional)
//   date:     string               (optional)
//   link:     string               (optional – defaults to '#')
// }
//
// Config shape:
// {
//   columns:      number  (1 | 2 | 3 | 4 – defaults to 3)
//   emptyMessage: string  (shown when articles array is empty)
// }

const COLUMN_WORDS = { 1: 'one', 2: 'two', 3: 'three', 4: 'four' };

function buildTagsHtml(tags = []) {
    if (!tags.length) return '';

    const labelsHtml = tags
        .map(({ label, color }) => {
            const colorClass = color ? `${color} ` : '';
            return `<a class="ui ${colorClass}tag label" style="padding: 0.60em 1em; font-size: 0.85em;">${label}</a>`;
        })
        .join(' ');

    return `<div style="margin-bottom: 0.6em; display: flex; flex-wrap: wrap; gap: 0.35em; font-size: 0.85em;">${labelsHtml}</div>`;
}

function buildAuthorHtml({ name } = {}) {
    if (!name) return '';

    return `<span style="display: flex; align-items: center; gap: 0.3em; color: rgba(0,0,0,0.45); font-size: 0.85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1 1 auto;">
            <i class="user alternate icon"></i>
            <span style="display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;">${name}</span>
        </span>`;
}

function buildCard({ title, excerpt, image, tags = [], author, date, link = '#' }) {
    const imageHtml = image
        ? `<div class="image" style="max-height: 180px; overflow: hidden;">
               <img src="${image}" alt="${title}" style="width: 100%; height: 180px; object-fit: cover;">
           </div>`
        : '';

    const tagsHtml   = buildTagsHtml(tags);
    const authorHtml = author ? buildAuthorHtml(author) : '';

    const excerptHtml = excerpt
        ? `<div style="position: relative; margin-top: 0.5em; max-height: 5.5em; overflow: hidden;">
               <div class="description" style="color: rgba(0,0,0,0.6); font-size: 0.92em; line-height: 1.5; margin: 0;">
                   ${excerpt}
               </div>
               <div style="position: absolute; left: 0; right: 0; bottom: 0; height: 1.5em; background: linear-gradient(rgba(255,255,255,0), rgba(255,255,255,1)); pointer-events: none;"></div>
           </div>`
        : '';

    const extraHtml = (author || date)
        ? `<div class="extra content" style="display: flex; align-items: center; gap: 0.5em; min-width: 0; flex-wrap: nowrap;">
               ${authorHtml}
               ${date ? `<span style="margin-left: auto; color: rgba(0,0,0,0.45); font-size: 0.85em; white-space: nowrap; flex-shrink: 0;"><i class="calendar alternate outline icon"></i>${date}</span>` : ''}
           </div>`
        : '';

    const titleHtml = link
        ? `<a href="${link}" style="color: inherit; text-decoration: none;">${title}</a>`
        : title;

    return `
        <div class="ui card" style="text-decoration: none; color: inherit;">
            ${imageHtml}
            <div class="content">
                ${tagsHtml}
                <div class="header" style="font-size: 1em; line-height: 1.4; margin-bottom: 0.4em;">
                    ${titleHtml}
                </div>
                ${excerptHtml}
            </div>
            ${extraHtml}
        </div>`;
}

export function renderGrid(articles = [], config = {}) {
    const { columns = 3, emptyMessage = 'No articles found.', loading = false } = config;
    const colWord = COLUMN_WORDS[columns] || 'three';

    if (loading) {
        const placeholderCards = Array(columns).fill().map(() => `
            <div class="ui card">
                <div class="image" style="min-height: 140px;">
                    <div class="ui placeholder" style="height: 140px; margin: 0;"></div>
                </div>
                <div class="content">
                    <div class="ui placeholder">
                        <div class="header">
                            <div class="line"></div>
                            <div class="line"></div>
                        </div>
                        <div class="paragraph">
                            <div class="short line"></div>
                        </div>
                    </div>
                </div>
                <div class="extra content">
                    <div class="ui placeholder">
                        <div class="line"></div>
                    </div>
                </div>
            </div>`).join('');

        return `<div class="ui ${colWord} stackable cards">${placeholderCards}</div>`;
    }

    if (!articles.length) {
        return `
            <div style="padding: 3em 0;">
                <h2 class="ui center aligned icon header">
                    <i class="circular file icon"></i>
                    No pages yet.
                </h2>
            </div>`;
    }

    const cardsHtml = articles.map(buildCard).join('');

    return `<div class="ui ${colWord} stackable cards">${cardsHtml}</div>`;
}