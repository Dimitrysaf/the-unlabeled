// src/data/articles.js
//
// Article shape (mirrors DB columns):
// { id, slug, title, subtitle, excerpt, image,
//   tags: [{label, color?}], author: {name},
//   date, link, code_module,
//   published_at, created_at, updated_at }

import { from, supabase } from '../lib/supabase.js';

const CACHE_TTL = 5 * 60 * 1000;
let _cache = null; // { data: Article[], ts: number }

function normalize(a) {
    return { ...a, link: a.link || a.slug };
}

/** Fetches all published articles ordered by publish date. Results are cached for 5 minutes. */
export async function getArticles() {
    const now = Date.now();
    if (_cache && now - _cache.ts < CACHE_TTL) return _cache.data;
    const articles = await from('articles', { is_draft: 'eq.false', order: 'published_at.desc' });
    const data = articles.map(normalize);
    _cache = { data, ts: now };
    return data;
}

/** Fetches a single article by slug (any draft status). Returns null if not found. */
export async function getArticleBySlug(slug) {
    const rows = await from('articles', { slug: `eq.${slug}`, limit: '1' });
    const article = rows[0] ?? null;
    return article ? normalize(article) : null;
}

/** Full-text search across title, subtitle, excerpt, and tags. */
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
