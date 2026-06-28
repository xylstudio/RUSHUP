import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

const createServiceClient = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase service configuration')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const isMissingFeedbackRelationError = (message: string) =>
  /customer_order_feedback|relation .* does not exist|could not find the table/i.test(message)

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await resolveRequestUser(req)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = String(params?.orderId || '').trim()
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: baseOrder, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('customer_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Customer order lookup failed:', error)
      return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
    }

    if (!baseOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const [
      serviceResult,
      customerProfileResult,
      priceTemplateResult,
      additionalServicesResult,
      paymentsResult,
      feedbackResult,
    ] = await Promise.all([
      baseOrder.service_id
        ? supabase
            .from('services')
            .select('*')
            .eq('id', baseOrder.service_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('profiles')
        .select('*')
        .eq('id', baseOrder.customer_id)
        .maybeSingle(),
      baseOrder.price_template_id
        ? supabase
            .from('price_templates')
            .select('*')
            .eq('id', baseOrder.price_template_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('order_additional_services')
        .select(`
          *,
          additional_services (
            *
          )
        `)
        .eq('order_id', orderId),
      supabase
        .from('payments')
        .select('id, provider, provider_charge_id, amount, currency, status, created_at, paid_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false }),
      supabase
        .from('customer_order_feedback')
        .select('id, order_id, customer_id, feedback_type, rating, comment_message, issue_message, source, status, created_at, updated_at')
        .eq('order_id', orderId)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    if (serviceResult.error) {
      console.error('Customer order service lookup failed:', serviceResult.error)
      return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
    }

    if (customerProfileResult.error) {
      console.error('Customer order profile lookup failed:', customerProfileResult.error)
      return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
    }

    if (priceTemplateResult.error) {
      console.error('Customer order price template lookup failed:', priceTemplateResult.error)
      return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
    }

    if (additionalServicesResult.error) {
      console.error('Customer order additional services lookup failed:', additionalServicesResult.error)
      return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
    }

    if (paymentsResult.error) {
      console.error('Customer order payments lookup failed:', paymentsResult.error)
      return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
    }

    let customerFeedback = Array.isArray(feedbackResult.data) ? feedbackResult.data : []
    if (feedbackResult.error) {
      if (isMissingFeedbackRelationError(feedbackResult.error.message || '')) {
        const auditLogsResult = await supabase
          .from('audit_logs')
          .select('id, created_at, details')
          .eq('user_id', user.id)
          .eq('action', 'customer_order_feedback_submitted')
          .order('created_at', { ascending: false })

        if (auditLogsResult.error) {
          console.error('Customer order feedback audit lookup failed:', auditLogsResult.error)
          return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
        }

        customerFeedback = (auditLogsResult.data || [])
          .map((log) => {
            const details = log.details && typeof log.details === 'object' ? log.details as Record<string, unknown> : {}
            if (asText(details.order_id) !== orderId) return null

            return {
              id: null,
              order_id: orderId,
              customer_id: user.id,
              feedback_type: asText(details.feedback_type),
              rating: typeof details.rating === 'number' ? details.rating : details.rating ? Number(details.rating) : null,
              comment_message: asText(details.comment_message) || null,
              issue_message: asText(details.issue_message) || null,
              source: asText(details.source) || 'web',
              status: 'new',
              created_at: asText(log.created_at) || null,
              updated_at: asText(log.created_at) || null,
              fallback_storage: 'audit_logs',
            }
          })
          .filter(Boolean)
      } else {
        console.error('Customer order feedback lookup failed:', feedbackResult.error)
        return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
      }
    }

    let house: any = null
    if (baseOrder.house_id) {
      const houseByIdResult = await supabase
        .from('houses')
        .select('*')
        .eq('id', baseOrder.house_id)
        .maybeSingle()

      if (houseByIdResult.error) {
        console.error('Customer order house lookup by id failed:', houseByIdResult.error)
        return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
      }

      house = houseByIdResult.data || null
    }

    if (!house && baseOrder.house_code) {
      const houseByCodeResult = await supabase
        .from('houses')
        .select('*')
        .eq('house_code', baseOrder.house_code)
        .maybeSingle()

      if (houseByCodeResult.error) {
        console.error('Customer order house lookup by code failed:', houseByCodeResult.error)
        return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
      }

      house = houseByCodeResult.data || null
    }

    const order = {
      ...baseOrder,
      services: serviceResult.data || null,
      houses: house,
      profiles: customerProfileResult.data || null,
      price_templates: priceTemplateResult.data || null,
      order_additional_services: additionalServicesResult.data || [],
      payments: paymentsResult.data || [],
      customer_feedback: customerFeedback,
      customer_rating: customerFeedback.find((item) => asText((item as Record<string, unknown>).feedback_type) === 'rating') || null,
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('GET /api/customer/orders/[orderId] error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}