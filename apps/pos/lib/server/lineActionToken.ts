import { createHmac, timingSafeEqual } from 'crypto'

type AcceptJobTokenPayload = {
  action: 'accept_job_assignment'
  assignmentId: string
  staffId: string
  exp: number
}

type ClaimOrderTokenPayload = {
  action: 'claim_open_order'
  orderId: string
  staffId: string
  exp: number
}

type CustomerOrderActionTokenPayload = {
  action: 'customer_order_link'
  orderId: string
  customerId: string
  mode: 'detail' | 'rate' | 'issue' | 'reschedule'
  reportId?: string | null
  exp: number
}

const DEFAULT_ACCEPT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 2
const DEFAULT_CUSTOMER_ACTION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

const getActionSecret = () => {
  return process.env.LINE_ACTION_SECRET || process.env.LINE_CHANNEL_SECRET || ''
}

const toBase64Url = (value: string) => Buffer.from(value, 'utf8').toString('base64url')

const fromBase64Url = (value: string) => Buffer.from(value, 'base64url').toString('utf8')

const signPayload = (payloadBase64: string, secret: string) => {
  return createHmac('sha256', secret).update(payloadBase64).digest('base64url')
}

export const createAcceptJobActionToken = (params: {
  assignmentId: string
  staffId: string
  expiresInSeconds?: number
}): string | null => {
  const secret = getActionSecret()
  if (!secret) return null

  const ttl = Math.max(60, params.expiresInSeconds ?? DEFAULT_ACCEPT_TOKEN_TTL_SECONDS)
  const payload: AcceptJobTokenPayload = {
    action: 'accept_job_assignment',
    assignmentId: params.assignmentId,
    staffId: params.staffId,
    exp: Math.floor(Date.now() / 1000) + ttl,
  }

  const payloadBase64 = toBase64Url(JSON.stringify(payload))
  const signature = signPayload(payloadBase64, secret)
  return `${payloadBase64}.${signature}`
}

export const verifyAcceptJobActionToken = (token: string): {
  valid: boolean
  reason?: 'invalid_format' | 'invalid_signature' | 'invalid_payload' | 'expired' | 'missing_secret'
  payload?: AcceptJobTokenPayload
} => {
  const secret = getActionSecret()
  if (!secret) {
    return { valid: false, reason: 'missing_secret' }
  }

  const [payloadBase64, signature] = token.split('.')
  if (!payloadBase64 || !signature) {
    return { valid: false, reason: 'invalid_format' }
  }

  const expected = signPayload(payloadBase64, secret)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { valid: false, reason: 'invalid_signature' }
  }

  let parsed: AcceptJobTokenPayload
  try {
    parsed = JSON.parse(fromBase64Url(payloadBase64)) as AcceptJobTokenPayload
  } catch {
    return { valid: false, reason: 'invalid_payload' }
  }

  if (
    parsed.action !== 'accept_job_assignment' ||
    typeof parsed.assignmentId !== 'string' ||
    typeof parsed.staffId !== 'string' ||
    typeof parsed.exp !== 'number'
  ) {
    return { valid: false, reason: 'invalid_payload' }
  }

  if (parsed.exp <= Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: 'expired' }
  }

  return { valid: true, payload: parsed }
}

export const createClaimOrderActionToken = (params: {
  orderId: string
  staffId: string
  expiresInSeconds?: number
}): string | null => {
  const secret = getActionSecret()
  if (!secret) return null

  const ttl = Math.max(60, params.expiresInSeconds ?? DEFAULT_ACCEPT_TOKEN_TTL_SECONDS)
  const payload: ClaimOrderTokenPayload = {
    action: 'claim_open_order',
    orderId: params.orderId,
    staffId: params.staffId,
    exp: Math.floor(Date.now() / 1000) + ttl,
  }

  const payloadBase64 = toBase64Url(JSON.stringify(payload))
  const signature = signPayload(payloadBase64, secret)
  return `${payloadBase64}.${signature}`
}

export const verifyClaimOrderActionToken = (token: string): {
  valid: boolean
  reason?: 'invalid_format' | 'invalid_signature' | 'invalid_payload' | 'expired' | 'missing_secret'
  payload?: ClaimOrderTokenPayload
} => {
  const secret = getActionSecret()
  if (!secret) {
    return { valid: false, reason: 'missing_secret' }
  }

  const [payloadBase64, signature] = token.split('.')
  if (!payloadBase64 || !signature) {
    return { valid: false, reason: 'invalid_format' }
  }

  const expected = signPayload(payloadBase64, secret)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { valid: false, reason: 'invalid_signature' }
  }

  let parsed: ClaimOrderTokenPayload
  try {
    parsed = JSON.parse(fromBase64Url(payloadBase64)) as ClaimOrderTokenPayload
  } catch {
    return { valid: false, reason: 'invalid_payload' }
  }

  if (
    parsed.action !== 'claim_open_order' ||
    typeof parsed.orderId !== 'string' ||
    typeof parsed.staffId !== 'string' ||
    typeof parsed.exp !== 'number'
  ) {
    return { valid: false, reason: 'invalid_payload' }
  }

  if (parsed.exp <= Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: 'expired' }
  }

  return { valid: true, payload: parsed }
}

export const createCustomerOrderActionToken = (params: {
  orderId: string
  customerId: string
  mode: 'detail' | 'rate' | 'issue' | 'reschedule'
  reportId?: string | null
  expiresInSeconds?: number
}): string | null => {
  const secret = getActionSecret()
  if (!secret) return null
  const ttl = Math.max(60, params.expiresInSeconds ?? DEFAULT_CUSTOMER_ACTION_TTL_SECONDS)
  const payload: CustomerOrderActionTokenPayload = {
    action: 'customer_order_link',
    orderId: params.orderId,
    customerId: params.customerId,
    mode: params.mode,
    reportId: params.reportId || null,
    exp: Math.floor(Date.now() / 1000) + ttl,
  }

  const payloadBase64 = toBase64Url(JSON.stringify(payload))
  const signature = signPayload(payloadBase64, secret)
  return `${payloadBase64}.${signature}`
}

export const verifyCustomerOrderActionToken = (token: string): {
  valid: boolean
  reason?: 'invalid_format' | 'invalid_signature' | 'invalid_payload' | 'expired' | 'missing_secret'
  payload?: CustomerOrderActionTokenPayload
} => {
  const secret = getActionSecret()
  if (!secret) {
    return { valid: false, reason: 'missing_secret' }
  }

  const [payloadBase64, signature] = token.split('.')
  if (!payloadBase64 || !signature) {
    return { valid: false, reason: 'invalid_format' }
  }

  const expected = signPayload(payloadBase64, secret)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { valid: false, reason: 'invalid_signature' }
  }

  let parsed: CustomerOrderActionTokenPayload
  try {
    parsed = JSON.parse(fromBase64Url(payloadBase64)) as CustomerOrderActionTokenPayload
  } catch {
    return { valid: false, reason: 'invalid_payload' }
  }

  if (
    parsed.action !== 'customer_order_link' ||
    typeof parsed.orderId !== 'string' ||
    typeof parsed.customerId !== 'string' ||
    typeof parsed.exp !== 'number' ||
    (parsed.mode !== 'detail' && parsed.mode !== 'rate' && parsed.mode !== 'issue' && parsed.mode !== 'reschedule')
  ) {
    return { valid: false, reason: 'invalid_payload' }
  }

  if (parsed.exp <= Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: 'expired' }
  }

  return { valid: true, payload: parsed }
}
