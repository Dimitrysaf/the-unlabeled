// src/data/admin.js
import { supabase } from '../lib/supabase.js';

let _adminCache = null; // { userId: string, result: boolean }

/** Checks whether the currently logged-in user is in the admin_users table. */
export async function checkIsAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { _adminCache = null; return false; }
    if (_adminCache?.userId === user.id) return _adminCache.result;

    const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

    const result = !error && data !== null;
    _adminCache = { userId: user.id, result };
    return result;
}

/** Clears the cached admin check (call on sign-out). */
export function clearAdminCache() {
    _adminCache = null;
}

/** @returns {Promise<Article[]>} All articles ordered by creation date. */
export async function getAllArticles() {
    const { data, error } = await supabase
        .from('articles')
        .select('id, slug, title, is_draft, code_module, md_content, html_content, published_at, created_at')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
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
    return data;
}

/** @returns {Promise<Article>} The updated article row. */
export async function updateArticle(id, payload) {
    const { data, error } = await supabase.from('articles').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
}

/** @returns {Promise<void>} */
export async function deleteArticle(id) {
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) throw error;
}

/** @returns {Promise<Article>} */
export async function toggleDraft(id, isDraft) {
    return updateArticle(id, { is_draft: isDraft });
}

/** Fetches all non-deleted comments with their article info, newest first. */
export async function getAllComments() {
    const { data, error } = await supabase
        .from('comments')
        .select('id, content, display_name, created_at, article_id, articles(slug, title)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

/** Hard-deletes a comment as admin (requires an RLS policy granting admin_users delete on any comment). */
export async function adminDeleteComment(id) {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) throw error;
}

// ── User management via Edge Function ─────────────────────────────────────────

async function callUsersEdge(payload) {
    const { data, error } = await supabase.functions.invoke('admin-users', { body: payload });
    if (error) throw new Error(error.message || 'Edge Function error');
    if (data?.error) throw new Error(data.error);
    return data?.data;
}

/** Lists all auth users (paginated, up to 100). */
export async function listAllUsers() {
    return callUsersEdge({ action: 'list', perPage: 100 });
}

/** Fetches a single auth user by ID, including their MFA factors. */
export async function getUserById(userId) {
    return callUsersEdge({ action: 'get', userId });
}

/** Bans a user for the given number of hours. */
export async function banUser(userId, durationHours) {
    return callUsersEdge({ action: 'ban', userId, duration: `${durationHours}h` });
}

/** Removes a ban from a user. */
export async function unbanUser(userId) {
    return callUsersEdge({ action: 'unban', userId });
}

/** Permanently deletes a user account. */
export async function adminDeleteUser(userId) {
    return callUsersEdge({ action: 'delete', userId });
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
