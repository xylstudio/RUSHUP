import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co').trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.key').trim();
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
