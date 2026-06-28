import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'

export function getSafeSupabaseConfig() {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  if (!rawUrl || !rawKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  if (!rawUrl.startsWith('http') || /placeholder-project\.supabase\.co/i.test(rawUrl) || /placeholder/i.test(rawKey)) {
    throw new Error('Supabase environment variables are invalid or still using placeholder values')
  }

  return {
    url: rawUrl,
    key: rawKey,
  }
}

export function createSafeClient() {
  const { url, key } = getSafeSupabaseConfig()
  return createSupabaseClient(url, key)
}

export function createSafeBrowserClient() {
  const { url, key } = getSafeSupabaseConfig()
  return createSupabaseBrowserClient(url, key)
}
