import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

const createServiceClient = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// GET /api/notifications - list current user's notifications (latest first)
export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit') || '50')

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100))

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ notifications: data || [] })
  } catch (err) {
    console.error('GET /api/notifications error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/notifications - create a notification for the current user
export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    const body = await req.json()
    const { title, message, type, data } = body || {}
    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const insertPayload = {
      user_id: user.id,
      title: title || null,
      message,
      type: type || null,
      data: data || null
    }

    const { data: inserted, error } = await supabase
      .from('notifications')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ notification: inserted, success: true })
  } catch (err) {
    console.error('POST /api/notifications error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH /api/notifications - mark as read (ids[])
export async function PATCH(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    const body = await req.json()
    const ids: string[] = body?.ids || []
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids[] required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', user.id)
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, updated: data?.length || 0 })
  } catch (err) {
    console.error('PATCH /api/notifications error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
