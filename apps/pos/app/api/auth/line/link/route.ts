import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { createLineLinkToken } from '@/lib/server/lineLinkToken'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await resolveRequestUser(req)
  const origin = req.nextUrl.origin

  if (!user) {
    const redirectUrl = new URL('/login', origin)
    redirectUrl.searchParams.set('error', 'line_link_requires_login')
    return NextResponse.redirect(redirectUrl.toString())
  }

  const token = createLineLinkToken(user.id)
  if (!token) {
    const redirectUrl = new URL('/dashboard', origin)
    redirectUrl.searchParams.set('line_link_error', 'missing_secret')
    return NextResponse.redirect(redirectUrl.toString())
  }

  const redirectToLineLogin = new URL('/api/auth/line/login', origin)
  const response = NextResponse.redirect(redirectToLineLogin.toString())
  response.cookies.set('line_link_token', token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
  })

  return response
}
