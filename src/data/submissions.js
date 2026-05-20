// src/data/submissions.js
import { supabase } from '../lib/supabase.js';

const CACHE_TTL = 5 * 60 * 1000;
let _cache = null; // { data, ts }

export function clearSubmissionsCache() {
    _cache = null;
}

export async function createSubmission({ title, description, source_url, contact, category }) {
    const { error } = await supabase.from('submissions').insert([{
        title: title.trim(),
        description: description.trim(),
        source_url: source_url?.trim() || null,
        contact: contact?.trim() || null,
        category: category ?? 'greece_scandals',
    }]);
    if (error) throw error;
    _cache = null;
}

export async function getAllSubmissions() {
    const now = Date.now();
    if (_cache && now - _cache.ts < CACHE_TTL) return _cache.data;
    const { data, error } = await supabase
        .from('submissions')
        .select('id, title, description, source_url, contact, category, dismissed, submitted_at')
        .order('dismissed', { ascending: true })
        .order('submitted_at', { ascending: false });
    if (error) throw error;
    const result = data ?? [];
    _cache = { data: result, ts: now };
    return result;
}

export async function dismissSubmission(id) {
    const { error } = await supabase.from('submissions').update({ dismissed: true }).eq('id', id);
    if (error) throw error;
    _cache = null;
}

export async function deleteSubmission(id) {
    const { error } = await supabase.from('submissions').delete().eq('id', id);
    if (error) throw error;
    _cache = null;
}
