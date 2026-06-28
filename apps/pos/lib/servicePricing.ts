export type PricingPeriod = 'one-time' | 'monthly' | 'yearly'
export type BillingType = 'one-time' | 'recurring' | 'both'
export type PriorityLevel = 'normal' | 'high' | 'urgent'

export type PeriodAwareService = {
  base_price?: number | null
  price?: number | null
  billing_type?: BillingType | null
}

export type PeriodAwarePriceTemplate = {
  id: string
  service_id?: string | null
  template_name?: string | null
  area_min?: number | null
  area_max?: number | null
  price_per_unit?: number | null
  base_price?: number | null
  description?: string | null
  pricing_period?: PricingPeriod | null
}

export type PricingSummary = {
  template: PeriodAwarePriceTemplate | null
  availableTemplates: PeriodAwarePriceTemplate[]
  subtotal: number
  priorityFee: number
  total: number
  recurring: boolean
  isExactPeriodMatch: boolean
}

const FALLBACK_AREA_SURPLUS_RATE = 5

const asFiniteNumber = (value: unknown) => {
  const numericValue = typeof value === 'string' ? Number(value) : value
  return typeof numericValue === 'number' && Number.isFinite(numericValue) ? numericValue : 0
}

const areaMatchesTemplate = (template: PeriodAwarePriceTemplate, area: number) => {
  const min = asFiniteNumber(template.area_min)
  const max = template.area_max == null ? Number.POSITIVE_INFINITY : asFiniteNumber(template.area_max)
  return area >= min && area <= max
}

const hasExplicitPeriodTemplates = (templates: PeriodAwarePriceTemplate[]) =>
  templates.some((template) => Boolean(template.pricing_period))

export const getAvailablePricingPeriods = (
  service?: PeriodAwareService | null,
  templates: PeriodAwarePriceTemplate[] = []
): PricingPeriod[] => {
  const explicitPeriods = Array.from(
    new Set(
      templates
        .map((template) => template.pricing_period)
        .filter((period): period is PricingPeriod => period === 'one-time' || period === 'monthly' || period === 'yearly')
    )
  )

  if (explicitPeriods.length > 0) {
    return explicitPeriods
  }

  if (service?.billing_type === 'one-time') {
    return ['one-time']
  }

  return ['one-time', 'monthly', 'yearly']
}

export const getTemplatesForPricingPeriod = (
  templates: PeriodAwarePriceTemplate[],
  period: PricingPeriod
) => {
  const exactMatches = templates.filter((template) => template.pricing_period === period)
  if (exactMatches.length > 0) {
    return exactMatches
  }

  if (!hasExplicitPeriodTemplates(templates)) {
    return templates
  }

  return []
}

export const getRecommendedPriceTemplate = (
  templates: PeriodAwarePriceTemplate[],
  area: number,
  period: PricingPeriod,
  selectedTemplate?: PeriodAwarePriceTemplate | null
) => {
  const periodTemplates = getTemplatesForPricingPeriod(templates, period)
  if (periodTemplates.length === 0) {
    return null
  }

  if (selectedTemplate && periodTemplates.some((template) => template.id === selectedTemplate.id)) {
    return selectedTemplate
  }

  return periodTemplates.find((template) => areaMatchesTemplate(template, area)) || periodTemplates[0] || null
}

export const calculateTemplatePrice = (template: PeriodAwarePriceTemplate, area: number) => {
  const basePrice = asFiniteNumber(template.base_price)
  const unitPrice = asFiniteNumber(template.price_per_unit)
  return basePrice + area * unitPrice
}

export const calculateServiceBasePrice = (service: PeriodAwareService | null | undefined, area: number) => {
  const basePrice = asFiniteNumber(service?.base_price ?? service?.price)
  if (basePrice <= 0) {
    return 0
  }

  const areaSurcharge = area > 100 ? (area - 100) * FALLBACK_AREA_SURPLUS_RATE : 0
  return basePrice + areaSurcharge
}

export const calculatePricingSummary = (args: {
  service?: PeriodAwareService | null
  templates?: PeriodAwarePriceTemplate[]
  selectedTemplate?: PeriodAwarePriceTemplate | null
  area: number
  period: PricingPeriod
  priority?: PriorityLevel
}) => {
  const safeArea = Math.max(0, asFiniteNumber(args.area))
  const templates = Array.isArray(args.templates) ? args.templates : []
  const resolvedTemplate = getRecommendedPriceTemplate(templates, safeArea, args.period, args.selectedTemplate)
  const availableTemplates = getTemplatesForPricingPeriod(templates, args.period)

  let subtotal = 0
  let isExactPeriodMatch = false

  if (resolvedTemplate) {
    subtotal = calculateTemplatePrice(resolvedTemplate, safeArea)
    isExactPeriodMatch = resolvedTemplate.pricing_period === args.period
  } else {
    subtotal = calculateServiceBasePrice(args.service, safeArea)
  }

  if (args.period === 'yearly' && (!resolvedTemplate || resolvedTemplate.pricing_period !== 'yearly')) {
    subtotal *= 10
  }

  const priorityMultiplier = args.priority === 'high' ? 1.1 : args.priority === 'urgent' ? 1.2 : 1
  const total = subtotal * priorityMultiplier

  return {
    template: resolvedTemplate,
    availableTemplates,
    subtotal,
    priorityFee: total - subtotal,
    total,
    recurring: args.period === 'monthly' || args.period === 'yearly',
    isExactPeriodMatch,
  } satisfies PricingSummary
}