// src/pages/admin.js
import EasyMDE from 'easymde';
import 'easymde/dist/easymde.min.css';
import './admin.css';
import './admin.mobile.css';
import { updateContent } from '../components/Layout.js';
import { navigate } from '../router.js';
import { renderError } from '../components/ErrorPage.js';
import { renderMarkdown } from '../lib/markdown.js';
import { escapeHtml, escapeAttr } from '../lib/escape.js';
import {
    checkIsAdmin,
    getAllArticles,
    getAllComments,
    adminDeleteComment,
    listAllUsers,
    getUserById,
    banUser,
    unbanUser,
    adminDeleteUser,
    removeMfa,
    sendPasswordResetEmail,
    sendMagicLinkEmail,
    getArticleById,
    createArticle,
    updateArticle,
    deleteArticle,
    toggleDraft,
} from '../data/admin.js';
import { getAllSubmissions, deleteSubmission } from '../data/submissions.js';

import { supabase } from '../lib/supabase.js';

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

// ── Helpers ───────────────────────────────────────────────────────────────

function go(search) {
    navigate('/admin' + (search ? '?' + search : ''));
}

// ── List view ─────────────────────────────────────────────────────────────

async function showList() {
    updateContent(`
        <span class="govuk-caption-xl">Content management</span>
        <h1 class="govuk-heading-xl">Admin</h1>
        <div class="admin-shortcuts">
            <a class="govuk-link" href="https://vercel.com/dimitrysafs-projects/the-unlabeled"
               target="_blank" rel="noopener noreferrer">Vercel ↗</a>
            <a class="govuk-link" href="https://supabase.com/dashboard/project/zapruosojosnbdttkvab/auth/users"
               target="_blank" rel="noopener noreferrer">Supabase users ↗</a>
            <button class="govuk-link" id="test-notif-btn" style="background:none;border:none;cursor:pointer;padding:0;font:inherit;">
                Send test notification
            </button>
        </div>
        <div id="admin-banner"></div>
        <h2 class="govuk-heading-m">Articles</h2>
        <div id="admin-list-body">
            <p class="govuk-body govuk-hint">Loading articles…</p>
        </div>
        <h2 class="govuk-heading-m govuk-!-margin-top-8">Comments</h2>
        <div id="admin-comments-body">
            <p class="govuk-body govuk-hint">Loading comments…</p>
        </div>
        <h2 class="govuk-heading-m govuk-!-margin-top-8">Users</h2>
        <div id="admin-users-body">
            <p class="govuk-body govuk-hint">Loading users…</p>
        </div>
        <h2 class="govuk-heading-m govuk-!-margin-top-8">Submissions</h2>
        <div id="admin-submissions-body">
            <p class="govuk-body govuk-hint">Loading submissions…</p>
        </div>
    `);

    document.getElementById('test-notif-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('test-notif-btn');
        btn.disabled = true;
        btn.textContent = 'Sending…';
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/test-notification', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
            const { sent } = json;
            showBanner('success', `Test notification sent to ${sent} subscriber${sent !== 1 ? 's' : ''}.`);
        } catch (err) {
            showBanner('error', `Failed to send test notification: ${err.message}`);
        }
        btn.textContent = 'Send test notification';
        btn.disabled = false;
    });

    const [articlesResult, commentsResult, usersResult, submissionsResult] = await Promise.allSettled([
        getAllArticles(),
        getAllComments(),
        listAllUsers(),
        getAllSubmissions(),
    ]);

    if (articlesResult.status === 'rejected') {
        document.getElementById('admin-list-body').innerHTML = `
            <div class="govuk-error-summary" data-module="govuk-error-summary">
                <div role="alert">
                    <h2 class="govuk-error-summary__title">Could not load articles</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(articlesResult.reason.message)}</p>
                    </div>
                </div>
            </div>`;
    } else {
        renderArticlesSection(articlesResult.value);
    }

    if (commentsResult.status === 'rejected') {
        document.getElementById('admin-comments-body').innerHTML = `
            <div class="govuk-error-summary" data-module="govuk-error-summary">
                <div role="alert">
                    <h2 class="govuk-error-summary__title">Could not load comments</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(commentsResult.reason.message)}</p>
                    </div>
                </div>
            </div>`;
    } else {
        renderCommentsSection(commentsResult.value);
    }

    if (usersResult.status === 'rejected') {
        document.getElementById('admin-users-body').innerHTML = `
            <div class="govuk-error-summary" data-module="govuk-error-summary">
                <div role="alert">
                    <h2 class="govuk-error-summary__title">Could not load users</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(usersResult.reason.message)}</p>
                    </div>
                </div>
            </div>`;
    } else {
        renderUsersSection(usersResult.value);
    }

    if (submissionsResult.status === 'rejected') {
        document.getElementById('admin-submissions-body').innerHTML = `
            <div class="govuk-error-summary" data-module="govuk-error-summary">
                <div role="alert">
                    <h2 class="govuk-error-summary__title">Could not load submissions</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(submissionsResult.reason.message)}</p>
                    </div>
                </div>
            </div>`;
    } else {
        renderSubmissionsSection(submissionsResult.value);
    }
}

