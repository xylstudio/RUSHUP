import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendLinePushToSupabaseUser } from '@/lib/server/lineMessaging'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

const asSafeText = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const userId = asSafeText(body?.userId)
    const message = asSafeText(body?.message)
    const title = asSafeText(body?.title)

    if (!userId || !message) {
      return NextResponse.json({ error: 'userId and message are required' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    const canNotifySelf = user.id === userId
    if (!canNotifySelf) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }

      const role = (profile?.role || '').toLowerCase()
      if (role !== 'admin' && role !== 'staff') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const lineResult = await sendLinePushToSupabaseUser(supabase, userId, {
      title: title || null,
      message,
    })

    return NextResponse.json({
      success: lineResult.delivered,
      delivered: lineResult.delivered,
      reason: lineResult.reason || null,
      error: lineResult.error || null,
    })
  } catch (error) {
    console.error('POST /api/notifications/line error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
