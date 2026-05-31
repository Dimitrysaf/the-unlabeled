import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import EasyMDE from 'easymde';
import 'easymde/dist/easymde.min.css';
import './editor.css';
import { updateContent } from '../../components/Layout.js';
import { renderMarkdown } from '../../lib/markdown.js';
import { escapeHtml, escapeAttr } from '../../lib/escape.js';
import { createArticle, updateArticle } from '../../data/admin.js';
import { go, showBanner } from './utils.js';

// ── Quill setup (runs once at module load) ────────────────────────────────

const _AlignStyle = Quill.import('attributors/style/align');
const _DirectionStyle = Quill.import('attributors/style/direction');
const _FontStyle = Quill.import('attributors/style/font');
const _SizeStyle = Quill.import('attributors/style/size');

_FontStyle.whitelist = ['arial', 'courier-new', 'georgia', 'times-new-roman', 'verdana', 'trebuchet-ms', 'impact'];
_SizeStyle.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];

Quill.register(_AlignStyle, true);
Quill.register(_DirectionStyle, true);
Quill.register(_FontStyle, true);
Quill.register(_SizeStyle, true);

// HR blot
const _BlockEmbed = Quill.import('blots/block/embed');
class HrBlot extends _BlockEmbed {
    static create() { return document.createElement('hr'); }
    static value() { return true; }
}
HrBlot.blotName = 'divider';
HrBlot.tagName = 'hr';
Quill.register(HrBlot, true);

const QUILL_FONTS = _FontStyle.whitelist;
const QUILL_SIZES = _SizeStyle.whitelist;

let _autosaveTimer = null;

