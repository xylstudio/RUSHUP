import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendLineNotification, sendServiceAppointmentFlex } from '@/lib/line'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

const createSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createClient(supabaseUrl!, serviceRoleKey!)
}

export async function POST(req: NextRequest) {
  try {
    const requestUser = await resolveRequestUser(req)
    if (!requestUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createSupabaseServiceClient()
    
    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', requestUser.id).single()
    if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const orderId = body.orderId || body.id
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

    console.log(`[SendSingleNotify] Fetching order ${orderId}`)

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, profiles:customer_id(display_name, email), services:service_id(service_name)')
      .eq('id', orderId)
      .maybeSingle()

    if (error) {
      console.error('[SendSingleNotify] DB Error:', error)
      throw new Error(`Database error: ${error.message}`)
    }
    
    if (!order) {
      console.error(`[SendSingleNotify] Order ${orderId} not found`)
      throw new Error('Order not found')
    }

    // Handle nested data correctly based on the select syntax above
    const customerProfile = (order.profiles as any)
    const customerName = customerProfile?.display_name || 'ลูกค้า'
    const customerEmail = customerProfile?.email || ''
    const serviceName = (order.services as any)?.service_name || 'บริการดูแลสวน'
    
    // Extract LINE ID from email if it's a LINE-based login
    const date = order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('th-TH') : 'ยังไม่ได้ระบุวันที่'
    
    const title = 'แจ้งเตือนนัดหมายบริการ'
    const messageBody = `คุณมีนัดบริการ ${serviceName} ในวันที่ ${date} ครับ`
    const lineMessage = `สวัสดีครับคุณ ${customerName}\n\nเราขอแจ้งยืนยันนัดหมายเข้าให้บริการ ${serviceName}\nในวันที่: ${date}\n\nคุณสามารถตรวจสอบรายละเอียดได้ผ่านเมนู "แผนบริการ" ครับ`

    // In-app for Owner
    await supabase.from('notifications').insert({
      user_id: order.customer_id,
      title,
      message: messageBody,
      type: 'info',
      related_order_id: orderId,
      read: false,
      notification_category: 'order_status'
    })
    
    // Find all collaborators
    const targetUserIds = new Set<string>()
    if (order.customer_id) targetUserIds.add(order.customer_id)
    
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
    
    // Fetch house name
    let houseName = 'ไม่ระบุชื่อบ้าน'
    if (order.house_id) {
      const { data: houseData } = await supabase.from('houses').select('name').eq('id', order.house_id).single()
      if (houseData?.name) houseName = houseData.name
    }
    
    // Send to LINE for all stakeholders
    const { resolveLineUserIdBySupabaseUserId } = await import('@/lib/server/lineMessaging')
    
    for (const tUserId of targetUserIds) {
      const lineUserId = await resolveLineUserIdBySupabaseUserId(supabase, tUserId)
      
      if (lineUserId) {
        await sendServiceAppointmentFlex(lineUserId, {
          customerName: tUserId === order.customer_id ? customerName : 'ลูกค้า',
          serviceName,
          scheduledDate: date,
          orderId,
          customerId: tUserId,
          houseId: order.house_id,
          houseName,
          type: 'appointment',
          sessionNumber: (order.completed_sessions || 0) + 1,
          totalSessions: order.total_sessions
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