function renderArticlesSection(articles) {
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
                await showList();
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

function renderCommentsSection(comments) {
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
                        <th class="govuk-table__header" scope="col">Content</th>
                        <th class="govuk-table__header" scope="col">Author</th>
                        <th class="govuk-table__header" scope="col">Article</th>
                        <th class="govuk-table__header" scope="col">Date</th>
                        <th class="govuk-table__header" scope="col">
                            <span class="govuk-visually-hidden">Actions</span>
                        </th>
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
            <td class="govuk-table__cell">${content}</td>
            <td class="govuk-table__cell admin-nowrap">${author}</td>
            <td class="govuk-table__cell">${articleLink}</td>
            <td class="govuk-table__cell admin-nowrap">${date}</td>
            <td class="govuk-table__cell">
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

// ── Submissions section ───────────────────────────────────────────────────────

function renderSubmissionsSection(submissions) {
    const el = document.getElementById('admin-submissions-body');
    if (!submissions.length) {
        el.innerHTML = `<p class="govuk-body govuk-hint">No submissions yet.</p>`;
        return;
    }

    const plural = submissions.length === 1 ? 'submission' : 'submissions';
    el.innerHTML = `
        <p class="govuk-body govuk-hint govuk-!-margin-bottom-2">${submissions.length} ${plural}</p>
        <div class="table-scroll table-truncate">
            <table class="govuk-table govuk-!-margin-bottom-0">
                <caption class="govuk-table__caption govuk-visually-hidden">All submissions</caption>
                <thead class="govuk-table__head">
                    <tr class="govuk-table__row">
                        <th class="govuk-table__header" scope="col">Title</th>
                        <th class="govuk-table__header" scope="col">Description</th>
                        <th class="govuk-table__header" scope="col">Source</th>
                        <th class="govuk-table__header" scope="col">Contact</th>
                        <th class="govuk-table__header" scope="col">Date</th>
                        <th class="govuk-table__header" scope="col">
                            <span class="govuk-visually-hidden">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody class="govuk-table__body">
                    ${submissions.map(s => submissionRow(s)).join('')}
                </tbody>
            </table>
        </div>
    `;

    submissions.forEach(s => {
        document.getElementById(`sub-delete-${s.id}`)?.addEventListener('click', e => {
            e.preventDefault();
            showDeleteSubmissionConfirm(s);
        });
    });
}

function submissionRow(s) {
    const title = escapeHtml(s.title || '—');
    const raw = s.description || '';
    const description = escapeHtml(raw.length > 100 ? raw.slice(0, 100) + '…' : raw);
    const source = s.source_url
        ? `<a class="govuk-link" href="${escapeAttr(s.source_url)}" target="_blank" rel="noopener noreferrer">Link ↗</a>`
        : '—';
    const contact = escapeHtml(s.contact || '—');
    const date = s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-GB') : '—';

    return `
        <tr class="govuk-table__row" id="sub-row-${s.id}">
            <td class="govuk-table__cell admin-nowrap">${title}</td>
            <td class="govuk-table__cell">${description}</td>
            <td class="govuk-table__cell">${source}</td>
            <td class="govuk-table__cell admin-nowrap">${contact}</td>
            <td class="govuk-table__cell admin-nowrap">${date}</td>
            <td class="govuk-table__cell">
                <a class="govuk-link admin-link--danger" href="#" id="sub-delete-${s.id}">Dismiss<span class="govuk-visually-hidden"> submission: ${title}</span></a>
            </td>
        </tr>`;
}

function showDeleteSubmissionConfirm(submission) {
    const title = escapeHtml(submission.title || '—');
    const raw = submission.description || '';
    const description = escapeHtml(raw.length > 200 ? raw.slice(0, 200) + '…' : raw);

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">

                <a href="#" class="govuk-back-link" id="delete-back">Back to admin</a>
                <span class="govuk-caption-xl">Content management</span>
                <h1 class="govuk-heading-l">Dismiss submission</h1>

                <dl class="govuk-summary-list govuk-!-margin-bottom-6">
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Title</dt>
                        <dd class="govuk-summary-list__value">${title}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Description</dt>
                        <dd class="govuk-summary-list__value">${description}</dd>
                    </div>
                    ${submission.contact ? `
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Contact</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(submission.contact)}</dd>
                    </div>` : ''}
                </dl>

                <div id="delete-error"></div>

                <div class="govuk-button-group govuk-!-margin-top-4">
                    <button class="govuk-button govuk-button--warning" id="confirm-delete-btn">
                        Dismiss submission
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
        confirmBtn.textContent = 'Dismissing…';
        try {
            await deleteSubmission(submission.id);
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
            confirmBtn.textContent = 'Dismiss submission';
        }
    });
}

