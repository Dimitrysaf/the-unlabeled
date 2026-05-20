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
} from '../data/admin.js';
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

                    <div class="govuk-button-group govuk-!-margin-bottom-4 admin-button-group-top">
                        <button class="govuk-button" type="button" id="admin-save-top-btn">
                            ${isNew ? 'Create article' : 'Save changes'}
                        </button>
                        <a class="govuk-link" href="#" id="admin-cancel-top">Cancel</a>
                    </div>

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

                                    <details class="govuk-details">
                                        <summary class="govuk-details__summary">
                                            <span class="govuk-details__summary-text">Optional fields</span>
                                        </summary>
                                        <div class="govuk-details__text admin-optional-fields">
                                            ${field('image', 'Image URL', 'text', article?.image || '', 'govuk-input',
                        'A URL (https://…) or a path in public/ (e.g. /hero.jpg).')}
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

    document.getElementById('admin-back').addEventListener('click', e => { e.preventDefault(); go(''); });
    document.getElementById('admin-cancel').addEventListener('click', e => { e.preventDefault(); go(''); });

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
    });
    slugInput.addEventListener('input', () => { slugEdited = true; });

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
            'link', 'image', '|',
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
    });

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

    if (cancelTopBtn) {
        cancelTopBtn.addEventListener('click', e => {
            e.preventDefault();
            go('');
        });
    }

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
            if (isNew) {
                await createArticle(payload);
            } else {
                await updateArticle(article.id, payload);
            }
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
