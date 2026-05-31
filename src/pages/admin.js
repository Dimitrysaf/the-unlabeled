// src/pages/admin.js
import './admin.css';
import './admin.mobile.css';
import { updateContent } from '../components/Layout.js';
import { renderError } from '../components/ErrorPage.js';
import { escapeHtml } from '../lib/escape.js';
import {
    checkIsAdmin,
    getArticleById,
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
        const { renderAdminEditor } = await import('./admin/editor.js');
        renderAdminEditor(null);
    } else if (params.has('edit')) {
        const id = params.get('edit');
        try {
            const [article, { renderAdminEditor }] = await Promise.all([
                getArticleById(id),
                import('./admin/editor.js'),
            ]);
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

// ── Editor view ── see ./admin/editor.js (lazy-loaded on ?new / ?edit) ────
