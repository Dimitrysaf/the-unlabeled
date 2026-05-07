/**
 * Comments & votes data layer.
 * All DB writes go through the Supabase client with RLS enforcing ownership.
 */

import { supabase } from '../lib/supabase.js';

// ─────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────

/**
 * Fetch all non-deleted comments for an article, oldest-first.
 * @param {string} articleId
 * @returns {Promise<Array>}
 */
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
 * Hard-delete a comment. Child replies cascade automatically via the FK.
 * RLS ensures only the owner can delete.
 * @param {string} commentId
 */
export async function deleteComment(commentId) {
    const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
    if (error) throw error;
}

/**
 * Update the text content of a comment.
 * RLS ensures only the owner can update.
 * NOTE: add this policy in Supabase if not present:
 *   CREATE POLICY "comments_update" ON comments FOR UPDATE USING (auth.uid() = user_id);
 * @param {string} commentId
 * @param {string} content   ≤ 500 characters
 */
export async function editComment(commentId, content) {
    const { error } = await supabase
        .from('comments')
        .update({ content: content.trim() })
        .eq('id', commentId);
    if (error) throw error;
}

/**
 * Post a new top-level comment or a reply.
 * display_name is captured at write time so future profile renames don't
 * retroactively change existing comments.
 *
 * @param {object} params
 * @param {string}      params.articleId
 * @param {string}      params.content       ≤ 500 characters
 * @param {string|null} params.parentId      null for top-level
 * @param {string}      params.displayName   from user metadata
 */
export async function postComment({ articleId, content, parentId = null, displayName }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('comments')
        .insert([{
            article_id: articleId,
            user_id: user.id,
            parent_id: parentId ?? null,
            display_name: displayName,
            content: content.trim(),
        }]);

    if (error) throw error;
}

// ─────────────────────────────────────────────
// VOTES
// ─────────────────────────────────────────────

/**
 * Net vote score for an article (sum of all +1 / −1 votes).
 * @param {string} articleId
 * @returns {Promise<number>}
 */
export async function getVoteScore(articleId) {
    const { data, error } = await supabase
        .from('article_votes')
        .select('vote')
        .eq('article_id', articleId);

    if (error) throw error;
    return (data ?? []).reduce((sum, r) => sum + r.vote, 0);
}

/**
 * The current user's vote for an article: 1, −1, or null.
 * Returns null if the user is not signed in or hasn't voted.
 * @param {string} articleId
 * @returns {Promise<1|-1|null>}
 */
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

/**
 * Upsert or delete a vote.
 * @param {string}    articleId
 * @param {1|-1|null} vote  — pass null to remove an existing vote
 */
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
        .upsert(
            { article_id: articleId, user_id: user.id, vote },
            { onConflict: 'article_id,user_id' }
        );
    if (error) throw error;
}