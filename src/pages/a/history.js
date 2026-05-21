// src/pages/a/history.js — Wikimedia-style revision history
import './history.css';
import { updateContent } from '../../components/Layout.js';
import { renderError } from '../../components/ErrorPage.js';
import { navigate } from '../../router.js';
import { getArticleBySlug, getArticleRevisions } from '../../data/articles.js';
import { checkIsAdmin } from '../../data/admin.js';
import { escapeHtml } from '../../lib/escape.js';
import { setMetaTags } from '../../lib/seo.js';

const GITHUB_REPO = 'https://github.com/Dimitrysaf/the-unlabeled';
const GITHUB_API = 'https://api.github.com/repos/Dimitrysaf/the-unlabeled';
const CONTEXT = 3; // unchanged lines kept around each changed block

// ── Utilities ─────────────────────────────────────────────────────────────

function fmtDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
}

function buildLoadingShell() {
    return `
        <div class="govuk-!-padding-top-6">
            <div class="skeleton-line" style="width:20%;height:1rem;margin-bottom:1.5rem;"></div>
            <div class="skeleton-line" style="width:55%;height:2.5rem;margin-bottom:2rem;"></div>
            <div class="skeleton-line" style="width:100%;height:1rem;margin-bottom:0.5rem;"></div>
            <div class="skeleton-line" style="width:100%;height:1rem;margin-bottom:0.5rem;"></div>
            <div class="skeleton-line" style="width:80%;height:1rem;"></div>
        </div>`;
}

function skeletonRows(n = 4) {
    return Array.from({ length: n }, () => `
        <tr class="govuk-table__row">
            <td class="govuk-table__cell"><span class="skeleton-line skeleton-line--shorter" style="margin:0;"></span></td>
            <td class="govuk-table__cell"><span class="skeleton-line" style="margin:0;width:70%;"></span></td>
            <td class="govuk-table__cell"><span class="skeleton-line skeleton-line--short" style="margin:0;"></span></td>
            <td class="govuk-table__cell"><span class="skeleton-line skeleton-line--shorter" style="margin:0;width:50%;"></span></td>
            <td class="govuk-table__cell"><span class="skeleton-line skeleton-line--shorter" style="margin:0;width:40%;"></span></td>
        </tr>`).join('');
}

// ── GitHub API ────────────────────────────────────────────────────────────

const GH_HEADERS = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };

async function ghFetch(url) {
    const res = await fetch(url, { headers: GH_HEADERS });
    if (res.status === 403 || res.status === 429) {
        throw new Error('GitHub API rate limit reached. Please wait a few minutes and try again.');
    }
    if (!res.ok) throw new Error(`GitHub API returned ${res.status}.`);
    return res.json();
}

/** Returns commits touching the module's main .js file and any sub-directory files. */
async function fetchModuleCommits(module) {
    // Fetch commits for the main file and for the sub-directory in parallel
    const mainPath = `src/pages/${module}.js`;
    const dirPath = `src/pages/${module}`;
    const [main, dir] = await Promise.allSettled([
        ghFetch(`${GITHUB_API}/commits?path=${encodeURIComponent(mainPath)}&per_page=100`),
        ghFetch(`${GITHUB_API}/commits?path=${encodeURIComponent(dirPath)}&per_page=100`),
    ]);

    const seen = new Set();
    const commits = [];
    for (const result of [main, dir]) {
        if (result.status !== 'fulfilled') continue;
        for (const c of result.value) {
            if (!seen.has(c.sha)) { seen.add(c.sha); commits.push(c); }
        }
    }
    // Re-sort by author date descending (they come pre-sorted but merging can break order)
    commits.sort((a, b) =>
        new Date(b.commit.author.date) - new Date(a.commit.author.date));

    if (main.status === 'rejected' && dir.status === 'rejected') throw main.reason;
    return commits;
}

