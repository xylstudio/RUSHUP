import { createHmac, timingSafeEqual } from 'crypto'

type LineLinkPayload = {
  action: 'link_line_account'
  userId: string
  exp: number
}

const DEFAULT_LINK_TTL_SECONDS = 60 * 10

const getLinkSecret = () => {
  return (
    process.env.LINE_ACTION_SECRET ||
    process.env.LINE_CHANNEL_SECRET ||
    process.env.LINE_PASSWORD_SECRET ||
    ''
  )
}

const sign = (value: string, secret: string) =>
  createHmac('sha256', secret).update(value).digest('base64url')

export const createLineLinkToken = (userId: string, ttlSeconds = DEFAULT_LINK_TTL_SECONDS): string | null => {
  const secret = getLinkSecret()
  if (!secret) return null

  const payload: LineLinkPayload = {
    action: 'link_line_account',
    userId,
    exp: Math.floor(Date.now() / 1000) + Math.max(60, ttlSeconds),
  }

  const payloadPart = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signaturePart = sign(payloadPart, secret)
  return `${payloadPart}.${signaturePart}`
}

export const verifyLineLinkToken = (
  token: string
): { valid: boolean; reason?: string; payload?: LineLinkPayload } => {
  const secret = getLinkSecret()
  if (!secret) return { valid: false, reason: 'missing_secret' }

  const [payloadPart, signaturePart] = token.split('.')
  if (!payloadPart || !signaturePart) return { valid: false, reason: 'invalid_format' }

  const expected = sign(payloadPart, secret)
  const givenBuffer = Buffer.from(signaturePart)
  const expectedBuffer = Buffer.from(expected)
  if (
    givenBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(givenBuffer, expectedBuffer)
  ) {
    return { valid: false, reason: 'invalid_signature' }
  }

  let parsed: LineLinkPayload
  try {
    parsed = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as LineLinkPayload
  } catch {
    return { valid: false, reason: 'invalid_payload' }
  }

  if (
    parsed.action !== 'link_line_account' ||
    typeof parsed.userId !== 'string' ||
    !parsed.userId ||
    typeof parsed.exp !== 'number'
  ) {
    return { valid: false, reason: 'invalid_payload' }
  }

  if (parsed.exp <= Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: 'expired' }
  }

  return { valid: true, payload: parsed }
}
