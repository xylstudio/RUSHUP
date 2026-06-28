import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAcceptJobActionToken } from '@/lib/server/lineActionToken'

export const dynamic = 'force-dynamic'

const createSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

const getAppBaseUrl = (origin: string) => {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  return (configured || origin || 'http://localhost:3000').replace(/\/$/, '')
}

const redirectTo = (appBaseUrl: string, path: string, params?: Record<string, string>) => {
  const target = new URL(path, appBaseUrl)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      target.searchParams.set(key, value)
    })
  }
  return NextResponse.redirect(target.toString())
}

const redirectWithAutoLogin = async (args: {
  supabase: ReturnType<typeof createSupabaseServiceClient>
  appBaseUrl: string
  staffId: string
  targetPath: string
  fallbackParams?: Record<string, string>
}) => {
  const { data: authUser, error: authError } = await args.supabase.auth.admin.getUserById(args.staffId)
  const email = authUser?.user?.email || ''

  if (authError || !email) {
    return redirectTo(args.appBaseUrl, args.targetPath, {
      ...(args.fallbackParams || {}),
      line_auth: 'email_not_found',
    })
  }

  const successUrl = new URL('/auth/success', args.appBaseUrl)
  successUrl.searchParams.set('next', args.targetPath)

  const { data: linkData, error: linkError } = await args.supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: successUrl.toString(),
    },
  })

  const actionLink = linkData?.properties?.action_link
  if (linkError || !actionLink) {
    return redirectTo(args.appBaseUrl, args.targetPath, {
      ...(args.fallbackParams || {}),
      line_auth: 'magiclink_failed',
    })
  }

  return NextResponse.redirect(actionLink)
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''
  const appBaseUrl = getAppBaseUrl(req.nextUrl.origin)

  if (!token) {
    return redirectTo(appBaseUrl, '/dashboard/staff/tasks', { line_action: 'missing_token' })
  }

  const verified = verifyAcceptJobActionToken(token)
  if (!verified.valid || !verified.payload) {
    const reasonText =
      verified.reason === 'expired'
        ? 'ลิงก์หมดอายุแล้ว กรุณาให้แอดมินส่งงานใหม่อีกครั้ง'
        : 'ลิงก์ไม่ถูกต้องหรือไม่ปลอดภัย กรุณาลองใหม่อีกครั้ง'

    return redirectTo(appBaseUrl, '/dashboard/staff/tasks', {
      line_action: 'invalid_token',
      reason: reasonText,
    })
  }

  try {
    const supabase = createSupabaseServiceClient()
    const { assignmentId, staffId } = verified.payload

    const { data: assignment, error: selectError } = await supabase
      .from('job_assignments')
      .select('id, status, staff_id')
      .eq('id', assignmentId)
      .eq('staff_id', staffId)
      .maybeSingle()

    if (selectError || !assignment) {
      return redirectTo(appBaseUrl, '/dashboard/staff/tasks', { line_action: 'not_found' })
    }

    if (assignment.status === 'assigned') {
      const now = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('job_assignments')
        .update({
          status: 'accepted',
          accepted_at: now,
          updated_at: now,
        })
        .eq('id', assignment.id)
        .eq('staff_id', staffId)

      if (updateError) {
        return redirectTo(appBaseUrl, `/dashboard/staff/tasks/${encodeURIComponent(assignment.id)}`, {
          line_action: 'update_failed',
        })
      }

      return redirectWithAutoLogin({
        supabase,
        appBaseUrl,
        staffId,
        targetPath: `/dashboard/staff/tasks/${encodeURIComponent(assignment.id)}`,
        fallbackParams: {
          line_action: 'accepted',
        },
      })
    }

    if (assignment.status === 'accepted' || assignment.status === 'in_progress' || assignment.status === 'completed') {
      return redirectWithAutoLogin({
        supabase,
        appBaseUrl,
        staffId,
        targetPath: `/dashboard/staff/tasks/${encodeURIComponent(assignment.id)}`,
        fallbackParams: {
          line_action: 'already_handled',
        },
      })
    }

    return redirectTo(appBaseUrl, `/dashboard/staff/tasks/${encodeURIComponent(assignment.id)}`, {
      line_action: 'invalid_status',
    })
  } catch (error) {
    console.error('GET /api/line/actions/accept-job error', error)
    return redirectTo(appBaseUrl, '/dashboard/staff/tasks', { line_action: 'server_error' })
  }
}
