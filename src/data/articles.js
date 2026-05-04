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

import { from } from '../lib/supabase.js';

/** Fetch all published (non-draft) articles ordered by publish date. */
export async function getArticles() {
    const articles = await from('articles', { is_draft: 'eq.false', order: 'published_at.desc' });
    return articles.map(a => ({ ...a, link: a.link || a.slug }));
}

/** Fetch a single article by slug (any draft status). Returns the article object or null. */
export async function getArticleBySlug(slug) {
    const rows = await from('articles', {
        slug: `eq.${slug}`,
        limit: '1',
    });
    const article = rows[0] ?? null;
    return article ? { ...article, link: article.link || article.slug } : null;
}

/** Full-text search across title, subtitle and excerpt (client-side). */
export async function searchArticles(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const all = await getArticles();
    return all.filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.subtitle?.toLowerCase().includes(q) ||
        a.excerpt?.toLowerCase().includes(q) ||
        a.tags?.some(t => t.label?.toLowerCase().includes(q))
    );
}