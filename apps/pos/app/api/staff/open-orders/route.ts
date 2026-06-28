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

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

async function ensureStaffRole(supabase: ReturnType<typeof createSupabaseServiceClient>, userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, display_name, email, branch_code')
    .eq('id', userId)
    .maybeSingle()

  if (error || !profile) return null

  const role = String(profile.role || '').toLowerCase()
  if (role !== 'staff' && role !== 'admin') return null
  return profile
}

export async function GET(req: NextRequest) {
  try {
    const requestUser = await resolveRequestUser(req)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()
    const staffProfile = await ensureStaffRole(supabase, requestUser.id)
    if (!staffProfile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_code,
        status,
        total,
        scheduled_date,
        created_at,
        notes,
        special_instructions,
        service_id,
        house_id,
        services (service_name),
        houses!orders_house_id_fkey (name, address, branch_code, latitude, longitude, house_code),
        profiles!orders_customer_id_fkey (display_name, phone)
      `)
      .in('status', ['pending', 'confirmed'])
      .order('created_at', { ascending: true })
      .limit(40)

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    const orderIds = (orders || []).map((order: any) => order.id)
    if (orderIds.length === 0) {
      return NextResponse.json({ success: true, orders: [] })
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from('job_assignments')
      .select('id, order_id, status')
      .in('order_id', orderIds)

    if (assignmentsError) {
      return NextResponse.json({ error: assignmentsError.message }, { status: 500 })
    }

    const busyStatuses = new Set(['assigned', 'accepted', 'in_progress'])
    const assignedOrderIds = new Set(
      (assignments || [])
        .filter((item: any) => busyStatuses.has(String(item.status || '').toLowerCase()))
        .map((item: any) => item.order_id)
    )

    const filteredOrders = (orders || []).filter((order: any) => {
      // 1. Skip if already assigned or in progress
      if (assignedOrderIds.has(order.id)) return false
      
      // 2. Admins see EVERYTHING in the queue
      const profileData = Array.isArray(staffProfile) ? staffProfile[0] : staffProfile
      const isAdmin = profileData?.role === 'admin'
      if (isAdmin) return true
      
      // 3. For Staff, check branch code match
      const staffBranchCode = (profileData?.branch_code || '').toString().trim()
      
      // Handle houses being an object or an array
      const houseData = Array.isArray(order?.houses) ? order.houses[0] : order?.houses
      const orderBranchCode = (houseData?.branch_code || '').toString().trim()
      
      // STRICT FILTERING: Only show if branch codes match
      // If order has no branch code, hide it from branch-specific staff (as requested)
      return orderBranchCode === staffBranchCode
    })

    return NextResponse.json({ success: true, orders: filteredOrders })
  } catch (error) {
    console.error('GET /api/staff/open-orders error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const requestUser = await resolveRequestUser(req)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const orderId = asText(body?.orderId)
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const staffProfile = await ensureStaffRole(supabase, requestUser.id)
    if (!staffProfile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_code, status, customer_id, service_id, scheduled_date, services(service_name), houses!orders_house_id_fkey(branch_code)')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || 'Order not found' }, { status: 404 })
    }

    if (!['pending', 'confirmed'].includes(String(order.status || '').toLowerCase())) {
      return NextResponse.json({ error: 'Order is not available for claim' }, { status: 409 })
    }

    const role = String(staffProfile.role || '').toLowerCase()
    const staffBranchCode = String((staffProfile as any).branch_code || '').trim()
    const orderBranchCode = String((order as any)?.houses?.branch_code || '').trim()

    if (role === 'staff' && staffBranchCode && orderBranchCode && staffBranchCode !== orderBranchCode) {
      return NextResponse.json({ error: 'Order is in another branch' }, { status: 403 })
    }

    const { data: existingAssignment } = await supabase
      .from('job_assignments')
      .select('id, staff_id, status')
      .eq('order_id', orderId)
      .in('status', ['assigned', 'accepted', 'in_progress'])
      .maybeSingle()

    if (existingAssignment) {
      return NextResponse.json({ error: 'Order already claimed', reason: 'already_claimed' }, { status: 409 })
    }

    const now = new Date().toISOString()

    if (String(order.status).toLowerCase() === 'pending') {
      await supabase.from('orders').update({ status: 'confirmed', updated_at: now }).eq('id', orderId)
    }

    const { data: assignment, error: insertError } = await supabase
      .from('job_assignments')
      .insert({
        order_id: orderId,
        staff_id: requestUser.id,
        status: 'accepted',
        assigned_at: now,
        accepted_at: now,
      })
      .select('id, order_id, staff_id, status, accepted_at')
      .single()

    if (insertError || !assignment) {
      return NextResponse.json({ error: insertError?.message || 'Claim failed' }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      user_id: requestUser.id,
      user_email: requestUser.email,
      action: 'staff_claimed_order',
      details: {
        context: 'api.staff.open-orders.claim',
        order_id: orderId,
        assignment_id: assignment.id,
      },
    })

    if (order.customer_id) {
      await supabase.from('notifications').insert({
        user_id: order.customer_id,
        title: 'มีพนักงานรับงานแล้ว',
        message: `${staffProfile.display_name || 'พนักงาน'} รับงานของคุณแล้ว กำลังเตรียมเข้าดำเนินการ`,
        type: 'success',
        related_order_id: orderId,
        read: false,
      })
    }

    return NextResponse.json({ success: true, assignment })
  } catch (error) {
    console.error('POST /api/staff/open-orders error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
