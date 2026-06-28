import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyClaimOrderActionToken } from '@/lib/server/lineActionToken'

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
    Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value))
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
    return redirectTo(appBaseUrl, '/dashboard/staff', { line_action: 'missing_token' })
  }

  const verified = verifyClaimOrderActionToken(token)
  if (!verified.valid || !verified.payload) {
    const reasonText =
      verified.reason === 'expired'
        ? 'ลิงก์หมดอายุแล้ว กรุณารอข้อความแจ้งงานใหม่'
        : 'ลิงก์ไม่ถูกต้องหรือไม่ปลอดภัย กรุณาลองใหม่อีกครั้ง'

    return redirectTo(appBaseUrl, '/dashboard/staff', {
      line_action: 'invalid_token',
      reason: reasonText,
    })
  }

  try {
    const supabase = createSupabaseServiceClient()
    const { orderId, staffId } = verified.payload

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, customer_id')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      return redirectTo(appBaseUrl, '/dashboard/staff', { line_action: 'not_found' })
    }

    if (!['pending', 'confirmed'].includes(String(order.status || '').toLowerCase())) {
      return redirectTo(appBaseUrl, '/dashboard/staff', { line_action: 'not_available' })
    }

    const { data: existingAssignment } = await supabase
      .from('job_assignments')
      .select('id, status')
      .eq('order_id', orderId)
      .in('status', ['assigned', 'accepted', 'in_progress'])
      .maybeSingle()

    if (existingAssignment) {
      return redirectTo(appBaseUrl, '/dashboard/staff', { line_action: 'already_claimed' })
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
        status: 'accepted',
        assigned_at: now,
        accepted_at: now,
      })
      .select('id')
      .single()

    if (insertError || !assignment) {
      return redirectTo(appBaseUrl, '/dashboard/staff', { line_action: 'claim_failed' })
    }

    await supabase.from('audit_logs').insert({
      user_id: staffId,
      action: 'staff_claimed_order_from_line',
      details: {
        context: 'api.line.actions.claim-order',
        order_id: orderId,
        assignment_id: assignment.id,
      },
    })

    return redirectWithAutoLogin({
      supabase,
      appBaseUrl,
      staffId,
      targetPath: '/dashboard/staff',
      fallbackParams: { line_action: 'claimed' },
    })
  } catch (error) {
    console.error('GET /api/line/actions/claim-order error', error)
    return redirectTo(appBaseUrl, '/dashboard/staff', { line_action: 'server_error' })
  }
}
