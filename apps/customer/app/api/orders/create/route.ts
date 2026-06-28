import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestId, getRequestIpAddress, recordAuditLog } from '@/lib/server/compliance'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import {
  calculatePricingSummary,
  getAvailablePricingPeriods,
} from '@/lib/servicePricing'

export const dynamic = 'force-dynamic'

type PriorityLevel = 'normal' | 'high' | 'urgent'
type PricingPeriod = 'one-time' | 'monthly' | 'yearly'

type AdditionalServiceInput = {
  id: string
  quantity: number
}

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const asNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : NaN
  }
  return NaN
}

const normalizePriority = (value: unknown): PriorityLevel => {
  const text = asText(value).toLowerCase()
  if (text === 'high' || text === 'urgent') return text
  return 'normal'
}

const normalizePricingPeriod = (value: unknown): PricingPeriod => {
  const text = asText(value).toLowerCase()
  if (text === 'monthly' || text === 'yearly') return text
  return 'one-time'
}

const generateOrderCode = () => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  return `ORD${timestamp}${random}`
}

const createSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

const isServiceBookingEnabled = async (supabase: ReturnType<typeof createSupabaseServiceClient>) => {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'features')
    .maybeSingle()

  if (error) {
    return { enabled: false, reason: 'settings_read_failed' as const, error: error.message }
  }

  const flags = (data?.value || {}) as { service_booking_enabled?: boolean }
  return {
    enabled: flags.service_booking_enabled !== false,
    reason: 'ok' as const,
    error: null,
  }
}

