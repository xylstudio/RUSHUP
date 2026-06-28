import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { sendLineNotification, sendLineFlexNotification } from '@/lib/line'

export const dynamic = 'force-dynamic'

function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function awardLoyaltyPointsOnce(supabase: ReturnType<typeof createSupabaseServiceClient>, order: any) {
  if (!order?.line_user_id) return

  const pointsToEarn = Math.floor(Number(order.total_amount || 0) / 100)
  if (pointsToEarn <= 0) return

  const { data: existingHistory } = await supabase
    .from('pos_points_history')
    .select('id')
    .eq('order_id', order.id)
    .eq('type', 'earn')
    .limit(1)
    .maybeSingle()

  if (existingHistory) {
    return
  }

  try {
    await supabase.rpc('increment_member_points', {
      user_id: order.line_user_id,
      points_to_add: pointsToEarn,
    })

    const historyPayload = {
      member_id: order.line_user_id,
      order_id: order.id,
      points: pointsToEarn,
      type: 'earn',
      description: `Earned from Order #${order.order_number}`,
    }

    const { error: historyError } = await supabase
      .from('pos_points_history')
      .insert(historyPayload)

    if (historyError && historyError.message.includes('column "description" of relation "pos_points_history" does not exist')) {
      const { description, ...fallbackPayload } = historyPayload
      await supabase.from('pos_points_history').insert(fallbackPayload)
    } else if (historyError) {
      throw historyError
    }
  } catch (error) {
    console.error('Point accrual error:', error)
  }
}

async function sendOrderPaidNotificationOnce(supabase: ReturnType<typeof createSupabaseServiceClient>, order: any) {
  if (!order?.line_user_id) return

  const { data: items } = await supabase
    .from('pos_order_items')
    .select(`quantity, pos_menu_items(name, sale_price)`)
    .eq('order_id', order.id)

  const mappedItems = (items || []).map((it: any) => ({
    name: it.pos_menu_items?.name || 'เมนูพิเศษ',
    quantity: it.quantity,
    sale_price: it.pos_menu_items?.sale_price || 0,
  }))

  await sendLineFlexNotification(order.line_user_id, {
    status: 'paid',
    orderNumber: order.order_number,
    orderId: order.id,
    totalAmount: order.total_amount,
    deliveryFee: order.delivery_fee,
    items: mappedItems,
  })
}

async function settlePosOrderPayment(args: {
  lookupColumn: 'stripe_session_id' | 'payment_intent_id'
  lookupValue: string
  customerName?: string
  customerImage?: string
}) {
  const supabase = createSupabaseServiceClient()
  const { data: order, error } = await supabase
    .from('pos_orders')
    .select('id, line_user_id, total_amount, delivery_fee, order_number, status, paid_at, customer_name, customer_image, table_id')
    .eq(args.lookupColumn, args.lookupValue)
    .maybeSingle()

  if (error) {
    console.error('POS payment lookup error:', error)
    return false
  }

  if (!order) {
    return false
  }

  const alreadyPaid = order.status === 'paid' && Boolean(order.paid_at)
  if (!alreadyPaid) {
    const { error: updateError } = await supabase
      .from('pos_orders')
      .update({
        status: 'paid',
        paid_at: order.paid_at || new Date().toISOString(),
        customer_name: args.customerName || order.customer_name,
        customer_image: args.customerImage || order.customer_image,
      })
      .eq('id', order.id)

    if (order.table_id) {
      await supabase.from('pos_tables').update({ status: 'available' }).eq('id', order.table_id)
    }

    // Update pos_order_payments to paid as well for this session/intent
    await supabase.from('pos_order_payments').update({ status: 'paid' }).eq('order_id', order.id)

    if (updateError) {
      console.error('POS payment update error:', updateError)
      return false
    }
  }

  if (alreadyPaid) {
    return true
  }

  await awardLoyaltyPointsOnce(supabase, order)
  await sendOrderPaidNotificationOnce(supabase, order)
  return true
}

