// src/data/comments.js
// All DB writes go through the Supabase client with RLS enforcing ownership.

import { supabase } from '../lib/supabase.js';

// ── Comments ─────────────────────────────────────────────────────────────────

/** Fetches all non-deleted comments for an article, oldest-first. */
export async function getComments(articleId) {
    const { data, error } = await supabase
        .from('comments')
        .select('id, article_id, parent_id, user_id, display_name, content, created_at')
        .eq('article_id', articleId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
}

/**
 * Hard-deletes a comment. Child replies cascade automatically via the FK.
 * RLS ensures only the owner can delete.
 */
export async function deleteComment(commentId) {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) throw error;
}

/**
 * Updates a comment's text content (≤ 500 chars).
 * RLS ensures only the owner can update.
 */
export async function editComment(commentId, content) {
    const { error } = await supabase
        .from('comments')
        .update({ content: content.trim() })
        .eq('id', commentId);
    if (error) throw error;
}

/**
 * Posts a new top-level comment or a reply.
 * display_name is captured at write time so future renames don't
 * retroactively alter existing comments.
 */
export async function postComment({ articleId, content, parentId = null, displayName }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('comments').insert([{
        article_id: articleId,
        user_id: user.id,
        parent_id: parentId ?? null,
        display_name: displayName,
        content: content.trim(),
    }]);
    if (error) throw error;
}

// ── Votes ─────────────────────────────────────────────────────────────────────

/** Returns the net vote score for an article (sum of all +1 / −1 votes). */
export async function getVoteScore(articleId) {
    const { data, error } = await supabase
        .from('article_votes')
        .select('vote')
        .eq('article_id', articleId);
    if (error) throw error;
    return (data ?? []).reduce((sum, r) => sum + r.vote, 0);
}

/** Returns the current user's vote (1, −1, or null). Null if not signed in. */
export async function getUserVote(articleId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
        .from('article_votes')
        .select('vote')
        .eq('article_id', articleId)
        .eq('user_id', user.id)
        .maybeSingle();
    if (error) return null;
    return data?.vote ?? null;
}

/** Upserts or removes a vote. Pass null to remove an existing vote. */
export async function castVote(articleId, vote) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (vote === null) {
        const { error } = await supabase
            .from('article_votes')
            .delete()
            .eq('article_id', articleId)
            .eq('user_id', user.id);
        if (error) throw error;
        return;
    }

    const { error } = await supabase
        .from('article_votes')
        .upsert({ article_id: articleId, user_id: user.id, vote }, { onConflict: 'article_id,user_id' });
    if (error) throw error;
}
