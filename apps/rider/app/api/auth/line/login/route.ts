import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createLineLinkToken } from '@/lib/server/lineLinkToken'

const getEnv = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export async function GET(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin
    const requestedNext = request.nextUrl.searchParams.get('next') || ''
    const safeNext = (requestedNext.startsWith('/dashboard') || requestedNext.startsWith('/invite')) ? requestedNext : ''
    const lineClientId = getEnv('LINE_CHANNEL_ID')
    const configuredRedirectUri = process.env.LINE_REDIRECT_URI
    const runtimeRedirectUri = `${origin}/api/auth/line/callback`
    const lineRedirectUri = configuredRedirectUri && !(configuredRedirectUri.includes('localhost') && !origin.includes('localhost'))
      ? configuredRedirectUri
      : runtimeRedirectUri

    if (!/^\d+$/.test(lineClientId)) {
      throw new Error('LINE_CHANNEL_ID must be numeric (LINE Login Channel ID), not a LINE userId/display id')
    }

    const state = randomBytes(24).toString('hex')
    const nonce = randomBytes(24).toString('hex')

    const authorizeUrl = new URL('https://access.line.me/oauth2/v2.1/authorize')
    authorizeUrl.searchParams.set('response_type', 'code')
    authorizeUrl.searchParams.set('client_id', lineClientId)
    authorizeUrl.searchParams.set('redirect_uri', lineRedirectUri)
    authorizeUrl.searchParams.set('state', state)
    authorizeUrl.searchParams.set('scope', 'profile openid')
    authorizeUrl.searchParams.set('nonce', nonce)
    authorizeUrl.searchParams.set('bot_prompt', 'aggressive')

    const response = NextResponse.redirect(authorizeUrl.toString())

    // If user is already logged in, prepare link token automatically.
    // This enables one-click LINE linking without requiring a dedicated profile action.
    try {
      const authClient = createRouteHandlerClient({ cookies })
      const {
        data: { user },
      } = await authClient.auth.getUser()

      if (user?.id) {
        const linkToken = createLineLinkToken(user.id)
        if (linkToken) {
          response.cookies.set('line_link_token', linkToken, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 10,
          })
        }
      }
    } catch {
      // Ignore auto-link token failure and continue normal LINE login flow.
    }

    response.cookies.set('line_oauth_state', state, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
    })

    if (safeNext) {
      response.cookies.set('line_login_next', safeNext, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10,
      })
    } else {
      response.cookies.set('line_login_next', '', {
        path: '/',
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    }

    return response
  } catch (error) {
    const origin = request.nextUrl.origin
    const configuredErrorUrl = process.env.LINE_FRONTEND_ERROR_URL
    const fallbackErrorUrl = configuredErrorUrl && !(configuredErrorUrl.includes('localhost') && !origin.includes('localhost'))
      ? configuredErrorUrl
      : `${origin}/login`
    const message = error instanceof Error ? error.message : 'Unable to initialize LINE login'

    const redirectUrl = new URL(fallbackErrorUrl)
    redirectUrl.searchParams.set('error', 'line_oauth_init_failed')
    redirectUrl.searchParams.set('error_description', message)
    return NextResponse.redirect(redirectUrl.toString())
  }
}