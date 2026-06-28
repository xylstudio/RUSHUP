import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Use service role on server to avoid exposing write capability through anon RLS
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseClient()

    const body = await req.json()
    const { full_name, email, phone, topic, date, start_time, end_time, notes, honeypot } = body || {}

    // Basic validation
    if (honeypot) return NextResponse.json({ success: true })
    if (!full_name || !email || !date || !start_time || !end_time) {
      return NextResponse.json({ error: 'กรอกข้อมูลไม่ครบ' }, { status: 400 })
    }

    // Simple email check
    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'อีเมลไม่ถูกต้อง' }, { status: 400 })
    }

    // Insert booking
    const { data, error } = await supabase
      .from('workshop_bookings')
      .insert({
        full_name,
        email,
        phone: phone || null,
        topic: topic || null,
        date,
        start_time,
        end_time,
        notes: notes || null,
        status: 'pending'
      })
      .select('id, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, booking: data })
  } catch (err) {
    console.error('POST /api/workshops/book error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
