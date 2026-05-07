/**
 * Articles data layer.
 *
 * Shape returned by Supabase (mirrors the DB columns):
 * {
 *   id, slug, title, subtitle, excerpt, image,
 *   tags: [{label, color?}],
 *   author: {name},
 *   date, link, code_module,
 *   published_at, created_at, updated_at
 * }
 */

import { from, supabase } from '../lib/supabase.js';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let _articlesCache = null; // { data: Article[], ts: number }

function normalize(a) {
    return { ...a, link: a.link || a.slug };
}

/** Fetch all published (non-draft) articles ordered by publish date. */
export async function getArticles() {
    const now = Date.now();
    if (_articlesCache && now - _articlesCache.ts < CACHE_TTL) {
        return _articlesCache.data;
    }
    const articles = await from('articles', { is_draft: 'eq.false', order: 'published_at.desc' });
    const data = articles.map(normalize);
    _articlesCache = { data, ts: now };
    return data;
}

/** Fetch a single article by slug (any draft status). Returns the article object or null. */
export async function getArticleBySlug(slug) {
    const rows = await from('articles', {
        slug: `eq.${slug}`,
        limit: '1',
    });
    const article = rows[0] ?? null;
    return article ? normalize(article) : null;
}

/** Server-side search across title, subtitle, excerpt, and tags. */
export async function searchArticles(query) {
    const q = query.trim();
    if (!q) return [];
    const pattern = `%${q}%`;
    const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('is_draft', false)
        .or(`title.ilike.${pattern},subtitle.ilike.${pattern},excerpt.ilike.${pattern},tags::text.ilike.${pattern}`)
        .order('published_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(normalize);
}