async function syncServiceOrderPaymentStatus(args: {
  orderId: string
  userId: string
  sessionId: string
  status: 'pending' | 'paid' | 'failed'
  amountTotal?: number | null
}) {
  const supabase = createSupabaseServiceClient()
  const { data: payment, error: paymentLookupError } = await supabase
    .from('payments')
    .select('id, status, paid_at, order_id')
    .eq('order_id', args.orderId)
    .eq('user_id', args.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (paymentLookupError) {
    console.warn('Service payment lookup failed:', paymentLookupError)
    return false
  }

  const nextPaidAt = args.status === 'paid'
    ? payment?.paid_at || new Date().toISOString()
    : null

  const paymentPayload = {
    order_id: args.orderId,
    user_id: args.userId,
    provider: 'stripe',
    provider_charge_id: args.sessionId,
    amount: typeof args.amountTotal === 'number' ? Number((args.amountTotal / 100).toFixed(2)) : undefined,
    currency: 'THB',
    status: args.status,
    paid_at: nextPaidAt,
  }

  if (payment) {
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update(paymentPayload)
      .eq('id', payment.id)

    if (paymentUpdateError) {
      console.warn('Service payment update failed:', paymentUpdateError)
      return false
    }
  } else {
    const { error: paymentInsertError } = await supabase
      .from('payments')
      .insert(paymentPayload)

    if (paymentInsertError) {
      console.warn('Service payment insert failed:', paymentInsertError)
      return false
    }
  }

  if (args.status === 'paid') {
    const { data: order } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', args.orderId)
      .maybeSingle()

    if (order && order.status === 'pending') {
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', args.orderId)

      if (orderUpdateError) {
        console.warn('Service order update failed:', orderUpdateError)
      }
    }
  }

  return true
}

async function syncWorkshopPaymentStatus(args: {
  sessionId: string
  status: 'paid' | 'pending' | 'failed'
  sessionObject: Record<string, unknown>
}) {
  const supabase = createSupabaseServiceClient()
  const { data: payment, error: paymentLookupError } = await supabase
    .from('workshop_payments')
    .select('id, booking_id, status, payment_data')
    .eq('provider_charge_id', args.sessionId)
    .maybeSingle()

  if (paymentLookupError || !payment) {
    if (paymentLookupError) {
      console.warn('Workshop payment lookup failed:', paymentLookupError)
    }
    return false
  }

  const nextBookingStatus = args.status === 'paid'
    ? 'confirmed'
    : args.status === 'failed'
      ? 'payment_failed'
      : 'pending_payment'

  const previousPaymentData = payment.payment_data && typeof payment.payment_data === 'object'
    ? payment.payment_data
    : {}

  const { error: paymentUpdateError } = await supabase
    .from('workshop_payments')
    .update({
      status: args.status,
      paid_at: args.status === 'paid' ? new Date().toISOString() : null,
      payment_data: {
        ...previousPaymentData,
        stripe: args.sessionObject,
        webhook_updated_at: new Date().toISOString(),
      },
    })
    .eq('id', payment.id)

  if (paymentUpdateError) {
    console.warn('Workshop payment update failed:', paymentUpdateError)
    return false
  }

  const { error: bookingUpdateError } = await supabase
    .from('workshop_bookings')
    .update({ status: nextBookingStatus })
    .eq('id', payment.booking_id)

  if (bookingUpdateError) {
    console.warn('Workshop booking update failed:', bookingUpdateError)
  }

  return true
}


async function settlePartialPosOrderPayment(intentId: string) {
  const supabase = createSupabaseServiceClient()
  
  // 1. Mark pos_order_payments as paid
  const { data: payment, error: pError } = await supabase
    .from('pos_order_payments')
    .update({ status: 'paid' })
    .eq('stripe_payment_intent_id', intentId)
    .select('order_id, amount')
    .single()
    
  if (pError || !payment) {
    // If not found in pos_order_payments, maybe it's a full order payment using the old logic?
    return false;
  }
  
  // 2. Check if total paid >= total order amount
  const { data: allPayments } = await supabase
    .from('pos_order_payments')
    .select('amount')
    .eq('order_id', payment.order_id)
    .eq('status', 'paid')
    
  const totalPaid = allPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
  
  const { data: order } = await supabase
    .from('pos_orders')
    .select('id, total_amount, status, line_user_id, order_number, table_id')
    .eq('id', payment.order_id)
    .single()
    
  if (order && totalPaid >= Number(order.total_amount) && order.status !== 'paid') {
    await supabase.from('pos_orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', order.id)
    if (order.table_id) {
      await supabase.from('pos_tables').update({ status: 'available' }).eq('id', order.table_id)
    }
    await awardLoyaltyPointsOnce(supabase, order)
    await sendOrderPaidNotificationOnce(supabase, order)
  }
  
  return true;
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') as string

  let event

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is missing');
    }
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      webhookSecret
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    if (session.metadata?.payment_context === 'workshop') {
      await syncWorkshopPaymentStatus({
        sessionId: session.id,
        status: session.payment_status === 'paid' ? 'paid' : 'pending',
        sessionObject: session,
      })
      return NextResponse.json({ received: true })
    }

    if (session.metadata?.payment_context === 'service_order' && session.metadata?.order_id && session.metadata?.user_id) {
      await syncServiceOrderPaymentStatus({
        orderId: session.metadata.order_id,
        userId: session.metadata.user_id,
        sessionId: session.id,
        status: session.payment_status === 'paid' ? 'paid' : 'pending',
        amountTotal: session.amount_total,
      })
      return NextResponse.json({ received: true })
    }
  }

  if (event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as any
    if (session.metadata?.payment_context === 'workshop') {
      await syncWorkshopPaymentStatus({
        sessionId: session.id,
        status: 'paid',
        sessionObject: session,
      })
      return NextResponse.json({ received: true })
    }

    if (session.metadata?.payment_context === 'service_order' && session.metadata?.order_id && session.metadata?.user_id) {
      await syncServiceOrderPaymentStatus({
        orderId: session.metadata.order_id,
        userId: session.metadata.user_id,
        sessionId: session.id,
        status: 'paid',
        amountTotal: session.amount_total,
      })
      return NextResponse.json({ received: true })
    }
  }

  if (event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired') {
    const session = event.data.object as any
    if (session.metadata?.payment_context === 'workshop') {
      await syncWorkshopPaymentStatus({
        sessionId: session.id,
        status: 'failed',
        sessionObject: session,
      })
      return NextResponse.json({ received: true })
    }

    if (session.metadata?.payment_context === 'service_order' && session.metadata?.order_id && session.metadata?.user_id) {
      await syncServiceOrderPaymentStatus({
        orderId: session.metadata.order_id,
        userId: session.metadata.user_id,
        sessionId: session.id,
        status: 'failed',
        amountTotal: session.amount_total,
      })
      return NextResponse.json({ received: true })
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    await settlePosOrderPayment({
      lookupColumn: 'stripe_session_id',
      lookupValue: session.id,
      customerName: session.metadata?.customer_name || '',
      customerImage: session.metadata?.customer_image || '',
    })
  } else if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as any
    
    // Check if it's a split bill payment
    if (intent.metadata?.type === 'pos_order') {
      await settlePartialPosOrderPayment(intent.id)
    } else {
      // Fallback to old logic
      await settlePosOrderPayment({
        lookupColumn: 'payment_intent_id',
        lookupValue: intent.id,
      })
    }
  }

  return NextResponse.json({ received: true })
}
