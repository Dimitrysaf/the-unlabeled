// src/pages/admin/comments.js
import { escapeHtml, escapeAttr } from '../../lib/escape.js';
import { updateContent } from '../../components/Layout.js';
import { getAllComments, adminDeleteComment } from '../../data/admin.js';
import { go } from './utils.js';

export async function loadCommentsSection() {
    try {
        renderCommentsSection(await getAllComments());
    } catch (err) {
        const el = document.getElementById('admin-comments-body');
        if (el) el.innerHTML = `
            <div class="govuk-error-summary" data-module="govuk-error-summary">
                <div role="alert">
                    <h2 class="govuk-error-summary__title">Could not load comments</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(err.message)}</p>
                    </div>
                </div>
            </div>`;
    }
}

export function renderCommentsSection(comments) {
    const el = document.getElementById('admin-comments-body');
    if (!comments.length) {
        el.innerHTML = `<p class="govuk-body govuk-hint">No comments yet.</p>`;
        return;
    }

    const plural = comments.length === 1 ? 'comment' : 'comments';
    el.innerHTML = `
        <p class="govuk-body govuk-hint govuk-!-margin-bottom-2">${comments.length} ${plural}</p>
        <div class="table-scroll table-truncate">
            <table class="govuk-table govuk-!-margin-bottom-0">
                <caption class="govuk-table__caption govuk-visually-hidden">All comments</caption>
                <thead class="govuk-table__head">
                    <tr class="govuk-table__row">
                        <th class="govuk-table__header col-important" scope="col">Content</th>
                        <th class="govuk-table__header col-important" scope="col">Author</th>
                        <th class="govuk-table__header" scope="col">Article</th>
                        <th class="govuk-table__header" scope="col">Date</th>
                        <th class="govuk-table__header col-important" scope="col">Actions</th>
                    </tr>
                </thead>
                <tbody class="govuk-table__body">
                    ${comments.map(c => commentRow(c)).join('')}
                </tbody>
            </table>
        </div>
    `;

    comments.forEach(c => bindCommentDelete(c));
}

function commentRow(c) {
    const raw = c.content || '';
    const content = escapeHtml(raw.length > 100 ? raw.slice(0, 100) + '…' : raw);
    const author = escapeHtml(c.display_name || 'Anonymous');
    const date = c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '—';
    const slug = c.articles?.slug;
    const title = escapeHtml(c.articles?.title || c.article_id);
    const articleLink = slug
        ? `<a class="govuk-link govuk-link--no-visited-state" href="/a/${escapeAttr(slug)}"
              target="_blank" rel="noopener noreferrer">${title}</a>`
        : title;

    return `
        <tr class="govuk-table__row" id="cmt-row-${c.id}">
            <td class="govuk-table__cell col-important">${content}</td>
            <td class="govuk-table__cell admin-nowrap col-important">${author}</td>
            <td class="govuk-table__cell">${articleLink}</td>
            <td class="govuk-table__cell admin-nowrap">${date}</td>
            <td class="govuk-table__cell col-important">
                <a class="govuk-link admin-link--danger" href="#" id="cmt-delete-${c.id}">Delete<span class="govuk-visually-hidden"> comment by ${author}</span></a>
            </td>
        </tr>`;
}

function bindCommentDelete(comment) {
    document.getElementById(`cmt-delete-${comment.id}`)?.addEventListener('click', e => {
        e.preventDefault();
        showDeleteCommentConfirm(comment);
    });
}

function showDeleteCommentConfirm(comment) {
    const raw = comment.content || '';
    const contentText = escapeHtml(raw.length > 120 ? raw.slice(0, 120) + '…' : raw);
    const author = escapeHtml(comment.display_name || 'Anonymous');
    const articleTitle = escapeHtml(comment.articles?.title || comment.article_id);

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">

                <a href="#" class="govuk-back-link" id="delete-back">Back to admin</a>
                <span class="govuk-caption-xl">Content management</span>
                <h1 class="govuk-heading-l">Delete comment</h1>

                <dl class="govuk-summary-list govuk-!-margin-bottom-6">
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Content</dt>
                        <dd class="govuk-summary-list__value">${contentText}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Author</dt>
                        <dd class="govuk-summary-list__value">${author}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Article</dt>
                        <dd class="govuk-summary-list__value">${articleTitle}</dd>
                    </div>
                </dl>

                <div class="govuk-warning-text">
                    <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
                    <strong class="govuk-warning-text__text">
                        <span class="govuk-warning-text__assistive">Warning</span>
                        This comment will be permanently deleted and cannot be recovered.
                    </strong>
                </div>

                <div id="delete-error"></div>

                <div class="govuk-button-group govuk-!-margin-top-4">
                    <button class="govuk-button govuk-button--warning" id="confirm-delete-btn">
                        Delete comment
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
            await adminDeleteComment(comment.id);
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
            confirmBtn.textContent = 'Delete comment';
        }
    });
}
