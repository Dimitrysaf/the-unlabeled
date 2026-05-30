// src/pages/admin.js
import EasyMDE from 'easymde';
import 'easymde/dist/easymde.min.css';
import './admin.css';
import './admin.mobile.css';
import { updateContent } from '../components/Layout.js';
import { renderError } from '../components/ErrorPage.js';
import { renderMarkdown } from '../lib/markdown.js';
import { escapeHtml, escapeAttr } from '../lib/escape.js';
import {
    checkIsAdmin,
    getArticleById,
    createArticle,
    updateArticle,
    clearAdminDataCache,
    createPendingNotification,
} from '../data/admin.js';
import { getArticleRevisions } from '../data/articles.js';
import { clearSubmissionsCache } from '../data/submissions.js';
import { supabase } from '../lib/supabase.js';

import { go, showBanner } from './admin/utils.js';
import { loadArticlesSection } from './admin/articles.js';
import { loadCommentsSection } from './admin/comments.js';
import { loadUsersSection, showUserDetail, showBanUserForm, showDeleteUserConfirm } from './admin/users.js';
import { loadSubmissionsSection } from './admin/submissions.js';

// ── Entry point ───────────────────────────────────────────────────────────

export async function renderAdmin() {
    let isAdmin = false;
    try { isAdmin = await checkIsAdmin(); } catch { /* not logged in */ }
    if (!isAdmin) { renderError('404'); return; }

    const params = new URLSearchParams(window.location.search);

    if (params.has('new')) {
        renderAdminEditor(null);
    } else if (params.has('edit')) {
        const id = params.get('edit');
        try {
            const article = await getArticleById(id);
            renderAdminEditor(article);
        } catch {
            showBanner('error', 'Could not load article.');
            await showList();
        }
    } else if (params.has('view-user')) {
        await showUserDetail(params.get('view-user'));
    } else if (params.has('ban-user')) {
        await showBanUserForm(params.get('ban-user'));
    } else if (params.has('delete-user')) {
        await showDeleteUserConfirm(params.get('delete-user'));
    } else {
        await showList();
    }
}

// ── List view ─────────────────────────────────────────────────────────────

function sectionSkeleton(rows = 4) {
    const row = `
        <div class="admin-skeleton-row">
            <span class="skeleton-line" style="flex:3;margin:0;min-width:0;"></span>
            <span class="skeleton-line skeleton-line--short" style="flex:1.5;margin:0;min-width:0;"></span>
            <span class="skeleton-line skeleton-line--shorter" style="flex:1;margin:0;min-width:0;"></span>
            <span class="skeleton-line skeleton-line--shorter" style="flex:0.8;margin:0;min-width:0;"></span>
        </div>`;
    return `
        <div class="admin-skeleton">
            <div class="skeleton-line admin-skeleton-count"></div>
            <div class="admin-skeleton-rows">${row.repeat(rows)}</div>
        </div>`;
}

async function showList() {
    updateContent(`
        <span class="govuk-caption-xl">Content management</span>
        <h1 class="govuk-heading-xl">Admin</h1>
        <div class="admin-shortcuts">
            <a class="govuk-link" href="https://vercel.com/dimitrysafs-projects/the-unlabeled"
               target="_blank" rel="noopener noreferrer">Vercel ↗</a>
            <a class="govuk-link" href="https://supabase.com/dashboard/project/zapruosojosnbdttkvab/auth/users"
               target="_blank" rel="noopener noreferrer">Supabase users ↗</a>
            <a class="govuk-link" href="https://adsense.google.com/"
               target="_blank" rel="noopener noreferrer">AdSense ↗</a>
            <a class="govuk-link" href="https://search.google.com/search-console/"
               target="_blank" rel="noopener noreferrer">Search Console ↗</a>
            <a class="govuk-link" href="https://ko-fi.com/theunlabeled"
               target="_blank" rel="noopener noreferrer">Ko-fi ↗</a>
            <button class="govuk-link" id="test-notif-btn" style="background:none;border:none;cursor:pointer;padding:0;font:inherit;">
                Send test notification
            </button>
            <button class="govuk-link" id="admin-refresh-btn" style="background:none;border:none;cursor:pointer;padding:0;font:inherit;">
                Refresh ↻
            </button>
        </div>
        <div id="admin-banner"></div>
        <h2 class="govuk-heading-m">Articles</h2>
        <div id="admin-list-body">
            ${sectionSkeleton(4)}
        </div>
        <h2 class="govuk-heading-m govuk-!-margin-top-8">Comments</h2>
        <div id="admin-comments-body">
            ${sectionSkeleton(3)}
        </div>
        <h2 class="govuk-heading-m govuk-!-margin-top-8">Users</h2>
        <div id="admin-users-body">
            ${sectionSkeleton(4)}
        </div>
        <h2 class="govuk-heading-m govuk-!-margin-top-8">Submissions</h2>
        <div id="admin-submissions-body">
            ${sectionSkeleton(2)}
        </div>
    `);

    document.getElementById('admin-refresh-btn')?.addEventListener('click', () => {
        clearAdminDataCache();
        clearSubmissionsCache();
        document.getElementById('admin-list-body').innerHTML = sectionSkeleton(4);
        document.getElementById('admin-comments-body').innerHTML = sectionSkeleton(3);
        document.getElementById('admin-users-body').innerHTML = sectionSkeleton(4);
        document.getElementById('admin-submissions-body').innerHTML = sectionSkeleton(2);
        loadArticlesSection();
        loadCommentsSection();
        loadUsersSection();
        loadSubmissionsSection();
    });

    document.getElementById('test-notif-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('test-notif-btn');
        btn.disabled = true;
        btn.textContent = 'Sending…';
        try {
            let endpoint = null;
            try {
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.getSubscription();
                if (sub) endpoint = sub.toJSON().endpoint;
            } catch { /* service worker unavailable */ }

            if (!endpoint) {
                throw new Error('This device is not subscribed to notifications. Enable notifications first.');
            }

            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/test-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ endpoint }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
            showBanner('success', 'Test notification sent to this device.');
        } catch (err) {
            showBanner('error', `Failed to send test notification: ${err.message}`);
        }
        btn.textContent = 'Send test notification';
        btn.disabled = false;
    });

    loadArticlesSection();
    loadCommentsSection();
    loadUsersSection();
    loadSubmissionsSection();
}

