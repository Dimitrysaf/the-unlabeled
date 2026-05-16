// src/data/articles.js
//
// Article shape (mirrors DB columns):
// { id, slug, title, subtitle, excerpt, image,
//   tags: [{label, color?}], author: {name},
//   date, link, code_module,
//   published_at, created_at, updated_at }

import { from, supabase } from '../lib/supabase.js';

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

/** Full-text search across title, subtitle, excerpt, and tags with relevance ranking. */
export async function searchArticles(query) {
    const q = query.trim();
    if (!q) return [];

    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    const articles = await getArticles();

    const scored = articles.map(a => {
        const title    = (a.title    ?? '').toLowerCase();
        const subtitle = (a.subtitle ?? '').toLowerCase();
        const excerpt  = (a.excerpt  ?? '').toLowerCase();
        const tags     = (a.tags     ?? []).map(t => (t.label ?? t).toLowerCase()).join(' ');

        let score = 0;
        for (const token of tokens) {
            if (title.includes(token))    score += 10;
            if (tags.includes(token))     score += 6;
            if (subtitle.includes(token)) score += 4;
            if (excerpt.includes(token))  score += 2;
        }

        // Bonus for exact phrase match in title
        if (tokens.length > 1 && title.includes(q.toLowerCase())) score += 15;

        return { article: a, score };
    });

    return scored
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || new Date(b.article.published_at) - new Date(a.article.published_at))
        .map(({ article }) => article);
}
