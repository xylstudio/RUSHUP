import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendLinePushToOrderStakeholders } from '@/lib/server/lineMessaging'
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

export async function POST(req: NextRequest) {
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

    // Calculate tomorrow's date in YYYY-MM-DD
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    // Fetch orders scheduled for tomorrow
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, profiles:customer_id(display_name, email), services:service_id(service_name), houses:house_id(name)')
      .eq('scheduled_date', tomorrowStr)
      .in('status', ['pending', 'confirmed'])
      
    if (error) throw error
    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No orders scheduled for tomorrow' })
    }

    const results = await Promise.all(orders.map(async (order) => {
      const customerId = order.customer_id
      const customerProfile = (order.profiles as any)
      const customerName = customerProfile?.display_name || 'ลูกค้า'
      const serviceName = (order.services as any)?.service_name || 'บริการดูแลสวน'
      const houseName = (order.houses as any)?.name || 'ไม่ระบุชื่อบ้าน'
      
      const title = 'แจ้งเตือนนัดหมายวันพรุ่งนี้'
      const messageBody = `คุณมีนัดบริการ ${serviceName} ที่ ${houseName} ในวันพรุ่งนี้ครับ`

      try {
        // In-app notification for owner
        await supabase.from('notifications').insert({
          user_id: customerId,
          title,
          message: messageBody,
          type: 'info',
          related_order_id: order.id,
          read: false,
          notification_category: 'order_status'
        })
        
        // LINE notification to owner + all collaborators
        await sendLinePushToOrderStakeholders(supabase, order.house_id, customerId, {
          title,
          message: messageBody,
          appBaseUrl: req.nextUrl.origin,
          category: 'order_status',
          newServicePlanInfo: {
            serviceName,
            houseName,
            scheduledDate: order.scheduled_date,
            orderId: order.id,
            orderCode: order.order_code,
            pricingPeriod: order.pricing_period,
            totalSessions: order.total_sessions,
            totalPrice: order.total_price || order.total || 0,
          }
        })
        
        return { orderId: order.id, success: true }
      } catch (err) {
        console.error(`Failed to notify for order ${order.id}`, err)
        return { orderId: order.id, success: false, error: err }
      }
    }))

    return NextResponse.json({ 
      success: true, 
      count: orders.length,
      processed: results 
    })
    
  } catch (error: any) {
    console.error('Reminder API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
