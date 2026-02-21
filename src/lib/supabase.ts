/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise fallback to the provided credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vatobulvhzgsagmjjeap.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdG9idWx2aHpnc2FnbWpqZWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NzQxMzAsImV4cCI6MjA4NzI1MDEzMH0.bef8lEhWlOspuJqzF9TO2maNFGx0qnelEQW3pM2oqkM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    // Use the global fetch directly. 
    // This avoids any potential issues with property assignment in sandboxed environments.
    fetch: globalThis.fetch,
  },
});
