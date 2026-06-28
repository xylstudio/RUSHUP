import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestId, getRequestIpAddress, recordAuditLog } from '@/lib/server/compliance'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { sendLinePushToSupabaseUser } from '@/lib/server/lineMessaging'

export const dynamic = 'force-dynamic'

function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const asBoolean = (value: unknown) => value === true

const parseLineCategory = (value: unknown) => {
  const category = asText(value)
  if (!category) return 'system'

  if (
    category === 'new_order' ||
    category === 'job_assigned' ||
    category === 'order_status' ||
    category === 'system'
  ) {
    return category
  }

  return 'system'
}

const parseLineAction = (value: unknown) => {
  if (!value || typeof value !== 'object') return null

  const raw = value as Record<string, unknown>
  const actionType = asText(raw.type)
  if (actionType !== 'accept_job_assignment') return null

  const jobAssignmentId = asText(raw.job_assignment_id)
  if (!jobAssignmentId) return null

  return {
    type: 'accept_job_assignment' as const,
    job_assignment_id: jobAssignmentId,
    order_id: asText(raw.order_id) || null,
    service_name: asText(raw.service_name) || null,
    scheduled_date: asText(raw.scheduled_date) || null,
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req.headers)
  const ipAddress = getRequestIpAddress(req.headers)
  const userAgent = req.headers.get('user-agent')

  try {
    const user = await resolveRequestUser(req)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))

    const targetUserId = asText(body?.user_id)
    const message = asText(body?.message)
    const title = asText(body?.title)
    const type = asText(body?.type) || 'info'
    const relatedOrderId = asText(body?.related_order_id)
    const relatedMeasurementId = asText(body?.related_measurement_id)
    const lineAction = parseLineAction(body?.line_action)
    const lineCategory = parseLineCategory(body?.notification_category)
    const suppressLine = asBoolean(body?.suppress_line)

    if (!targetUserId || !message) {
      return NextResponse.json({ error: 'user_id and message are required', requestId }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    if (targetUserId !== user.id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        return NextResponse.json({ error: profileError.message, requestId }, { status: 500 })
      }

      const role = (profile?.role || '').toLowerCase()
      if (role !== 'admin' && role !== 'staff') {
        return NextResponse.json({ error: 'Forbidden', requestId }, { status: 403 })
      }
    }

    const insertPayload = {
      user_id: targetUserId,
      message,
      title: title || null,
      type,
      related_order_id: relatedOrderId || null,
      related_measurement_id: relatedMeasurementId || null,
      read: false,
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message, requestId }, { status: 500 })
    }

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'notification_sent',
      ipAddress,
      userAgent,
      requestId,
      details: {
        context: 'api.notifications.send',
        target_user_id: targetUserId,
        notification_id: data.id,
        type,
        suppress_line: suppressLine,
        related_order_id: relatedOrderId || null,
        related_measurement_id: relatedMeasurementId || null,
      },
    })

    const lineResult = suppressLine
      ? { delivered: false, reason: 'suppressed' as const, error: undefined }
      : await sendLinePushToSupabaseUser(supabase, targetUserId, {
          title: title || null,
          message,
          lineAction,
          appBaseUrl: req.nextUrl.origin,
          category: lineCategory,
        })

    if (!suppressLine && !lineResult.delivered) {
      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'line_notification_delivery_failed',
        ipAddress,
        userAgent,
        requestId,
        details: {
          context: 'api.notifications.send',
          target_user_id: targetUserId,
          reason: lineResult.reason || 'unknown',
          error: lineResult.error || null,
          notification: {
            title: title || null,
            message,
            type,
            related_order_id: relatedOrderId || null,
            related_measurement_id: relatedMeasurementId || null,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      notification: data,
      requestId,
      line: {
        delivered: lineResult.delivered,
        reason: lineResult.reason || null,
      },
    })
  } catch (error) {
    console.error('POST /api/notifications/send error', error)
    return NextResponse.json({ error: 'Server error', requestId }, { status: 500 })
  }
}
