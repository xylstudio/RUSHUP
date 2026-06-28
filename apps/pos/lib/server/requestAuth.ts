import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'

const getSupabaseUrl = () => {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return value
}

const getSupabaseAnonKey = () => {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!value) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return value
}

export const createSupabaseAnonServerClient = () => {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

const extractBearerToken = (req: NextRequest) => {
  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return ''
  return authHeader.slice(7).trim()
}

export const resolveRequestUser = async (req: NextRequest): Promise<User | null> => {
  const accessToken = extractBearerToken(req)

  if (accessToken) {
    const anonClient = createSupabaseAnonServerClient()
    const { data, error } = await anonClient.auth.getUser(accessToken)
    if (!error && data?.user) {
      return data.user
    }
  }

  const authClient = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await authClient.auth.getUser()

  return user ?? null
}