// ── Editor view ───────────────────────────────────────────────────────────

function renderAdminEditor(article) {
    const isNew = !article;
    const pageTitle = isNew ? 'New article' : 'Edit article';
    const type = isNew ? 'md' : contentTypeOf(article);

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-full">

                <a href="#" class="govuk-back-link" id="admin-back">Back to articles</a>
                <span class="govuk-caption-xl">Content management</span>
                <h1 class="govuk-heading-xl">${pageTitle}</h1>
                <div id="admin-banner"></div>

                <form id="admin-form" novalidate>

                    ${editorErrorSummary()}

                    <div class="admin-focus-exit-bar">
                        <button class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" type="button" id="admin-focus-exit-btn">Exit focus mode</button>
                    </div>

                    <div class="govuk-button-group govuk-!-margin-bottom-2 admin-button-group-top">
                        <button class="govuk-button" type="button" id="admin-save-top-btn">
                            ${isNew ? 'Create article' : 'Save changes'}
                        </button>
                        ${!isNew ? `
                        <button class="govuk-button govuk-button--secondary" type="button" id="admin-publish-toggle-btn">
                            ${article?.is_draft ? 'Publish now' : 'Return to draft'}
                        </button>
                        <button class="govuk-button govuk-button--secondary" type="button" id="admin-revisions-btn">
                            Revision history
                        </button>
                        <button class="govuk-button govuk-button--secondary" type="button" id="admin-copy-url-btn">Copy URL</button>
                        <button class="govuk-button govuk-button--secondary" type="button" id="admin-duplicate-btn">Duplicate</button>
                        ` : ''}
                        <button class="govuk-button govuk-button--secondary" type="button" id="admin-focus-btn">Focus mode</button>
                        <a class="govuk-link" href="#" id="admin-cancel-top">Cancel</a>
                        <span class="govuk-hint" style="margin:0;font-size:0.8125rem;">Ctrl+S to save</span>
                    </div>
                    <div id="admin-autosave-restore-banner"></div>
                    <div id="admin-revisions-panel-container"></div>

                    <div class="govuk-tabs" id="admin-tabs">
                        <h2 class="govuk-tabs__title">Editor sections</h2>
                        <ul class="govuk-tabs__list" role="tablist">
                            <li class="govuk-tabs__list-item govuk-tabs__list-item--selected" role="presentation">
                                <a class="govuk-tabs__tab" href="#tab-content" role="tab"
                                   id="tab-content-link" aria-controls="tab-content"
                                   aria-selected="true" tabindex="0">Content</a>
                            </li>
                            <li class="govuk-tabs__list-item" role="presentation">
                                <a class="govuk-tabs__tab" href="#tab-details" role="tab"
                                   id="tab-details-link" aria-controls="tab-details"
                                   aria-selected="false" tabindex="-1">Article details</a>
                            </li>
                        </ul>

                        <div class="govuk-tabs__panel" id="tab-content"
                             role="tabpanel" aria-labelledby="tab-content-link">

                            <div class="govuk-form-group govuk-!-margin-bottom-5">
                                <fieldset class="govuk-fieldset">
                                    <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">
                                        Content type
                                    </legend>
                                    <div class="govuk-radios govuk-radios--inline govuk-radios--small"
                                         id="content-type-radios">
                                        ${typeRadio('md', 'Markdown', type)}
                                        ${typeRadio('html', 'HTML', type)}
                                        ${typeRadio('code', 'Code module', type)}
                                    </div>
                                </fieldset>
                            </div>

                            <div id="panel-md" ${type !== 'md' ? 'hidden' : ''}>
                                <textarea id="md_content" name="md_content">${escapeHtml(article?.md_content || '')}</textarea>
                                <div class="editor-stats-bar" id="editor-stats-bar">
                                    <span class="editor-stats-bar__item" id="stats-words">0 words</span>
                                    <span class="editor-stats-bar__item" id="stats-reading">0 min read</span>
                                    <span class="editor-stats-bar__item" id="stats-chars">0 chars</span>
                                    <span class="editor-stats-bar__item" id="stats-readability"></span>
                                    <span class="editor-stats-bar__item" id="stats-wc-progress" hidden></span>
                                    <button class="editor-stats-bar__btn" type="button" id="stats-target-btn">Target</button>
                                    <button class="editor-stats-bar__btn" type="button" id="stats-outline-btn">Outline</button>
                                    <span class="editor-stats-bar__item editor-stats-bar__autosave editor-stats-bar__autosave--pending" id="stats-autosave">Not saved locally</span>
                                </div>
                                <div id="editor-target-row" class="editor-target-row" hidden>
                                    <label class="govuk-label" for="stats-wc-input" style="display:inline;margin:0;">Target:</label>
                                    <input class="govuk-input govuk-input--width-5" type="number" id="stats-wc-input" min="0" step="100" placeholder="e.g. 1500">
                                    <span>words</span>
                                    <button class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" type="button" id="stats-target-set-btn" style="padding:4px 10px;height:auto;">Set</button>
                                    <button class="govuk-link" type="button" id="stats-target-clear-btn" style="background:none;border:none;cursor:pointer;padding:0;font:inherit;">Clear</button>
                                </div>
                                <div id="admin-outline-container" class="admin-outline-panel" hidden>
                                    <div id="admin-outline-list"></div>
                                </div>
                            </div>

                            <div id="panel-html" ${type !== 'html' ? 'hidden' : ''}>
                                <label class="govuk-label govuk-label--s" for="html_content">HTML content</label>
                                <div class="govuk-hint">Raw HTML rendered inside the article body.</div>
                                <textarea class="govuk-textarea admin-md-textarea admin-code-textarea"
                                    id="html_content" name="html_content"
                                    rows="24" spellcheck="false">${escapeHtml(article?.html_content || '')}</textarea>
                            </div>

                            <div id="panel-code" ${type !== 'code' ? 'hidden' : ''}>
                                <div class="govuk-inset-text">
                                    <p class="govuk-body govuk-!-margin-bottom-0">
                                        The key must match an entry in <code>MODULE_REGISTRY</code>
                                        inside <code>src/pages/a/[url].js</code>.
                                    </p>
                                </div>
                                ${field('code_module', 'Code module key', 'text',
        article?.code_module || '', 'govuk-input', 'e.g. electoral-calc')}
                            </div>

                        </div>

                        <div class="govuk-tabs__panel govuk-tabs__panel--hidden" id="tab-details"
                             role="tabpanel" aria-labelledby="tab-details-link">
                            <div class="govuk-grid-row">
                                <div class="govuk-grid-column-two-thirds">

                                    ${field('title', 'Title', 'text', article?.title || '', 'govuk-input')}
                                    ${field('slug', 'Slug', 'text', article?.slug || '', 'govuk-input',
            'Auto-generated from title. Edit if needed.')}
                                    ${field('subtitle', 'Subtitle', 'text', article?.subtitle || '', 'govuk-input',
                'Optional. Shown below the title.')}
                                    ${textareaField('excerpt', 'Excerpt', article?.excerpt || '',
                    'Optional short description shown on the article list.', 3)}
                                    <div class="admin-char-counter" id="excerpt-counter">${(article?.excerpt || '').length} / 250</div>

                                    <details class="govuk-details govuk-!-margin-top-3 govuk-!-margin-bottom-2">
                                        <summary class="govuk-details__summary">
                                            <span class="govuk-details__summary-text">SEO preview</span>
                                        </summary>
                                        <div class="govuk-details__text" style="padding-bottom:0">
                                            <div class="seo-preview">
                                                <div class="seo-preview__url">the-unlabeled.com › a › <span id="seo-slug-preview">${escapeHtml(article?.slug || '…')}</span></div>
                                                <div class="seo-preview__title" id="seo-title-preview">${escapeHtml(article?.title || 'Article title')}</div>
                                                <div class="seo-preview__desc" id="seo-desc-preview">${escapeHtml((article?.excerpt || '').slice(0, 155) || 'No excerpt provided.')}</div>
                                            </div>
                                            <div id="seo-hints" class="seo-preview__hints"></div>
                                        </div>
                                    </details>

                                    <details class="govuk-details">
                                        <summary class="govuk-details__summary">
                                            <span class="govuk-details__summary-text">Optional fields</span>
                                        </summary>
                                        <div class="govuk-details__text admin-optional-fields">
                                            ${field('image', 'Image URL', 'text', article?.image || '', 'govuk-input',
                        'A URL (https://…) or a path in public/ (e.g. /hero.jpg).')}
                                            <div class="admin-image-preview ${article?.image ? 'admin-image-preview--visible' : ''}" id="image-preview-container">
                                                <img id="image-preview-img" src="${escapeAttr(article?.image || '')}" alt="Image preview">
                                            </div>
                                            ${field('tags', 'Tags', 'text', tagsToString(article?.tags), 'govuk-input',
                            'Comma-separated, e.g. Politics, Economy')}
                                            ${field('author', 'Author name', 'text', article?.author?.name || '', 'govuk-input')}
                                            ${field('date', 'Display date', 'text', article?.date || '', 'govuk-input',
                                'Shown on the article, e.g. 29 April 2026')}
                                            ${field('published_at', 'Publish date', 'date',
                                    (article?.published_at || '').slice(0, 10), 'govuk-input',
                                    'Controls ordering. Defaults to today on save.')}
                                        </div>
                                    </details>

                                    <div class="govuk-form-group">
                                        <div class="govuk-checkboxes govuk-checkboxes--small">
                                            <div class="govuk-checkboxes__item">
                                                <input class="govuk-checkboxes__input" id="is_draft" name="is_draft"
                                                    type="checkbox" ${(isNew || article?.is_draft) ? 'checked' : ''}>
                                                <label class="govuk-label govuk-checkboxes__label" for="is_draft">
                                                    Save as draft
                                                </label>
                                            </div>
                                            <div class="govuk-checkboxes__item">
                                                <input class="govuk-checkboxes__input" id="notify_subscribers" name="notify_subscribers"
                                                    type="checkbox">
                                                <label class="govuk-label govuk-checkboxes__label" for="notify_subscribers">
                                                    Notify subscribers on publish
                                                </label>
                                                <div class="govuk-hint govuk-checkboxes__hint">Only sends if not saved as draft</div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                    </div><!-- /.govuk-tabs -->

                    <div class="govuk-button-group govuk-!-margin-top-4">
                        <button class="govuk-button" type="submit" id="admin-save-btn">
                            ${isNew ? 'Create article' : 'Save changes'}
                        </button>
                        <a class="govuk-link" href="#" id="admin-cancel">Cancel</a>
                    </div>

                </form>
            </div>
        </div>
    `);

    initEditor(article);
}

function editorErrorSummary() {
    return `
        <div class="govuk-error-summary" data-module="govuk-error-summary"
             id="editor-error-summary" hidden>
            <div role="alert">
                <h2 class="govuk-error-summary__title">There is a problem</h2>
                <div class="govuk-error-summary__body">
                    <ul class="govuk-list govuk-error-summary__list" id="editor-error-list"></ul>
                </div>
            </div>
        </div>`;
}

function field(id, label, type, value, inputClass, hint) {
    return `
        <div class="govuk-form-group" id="${id}-group">
            <label class="govuk-label govuk-label--s" for="${id}">${label}</label>
            ${hint ? `<div class="govuk-hint">${hint}</div>` : ''}
            <input class="${inputClass}" id="${id}" name="${id}" type="${type}"
                value="${escapeAttr(value)}">
        </div>`;
}

function textareaField(id, label, value, hint, rows) {
    return `
        <div class="govuk-form-group" id="${id}-group">
            <label class="govuk-label govuk-label--s" for="${id}">${label}</label>
            ${hint ? `<div class="govuk-hint">${hint}</div>` : ''}
            <textarea class="govuk-textarea" id="${id}" name="${id}" rows="${rows}">${escapeHtml(value)}</textarea>
        </div>`;
}

function typeRadio(value, label, selected) {
    return `
        <div class="govuk-radios__item">
            <input class="govuk-radios__input" id="type-${value}" name="content_type" type="radio"
                value="${value}" ${selected === value ? 'checked' : ''}>
            <label class="govuk-label govuk-radios__label" for="type-${value}">${label}</label>
        </div>`;
}

// ── Editor init ───────────────────────────────────────────────────────────

function initEditor(article) {
    const isNew = !article;
    const AUTOSAVE_KEY = `admin-autosave-${article?.id || 'new'}`;
    const EXCERPT_MAX = 250;

    // ── Tab switching ──────────────────────────────────────────────────────
    const DETAILS_FIELDS = new Set(['title', 'slug', 'subtitle', 'excerpt',
        'image', 'tags', 'author', 'date', 'published_at']);

    function switchTab(tabId) {
        document.querySelectorAll('#admin-tabs .govuk-tabs__tab').forEach(tab => {
            const active = tab.getAttribute('href') === `#${tabId}`;
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
            tab.setAttribute('tabindex', active ? '0' : '-1');
            tab.closest('.govuk-tabs__list-item')
                .classList.toggle('govuk-tabs__list-item--selected', active);
        });
        document.querySelectorAll('#admin-tabs .govuk-tabs__panel').forEach(panel => {
            panel.classList.toggle('govuk-tabs__panel--hidden', panel.id !== tabId);
        });
        if (tabId === 'tab-content') easyMde.codemirror.refresh();
    }

    document.querySelectorAll('#admin-tabs .govuk-tabs__tab').forEach(tab => {
        tab.addEventListener('click', e => {
            e.preventDefault();
            switchTab(tab.getAttribute('href').slice(1));
        });
    });

    // ── Slug auto-generation ───────────────────────────────────────────────
    const titleInput = document.getElementById('title');
    const slugInput = document.getElementById('slug');
    let slugEdited = !!article?.slug;

    titleInput.addEventListener('input', () => {
        if (!slugEdited) slugInput.value = slugify(titleInput.value);
        markDirty();
    });
    slugInput.addEventListener('input', () => { slugEdited = true; markDirty(); });

    // ── Rich markdown editor ───────────────────────────────────────────────
    const mdTextarea = document.getElementById('md_content');
    const easyMde = new EasyMDE({
        element: mdTextarea,
        previewRender: plainText => renderMarkdown(plainText),
        spellChecker: false,
        autosave: { enabled: false },
        status: false,
        minHeight: '520px',
        toolbar: [
            'bold', 'italic', 'strikethrough', 'heading', '|',
            'quote', 'unordered-list', 'ordered-list', '|',
            'link', 'image', 'table', 'horizontal-rule', '|',
            'preview', 'side-by-side', 'fullscreen', '|',
            'guide',
        ],
    });

    const panels = { md: 'panel-md', html: 'panel-html', code: 'panel-code' };
    document.getElementById('content-type-radios').addEventListener('change', e => {
        if (e.target.name !== 'content_type') return;
        Object.entries(panels).forEach(([key, id]) => {
            document.getElementById(id).hidden = (key !== e.target.value);
        });
        if (e.target.value === 'md') easyMde.codemirror.refresh();
        markDirty();
    });

    // ── Dirty tracking & beforeunload warning ──────────────────────────────
    let isDirty = false;

    function markDirty() { isDirty = true; }
    function markClean() { isDirty = false; }

    easyMde.codemirror.on('change', () => { markDirty(); updateStats(); });

    document.getElementById('admin-form').addEventListener('input', markDirty);

    const beforeUnloadHandler = e => {
        if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);

    // ── Readability helpers (Flesch-Kincaid Reading Ease) ─────────────────
    function countSyllables(word) {
        word = word.toLowerCase().replace(/[^a-z]/g, '');
        if (!word) return 0;
        if (word.length <= 3) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        const m = word.match(/[aeiouy]{1,2}/g);
        return m ? m.length : 1;
    }

    function readabilityScore(text) {
        const plain = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '').replace(/[#*_[\]()~>!-]/g, '').trim();
        const wordList = plain.split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
        if (wordList.length < 15) return null;
        const sentences = Math.max(1, (plain.match(/[.!?]+/g) || []).length);
        const syllables = wordList.reduce((s, w) => s + countSyllables(w), 0);
        const score = 206.835 - 1.015 * (wordList.length / sentences) - 84.6 * (syllables / wordList.length);
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    function readabilityLabel(score) {
        if (score >= 90) return 'Very easy';
        if (score >= 70) return 'Easy';
        if (score >= 60) return 'Standard';
        if (score >= 50) return 'Fairly hard';
        if (score >= 30) return 'Hard';
        return 'Very hard';
    }

    // ── Live word count + reading time ─────────────────────────────────────
    function updateStats() {
        const text = easyMde.value();
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        const mins = Math.max(1, Math.round(words / 250));

        const wordsEl = document.getElementById('stats-words');
        const readingEl = document.getElementById('stats-reading');
        const charsEl = document.getElementById('stats-chars');
        const readabilityEl = document.getElementById('stats-readability');
        const wcProgressEl = document.getElementById('stats-wc-progress');

        if (wordsEl) wordsEl.textContent = `${words.toLocaleString()} word${words !== 1 ? 's' : ''}`;
        if (readingEl) readingEl.textContent = `${mins} min read`;
        if (charsEl) charsEl.textContent = `${chars.toLocaleString()} chars`;

        if (readabilityEl) {
            const score = readabilityScore(text);
            readabilityEl.textContent = score !== null ? `${readabilityLabel(score)} (${score})` : '';
        }

        const target = parseInt(document.getElementById('stats-wc-input')?.value) || 0;
        if (wcProgressEl) {
            if (target > 0) {
                const pct = Math.min(100, Math.round((words / target) * 100));
                wcProgressEl.textContent = `${pct}% of ${target.toLocaleString()} word target`;
                wcProgressEl.hidden = false;
            } else {
                wcProgressEl.hidden = true;
            }
        }
    }

    updateStats();

    // ── Autosave to localStorage ───────────────────────────────────────────
    function getAutosaveEl() { return document.getElementById('stats-autosave'); }

    function setAutosaveStatus(msg, isSaved) {
        const el = getAutosaveEl();
        if (!el) return;
        el.textContent = msg;
        el.classList.toggle('editor-stats-bar__autosave--saved', isSaved);
        el.classList.toggle('editor-stats-bar__autosave--pending', !isSaved);
    }

    function saveToLocalStorage() {
        const content = easyMde.value();
        if (!content.trim()) return;
        try {
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ content, savedAt: Date.now() }));
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setAutosaveStatus(`Autosaved ${time}`, true);
        } catch { /* storage full */ }
    }

    const autosaveTimer = setInterval(saveToLocalStorage, 30_000);

    // Check for a previously autosaved draft
    try {
        const raw = localStorage.getItem(AUTOSAVE_KEY);
        if (raw) {
            const { content, savedAt } = JSON.parse(raw);
            const current = easyMde.value().trim();
            if (content && content !== current) {
                const when = new Date(savedAt).toLocaleString();
                const banner = document.getElementById('admin-autosave-restore-banner');
                if (banner) {
                    banner.innerHTML = `
                        <div class="admin-autosave-restore">
                            <span>Unsaved draft found from ${escapeHtml(when)}.</span>
                            <span class="admin-autosave-restore__actions">
                                <button class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" type="button" id="restore-autosave-btn">Restore draft</button>
                                <button class="govuk-link" style="background:none;border:none;cursor:pointer;padding:0;font:inherit;" type="button" id="discard-autosave-btn">Discard</button>
                            </span>
                        </div>`;
                    document.getElementById('restore-autosave-btn').addEventListener('click', () => {
                        easyMde.value(content);
                        updateStats();
                        markDirty();
                        banner.innerHTML = '';
                    });
                    document.getElementById('discard-autosave-btn').addEventListener('click', () => {
                        localStorage.removeItem(AUTOSAVE_KEY);
                        banner.innerHTML = '';
                    });
                }
            }
        }
    } catch { /* ignore */ }

    // ── Excerpt character counter ──────────────────────────────────────────
    const excerptEl = document.getElementById('excerpt');
    const counterEl = document.getElementById('excerpt-counter');

    function updateExcerptCounter() {
        if (!excerptEl || !counterEl) return;
        const len = excerptEl.value.length;
        counterEl.textContent = `${len} / ${EXCERPT_MAX}`;
        counterEl.classList.toggle('admin-char-counter--warn', len > EXCERPT_MAX);
    }

    excerptEl?.addEventListener('input', updateExcerptCounter);
    updateExcerptCounter();

    // ── Image URL live preview ─────────────────────────────────────────────
    const imageInput = document.getElementById('image');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview-img');

    function updateImagePreview() {
        const url = imageInput?.value.trim();
        if (!url || !previewContainer || !previewImg) return;
        previewImg.src = url;
        previewContainer.classList.add('admin-image-preview--visible');
        previewImg.onerror = () => { previewContainer.classList.remove('admin-image-preview--visible'); };
    }

    imageInput?.addEventListener('input', updateImagePreview);

    // ── Revision history panel ─────────────────────────────────────────────
    const revisionsBtn = document.getElementById('admin-revisions-btn');
    const revisionsContainer = document.getElementById('admin-revisions-panel-container');

    if (revisionsBtn && revisionsContainer && !isNew) {
        let revisionsOpen = false;

        revisionsBtn.addEventListener('click', async () => {
            revisionsOpen = !revisionsOpen;
            if (!revisionsOpen) {
                revisionsContainer.innerHTML = '';
                revisionsBtn.textContent = 'Revision history';
                return;
            }
            revisionsBtn.textContent = 'Hide revisions';
            revisionsContainer.innerHTML = '<p class="govuk-body" style="margin-top:0.5rem">Loading revisions…</p>';
            try {
                const revisions = await getArticleRevisions(article.id);
                if (!revisions.length) {
                    revisionsContainer.innerHTML = `
                        <div class="admin-revisions-panel">
                            <p class="govuk-body govuk-!-margin-bottom-0">No saved revisions yet.</p>
                        </div>`;
                    return;
                }
                const items = revisions.map(r => {
                    const date = new Date(r.revised_at).toLocaleString();
                    const words = r.md_content?.trim().split(/\s+/).length ?? 0;
                    return `
                        <li class="admin-revisions-panel__item">
                            <span class="admin-revisions-panel__meta">${escapeHtml(date)} &mdash; ${words.toLocaleString()} words</span>
                            ${r.md_content ? `<button class="govuk-link" style="background:none;border:none;cursor:pointer;padding:0;font:inherit;white-space:nowrap;" type="button" data-rev-content="${escapeAttr(r.md_content)}">Restore</button>` : ''}
                        </li>`;
                }).join('');
                revisionsContainer.innerHTML = `
                    <div class="admin-revisions-panel">
                        <strong class="govuk-body govuk-!-font-weight-bold">Saved revisions (${revisions.length})</strong>
                        <ul class="admin-revisions-panel__list">${items}</ul>
                    </div>`;
                revisionsContainer.querySelectorAll('[data-rev-content]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (!confirm('Replace current content with this revision?')) return;
                        easyMde.value(btn.dataset.revContent);
                        updateStats();
                        markDirty();
                        revisionsOpen = false;
                        revisionsContainer.innerHTML = '';
                        revisionsBtn.textContent = 'Revision history';
                        switchTab('tab-content');
                    });
                });
            } catch (err) {
                revisionsContainer.innerHTML = `<div class="admin-revisions-panel"><p class="govuk-body govuk-!-margin-bottom-0">Could not load revisions: ${escapeHtml(err.message)}</p></div>`;
            }
        });
    }

    // ── Quick publish toggle ───────────────────────────────────────────────
    const publishToggleBtn = document.getElementById('admin-publish-toggle-btn');
    if (publishToggleBtn) {
        publishToggleBtn.addEventListener('click', () => {
            const draftCheckbox = document.getElementById('is_draft');
            draftCheckbox.checked = !draftCheckbox.checked;
            publishToggleBtn.textContent = draftCheckbox.checked ? 'Publish now' : 'Return to draft';
            markDirty();
        });
    }

    // ── SEO preview ────────────────────────────────────────────────────────
    function updateSeoPreview() {
        const title = document.getElementById('title')?.value || '';
        const slug = document.getElementById('slug')?.value || '';
        const excerpt = document.getElementById('excerpt')?.value || '';

        const titleEl = document.getElementById('seo-title-preview');
        const slugEl = document.getElementById('seo-slug-preview');
        const descEl = document.getElementById('seo-desc-preview');
        const hintsEl = document.getElementById('seo-hints');
        if (!titleEl) return;

        titleEl.textContent = title || 'Article title';
        titleEl.classList.toggle('seo-preview__title--long', title.length > 60);
        slugEl.textContent = slug || '…';
        descEl.textContent = excerpt
            ? (excerpt.length > 155 ? excerpt.slice(0, 155) + '…' : excerpt)
            : 'No excerpt provided.';

        if (hintsEl) {
            const hints = [];
            if (title.length > 60) hints.push(`Title is ${title.length} chars — recommended max is 60`);
            if (title.length > 0 && title.length < 20) hints.push('Title may be too short for SEO');
            if (!excerpt) hints.push('Add an excerpt for better search visibility');
            else if (excerpt.length < 50) hints.push('Excerpt is short — aim for 50–155 chars');
            else if (excerpt.length > 155) hints.push(`Excerpt is ${excerpt.length} chars — recommended max is 155`);
            hintsEl.innerHTML = hints.map(h => `<div class="seo-preview__hint">${escapeHtml(h)}</div>`).join('');
        }
    }

    document.getElementById('title')?.addEventListener('input', updateSeoPreview);
    slugInput.addEventListener('input', updateSeoPreview);
    document.getElementById('excerpt')?.addEventListener('input', updateSeoPreview);
    updateSeoPreview();

    // ── Article outline ────────────────────────────────────────────────────
    let outlineVisible = false;
    const outlineBtn = document.getElementById('stats-outline-btn');
    const outlineContainer = document.getElementById('admin-outline-container');
    const outlineList = document.getElementById('admin-outline-list');

    function updateOutline() {
        if (!outlineVisible || !outlineList) return;
        const lines = easyMde.value().split('\n');
        const headings = [];
        lines.forEach((line, i) => {
            const m = line.match(/^(#{2,3})\s+(.+)/);
            if (m) headings.push({ level: m[1].length, text: m[2].trim(), line: i });
        });
        if (!headings.length) {
            outlineList.innerHTML = '<p style="color:var(--c-secondary);font-size:0.875rem;margin:0;">No H2/H3 headings found.</p>';
            return;
        }
        outlineList.innerHTML = headings.map(h =>
            `<div class="admin-outline-item admin-outline-item--h${h.level}" data-line="${h.line}">${escapeHtml(h.text)}</div>`
        ).join('');
        outlineList.querySelectorAll('[data-line]').forEach(item => {
            item.addEventListener('click', () => {
                const line = parseInt(item.dataset.line);
                easyMde.codemirror.setCursor({ line, ch: 0 });
                easyMde.codemirror.scrollIntoView({ line, ch: 0 }, 100);
                easyMde.codemirror.focus();
                switchTab('tab-content');
            });
        });
    }

    outlineBtn?.addEventListener('click', () => {
        outlineVisible = !outlineVisible;
        outlineContainer.hidden = !outlineVisible;
        outlineBtn.classList.toggle('editor-stats-bar__btn--active', outlineVisible);
        if (outlineVisible) updateOutline();
    });

    easyMde.codemirror.on('change', () => { if (outlineVisible) updateOutline(); });

    // ── Word count target ──────────────────────────────────────────────────
    const targetBtn = document.getElementById('stats-target-btn');
    const targetRow = document.getElementById('editor-target-row');
    const targetInput = document.getElementById('stats-wc-input');
    const targetSetBtn = document.getElementById('stats-target-set-btn');
    const targetClearBtn = document.getElementById('stats-target-clear-btn');

    const WC_TARGET_KEY = `admin-wc-target-${article?.id || 'new'}`;
    const savedTarget = localStorage.getItem(WC_TARGET_KEY);
    if (savedTarget && targetInput) {
        targetInput.value = savedTarget;
        updateStats();
    }

    targetBtn?.addEventListener('click', () => {
        const open = targetRow.hidden;
        targetRow.hidden = !open;
        targetBtn.classList.toggle('editor-stats-bar__btn--active', open);
        if (open) targetInput?.focus();
    });

    targetSetBtn?.addEventListener('click', () => {
        localStorage.setItem(WC_TARGET_KEY, targetInput?.value || '0');
        updateStats();
        targetRow.hidden = true;
        targetBtn.classList.remove('editor-stats-bar__btn--active');
    });

    targetClearBtn?.addEventListener('click', () => {
        if (targetInput) targetInput.value = '';
        localStorage.removeItem(WC_TARGET_KEY);
        updateStats();
    });

    // ── Focus mode ─────────────────────────────────────────────────────────
    function toggleFocusMode(on) {
        const active = on !== undefined ? on : !document.body.classList.contains('admin-focus-mode');
        document.body.classList.toggle('admin-focus-mode', active);
        const focusBtn = document.getElementById('admin-focus-btn');
        if (focusBtn) focusBtn.textContent = active ? 'Exit focus' : 'Focus mode';
        if (active) easyMde.codemirror.focus();
    }

    document.getElementById('admin-focus-btn')?.addEventListener('click', () => toggleFocusMode());
    document.getElementById('admin-focus-exit-btn')?.addEventListener('click', () => toggleFocusMode(false));

    // ── Copy public URL ────────────────────────────────────────────────────
    document.getElementById('admin-copy-url-btn')?.addEventListener('click', async () => {
        const slug = document.getElementById('slug')?.value?.trim();
        if (!slug) { showBanner('error', 'Enter a slug first.'); return; }
        const url = `${window.location.origin}/a/${slug}`;
        try {
            await navigator.clipboard.writeText(url);
            const btn = document.getElementById('admin-copy-url-btn');
            if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy URL'; }, 2000); }
        } catch {
            showBanner('error', 'Could not copy URL — check browser permissions.');
        }
    });

    // ── Duplicate article ──────────────────────────────────────────────────
    document.getElementById('admin-duplicate-btn')?.addEventListener('click', async () => {
        if (!confirm('Create a draft copy of this article?')) return;
        const btn = document.getElementById('admin-duplicate-btn');
        btn.disabled = true;
        btn.textContent = 'Duplicating…';
        try {
            const newSlug = `copy-of-${article.slug}`;
            await createArticle({
                title: `Copy of ${article.title}`,
                subtitle: article.subtitle,
                excerpt: article.excerpt,
                slug: newSlug,
                link: newSlug,
                image: article.image,
                tags: article.tags,
                author: article.author,
                date: article.date,
                is_draft: true,
                md_content: article.md_content,
                html_content: article.html_content,
                code_module: article.code_module,
                published_at: new Date().toISOString(),
            });
            showBanner('success', `Duplicate created as draft. Find it in the articles list.`);
        } catch (err) {
            showBanner('error', `Duplicate failed: ${err.message}`);
        }
        btn.disabled = false;
        btn.textContent = 'Duplicate';
    });

    // ── Keyboard shortcut Ctrl+S / Cmd+S  +  Escape to exit focus ─────────
    const kbHandler = e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            form.requestSubmit();
        }
        if (e.key === 'Escape' && document.body.classList.contains('admin-focus-mode')) {
            toggleFocusMode(false);
        }
    };
    document.addEventListener('keydown', kbHandler);

    const form = document.getElementById('admin-form');
    const saveBtn = document.getElementById('admin-save-btn');
    const saveTopBtn = document.getElementById('admin-save-top-btn');
    const cancelTopBtn = document.getElementById('admin-cancel-top');
    const errorSummary = document.getElementById('editor-error-summary');
    const errorList = document.getElementById('editor-error-list');

    if (saveTopBtn) {
        saveTopBtn.addEventListener('click', () => {
            form.requestSubmit();
        });
    }

    function cleanup() {
        clearInterval(autosaveTimer);
        window.removeEventListener('beforeunload', beforeUnloadHandler);
        document.removeEventListener('keydown', kbHandler);
        document.body.classList.remove('admin-focus-mode');
    }

    document.getElementById('admin-back').addEventListener('click', e => { e.preventDefault(); cleanup(); go(''); });
    document.getElementById('admin-cancel').addEventListener('click', e => { e.preventDefault(); cleanup(); go(''); });
    if (cancelTopBtn) cancelTopBtn.addEventListener('click', e => { e.preventDefault(); cleanup(); go(''); });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        errorSummary.hidden = true;
        errorList.innerHTML = '';

        mdTextarea.value = easyMde.value();

        const fd = new FormData(form);
        const contentType = fd.get('content_type');

        const errors = [];
        if (!fd.get('title')?.trim()) errors.push({ id: 'title', msg: 'Enter a title' });
        if (!fd.get('slug')?.trim()) errors.push({ id: 'slug', msg: 'Enter a slug' });
        if (contentType === 'md' && !fd.get('md_content')?.trim()) errors.push({ id: 'md_content', msg: 'Enter some Markdown content' });
        if (contentType === 'html' && !fd.get('html_content')?.trim()) errors.push({ id: 'html_content', msg: 'Enter some HTML content' });
        if (contentType === 'code' && !fd.get('code_module')?.trim()) errors.push({ id: 'code_module', msg: 'Enter a code module key' });

        if (errors.length) {
            errorList.innerHTML = errors.map(err =>
                `<li><a href="#${err.id}">${escapeHtml(err.msg)}</a></li>`
            ).join('');
            errorSummary.hidden = false;
            switchTab(DETAILS_FIELDS.has(errors[0].id) ? 'tab-details' : 'tab-content');
            errorSummary.focus();
            return;
        }

        const payload = buildPayload(fd, contentType);

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';

        try {
            let savedArticle;
            if (isNew) {
                savedArticle = await createArticle(payload);
            } else {
                savedArticle = await updateArticle(article.id, payload);
            }

            const shouldNotify = fd.has('notify_subscribers') && !payload.is_draft;
            if (shouldNotify && savedArticle?.id) {
                try { await createPendingNotification(savedArticle.id); } catch { /* non-fatal */ }
            }

            localStorage.removeItem(AUTOSAVE_KEY);
            markClean();
            cleanup();
            go('');
        } catch (err) {
            errorList.innerHTML = `<li>${escapeHtml(err.message || 'Something went wrong.')}</li>`;
            errorSummary.hidden = false;
            errorSummary.focus();
            saveBtn.disabled = false;
            saveBtn.textContent = isNew ? 'Create article' : 'Save changes';
        }
    });
}

