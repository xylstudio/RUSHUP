import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

const createSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function GET(req: NextRequest) {
  try {
    const requestUser = await resolveRequestUser(req)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()

    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, status, scheduled_date')
      .eq('customer_id', requestUser.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    const orderIds = (orders || []).map((order: any) => order.id)
    if (orderIds.length === 0) {
      return NextResponse.json({ success: true, progress: {} })
    }

    const { data: assignments, error: assignmentError } = await supabase
      .from('job_assignments')
      .select(`
        id,
        order_id,
        status,
        assigned_at,
        accepted_at,
        staff_id,
        profiles!job_assignments_staff_id_fkey(display_name, phone)
      `)
      .in('order_id', orderIds)
      .order('assigned_at', { ascending: false })

    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 500 })
    }

    const latestByOrder = new Map<string, any>()
    for (const row of assignments || []) {
      if (!latestByOrder.has(row.order_id)) {
        latestByOrder.set(row.order_id, row)
      }
    }

    const progress: Record<string, any> = {}
    for (const order of orders || []) {
      const assignment = latestByOrder.get(order.id)
      progress[order.id] = {
        order_status: order.status,
        is_assigned: Boolean(assignment),
        assignment_status: assignment?.status || null,
        assigned_at: assignment?.assigned_at || null,
        accepted_at: assignment?.accepted_at || null,
        staff_name: assignment?.profiles?.display_name || null,
        staff_phone: assignment?.profiles?.phone || null,
      }
    }

    return NextResponse.json({ success: true, progress })
  } catch (error) {
    console.error('GET /api/customer/orders/progress error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
