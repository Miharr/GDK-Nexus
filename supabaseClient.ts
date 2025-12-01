
import { createClient } from '@supabase/supabase-js';

// Credentials provided
const SUPABASE_URL = 'https://oaztsabaeqtzprbgkvwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9henRzYWJhZXF0enByYmdrdndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzU5ODgsImV4cCI6MjA3OTg1MTk4OH0.aFoh4F_MLiFJ7zzagbwHoeiY6G_HFUJMuXEnPcKANt8';

let client = null;

try {
  // 1. Sanitize input to prevent "Invalid URL" crash
  const url = SUPABASE_URL ? SUPABASE_URL.trim() : '';
  
  if (!url.startsWith('http')) {
    console.error('Supabase URL must start with http:// or https://');
  } else {
    // 2. Safely attempt to create client
    client = createClient(url, SUPABASE_ANON_KEY);
  }
} catch (error) {
  console.error('Supabase Initialization Error:', error);
}

// Export safe client (might be null if failed)
export const supabase = client;