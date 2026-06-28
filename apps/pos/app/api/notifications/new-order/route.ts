import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendLinePushToSupabaseUser } from '@/lib/server/lineMessaging'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

async function insertNotificationsWithRetry(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  payload: any[],
  maxAttempts = 3
) {
  let lastError: any = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await supabase.from('notifications').insert(payload)
    if (!error) {
      return { error: null, attempts: attempt }
    }

    lastError = error

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
    }
  }

  return { error: lastError, attempts: maxAttempts }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { orderId, serviceName, customerName } = body || {}

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const { data: orderInfo } = await supabase
      .from('orders')
      .select('id, service_area, scheduled_date, houses!orders_house_id_fkey(branch_code, name, address)')
      .eq('id', orderId)
      .maybeSingle()

    const targetBranchCode =
      typeof (orderInfo as any)?.houses?.branch_code === 'string'
        ? ((orderInfo as any).houses.branch_code as string).trim()
        : ''

    const locationLabel = [
      asText((orderInfo as any)?.houses?.name),
      asText((orderInfo as any)?.houses?.address),
    ]
      .filter(Boolean)
      .join(' • ')

    const serviceAreaValue =
      typeof (orderInfo as any)?.service_area === 'number'
        ? Number((orderInfo as any).service_area)
        : null

    const scheduledDateValue = asText((orderInfo as any)?.scheduled_date)

    const { data: staffs, error: staffsError } = await supabase
      .from('profiles')
      .select('id, branch_code')
      .eq('role', 'staff')

    if (staffsError) {
      return NextResponse.json({ error: staffsError.message }, { status: 500 })
    }

    const allStaff = staffs || []
    const staffTargetsByBranch = allStaff.filter((staff: any) => {
      if (!targetBranchCode) return true
      return String(staff.branch_code || '').trim() === targetBranchCode
    })

    const staffTargets =
      targetBranchCode && staffTargetsByBranch.length === 0 ? allStaff : staffTargetsByBranch

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      action: 'new_order_notification_dispatch_started',
      details: {
        context: 'api.notifications.new-order',
        orderId,
        branchCode: targetBranchCode || null,
        totalStaff: allStaff.length,
        branchMatchedStaff: staffTargetsByBranch.length,
        usedFallbackAllStaff: Boolean(targetBranchCode && staffTargetsByBranch.length === 0),
      },
    })

    const recipients = [...staffTargets.map((item: any) => ({ id: item.id, role: 'staff' as const }))]

    const dedup = new Map<string, { id: string; role: 'admin' | 'staff' }>()
    for (const recipient of recipients) {
      if (!dedup.has(recipient.id)) dedup.set(recipient.id, recipient)
    }

    const recipientList = Array.from(dedup.values())
    if (recipientList.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const message = `คำสั่งซื้อใหม่จาก ${customerName || 'ลูกค้า'} • ${serviceName || 'บริการ'}`
    const payload = recipientList.map((recipient) => ({
      user_id: recipient.id,
      title: 'งานใหม่ในสาขาของคุณ',
      message,
      type: 'info',
      related_order_id: orderId,
      read: false,
    }))

    const { error: insertError, attempts } = await insertNotificationsWithRetry(supabase, payload)
    if (insertError) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'notification_delivery_failed',
        details: {
          context: 'api.notifications.new-order',
          orderId,
          attempts,
          error: insertError.message,
          payloadSize: payload.length,
        },
      })

      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const lineResults = await Promise.all(
      recipientList.map(async (recipient) => {
        const result = await sendLinePushToSupabaseUser(supabase, recipient.id, {
          title: 'งานใหม่ในสาขาของคุณ',
          message,
          category: 'new_order',
          // Staff broadcast must always notify regardless of per-topic toggle.
          bypassPreferences: recipient.role === 'staff',
          lineAction:
            recipient.role === 'staff'
              ? {
                  type: 'claim_open_order',
                  order_id: orderId,
                  service_name: serviceName || 'บริการ',
                  scheduled_date: scheduledDateValue || null,
                  location_label: locationLabel || null,
                  service_area_sqm: serviceAreaValue,
                }
              : null,
        })
        return { userId: recipient.id, role: recipient.role, ...result }
      })
    )

    const failedLineResults = lineResults.filter((result) => !result.delivered)
    if (failedLineResults.length > 0) {
      await Promise.all(
        failedLineResults.map((failed) =>
          supabase.from('audit_logs').insert({
            user_id: user.id,
            user_email: user.email,
            action: 'line_notification_delivery_failed',
            details: {
              context: 'api.notifications.new-order',
              target_user_id: failed.userId,
              reason: failed.reason || 'unknown',
              error: failed.error || null,
              orderId,
              branchCode: targetBranchCode || null,
            },
          })
        )
      )
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      action: 'new_order_notification_dispatch_completed',
      details: {
        context: 'api.notifications.new-order',
        orderId,
        branchCode: targetBranchCode || null,
        recipients: recipientList.length,
        lineDelivered: lineResults.filter((item) => item.delivered).length,
        lineFailed: failedLineResults.length,
      },
    })

    return NextResponse.json({ success: true, sent: payload.length, branchCode: targetBranchCode || null })
  } catch (error) {
    console.error('POST /api/notifications/new-order error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
