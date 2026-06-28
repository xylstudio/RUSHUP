import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const createSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

async function ensureStaffRole(supabase: any, userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error || !profile) return false

  const role = String(profile.role || '').toLowerCase()
  return role === 'staff' || role === 'admin'
}

export async function POST(req: NextRequest) {
  try {
    const requestUser = await resolveRequestUser(req)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()
    const isStaff = await ensureStaffRole(supabase, requestUser.id)
    if (!isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const points = Number(body?.points || 10)

    if (isNaN(points) || points <= 0) {
      return NextResponse.json({ error: 'Invalid points amount' }, { status: 400 })
    }

    // Generate a secure random token
    const token = crypto.randomBytes(16).toString('hex')

    const { data, error } = await supabase
      .from('pos_qr_reward_tokens')
      .insert({
        token,
        points,
        created_by: requestUser.id,
      })
      .select('token')
      .single()

    if (error) {
      console.error('Error generating QR token:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, token: data.token })
  } catch (error) {
    console.error('POST /api/pos/points/generate error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
