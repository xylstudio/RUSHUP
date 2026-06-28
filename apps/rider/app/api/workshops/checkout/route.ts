import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendBookingEmails } from '@/lib/emailService'
import { getRequestId, getRequestIpAddress, recordAuditLog, recordConsent } from '@/lib/server/compliance'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Supabase service client for secure server-side writes/updates
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// XYL STUDIO workshops pricing (can be moved to DB later)
const priceMap: Record<string, number> = {
  'Tray Garden': 890,
  'Terrarium Garden': 990
}

const getProviderForMethod = (paymentMethod: string) => {
  switch (paymentMethod) {
    case 'promptpay':
      return 'stripe_promptpay'
    case 'creditcard':
      return 'stripe_card'
    case 'banktransfer':
      return 'banktransfer'
    default:
      return 'stripe_card'
  }
}

const getStripePaymentMethods = (paymentMethod: string): Array<'card' | 'promptpay'> => {
  return paymentMethod === 'promptpay' ? ['promptpay'] : ['card']
}

const normalizePaymentStatus = (status?: string | null) => {
  switch (status) {
    case 'paid':
    case 'complete':
    case 'succeeded':
      return 'paid'
    case 'failed':
    case 'cancelled':
    case 'expired':
      return 'failed'
    default:
      return 'pending'
  }
}

