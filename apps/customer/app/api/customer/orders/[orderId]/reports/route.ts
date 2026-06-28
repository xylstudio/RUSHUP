import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchCustomerReports } from '@/lib/customerReports'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

const createServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await resolveRequestUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = params
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const payload = await fetchCustomerReports(supabase, user.id, {
      orderId,
      limit: 10,
    })

    if (payload.reports.length === 0) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .eq('customer_id', user.id)
        .maybeSingle()

      if (orderError) {
        console.error('Customer order lookup failed:', orderError)
        return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
      }

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
    }

    return NextResponse.json({ success: true, ...payload })
  } catch (err) {
    console.error('GET /api/customer/orders/[orderId]/reports error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