const writeAuditLog = async (args: {
  userId: string
  userEmail?: string | null
  action: string
  requestId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  details: Record<string, unknown>
}) => {
  try {
    await recordAuditLog({
      userId: args.userId,
      userEmail: args.userEmail || null,
      action: args.action,
      requestId: args.requestId,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      details: args.details,
    })
  } catch {
    // Best-effort only.
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req.headers)
  const ipAddress = getRequestIpAddress(req.headers)
  const userAgent = req.headers.get('user-agent')

  try {
    const requestUser = await resolveRequestUser(req)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))

    const houseId = asText(body?.houseId)
    const serviceId = asText(body?.serviceId)
    const priceTemplateId = asText(body?.priceTemplateId)
    const scheduledDate = asText(body?.scheduledDate)
    const notes = asText(body?.notes)
    const paymentMethod = asText(body?.paymentMethod).toLowerCase() || 'stripe'
    const priority = normalizePriority(body?.priority)
    const pricingPeriod = normalizePricingPeriod(body?.pricingPeriod)

    if (!houseId || !serviceId || !scheduledDate) {
      return NextResponse.json({ error: 'Missing required fields (house, service, or date)', requestId }, { status: 400 })
    }

    if (paymentMethod !== 'stripe' && paymentMethod !== 'promptpay') {
      return NextResponse.json(
        { error: 'Unsupported payment method. Stripe card or PromptPay checkout is required for service bookings.', requestId },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceClient()

    const featureStatus = await isServiceBookingEnabled(supabase)
    if (!featureStatus.enabled) {
      await writeAuditLog({
        userId: requestUser.id,
        userEmail: requestUser.email,
        action: 'service_booking_blocked_create_order',
        requestId,
        ipAddress,
        userAgent,
        details: {
          context: 'api.orders.create',
          reason: featureStatus.reason,
          detail: featureStatus.error,
          house_id: houseId,
          service_id: serviceId,
          price_template_id: priceTemplateId,
        },
      })

      return NextResponse.json(
        {
          error: 'Service booking is currently disabled',
          reason: featureStatus.reason,
          detail: featureStatus.error,
          requestId,
        },
        { status: 403 }
      )
    }

    const [{ data: house }, { data: service }, { data: priceTemplate }] = await Promise.all([
      supabase
        .from('houses')
        .select('id, area_size, user_id, customer_id')
        .eq('id', houseId)
        .or(`user_id.eq.${requestUser.id},customer_id.eq.${requestUser.id}`)
        .maybeSingle(),
      supabase.from('services').select('id, base_price, price, billing_type').eq('id', serviceId).maybeSingle(),
      priceTemplateId && priceTemplateId !== 'none'
        ? supabase
            .from('price_templates')
            .select('id, service_id, base_price, price_per_unit, pricing_period')
            .eq('id', priceTemplateId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (!house) {
      return NextResponse.json({ error: 'House not found or unauthorized', requestId }, { status: 404 })
    }

    if (!service) {
      return NextResponse.json({ error: 'Service not found', requestId }, { status: 404 })
    }

    if (priceTemplateId && priceTemplateId !== 'none' && (!priceTemplate || String((priceTemplate as any).service_id || '') !== serviceId)) {
      return NextResponse.json({ error: 'Invalid price template choice', requestId }, { status: 400 })
    }

    const houseArea = Math.max(0, asNumber((house as any).area_size) || 0)
    const availablePricingPeriods = getAvailablePricingPeriods(service as any, priceTemplate ? [priceTemplate as any] : [])

    if (!availablePricingPeriods.includes(pricingPeriod)) {
      return NextResponse.json({ error: 'Selected billing period is not available for this service', requestId }, { status: 400 })
    }

    let basePrice = 0
    if (priceTemplate) {
      basePrice = Math.max(0, asNumber((priceTemplate as any).base_price) || 0)
    } else {
      basePrice = Math.max(0, asNumber((service as any).base_price || (service as any).price) || 0)
    }

    const servicePricing = calculatePricingSummary({
      service: service as any,
      templates: priceTemplate ? [priceTemplate as any] : [],
      selectedTemplate: priceTemplate as any,
      area: houseArea,
      period: pricingPeriod,
      priority: 'normal',
    })
    const calculatedPrice = servicePricing.subtotal

    const rawAdditional = Array.isArray(body?.additionalServices)
      ? (body.additionalServices as Array<Record<string, unknown>>)
      : []

    const additionalInputs: AdditionalServiceInput[] = rawAdditional
      .map((item) => ({
        id: asText(item?.id),
        quantity: Math.max(0, Math.floor(asNumber(item?.quantity) || 0)),
      }))
      .filter((item) => item.id && item.quantity > 0)

    const mergedAdditional = new Map<string, number>()
    for (const item of additionalInputs) {
      mergedAdditional.set(item.id, (mergedAdditional.get(item.id) || 0) + item.quantity)
    }

    const additionalIds = Array.from(mergedAdditional.keys())
    const additionalServicesById = new Map<string, { id: string; price: number }>()

    if (additionalIds.length > 0) {
      const { data: additionalRows, error: additionalError } = await supabase
        .from('additional_services')
        .select('id, price')
        .in('id', additionalIds)
        .eq('is_active', true)

      if (additionalError) {
        return NextResponse.json({ error: additionalError.message, requestId }, { status: 500 })
      }

      for (const row of additionalRows || []) {
        additionalServicesById.set(row.id, {
          id: row.id,
          price: Math.max(0, asNumber((row as any).price) || 0),
        })
      }

      if (additionalServicesById.size !== additionalIds.length) {
        return NextResponse.json({ error: 'Some additional services are invalid or inactive', requestId }, { status: 400 })
      }
    }

    let additionalServicesPrice = 0
    for (const [id, quantity] of Array.from(mergedAdditional.entries())) {
      const serviceMeta = additionalServicesById.get(id)
      if (!serviceMeta) continue
      additionalServicesPrice += serviceMeta.price * quantity
    }

    const subtotal = calculatedPrice + additionalServicesPrice
    const priorityMultiplier = priority === 'high' ? 1.1 : priority === 'urgent' ? 1.2 : 1
    const totalPrice = subtotal * priorityMultiplier

    const now = new Date().toISOString()
    const orderCode = generateOrderCode()

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: requestUser.id,
        house_id: houseId,
        service_id: serviceId,
        price_template_id: priceTemplateId && priceTemplateId !== 'none' ? priceTemplateId : null,
        order_code: orderCode,
        service_area: houseArea,
        base_price: basePrice,
        calculated_price: calculatedPrice,
        additional_services_price: additionalServicesPrice,
        total: totalPrice,
        total_price: totalPrice,
        pricing_period: pricingPeriod,
        notes: notes || null,
        special_instructions: `payment_method=${paymentMethod}`,
        status: 'pending',
        scheduled_date: scheduledDate,
        priority,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()

    if (orderError || !orderData?.id) {
      return NextResponse.json({ error: orderError?.message || 'Failed to create order', requestId }, { status: 500 })
    }

    if (mergedAdditional.size > 0) {
      const rows = Array.from(mergedAdditional.entries()).map(([id, quantity]) => {
        const serviceMeta = additionalServicesById.get(id)
        const unitPrice = serviceMeta?.price || 0
        return {
          order_id: orderData.id,
          additional_service_id: id,
          quantity,
          unit_price: unitPrice,
          total_price: unitPrice * quantity,
        }
      })

      const { error: insertAdditionalError } = await supabase
        .from('order_additional_services')
        .insert(rows)

      if (insertAdditionalError) {
        return NextResponse.json({ error: insertAdditionalError.message, requestId }, { status: 500 })
      }
    }

    await writeAuditLog({
      userId: requestUser.id,
      userEmail: requestUser.email,
      action: 'customer_created_order',
      requestId,
      ipAddress,
      userAgent,
      details: {
        context: 'api.orders.create',
        order_id: orderData.id,
        house_id: houseId,
        service_id: serviceId,
        total_price: totalPrice,
        pricing_period: pricingPeriod,
        priority,
        additional_count: mergedAdditional.size,
      },
    })

    return NextResponse.json({
      success: true,
      orderId: orderData.id,
      orderCode,
      totalPrice,
      requestId,
    })
  } catch (error) {
    console.error('POST /api/orders/create error', error)
    return NextResponse.json({ error: 'Server error', requestId }, { status: 500 })
  }
}
