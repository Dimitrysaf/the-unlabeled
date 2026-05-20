// src/pages/admin/articles.js
import { escapeHtml, escapeAttr } from '../../lib/escape.js';
import { updateContent } from '../../components/Layout.js';
import { getAllArticles, toggleDraft, deleteArticle } from '../../data/admin.js';
import { go, showBanner } from './utils.js';

export async function loadArticlesSection() {
    try {
        renderArticlesSection(await getAllArticles());
    } catch (err) {
        const el = document.getElementById('admin-list-body');
        if (el) el.innerHTML = `
            <div class="govuk-error-summary" data-module="govuk-error-summary">
                <div role="alert">
                    <h2 class="govuk-error-summary__title">Could not load articles</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(err.message)}</p>
                    </div>
                </div>
            </div>`;
    }
}

export function renderArticlesSection(articles) {
    if (!articles.length) {
        document.getElementById('admin-list-body').innerHTML = `
            <div class="govuk-inset-text govuk-!-margin-top-4">
                <p class="govuk-body govuk-!-margin-bottom-0">
                    No articles yet.
                    <a class="govuk-link" href="#" id="create-first">Create your first article</a>.
                </p>
            </div>`;
        document.getElementById('create-first')?.addEventListener('click', e => { e.preventDefault(); go('new=1'); });
        return;
    }

    const plural = articles.length === 1 ? 'article' : 'articles';
    document.getElementById('admin-list-body').innerHTML = `
        <p class="govuk-body govuk-hint govuk-!-margin-bottom-2">${articles.length} ${plural}</p>
        <div class="admin-table-header">
            <button class="govuk-button govuk-!-margin-bottom-0" id="admin-new-btn">New article</button>
        </div>
        <div class="table-scroll table-truncate">
            <table class="govuk-table govuk-!-margin-bottom-0">
                <caption class="govuk-table__caption govuk-visually-hidden">All articles</caption>
                <thead class="govuk-table__head">
                    <tr class="govuk-table__row">
                        <th class="govuk-table__header" scope="col">Title</th>
                        <th class="govuk-table__header" scope="col">Slug</th>
                        <th class="govuk-table__header" scope="col">Type</th>
                        <th class="govuk-table__header" scope="col">Status</th>
                        <th class="govuk-table__header" scope="col">Created</th>
                        <th class="govuk-table__header" scope="col">
                            <span class="govuk-visually-hidden">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody class="govuk-table__body" id="admin-table-body">
                    ${articles.map(a => articleRow(a)).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('admin-new-btn').addEventListener('click', () => go('new=1'));

    articles.forEach(a => {
        document.getElementById(`edit-${a.id}`)?.addEventListener('click', e => {
            e.preventDefault();
            go(`edit=${a.id}`);
        });

        document.getElementById(`toggle-${a.id}`)?.addEventListener('click', async e => {
            e.preventDefault();
            try {
                await toggleDraft(a.id, !a.is_draft);
                go('');
            } catch (err) {
                showBanner('error', `Could not update status: ${err.message}`);
            }
        });

        document.getElementById(`delete-${a.id}`)?.addEventListener('click', e => {
            e.preventDefault();
            showDeleteConfirm(a);
        });
    });
}

function articleRow(a) {
    const type = contentTypeLabel(a);
    const date = a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB') : '—';
    const isDraft = a.is_draft;
    const tag = isDraft
        ? `<strong class="govuk-tag govuk-tag--yellow">Draft</strong>`
        : `<strong class="govuk-tag govuk-tag--green">Published</strong>`;
    const toggleLabel = isDraft ? 'Publish' : 'Unpublish';
    const titleText = escapeHtml(a.title || '—');
    const visHidden = `<span class="govuk-visually-hidden"> ${titleText}</span>`;

    return `
        <tr class="govuk-table__row">
            <td class="govuk-table__cell">
                <a class="govuk-link govuk-link--no-visited-state"
                   href="/a/${escapeAttr(a.slug || '')}"
                   target="_blank" rel="noopener noreferrer">${titleText}</a>
            </td>
            <td class="govuk-table__cell">
                <code class="admin-slug">${escapeHtml(a.slug || '—')}</code>
            </td>
            <td class="govuk-table__cell">${type}</td>
            <td class="govuk-table__cell">${tag}</td>
            <td class="govuk-table__cell admin-nowrap">${date}</td>
            <td class="govuk-table__cell">
                <div><a class="govuk-link govuk-link--no-visited-state" href="#" id="edit-${a.id}">Edit${visHidden}</a></div>
                <div><a class="govuk-link govuk-link--no-visited-state" href="#" id="toggle-${a.id}">${toggleLabel}${visHidden}</a></div>
                <div><a class="govuk-link admin-link--danger" href="#" id="delete-${a.id}">Delete${visHidden}</a></div>
            </td>
        </tr>`;
}

function contentTypeLabel(article) {
    if (article.code_module) return 'Code module';
    if (article.md_content) return 'Markdown';
    if (article.html_content) return 'HTML';
    return '—';
}

function showDeleteConfirm(article) {
    const titleText = escapeHtml(article.title || 'Untitled');
    const statusTag = article.is_draft
        ? `<strong class="govuk-tag govuk-tag--yellow">Draft</strong>`
        : `<strong class="govuk-tag govuk-tag--green">Published</strong>`;

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">

                <a href="#" class="govuk-back-link" id="delete-back">Back to articles</a>
                <span class="govuk-caption-xl">Content management</span>
                <h1 class="govuk-heading-l">Delete article</h1>

                <dl class="govuk-summary-list govuk-!-margin-bottom-6">
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Title</dt>
                        <dd class="govuk-summary-list__value">${titleText}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Slug</dt>
                        <dd class="govuk-summary-list__value">
                            <code class="admin-slug">${escapeHtml(article.slug || '—')}</code>
                        </dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Status</dt>
                        <dd class="govuk-summary-list__value">${statusTag}</dd>
                    </div>
                </dl>

                <div class="govuk-warning-text">
                    <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
                    <strong class="govuk-warning-text__text">
                        <span class="govuk-warning-text__assistive">Warning</span>
                        This article will be permanently deleted and cannot be recovered.
                    </strong>
                </div>

                <div id="delete-error"></div>

                <div class="govuk-button-group govuk-!-margin-top-4">
                    <button class="govuk-button govuk-button--warning" id="confirm-delete-btn">
                        Delete article
                    </button>
                    <a class="govuk-link" href="#" id="cancel-delete-btn">Cancel</a>
                </div>

            </div>
        </div>
    `);

    document.getElementById('delete-back').addEventListener('click', e => { e.preventDefault(); go(''); });
    document.getElementById('cancel-delete-btn').addEventListener('click', e => { e.preventDefault(); go(''); });

    const confirmBtn = document.getElementById('confirm-delete-btn');
    confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deleting…';
        try {
            await deleteArticle(article.id);
            go('');
        } catch (err) {
            document.getElementById('delete-error').innerHTML = `
                <div class="govuk-error-summary" role="alert">
                    <div>
                        <h2 class="govuk-error-summary__title">There is a problem</h2>
                        <div class="govuk-error-summary__body">
                            <p class="govuk-body">${escapeHtml(err.message)}</p>
                        </div>
                    </div>
                </div>`;
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Delete article';
        }
    });
}
