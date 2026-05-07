import { supabase } from '../lib/supabase.js';

let _adminCache = null; // { userId: string, result: boolean }

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

export function clearAdminCache() {
    _adminCache = null;
}

export async function getAllArticles() {
    const { data, error } = await supabase
        .from('articles')
        .select('id, slug, title, is_draft, code_module, md_content, html_content, published_at, created_at')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export async function getArticleById(id) {
    const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function createArticle(payload) {
    const { data, error } = await supabase
        .from('articles')
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateArticle(id, payload) {
    const { data, error } = await supabase
        .from('articles')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteArticle(id) {
    const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function toggleDraft(id, isDraft) {
    return updateArticle(id, { is_draft: isDraft });
}
