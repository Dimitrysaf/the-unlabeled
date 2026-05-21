// src/pages/admin/submissions.js
import { escapeHtml, escapeAttr } from '../../lib/escape.js';
import { updateContent } from '../../components/Layout.js';
import { getAllSubmissions, dismissSubmission, deleteSubmission } from '../../data/submissions.js';
import { go } from './utils.js';

const CATEGORY_LABELS = {
    greece_scandals: "Greece's Scandals",
    general: 'General Request',
};

export async function loadSubmissionsSection() {
    try {
        renderSubmissionsSection(await getAllSubmissions());
    } catch (err) {
        const el = document.getElementById('admin-submissions-body');
        if (el) el.innerHTML = `
            <div class="govuk-error-summary" data-module="govuk-error-summary">
                <div role="alert">
                    <h2 class="govuk-error-summary__title">Could not load submissions</h2>
                    <div class="govuk-error-summary__body">
                        <p class="govuk-body">${escapeHtml(err.message)}</p>
                    </div>
                </div>
            </div>`;
    }
}

export function renderSubmissionsSection(submissions) {
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
                        <th class="govuk-table__header col-important" scope="col">Title</th>
                        <th class="govuk-table__header" scope="col">Category</th>
                        <th class="govuk-table__header col-important" scope="col">Status</th>
                        <th class="govuk-table__header" scope="col">Description</th>
                        <th class="govuk-table__header" scope="col">Source</th>
                        <th class="govuk-table__header" scope="col">Contact</th>
                        <th class="govuk-table__header" scope="col">Date</th>
                        <th class="govuk-table__header col-important" scope="col">Actions</th>
                    </tr>
                </thead>
                <tbody class="govuk-table__body">
                    ${submissions.map(s => submissionRow(s)).join('')}
                </tbody>
            </table>
        </div>
    `;

    submissions.forEach(s => {
        document.getElementById(`sub-view-${s.id}`)?.addEventListener('click', e => {
            e.preventDefault();
            showSubmissionDetail(s);
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
    const category = escapeHtml(CATEGORY_LABELS[s.category] ?? s.category ?? '—');
    const statusTag = s.dismissed
        ? `<strong class="govuk-tag govuk-tag--grey">Dismissed</strong>`
        : `<strong class="govuk-tag govuk-tag--green">Active</strong>`;

    return `
        <tr class="govuk-table__row" id="sub-row-${s.id}" ${s.dismissed ? 'style="opacity:0.6"' : ''}>
            <td class="govuk-table__cell admin-nowrap col-important">${title}</td>
            <td class="govuk-table__cell admin-nowrap">${category}</td>
            <td class="govuk-table__cell admin-nowrap col-important">${statusTag}</td>
            <td class="govuk-table__cell">${description}</td>
            <td class="govuk-table__cell">${source}</td>
            <td class="govuk-table__cell admin-nowrap">${contact}</td>
            <td class="govuk-table__cell admin-nowrap">${date}</td>
            <td class="govuk-table__cell col-important">
                <a class="govuk-link" href="#" id="sub-view-${s.id}">View<span class="govuk-visually-hidden"> submission: ${title}</span></a>
            </td>
        </tr>`;
}

function showSubmissionDetail(submission) {
    const title = escapeHtml(submission.title || '—');
    const description = escapeHtml(submission.description || '—').replace(/\n/g, '<br>');
    const category = escapeHtml(CATEGORY_LABELS[submission.category] ?? submission.category ?? '—');
    const date = submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('en-GB') : '—';

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">

                <a href="#" class="govuk-back-link" id="view-back">Back to admin</a>
                <span class="govuk-caption-xl">Submissions</span>
                <h1 class="govuk-heading-l">${title}</h1>

                <dl class="govuk-summary-list govuk-!-margin-bottom-6">
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Category</dt>
                        <dd class="govuk-summary-list__value">${category}</dd>
                    </div>
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Description</dt>
                        <dd class="govuk-summary-list__value">${description}</dd>
                    </div>
                    ${submission.source_url ? `
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Source</dt>
                        <dd class="govuk-summary-list__value">
                            <a class="govuk-link" href="${escapeAttr(submission.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(submission.source_url)}</a>
                        </dd>
                    </div>` : ''}
                    ${submission.contact ? `
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Contact</dt>
                        <dd class="govuk-summary-list__value">${escapeHtml(submission.contact)}</dd>
                    </div>` : ''}
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">Submitted</dt>
                        <dd class="govuk-summary-list__value">${date}</dd>
                    </div>
                </dl>

                <div class="govuk-button-group">
                    ${!submission.dismissed ? `<button class="govuk-button govuk-button--secondary" id="view-dismiss-btn">Dismiss</button>` : ''}
                    <button class="govuk-button govuk-button--warning" id="view-delete-btn">Delete (spam)</button>
                    <a class="govuk-link" href="#" id="view-back-link">Back to admin</a>
                </div>

            </div>
        </div>
    `);

    document.getElementById('view-back').addEventListener('click', e => { e.preventDefault(); go(''); });
    document.getElementById('view-back-link').addEventListener('click', e => { e.preventDefault(); go(''); });
    document.getElementById('view-dismiss-btn')?.addEventListener('click', () => {
        showDismissConfirm(submission);
    });
    document.getElementById('view-delete-btn').addEventListener('click', () => {
        showDeleteSubmissionConfirm(submission);
    });
}

