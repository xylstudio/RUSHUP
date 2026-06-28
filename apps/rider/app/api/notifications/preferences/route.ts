import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { resolveLinePreferences, type LineNotificationPreferences } from '@/lib/server/linePreferences'
import { resolveStoredLineDeliveryStatus } from '@/lib/server/lineMessaging'

export const dynamic = 'force-dynamic'

const createSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

const sanitizePrefs = (value: unknown, fallback: LineNotificationPreferences): LineNotificationPreferences => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : fallback.enabled,
    new_order: typeof source.new_order === 'boolean' ? source.new_order : fallback.new_order,
    job_assigned: typeof source.job_assigned === 'boolean' ? source.job_assigned : fallback.job_assigned,
    order_status: typeof source.order_status === 'boolean' ? source.order_status : fallback.order_status,
    system: typeof source.system === 'boolean' ? source.system : fallback.system,
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()
    const [{ data: profile }, { data: authUserResult, error: authError }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      supabase.auth.admin.getUserById(user.id),
    ])

    if (authError || !authUserResult?.user) {
      return NextResponse.json({ error: authError?.message || 'User not found' }, { status: 500 })
    }

    const metadata = (authUserResult.user.user_metadata || {}) as Record<string, unknown>
    const role = (profile?.role || 'customer') as string
    const linePreferences = resolveLinePreferences(metadata, role)
    const lineStatus = resolveStoredLineDeliveryStatus(metadata)

    return NextResponse.json({
      success: true,
      role,
      lineLinked: lineStatus.linked,
      linePreferences,
      lineStatus,
    })
  } catch (error) {
    console.error('GET /api/notifications/preferences error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()
    const body = await req.json().catch(() => ({}))

    const [{ data: profile }, { data: authUserResult, error: authError }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      supabase.auth.admin.getUserById(user.id),
    ])

    if (authError || !authUserResult?.user) {
      return NextResponse.json({ error: authError?.message || 'User not found' }, { status: 500 })
    }

    const metadata = (authUserResult.user.user_metadata || {}) as Record<string, unknown>
    const role = (profile?.role || 'customer') as string
    const fallback = resolveLinePreferences(metadata, role)
    const linePreferences = sanitizePrefs(body?.linePreferences, fallback)

    const rootNotificationPreferences =
      metadata.notification_preferences && typeof metadata.notification_preferences === 'object'
        ? (metadata.notification_preferences as Record<string, unknown>)
        : {}

    const nextUserMetadata = {
      ...metadata,
      notification_preferences: {
        ...rootNotificationPreferences,
        line: linePreferences,
      },
      notification_preferences_updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: nextUserMetadata,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, linePreferences })
  } catch (error) {
    console.error('PUT /api/notifications/preferences error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
