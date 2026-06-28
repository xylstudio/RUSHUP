import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { sendLinePushToOrderStakeholders } from '@/lib/server/lineMessaging'

export const dynamic = 'force-dynamic'

type PriorityLevel = 'normal' | 'high' | 'urgent'

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

const asStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[]
  return value.map((item) => asText(item)).filter(Boolean)
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

const ensureAdmin = async (
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  userId: string
) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error || !profile) return false
  return String(profile.role || '').toLowerCase() === 'admin'
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
  supabase: ReturnType<typeof createSupabaseServiceClient>
  userId: string
  userEmail?: string | null
  action: string
  details: Record<string, unknown>
}) => {
  try {
    await args.supabase.from('audit_logs').insert({
      user_id: args.userId,
      user_email: args.userEmail || null,
      action: args.action,
      details: args.details,
    })
  } catch {
    // Best-effort only.
  }
}

export async function GET(req: NextRequest) {
  try {
    const requestUser = await resolveRequestUser(req)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()
    const isAdmin = await ensureAdmin(supabase, requestUser.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [{ data: customers, error: customersError }, { data: houses, error: housesError }, { data: services, error: servicesError }, { data: templates, error: templatesError }, { data: additionalServices, error: additionalError }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, email, customer_base_code')
        .eq('role', 'customer')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('houses')
        .select('id, customer_id, user_id, name, address, house_code, area_size')
        .order('created_at', { ascending: false })
        .limit(2000),
      supabase
        .from('services')
        .select('id, service_name, name, billing_type, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('price_templates')
        .select('id, service_id, template_name, area_min, area_max, base_price, price_per_unit')
        .order('created_at', { ascending: false })
        .limit(2000),
      supabase
        .from('additional_services')
        .select('id, service_name, category, price, is_active')
        .eq('is_active', true)
        .order('service_name', { ascending: true }),
    ])

    if (customersError) return NextResponse.json({ error: customersError.message }, { status: 500 })
    if (housesError) return NextResponse.json({ error: housesError.message }, { status: 500 })
    if (servicesError) return NextResponse.json({ error: servicesError.message }, { status: 500 })
    if (templatesError) return NextResponse.json({ error: templatesError.message }, { status: 500 })
    if (additionalError) return NextResponse.json({ error: additionalError.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      customers: customers || [],
      houses: houses || [],
      services: services || [],
      priceTemplates: templates || [],
      additionalServices: additionalServices || [],
    })
  } catch (error) {
    console.error('GET /api/admin/orders/create error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const requestUser = await resolveRequestUser(req)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))

    const customerId = asText(body?.customerId)
    const houseId = asText(body?.houseId)
    const serviceId = asText(body?.serviceId)
    const priceTemplateId = asText(body?.priceTemplateId)
    const scheduledDate = asText(body?.scheduledDate)
    const preferredTimeStart = asText(body?.preferredTimeStart)
    const preferredTimeEnd = asText(body?.preferredTimeEnd)
    const notes = asText(body?.notes)
    const specialInstructions = asText(body?.specialInstructions)
    const paymentMethod = asText(body?.paymentMethod)
    const priority = normalizePriority(body?.priority)
    const pricingPeriod = asText(body?.pricingPeriod) || 'one-time'
    const sessionsPerPeriod = asNumber(body?.sessionsPerPeriod) || 1
    const totalSessions = asNumber(body?.totalSessions) || 1
    const manualTotalPrice = asNumber(body?.manualTotalPrice)

    if (!customerId || !houseId || !serviceId || !priceTemplateId || !scheduledDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const isAdmin = await ensureAdmin(supabase, requestUser.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [{ data: house }, { data: service }, { data: priceTemplate }, { data: customerProfile }] = await Promise.all([
      supabase
        .from('houses')
        .select('id, name, area_size, user_id, customer_id')
        .eq('id', houseId)
        .or(`user_id.eq.${customerId},customer_id.eq.${customerId}`)
        .maybeSingle(),
      supabase.from('services').select('id, service_name, name').eq('id', serviceId).maybeSingle(),
      supabase
        .from('price_templates')
        .select('id, service_id, base_price, price_per_unit')
        .eq('id', priceTemplateId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', customerId)
        .eq('role', 'customer')
        .maybeSingle(),
    ])

    if (!customerProfile) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (!house) {
      return NextResponse.json({ error: 'House not found for selected customer' }, { status: 404 })
    }

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    if (!priceTemplate || String(priceTemplate.service_id || '') !== serviceId) {
      return NextResponse.json({ error: 'Invalid price template for selected service' }, { status: 400 })
    }

    const houseArea = Math.max(0, asNumber((house as any).area_size) || 0)
    const basePrice = Math.max(0, asNumber((priceTemplate as any).base_price) || 0)
    const pricePerUnit = Math.max(0, asNumber((priceTemplate as any).price_per_unit) || 0)
    
    // Allow manual price override for custom or yearly contracts
    const isManualPrice = !Number.isNaN(manualTotalPrice) && manualTotalPrice >= 0
    const calculatedPrice = isManualPrice 
      ? manualTotalPrice 
      : basePrice + houseArea * pricePerUnit

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
        return NextResponse.json({ error: additionalError.message }, { status: 500 })
      }

      for (const row of additionalRows || []) {
        additionalServicesById.set(row.id, {
          id: row.id,
          price: Math.max(0, asNumber((row as any).price) || 0),
        })
      }

      if (additionalServicesById.size !== additionalIds.length) {
        return NextResponse.json({ error: 'Some additional services are invalid or inactive' }, { status: 400 })
      }
    }

    let additionalServicesPrice = 0
    for (const [id, quantity] of Array.from(mergedAdditional.entries())) {
      const serviceMeta = additionalServicesById.get(id)
      if (!serviceMeta) continue
      additionalServicesPrice += serviceMeta.price * quantity
    }

    const subtotal = calculatedPrice + additionalServicesPrice
    const multiplier = priority === 'high' ? 1.1 : priority === 'urgent' ? 1.2 : 1
    const totalPrice = subtotal * multiplier

    const now = new Date().toISOString()
    const orderCode = generateOrderCode()

    const mergedSpecialInstructions = [
      specialInstructions,
      paymentMethod ? `payment_method=${paymentMethod}` : '',
      ...asStringArray(body?.flags).map((flag) => `flag=${flag}`),
    ]
      .filter(Boolean)
      .join('\n')

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        house_id: houseId,
        service_id: serviceId,
        price_template_id: priceTemplateId,
        order_code: orderCode,
        service_area: houseArea,
        base_price: basePrice,
        calculated_price: calculatedPrice,
        additional_services_price: additionalServicesPrice,
        total: totalPrice,
        total_price: totalPrice,
        notes: notes || null,
        special_instructions: mergedSpecialInstructions || null,
        status: 'pending',
        scheduled_date: scheduledDate,
        preferred_time_start: preferredTimeStart || null,
        preferred_time_end: preferredTimeEnd || null,
        priority,
        pricing_period: pricingPeriod,
        sessions_per_period: sessionsPerPeriod,
        total_sessions: totalSessions,
        completed_sessions: 0,
        created_at: now,
        updated_at: now,
      })
      .select('id, order_code')
      .single()

    if (orderError || !orderData?.id) {
      return NextResponse.json({ error: orderError?.message || 'Failed to create order' }, { status: 500 })
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
        return NextResponse.json({ error: insertAdditionalError.message }, { status: 500 })
      }
    }

    await Promise.all([
      writeAuditLog({
        supabase,
        userId: requestUser.id,
        userEmail: requestUser.email,
        action: 'admin_created_order',
        details: {
          context: 'api.admin.orders.create',
          order_id: orderData.id,
          customer_id: customerId,
          house_id: houseId,
          service_id: serviceId,
          total_price: totalPrice,
          priority,
          additional_count: mergedAdditional.size,
        },
      }),
      supabase.from('notifications').insert({
        user_id: customerId,
        title: 'มีคำสั่งงานใหม่จากแอดมิน',
        message: `สร้างงาน #${orderData.order_code || orderData.id.slice(0, 8)} เรียบร้อยแล้ว`,
        type: 'info',
        related_order_id: orderData.id,
        read: false,
        notification_category: 'order_status',
      }),
    ])

    // Send LINE Notification (Flex Message)
    try {
      await sendLinePushToOrderStakeholders(supabase, houseId, customerId, {
        title: 'แผนบริการใหม่พร้อมแล้ว',
        message: `ทีมงานได้เพิ่มแผนบริการใหม่ให้คุณแล้วครับ: ${service?.service_name || service?.name || 'บริการดูแลสวน'}`,
        appBaseUrl: req.nextUrl.origin,
        category: 'order_status',
        newServicePlanInfo: {
          serviceName: service?.service_name || service?.name || 'บริการดูแลสวน',
          houseName: house?.name || 'ไม่ระบุชื่อบ้าน',
          pricingPeriod: pricingPeriod,
          totalSessions: totalSessions,
          totalPrice: totalPrice,
          scheduledDate: scheduledDate,
          orderCode: orderData.order_code,
          orderId: orderData.id,
        }
      })
    } catch (lineErr) {
      console.error('Failed to send LINE notification:', lineErr)
    }

    return NextResponse.json({
      success: true,
      orderId: orderData.id,
      orderCode: orderData.order_code,
    })
  } catch (error) {
    console.error('POST /api/admin/orders/create error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
