// src/lib/supabase.js
//
// Vite exposes env vars prefixed with VITE_ on the client.
// Add these two to your Vercel project settings:
//   VITE_SUPABASE_URL      = https://<project>.supabase.co
//   VITE_SUPABASE_ANON_KEY = <your anon key>

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
        '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
        'Add them to .env.local and to Vercel project settings.'
    );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