// ── Delete comment confirmation view ─────────────────────────────────────────

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

// ── Delete confirmation view ──────────────────────────────────────────────

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

    // ── Slug auto-generation (fields are in the details tab) ──────────────
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

        // Sync EasyMDE value into the textarea so FormData picks it up
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
            // Switch to the tab that contains the first failing field
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

// ── Banner ────────────────────────────────────────────────────────────────

function showBanner(type, message) {
    const el = document.getElementById('admin-banner');
    if (!el) return;
    if (type === 'error') {
        el.innerHTML = `
            <div class="govuk-error-summary" role="alert">
                <div>
                    <h2 class="govuk-error-summary__title">There is a problem</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(message)}</p>
                    </div>
                </div>
            </div>`;
    } else {
        el.innerHTML = `
            <div class="govuk-notification-banner govuk-notification-banner--success" role="alert"
                 aria-labelledby="admin-banner-title" data-module="govuk-notification-banner">
                <div class="govuk-notification-banner__header">
                    <h2 class="govuk-notification-banner__title" id="admin-banner-title">Success</h2>
                </div>
                <div class="govuk-notification-banner__content">
                    <p class="govuk-notification-banner__heading">${escapeHtml(message)}</p>
                </div>
            </div>`;
    }
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

function contentTypeLabel(article) {
    if (article.code_module) return 'Code module';
    if (article.md_content) return 'Markdown';
    if (article.html_content) return 'HTML';
    return '—';
}

// ── Users section ─────────────────────────────────────────────────────────────

function renderUsersSection(result) {
    const el = document.getElementById('admin-users-body');
    const users = result?.users ?? [];
    if (!users.length) {
        el.innerHTML = `<p class="govuk-body govuk-hint">No users found.</p>`;
        return;
    }
    const plural = users.length === 1 ? 'user' : 'users';
    el.innerHTML = `
        <p class="govuk-body govuk-hint govuk-!-margin-bottom-2">${users.length} ${plural}</p>
        <div class="table-scroll table-truncate">
            <table class="govuk-table govuk-!-margin-bottom-0">
                <caption class="govuk-table__caption govuk-visually-hidden">All users</caption>
                <thead class="govuk-table__head">
                    <tr class="govuk-table__row">
                        <th class="govuk-table__header" scope="col">Email</th>
                        <th class="govuk-table__header" scope="col">UID</th>
                        <th class="govuk-table__header" scope="col">Provider</th>
                        <th class="govuk-table__header" scope="col">Status</th>
                        <th class="govuk-table__header" scope="col">Created</th>
                        <th class="govuk-table__header" scope="col">
                            <span class="govuk-visually-hidden">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody class="govuk-table__body">
                    ${users.map(u => userRow(u)).join('')}
                </tbody>
            </table>
        </div>
    `;
    users.forEach(u => {
        document.getElementById(`view-user-${u.id}`)?.addEventListener('click', e => {
            e.preventDefault();
            go(`view-user=${u.id}`);
        });
    });
}

function userRow(u) {
    const email = escapeHtml(u.email || '—');
    const uid = escapeHtml(u.id.slice(0, 8) + '…');
    const provider = escapeHtml(u.app_metadata?.provider || '—');
    const date = u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—';
    const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
    const status = isBanned
        ? `<strong class="govuk-tag govuk-tag--red">Banned</strong>`
        : `<strong class="govuk-tag govuk-tag--green">Active</strong>`;
    return `
        <tr class="govuk-table__row">
            <td class="govuk-table__cell">${email}</td>
            <td class="govuk-table__cell admin-nowrap"><code class="admin-slug">${uid}</code></td>
            <td class="govuk-table__cell">${provider}</td>
            <td class="govuk-table__cell">${status}</td>
            <td class="govuk-table__cell admin-nowrap">${date}</td>
            <td class="govuk-table__cell">
                <a class="govuk-link govuk-link--no-visited-state" href="#" id="view-user-${u.id}">
                    View<span class="govuk-visually-hidden"> ${email}</span>
                </a>
            </td>
        </tr>`;
}

// ── User detail page ──────────────────────────────────────────────────────────

async function showUserDetail(userId) {
    updateContent(`
        <a href="#" class="govuk-back-link" id="user-back">Back to admin</a>
        <span class="govuk-caption-xl">User management</span>
        <h1 class="govuk-heading-l">User detail</h1>
        <p class="govuk-body govuk-hint">Loading…</p>
    `);
    document.getElementById('user-back')?.addEventListener('click', e => { e.preventDefault(); go(''); });

    let user;
    try {
        user = await getUserById(userId);
    } catch (err) {
        updateContent(`
            <a href="#" class="govuk-back-link" id="user-back">Back to admin</a>
            <span class="govuk-caption-xl">User management</span>
            <h1 class="govuk-heading-l">User detail</h1>
            <div class="govuk-error-summary" role="alert">
                <div>
                    <h2 class="govuk-error-summary__title">Could not load user</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(err.message)}</p>
                    </div>
                </div>
            </div>`);
        document.getElementById('user-back')?.addEventListener('click', e => { e.preventDefault(); go(''); });
        return;
    }

    const email = escapeHtml(user.email || '—');
    const isBanned = user.banned_until && new Date(user.banned_until) > new Date();
    const banFormatted = isBanned
        ? new Date(user.banned_until).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
        : '';
    const statusTag = isBanned
        ? `<strong class="govuk-tag govuk-tag--red">Banned</strong> <span class="govuk-body-s">until ${escapeHtml(banFormatted)}</span>`
        : `<strong class="govuk-tag govuk-tag--green">Active</strong>`;
    const providers = (user.app_metadata?.providers || [user.app_metadata?.provider])
        .filter(Boolean).map(escapeHtml).join(', ') || '—';
    const hasMfa = (user.factors?.length ?? 0) > 0;
    const fmt = iso => iso
        ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
        : '—';

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">
                <a href="#" class="govuk-back-link" id="user-back">Back to admin</a>
                <span class="govuk-caption-xl">User management</span>
                <h1 class="govuk-heading-l">${email}</h1>

                <dl class="govuk-summary-list">
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Email</dt>
                        <dd class="govuk-summary-list__value">${email}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">UUID</dt>
                        <dd class="govuk-summary-list__value"><code class="admin-slug">${escapeHtml(user.id)}</code></dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Status</dt>
                        <dd class="govuk-summary-list__value">${statusTag}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Provider(s)</dt>
                        <dd class="govuk-summary-list__value">${providers}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">MFA factors</dt>
                        <dd class="govuk-summary-list__value">${hasMfa ? escapeHtml(String(user.factors.length)) : 'None'}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Role</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(user.role || '—')}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Phone</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(user.phone || '—')}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Created</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(fmt(user.created_at))}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Last sign in</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(fmt(user.last_sign_in_at))}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Email confirmed</dt>
                        <dd class="govuk-summary-list__value">${user.email_confirmed_at ? escapeHtml(new Date(user.email_confirmed_at).toLocaleDateString('en-GB')) : 'No'}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Last updated</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(fmt(user.updated_at))}</dd>
                    </div>
                </dl>

                <h2 class="govuk-heading-m govuk-!-margin-top-6">Actions</h2>
                <div id="user-action-status" class="govuk-!-margin-bottom-4"></div>
                <div class="govuk-button-group">
                    ${isBanned
                        ? `<button class="govuk-button govuk-button--secondary" id="btn-unban">Unban</button>`
                        : `<button class="govuk-button govuk-button--secondary" id="btn-ban">Ban user</button>`
                    }
                    <button class="govuk-button govuk-button--secondary" id="btn-reset-pwd">Send password reset</button>
                    <button class="govuk-button govuk-button--secondary" id="btn-magic-link">Send magic link</button>
                    ${hasMfa ? `<button class="govuk-button govuk-button--secondary" id="btn-remove-mfa">Remove 2FA</button>` : ''}
                    <button class="govuk-button govuk-button--warning" id="btn-delete-user">Delete user</button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('user-back')?.addEventListener('click', e => { e.preventDefault(); go(''); });
    document.getElementById('btn-ban')?.addEventListener('click', () => go(`ban-user=${user.id}`));
    document.getElementById('btn-delete-user')?.addEventListener('click', () => go(`delete-user=${user.id}`));
    document.getElementById('btn-unban')?.addEventListener('click', () =>
        inlineUserAction('btn-unban', 'Unbanning…', () => unbanUser(user.id), 'User unbanned successfully.'));
    document.getElementById('btn-reset-pwd')?.addEventListener('click', () =>
        inlineUserAction('btn-reset-pwd', 'Sending…', () => sendPasswordResetEmail(user.email), 'Password reset email sent.'));
    document.getElementById('btn-magic-link')?.addEventListener('click', () =>
        inlineUserAction('btn-magic-link', 'Sending…', () => sendMagicLinkEmail(user.email), 'Magic link sent.'));
    document.getElementById('btn-remove-mfa')?.addEventListener('click', () =>
        inlineUserAction('btn-remove-mfa', 'Removing…', () => removeMfa(user.id), 'All 2FA methods removed.'));
}

