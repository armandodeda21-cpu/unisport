// js/supabase.js
// -------------------------------------------------------
// Supabase client initialisation.
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your own
// values from the Supabase project dashboard.
// -------------------------------------------------------

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 🔧 CONFIGURE THESE (see SETUP.md for instructions)
const SUPABASE_URL      = 'https://lrqxlwcejraiuwbuzwkc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxycXhsd2NlanJhaXV3YnV6d2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjA2OTUsImV4cCI6MjA5MjA5NjY5NX0.1p1bakjIhrnzgIkev8q5IdChzz1LhA3PtI6rSAEp9yk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
