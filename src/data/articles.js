// src/data/articles.js
//
// Article shape (mirrors DB columns):
// { id, slug, title, subtitle, excerpt, image,
//   tags: [{label, color?}], author: {name},
//   date, link, code_module,
//   published_at, created_at, updated_at }

import { supabase } from '../lib/supabase.js';

/** Fetches all saved revisions for an article, newest first. */
export async function getArticleRevisions(articleId) {
    const { data, error } = await supabase
        .from('article_revisions')
        .select('id, article_id, slug, title, subtitle, excerpt, image, tags, author, date, link, code_module, published_at, is_draft, md_content, html_content, revised_at')
        .eq('article_id', articleId)
        .order('revised_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

const CACHE_TTL = 5 * 60 * 1000;
let _cache = null; // { data: Article[], ts: number }

function normalize(a) {
    return { ...a, link: a.link || a.slug };
}

/** Fetches all published articles ordered by publish date. Results are cached for 5 minutes. */
export async function getArticles() {
    const now = Date.now();
    if (_cache && now - _cache.ts < CACHE_TTL) return _cache.data;
    const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .eq('is_draft', false)
        .order('published_at', { ascending: false });
    if (error) throw error;
    const data = articles.map(normalize);
    _cache = { data, ts: now };
    return data;
}

/** Fetches a single article by slug (any draft status). Returns null if not found. */
export async function getArticleBySlug(slug) {
    const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
    if (error) throw error;
    const article = data;
    return article ? normalize(article) : null;
}

/** Full-text search across title, subtitle, excerpt, and tags with relevance ranking. */
export async function searchArticles(query) {
    const q = query.trim();
    if (!q) return [];

    const tokens = [...new Set(
        q.toLowerCase()
            .split(/\s+/)
            .map(t => t.replace(/[^a-z0-9]/g, ''))
            .filter(t => t.length >= 2)
    )];

    if (!tokens.length) return [];

    // Server-side pre-filter: only pull articles that match at least one token
    // in title, subtitle, or excerpt. Tags are scored in-memory below.
    const filterParts = tokens.flatMap(t => [
        `title.ilike.%${t}%`,
        `subtitle.ilike.%${t}%`,
        `excerpt.ilike.%${t}%`,
    ]);

    const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('is_draft', false)
        .or(filterParts.join(','))
        .order('published_at', { ascending: false });

    if (error) throw error;

    const candidates = (data ?? []).map(normalize);

    const scored = candidates.map(a => {
        const title = (a.title ?? '').toLowerCase();
        const subtitle = (a.subtitle ?? '').toLowerCase();
        const excerpt = (a.excerpt ?? '').toLowerCase();
        const tags = (a.tags ?? []).map(t => (t.label ?? t).toLowerCase()).join(' ');

        let score = 0;
        for (const token of tokens) {
            if (title.includes(token)) score += 10;
            if (tags.includes(token)) score += 6;
            if (subtitle.includes(token)) score += 4;
            if (excerpt.includes(token)) score += 2;
        }

        if (tokens.length > 1 && title.includes(q.toLowerCase())) score += 15;

        return { article: a, score };
    });

    return scored
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || new Date(b.article.published_at) - new Date(a.article.published_at))
        .map(({ article }) => article);
}