/** Returns commit details with files filtered to this module. */
async function fetchCommitDetails(sha, module) {
    const data = await ghFetch(`${GITHUB_API}/commits/${sha}`);
    const prefix = `src/pages/${module}`;
    const files = (data.files ?? []).filter(
        f => f.filename === `${prefix}.js` || f.filename.startsWith(`${prefix}/`));
    return { sha: data.sha, commit: data.commit, stats: data.stats, files };
}

// ── Unified-diff patch → chunks ───────────────────────────────────────────

function parsePatch(patch) {
    if (!patch) return [];
    const chunks = [];
    for (const line of patch.split('\n')) {
        if (line.startsWith('@@')) {
            chunks.push({ type: 'hunk', line });
        } else if (line.startsWith('+')) {
            chunks.push({ type: 'add', line: line.slice(1) });
        } else if (line.startsWith('-')) {
            chunks.push({ type: 'del', line: line.slice(1) });
        } else if (line.startsWith('\\')) {
            // "\ No newline at end of file" — skip
        } else {
            chunks.push({ type: 'same', line: line.slice(1) });
        }
    }
    return chunks;
}

function renderPatchHtml(chunks) {
    if (!chunks.length) return '<p class="govuk-body govuk-hint">No patch data available for this file.</p>';
    let html = '<div class="history-diff" role="region" aria-label="Code diff">';
    for (const c of chunks) {
        if (c.type === 'hunk') {
            html += `<div class="history-diff__ellipsis">${escapeHtml(c.line)}</div>`;
        } else {
            const cls = c.type === 'add' ? 'history-diff__line--add'
                : c.type === 'del' ? 'history-diff__line--del'
                    : 'history-diff__line--same';
            const prefix = c.type === 'add' ? '+' : c.type === 'del' ? '−' : ' ';
            html += `<div class="history-diff__line ${cls}"><span class="history-diff__sign" aria-hidden="true">${prefix}</span><span>${escapeHtml(c.line)}</span></div>`;
        }
    }
    return html + '</div>';
}

// ── LCS line-diff (for md / html content) ────────────────────────────────

function computeLineDiff(oldText, newText) {
    const a = (oldText || '').split('\n');
    const b = (newText || '').split('\n');
    const m = a.length, n = b.length;

    if (m * n > 400_000) {
        return [...a.map(line => ({ type: 'del', line })), ...b.map(line => ({ type: 'add', line }))];
    }

    const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1] + 1
                : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    const chunks = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
            chunks.push({ type: 'same', line: a[i - 1] }); i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            chunks.push({ type: 'add', line: b[j - 1] }); j--;
        } else {
            chunks.push({ type: 'del', line: a[i - 1] }); i--;
        }
    }
    return chunks.reverse();
}

function renderDiffHtml(chunks) {
    const hasChanges = chunks.some(c => c.type !== 'same');
    if (!hasChanges) return '<p class="history-identical">Content is identical to the following version.</p>';

    const show = new Array(chunks.length).fill(false);
    for (let i = 0; i < chunks.length; i++) {
        if (chunks[i].type !== 'same') {
            for (let k = Math.max(0, i - CONTEXT); k <= Math.min(chunks.length - 1, i + CONTEXT); k++) show[k] = true;
        }
    }

    let html = '<div class="history-diff" role="region" aria-label="Content diff">';
    let idx = 0;
    while (idx < chunks.length) {
        if (!show[idx]) {
            let j = idx;
            while (j < chunks.length && !show[j]) j++;
            const count = j - idx;
            html += `<div class="history-diff__ellipsis">… ${count} line${count === 1 ? '' : 's'} unchanged …</div>`;
            idx = j;
        } else {
            const c = chunks[idx];
            const cls = c.type === 'add' ? 'history-diff__line--add' : c.type === 'del' ? 'history-diff__line--del' : 'history-diff__line--same';
            const pfx = c.type === 'add' ? '+' : c.type === 'del' ? '−' : ' ';
            html += `<div class="history-diff__line ${cls}"><span class="history-diff__sign" aria-hidden="true">${pfx}</span><span>${escapeHtml(c.line)}</span></div>`;
            idx++;
        }
    }
    return html + '</div>';
}

