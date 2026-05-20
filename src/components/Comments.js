// src/components/Comments.js
//
// Entry point: renderEngagementSection(articleId, containerEl)
//
// Layout order: vote widget → "Comments (N)" → submit form → comment list.
// Features: post, edit, delete (with inline confirmation), and threaded replies.
// All list interactions use event delegation on a single listener.

import './comments.css';
import { profanity } from '@2toad/profanity';
import { navigate } from '../router.js';
import { getCurrentUser } from '../lib/auth.js';
import { escapeHtml, escapeAttr } from '../lib/escape.js';
import { logger } from '../lib/logger.js';
import {
    getComments, postComment, editComment, deleteComment,
    getVoteScore, getUserVote, castVote,
} from '../data/comments.js';

const MAX_CHARS = 500;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(isoString) {
    const d = new Date(isoString);
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${time} on ${date}`;
}

/** Converts a flat comment array into a tree of { ...comment, replies: [] } nodes. */
function buildCommentTree(comments) {
    const map = {};
    const roots = [];
    comments.forEach(c => (map[c.id] = { ...c, replies: [] }));
    comments.forEach(c => {
        const node = map[c.id];
        if (c.parent_id && map[c.parent_id]) map[c.parent_id].replies.push(node);
        else roots.push(node);
    });
    return roots;
}

function getDisplayName(user) {
    return (
        user?.user_metadata?.display_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        'Anonymous'
    );
}

// ── HTML builders ─────────────────────────────────────────────────────────────

/** A single comment node including nested replies and action buttons for the owner. */
function buildComment(comment, depth, currentUserId) {
    const id = escapeHtml(comment.id);
    const name = escapeHtml(comment.display_name || 'Anonymous');
    const timeStr = escapeHtml(formatDateTime(comment.created_at));
    const content = escapeHtml(comment.content || '');
    const isOwn = currentUserId && comment.user_id === currentUserId;

    const ownActions = isOwn ? `
        <span class="comment__action-sep" aria-hidden="true">·</span>
        <button type="button" class="comment__reply-btn comment__edit-btn"
                data-comment-id="${id}">Edit</button>
        <span class="comment__action-sep" aria-hidden="true">·</span>
        <button type="button" class="comment__reply-btn comment__delete-btn"
                data-comment-id="${id}">Delete</button>` : '';

    const repliesHtml = (comment.replies || [])
        .map(r => buildComment(r, depth + 1, currentUserId))
        .join('');

    return `
        <div class="comment${depth > 0 ? ' comment--reply' : ''}"
             id="comment-${id}"
             data-comment-id="${id}"
             data-content="${escapeAttr(comment.content || '')}">

            <p class="govuk-body-s govuk-!-colour-secondary govuk-!-margin-bottom-1">
                <strong style="color:#0b0c0c">${name}</strong>
                at
                <time datetime="${escapeAttr(comment.created_at)}">${timeStr}</time>
            </p>

            <p class="govuk-body govuk-!-margin-bottom-2 comment__content">${content}</p>

            <div class="comment__actions">
                <button type="button" class="comment__reply-btn"
                        data-parent-id="${id}"
                        data-parent-author="${name}">Reply</button>
                ${ownActions}
            </div>

            <div class="comment__edit-slot govuk-!-margin-top-3" hidden></div>
            <div class="comment__delete-confirm govuk-!-margin-top-3" hidden></div>
            <div class="comment__reply-slot govuk-!-margin-top-3" data-slot="${id}" hidden></div>

            ${repliesHtml}
        </div>`;
}

/**
 * The comment / reply submission form.
 * parentId = null  →  main form (shown above the list)
 * parentId set     →  reply form (injected inline)
 */
function buildCommentForm(user, { parentId = null, parentAuthor = '' } = {}) {
    const name = escapeHtml(getDisplayName(user));
    const isReply = parentId !== null;
    const pid = isReply ? escapeHtml(parentId) : '';
    const sfx = pid ? `-${pid}` : '';
    const fieldId = `comment-text${sfx}`;
    const groupId = `comment-group${sfx}`;
    const errorId = `comment-error${sfx}`;
    const sumId = `comment-summary${sfx}`;
    const sumList = `comment-summary-list${sfx}`;

    const byline = isReply
        ? `Replying to <strong>${escapeHtml(parentAuthor)}</strong> as <strong>${name}</strong>`
        : `Commenting as: <strong>${name}</strong>`;

    return `
        <form class="comment-form" novalidate data-parent-id="${pid}">

            <p class="govuk-hint comment-form__byline govuk-!-margin-bottom-3">${byline}</p>

            <div class="govuk-error-summary" data-module="govuk-error-summary"
                 id="${sumId}" hidden role="alert" tabindex="-1">
                <div>
                    <h2 class="govuk-error-summary__title">There is a problem</h2>
                    <div class="govuk-error-summary__body">
                        <ul class="govuk-list govuk-error-summary__list" id="${sumList}"></ul>
                    </div>
                </div>
            </div>

            <div class="govuk-form-group" id="${groupId}">
                <label class="govuk-label govuk-visually-hidden" for="${fieldId}">
                    ${isReply ? `Reply to ${escapeHtml(parentAuthor)}` : 'Your comment'}
                </label>
                <textarea
                    class="govuk-textarea"
                    id="${fieldId}"
                    name="content"
                    rows="4"
                    maxlength="${MAX_CHARS}"
                    placeholder="${isReply ? `Replying to ${escapeHtml(parentAuthor)}…` : ''}"
                    aria-describedby="${errorId}"
                ></textarea>
                <p class="govuk-error-message" id="${errorId}" hidden>
                    <span class="govuk-visually-hidden">Error:</span>
                    <span class="comment-form__error-text"></span>
                </p>
                <div class="govuk-hint comment-form__counter" aria-live="polite">
                    <span class="comment-form__counter-current">0</span>/${MAX_CHARS}
                </div>
            </div>

            <div class="govuk-button-group govuk-!-margin-bottom-0">
                <button class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" type="submit">
                    ${isReply ? 'Post reply' : 'Send'}
                </button>
                ${isReply ? `<a class="govuk-link comment-form__cancel" href="#">Cancel</a>` : ''}
            </div>

        </form>`;
}

/** Inline edit form pre-filled with the comment's current content. */
function buildEditForm(commentId, existingContent) {
    const id = escapeHtml(commentId);
    const len = existingContent.length;

    return `
        <div class="govuk-form-group" id="edit-group-${id}">
            <label class="govuk-visually-hidden" for="edit-text-${id}">Edit your comment</label>
            <textarea class="govuk-textarea" id="edit-text-${id}" rows="4"
                      maxlength="${MAX_CHARS}">${escapeHtml(existingContent)}</textarea>
            <p class="govuk-error-message" id="edit-error-${id}" hidden>
                <span class="govuk-visually-hidden">Error:</span>
                <span class="comment-form__error-text"></span>
            </p>
            <div class="govuk-hint comment-form__counter" aria-live="polite">
                <span class="comment-form__counter-current">${len}</span>/${MAX_CHARS}
            </div>
        </div>
        <div class="govuk-button-group govuk-!-margin-bottom-0">
            <button type="button"
                    class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0 comment__save-btn"
                    data-comment-id="${id}">Save changes</button>
            <button type="button" class="comment__reply-btn comment__cancel-edit-btn">Cancel</button>
        </div>`;
}

/** GOV.UK warning confirmation injected before a destructive delete. */
function buildDeleteConfirm() {
    return `
        <div class="govuk-warning-text govuk-!-margin-bottom-2">
            <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
            <strong class="govuk-warning-text__text">
                <span class="govuk-warning-text__assistive">Warning</span>
                Delete this comment? This cannot be undone and will also remove any replies.
            </strong>
        </div>
        <div class="govuk-button-group govuk-!-margin-bottom-0">
            <button type="button"
                    class="govuk-button govuk-button--warning govuk-!-margin-bottom-0 comment__confirm-delete-btn">
                Delete comment
            </button>
            <button type="button" class="comment__reply-btn comment__cancel-delete-btn">Cancel</button>
        </div>`;
}

// ── Vote widget — GOV.UK "Did you like this article?" pattern ─────────────────

function buildVotePrompt(score) {
    const countHtml = score !== 0
        ? `<span class="page-useful-bar__count govuk-hint govuk-!-margin-bottom-0">${score > 0 ? '+' : ''}${score} votes</span>`
        : '';
    return `
        <div class="page-useful-bar">
            <div class="page-useful-bar__prompt">
                <h2 class="page-useful-bar__question govuk-body govuk-!-margin-bottom-0">Did you like this article?</h2>
                <ul class="page-useful-bar__options">
                    <li class="page-useful-bar__option">
                        <a class="govuk-link govuk-!-margin-bottom-0" data-vote="1" style="cursor: pointer;">
                            Yes <span class="govuk-visually-hidden">you liked this article</span>
                        </a>
                    </li>
                    <li class="page-useful-bar__option">
                        <a class="govuk-link govuk-!-margin-bottom-0" data-vote="-1" style="cursor: pointer;">
                            No <span class="govuk-visually-hidden">you did not like this article</span>
                        </a>
                    </li>
                </ul>
                ${countHtml}
            </div>
            <div class="page-useful-bar__problem">
                <a class="govuk-link" href="/request">Report a problem with this page</a>
            </div>
        </div>`;
}

function buildVotedBanner(score) {
    const countHtml = score !== 0
        ? `<span class="page-useful-bar__count govuk-hint govuk-!-margin-bottom-0 govuk-!-margin-left-3">${score > 0 ? '+' : ''}${score} votes</span>`
        : '';
    return `
        <div class="page-useful-bar page-useful-bar--success">
            <div class="page-useful-bar__prompt">
                <p class="govuk-body govuk-!-margin-bottom-0" role="alert">Thank you for your feedback</p>
                ${countHtml}
            </div>
            <a class="govuk-link" href="#" data-change-vote>Change your answer</a>
        </div>`;
}

function buildVoteWidget(score, userVote) {
    return (userVote !== null && userVote !== undefined)
        ? buildVotedBanner(score)
        : buildVotePrompt(score);
}

// ── Vote widget mount ─────────────────────────────────────────────────────────

function mountVoteWidget(container, { articleId, initialScore, initialUserVote }) {
    let score = initialScore;
    let userVote = initialUserVote;

    const render = () => {
        container.innerHTML = buildVoteWidget(score, userVote);
        container.querySelectorAll('[data-vote]').forEach(btn => {
            btn.addEventListener('click', () => handleVote(Number(btn.dataset.vote)));
        });
        container.querySelector('[data-change-vote]')?.addEventListener('click', async e => {
            e.preventDefault();
            const previousVote = userVote;
            score -= previousVote ?? 0;
            userVote = null;
            render();
            try {
                await castVote(articleId, null);
            } catch (err) {
                score += previousVote ?? 0;
                userVote = previousVote;
                render();
                logger.error('[votes] change vote failed', err);
            }
        });
    };

    const handleVote = async (targetVote) => {
        const user = await getCurrentUser().catch(() => null);
        if (!user) { navigate('/login'); return; }

        const newVote = userVote === targetVote ? null : targetVote;
        const delta = (newVote ?? 0) - (userVote ?? 0);

        score += delta;
        userVote = newVote;
        render();

        try {
            await castVote(articleId, newVote);
        } catch (err) {
            score -= delta;
            userVote = targetVote;
            render();
            logger.error('[votes] cast vote failed', err);
        }
    };

    render();
}

// ── Comment form mount ────────────────────────────────────────────────────────

/**
 * Wires character counting, validation, and submission for any .comment-form.
 * Works for both the main form and injected reply forms.
 */
function mountCommentForm(formEl, { articleId, parentId, displayName, onSuccess }) {
    if (!formEl) return;
    const pid = parentId || null;
    const sfx = pid ? `-${pid}` : '';
    const textarea = formEl.querySelector('textarea');
    const group = formEl.querySelector(`#comment-group${sfx}`);
    const errorEl = formEl.querySelector(`#comment-error${sfx}`);
    const errorText = formEl.querySelector('.comment-form__error-text');
    const counterEl = formEl.querySelector('.comment-form__counter-current');
    const counterBox = formEl.querySelector('.comment-form__counter');
    const summary = formEl.querySelector(`#comment-summary${sfx}`);
    const sumList = formEl.querySelector(`#comment-summary-list${sfx}`);
    const submitBtn = formEl.querySelector('[type="submit"]');

    textarea?.addEventListener('input', () => {
        const len = textarea.value.length;
        if (counterEl) counterEl.textContent = len;
        counterBox?.classList.toggle('comment-form__counter--over', len >= MAX_CHARS);
        textarea.classList.toggle('govuk-textarea--error', len > MAX_CHARS);
    });

    const clearError = () => {
        group?.classList.remove('govuk-form-group--error');
        textarea?.classList.remove('govuk-textarea--error');
        if (errorEl) errorEl.hidden = true;
        if (summary) summary.hidden = true;
        if (sumList) sumList.innerHTML = '';
    };

    const showError = (msg) => {
        group?.classList.add('govuk-form-group--error');
        textarea?.classList.add('govuk-textarea--error');
        if (errorText) errorText.textContent = msg;
        if (errorEl) errorEl.hidden = false;
        if (sumList) sumList.innerHTML = `<li><a href="#comment-text${sfx}">${escapeHtml(msg)}</a></li>`;
        if (summary) { summary.hidden = false; summary.focus(); }
    };

    formEl.addEventListener('submit', async e => {
        e.preventDefault();
        clearError();
        const content = textarea?.value?.trim() ?? '';
        if (!content) { showError('Enter a comment before sending.'); textarea?.focus(); return; }
        if (content.length > MAX_CHARS) { showError(`Comments must be ${MAX_CHARS} characters or fewer.`); return; }

        if (profanity.exists(content)) {
            showError('Your comment contains inappropriate language. Please revise it before sending.');
            textarea?.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';

        try {
            const freshUser = await getCurrentUser();
            if (freshUser?.banned_until) {
                const banUntil = new Date(freshUser.banned_until);
                if (banUntil > new Date()) {
                    const formatted = banUntil.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
                    showError(`You are banned until ${formatted}.`);
                    submitBtn.disabled = false;
                    submitBtn.textContent = pid ? 'Post reply' : 'Send';
                    return;
                }
            }
        } catch {
            // if the fresh user check fails, let Supabase RLS enforce it server-side
        }

        try {
            await postComment({ articleId, content, parentId: pid, displayName });
            onSuccess();
        } catch (err) {
            logger.error('[comments] post failed', err);
            showError('Could not post your comment. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = pid ? 'Post reply' : 'Send';
        }
    });
}

// ── List interactions (event delegation) ─────────────────────────────────────

function initListInteractions(listEl, { user, articleId, displayName, onSuccess }) {
    listEl.addEventListener('input', e => {
        if (e.target.tagName !== 'TEXTAREA') return;
        const form = e.target.closest('.comment-form, .comment__edit-slot');
        const counter = form?.querySelector('.comment-form__counter-current');
        const box = form?.querySelector('.comment-form__counter');
        const len = e.target.value.length;
        if (counter) counter.textContent = len;
        box?.classList.toggle('comment-form__counter--over', len >= MAX_CHARS);
        e.target.classList.toggle('govuk-textarea--error', len > MAX_CHARS);
    });

    // Safety net — reply form submit is handled by mountCommentForm
    listEl.addEventListener('submit', e => {
        if (e.target.matches('.comment-form')) e.preventDefault();
    });

    listEl.addEventListener('click', e => {
        const btn = e.target.closest('button, a');
        if (!btn) return;

        // ── Reply ──
        if (btn.classList.contains('comment__reply-btn') &&
            btn.dataset.parentId &&
            !btn.classList.contains('comment__edit-btn') &&
            !btn.classList.contains('comment__delete-btn') &&
            !btn.classList.contains('comment__cancel-edit-btn') &&
            !btn.classList.contains('comment__cancel-delete-btn')) {

            if (!user) { navigate('/login'); return; }

            const parentId = btn.dataset.parentId;
            const parentAuthor = btn.dataset.parentAuthor || '';
            const slot = listEl.querySelector(`.comment__reply-slot[data-slot="${parentId}"]`);
            if (!slot) return;

            if (!slot.hidden) { slot.hidden = true; slot.innerHTML = ''; return; }

            listEl.querySelectorAll('.comment__reply-slot').forEach(s => { s.hidden = true; s.innerHTML = ''; });
            slot.hidden = false;
            slot.innerHTML = buildCommentForm(user, { parentId, parentAuthor });
            mountCommentForm(slot.querySelector('.comment-form'), { articleId, parentId, displayName, onSuccess });
            slot.querySelector('textarea')?.focus();
            return;
        }

        // ── Cancel reply ──
        if (btn.classList.contains('comment-form__cancel')) {
            e.preventDefault();
            const slot = btn.closest('.comment__reply-slot');
            if (slot) { slot.hidden = true; slot.innerHTML = ''; }
            return;
        }

        // ── Edit ──
        if (btn.classList.contains('comment__edit-btn')) {
            const commentEl = listEl.querySelector(`#comment-${btn.dataset.commentId}`);
            if (!commentEl) return;
            const contentEl = commentEl.querySelector('.comment__content');
            const actionsEl = commentEl.querySelector('.comment__actions');
            const editSlot = commentEl.querySelector('.comment__edit-slot');
            const replySlot = commentEl.querySelector('.comment__reply-slot');
            if (replySlot) { replySlot.hidden = true; replySlot.innerHTML = ''; }
            contentEl.hidden = true;
            actionsEl.hidden = true;
            editSlot.innerHTML = buildEditForm(btn.dataset.commentId, commentEl.dataset.content || '');
            editSlot.hidden = false;
            editSlot.querySelector('textarea')?.focus();
            return;
        }

        // ── Cancel edit ──
        if (btn.classList.contains('comment__cancel-edit-btn')) {
            const commentEl = btn.closest('.comment');
            if (!commentEl) return;
            commentEl.querySelector('.comment__content').hidden = false;
            commentEl.querySelector('.comment__actions').hidden = false;
            const editSlot = commentEl.querySelector('.comment__edit-slot');
            editSlot.hidden = true;
            editSlot.innerHTML = '';
            return;
        }

        // ── Save edit ──
        if (btn.classList.contains('comment__save-btn')) {
            const editSlot = btn.closest('.comment__edit-slot');
            const textarea = editSlot?.querySelector('textarea');
            const errorEl = editSlot?.querySelector('.govuk-error-message');
            const errorText = editSlot?.querySelector('.comment-form__error-text');
            const group = editSlot?.querySelector('.govuk-form-group');
            const content = textarea?.value?.trim() ?? '';

            const showErr = msg => {
                group?.classList.add('govuk-form-group--error');
                textarea?.classList.add('govuk-textarea--error');
                if (errorText) errorText.textContent = msg;
                if (errorEl) errorEl.hidden = false;
            };

            if (!content) { showErr('Enter some text before saving.'); textarea?.focus(); return; }
            if (content.length > MAX_CHARS) { showErr(`Comments must be ${MAX_CHARS} characters or fewer.`); return; }

            btn.disabled = true;
            btn.textContent = 'Saving…';
            editComment(btn.dataset.commentId, content)
                .then(() => onSuccess())
                .catch(err => {
                    logger.error('[comments] edit failed', err);
                    showErr('Could not save. Please try again.');
                    btn.disabled = false;
                    btn.textContent = 'Save changes';
                });
            return;
        }

        // ── Delete (show confirmation) ──
        if (btn.classList.contains('comment__delete-btn')) {
            const commentEl = listEl.querySelector(`#comment-${btn.dataset.commentId}`);
            if (!commentEl) return;
            const actionsEl = commentEl.querySelector('.comment__actions');
            const confirmEl = commentEl.querySelector('.comment__delete-confirm');
            actionsEl.hidden = true;
            confirmEl.innerHTML = buildDeleteConfirm();
            confirmEl.hidden = false;
            confirmEl.querySelector('.comment__confirm-delete-btn')?.focus();
            return;
        }

        // ── Confirm delete ──
        if (btn.classList.contains('comment__confirm-delete-btn')) {
            const commentEl = btn.closest('.comment');
            if (!commentEl) return;
            btn.disabled = true;
            btn.textContent = 'Deleting…';
            deleteComment(commentEl.dataset.commentId)
                .then(() => onSuccess())
                .catch(err => {
                    logger.error('[comments] delete failed', err);
                    btn.disabled = false;
                    btn.textContent = 'Delete comment';
                });
            return;
        }

        // ── Cancel delete ──
        if (btn.classList.contains('comment__cancel-delete-btn')) {
            const commentEl = btn.closest('.comment');
            if (!commentEl) return;
            commentEl.querySelector('.comment__actions').hidden = false;
            const confirmEl = commentEl.querySelector('.comment__delete-confirm');
            confirmEl.hidden = true;
            confirmEl.innerHTML = '';
        }
    });
}

// ── Data loaders ──────────────────────────────────────────────────────────────

async function loadVotes(articleId) {
    const container = document.getElementById('vote-container');
    if (!container) return;
    try {
        const [score, userVote] = await Promise.all([getVoteScore(articleId), getUserVote(articleId)]);
        mountVoteWidget(container, { articleId, initialScore: score, initialUserVote: userVote });
    } catch (err) {
        logger.error('[votes] load failed', err);
        container.innerHTML = '';
    }
}

async function loadComments(articleId) {
    const formWrap = document.getElementById('comment-form-container');
    const listEl = document.getElementById('comments-list');
    const heading = document.getElementById('comments-heading');
    if (!listEl) return;

    let user = null, comments = [];
    try {
        [user, comments] = await Promise.all([
            getCurrentUser().catch(() => null),
            getComments(articleId),
        ]);
    } catch (err) {
        logger.error('[comments] load failed', err);
        listEl.innerHTML = `<p class="govuk-body-s govuk-!-colour-secondary">Could not load comments.</p>`;
        return;
    }

    if (heading) heading.textContent = `Comments (${comments.length})`;

    const currentUserId = user?.id ?? null;
    const displayName = user ? getDisplayName(user) : '';
    const onSuccess = () => loadComments(articleId);

    if (formWrap) {
        if (user) {
            formWrap.innerHTML = buildCommentForm(user);
            mountCommentForm(formWrap.querySelector('.comment-form'), { articleId, parentId: null, displayName, onSuccess });
        } else {
            formWrap.innerHTML = `
                <div class="govuk-inset-text govuk-!-margin-bottom-6">
                    <p class="govuk-body govuk-!-margin-bottom-0">
                        <a class="govuk-link" href="/login">Sign in</a> to leave a comment.
                    </p>
                </div>`;
        }
    }

    const tree = buildCommentTree(comments);
    if (tree.length) {
        listEl.innerHTML = `<div class="comments-list">${tree.map(c => buildComment(c, 0, currentUserId)).join('')}</div>`;
    } else {
        listEl.innerHTML = `<p class="govuk-body govuk-!-colour-secondary govuk-!-margin-bottom-0">No comments yet. Be the first to comment.</p>`;
    }

    if (user) initListInteractions(listEl, { user, articleId, displayName, onSuccess });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Renders the engagement section (votes + comments) into containerEl.
 * Skeleton placeholders appear immediately; data loads asynchronously.
 */
export async function renderEngagementSection(articleId, containerEl) {
    containerEl.innerHTML = `
        <div class="engagement-band engagement-band--vote">
            <div class="govuk-width-container">
                <div id="vote-container"></div>
            </div>
        </div>
        <div class="engagement-band engagement-band--comments">
            <div class="govuk-width-container">
                <h2 class="govuk-heading-m govuk-!-margin-top-6" id="comments-heading">Comments</h2>
                <div id="comment-form-container" class="govuk-!-margin-bottom-6">
                    <div class="comment-form-skeleton" aria-hidden="true">
                        <div class="skeleton-line skeleton-line--short govuk-!-margin-bottom-3"></div>
                        <div class="skeleton-textarea govuk-!-margin-bottom-2"></div>
                        <div class="skeleton-line skeleton-line--shorter"></div>
                    </div>
                </div>
                <div id="comments-list" class="govuk-!-padding-bottom-8"></div>
            </div>
        </div>`;

    loadVotes(articleId);
    loadComments(articleId);
}
