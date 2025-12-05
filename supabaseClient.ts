import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oaztsabaeqtzprbgkvwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9henRzYWJhZXF0enByYmdrdndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzU5ODgsImV4cCI6MjA3OTg1MTk4OH0.aFoh4F_MLiFJ7zzagbwHoeiY6G_HFUJMuXEnPcKANt8';

// Create the client directly. 
// If URL/Key are wrong, this usually doesn't crash until you try to use it.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);