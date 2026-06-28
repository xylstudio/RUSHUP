import { NextRequest, NextResponse } from 'next/server'
import {
  COMPLIANCE_POLICY_VERSIONS,
  createAnonSupabaseServerClient,
  createServiceRoleSupabaseClient,
  getRequestIpAddress,
  getRequestId,
  recordAuditLog,
  recordConsent,
} from '@/lib/server/compliance'

type RegisterPayload = {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  locale?: string
  consents?: {
    privacyPolicy?: boolean
    termsOfService?: boolean
    marketing?: boolean
  }
}

const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 })

export async function POST(request: NextRequest) {
  const ipAddress = getRequestIpAddress(request.headers)
  const requestId = getRequestId(request.headers)
  const userAgent = request.headers.get('user-agent')

  try {
    const body = (await request.json()) as RegisterPayload
    const firstName = body.firstName?.trim() || ''
    const lastName = body.lastName?.trim() || ''
    const email = body.email?.trim().toLowerCase() || ''
    const password = body.password || ''
    const locale = body.locale?.trim() || 'th'
    const privacyPolicyAccepted = body.consents?.privacyPolicy === true
    const termsAccepted = body.consents?.termsOfService === true
    const marketingAccepted = body.consents?.marketing === true

    if (!firstName || !lastName || !email || !password) {
      return badRequest('กรุณากรอกข้อมูลให้ครบถ้วน')
    }

    if (!email.includes('@')) {
      return badRequest('รูปแบบอีเมลไม่ถูกต้อง')
    }

    if (password.length < 6) {
      return badRequest('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
    }

    if (!privacyPolicyAccepted || !termsAccepted) {
      return badRequest('กรุณายอมรับนโยบายความเป็นส่วนตัวและเงื่อนไขการใช้บริการ')
    }

    const anonSupabase = createAnonSupabaseServerClient()
    const serviceRoleSupabase = createServiceRoleSupabaseClient()
    const fullName = `${firstName} ${lastName}`.trim()

    // Use admin.createUser to completely bypass email rate limits and auto-confirm the user
    const { data, error } = await serviceRoleSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'customer',
      },
    })

    if (error) {
      await recordAuditLog({
        userEmail: email,
        action: 'register_failed',
        ipAddress,
        userAgent,
        requestId,
        details: {
          context: 'api.auth.register',
          reason: error.message,
        },
      })

      // Try to translate the error for a better user experience
      let errorMessage = error.message
      if (errorMessage.includes('rate limit')) {
        errorMessage = 'ระบบมีการจำกัดจำนวนการสมัคร กรุณาลองใหม่อีกครั้งในภายหลัง หรือติดต่อผู้ดูแลระบบ'
      }

      return NextResponse.json({ error: errorMessage, requestId }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'ไม่สามารถสร้างบัญชีผู้ใช้ได้', requestId }, { status: 500 })
    }

    const { error: profileError } = await serviceRoleSupabase.from('profiles').upsert(
      {
        id: data.user.id,
        email,
        role: 'customer',
        display_name: fullName,
        timezone: 'Asia/Bangkok',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      await recordAuditLog({
        userId: data.user.id,
        userEmail: email,
        action: 'register_profile_upsert_failed',
        ipAddress,
        userAgent,
        requestId,
        details: {
          context: 'api.auth.register',
          reason: profileError.message,
        },
      })
    }

    await Promise.all([
      recordConsent({
        userId: data.user.id,
        email,
        consentType: 'privacy_policy',
        consentStatus: 'granted',
        policyVersion: COMPLIANCE_POLICY_VERSIONS.privacyPolicy,
        policyDocument: 'PDPA_PRIVACY_POLICY_TH',
        sourceChannel: 'register_page',
        locale,
        ipAddress,
        userAgent,
        requestId,
        metadata: {
          flow: 'email_registration',
        },
      }),
      recordConsent({
        userId: data.user.id,
        email,
        consentType: 'terms_of_service',
        consentStatus: 'granted',
        policyVersion: COMPLIANCE_POLICY_VERSIONS.termsOfService,
        policyDocument: 'TERMS_OF_SERVICE_TH',
        sourceChannel: 'register_page',
        locale,
        ipAddress,
        userAgent,
        requestId,
        metadata: {
          flow: 'email_registration',
        },
      }),
      ...(marketingAccepted
        ? [
            recordConsent({
              userId: data.user.id,
              email,
              consentType: 'marketing',
              consentStatus: 'granted',
              policyVersion: '1.0',
              policyDocument: 'MARKETING_CONSENT_INLINE',
              sourceChannel: 'register_page',
              locale,
              ipAddress,
              userAgent,
              requestId,
              metadata: {
                flow: 'email_registration',
              },
            }),
          ]
        : []),
      recordAuditLog({
        userId: data.user.id,
        userEmail: email,
        action: 'register_succeeded',
        ipAddress,
        userAgent,
        requestId,
        details: {
          context: 'api.auth.register',
          locale,
          privacy_policy_version: COMPLIANCE_POLICY_VERSIONS.privacyPolicy,
          terms_version: COMPLIANCE_POLICY_VERSIONS.termsOfService,
          marketing_consent: marketingAccepted,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      userId: data.user.id,
      emailConfirmationRequired: !data.session,
      requestId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'

    await recordAuditLog({
      action: 'register_exception',
      ipAddress,
      userAgent,
      requestId,
      details: {
        context: 'api.auth.register',
        reason: message,
      },
    }).catch(() => null)

    return NextResponse.json({ error: 'Server error', requestId }, { status: 500 })
  }
}