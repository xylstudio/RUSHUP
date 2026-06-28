import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { sendLinePushToSupabaseUser, toThaiDate } from '@/lib/server/lineMessaging'

export const dynamic = 'force-dynamic'

const createSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function PUT(
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

    // Fetch original order for comparison and customer info
    const { data: originalOrder } = await supabase
      .from('orders')
      .select('*, profiles:customer_id(display_name, email), services:service_id(service_name), houses:house_id(name)')
      .eq('id', orderId)
      .maybeSingle()

    const body = await req.json()
    const {
      houseId,
      serviceId,
      pricingPeriod,
      sessionsPerPeriod,
      totalSessions,
      completedSessions,
      scheduledDate,
      priority,
      paymentMethod,
      manualTotalPrice
    } = body

    const updateData: any = {
      house_id: houseId,
      service_id: serviceId,
      pricing_period: pricingPeriod,
      sessions_per_period: sessionsPerPeriod,
      total_sessions: totalSessions,
      completed_sessions: completedSessions,
      scheduled_date: scheduledDate,
      priority: priority || 'normal',
      updated_at: new Date().toISOString()
    }

    if (manualTotalPrice !== undefined) {
      updateData.calculated_price = manualTotalPrice
      updateData.total_price = manualTotalPrice
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (updateError) throw updateError

    // Notifications
    if (originalOrder) {
      const customerId = originalOrder.customer_id
      // Defensive data extraction for profiles and houses
      const profilesData = originalOrder.profiles
      const customerProfile = Array.isArray(profilesData) ? profilesData[0] : profilesData
      const customerName = (customerProfile as any)?.display_name || 'ลูกค้า'
      
      const housesData = originalOrder.houses
      const houseInfo = Array.isArray(housesData) ? housesData[0] : housesData
      const houseName = (houseInfo as any)?.name || 'ไม่ระบุชื่อบ้าน'

      const servicesData = originalOrder.services
      const serviceInfo = Array.isArray(servicesData) ? servicesData[0] : servicesData
      const serviceName = (serviceInfo as any)?.service_name || 'บริการดูแลสวน'

      // Improved date comparison: Compare only the YYYY-MM-DD part
      const oldDateStr = originalOrder.scheduled_date ? new Date(originalOrder.scheduled_date).toISOString().split('T')[0] : ''
      const newDateStr = scheduledDate ? new Date(scheduledDate).toISOString().split('T')[0] : ''
      const isReschedule = oldDateStr !== newDateStr
      
      const title = isReschedule ? 'มีการเลื่อนนัดหมายบริการ' : 'มีการปรับปรุงแผนบริการของคุณ'
      const message = isReschedule 
        ? `ทีมงานได้เลื่อนนัด ${serviceName} สำหรับ${houseName} เป็นวันที่ ${toThaiDate(scheduledDate) || scheduledDate}`
        : `ทีมงานได้ปรับปรุงรายละเอียดแผน ${serviceName} ของคุณแล้ว`

      // Execute notifications
      const notificationPromises = [
        supabase.from('notifications').insert({
          user_id: customerId,
          title,
          message,
          type: 'info',
          related_order_id: orderId,
          read: false,
          notification_category: 'order_status',
        })
      ]

      // LINE Notification (Unified System)
      // Fetch house stakeholders
      const targetUserIds = new Set<string>()
      if (customerId) targetUserIds.add(customerId)
      if (houseId) {
        const { data: collaborators } = await supabase
          .from('house_collaborators')
          .select('user_id')
          .eq('house_id', houseId)
        if (collaborators) {
          collaborators.forEach((c) => {
            if (c.user_id) targetUserIds.add(c.user_id)
          })
        }
      }

      if (isReschedule) {
        const { sendServiceAppointmentFlex } = await import('@/lib/line')
        const { resolveLineUserIdBySupabaseUserId } = await import('@/lib/server/lineMessaging')
        
        const dbTotalSessions = totalSessions || order.total_sessions || 0
        const pricingPeriodDefault = pricingPeriod === 'yearly' ? 24 : (pricingPeriod === 'monthly' ? 2 : 1)
        const finalTotalSessions = dbTotalSessions > 1 ? dbTotalSessions : pricingPeriodDefault
        const currentSession = Math.min((completedSessions || order.completed_sessions || 0) + 1, finalTotalSessions)
        
        for (const tUserId of targetUserIds) {
          const lineUserId = await resolveLineUserIdBySupabaseUserId(supabase, tUserId)
          if (lineUserId) {
            await sendServiceAppointmentFlex(lineUserId, {
              customerName,
              serviceName,
              scheduledDate: toThaiDate(scheduledDate) || scheduledDate,
              orderId: String(orderId),
              customerId: String(tUserId), // pass actual recipient as customerId for actions
              houseId: houseId,
              houseName,
              type: 'reschedule',
              customLabel: 'ทีมงานได้ทำการเปลี่ยนวันนัดหมาย',
              sessionNumber: currentSession,
              totalSessions: finalTotalSessions,
              appBaseUrl: req.nextUrl.origin
            }).catch(e => console.error('Standard LINE notification failed', e))
          } else {
            console.warn(`Cannot send LINE notification: No linked LINE account for user ${tUserId}`)
          }
        }
      } else {
        // Fallback for non-reschedule
        const { sendLinePushToOrderStakeholders } = await import('@/lib/server/lineMessaging')
        const linePayload = {
          category: 'order_status',
          bypassPreferences: isReschedule,
          title,
          message,
          appBaseUrl: req.nextUrl.origin,
          rescheduleInfo: null,
          orderId: String(orderId)
        }

        notificationPromises.push(
          sendLinePushToOrderStakeholders(supabase, houseId, customerId, linePayload as any)
            .then(async (result) => {
              // Log the result to audit_logs for tracking
              await supabase.from('audit_logs').insert({
                user_id: customerId,
                action: 'line_notification_push_stakeholders',
                entity_type: 'order',
                entity_id: orderId,
                details: {
                  status: result.success ? 'success' : 'failed',
                  payload: linePayload,
                  results: result.results
                }
              })
              return result
            })
            .catch(async (e) => {
              console.error('LINE notification failed', e)
              await supabase.from('audit_logs').insert({
                user_id: customerId,
                action: 'line_notification_error',
                entity_type: 'order',
                entity_id: orderId,
                details: { error: String(e), payload: linePayload }
              })
              return null
            })
        )
      }

      await Promise.all(notificationPromises)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
