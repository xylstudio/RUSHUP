import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const createSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

const resolveOrderAmount = (order: { total_price?: number | null; total?: number | null }) => {
  const amount = Number(order.total_price ?? order.total ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

export async function POST(req: NextRequest) {
  try {
    const requestUser = await resolveRequestUser(req)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const orderId = asText(body?.orderId)
    const paymentMethod = asText(body?.paymentMethod).toLowerCase()

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, order_code, total, total_price, status, pricing_period')
      .eq('id', orderId)
      .eq('customer_id', requestUser.id)
      .maybeSingle()

    if (orderError) {
      console.error('Service order lookup failed:', orderError)
      return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      return NextResponse.json({ error: 'Order is no longer payable' }, { status: 409 })
    }

    const amount = resolveOrderAmount(order)
    if (amount <= 0) {
      return NextResponse.json({ error: 'Order total is invalid' }, { status: 400 })
    }

    const { data: paidPayment } = await supabase
      .from('payments')
      .select('id, provider_charge_id')
      .eq('order_id', order.id)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paidPayment) {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 409 })
    }

    const origin = new URL(req.url).origin
    const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = paymentMethod === 'promptpay' ? ['promptpay'] : ['card']
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: paymentMethodTypes,
      client_reference_id: order.id,
      customer_email: requestUser.email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'thb',
            product_data: {
              name: `Service Order ${order.order_code || order.id.slice(0, 8)}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        payment_context: 'service_order',
        order_id: order.id,
        user_id: requestUser.id,
        order_code: order.order_code || '',
      },
      success_url: `${origin}/dashboard/customer?tab=orders&payment_status=success&order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/customer?tab=orders&payment_status=cancel&order_id=${order.id}`,
    })

    const paymentPayload = {
      order_id: order.id,
      user_id: requestUser.id,
      provider: 'stripe',
      provider_charge_id: session.id,
      amount,
      currency: 'THB',
      status: 'pending' as const,
      paid_at: null,
    }

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('order_id', order.id)
      .neq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingPayment) {
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update(paymentPayload)
        .eq('id', existingPayment.id)

      if (updatePaymentError) {
        console.error('Service order payment update failed:', updatePaymentError)
        return NextResponse.json({ error: 'Failed to prepare payment' }, { status: 500 })
      }
    } else {
      const { error: insertPaymentError } = await supabase
        .from('payments')
        .insert(paymentPayload)

      if (insertPaymentError) {
        console.error('Service order payment insert failed:', insertPaymentError)
        return NextResponse.json({ error: 'Failed to prepare payment' }, { status: 500 })
      }
    }

    return NextResponse.json({
      id: session.id,
      url: session.url,
      orderId: order.id,
    })
  } catch (error: any) {
    console.error('POST /api/orders/checkout error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}