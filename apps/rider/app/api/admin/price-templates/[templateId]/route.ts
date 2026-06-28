import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

type PricingPeriod = 'one-time' | 'monthly' | 'yearly'

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const asNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : NaN
  }
  return NaN
}

const asOptionalPricingPeriod = (value: unknown): PricingPeriod | null => {
  const text = asText(value).toLowerCase()
  if (text === 'one-time' || text === 'monthly' || text === 'yearly') return text
  return null
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

const validateTemplateInput = (body: Record<string, unknown>) => {
  const templateName = asText(body.template_name)
  const serviceId = asText(body.service_id)
  const areaMin = asNumber(body.area_min)
  const areaMax = asNumber(body.area_max)
  const basePrice = asNumber(body.base_price)
  const pricePerUnit = asNumber(body.price_per_unit)
  const pricingPeriod = asOptionalPricingPeriod(body.pricing_period)

  if (!serviceId) return { error: 'service_id is required' }
  if (!templateName) return { error: 'template_name is required' }
  if (!Number.isFinite(areaMin) || areaMin < 0) return { error: 'area_min must be a non-negative number' }
  if (!Number.isFinite(areaMax) || areaMax < 0) return { error: 'area_max must be a non-negative number' }
  if (areaMax < areaMin) return { error: 'area_max must be greater than or equal to area_min' }
  if (!Number.isFinite(basePrice) || basePrice < 0) return { error: 'base_price must be a non-negative number' }
  if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) return { error: 'price_per_unit must be a non-negative number' }
  if (body.pricing_period != null && pricingPeriod == null) return { error: 'pricing_period is invalid' }

  return {
    data: {
      service_id: serviceId,
      template_name: templateName,
      area_min: areaMin,
      area_max: areaMax,
      base_price: basePrice,
      price_per_unit: pricePerUnit,
      description: asText(body.description) || null,
      pricing_period: pricingPeriod,
      is_active: body.is_active === false ? false : true,
    },
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const requestUser = await resolveRequestUser(req)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templateId = asText(params?.templateId)
    if (!templateId) {
      return NextResponse.json({ error: 'Missing templateId' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const isAdmin = await ensureAdmin(supabase, requestUser.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const validated = validateTemplateInput(body)
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const { data: existingTemplate, error: existingTemplateError } = await supabase
      .from('price_templates')
      .select('id')
      .eq('id', templateId)
      .maybeSingle()

    if (existingTemplateError) {
      return NextResponse.json({ error: existingTemplateError.message }, { status: 500 })
    }

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id')
      .eq('id', validated.data.service_id)
      .maybeSingle()

    if (serviceError) {
      return NextResponse.json({ error: serviceError.message }, { status: 500 })
    }

    if (!service) {
      return NextResponse.json({ error: 'Selected service was not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('price_templates')
      .update(validated.data)
      .eq('id', templateId)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('PATCH /api admin/price-templates/[templateId] error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const requestUser = await resolveRequestUser(req)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templateId = asText(params?.templateId)
    if (!templateId) {
      return NextResponse.json({ error: 'Missing templateId' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const isAdmin = await ensureAdmin(supabase, requestUser.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from('price_templates')
      .update({ is_active: false })
      .eq('id', templateId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api admin/price-templates/[templateId] error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}