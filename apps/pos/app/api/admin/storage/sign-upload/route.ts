import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

const createServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

const ensureAdmin = async (supabase: any, userId: string) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return String(profile?.role || '').toLowerCase() === 'admin'
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServiceClient()
    const isAdmin = await ensureAdmin(supabase, user.id)
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { path, bucket = 'work-reports' } = await req.json()
    if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

    // Create a signed upload URL using the service role (bypasses RLS)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path)

    if (error) {
      console.error('Failed to create signed upload URL:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
    })
  } catch (error) {
    console.error('POST /api/admin/storage/sign-upload error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