function inlineUserAction(btnId, loadingText, action, successMessage) {
    const btn = document.getElementById(btnId);
    const statusEl = document.getElementById('user-action-status');
    if (!btn) return;
    const savedText = btn.textContent;
    btn.disabled = true;
    btn.textContent = loadingText;
    if (statusEl) statusEl.innerHTML = '';
    action()
        .then(() => {
            if (statusEl) statusEl.innerHTML = `
                <div class="govuk-notification-banner govuk-notification-banner--success" role="alert"
                     aria-labelledby="ua-success" data-module="govuk-notification-banner">
                    <div class="govuk-notification-banner__header">
                        <h2 class="govuk-notification-banner__title" id="ua-success">Success</h2>
                    </div>
                    <div class="govuk-notification-banner__content">
                        <p class="govuk-notification-banner__heading">${escapeHtml(successMessage)}</p>
                    </div>
                </div>`;
            btn.disabled = false;
            btn.textContent = savedText;
        })
        .catch(err => {
            if (statusEl) statusEl.innerHTML = `
                <div class="govuk-error-summary" role="alert">
                    <div>
                        <h2 class="govuk-error-summary__title">There is a problem</h2>
                        <div class="govuk-error-summary__body">
                            <p class="govuk-body">${escapeHtml(err.message)}</p>
                        </div>
                    </div>
                </div>`;
            btn.disabled = false;
            btn.textContent = savedText;
        });
}

