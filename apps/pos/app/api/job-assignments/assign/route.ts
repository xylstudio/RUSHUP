import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { sendLinePushToSupabaseUser } from '@/lib/server/lineMessaging'

export const dynamic = 'force-dynamic'

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

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

    const body = await req.json().catch(() => ({}))
    const orderId = asText(body?.orderId)
    const staffId = asText(body?.staffId)
    const note = asText(body?.note)
    const serviceName = asText(body?.serviceName) || 'บริการ'
    const scheduledDate = asText(body?.scheduledDate)

    if (!orderId || !staffId) {
      return NextResponse.json({ error: 'orderId and staffId are required' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', requestUser.id)
      .maybeSingle()

    if ((requesterProfile?.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, status')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || 'Order not found' }, { status: 404 })
    }

    const { data: existingAssignment } = await supabase
      .from('job_assignments')
      .select('id, status')
      .eq('order_id', orderId)
      .in('status', ['assigned', 'accepted', 'in_progress'])
      .maybeSingle()

    if (existingAssignment) {
      return NextResponse.json({ error: 'Order already has an active assignment' }, { status: 409 })
    }

    const now = new Date().toISOString()
    if (String(order.status || '').toLowerCase() === 'pending') {
      await supabase.from('orders').update({ status: 'confirmed', updated_at: now }).eq('id', orderId)
    }

    const { data: assignment, error: insertError } = await supabase
      .from('job_assignments')
      .insert({
        order_id: orderId,
        staff_id: staffId,
        status: 'assigned',
        notes: note || null,
        assigned_at: now,
      })
      .select('id, order_id, staff_id, status, assigned_at')
      .single()

    if (insertError || !assignment) {
      return NextResponse.json({ error: insertError?.message || 'Insert failed' }, { status: 500 })
    }

    const title = 'มีงานใหม่เข้าระบบ'
    const message = scheduledDate
      ? `คุณได้รับมอบหมายงาน: ${serviceName} (${new Date(scheduledDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })})`
      : `คุณได้รับมอบหมายงาน: ${serviceName}`

    if (order.customer_id) {
      await supabase.from('notifications').insert({
        user_id: order.customer_id,
        title: 'กำหนดผู้ดูแลงานแล้ว',
        message: scheduledDate
          ? `ทีมงานกำลังเตรียมเข้าดูแลบริการ ${serviceName} ในวันที่ ${new Date(scheduledDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`
          : `ทีมงานกำลังเตรียมเข้าดูแลบริการ ${serviceName}`,
        type: 'info',
        related_order_id: orderId,
        read: false,
      })
    }

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: staffId,
        title,
        message,
        type: 'info',
        related_order_id: orderId,
        read: false,
      })
      .select('id')
      .single()

    if (notificationError) {
      await supabase.from('audit_logs').insert({
        user_id: requestUser.id,
        user_email: requestUser.email,
        action: 'job_assignment_notification_failed',
        details: {
          context: 'api.job-assignments.assign',
          reason: 'notification_insert_failed',
          error: notificationError.message,
          assignment_id: assignment.id,
          order_id: orderId,
          staff_id: staffId,
        },
      })

      return NextResponse.json({ error: notificationError.message }, { status: 500 })
    }

    const lineResult = await sendLinePushToSupabaseUser(supabase, staffId, {
      title,
      message,
      category: 'job_assigned',
      lineAction: {
        type: 'accept_job_assignment',
        job_assignment_id: assignment.id,
        order_id: orderId,
        service_name: serviceName,
        scheduled_date: scheduledDate || null,
      },
      appBaseUrl: req.nextUrl.origin,
    })

    await supabase.from('audit_logs').insert({
      user_id: requestUser.id,
      user_email: requestUser.email,
      action: lineResult.delivered ? 'job_assignment_notification_sent' : 'line_notification_delivery_failed',
      details: lineResult.delivered
        ? {
            context: 'api.job-assignments.assign',
            assignment_id: assignment.id,
            notification_id: notification?.id || null,
            order_id: orderId,
            staff_id: staffId,
          }
        : {
            context: 'api.job-assignments.assign',
            assignment_id: assignment.id,
            notification_id: notification?.id || null,
            order_id: orderId,
            target_user_id: staffId,
            reason: lineResult.reason || 'unknown',
            error: lineResult.error || null,
          },
    })

    return NextResponse.json({
      success: true,
      assignment,
      notification,
      line: {
        delivered: lineResult.delivered,
        reason: lineResult.reason || null,
      },
    })
  } catch (error) {
    console.error('POST /api/job-assignments/assign error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
