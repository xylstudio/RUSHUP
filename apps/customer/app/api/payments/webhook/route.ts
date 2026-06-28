import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestId, getRequestIpAddress, recordAuditLog } from '@/lib/server/compliance'

export const dynamic = 'force-dynamic'

function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Webhook endpoint for payment status updates
export async function POST(req: NextRequest) {
  const requestId = getRequestId(req.headers)
  const ipAddress = getRequestIpAddress(req.headers)
  const userAgent = req.headers.get('user-agent')

  try {
    const body = await req.json()
    const { 
      event_type, 
      booking_id, 
      payment_id, 
      status, 
      transaction_id,
      provider,
      webhook_secret 
    } = body || {}

    // Verify webhook secret (in production, use proper webhook verification)
    const expectedSecret = process.env.WEBHOOK_SECRET || 'dev_secret_123'
    if (webhook_secret !== expectedSecret) {
      await recordAuditLog({
        action: 'payment_webhook_rejected',
        ipAddress,
        userAgent,
        requestId,
        details: {
          context: 'api.payments.webhook',
          event_type,
          booking_id: booking_id || null,
          payment_id: payment_id || null,
          provider: provider || null,
          reason: 'invalid_webhook_secret',
        },
      })
      return NextResponse.json({ error: 'Invalid webhook secret', requestId }, { status: 401 })
    }

    await recordAuditLog({
      action: 'payment_webhook_received',
      ipAddress,
      userAgent,
      requestId,
      details: {
        context: 'api.payments.webhook',
        event_type,
        booking_id: booking_id || null,
        payment_id: payment_id || null,
        status: status || null,
        provider: provider || null,
        transaction_id: transaction_id || null,
      },
    })

    switch (event_type) {
      case 'payment.completed':
        await handlePaymentCompleted(booking_id, payment_id, status, transaction_id, requestId, ipAddress, userAgent)
        break
      case 'payment.failed':
        await handlePaymentFailed(booking_id, payment_id, status, requestId, ipAddress, userAgent)
        break
      case 'payment.cancelled':
        await handlePaymentCancelled(booking_id, payment_id, status, requestId, ipAddress, userAgent)
        break
      default:
        await recordAuditLog({
          action: 'payment_webhook_ignored',
          ipAddress,
          userAgent,
          requestId,
          details: {
            context: 'api.payments.webhook',
            event_type,
            booking_id: booking_id || null,
            payment_id: payment_id || null,
          },
        })
    }

    return NextResponse.json({ success: true, processed: event_type, requestId })
  } catch (err) {
    console.error('Payment webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed', requestId }, { status: 500 })
  }
}

async function handlePaymentCompleted(bookingId: string, paymentId: string, status: string, transactionId?: string, requestId?: string, ipAddress?: string | null, userAgent?: string | null) {
  try {
    const supabase = createSupabaseServiceClient()

    // Update payment status
    const { error: paymentError } = await supabase
      .from('workshop_payments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        transaction_id: transactionId || null
      })
      .eq('id', paymentId)

    if (paymentError) {
      console.error('Error updating payment:', paymentError)
      await recordAuditLog({
        action: 'payment_webhook_update_failed',
        ipAddress,
        userAgent,
        requestId,
        details: {
          context: 'api.payments.webhook.completed',
          stage: 'payment_update',
          booking_id: bookingId,
          payment_id: paymentId,
          error: paymentError.message,
        },
      })
      return
    }

    // Update booking status to confirmed
    const { error: bookingError } = await supabase
      .from('workshop_bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)

    if (bookingError) {
      console.error('Error updating booking:', bookingError)
      await recordAuditLog({
        action: 'payment_webhook_update_failed',
        ipAddress,
        userAgent,
        requestId,
        details: {
          context: 'api.payments.webhook.completed',
          stage: 'booking_update',
          booking_id: bookingId,
          payment_id: paymentId,
          error: bookingError.message,
        },
      })
      return
    }

    // TODO: Send confirmation email to customer
    // await sendConfirmationEmail(bookingId)

    await recordAuditLog({
      action: 'payment_webhook_completed',
      ipAddress,
      userAgent,
      requestId,
      details: {
        context: 'api.payments.webhook.completed',
        booking_id: bookingId,
        payment_id: paymentId,
        status,
        transaction_id: transactionId || null,
      },
    })
  } catch (err) {
    console.error('Error handling payment completion:', err)
  }
}

