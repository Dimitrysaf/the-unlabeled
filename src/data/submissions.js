// src/data/submissions.js
import { supabase } from '../lib/supabase.js';

export async function createSubmission({ title, description, source_url, contact }) {
    const { error } = await supabase.from('submissions').insert([{
        title: title.trim(),
        description: description.trim(),
        source_url: source_url?.trim() || null,
        contact: contact?.trim() || null,
    }]);
    if (error) throw error;
}

export async function getAllSubmissions() {
    const { data, error } = await supabase
        .from('submissions')
        .select('id, title, description, source_url, contact, submitted_at')
        .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function deleteSubmission(id) {
    const { error } = await supabase.from('submissions').delete().eq('id', id);
    if (error) throw error;
}
