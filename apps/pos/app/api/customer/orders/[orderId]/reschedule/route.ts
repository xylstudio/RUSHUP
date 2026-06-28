import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { executeCustomerReschedule } from '@/lib/server/orderReschedule'
import { sendServiceAppointmentFlex } from '@/lib/line'
import { resolveLineUserIdBySupabaseUserId } from '@/lib/server/lineMessaging'
import { formatDateByLocale } from '@/lib/localeFormat'

export const dynamic = 'force-dynamic'

function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const orderId = params.orderId
  
  try {
    const requestUser = await resolveRequestUser(req)
    const body = await req.json()
    console.log('[Reschedule API] orderId:', orderId, 'body:', body)

    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const scheduledDate = typeof body?.scheduled_date === 'string' ? body.scheduled_date.trim() : ''
    const preferredTimeStart = typeof body?.preferred_time_start === 'string' ? body.preferred_time_start.trim() : ''
    const preferredTimeEnd = typeof body?.preferred_time_end === 'string' ? body.preferred_time_end.trim() : ''
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : ''

    if (!scheduledDate || !reason) {
      return NextResponse.json({ error: 'Missing scheduled_date or reason' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    
    const result = await executeCustomerReschedule({
      supabase,
      orderId,
      actorCustomerId: requestUser.id,
      scheduledDate,
      preferredTimeStart,
      preferredTimeEnd,
      reason,
      notes,
    })

    if (!result.ok) {
      return NextResponse.json({ error: `${result.error} (Order ID: ${orderId})` }, { status: result.status })
    }

    // 2. Notify the customer via LINE using the modern notification system
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('*, services:service_id(service_name), houses:house_id(name)')
        .eq('id', orderId)
        .maybeSingle()
  
      if (order) {
        const serviceName = (order.services as any)?.service_name || 'บริการดูแลสวน'
        const houseName = (order.houses as any)?.name || 'ไม่ระบุชื่อบ้าน'
        
        // Calculate session counts with fallback
        const dbTotalSessions = order.total_sessions || 0
        const pricingPeriodDefault = order.pricing_period === 'yearly' ? 24 : (order.pricing_period === 'monthly' ? 2 : 1)
        const totalSessions = dbTotalSessions > 1 ? dbTotalSessions : pricingPeriodDefault
        const completedSessions = order.completed_sessions || 0
        const currentSession = Math.min(completedSessions + 1, totalSessions)
        
        const lineUserId = await resolveLineUserIdBySupabaseUserId(supabase, order.customer_id)
        if (lineUserId) {
          const dateText = formatDateByLocale(new Date(scheduledDate), 'th')
          
          await sendServiceAppointmentFlex(lineUserId, {
            customerName: 'ลูกค้า',
            serviceName,
            scheduledDate: dateText,
            orderId: String(orderId),
            customerId: order.customer_id,
            houseId: order.house_id,
            houseName,
            type: 'reschedule',
            sessionNumber: currentSession,
            totalSessions,
            appBaseUrl: req.nextUrl.origin
          }).catch(e => console.error('[Reschedule API] Standard LINE notification failed', e))
        }
      }
    } catch (notifyError) {
      console.error('[Reschedule API] Unexpected error in LINE notification flow:', notifyError)
    }

    return NextResponse.json({ success: true, appointment: result.appointment })
  } catch (error: any) {
    console.error('Error customer rescheduling order:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
