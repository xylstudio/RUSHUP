import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const getRequiredEnv = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const COMPLIANCE_POLICY_VERSIONS = {
  privacyPolicy: '1.0',
  termsOfService: '1.0',
} as const

export type ConsentRecordInput = {
  userId?: string | null
  email?: string | null
  consentType: 'privacy_policy' | 'terms_of_service' | 'marketing' | 'line_notifications'
  consentStatus: 'granted' | 'withdrawn' | 'reaffirmed'
  policyVersion: string
  policyDocument: string
  sourceChannel: string
  locale?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  requestId?: string | null
  sessionId?: string | null
  consentTextSnapshot?: string | null
  metadata?: Record<string, unknown>
}

export type AuditLogInput = {
  userId?: string | null
  userEmail?: string | null
  action: string
  ipAddress?: string | null
  userAgent?: string | null
  requestId?: string | null
  details?: Record<string, unknown>
}

export const getRequestId = (headers: Headers) => {
  const inboundRequestId = headers.get('x-request-id') || headers.get('x-correlation-id')
  return inboundRequestId?.trim() || randomUUID()
}

export const createServiceRoleSupabaseClient = () => {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.SUPABASE_URL)
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const createAnonSupabaseServerClient = () => {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.SUPABASE_URL)
  const anonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY)

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const recordConsent = async (input: ConsentRecordInput) => {
  const supabase = createServiceRoleSupabaseClient()
  return supabase.from('user_consents').insert({
    user_id: input.userId ?? null,
    email: input.email ?? null,
    consent_type: input.consentType,
    consent_status: input.consentStatus,
    policy_version: input.policyVersion,
    policy_document: input.policyDocument,
    source_channel: input.sourceChannel,
    locale: input.locale ?? null,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    session_id: input.sessionId ?? null,
    consent_text_snapshot: input.consentTextSnapshot ?? null,
    metadata: {
      request_id: input.requestId ?? null,
      ...(input.metadata ?? {}),
    },
  })
}

export const recordAuditLog = async (input: AuditLogInput) => {
  const supabase = createServiceRoleSupabaseClient()
  return supabase.from('audit_logs').insert({
    user_id: input.userId ?? null,
    user_email: input.userEmail ?? null,
    action: input.action,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    details: {
      request_id: input.requestId ?? null,
      ...(input.details ?? {}),
    },
  })
}

export const getRequestIpAddress = (headers: Headers) => {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null
  }

  return headers.get('x-real-ip') || null
}