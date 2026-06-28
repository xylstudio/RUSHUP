"use client";
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  getAllServices,
  getAllPriceTemplates,
  deleteService,
  type Service,
  type PriceTemplate,
  type BillingType,
  type DurationUnit,
} from '@/lib/supabaseClient'
import { useAuth } from '@/lib/AuthContext'
import { useI18n } from '@/lib/I18nContext'
import { appCopy, pickLocalizedText } from '@/lib/appLocale'
import { formatCurrencyByLocale, formatNumberByLocale } from '@/lib/localeFormat'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

const requestTemplateMutation = async (url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: Record<string, unknown>) => {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result?.error || 'Pricing package request failed')
  }

  return result
}

type TemplateForm = {
  id?: string
  template_name: string
  area_min: number
  area_max: number
  price_per_unit: number
  base_price: number
  description?: string
  is_active?: boolean
}

export default function AdminServicesOnePage() {
  const { profile } = useAuth()
  const { locale } = useI18n()
  const copy = appCopy.adminServices
  const [services, setServices] = useState<Service[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [templates, setTemplates] = useState<PriceTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [templateForm, setTemplateForm] = useState<TemplateForm | null>(null)

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) || null,
    [services, selectedServiceId]
  )

  const serviceStats = useMemo(() => {
    const activeServices = services.filter((service) => service.is_active !== false).length
    const activeTemplates = templates.filter((template) => template.is_active !== false).length

    return {
      totalServices: services.length,
      activeServices,
      totalTemplates: templates.length,
      activeTemplates,
    }
  }, [services, templates])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      const { data } = await getAllServices()
      const nextServices = data || []
      setServices(nextServices)
      if (nextServices.length) {
        setSelectedServiceId((current) => current || nextServices[0].id)
      }
      setLoading(false)
    }
    void load()
  }, [])

  useEffect(() => {
    const loadTemplates = async () => {
      if (!selectedServiceId) {
        setTemplates([])
        return
      }
      setLoading(true)
      setError('')
      const { data, error: templateError } = await getAllPriceTemplates(selectedServiceId)
      if (templateError) {
        setError(pickLocalizedText(locale, copy.loadTemplatesFailed))
      }
      setTemplates(data || [])
      setLoading(false)
    }
    void loadTemplates()
  }, [selectedServiceId, locale, copy.loadTemplatesFailed])

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return services
    return services.filter((service) =>
      (service.service_name || service.name || '').toLowerCase().includes(query) ||
      (service.description || '').toLowerCase().includes(query)
    )
  }, [search, services])

  const overlaps = useMemo(() => {
    const activeTemplates = [...templates].filter((template) => template.is_active !== false)
    activeTemplates.sort((left, right) => (left.area_min ?? 0) - (right.area_min ?? 0))
    const problems: Array<{ i: number; j: number }> = []
    for (let i = 0; i < activeTemplates.length; i += 1) {
      const current = activeTemplates[i]
      for (let j = i + 1; j < activeTemplates.length; j += 1) {
        const next = activeTemplates[j]
        if ((current.area_min ?? 0) <= (next.area_max ?? 0) && (next.area_min ?? 0) <= (current.area_max ?? 0)) {
          problems.push({ i, j })
        }
      }
    }
    return problems
  }, [templates])

  const billingTypeLabel = (value?: BillingType) => {
    switch (value) {
      case 'one-time':
        return pickLocalizedText(locale, copy.oneTime)
      case 'recurring':
        return pickLocalizedText(locale, copy.recurring)
      case 'both':
      default:
        return pickLocalizedText(locale, copy.both)
    }
  }

  const durationUnitLabel = (value?: DurationUnit) => {
    switch (value) {
      case 'hours':
        return pickLocalizedText(locale, copy.hours)
      case 'days':
        return pickLocalizedText(locale, copy.days)
      case 'weeks':
        return pickLocalizedText(locale, copy.weeks)
      case 'months':
        return pickLocalizedText(locale, copy.months)
      default:
        return pickLocalizedText(locale, copy.days)
    }
  }

  const removeService = async () => {
    if (!selectedService) return
    if (!confirm(pickLocalizedText(locale, copy.disableServiceConfirm))) return
    const { error: removeError } = await deleteService(selectedService.id)
    if (removeError) {
      setError(pickLocalizedText(locale, copy.disableServiceFailed))
      return
    }
    const { data } = await getAllServices()
    const nextServices = data || []
    setServices(nextServices)
    setSelectedServiceId(nextServices[0]?.id || '')
  }

  const openCreateTemplate = () => {
    if (!selectedServiceId) return
    setTemplateForm({ template_name: '', area_min: 0, area_max: 0, base_price: 0, price_per_unit: 0, description: '', is_active: true })
    setError('')
  }

  const openEditTemplate = (template: PriceTemplate) => {
    setTemplateForm({
      id: template.id,
      template_name: template.template_name,
      area_min: template.area_min || 0,
      area_max: template.area_max || 0,
      base_price: template.base_price || 0,
      price_per_unit: template.price_per_unit || 0,
      description: template.description || '',
      is_active: template.is_active ?? true,
    })
    setError('')
  }

  const validateTemplate = (form: TemplateForm): string | null => {
    if (!form.template_name.trim()) return pickLocalizedText(locale, copy.packageNameRequired)
    if (form.area_min < 0 || form.area_max < 0) return pickLocalizedText(locale, copy.areaNonNegative)
    if (form.area_max < form.area_min) return pickLocalizedText(locale, copy.areaMaxInvalid)
    if (form.price_per_unit < 0) return pickLocalizedText(locale, copy.unitPriceNonNegative)
    if (form.base_price < 0) return pickLocalizedText(locale, copy.basePriceNonNegative)
    const list = templates.filter((template) => template.id !== form.id && template.is_active !== false)
    const conflict = list.find((template) => form.area_min <= (template.area_max ?? 0) && (template.area_min ?? 0) <= form.area_max)
    if (conflict) return pickLocalizedText(locale, copy.areaOverlap)
    return null
  }

  const saveTemplate = async () => {
    if (!templateForm || !selectedServiceId) return
    const validationError = validateTemplate(templateForm)
    if (validationError) {
      setError(validationError)
      return
    }
    setSavingTemplate(true)
    setError('')
    try {
      if (templateForm.id) {
        await requestTemplateMutation(`/api/admin/price-templates/${templateForm.id}`, 'PATCH', {
          service_id: selectedServiceId,
          template_name: templateForm.template_name.trim(),
          area_min: templateForm.area_min,
          area_max: templateForm.area_max,
          base_price: templateForm.base_price,
          price_per_unit: templateForm.price_per_unit,
          description: templateForm.description,
          is_active: templateForm.is_active ?? true,
        })
      } else {
        await requestTemplateMutation('/api/admin/price-templates', 'POST', {
          service_id: selectedServiceId,
          template_name: templateForm.template_name.trim(),
          area_min: templateForm.area_min,
          area_max: templateForm.area_max,
          base_price: templateForm.base_price,
          price_per_unit: templateForm.price_per_unit,
          description: templateForm.description,
          is_active: templateForm.is_active ?? true,
        })
      }
      const { data } = await getAllPriceTemplates(selectedServiceId)
      setTemplates(data || [])
      setTemplateForm(null)
    } catch (templateError: unknown) {
      setError(templateError instanceof Error ? templateError.message : pickLocalizedText(locale, copy.savePackageFailed))
    } finally {
      setSavingTemplate(false)
    }
  }

  const removeTemplate = async (template: PriceTemplate) => {
    if (!selectedServiceId) return
    if (!confirm(pickLocalizedText(locale, copy.disablePackageConfirm))) return
    try {
      await requestTemplateMutation(`/api/admin/price-templates/${template.id}`, 'DELETE')
    } catch (removeError) {
      setError(pickLocalizedText(locale, copy.disablePackageFailed))
      return
    }
    const { data } = await getAllPriceTemplates(selectedServiceId)
    setTemplates(data || [])
  }

  if (!profile) return null
  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border rounded-lg p-6 text-gray-700">{pickLocalizedText(locale, copy.accessDenied)}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(26,54,38,0.08),_transparent_28%),linear-gradient(180deg,#f7f8f4_0%,#f4f1ea_100%)]">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        <section className="mb-6 rounded-[32px] border border-[#E6E3DA] bg-white/85 p-6 shadow-[0_16px_40px_rgba(26,54,38,0.06)] backdrop-blur-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex rounded-full border border-[#D6DDD7] bg-[#F4F7F4] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#32513E]">
                {pickLocalizedText(locale, copy.operationsLabel)}
              </div>
              <h1 className="text-3xl font-light tracking-tight text-[#183223] lg:text-4xl">{pickLocalizedText(locale, copy.title)}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66716B]">{pickLocalizedText(locale, copy.subtitle)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/admin/services/create" className="inline-flex items-center rounded-full bg-[#1A3626] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_14px_28px_rgba(26,54,38,0.18)] transition-colors hover:bg-[#13291d]">
                <PlusIcon className="h-4 w-4 mr-2" /> {pickLocalizedText(locale, copy.createService)}
              </Link>
              {selectedService && (
                <Link href={`/dashboard/admin/services/${selectedService.id}`} className="rounded-full border border-[#D6DDD7] bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#183223] transition-colors hover:border-[#1A3626]">
                  {pickLocalizedText(locale, copy.editService)}
                </Link>
              )}
              <Link href={selectedService ? `/dashboard/admin/services/pricing?serviceId=${selectedService.id}` : '/dashboard/admin/services/pricing'} className="rounded-full border border-[#D6DDD7] bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#183223] transition-colors hover:border-[#1A3626]">
                {pickLocalizedText(locale, copy.pricingPackages)}
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-[#E8E4DB] bg-[linear-gradient(180deg,#ffffff_0%,#faf7f1_100%)] p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.totalServices)}</div>
              <div className="mt-2 text-3xl font-light tracking-tight text-[#183223]">{formatNumberByLocale(serviceStats.totalServices, locale)}</div>
            </div>
            <div className="rounded-[24px] border border-[#E8E4DB] bg-[linear-gradient(180deg,#ffffff_0%,#f3f7f3_100%)] p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.activeServicesCount)}</div>
              <div className="mt-2 text-3xl font-light tracking-tight text-[#183223]">{formatNumberByLocale(serviceStats.activeServices, locale)}</div>
            </div>
            <div className="rounded-[24px] border border-[#E8E4DB] bg-[linear-gradient(180deg,#ffffff_0%,#faf7f1_100%)] p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.totalPackages)}</div>
              <div className="mt-2 text-3xl font-light tracking-tight text-[#183223]">{formatNumberByLocale(serviceStats.totalTemplates, locale)}</div>
            </div>
            <div className="rounded-[24px] border border-[#E8E4DB] bg-[linear-gradient(180deg,#ffffff_0%,#fff6f3_100%)] p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.overlapStatus)}</div>
              <div className="mt-2 text-3xl font-light tracking-tight text-[#183223]">{overlaps.length > 0 ? formatNumberByLocale(overlaps.length, locale) : pickLocalizedText(locale, copy.noOverlap)}</div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-4 flex items-center rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700 shadow-sm">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <aside className="lg:col-span-1 overflow-hidden rounded-[28px] border border-[#E6E3DA] bg-white shadow-[0_14px_34px_rgba(26,54,38,0.05)]">
            <div className="border-b border-[#F0ECE4] p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.libraryLabel)}</div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={pickLocalizedText(locale, copy.searchPlaceholder)}
                  className="w-full rounded-full border border-[#E2E5DF] bg-[#FCFCFA] py-2 pl-10 pr-3 text-sm outline-none transition-colors focus:border-[#1A3626]"
                />
              </div>
            </div>
            <div className="max-h-[60vh] overflow-auto divide-y divide-[#F3F0E9]">
              {loading ? (
                <div className="p-4 text-gray-500">{pickLocalizedText(locale, copy.loading)}</div>
              ) : filteredServices.length === 0 ? (
                <div className="p-4 text-gray-500">{pickLocalizedText(locale, copy.noServices)}</div>
              ) : (
                filteredServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`w-full p-4 text-left transition-colors hover:bg-[#FAFBF8] ${selectedServiceId === service.id ? 'bg-[#F7F8F4]' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className={`font-medium ${service.is_active === false ? 'text-gray-400' : 'text-[#183223]'}`}>
                        {service.service_name || service.name || pickLocalizedText(locale, copy.unnamed)}
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${service.is_active === false ? 'border-gray-200 text-gray-400' : 'border-[#D8DED8] text-[#5F6B64]'}`}>
                        {billingTypeLabel(service.billing_type as BillingType)}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-sm text-gray-600">{service.description || '-'}</div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="lg:col-span-2 space-y-6">
            <div className="rounded-[28px] border border-[#E6E3DA] bg-white p-5 shadow-[0_14px_34px_rgba(26,54,38,0.05)] lg:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.operationsLabel)}</div>
                  <div className="mt-1 font-semibold text-[#183223]">{pickLocalizedText(locale, copy.serviceDetails)}</div>
                </div>
                {selectedService && (
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/admin/services/${selectedService.id}`} className="inline-flex items-center gap-1 rounded-full border border-[#D8DED8] px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-50">
                      <PencilIcon className="h-4 w-4" /> {pickLocalizedText(locale, copy.editService)}
                    </Link>
                    <Link href={`/dashboard/admin/services/pricing?serviceId=${selectedService.id}`} className="inline-flex items-center gap-1 rounded-full border border-[#D8DED8] px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-50">
                      {pickLocalizedText(locale, copy.pricingPackages)}
                    </Link>
                    <button onClick={removeService} className="inline-flex items-center gap-1 text-red-600 transition-colors hover:text-red-700">
                      <TrashIcon className="h-4 w-4" /> {pickLocalizedText(locale, copy.disable)}
                    </button>
                  </div>
                )}
              </div>
              {selectedService ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm text-gray-500">{pickLocalizedText(locale, copy.serviceName)}</div>
                    <div className="font-medium text-[#183223]">{selectedService.service_name || selectedService.name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">{pickLocalizedText(locale, copy.status)}</div>
                    <div className={`font-medium ${selectedService.is_active === false ? 'text-gray-400' : 'text-[#183223]'}`}>
                      {selectedService.is_active === false ? pickLocalizedText(locale, copy.inactive) : pickLocalizedText(locale, copy.active)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">{pickLocalizedText(locale, copy.billing)}</div>
                    <div className="font-medium text-[#183223]">{billingTypeLabel(selectedService.billing_type as BillingType)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">{pickLocalizedText(locale, copy.basePrice)}</div>
                    <div className="font-medium text-[#183223]">{formatCurrencyByLocale((((selectedService.base_price ?? selectedService.price) || 0) as number), locale)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">{pickLocalizedText(locale, copy.estimatedDuration)}</div>
                    <div className="font-medium text-[#183223]">
                      {selectedService.has_estimated_duration && selectedService.estimated_duration
                        ? `${formatNumberByLocale(selectedService.estimated_duration, locale)} ${durationUnitLabel(selectedService.estimated_duration_unit as DurationUnit)}`
                        : pickLocalizedText(locale, copy.unspecified)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">{pickLocalizedText(locale, copy.categoryOptional)}</div>
                    <div className="font-medium text-[#183223]">{selectedService.category || '-'}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500">{pickLocalizedText(locale, copy.details)}</div>
                    <div className="whitespace-pre-line text-gray-800">{selectedService.description || '-'}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-gray-500">
                  <div>{pickLocalizedText(locale, copy.selectOrCreate)}</div>
                  <Link href="/dashboard/admin/services/create" className="inline-flex items-center rounded-full bg-[#1A3626] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                    <PlusIcon className="h-4 w-4 mr-1" /> {pickLocalizedText(locale, copy.createService)}
                  </Link>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-[28px] border border-[#E6E3DA] bg-white shadow-[0_14px_34px_rgba(26,54,38,0.05)]">
              <div className="flex items-center justify-between border-b border-[#F0ECE4] p-4 lg:p-5">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.operationsLabel)}</div>
                  <div className="mt-1 font-semibold text-[#183223]">{pickLocalizedText(locale, copy.pricingPackages)}</div>
                </div>
                <div className="flex items-center gap-3">
                  {overlaps.length > 0 && (
                    <span className="text-sm text-red-600">{pickLocalizedText(locale, copy.overlapCount)} {formatNumberByLocale(overlaps.length, locale)} {pickLocalizedText(locale, copy.points)}</span>
                  )}
                  {selectedService ? (
                    <Link href={`/dashboard/admin/services/pricing?serviceId=${selectedService.id}`} className="rounded-full border border-[#D8DED8] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#183223] transition-colors hover:bg-gray-50">
                      {pickLocalizedText(locale, copy.editService)}
                    </Link>
                  ) : null}
                  <button onClick={openCreateTemplate} disabled={!selectedServiceId} className="inline-flex items-center rounded-full bg-[#1A3626] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-50">
                    <PlusIcon className="h-4 w-4 mr-1" /> {pickLocalizedText(locale, copy.addPackage)}
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="p-6 text-gray-500">{pickLocalizedText(locale, copy.loading)}</div>
              ) : templates.length === 0 ? (
                <div className="p-6 text-gray-500">
                  <div>{pickLocalizedText(locale, copy.noTemplates)}</div>
                  {selectedService ? (
                    <Link href={`/dashboard/admin/services/pricing?serviceId=${selectedService.id}`} className="mt-4 inline-flex items-center rounded-full bg-[#1A3626] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                      <PlusIcon className="h-4 w-4 mr-1" /> {pickLocalizedText(locale, copy.addPackage)}
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="divide-y divide-[#F3F0E9]">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className={`font-medium ${template.is_active === false ? 'text-gray-400' : 'text-[#183223]'}`}>{template.template_name}</div>
                          {template.is_active === false && (
                            <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-400">{pickLocalizedText(locale, copy.inactive)}</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {pickLocalizedText(locale, copy.areaLabel)} {formatNumberByLocale(template.area_min, locale)} - {formatNumberByLocale(template.area_max, locale)} {pickLocalizedText(locale, copy.sqm)} • {formatCurrencyByLocale(template.base_price || 0, locale)} + {formatCurrencyByLocale(template.price_per_unit || 0, locale)}/{pickLocalizedText(locale, copy.sqm)}
                        </div>
                        {template.description && <div className="mt-1 text-sm text-gray-500">{template.description}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditTemplate(template)} className="rounded-full border border-[#D8DED8] px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-50">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        {template.is_active !== false ? (
                          <button onClick={() => void removeTemplate(template)} className="rounded-full border border-red-200 px-3 py-1.5 text-red-600 transition-colors hover:bg-red-50">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {templateForm && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/30 md:items-center md:justify-center">
            <div className="w-full rounded-t-2xl bg-white p-6 shadow-lg md:max-w-xl md:rounded-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-lg font-semibold">{templateForm.id ? pickLocalizedText(locale, copy.editPackage) : pickLocalizedText(locale, copy.createPackage)}</div>
                <button onClick={() => setTemplateForm(null)} className="p-2 text-gray-500 hover:text-gray-700"><XMarkIcon className="h-5 w-5" /></button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-gray-700">{pickLocalizedText(locale, copy.packageName)}</label>
                  <input value={templateForm.template_name} onChange={(event) => setTemplateForm({ ...templateForm, template_name: event.target.value })} className="w-full rounded-lg border px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700">{pickLocalizedText(locale, copy.areaMin)}</label>
                  <input type="number" min={0} value={templateForm.area_min} onChange={(event) => setTemplateForm({ ...templateForm, area_min: parseInt(event.target.value, 10) || 0 })} className="w-full rounded-lg border px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700">{pickLocalizedText(locale, copy.areaMax)}</label>
                  <input type="number" min={0} value={templateForm.area_max} onChange={(event) => setTemplateForm({ ...templateForm, area_max: parseInt(event.target.value, 10) || 0 })} className="w-full rounded-lg border px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700">{pickLocalizedText(locale, copy.basePriceBaht)}</label>
                  <input type="number" min={0} step="0.01" value={templateForm.base_price} onChange={(event) => setTemplateForm({ ...templateForm, base_price: parseFloat(event.target.value) || 0 })} className="w-full rounded-lg border px-3 py-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700">{pickLocalizedText(locale, copy.unitPriceBaht)}</label>
                  <input type="number" min={0} step="0.01" value={templateForm.price_per_unit} onChange={(event) => setTemplateForm({ ...templateForm, price_per_unit: parseFloat(event.target.value) || 0 })} className="w-full rounded-lg border px-3 py-2" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-gray-700">{pickLocalizedText(locale, copy.extraDetails)}</label>
                  <textarea value={templateForm.description} onChange={(event) => setTemplateForm({ ...templateForm, description: event.target.value })} className="w-full rounded-lg border px-3 py-2" rows={3} />
                </div>
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={templateForm.is_active ?? true} onChange={(event) => setTemplateForm({ ...templateForm, is_active: event.target.checked })} />
                    {pickLocalizedText(locale, copy.enablePackage)}
                  </label>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-center rounded border border-red-200 bg-red-50 p-3 text-red-700">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2" /> {error}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setTemplateForm(null)} className="rounded-lg border px-4 py-2">{pickLocalizedText(locale, copy.cancel)}</button>
                <button onClick={saveTemplate} disabled={savingTemplate} className="rounded-lg bg-xylem-dark px-4 py-2 text-white disabled:opacity-50">
                  {savingTemplate ? pickLocalizedText(locale, copy.saving) : pickLocalizedText(locale, copy.save)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