function showDismissConfirm(submission) {
    const title = escapeHtml(submission.title || '—');

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">
                <a href="#" class="govuk-back-link" id="dismiss-back">Back</a>
                <span class="govuk-caption-xl">Content management</span>
                <h1 class="govuk-heading-l">Dismiss submission</h1>
                <p class="govuk-body">Mark <strong>${title}</strong> as dismissed. It will remain in the database but move to the bottom of the list.</p>
                <div id="dismiss-error"></div>
                <div class="govuk-button-group govuk-!-margin-top-4">
                    <button class="govuk-button govuk-button--secondary" id="confirm-dismiss-btn">Confirm dismiss</button>
                    <a class="govuk-link" href="#" id="cancel-dismiss-btn">Cancel</a>
                </div>
            </div>
        </div>
    `);

    document.getElementById('dismiss-back').addEventListener('click', e => { e.preventDefault(); showSubmissionDetail(submission); });
    document.getElementById('cancel-dismiss-btn').addEventListener('click', e => { e.preventDefault(); showSubmissionDetail(submission); });

    const confirmBtn = document.getElementById('confirm-dismiss-btn');
    confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Dismissing…';
        try {
            await dismissSubmission(submission.id);
            go('');
        } catch (err) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm dismiss';
            document.getElementById('dismiss-error').innerHTML = `
                <div class="govuk-error-summary" role="alert">
                    <div>
                        <h2 class="govuk-error-summary__title">There is a problem</h2>
                        <div class="govuk-error-summary__body">
                            <p class="govuk-body">${escapeHtml(err.message)}</p>
                        </div>
                    </div>
                </div>`;
        }
    });
}

function showDeleteSubmissionConfirm(submission) {
    const title = escapeHtml(submission.title || '—');
    const raw = submission.description || '';
    const description = escapeHtml(raw.length > 200 ? raw.slice(0, 200) + '…' : raw);

    updateContent(`
        <div class="govuk-grid-row">
            <div class="govuk-grid-column-two-thirds">

                <a href="#" class="govuk-back-link" id="delete-back">Back</a>
                <span class="govuk-caption-xl">Content management</span>
                <h1 class="govuk-heading-l">Delete submission</h1>
                <p class="govuk-body">This will permanently delete the submission. Use this for spam only.</p>

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
                        Delete permanently
                    </button>
                    <a class="govuk-link" href="#" id="cancel-delete-btn">Cancel</a>
                </div>

            </div>
        </div>
    `);

    document.getElementById('delete-back').addEventListener('click', e => { e.preventDefault(); showSubmissionDetail(submission); });
    document.getElementById('cancel-delete-btn').addEventListener('click', e => { e.preventDefault(); showSubmissionDetail(submission); });

    const confirmBtn = document.getElementById('confirm-delete-btn');
    confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deleting…';
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
            confirmBtn.textContent = 'Delete permanently';
        }
    });
}