// ── Metadata diff ─────────────────────────────────────────────────────────

function findMetadataChanges(oldRev, newState) {
    const changes = [];
    for (const [key, label] of [
        ['title', 'Title'], ['subtitle', 'Subtitle'], ['excerpt', 'Excerpt'],
        ['date', 'Display date'], ['image', 'Image URL'],
    ]) {
        if ((oldRev[key] ?? '') !== (newState[key] ?? '')) {
            changes.push({ label, from: oldRev[key] ?? '(none)', to: newState[key] ?? '(removed)' });
        }
    }
    const tagStr = t => (Array.isArray(t) ? t.map(x => x.label ?? x).join(', ') : '') || '(none)';
    if (JSON.stringify(oldRev.tags ?? []) !== JSON.stringify(newState.tags ?? [])) {
        changes.push({ label: 'Tags', from: tagStr(oldRev.tags), to: tagStr(newState.tags) });
    }
    const oldAuthor = oldRev.author?.name ?? '', newAuthor = newState.author?.name ?? '';
    if (oldAuthor !== newAuthor) changes.push({ label: 'Author', from: oldAuthor || '(none)', to: newAuthor || '(removed)' });
    if (oldRev.is_draft !== newState.is_draft) {
        changes.push({ label: 'Status', from: oldRev.is_draft ? 'Draft' : 'Published', to: newState.is_draft ? 'Draft' : 'Published' });
    }
    return changes;
}

// ── Shared page chrome ────────────────────────────────────────────────────

function pageHeader(backHref, backId, caption, title) {
    return `
        <a class="govuk-back-link" href="${backHref}" id="${backId}">Back</a>
        <span class="govuk-caption-xl">${caption}</span>
        <h1 class="govuk-heading-xl">${title}</h1>`;
}

function bindBack(id, href) {
    document.getElementById(id)?.addEventListener('click', e => { e.preventDefault(); navigate(href); });
}

function ghErrorBanner(message) {
    return `
        <div class="govuk-error-summary" role="alert">
            <div>
                <h2 class="govuk-error-summary__title">Could not load commits from GitHub</h2>
                <div class="govuk-error-summary__body"><p class="govuk-body">${escapeHtml(message)}</p></div>
            </div>
        </div>`;
}

// ── Code module history (commit list from GitHub) ─────────────────────────

