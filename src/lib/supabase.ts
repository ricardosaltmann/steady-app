import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  'https://ewslwtswpetkgpkndzud.supabase.co'
).trim();

// Remove /rest/v1 or trailing slashes if present
export const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3c2x3dHN3cGV0a2dwa25kenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMjgwMzIsImV4cCI6MjEwNDgwNDAzMn0.HiqVU7jCGXzc_xRhwuLXGRctI5kisXhg8q_L-tdcBQw'
).trim();

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.length > 0 &&
    supabaseUrl.startsWith('http') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 0 &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseUrl.includes('your-project-id')
  );
};

// Create Supabase client conditionally or with dummy values for offline fallback
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
