import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getRequestId, getRequestIpAddress, recordAuditLog } from '@/lib/server/compliance'

export const dynamic = 'force-dynamic'

// GET /api/payments - list current user's payments
export async function GET(req: NextRequest) {
  const requestId = getRequestId(req.headers)
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 })

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message, requestId }, { status: 500 })
    return NextResponse.json({ payments: data || [], requestId })
  } catch (err) {
    console.error('GET /api/payments error', err)
    return NextResponse.json({ error: 'Server error', requestId }, { status: 500 })
  }
}

// POST /api/payments - create a test payment record (simulated paid)
export async function POST(req: NextRequest) {
  const requestId = getRequestId(req.headers)
  const ipAddress = getRequestIpAddress(req.headers)
  const userAgent = req.headers.get('user-agent')

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 })

    const body = await req.json()
    const { order_id, amount, currency } = body || {}
    if (!amount) return NextResponse.json({ error: 'amount required', requestId }, { status: 400 })

    const now = new Date().toISOString()
    const payload = {
      order_id: order_id || null,
      user_id: user.id,
      provider: 'test',
      provider_charge_id: `test_${Date.now()}`,
      amount: Number(amount),
      currency: currency || 'THB',
      status: 'paid',
      paid_at: now
    }

    const { data, error } = await supabase
      .from('payments')
      .insert(payload)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message, requestId }, { status: 500 })

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'payment_record_created',
      ipAddress,
      userAgent,
      requestId,
      details: {
        context: 'api.payments.post',
        payment_id: data.id,
        order_id: order_id || null,
        provider: payload.provider,
        amount: payload.amount,
        currency: payload.currency,
        status: payload.status,
      },
    })

    return NextResponse.json({ payment: data, success: true, requestId })
  } catch (err) {
    console.error('POST /api/payments error', err)
    return NextResponse.json({ error: 'Server error', requestId }, { status: 500 })
  }
}