async function renderCodeModuleHistory(article, revisions) {
    const titleText = escapeHtml(article.title || 'Untitled');
    const backHref = `/a/${article.slug}`;
    const moduleKey = escapeHtml(article.code_module);

    // Render shell with skeleton table immediately
    updateContent(`
        <div>
            ${pageHeader(backHref, 'hist-back', 'Article history', titleText)}
            <h2 class="govuk-heading-m">Code changes</h2>
            <p class="govuk-body govuk-hint govuk-!-margin-bottom-4">
                Changes to <code>${moduleKey}</code> from GitHub
            </p>
            <div class="table-scroll">
                <table class="govuk-table" id="commits-table">
                    <thead class="govuk-table__head">
                        <tr class="govuk-table__row">
                            <th class="govuk-table__header" scope="col">SHA</th>
                            <th class="govuk-table__header col-important" scope="col">Message</th>
                            <th class="govuk-table__header" scope="col">Author</th>
                            <th class="govuk-table__header col-important" scope="col">Date</th>
                            <th class="govuk-table__header col-important" scope="col"><span class="govuk-visually-hidden">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody class="govuk-table__body" id="commits-body">
                        ${skeletonRows(5)}
                    </tbody>
                </table>
            </div>
            <div id="gh-error"></div>
        </div>`);
    bindBack('hist-back', backHref);

    let commits, fetchError;
    try {
        commits = await fetchModuleCommits(article.code_module);
    } catch (err) {
        fetchError = err.message;
    }

    const tbody = document.getElementById('commits-body');
    const errEl = document.getElementById('gh-error');
    if (!tbody) return;

    if (fetchError) {
        tbody.innerHTML = '';
        if (errEl) errEl.innerHTML = ghErrorBanner(fetchError);
        return;
    }

    if (!commits.length) {
        tbody.innerHTML = `
            <tr class="govuk-table__row">
                <td class="govuk-table__cell" colspan="5">
                    <span class="govuk-hint">No commits found for this module's files.</span>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = commits.map(c => {
        const sha = c.sha.slice(0, 7);
        const message = escapeHtml((c.commit.message || '').split('\n')[0]); // first line only
        const author = escapeHtml(c.commit.author?.name || '—');
        const date = fmtDateTime(c.commit.author?.date);
        return `
            <tr class="govuk-table__row">
                <td class="govuk-table__cell">
                    <code class="admin-slug">${sha}</code>
                </td>
                <td class="govuk-table__cell col-important">${message}</td>
                <td class="govuk-table__cell">${author}</td>
                <td class="govuk-table__cell col-important">${escapeHtml(date)}</td>
                <td class="govuk-table__cell col-important">
                    <a class="govuk-link govuk-link--no-visited-state"
                       href="/a/${escapeHtml(article.slug)}/history?commit=${encodeURIComponent(c.sha)}"
                       id="commit-${sha}">View diff</a>
                </td>
            </tr>`;
    }).join('');

    commits.forEach(c => {
        const sha = c.sha.slice(0, 7);
        document.getElementById(`commit-${sha}`)?.addEventListener('click', e => {
            e.preventDefault();
            navigate(`/a/${article.slug}/history?commit=${encodeURIComponent(c.sha)}`);
        });
    });

    // Append metadata revisions table if present
    if (revisions.length) {
        const slot = document.querySelector('#main-content > div > div:last-child') ?? document.querySelector('#main-content > div');
        if (slot) slot.insertAdjacentHTML('beforeend', buildMetaRevisionsTable(article, revisions));
        bindMetaRevisionLinks(article, revisions);
    }
}

function buildMetaRevisionsTable(article, revisions) {
    return `
        <h2 class="govuk-heading-m govuk-!-margin-top-8">Metadata revisions</h2>
        <p class="govuk-body govuk-hint govuk-!-margin-bottom-4">
            Changes to title, tags, and other metadata saved from the admin editor.
        </p>
        <div class="table-scroll">
            <table class="govuk-table">
                <caption class="govuk-table__caption govuk-visually-hidden">Metadata revisions</caption>
                <thead class="govuk-table__head">
                    <tr class="govuk-table__row">
                        <th class="govuk-table__header col-important" scope="col">Rev</th>
                        <th class="govuk-table__header col-important" scope="col">Saved on</th>
                        <th class="govuk-table__header col-important" scope="col">Status</th>
                        <th class="govuk-table__header col-important" scope="col"><span class="govuk-visually-hidden">Actions</span></th>
                    </tr>
                </thead>
                <tbody class="govuk-table__body">
                    ${revisions.map((rev, idx) => `
                        <tr class="govuk-table__row">
                            <td class="govuk-table__cell col-important">${revisions.length - idx}</td>
                            <td class="govuk-table__cell col-important">${escapeHtml(fmtDateTime(rev.revised_at))}</td>
                            <td class="govuk-table__cell col-important">
                                ${rev.is_draft
            ? `<strong class="govuk-tag govuk-tag--yellow">Draft</strong>`
            : `<strong class="govuk-tag govuk-tag--green">Published</strong>`}
                            </td>
                            <td class="govuk-table__cell col-important">
                                <a class="govuk-link govuk-link--no-visited-state"
                                   href="/a/${escapeHtml(article.slug)}/history?v=${escapeHtml(rev.id)}"
                                   id="rev-${escapeHtml(rev.id)}">View changes</a>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

function bindMetaRevisionLinks(article, revisions) {
    revisions.forEach(rev => {
        document.getElementById(`rev-${rev.id}`)?.addEventListener('click', e => {
            e.preventDefault();
            navigate(`/a/${article.slug}/history?v=${rev.id}`);
        });
    });
}

// ── GitHub commit diff view ───────────────────────────────────────────────

async function renderCommitDiffView(article, sha) {
    const titleText = escapeHtml(article.title || 'Untitled');
    const backHref = `/a/${article.slug}/history`;

    updateContent(`
        <div>
            ${pageHeader(backHref, 'diff-back', 'Code change', titleText)}
            ${buildLoadingShell()}
        </div>`);
    bindBack('diff-back', backHref);

    let details, fetchError;
    try {
        details = await fetchCommitDetails(sha, article.code_module);
    } catch (err) {
        fetchError = err.message;
    }

    if (fetchError) {
        updateContent(`
            <div>
                ${pageHeader(backHref, 'diff-back', 'Code change', titleText)}
                ${ghErrorBanner(fetchError)}
            </div>`);
        bindBack('diff-back', backHref);
        return;
    }

    const { commit, stats, files } = details;
    const shortSha = sha.slice(0, 7);
    const message = escapeHtml(commit.message || '(no message)');
    const author = escapeHtml(commit.author?.name || '—');
    const date = fmtDateTime(commit.author?.date);
    const ghUrl = escapeHtml(`${GITHUB_REPO}/commit/${sha}`);

    const statsHtml = stats
        ? `<strong class="history-diff-legend--add">+${stats.additions}</strong> / <strong class="history-diff-legend--del">−${stats.deletions}</strong> across ${stats.total} change${stats.total === 1 ? '' : 's'}`
        : '';

    const filesHtml = files.length
        ? files.map(f => {
            const chunks = parsePatch(f.patch);
            return `
                <h3 class="govuk-heading-s govuk-!-margin-top-6 govuk-!-margin-bottom-1">
                    <code>${escapeHtml(f.filename)}</code>
                    <span class="govuk-body-s govuk-hint" style="font-weight:normal;">
                        &nbsp;<span class="history-diff-legend--add">+${f.additions}</span>
                        &nbsp;<span class="history-diff-legend--del">−${f.deletions}</span>
                    </span>
                </h3>
                ${renderPatchHtml(chunks)}`;
        }).join('')
        : `<div class="govuk-inset-text"><p class="govuk-body govuk-!-margin-bottom-0">
               No changes to this module's files were found in this commit.
           </p></div>`;

    updateContent(`
        <div>
            ${pageHeader(backHref, 'diff-back', 'Code change', titleText)}

            <dl class="govuk-summary-list govuk-!-margin-bottom-6">
                <div class="govuk-summary-list__row">
                    <dt class="govuk-summary-list__key">Commit</dt>
                    <dd class="govuk-summary-list__value">
                        <code class="admin-slug">${shortSha}</code>
                        &nbsp;
                        <a class="govuk-link" href="${ghUrl}" target="_blank" rel="noopener noreferrer">
                            View on GitHub ↗
                        </a>
                    </dd>
                </div>
                <div class="govuk-summary-list__row">
                    <dt class="govuk-summary-list__key">Message</dt>
                    <dd class="govuk-summary-list__value" style="white-space:pre-wrap;">${message}</dd>
                </div>
                <div class="govuk-summary-list__row">
                    <dt class="govuk-summary-list__key">Author</dt>
                    <dd class="govuk-summary-list__value">${author}</dd>
                </div>
                <div class="govuk-summary-list__row">
                    <dt class="govuk-summary-list__key">Date</dt>
                    <dd class="govuk-summary-list__value">${escapeHtml(date)}</dd>
                </div>
                ${statsHtml ? `
                <div class="govuk-summary-list__row">
                    <dt class="govuk-summary-list__key">Changes</dt>
                    <dd class="govuk-summary-list__value">${statsHtml}</dd>
                </div>` : ''}
            </dl>

            <p class="govuk-body govuk-hint govuk-!-margin-bottom-3">
                JavaScript —
                <span class="history-diff-legend--del">red = removed</span>,
                <span class="history-diff-legend--add">green = added</span>.
            </p>

            ${filesHtml}
        </div>`);
    bindBack('diff-back', backHref);
}

// ── MD / HTML revision list ───────────────────────────────────────────────

function renderHistoryList(article, revisions) {
    const titleText = escapeHtml(article.title || 'Untitled');
    const backHref = `/a/${article.slug}`;

    if (!revisions.length) {
        updateContent(`
            <div>
                ${pageHeader(backHref, 'hist-back', 'Article history', titleText)}
                <p class="govuk-body govuk-hint">
                    No revision history yet. A snapshot is saved automatically each time this article is updated.
                </p>
            </div>`);
        bindBack('hist-back', backHref);
        return;
    }

    const rowsHtml = revisions.map((rev, idx) => {
        const revNum = revisions.length - idx;
        const date = fmtDateTime(rev.revised_at);
        const statusTag = rev.is_draft
            ? `<strong class="govuk-tag govuk-tag--yellow">Draft</strong>`
            : `<strong class="govuk-tag govuk-tag--green">Published</strong>`;
        const latestTag = idx === 0
            ? `<strong class="govuk-tag govuk-tag--blue govuk-!-font-size-16">Latest edit</strong>`
            : '';
        return `
            <tr class="govuk-table__row">
                <td class="govuk-table__cell col-important">${revNum}</td>
                <td class="govuk-table__cell col-important">${escapeHtml(date)}</td>
                <td class="govuk-table__cell col-important">${statusTag}</td>
                <td class="govuk-table__cell">${latestTag}</td>
                <td class="govuk-table__cell col-important">
                    <a class="govuk-link govuk-link--no-visited-state"
                       href="/a/${escapeHtml(article.slug)}/history?v=${escapeHtml(rev.id)}"
                       id="rev-${escapeHtml(rev.id)}">View changes</a>
                </td>
            </tr>`;
    }).join('');

    updateContent(`
        <div>
            ${pageHeader(backHref, 'hist-back', 'Article history', titleText)}
            <p class="govuk-body govuk-hint govuk-!-margin-bottom-4">
                ${revisions.length} saved revision${revisions.length === 1 ? '' : 's'}.
                Each row is a snapshot taken just before an edit was applied.
            </p>
            <div class="table-scroll">
                <table class="govuk-table">
                    <caption class="govuk-table__caption govuk-visually-hidden">Revision history for ${titleText}</caption>
                    <thead class="govuk-table__head">
                        <tr class="govuk-table__row">
                            <th class="govuk-table__header col-important" scope="col">Rev</th>
                            <th class="govuk-table__header col-important" scope="col">Saved on</th>
                            <th class="govuk-table__header col-important" scope="col">Status at save</th>
                            <th class="govuk-table__header" scope="col"></th>
                            <th class="govuk-table__header col-important" scope="col"><span class="govuk-visually-hidden">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody class="govuk-table__body">${rowsHtml}</tbody>
                </table>
            </div>
        </div>`);

    bindBack('hist-back', backHref);
    revisions.forEach(rev => {
        document.getElementById(`rev-${rev.id}`)?.addEventListener('click', e => {
            e.preventDefault();
            navigate(`/a/${article.slug}/history?v=${rev.id}`);
        });
    });
}

// ── MD / HTML revision diff view ──────────────────────────────────────────

function renderRevisionDiffView(article, revision, nextState, allRevisions, revIdx) {
    const titleText = escapeHtml(article.title || 'Untitled');
    const backHref = `/a/${article.slug}/history`;
    const revNum = allRevisions.length - revIdx;

    const isMd = revision.md_content !== null || nextState.md_content !== null;
    const metaChanges = findMetadataChanges(revision, nextState);

    const oldContent = isMd ? (revision.md_content || '') : (revision.html_content || '');
    const newContent = isMd ? (nextState.md_content || '') : (nextState.html_content || '');
    const chunks = computeLineDiff(oldContent, newContent);

    const metaSection = metaChanges.length
        ? `
            <h2 class="govuk-heading-m">Metadata changes</h2>
            <dl class="govuk-summary-list govuk-!-margin-bottom-6">
                ${metaChanges.map(c => `
                    <div class="govuk-summary-list__row">
                        <dt class="govuk-summary-list__key">${escapeHtml(c.label)}</dt>
                        <dd class="govuk-summary-list__value">
                            <span class="history-meta-old">${escapeHtml(String(c.from))}</span>
                            <span aria-hidden="true">→</span>
                            <span class="govuk-visually-hidden">changed to</span>
                            <span class="history-meta-new">${escapeHtml(String(c.to))}</span>
                        </dd>
                    </div>`).join('')}
            </dl>`
        : `<p class="govuk-body govuk-hint govuk-!-margin-bottom-6">No metadata changes in this revision.</p>`;

    const statusTag = s => s.is_draft
        ? `<strong class="govuk-tag govuk-tag--yellow">Draft</strong>`
        : `<strong class="govuk-tag govuk-tag--green">Published</strong>`;

    updateContent(`
        <div>
            ${pageHeader(backHref, 'diff-back', `Revision ${revNum} of ${allRevisions.length}`, titleText)}

            <dl class="govuk-summary-list govuk-!-margin-bottom-6">
                <div class="govuk-summary-list__row">
                    <dt class="govuk-summary-list__key">Edit saved on</dt>
                    <dd class="govuk-summary-list__value">${escapeHtml(fmtDateTime(revision.revised_at))}</dd>
                </div>
                <div class="govuk-summary-list__row">
                    <dt class="govuk-summary-list__key">Status before edit</dt>
                    <dd class="govuk-summary-list__value">${statusTag(revision)}</dd>
                </div>
                <div class="govuk-summary-list__row">
                    <dt class="govuk-summary-list__key">Status after edit</dt>
                    <dd class="govuk-summary-list__value">${statusTag(nextState)}</dd>
                </div>
            </dl>

            ${metaSection}

            <h2 class="govuk-heading-m">Content changes</h2>
            <p class="govuk-body govuk-hint govuk-!-margin-bottom-3">
                ${isMd ? 'Markdown' : 'HTML'} —
                <span class="history-diff-legend--del">red = removed</span>,
                <span class="history-diff-legend--add">green = added</span>.
            </p>
            ${renderDiffHtml(chunks)}
        </div>`);

    bindBack('diff-back', backHref);
}

// ── Entry point ───────────────────────────────────────────────────────────

export async function renderHistoryPage(slug, params) {
    const normalized = slug?.toLowerCase?.().trim();
    updateContent(buildLoadingShell());

    let article;
    try {
        article = await getArticleBySlug(normalized);
    } catch {
        renderError('500');
        return;
    }

    if (!article) { renderError('404'); return; }

    if (article.is_draft) {
        let isAdmin = false;
        try { isAdmin = await checkIsAdmin(); } catch { }
        if (!isAdmin) { renderError('404'); return; }
    }

    setMetaTags({
        title: `Revision history: ${article.title} — The Unlabeled`,
        description: `Edit history for "${article.title}".`,
        url: `https://the-unlabeled.com/a/${article.slug}/history`,
        robots: 'noindex',
    });

    const commitSha = params?.get('commit');
    const revId = params?.get('v');

    // Code module + commit SHA → GitHub commit diff
    if (article.code_module && commitSha) {
        await renderCommitDiffView(article, commitSha);
        return;
    }

    let revisions;
    try {
        revisions = await getArticleRevisions(article.id);
    } catch {
        renderError('500');
        return;
    }

    // Metadata revision diff (works for all article types)
    if (revId) {
        const revIdx = revisions.findIndex(r => r.id === revId);
        if (revIdx === -1) { renderError('404'); return; }
        const nextState = revIdx === 0 ? article : revisions[revIdx - 1];
        renderRevisionDiffView(article, revisions[revIdx], nextState, revisions, revIdx);
        return;
    }

    // Code module → GitHub commit list + metadata table
    if (article.code_module) {
        await renderCodeModuleHistory(article, revisions);
        return;
    }

    // MD / HTML → revision list
    renderHistoryList(article, revisions);
}
