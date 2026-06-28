import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { sendLinePushToSupabaseUser } from '@/lib/server/lineMessaging'

export const dynamic = 'force-dynamic'

const createServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const generateOrderCode = () => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  return `ORD${timestamp}${random}`
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const orderId = asText(body?.orderId)
    const assignmentId = asText(body?.assignmentId)
    if (!orderId || !assignmentId) {
      return NextResponse.json({ error: 'Missing orderId/assignmentId' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: assignment, error: assignmentError } = await supabase
      .from('job_assignments')
      .select('id, order_id, staff_id')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    if (assignment.order_id !== orderId) {
      return NextResponse.json({ error: 'Assignment/order mismatch' }, { status: 400 })
    }

    if (assignment.staff_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const [{ data: order }, { data: report }, { data: staffProfile }] = await Promise.all([
      supabase
        .from('orders')
        .select('id, customer_id, order_code, service_id, house_id, houses(name), price_template_id, service_area, base_price, calculated_price, additional_services_price, total, total_price, pricing_period, priority, notes, preferred_time_start, preferred_time_end, total_sessions, completed_sessions')
        .eq('id', orderId)
        .single(),
      supabase
        .from('work_reports')
        .select('id, work_done, problems_found, recommendations, next_visit_date, next_visit_time_start, next_visit_time_end, next_visit_notes, before_photos, after_photos, zones, updated_at')
        .eq('job_assignment_id', assignmentId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('display_name')
        .eq('id', assignment.staff_id)
        .maybeSingle(),
    ])

    if (!order?.customer_id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    let serviceName = 'บริการดูแลสวน'
    if (order.service_id) {
      const { data: service } = await supabase
        .from('services')
        .select('service_name, name')
        .eq('id', order.service_id)
        .maybeSingle()
      serviceName = asText((service as any)?.service_name) || asText((service as any)?.name) || serviceName
    }

    const staffName = asText(staffProfile?.display_name) || 'ทีมงาน Xylem'
    let followUpOrderId: string | null = null
    let followUpOrderCode: string | null = null

    const nextVisitDate = asText(report?.next_visit_date)
    const nextVisitTimeStart = asText(report?.next_visit_time_start)
    const nextVisitTimeEnd = asText(report?.next_visit_time_end)
    const nextVisitNotes = asText(report?.next_visit_notes)

    if (nextVisitDate && order.house_id && order.service_id) {
      const { data: existingFollowUp } = await supabase
        .from('orders')
        .select('id, order_code')
        .eq('customer_id', order.customer_id)
        .eq('house_id', order.house_id)
        .eq('service_id', order.service_id)
        .eq('scheduled_date', nextVisitDate)
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingFollowUp?.id) {
        followUpOrderId = existingFollowUp.id
        followUpOrderCode = asText(existingFollowUp.order_code) || null
      } else {
        const followUpOrderCodeValue = generateOrderCode()
        const followUpNotes = nextVisitNotes || `นัดดูแลต่อเนื่องจากงาน #${asText(order.order_code) || order.id.slice(0, 8)}`
        const followUpSpecialInstructions = [
          'follow_up_source=work_report',
          `follow_up_from_order=${orderId}`,
          `follow_up_from_assignment=${assignmentId}`,
          `follow_up_report=${asText(report?.id) || 'unknown'}`,
          `payment_method=stripe`,
        ].join('\n')

        const { data: createdFollowUp, error: followUpError } = await supabase
          .from('orders')
          .insert({
            customer_id: order.customer_id,
            house_id: order.house_id,
            service_id: order.service_id,
            price_template_id: order.price_template_id || null,
            order_code: followUpOrderCodeValue,
            service_area: order.service_area || 0,
            base_price: order.base_price || 0,
            calculated_price: order.calculated_price || 0,
            additional_services_price: order.additional_services_price || 0,
            total: order.total || order.total_price || 0,
            total_price: order.total_price || order.total || 0,
            pricing_period: order.pricing_period || 'one-time',
            notes: followUpNotes,
            special_instructions: followUpSpecialInstructions,
            preferred_time_start: nextVisitTimeStart || order.preferred_time_start || null,
            preferred_time_end: nextVisitTimeEnd || order.preferred_time_end || null,
            priority: order.priority || 'normal',
            status: 'confirmed',
            scheduled_date: nextVisitDate,
            total_sessions: order.total_sessions || null,
            completed_sessions: order.completed_sessions || 0,
          })
          .select('id, order_code')
          .single()

        if (followUpError) {
          await supabase.from('audit_logs').insert({
            user_id: user.id,
            user_email: user.email,
            action: 'follow_up_order_create_failed',
            details: {
              context: 'api.staff.work-reports.notify-customer',
              order_id: orderId,
              assignment_id: assignmentId,
              next_visit_date: nextVisitDate,
              error: followUpError.message,
            },
          })
        } else if (createdFollowUp?.id) {
          followUpOrderId = createdFollowUp.id
          followUpOrderCode = asText(createdFollowUp.order_code) || null

          await supabase.from('notifications').insert([
            {
              user_id: order.customer_id,
              title: 'สร้างนัดดูแลครั้งถัดไปแล้ว',
              message: `ระบบสร้างงานดูแลครั้งถัดไป${followUpOrderCode ? ` #${followUpOrderCode}` : ''} สำหรับวันที่ ${nextVisitDate}${nextVisitTimeStart ? ` เวลา ${nextVisitTimeStart.slice(0, 5)}` : ''}`,
              type: 'info',
              related_order_id: createdFollowUp.id,
              read: false,
              notification_category: 'order_status',
            },
            {
              user_id: user.id,
              title: 'สร้างงาน follow-up สำเร็จ',
              message: `สร้างงานดูแลครั้งถัดไป${followUpOrderCode ? ` #${followUpOrderCode}` : ''} จากรายงานของงาน ${asText(order.order_code) || order.id.slice(0, 8)} แล้ว`,
              type: 'success',
              related_order_id: createdFollowUp.id,
              read: false,
              notification_category: 'system',
            },
          ])
        }
      }
    }

    const thaiDate = nextVisitDate 
      ? new Date(nextVisitDate).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })
      : ''
      
    const message = followUpOrderId
      ? `${staffName} ส่งรายงานหลังจบงานเรียบร้อยแล้ว พร้อมสร้างนัดดูแลครั้งถัดไปวันที่ ${thaiDate}${nextVisitTimeStart ? ` เวลา ${nextVisitTimeStart.slice(0, 5)} น.` : ''} ให้คุณแล้ว`
      : `${staffName} ส่งรายงานหลังจบงานเรียบร้อยแล้ว กรุณาตรวจสอบรายละเอียด รูปก่อน-หลัง และตอบกลับได้ทันที`

    await supabase.from('notifications').insert({
      user_id: order.customer_id,
      title: 'รายงานหลังจบงานพร้อมแล้ว',
      message,
      type: 'success',
      related_order_id: orderId,
      read: false,
      notification_category: 'order_status',
    })

    // Re-fetch the order just before sending LINE push to ensure we have the fresh session count
    const { data: finalOrder } = await supabase
      .from('orders')
      .select('completed_sessions, total_sessions')
      .eq('id', orderId)
      .single()

    // Fetch house collaborators
    const { data: collaborators } = await supabase
      .from('house_collaborators')
      .select('user_id')
      .eq('house_id', order.house_id)

    const collaboratorIds = collaborators?.map((c: any) => c.user_id) || []
    
    // Unique list of user IDs to notify (Customer + Collaborators)
    const targetUserIds = Array.from(new Set([order.customer_id, ...collaboratorIds].filter(Boolean)))

    let mainLineResult: any = null

    // Send LINE Push to everyone
    for (const targetUserId of targetUserIds) {
      const result = await sendLinePushToSupabaseUser(supabase, targetUserId, {
        title: 'รายงานหลังจบงานพร้อมแล้ว',
        message,
        appBaseUrl: req.nextUrl.origin,
        category: 'order_status',
        lineReport: {
          orderId,
          reportId: asText(report?.id),
          orderCode: asText(order.order_code),
          serviceName,
          staffName,
          houseName: Array.isArray(order.houses) ? asText(order.houses[0]?.name) : asText((order.houses as any)?.name) || 'ไม่ระบุชื่อบ้าน',
          completedAt: asText(report?.updated_at) || new Date().toISOString(),
          workDone: asText(report?.work_done),
          problemsFound: asText(report?.problems_found),
          recommendations: asText(report?.recommendations),
          nextVisitDate: asText(report?.next_visit_date),
          nextVisitTimeStart: asText(report?.next_visit_time_start),
          nextVisitTimeEnd: asText(report?.next_visit_time_end),
          nextVisitNotes: asText(report?.next_visit_notes),
          beforePhotos: Array.isArray(report?.before_photos) ? report.before_photos : [],
          afterPhotos: Array.isArray(report?.after_photos) ? report.after_photos : [],
          zones: Array.isArray(report?.zones) ? report.zones : [],
          visitCountText: (finalOrder?.total_sessions || order.total_sessions) 
            ? `${finalOrder?.completed_sessions || 0}/${finalOrder?.total_sessions || order.total_sessions}` 
            : null,
          pricingPeriod: order.pricing_period || 'one-time',
          followUpOrderId: followUpOrderId,
        },
      })
      if (targetUserId === order.customer_id) {
        mainLineResult = result
      }
    }

    const lineResult = mainLineResult || { delivered: false, reason: 'No customer ID' }

    if (followUpOrderId) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'follow_up_order_created_from_work_report',
        details: {
          context: 'api.staff.work-reports.notify-customer',
          source_order_id: orderId,
          assignment_id: assignmentId,
          report_id: asText(report?.id),
          follow_up_order_id: followUpOrderId,
          follow_up_order_code: followUpOrderCode,
          next_visit_date: nextVisitDate,
        },
      })
    }

    if (!lineResult.delivered) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'line_customer_report_delivery_failed',
        details: {
          context: 'api.staff.work-reports.notify-customer',
          target_user_id: order.customer_id,
          order_id: orderId,
          assignment_id: assignmentId,
          reason: lineResult.reason || 'unknown',
          error: lineResult.error || null,
        },
      })
    }

    return NextResponse.json({ success: true, line: lineResult, followUpOrderId, followUpOrderCode })
  } catch (error) {
    console.error('POST /api/staff/work-reports/notify-customer error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}