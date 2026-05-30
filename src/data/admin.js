// src/data/admin.js
import { supabase } from '../lib/supabase.js';

let _adminCache = null; // { userId: string, result: boolean }

const CACHE_TTL = 5 * 60 * 1000;
let _articlesCache = null; // { data, ts }
let _commentsCache = null; // { data, ts }
let _usersCache = null;    // { data, ts }

/** Clears all admin list caches (call when you need fresh data). */
export function clearAdminDataCache() {
    _articlesCache = null;
    _commentsCache = null;
    _usersCache = null;
}

/**
 * Checks whether the given user is in the admin_users table.
 * Pass userId when you already have it to avoid a redundant getUser() call
 * (which would compete for the Supabase auth Web Lock).
 */
export async function checkIsAdmin(userId) {
    if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { _adminCache = null; return false; }
        userId = user.id;
    }
    if (_adminCache?.userId === userId) return _adminCache.result;

    const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

    const result = !error && data !== null;
    _adminCache = { userId, result };
    return result;
}

/** Clears the cached admin check (call on sign-out). */
export function clearAdminCache() {
    _adminCache = null;
}

/** @returns {Promise<Article[]>} All articles ordered by creation date. Cached for 5 minutes. */
export async function getAllArticles() {
    const now = Date.now();
    if (_articlesCache && now - _articlesCache.ts < CACHE_TTL) return _articlesCache.data;
    const { data, error } = await supabase
        .from('articles')
        .select('id, slug, title, is_draft, code_module, md_content, html_content, published_at, created_at')
        .order('created_at', { ascending: false });
    if (error) throw error;
    const result = data ?? [];
    _articlesCache = { data: result, ts: now };
    return result;
}

/** @returns {Promise<Article>} */
export async function getArticleById(id) {
    const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
}

/** @returns {Promise<Article>} The newly created article row. */
export async function createArticle(payload) {
    const { data, error } = await supabase.from('articles').insert([payload]).select().single();
    if (error) throw error;
    _articlesCache = null;
    return data;
}

/** @returns {Promise<Article>} The updated article row. */
export async function updateArticle(id, payload) {
    const { data, error } = await supabase.from('articles').update(payload).eq('id', id).select().single();
    if (error) throw error;
    _articlesCache = null;
    return data;
}

/** @returns {Promise<void>} */
export async function deleteArticle(id) {
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) throw error;
    _articlesCache = null;
}

/** @returns {Promise<Article>} */
export async function toggleDraft(id, isDraft) {
    return updateArticle(id, { is_draft: isDraft });
}

/** Queues a push notification for an article (the pg_cron job sends it within 5 min). */
export async function createPendingNotification(articleId) {
    const { error } = await supabase
        .from('pending_notifications')
        .insert([{ article_id: articleId, send_at: new Date().toISOString() }]);
    if (error) throw error;
}

/** Fetches all non-deleted comments with their article info, newest first. Cached for 5 minutes. */
export async function getAllComments() {
    const now = Date.now();
    if (_commentsCache && now - _commentsCache.ts < CACHE_TTL) return _commentsCache.data;
    const { data, error } = await supabase
        .from('comments')
        .select('id, content, display_name, created_at, article_id, articles(slug, title)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
    if (error) throw error;
    const result = data ?? [];
    _commentsCache = { data: result, ts: now };
    return result;
}

/** Hard-deletes a comment as admin (requires an RLS policy granting admin_users delete on any comment). */
export async function adminDeleteComment(id) {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) throw error;
    _commentsCache = null;
}

// ── User management via Edge Function ─────────────────────────────────────────

async function callUsersEdge(payload) {
    const { data, error } = await supabase.functions.invoke('admin-users', { body: payload });
    if (error) throw new Error(error.message || 'Edge Function error');
    if (data?.error) throw new Error(data.error);
    return data?.data;
}

/** Lists all auth users (paginated, up to 100). Cached for 5 minutes. */
export async function listAllUsers() {
    const now = Date.now();
    if (_usersCache && now - _usersCache.ts < CACHE_TTL) return _usersCache.data;
    const result = await callUsersEdge({ action: 'list', perPage: 100 });
    _usersCache = { data: result, ts: now };
    return result;
}

/** Fetches a single auth user by ID, including their MFA factors. */
export async function getUserById(userId) {
    return callUsersEdge({ action: 'get', userId });
}

/** Bans a user for the given number of hours. */
export async function banUser(userId, durationHours) {
    const result = await callUsersEdge({ action: 'ban', userId, duration: `${durationHours}h` });
    _usersCache = null;
    return result;
}

/** Removes a ban from a user. */
export async function unbanUser(userId) {
    const result = await callUsersEdge({ action: 'unban', userId });
    _usersCache = null;
    return result;
}

/** Permanently deletes a user account. */
export async function adminDeleteUser(userId) {
    const result = await callUsersEdge({ action: 'delete', userId });
    _usersCache = null;
    return result;
}

/** Removes all MFA factors for a user. */
export async function removeMfa(userId) {
    return callUsersEdge({ action: 'remove-mfa', userId });
}

/** Sends a password reset email via Supabase Auth. */
export async function sendPasswordResetEmail(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/account`,
    });
    if (error) throw error;
}

/** Sends a magic link (OTP) email via Supabase Auth. */
export async function sendMagicLinkEmail(email) {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
}