function buildPayload(fd, contentType) {
    const payload = {
        title: fd.get('title').trim(),
        subtitle: fd.get('subtitle').trim() || null,
        excerpt: fd.get('excerpt').trim() || null,
        slug: fd.get('slug').trim(),
        image: fd.get('image').trim() || null,
        tags: parseTags(fd.get('tags') || ''),
        author: fd.get('author').trim() ? { name: fd.get('author').trim() } : null,
        date: fd.get('date').trim() || null,
        is_draft: fd.has('is_draft'),
        md_content: null,
        html_content: null,
        code_module: null,
    };

    if (contentType === 'md') payload.md_content = fd.get('md_content').trim() || null;
    if (contentType === 'html') payload.html_content = fd.get('html_content').trim() || null;
    if (contentType === 'code') payload.code_module = fd.get('code_module').trim() || null;

    if (contentType === 'code') {
        payload.slug = payload.code_module;
    }

    payload.link = payload.slug;

    const pubAt = fd.get('published_at');
    payload.published_at = pubAt ? new Date(pubAt).toISOString() : new Date().toISOString();

    return payload;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function slugify(str) {
    return str
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function parseTags(str) {
    return str
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .map(label => ({ label }));
}

function tagsToString(tags) {
    if (!Array.isArray(tags)) return '';
    return tags.map(t => t.label || t).join(', ');
}

function contentTypeOf(article) {
    if (article?.code_module) return 'code';
    if (article?.md_content) return 'md';
    if (article?.html_content) return 'html';
    return 'md';
}