// ── Ban user page ─────────────────────────────────────────────────────────────

async function showBanUserForm(userId) {
    updateContent(`
        <a href="#" class="govuk-back-link" id="ban-back">Back</a>
        <span class="govuk-caption-xl">User management</span>
        <h1 class="govuk-heading-l">Ban user</h1>
        <p class="govuk-body govuk-hint">Loading…</p>
    `);
    document.getElementById('ban-back')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });

    let user;
    try {
        user = await getUserById(userId);
    } catch (err) {
        updateContent(`
            <a href="#" class="govuk-back-link" id="ban-back">Back to user</a>
            <span class="govuk-caption-xl">User management</span>
            <h1 class="govuk-heading-l">Ban user</h1>
            <div class="govuk-error-summary" role="alert">
                <div>
                    <h2 class="govuk-error-summary__title">Could not load user</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(err.message)}</p>
                    </div>
                </div>
            </div>`);
        document.getElementById('ban-back')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });
        return;
    }

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">
                <a href="#" class="govuk-back-link" id="ban-back">Back to user</a>
                <span class="govuk-caption-xl">User management</span>
                <h1 class="govuk-heading-l">Ban user</h1>

                <dl class="govuk-summary-list govuk-!-margin-bottom-6">
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">User</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(user.email || userId)}</dd>
                    </div>
                </dl>

                <div class="govuk-warning-text">
                    <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
                    <strong class="govuk-warning-text__text">
                        <span class="govuk-warning-text__assistive">Warning</span>
                        The user will be unable to post comments for the duration of the ban.
                    </strong>
                </div>

                <div id="ban-error"></div>

                <form id="ban-form" novalidate>
                    <div class="govuk-form-group" id="ban-duration-group">
                        <label class="govuk-label govuk-label--s" for="ban-amount">Duration</label>
                        <div style="display:flex;gap:0.5rem;align-items:flex-start">
                            <input class="govuk-input govuk-input--width-5" type="number"
                                   id="ban-amount" name="ban-amount" min="1" value="24">
                            <select class="govuk-select" id="ban-unit" name="ban-unit">
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                            </select>
                        </div>
                        <p class="govuk-error-message" id="ban-amount-error" hidden>
                            <span class="govuk-visually-hidden">Error:</span>
                            <span id="ban-amount-error-text"></span>
                        </p>
                    </div>

                    <div class="govuk-button-group govuk-!-margin-top-4">
                        <button class="govuk-button govuk-button--warning" type="submit" id="ban-submit-btn">
                            Ban user
                        </button>
                        <a class="govuk-link" href="#" id="ban-cancel">Cancel</a>
                    </div>
                </form>
            </div>
        </div>
    `);

    document.getElementById('ban-back')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });
    document.getElementById('ban-cancel')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });

    document.getElementById('ban-form').addEventListener('submit', async e => {
        e.preventDefault();
        const amount = Number(document.getElementById('ban-amount').value);
        const unit = document.getElementById('ban-unit').value;
        const errorEl = document.getElementById('ban-amount-error');
        const errorText = document.getElementById('ban-amount-error-text');
        const group = document.getElementById('ban-duration-group');

        group.classList.remove('govuk-form-group--error');
        errorEl.hidden = true;

        if (!amount || amount < 1 || !Number.isFinite(amount)) {
            group.classList.add('govuk-form-group--error');
            errorText.textContent = 'Enter a duration of at least 1.';
            errorEl.hidden = false;
            document.getElementById('ban-amount')?.focus();
            return;
        }

        const hours = unit === 'days' ? amount * 24 : amount;
        const submitBtn = document.getElementById('ban-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Banning…';

        try {
            await banUser(userId, hours);
            go(`view-user=${userId}`);
        } catch (err) {
            document.getElementById('ban-error').innerHTML = `
                <div class="govuk-error-summary" role="alert">
                    <div>
                        <h2 class="govuk-error-summary__title">There is a problem</h2>
                        <div class="govuk-error-summary__body">
                            <p class="govuk-body">${escapeHtml(err.message)}</p>
                        </div>
                    </div>
                </div>`;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Ban user';
        }
    });
}

// ── Delete user confirmation page ─────────────────────────────────────────────

async function showDeleteUserConfirm(userId) {
    updateContent(`
        <a href="#" class="govuk-back-link" id="delete-back">Back</a>
        <span class="govuk-caption-xl">User management</span>
        <h1 class="govuk-heading-l">Delete user</h1>
        <p class="govuk-body govuk-hint">Loading…</p>
    `);
    document.getElementById('delete-back')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });

    let user;
    try {
        user = await getUserById(userId);
    } catch (err) {
        updateContent(`
            <a href="#" class="govuk-back-link" id="delete-back">Back to user</a>
            <span class="govuk-caption-xl">User management</span>
            <h1 class="govuk-heading-l">Delete user</h1>
            <div class="govuk-error-summary" role="alert">
                <div>
                    <h2 class="govuk-error-summary__title">Could not load user</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(err.message)}</p>
                    </div>
                </div>
            </div>`);
        document.getElementById('delete-back')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });
        return;
    }

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">
                <a href="#" class="govuk-back-link" id="delete-back">Back to user</a>
                <span class="govuk-caption-xl">User management</span>
                <h1 class="govuk-heading-l">Delete user</h1>

                <dl class="govuk-summary-list govuk-!-margin-bottom-6">
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Email</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(user.email || '—')}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">UUID</dt>
                        <dd class="govuk-summary-list__value"><code class="admin-slug">${escapeHtml(user.id)}</code></dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Created</dt>
                        <dd class="govuk-summary-list__value">${user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : '—'}</dd>
                    </div>
                </dl>

                <div class="govuk-warning-text">
                    <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
                    <strong class="govuk-warning-text__text">
                        <span class="govuk-warning-text__assistive">Warning</span>
                        This user account will be permanently deleted and cannot be recovered.
                    </strong>
                </div>

                <div id="delete-error"></div>

                <div class="govuk-button-group govuk-!-margin-top-4">
                    <button class="govuk-button govuk-button--warning" id="confirm-delete-btn">
                        Delete user
                    </button>
                    <a class="govuk-link" href="#" id="cancel-delete-btn">Cancel</a>
                </div>
            </div>
        </div>
    `);

    document.getElementById('delete-back')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });
    document.getElementById('cancel-delete-btn')?.addEventListener('click', e => { e.preventDefault(); go(`view-user=${userId}`); });

    const confirmBtn = document.getElementById('confirm-delete-btn');
    confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deleting…';
        try {
            await adminDeleteUser(userId);
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
            confirmBtn.textContent = 'Delete user';
        }
    });
}

