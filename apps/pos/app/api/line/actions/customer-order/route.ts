import { createHmac, randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCustomerOrderActionToken } from '@/lib/server/lineActionToken'

export const dynamic = 'force-dynamic'

const createSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

const buildDeterministicPassword = (lineUserId: string, secret: string): string => {
  const digest = createHmac('sha256', secret).update(lineUserId).digest('base64url')
  const randomSuffix = randomBytes(12).toString('base64url')
  return `LiNe!${digest}${randomSuffix}#2026`
}

const getAppBaseUrl = (origin: string) => {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  return (configured || origin || 'http://localhost:3000').replace(/\/$/, '')
}

const buildTargetPath = (args: { orderId: string; houseId?: string | null; mode: 'detail' | 'rate' | 'issue' | 'reschedule'; reportId?: string | null }) => {
  const { orderId, houseId, mode, reportId } = args
  const safeOrderId = encodeURIComponent(orderId)
  
  if (mode === 'detail' && reportId) {
    // Go straight to the full report panel (with before/after photos, work log, etc.)
    return `/dashboard/customer?reportId=${encodeURIComponent(reportId)}`
  }

  const base = `/dashboard/customer`
  const params = new URLSearchParams()
  params.set('orderId', safeOrderId)
  
  if (mode === 'rate') params.set('action', reportId ? 'rate-report' : 'rate')
  else if (mode === 'issue') params.set('action', reportId ? 'issue-report' : 'issue')
  else if (mode === 'reschedule') {
    if (houseId) {
      return `/dashboard/customer/houses/${encodeURIComponent(houseId)}?calendar=open&action=reschedule&orderId=${safeOrderId}`
    } else {
      return `/reschedule/${safeOrderId}`
    }
  }

  if (reportId) {
    params.set('reportId', reportId)
  }

  return `${base}?${params.toString()}`
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
  customerId: string
  targetPath: string
  fallbackParams?: Record<string, string>
}) => {
  const { data: authUser, error: authError } = await args.supabase.auth.admin.getUserById(args.customerId)
  const email = authUser?.user?.email || ''
  const metadata = (authUser?.user?.user_metadata || {}) as Record<string, unknown>
  const lineUserId = (metadata.line_user_id || metadata.lineUserId) as string | undefined

  if (authError || !email) {
    return redirectTo(args.appBaseUrl, args.targetPath, {
      ...(args.fallbackParams || {}),
      line_auth: 'user_not_found',
    })
  }

  // Strategy 1: If user is a LINE user, use the project's deterministic password logic
  // This is the most reliable way as it's used by the official LINE login callback.
  if (lineUserId) {
    const linePasswordSecret = process.env.LINE_PASSWORD_SECRET || ''
    if (linePasswordSecret) {
      const generatedPassword = buildDeterministicPassword(lineUserId, linePasswordSecret)
      
      // Update password (standard project pattern)
      await args.supabase.auth.admin.updateUserById(args.customerId, {
        password: generatedPassword
      })

      // Sign in with the new password
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )

      const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
        email,
        password: generatedPassword,
      })

      if (!signInError && signInData.session) {
        const successUrl = new URL('/auth/success', args.appBaseUrl)
        // Put tokens in search params AND hash for maximum browser compatibility
        // Keep `next` always in search params so resolveNextPath() can reliably read it
        const tokenParams = new URLSearchParams({
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          token_type: signInData.session.token_type,
          next: args.targetPath
        })
        successUrl.search = tokenParams.toString()
        // Also set hash so SPA routers that read the hash still work
        successUrl.hash = tokenParams.toString()
        
        const response = NextResponse.redirect(successUrl.toString())
        // Set fallbacks used by AuthSuccessPage (cookie-based fallback)
        response.cookies.set('line_access_token_fallback', signInData.session.access_token, { path: '/', maxAge: 60 })
        response.cookies.set('line_refresh_token_fallback', signInData.session.refresh_token, { path: '/', maxAge: 60 })
        // Store the target path in a cookie as an extra fallback for the success page
        response.cookies.set('line_next_path_fallback', args.targetPath, { path: '/', maxAge: 60 })
        return response
      }
    }
  }

  // Strategy 2: Fallback to Magic Link for non-LINE users or if secret is missing
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
    return redirectTo(appBaseUrl, '/dashboard/customer', { sheet: 'orders', line_action: 'missing_token' })
  }

  const verified = verifyCustomerOrderActionToken(token)
  if (!verified.valid || !verified.payload) {
    return redirectTo(appBaseUrl, '/dashboard/customer', {
      sheet: 'orders',
      line_action: verified.reason === 'expired' ? 'expired_token' : 'invalid_token',
    })
  }

  try {
    const supabase = createSupabaseServiceClient()
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, house_id, house_code, status')
      .eq('id', verified.payload.orderId)
      .maybeSingle()

    let effectiveReportId = verified.payload.reportId

    // For old tokens that didn't include reportId, try to find the latest report
    if (!effectiveReportId && verified.payload.mode === 'detail') {
      const { data: latestReport } = await supabase
        .from('work_reports')
        .select('id')
        .eq('order_id', verified.payload.orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (latestReport) {
        effectiveReportId = latestReport.id
      }
    }

    const targetPath = buildTargetPath({
      orderId: verified.payload.orderId,
      houseId: order?.house_id || order?.house_code,
      mode: verified.payload.mode,
      reportId: effectiveReportId,
    })

    if (orderError || !order || order.customer_id !== verified.payload.customerId) {
      return redirectTo(appBaseUrl, '/dashboard/customer', { sheet: 'orders', line_action: 'order_not_found' })
    }

    return redirectWithAutoLogin({
      supabase,
      appBaseUrl,
      customerId: verified.payload.customerId,
      targetPath,
      fallbackParams: {
        line_action: verified.payload.mode,
      },
    })
  } catch (error) {
    console.error('GET /api/line/actions/customer-order error', error)
    return redirectTo(appBaseUrl, '/dashboard/customer', { sheet: 'orders', line_action: 'server_error' })
  }
}