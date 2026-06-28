import { createHmac, randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestId, getRequestIpAddress, recordAuditLog, recordConsent } from '@/lib/server/compliance'
import { verifyLineLinkToken } from '@/lib/server/lineLinkToken'
import { resolveStoredLineDeliveryStatus, verifyLineLinkDelivery } from '@/lib/server/lineMessaging'

type LineTokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
  id_token?: string
}

type LineProfile = {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

const getEnv = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

const buildDeterministicPassword = (lineUserId: string, secret: string): string => {
  const digest = createHmac('sha256', secret).update(lineUserId).digest('base64url')
  const randomSuffix = randomBytes(12).toString('base64url')
  return `LiNe!${digest}${randomSuffix}#2026`
}

const toFrontendErrorRedirect = (frontendErrorUrl: string, message: string) => {
  const redirectUrl = new URL(frontendErrorUrl)
  redirectUrl.searchParams.set('error', 'line_oauth_failed')
  redirectUrl.searchParams.set('error_description', message)
  return NextResponse.redirect(redirectUrl.toString())
}

const buildLineMetadata = (args: {
  existingMetadata: Record<string, unknown>
  profile: LineProfile
  verification: Awaited<ReturnType<typeof verifyLineLinkDelivery>>
}) => ({
  ...args.existingMetadata,
  provider: 'line',
  line_user_id: args.profile.userId,
  line_display_name: args.profile.displayName,
  line_picture_url: args.profile.pictureUrl,
  line_linked_at: new Date().toISOString(),
  line_friendship_status: args.verification.friendFlag,
  line_friendship_checked_at: args.verification.friendshipCheckedAt,
  line_friendship_reason: args.verification.friendshipReason,
  line_friendship_error: args.verification.friendshipError,
  line_messaging_status: args.verification.messagingStatus,
  line_messaging_checked_at: args.verification.messagingCheckedAt,
  line_messaging_reason: args.verification.reason,
  line_messaging_error: args.verification.error,
})

export async function GET(request: NextRequest) {
  const ipAddress = getRequestIpAddress(request.headers)
  const requestId = getRequestId(request.headers)
  const userAgent = request.headers.get('user-agent')

  try {
    const origin = request.nextUrl.origin
    const supabaseUrl = getEnv('SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
    const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

    const lineClientId = getEnv('LINE_CHANNEL_ID')
    const lineClientSecret = getEnv('LINE_CHANNEL_SECRET')
    const configuredCallbackUrl = process.env.LINE_REDIRECT_URI
    const runtimeCallbackUrl = `${origin}/api/auth/line/callback`
    const lineCallbackUrl = configuredCallbackUrl && !(configuredCallbackUrl.includes('localhost') && !origin.includes('localhost'))
      ? configuredCallbackUrl
      : runtimeCallbackUrl

    if (!/^\d+$/.test(lineClientId)) {
      return toFrontendErrorRedirect(`${origin}/login`, 'LINE_CHANNEL_ID must be numeric (LINE Login Channel ID)')
    }

    const configuredSuccessUrl = process.env.LINE_FRONTEND_SUCCESS_URL
    const configuredErrorUrl = process.env.LINE_FRONTEND_ERROR_URL
    const frontendSuccessUrl = configuredSuccessUrl && !(configuredSuccessUrl.includes('localhost') && !origin.includes('localhost'))
      ? configuredSuccessUrl
      : `${origin}/auth/success`
    const frontendErrorUrl = configuredErrorUrl && !(configuredErrorUrl.includes('localhost') && !origin.includes('localhost'))
      ? configuredErrorUrl
      : `${origin}/login`
    const linePasswordSecret = getEnv('LINE_PASSWORD_SECRET')

    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')
    const stateCookie = request.cookies.get('line_oauth_state')?.value
    const lineLinkToken = request.cookies.get('line_link_token')?.value || ''
    const loginNext = request.cookies.get('line_login_next')?.value || ''
    const safeLoginNext = (loginNext.startsWith('/dashboard') || loginNext.startsWith('/invite')) ? loginNext : ''

    if (!code) {
      return toFrontendErrorRedirect(frontendErrorUrl, 'Missing LINE authorization code')
    }

    if (stateCookie && state !== stateCookie) {
      return toFrontendErrorRedirect(frontendErrorUrl, 'Invalid LINE OAuth state')
    }

    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: lineCallbackUrl,
        client_id: lineClientId,
        client_secret: lineClientSecret,
      }),
    })

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text()
      return toFrontendErrorRedirect(frontendErrorUrl, `Failed to exchange LINE code: ${tokenError}`)
    }

    const tokenData = (await tokenResponse.json()) as LineTokenResponse
    const lineAccessToken = tokenData.access_token

    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${lineAccessToken}`,
      },
    })

    if (!profileResponse.ok) {
      const profileError = await profileResponse.text()
      return toFrontendErrorRedirect(frontendErrorUrl, `Failed to fetch LINE profile: ${profileError}`)
    }

    const lineProfile = (await profileResponse.json()) as LineProfile
    let cachedLineVerification: Awaited<ReturnType<typeof verifyLineLinkDelivery>> | null = null
    const ensureLineVerification = async () => {
      if (!cachedLineVerification) {
        cachedLineVerification = await verifyLineLinkDelivery({
          lineAccessToken,
          lineUserId: lineProfile.userId,
          displayName: lineProfile.displayName,
        })
      }

      return cachedLineVerification
    }

    const linkVerification = lineLinkToken ? verifyLineLinkToken(lineLinkToken) : null

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const mockEmail = `${lineProfile.userId}@line.xylemlandscape.com`
    const generatedPassword = buildDeterministicPassword(lineProfile.userId, linePasswordSecret)

    if (linkVerification?.valid && linkVerification.payload?.userId) {
      const targetUserId = linkVerification.payload.userId

      const { data: targetUserResult, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
      if (targetUserError || !targetUserResult?.user) {
        return toFrontendErrorRedirect(frontendErrorUrl, `Failed to load account for LINE linking: ${targetUserError?.message || 'not found'}`)
      }

      const existingUserMetadata =
        (targetUserResult.user.user_metadata || {}) as Record<string, unknown>
      const lineVerification = await ensureLineVerification()

      const { error: linkUpdateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: buildLineMetadata({
          existingMetadata: existingUserMetadata,
          profile: lineProfile,
          verification: lineVerification,
        }),
      })

      if (linkUpdateError) {
        return toFrontendErrorRedirect(frontendErrorUrl, `Failed to link LINE account: ${linkUpdateError.message}`)
      }

      if (lineVerification.messagingStatus !== 'ready') {
        await recordAuditLog({
          userId: targetUserId,
          userEmail: targetUserResult.user.email,
          action: 'line_link_verification_failed',
          ipAddress,
          userAgent,
          requestId,
          details: {
            context: 'api.auth.line.callback',
            line_user_id: lineProfile.userId,
            reason: lineVerification.reason,
            error: lineVerification.error,
            friendship_status: lineVerification.friendFlag,
            friendship_reason: lineVerification.friendshipReason,
          },
        })
      }

      await recordAuditLog({
        userId: targetUserId,
        userEmail: targetUserResult.user.email,
        action: 'line_account_linked',
        ipAddress,
        userAgent,
        requestId,
        details: {
          context: 'api.auth.line.callback',
          line_user_id: lineProfile.userId,
          messaging_status: lineVerification.messagingStatus,
        },
      })

      await recordConsent({
        userId: targetUserId,
        email: targetUserResult.user.email,
        consentType: 'line_notifications',
        consentStatus: 'granted',
        policyVersion: '1.0',
        policyDocument: 'LINE_NOTIFICATION_LINK',
        sourceChannel: 'line_account_link',
        ipAddress,
        userAgent,
        requestId,
        metadata: {
          line_user_id: lineProfile.userId,
          messaging_status: lineVerification.messagingStatus,
        },
      })

      const linkSuccessUrl = new URL(`${origin}/dashboard`)
      linkSuccessUrl.searchParams.set('line_linked', '1')
      linkSuccessUrl.searchParams.set('line_messaging_ready', lineVerification.messagingStatus === 'ready' ? '1' : '0')
      if (lineVerification.reason) {
        linkSuccessUrl.searchParams.set('line_messaging_reason', lineVerification.reason)
      }

      const linkResponse = NextResponse.redirect(linkSuccessUrl.toString())
      linkResponse.cookies.set('line_link_token', '', {
        path: '/',
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
      linkResponse.cookies.set('line_oauth_state', '', {
        path: '/',
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
      linkResponse.cookies.set('line_login_next', '', {
        path: '/',
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })

      return linkResponse
    }

    const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', mockEmail)
      .maybeSingle()

    if (profileLookupError) {
      return toFrontendErrorRedirect(frontendErrorUrl, `Failed to check existing Supabase profile: ${profileLookupError.message}`)
    }

    let userId = existingProfile?.id
    let resolvedExistingUserMetadata: Record<string, unknown> = {}

    if (!userId) {
      const { data: authUsersData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })

      if (authUsersError) {
        return toFrontendErrorRedirect(frontendErrorUrl, `Failed to list Supabase auth users: ${authUsersError.message}`)
      }

      const existingAuthUser = authUsersData?.users?.find(
        (user) => (user.email || '').toLowerCase() === mockEmail.toLowerCase()
      )

      if (existingAuthUser) {
        userId = existingAuthUser.id
        resolvedExistingUserMetadata = (existingAuthUser.user_metadata || {}) as Record<string, unknown>
      }
    }

    if (userId && Object.keys(resolvedExistingUserMetadata).length === 0) {
      const { data: existingUserResult, error: existingUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (existingUserError || !existingUserResult?.user) {
        return toFrontendErrorRedirect(frontendErrorUrl, `Failed to load existing Supabase user: ${existingUserError?.message || 'not found'}`)
      }

      resolvedExistingUserMetadata = (existingUserResult.user.user_metadata || {}) as Record<string, unknown>
    }

    if (!userId) {
      const lineVerification = await ensureLineVerification()
      const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: mockEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: buildLineMetadata({
          existingMetadata: {
            display_name: lineProfile.displayName,
            picture_url: lineProfile.pictureUrl,
          },
          profile: lineProfile,
          verification: lineVerification,
        }),
      })

      if (createUserError || !createdUser.user) {
        return toFrontendErrorRedirect(frontendErrorUrl, `Failed to create Supabase user: ${createUserError?.message || 'unknown error'}`)
      }

      userId = createdUser.user.id
    } else {
      const shouldVerifyLineLoginUser = resolveStoredLineDeliveryStatus(resolvedExistingUserMetadata).messagingStatus !== 'ready'
      const lineVerification = shouldVerifyLineLoginUser
        ? await ensureLineVerification()
        : {
            friendFlag: typeof resolvedExistingUserMetadata.line_friendship_status === 'boolean'
              ? resolvedExistingUserMetadata.line_friendship_status
              : null,
            friendshipCheckedAt: typeof resolvedExistingUserMetadata.line_friendship_checked_at === 'string'
              ? resolvedExistingUserMetadata.line_friendship_checked_at
              : null,
            friendshipReason: typeof resolvedExistingUserMetadata.line_friendship_reason === 'string'
              ? resolvedExistingUserMetadata.line_friendship_reason
              : null,
            friendshipError: typeof resolvedExistingUserMetadata.line_friendship_error === 'string'
              ? resolvedExistingUserMetadata.line_friendship_error
              : null,
            messagingStatus: 'ready' as const,
            messagingCheckedAt: typeof resolvedExistingUserMetadata.line_messaging_checked_at === 'string'
              ? resolvedExistingUserMetadata.line_messaging_checked_at
              : new Date().toISOString(),
            reason: typeof resolvedExistingUserMetadata.line_messaging_reason === 'string'
              ? resolvedExistingUserMetadata.line_messaging_reason
              : null,
            error: typeof resolvedExistingUserMetadata.line_messaging_error === 'string'
              ? resolvedExistingUserMetadata.line_messaging_error
              : null,
          }

      const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: generatedPassword,
        user_metadata: buildLineMetadata({
          existingMetadata: resolvedExistingUserMetadata,
          profile: lineProfile,
          verification: lineVerification,
        }),
      })

      if (updateUserError) {
        return toFrontendErrorRedirect(frontendErrorUrl, `Failed to update Supabase user metadata: ${updateUserError.message}`)
      }
    }

    if (!userId) {
      return toFrontendErrorRedirect(frontendErrorUrl, 'Unable to resolve Supabase user id')
    }

    if (!existingProfile) {
      const { error: profileUpsertError } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: userId,
            email: mockEmail,
            role: 'customer',
            display_name: lineProfile.displayName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

      if (profileUpsertError) {
        return toFrontendErrorRedirect(frontendErrorUrl, `Failed to upsert Supabase profile: ${profileUpsertError.message}`)
      }
    }

    const { data: signInData, error: signInError } = await supabaseAuthClient.auth.signInWithPassword({
      email: mockEmail,
      password: generatedPassword,
    })

    if (signInError || !signInData.session) {
      return toFrontendErrorRedirect(frontendErrorUrl, `Failed to sign in Supabase user: ${signInError?.message || 'session is null'}`)
    }

    const redirectUrl = new URL(frontendSuccessUrl)
    const tokenParams = new URLSearchParams({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_at: String(signInData.session.expires_at ?? ''),
      token_type: signInData.session.token_type,
    })

    redirectUrl.hash = tokenParams.toString()
    redirectUrl.search = tokenParams.toString()
    if (safeLoginNext) {
      redirectUrl.searchParams.set('next', safeLoginNext)
    }

    const response = NextResponse.redirect(redirectUrl.toString())
    response.cookies.set('line_access_token_fallback', signInData.session.access_token, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60,
    })
    response.cookies.set('line_refresh_token_fallback', signInData.session.refresh_token, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60,
    })
    response.cookies.set('line_oauth_state', '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    response.cookies.set('line_login_next', '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })

    await recordAuditLog({
      userId,
      userEmail: mockEmail,
      action: 'line_login_succeeded',
      ipAddress,
      userAgent,
      requestId,
      details: {
        context: 'api.auth.line.callback',
        line_user_id: lineProfile.userId,
        redirect_next: safeLoginNext || null,
      },
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown callback error'

    const origin = request.nextUrl.origin
    const configuredErrorUrl = process.env.LINE_FRONTEND_ERROR_URL
    const fallbackErrorUrl = configuredErrorUrl && !(configuredErrorUrl.includes('localhost') && !origin.includes('localhost'))
      ? configuredErrorUrl
      : `${origin}/login`

    return toFrontendErrorRedirect(fallbackErrorUrl, message)
  }
}