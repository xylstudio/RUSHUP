import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

type RetryableNotificationPayload = {
  user_id: string
  title?: string
  message: string
  type?: string
  related_order_id?: string
  related_measurement_id?: string
  read?: boolean
}

function asRetryableNotification(input: any): RetryableNotificationPayload | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const userId = typeof input.user_id === 'string' ? input.user_id.trim() : ''
  const message = typeof input.message === 'string' ? input.message.trim() : ''

  if (!userId || !message) {
    return null
  }

  return {
    user_id: userId,
    title: typeof input.title === 'string' ? input.title : undefined,
    message,
    type: typeof input.type === 'string' ? input.type : 'info',
    related_order_id: typeof input.related_order_id === 'string' ? input.related_order_id : undefined,
    related_measurement_id: typeof input.related_measurement_id === 'string' ? input.related_measurement_id : undefined,
    read: false,
  }
}

async function insertNotificationWithRetry(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  payload: RetryableNotificationPayload,
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

    const supabase = createSupabaseServiceClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const auditLogId = Number(body?.auditLogId)

    if (!Number.isFinite(auditLogId) || auditLogId <= 0) {
      return NextResponse.json({ error: 'auditLogId is required' }, { status: 400 })
    }

    const { data: auditLog, error: auditLogError } = await supabase
      .from('audit_logs')
      .select('id, action, details')
      .eq('id', auditLogId)
      .maybeSingle()

    if (auditLogError) {
      return NextResponse.json({ error: auditLogError.message }, { status: 500 })
    }

    if (!auditLog) {
      return NextResponse.json({ error: 'Audit log not found' }, { status: 404 })
    }

    if (auditLog.action !== 'notification_delivery_failed') {
      return NextResponse.json({ error: 'Audit log is not retryable' }, { status: 400 })
    }

    const notification = asRetryableNotification((auditLog.details as any)?.notification)
    if (!notification) {
      return NextResponse.json({ error: 'Retry payload unavailable in audit log details' }, { status: 400 })
    }

    const { error: insertError, attempts } = await insertNotificationWithRetry(supabase, notification)

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      action: insertError ? 'notification_retry_failed' : 'notification_retry_succeeded',
      details: {
        sourceAuditLogId: auditLogId,
        attempts,
        context: (auditLog.details as any)?.context || 'unknown',
        error: insertError?.message || null,
      },
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, attempts })
  } catch (error) {
    console.error('POST /api/notifications/retry-delivery error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