const QUILL_TOOLBAR = [
    ['undo', 'redo'],
    [{ font: QUILL_FONTS }, { size: QUILL_SIZES }],
    [{ header: [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ align: [] }, { direction: 'rtl' }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['blockquote', 'divider'],
    ['link', 'image', 'video'],
    ['clean'],
    ['fullscreen'],
];

// ── Editor view ───────────────────────────────────────────────────────────

export function renderAdminEditor(article) {
    const isNew = !article;
    const pageTitle = isNew ? 'New article' : 'Edit article';
    const type = isNew ? 'html' : contentTypeOf(article);

    const todayIso = new Date().toISOString().slice(0, 10);
    const todayDisplay = formatDisplayDate(todayIso);
    const initialPublishedAt = (article?.published_at || '').slice(0, 10) || (isNew ? todayIso : '');
    const initialDate = article?.date || (isNew ? todayDisplay : '');

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
                    <p class="admin-autosave-indicator" id="autosave-indicator" hidden></p>

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
                                <div class="wysiwyg-bar">
                                    <button type="button" class="wysiwyg-mode-btn wysiwyg-mode-btn--active"
                                            id="wysiwyg-compose-btn">Compose</button>
                                    <button type="button" class="wysiwyg-mode-btn"
                                            id="wysiwyg-html-btn">HTML source</button>
                                </div>
                                <div id="wysiwyg-editor"></div>
                                <textarea class="admin-code-textarea wysiwyg-source-area"
                                    id="html_content" name="html_content"
                                    rows="24" spellcheck="false"
                                    hidden>${escapeHtml(article?.html_content || '')}</textarea>
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
                                    ${field('slug', 'Slug / Permalink', 'text', article?.slug || '', 'govuk-input',
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
                                            ${field('tags', 'Labels / Tags', 'text', tagsToString(article?.tags), 'govuk-input',
                            'Comma-separated, e.g. Politics, Economy')}
                                            ${field('author', 'Author name', 'text', article?.author?.name || '', 'govuk-input')}
                                            ${field('published_at', 'Date', 'date',
                                    initialPublishedAt, 'govuk-input',
                                    'Publish date — controls ordering and auto-fills the display date.')}
                                            ${field('date', 'Display date', 'text',
                                    initialDate, 'govuk-input',
                                    'Shown on the article page. Auto-filled from Date above — edit to override.')}
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
                                                <input class="govuk-checkboxes__input" id="allow_comments" name="allow_comments"
                                                    type="checkbox" ${(article?.allow_comments !== false) ? 'checked' : ''}>
                                                <label class="govuk-label govuk-checkboxes__label" for="allow_comments">
                                                    Allow comments
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

// ── Editor init ───────────────────────────────────────────────────────────

function initEditor(article) {
    const isNew = !article;
    const type = isNew ? 'html' : contentTypeOf(article);

    document.getElementById('admin-back').addEventListener('click', e => { e.preventDefault(); clearInterval(_autosaveTimer); go(''); });
    document.getElementById('admin-cancel').addEventListener('click', e => { e.preventDefault(); clearInterval(_autosaveTimer); go(''); });

    // ── Tab switching ──────────────────────────────────────────────────────
    const DETAILS_FIELDS = new Set(['title', 'slug', 'subtitle', 'excerpt',
        'image', 'tags', 'author', 'date', 'published_at', 'allow_comments']);

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

    // ── Date auto-format ───────────────────────────────────────────────────
    const publishedAtInput = document.getElementById('published_at');
    const dateInput = document.getElementById('date');
    let dateManuallyEdited = !!article?.date;

    publishedAtInput?.addEventListener('change', () => {
        if (!dateManuallyEdited) {
            dateInput.value = formatDisplayDate(publishedAtInput.value);
        }
    });
    dateInput?.addEventListener('input', () => { dateManuallyEdited = true; });

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

    // ── HTML WYSIWYG editor ────────────────────────────────────────────────
    let quillInst = null;
    let wysiwygMode = 'compose';
    const htmlTextarea = document.getElementById('html_content');

    function initQuillOnce() {
        if (quillInst) return quillInst;
        const editorEl = document.getElementById('wysiwyg-editor');
        if (!editorEl) return null;

        quillInst = new Quill(editorEl, {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: QUILL_TOOLBAR,
                    handlers: {
                        undo() { quillInst.getModule('history').undo(); },
                        redo() { quillInst.getModule('history').redo(); },
                        divider() {
                            const range = quillInst.getSelection(true);
                            if (!range) return;
                            quillInst.insertEmbed(range.index, 'divider', true, Quill.sources.USER);
                            quillInst.setSelection(range.index + 1, Quill.sources.SILENT);
                        },
                        fullscreen() {
                            const panel = document.getElementById('panel-html');
                            const isActive = panel.classList.toggle('ql-fullscreen-active');
                            document.body.style.overflow = isActive ? 'hidden' : '';
                            const btn = quillInst.getModule('toolbar').container.querySelector('.ql-fullscreen');
                            if (btn) btn.classList.toggle('ql-active', isActive);
                            if (isActive) {
                                const onEsc = e => {
                                    if (e.key !== 'Escape') return;
                                    panel.classList.remove('ql-fullscreen-active');
                                    document.body.style.overflow = '';
                                    if (btn) btn.classList.remove('ql-active');
                                    document.removeEventListener('keydown', onEsc);
                                };
                                document.addEventListener('keydown', onEsc);
                            }
                        },
                    },
                },
                history: { delay: 1000, maxStack: 100, userOnly: true },
            },
        });

        // Track last known selection — getSelection() returns null when the editor loses focus.
        let lastKnownRange = null;
        quillInst.on('selection-change', range => { if (range) lastKnownRange = range; });

        // Intercept image button in capture phase — fires before Snow's built-in file-picker handler.
        // Re-use Quill's own inline tooltip (the same one the video button uses).
        const imageBtn = quillInst.getModule('toolbar').container.querySelector('.ql-image');
        if (imageBtn) {
            imageBtn.addEventListener('click', e => {
                e.stopImmediatePropagation();
                e.preventDefault();
                lastKnownRange = quillInst.getSelection() ?? lastKnownRange;

                const tooltip = quillInst.theme.tooltip;
                const origSave = tooltip.save.bind(tooltip);
                const origHide = tooltip.hide.bind(tooltip);

                function restoreTooltip() {
                    tooltip.save = origSave;
                    tooltip.hide = origHide;
                }

                tooltip.hide = function () { restoreTooltip(); origHide(); };

                tooltip.save = function () {
                    const url = tooltip.textbox.value.trim();
                    restoreTooltip();
                    origHide();
                    if (!url) return;
                    const index = lastKnownRange ? lastKnownRange.index : quillInst.getLength();
                    quillInst.insertEmbed(index, 'image', url, Quill.sources.USER);
                    quillInst.setSelection(index + 1, Quill.sources.SILENT);
                };

                tooltip.edit('video', '');
                tooltip.textbox.placeholder = 'Image URL';
            }, true);
        }

        // ── Custom colour pickers ────────────────────────────────────────────
        function addCustomColorPicker(format) {
            const toolbar = quillInst.getModule('toolbar').container;
            const cls = format === 'color' ? 'ql-color' : 'ql-background';
            const pickerOptions = toolbar.querySelector(`.${cls} .ql-picker-options`);
            if (!pickerOptions) return;

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.className = 'ql-custom-color-input';
            colorInput.title = 'Custom colour';

            colorInput.addEventListener('change', () => {
                const range = lastKnownRange;
                if (range && range.length > 0) {
                    quillInst.formatText(range.index, range.length, format, colorInput.value, Quill.sources.USER);
                } else {
                    quillInst.format(format, colorInput.value, Quill.sources.USER);
                }
            });

            const btn = document.createElement('span');
            btn.className = 'ql-custom-color-btn';
            btn.title = 'Custom colour';
            btn.textContent = 'Custom…';
            btn.prepend(colorInput);

            btn.addEventListener('mousedown', e => e.stopPropagation());
            btn.addEventListener('click', e => {
                e.stopPropagation();
                lastKnownRange = quillInst.getSelection() ?? lastKnownRange;
                colorInput.click();
            });

            pickerOptions.appendChild(btn);
        }

        addCustomColorPicker('color');
        addCustomColorPicker('background');

        const initial = htmlTextarea?.value || '';
        if (initial.trim()) quillInst.clipboard.dangerouslyPasteHTML(initial);

        return quillInst;
    }

    function setWysiwygMode(mode) {
        wysiwygMode = mode;
        const editorEl = document.getElementById('wysiwyg-editor');
        const composeBtn = document.getElementById('wysiwyg-compose-btn');
        const htmlBtn = document.getElementById('wysiwyg-html-btn');
        if (!editorEl || !composeBtn || !htmlBtn) return;

        if (mode === 'compose') {
            initQuillOnce();
            quillInst.clipboard.dangerouslyPasteHTML(htmlTextarea.value || '');
            editorEl.style.display = 'block';
            quillInst.getModule('toolbar').container.style.display = 'block';
            htmlTextarea.style.display = 'none';
            composeBtn.classList.add('wysiwyg-mode-btn--active');
            htmlBtn.classList.remove('wysiwyg-mode-btn--active');
        } else {
            if (quillInst) {
                htmlTextarea.value = quillInst.root.innerHTML;
                quillInst.getModule('toolbar').container.style.display = 'none';
            }
            editorEl.style.display = 'none';
            htmlTextarea.style.display = 'block';
            htmlBtn.classList.add('wysiwyg-mode-btn--active');
            composeBtn.classList.remove('wysiwyg-mode-btn--active');
        }
    }

    document.getElementById('wysiwyg-compose-btn')?.addEventListener('click', () => setWysiwygMode('compose'));
    document.getElementById('wysiwyg-html-btn')?.addEventListener('click', () => setWysiwygMode('source'));

    // ── Content type panel switching ───────────────────────────────────────
    const panels = { md: 'panel-md', html: 'panel-html', code: 'panel-code' };
    document.getElementById('content-type-radios').addEventListener('change', e => {
        if (e.target.name !== 'content_type') return;
        Object.entries(panels).forEach(([key, id]) => {
            document.getElementById(id).hidden = (key !== e.target.value);
        });
        if (e.target.value === 'md') easyMde.codemirror.refresh();
        if (e.target.value === 'html') initQuillOnce();
    });

    if (type === 'html') setWysiwygMode('compose');

    // ── Form ───────────────────────────────────────────────────────────────
    const form = document.getElementById('admin-form');
    const saveBtn = document.getElementById('admin-save-btn');
    const saveTopBtn = document.getElementById('admin-save-top-btn');
    const cancelTopBtn = document.getElementById('admin-cancel-top');
    const errorSummary = document.getElementById('editor-error-summary');
    const errorList = document.getElementById('editor-error-list');

    if (saveTopBtn) {
        saveTopBtn.addEventListener('click', () => { form.requestSubmit(); });
    }

    if (cancelTopBtn) {
        cancelTopBtn.addEventListener('click', e => { e.preventDefault(); clearInterval(_autosaveTimer); go(''); });
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        errorSummary.hidden = true;
        errorList.innerHTML = '';

        // Sync editors to their backing form fields
        mdTextarea.value = easyMde.value();
        if (quillInst && wysiwygMode === 'compose') {
            htmlTextarea.value = quillInst.root.innerHTML;
        }

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
            clearInterval(_autosaveTimer);
            autosaveClear();
            go('');
        } catch (err) {
            errorList.innerHTML = `<li>${escapeHtml(err.message || 'Something went wrong.')}</li>`;
            errorSummary.hidden = false;
            errorSummary.focus();
            saveBtn.disabled = false;
            saveBtn.textContent = isNew ? 'Create article' : 'Save changes';
        }
    });

    // ── Autosave to localStorage ───────────────────────────────────────────
    clearInterval(_autosaveTimer);
    const AUTOSAVE_KEY = `admin_autosave_${article?.id ?? 'new'}`;

    function autosaveCollect() {
        mdTextarea.value = easyMde.value();
        if (quillInst && wysiwygMode === 'compose') htmlTextarea.value = quillInst.root.innerHTML;
        const fd = new FormData(form);
        return {
            savedAt: Date.now(),
            content_type: fd.get('content_type') ?? 'md',
            md_content:   fd.get('md_content')   ?? '',
            html_content: fd.get('html_content') ?? '',
            title:        fd.get('title')        ?? '',
            slug:         fd.get('slug')         ?? '',
            subtitle:     fd.get('subtitle')     ?? '',
            excerpt:      fd.get('excerpt')      ?? '',
            image:        fd.get('image')        ?? '',
            tags:         fd.get('tags')         ?? '',
            author:       fd.get('author')       ?? '',
            date:         fd.get('date')         ?? '',
            published_at: fd.get('published_at') ?? '',
        };
    }

    function autosaveWrite() {
        try {
            const data = autosaveCollect();
            const ct = data.content_type;
            const html = (data.html_content || '').trim();
            const md = (data.md_content || '').trim();
            const isEmpty =
                (ct === 'html' && (html === '' || html === '<p><br></p>')) ||
                (ct === 'md'   && md === '') ||
                (ct === 'code' && !(data.code_module || '').trim());
            if (isEmpty) return;
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
            const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            const indicator = document.getElementById('autosave-indicator');
            if (indicator) { indicator.textContent = `Draft autosaved at ${time}`; indicator.hidden = false; }
        } catch { /* storage unavailable */ }
    }

    function autosaveClear() {
        localStorage.removeItem(AUTOSAVE_KEY);
    }

    function autosaveRestore(saved) {
        const setField = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
        setField('title',        saved.title);
        setField('slug',         saved.slug);
        setField('subtitle',     saved.subtitle);
        setField('excerpt',      saved.excerpt);
        setField('image',        saved.image);
        setField('tags',         saved.tags);
        setField('author',       saved.author);
        setField('date',         saved.date);
        setField('published_at', saved.published_at);
        if (saved.md_content)   easyMde.value(saved.md_content);
        if (saved.html_content) {
            htmlTextarea.value = saved.html_content;
            if (quillInst) quillInst.clipboard.dangerouslyPasteHTML(saved.html_content);
        }
        if (saved.content_type) {
            const radio = document.querySelector(`input[name="content_type"][value="${saved.content_type}"]`);
            if (radio && !radio.checked) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
        }
        autosaveClear();
        showBanner('success', 'Draft restored.');
    }

    // If a draft exists, offer to restore it
    let existingDraft = null;
    try { existingDraft = JSON.parse(localStorage.getItem(AUTOSAVE_KEY)); } catch { /* */ }
    if (existingDraft?.savedAt) {
        const bannerEl = document.getElementById('admin-banner');
        if (bannerEl) {
            const savedDate = new Date(existingDraft.savedAt).toLocaleString('en-GB', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            });
            bannerEl.innerHTML = `
                <div class="govuk-notification-banner" role="region" aria-labelledby="autosave-banner-title">
                    <div class="govuk-notification-banner__header">
                        <h2 class="govuk-notification-banner__title" id="autosave-banner-title">Unsaved draft found</h2>
                    </div>
                    <div class="govuk-notification-banner__content">
                        <p class="govuk-body govuk-!-margin-bottom-2">Autosaved on ${escapeHtml(savedDate)}.</p>
                        <div class="govuk-button-group">
                            <button class="govuk-button govuk-!-margin-bottom-0" type="button"
                                    id="autosave-restore-btn">Restore draft</button>
                            <button class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" type="button"
                                    id="autosave-discard-btn">Discard</button>
                        </div>
                    </div>
                </div>`;
            document.getElementById('autosave-restore-btn').addEventListener('click', () => autosaveRestore(existingDraft));
            document.getElementById('autosave-discard-btn').addEventListener('click', () => { autosaveClear(); bannerEl.innerHTML = ''; });
        }
    }

    _autosaveTimer = setInterval(autosaveWrite, 30_000);
}

// ── Template helpers ──────────────────────────────────────────────────────

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

// ── Payload / data helpers ────────────────────────────────────────────────

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
        allow_comments: fd.has('allow_comments'),
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

function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

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
