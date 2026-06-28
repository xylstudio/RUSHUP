import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const ALLOWED_EVENTS = new Set([
  'customer_reports_viewed',
  'admin_reports_viewed',
  'admin_reports_csv_exported',
  'work_report_submitted',
])

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const eventName = String(body?.eventName || '').trim()
    const payload = typeof body?.payload === 'object' && body?.payload ? body.payload : {}
    const path = String(body?.path || '').slice(0, 500)

    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ error: 'Invalid eventName' }, { status: 400 })
    }

    const { error } = await supabase.from('product_events').insert({
      user_id: user.id,
      event_name: eventName,
      payload,
      path: path || null,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/analytics/events error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