async function handlePaymentFailed(bookingId: string, paymentId: string, status: string, requestId?: string, ipAddress?: string | null, userAgent?: string | null) {
  try {
    const supabase = createSupabaseServiceClient()

    // Update payment status
    const { error: paymentError } = await supabase
      .from('workshop_payments')
      .update({ status: 'failed' })
      .eq('id', paymentId)

    if (paymentError) {
      console.error('Error updating payment:', paymentError)
      await recordAuditLog({
        action: 'payment_webhook_update_failed',
        ipAddress,
        userAgent,
        requestId,
        details: {
          context: 'api.payments.webhook.failed',
          stage: 'payment_update',
          booking_id: bookingId,
          payment_id: paymentId,
          error: paymentError.message,
        },
      })
      return
    }

    // Update booking status
    const { error: bookingError } = await supabase
      .from('workshop_bookings')
      .update({ status: 'payment_failed' })
      .eq('id', bookingId)

    if (bookingError) {
      console.error('Error updating booking:', bookingError)
      await recordAuditLog({
        action: 'payment_webhook_update_failed',
        ipAddress,
        userAgent,
        requestId,
        details: {
          context: 'api.payments.webhook.failed',
          stage: 'booking_update',
          booking_id: bookingId,
          payment_id: paymentId,
          error: bookingError.message,
        },
      })
      return
    }

    // TODO: Send payment failed email to customer
    // await sendPaymentFailedEmail(bookingId)

    await recordAuditLog({
      action: 'payment_webhook_failed',
      ipAddress,
      userAgent,
      requestId,
      details: {
        context: 'api.payments.webhook.failed',
        booking_id: bookingId,
        payment_id: paymentId,
        status,
      },
    })
  } catch (err) {
    console.error('Error handling payment failure:', err)
  }
}

async function handlePaymentCancelled(bookingId: string, paymentId: string, status: string, requestId?: string, ipAddress?: string | null, userAgent?: string | null) {
  try {
    const supabase = createSupabaseServiceClient()

    // Update payment status
    const { error: paymentError } = await supabase
      .from('workshop_payments')
      .update({ status: 'cancelled' })
      .eq('id', paymentId)

    if (paymentError) {
      console.error('Error updating payment:', paymentError)
      await recordAuditLog({
        action: 'payment_webhook_update_failed',
        ipAddress,
        userAgent,
        requestId,
        details: {
          context: 'api.payments.webhook.cancelled',
          stage: 'payment_update',
          booking_id: bookingId,
          payment_id: paymentId,
          error: paymentError.message,
        },
      })
      return
    }

    // Update booking status
    const { error: bookingError } = await supabase
      .from('workshop_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)

    if (bookingError) {
      console.error('Error updating booking:', bookingError)
      await recordAuditLog({
        action: 'payment_webhook_update_failed',
        ipAddress,
        userAgent,
        requestId,
        details: {
          context: 'api.payments.webhook.cancelled',
          stage: 'booking_update',
          booking_id: bookingId,
          payment_id: paymentId,
          error: bookingError.message,
        },
      })
      return
    }

    await recordAuditLog({
      action: 'payment_webhook_cancelled',
      ipAddress,
      userAgent,
      requestId,
      details: {
        context: 'api.payments.webhook.cancelled',
        booking_id: bookingId,
        payment_id: paymentId,
        status,
      },
    })
  } catch (err) {
    console.error('Error handling payment cancellation:', err)
  }
}

// GET endpoint to check payment status
export async function GET(req: NextRequest) {
  const requestId = getRequestId(req.headers)
  try {
    const supabase = createSupabaseServiceClient()

    const { searchParams } = new URL(req.url)
    const bookingId = searchParams.get('booking_id')
    const paymentId = searchParams.get('payment_id')

    if (!bookingId && !paymentId) {
      return NextResponse.json({ error: 'booking_id or payment_id required', requestId }, { status: 400 })
    }

    let query = supabase
      .from('workshop_payments')
      .select(`
        *,
        workshop_bookings (
          id,
          full_name,
          email,
          topic,
          date,
          start_time,
          end_time,
          status
        )
      `)

    if (paymentId) {
      query = query.eq('id', paymentId)
    } else if (bookingId) {
      query = query.eq('booking_id', bookingId)
    }

    const { data, error } = await query.single()

    if (error) {
      return NextResponse.json({ error: error.message, requestId }, { status: 404 })
    }

    return NextResponse.json({ payment: data, requestId })
  } catch (err) {
    console.error('Payment status check error:', err)
    return NextResponse.json({ error: 'Server error', requestId }, { status: 500 })
  }
}