export async function POST(req: NextRequest) {
  const ipAddress = getRequestIpAddress(req.headers)
  const requestId = getRequestId(req.headers)
  const userAgent = req.headers.get('user-agent')

  try {
    const supabase = createSupabaseClient()
    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

    const body = await req.json()
    const {
      full_name, email, phone, topic, attendees_count, date, start_time, end_time, notes, honeypot,
      payment_method, payment_data, amount: providedAmount, client_token, workshop_language, consents
    } = body || {}

    // Basic validation
    if (honeypot) return NextResponse.json({ success: true })
    if (!full_name || !email || !date || !start_time || !end_time) {
      return NextResponse.json({ error: 'กรอกข้อมูลไม่ครบ', requestId }, { status: 400 })
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'อีเมลไม่ถูกต้อง', requestId }, { status: 400 })
    }
    if (consents?.privacyPolicy !== true || consents?.termsOfService !== true) {
      return NextResponse.json({ error: 'กรุณายอมรับนโยบายความเป็นส่วนตัวและเงื่อนไขการใช้บริการ', requestId }, { status: 400 })
    }
    const count = Number.isFinite(attendees_count) ? Math.max(1, Math.min(10, Number(attendees_count))) : 1
    const perPerson = priceMap[topic as string] ?? 890
    const amount = providedAmount || (perPerson * count)
    const nowIso = new Date().toISOString()
    const requestedMethod = typeof payment_method === 'string' ? payment_method : 'creditcard'
    const provider = getProviderForMethod(requestedMethod)

    // Idempotency: if client_token exists and payment already created, return it
    if (client_token) {
      const { data: existingPayment } = await supabase
        .from('workshop_payments')
        .select('id, booking_id, status, provider, provider_charge_id, amount, currency, paid_at, payment_data')
        .eq('client_token', client_token)
        .maybeSingle()
      if (existingPayment) {
        const { data: existingBooking } = await supabase
          .from('workshop_bookings')
          .select('id, created_at, status')
          .eq('id', existingPayment.booking_id)
          .single()

        const redirectUrl =
          existingPayment.provider.startsWith('stripe_') &&
          normalizePaymentStatus(existingPayment.status) === 'pending' &&
          typeof existingPayment.payment_data === 'object' &&
          existingPayment.payment_data !== null &&
          'checkout_url' in existingPayment.payment_data
            ? String(existingPayment.payment_data.checkout_url || '')
            : null

        return NextResponse.json({
          success: true,
          booking: existingBooking,
          payment: existingPayment,
          reused: true,
          client_token,
          redirectUrl: redirectUrl || undefined,
          sessionId: existingPayment.provider_charge_id || undefined,
        })
      }
    }

    // 1) Create booking
    const { data: booking, error: bookingErr } = await supabase
      .from('workshop_bookings')
      .insert({
        full_name,
        email,
        phone: phone || null,
        topic: topic || null,
        attendees_count: count,
        date,
        start_time,
        end_time,
        notes: notes || null,
        status: 'pending'
      })
      .select('id, created_at')
      .single()

    if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 500 })

    await Promise.all([
      recordConsent({
        email,
        consentType: 'privacy_policy',
        consentStatus: 'granted',
        policyVersion: '1.0',
        policyDocument: 'PDPA_PRIVACY_POLICY_TH',
        sourceChannel: 'workshop_checkout',
        locale: typeof workshop_language === 'string' ? workshop_language : null,
        ipAddress,
        userAgent,
        metadata: {
          booking_id: booking.id,
          client_token: client_token || null,
          topic: topic || null,
          request_id: requestId,
        },
      }),
      recordConsent({
        email,
        consentType: 'terms_of_service',
        consentStatus: 'granted',
        policyVersion: '1.0',
        policyDocument: 'TERMS_OF_SERVICE_TH',
        sourceChannel: 'workshop_checkout',
        locale: typeof workshop_language === 'string' ? workshop_language : null,
        ipAddress,
        userAgent,
        metadata: {
          booking_id: booking.id,
          client_token: client_token || null,
          topic: topic || null,
          request_id: requestId,
        },
      }),
      ...(consents?.marketing === true
        ? [
            recordConsent({
              email,
              consentType: 'marketing',
              consentStatus: 'granted',
              policyVersion: '1.0',
              policyDocument: 'MARKETING_CONSENT_INLINE',
              sourceChannel: 'workshop_checkout',
              locale: typeof workshop_language === 'string' ? workshop_language : null,
              ipAddress,
              userAgent,
              metadata: {
                booking_id: booking.id,
                client_token: client_token || null,
                topic: topic || null,
                request_id: requestId,
              },
            }),
          ]
        : []),
      recordAuditLog({
        userEmail: email,
        action: 'workshop_checkout_started',
        ipAddress,
        userAgent,
        requestId,
        details: {
          context: 'api.workshops.checkout',
          booking_id: booking.id,
          payment_method: requestedMethod,
          topic: topic || null,
          attendees_count: count,
          amount,
          marketing_consent: consents?.marketing === true,
        },
      }),
    ])

    // 2) Record payment with method-specific logic
    let paymentStatus = 'pending'
    let providerChargeId: string | null = null
    let redirectUrl: string | null = null
    let stripeSessionPayload: Record<string, unknown> | null = null

    if (provider.startsWith('stripe_')) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: getStripePaymentMethods(requestedMethod),
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: 'thb',
              product_data: {
                name: topic ? `Workshop: ${topic}` : 'XYL Studio Workshop',
                description: `${date} ${start_time}-${end_time}`,
              },
              unit_amount: Math.round(Number(amount) * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/workshops/success?booking=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/workshops/payment?cancelled=1`,
        metadata: {
          payment_context: 'workshop',
          booking_id: booking.id,
          client_token: client_token || '',
          payment_method: requestedMethod,
          workshop_topic: topic || 'Workshop',
          workshop_date: date,
          workshop_time: `${start_time}-${end_time}`,
          attendees_count: String(count),
          customer_name: full_name,
          customer_email: email,
        },
      })

      providerChargeId = session.id
      redirectUrl = session.url || null
      stripeSessionPayload = {
        stripe_session_id: session.id,
        checkout_url: session.url,
        payment_method_types: session.payment_method_types,
        status: session.status,
      }

      if (!redirectUrl) {
        throw new Error('Failed to create Stripe checkout URL')
      }
    } else if (requestedMethod === 'banktransfer') {
      paymentStatus = 'pending'
    } else {
      return NextResponse.json({ error: 'Unsupported payment method', requestId }, { status: 400 })
    }

    const { data: payment, error: payErr } = await supabase
      .from('workshop_payments')
      .insert({
        booking_id: booking.id,
        provider,
        provider_charge_id: providerChargeId,
        amount,
        currency: 'THB',
        status: paymentStatus,
        payer_email: email,
        paid_at: paymentStatus === 'paid' ? nowIso : null,
        payment_data: {
          provider,
          original_payment_data: payment_data || null,
          stripe: stripeSessionPayload,
          client_token: client_token || null,
        },
        client_token: client_token || null
      })
      .select('id, status, amount, currency, paid_at, provider, provider_charge_id, payment_data')
      .single()

    if (payErr) {
      if (client_token) {
        const { data: existingPayment } = await supabase
          .from('workshop_payments')
          .select('id, booking_id, status, provider, provider_charge_id, amount, currency, paid_at, payment_data')
          .eq('client_token', client_token)
          .maybeSingle()
        if (existingPayment) {
          const existingRedirectUrl =
            typeof existingPayment.payment_data === 'object' &&
            existingPayment.payment_data !== null &&
            'checkout_url' in existingPayment.payment_data
              ? String(existingPayment.payment_data.checkout_url || '')
              : null

          return NextResponse.json({
            success: true,
            booking,
            payment: existingPayment,
            reused: true,
            client_token,
            redirectUrl: existingRedirectUrl || undefined,
            sessionId: existingPayment.provider_charge_id || undefined,
          })
        }
      }
      return NextResponse.json({ error: payErr.message, requestId }, { status: 500 })
    }

    await recordAuditLog({
      userEmail: email,
      action: 'workshop_payment_initiated',
      ipAddress,
      userAgent,
      requestId,
      details: {
        context: 'api.workshops.checkout',
        booking_id: booking.id,
        payment_id: payment.id,
        provider,
        payment_method: requestedMethod,
        status: paymentStatus,
        amount,
      },
    })

    // Update booking status based on payment status
    const bookingStatus = paymentStatus === 'paid' ? 'confirmed' : 'pending_payment'
    await supabase
      .from('workshop_bookings')
      .update({ status: bookingStatus })
      .eq('id', booking.id)

    // Send confirmation emails
    try {
      await sendBookingEmails({
        customerName: full_name,
        customerEmail: email,
        workshopTopic: topic || 'Workshop',
        workshopDate: date,
        workshopTime: `${start_time} - ${end_time}`,
        attendeesCount: count,
        totalAmount: amount,
        bookingId: booking.id.toString(),
        paymentMethod: requestedMethod,
        paymentStatus: paymentStatus as 'paid' | 'pending' | 'pending_cash',
        language: (workshop_language || 'th') as 'th' | 'en' | 'zh'
      })
      console.log('Booking emails sent successfully')
    } catch (emailError) {
      console.error('Failed to send booking emails:', emailError)
      // Don't fail the booking if email fails
    }

    return NextResponse.json({
      success: true,
      booking,
      payment,
      amount,
      perPerson,
      attendees_count: count,
      currency: 'THB',
      payment_method: requestedMethod,
      provider,
      status: bookingStatus,
      client_token: client_token || null,
      requestId,
      redirectUrl: redirectUrl || undefined,
      sessionId: providerChargeId || undefined,
    })
  } catch (err) {
    console.error('POST /api/workshops/checkout error', err)
    return NextResponse.json({ error: 'Server error', requestId }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { searchParams } = new URL(req.url)
    const bookingId = searchParams.get('booking_id')
    const sessionId = searchParams.get('session_id')
    const clientToken = searchParams.get('client_token')

    if (!bookingId && !sessionId && !clientToken) {
      return NextResponse.json({ error: 'booking_id, session_id, or client_token is required' }, { status: 400 })
    }

    let query = supabase
      .from('workshop_payments')
      .select(`
        id,
        booking_id,
        provider,
        provider_charge_id,
        amount,
        currency,
        status,
        payer_email,
        paid_at,
        payment_data,
        created_at,
        workshop_bookings (
          id,
          full_name,
          email,
          topic,
          attendees_count,
          date,
          start_time,
          end_time,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1)

    if (sessionId) {
      query = query.eq('provider_charge_id', sessionId)
    } else if (clientToken) {
      query = query.eq('client_token', clientToken)
    } else if (bookingId) {
      query = query.eq('booking_id', bookingId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json({ payment: data })
  } catch (err) {
    console.error('GET /api/workshops/checkout error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
