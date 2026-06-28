import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { toThaiDate, resolveLineUserIdBySupabaseUserId } from '@/lib/server/lineMessaging'
import { sendServiceAppointmentFlex } from '@/lib/line'

export const dynamic = 'force-dynamic'

const createSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id
  
  try {
    const requestUser = await resolveRequestUser(req)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()
    
    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', requestUser.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { newDate, reason } = body

    if (!newDate) {
      return NextResponse.json({ error: 'Missing newDate' }, { status: 400 })
    }

    // Fetch order details for notification
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, services:service_id(service_name), houses:house_id(name)')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    // Update the scheduled_date
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        scheduled_date: newDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) throw updateError

    // Notifications
    const customerId = order.customer_id
    const customerProfile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles
    const customerName = (customerProfile as any)?.display_name || 'ลูกค้า'
    
    const serviceInfo = Array.isArray(order.services) ? order.services[0] : order.services
    const serviceName = (serviceInfo as any)?.service_name || (serviceInfo as any)?.name || 'บริการดูแลสวน'
    
    const houseInfo = Array.isArray(order.houses) ? order.houses[0] : order.houses
    const houseName = (houseInfo as any)?.name || 'ไม่ระบุชื่อบ้าน'
    // Calculate session counts with fallback
    const dbTotalSessions = order.total_sessions || 0
    const pricingPeriodDefault = order.pricing_period === 'yearly' ? 24 : (order.pricing_period === 'monthly' ? 2 : 1)
    const totalSessions = dbTotalSessions > 1 ? dbTotalSessions : pricingPeriodDefault
    const completedSessions = order.completed_sessions || 0
    const currentSession = Math.min(completedSessions + 1, totalSessions)
    
    // Fetch house stakeholders
    const targetUserIds = new Set<string>()
    if (customerId) targetUserIds.add(customerId)
    if (order.house_id) {
      const { data: collaborators } = await supabase
        .from('house_collaborators')
        .select('user_id')
        .eq('house_id', order.house_id)
      if (collaborators) {
        collaborators.forEach((c) => {
          if (c.user_id) targetUserIds.add(c.user_id)
        })
      }
    }
    
    for (const tUserId of targetUserIds) {
      // Resolve LINE ID and send modern notification
      const lineUserId = await resolveLineUserIdBySupabaseUserId(supabase, tUserId)
      
      if (lineUserId) {
        await sendServiceAppointmentFlex(lineUserId, {
          customerName,
          serviceName,
          scheduledDate: toThaiDate(newDate) || newDate,
          orderId: String(orderId),
          customerId: String(tUserId), // Pass specific user ID for correct routing
          houseId: order.house_id,
          houseName,
          type: 'reschedule',
          customLabel: 'ทีมงานได้ทำการเปลี่ยนวันนัดหมาย',
          sessionNumber: currentSession,
          totalSessions,
          appBaseUrl: req.nextUrl.origin
        }).catch(e => console.error('Standard LINE notification failed', e))
      } else {
        console.warn(`Cannot send LINE notification: No linked LINE account for user ${tUserId}`)
      }
    }
    


    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error rescheduling order:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
