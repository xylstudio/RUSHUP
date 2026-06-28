"use client"
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  getAllServices,
  getAllPriceTemplates,
  createPriceTemplate,
  updatePriceTemplate,
  deletePriceTemplate,
  type Service,
  type PriceTemplate,
} from '@/lib/supabaseClient'
import { useAuth } from '@/lib/AuthContext'
import { useI18n } from '@/lib/I18nContext'
import { appCopy, pickLocalizedText } from '@/lib/appLocale'
import { formatCurrencyByLocale, formatNumberByLocale } from '@/lib/localeFormat'
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

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

export default function PricingManagerPage() {
  const { profile } = useAuth()
  const { locale } = useI18n()
  const searchParams = useSearchParams()
  const copy = appCopy.adminPricing
  const [services, setServices] = useState<Service[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [templates, setTemplates] = useState<PriceTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<TemplateForm | null>(null)

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) || null,
    [services, selectedServiceId]
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      const { data: fetchedServices } = await getAllServices()
      const nextServices = fetchedServices || []
      setServices(nextServices)
      const requestedServiceId = searchParams.get('serviceId')
      if (requestedServiceId && nextServices.some((service) => service.id === requestedServiceId)) {
        setSelectedServiceId(requestedServiceId)
      } else if (nextServices.length && !selectedServiceId) {
        setSelectedServiceId(nextServices[0].id)
      }
      setLoading(false)
    }
    void load()
  }, [searchParams, selectedServiceId])

  useEffect(() => {
    const loadTemplates = async () => {
      if (!selectedServiceId) {
        setTemplates([])
        return
      }
      setLoading(true)
      setError('')
      const { data, error: templateError } = await getAllPriceTemplates(selectedServiceId)
      if (templateError) setError(pickLocalizedText(locale, copy.loadFailed))
      setTemplates(data || [])
      setLoading(false)
    }
    void loadTemplates()
  }, [selectedServiceId, locale, copy.loadFailed])

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

  const templateStats = useMemo(() => {
    const activeTemplates = templates.filter((template) => template.is_active !== false).length
    const averageBase = templates.length
      ? templates.reduce((sum, template) => sum + (template.base_price || 0), 0) / templates.length
      : 0

    return {
      total: templates.length,
      active: activeTemplates,
      overlaps: overlaps.length,
      averageBase,
    }
  }, [overlaps.length, templates])

  const openCreate = () => {
    if (!selectedServiceId) return
    setForm({ template_name: '', area_min: 0, area_max: 0, price_per_unit: 0, base_price: 0, description: '', is_active: true })
    setError('')
  }

  const openEdit = (template: PriceTemplate) => {
    setForm({
      id: template.id,
      template_name: template.template_name,
      area_min: template.area_min || 0,
      area_max: template.area_max || 0,
      price_per_unit: template.price_per_unit || 0,
      base_price: template.base_price || 0,
      description: template.description || '',
      is_active: template.is_active ?? true,
    })
    setError('')
  }

  const validate = (template: TemplateForm): string | null => {
    if (!template.template_name.trim()) return pickLocalizedText(locale, copy.packageNameRequired)
    if (template.area_min < 0 || template.area_max < 0) return pickLocalizedText(locale, copy.areaNonNegative)
    if (template.area_max < template.area_min) return pickLocalizedText(locale, copy.areaMaxInvalid)
    if (template.price_per_unit < 0) return pickLocalizedText(locale, copy.unitPriceNonNegative)
    if (template.base_price < 0) return pickLocalizedText(locale, copy.basePriceNonNegative)
    const list = templates.filter((current) => current.id !== template.id && current.is_active !== false)
    const conflict = list.find((current) => template.area_min <= (current.area_max ?? 0) && (current.area_min ?? 0) <= template.area_max)
    if (conflict) return pickLocalizedText(locale, copy.areaOverlap)
    return null
  }

  const save = async () => {
    if (!form || !selectedServiceId) return
    const validationError = validate(form)
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError('')
    try {
      if (form.id) {
        const { error: updateError } = await updatePriceTemplate(form.id, {
          template_name: form.template_name.trim(),
          area_min: form.area_min,
          area_max: form.area_max,
          price_per_unit: form.price_per_unit,
          base_price: form.base_price,
          description: form.description,
          is_active: form.is_active ?? true,
        })
        if (updateError) throw updateError
      } else {
        const { error: createError } = await createPriceTemplate({
          service_id: selectedServiceId,
          template_name: form.template_name.trim(),
          area_min: form.area_min,
          area_max: form.area_max,
          price_per_unit: form.price_per_unit,
          base_price: form.base_price,
          description: form.description,
          is_active: form.is_active ?? true,
        })
        if (createError) throw createError
      }
      const { data } = await getAllPriceTemplates(selectedServiceId)
      setTemplates(data || [])
      setForm(null)
    } catch (saveError: any) {
      setError(saveError?.message || pickLocalizedText(locale, copy.saveFailed))
    } finally {
      setSaving(false)
    }
  }

  const removeTemplate = async (template: PriceTemplate) => {
    if (!selectedServiceId) return
    if (!confirm(pickLocalizedText(locale, copy.disableConfirm))) return
    const { error: removeError } = await deletePriceTemplate(template.id)
    if (removeError) {
      setError(pickLocalizedText(locale, copy.disableFailed))
      return
    }
    const { data } = await getAllPriceTemplates(selectedServiceId)
    setTemplates(data || [])
  }

  if (!profile) return null
  if (profile.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(26,54,38,0.08),_transparent_28%),linear-gradient(180deg,#f7f8f4_0%,#f4f1ea_100%)] p-6">
        <div className="rounded-[28px] border border-[#E6E3DA] bg-white px-8 py-6 text-gray-700 shadow-[0_14px_34px_rgba(26,54,38,0.06)]">
          {pickLocalizedText(locale, copy.accessDenied)}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(26,54,38,0.08),_transparent_28%),linear-gradient(180deg,#f7f8f4_0%,#f4f1ea_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
        <section className="mb-6 rounded-[32px] border border-[#E6E3DA] bg-white/85 p-6 shadow-[0_16px_40px_rgba(26,54,38,0.06)] backdrop-blur-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex rounded-full border border-[#D6DDD7] bg-[#F4F7F4] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#32513E]">
                Pricing Console
              </div>
              <h1 className="text-3xl font-light tracking-tight text-[#183223] lg:text-4xl">{pickLocalizedText(locale, copy.title)}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66716B]">
                {selectedService
                  ? `${selectedService.service_name || (selectedService as any).name || pickLocalizedText(locale, copy.unnamed)} · ${pickLocalizedText(locale, copy.allPackages)}`
                  : pickLocalizedText(locale, copy.selectService)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedService ? (
                <Link href={`/dashboard/admin/services/${selectedService.id}`} className="inline-flex items-center rounded-full border border-[#D8DED8] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#183223] transition-colors hover:bg-gray-50">
                  <PencilIcon className="mr-2 h-4 w-4" /> {pickLocalizedText(locale, appCopy.adminServices.editService)}
                </Link>
              ) : (
                <Link href="/dashboard/admin/services/create" className="inline-flex items-center rounded-full border border-[#D8DED8] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#183223] transition-colors hover:bg-gray-50">
                  <PlusIcon className="mr-2 h-4 w-4" /> {pickLocalizedText(locale, appCopy.adminServices.createService)}
                </Link>
              )}
              <button onClick={openCreate} disabled={!selectedServiceId} className="inline-flex items-center rounded-full bg-[#1A3626] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_14px_28px_rgba(26,54,38,0.18)] transition-colors hover:bg-[#13291d] disabled:cursor-not-allowed disabled:opacity-50">
                <PlusIcon className="mr-2 h-4 w-4" /> {pickLocalizedText(locale, copy.addPackage)}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-[#E8E4DB] bg-[linear-gradient(180deg,#ffffff_0%,#faf7f1_100%)] p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.allPackages)}</div>
              <div className="mt-2 text-3xl font-light tracking-tight text-[#183223]">{formatNumberByLocale(templateStats.total, locale)}</div>
            </div>
            <div className="rounded-[24px] border border-[#E8E4DB] bg-[linear-gradient(180deg,#ffffff_0%,#f3f7f3_100%)] p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.inactive)}</div>
              <div className="mt-2 text-3xl font-light tracking-tight text-[#183223]">{formatNumberByLocale(templateStats.total - templateStats.active, locale)}</div>
            </div>
            <div className="rounded-[24px] border border-[#E8E4DB] bg-[linear-gradient(180deg,#ffffff_0%,#faf7f1_100%)] p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.overlapFound)}</div>
              <div className="mt-2 text-3xl font-light tracking-tight text-[#183223]">{formatNumberByLocale(templateStats.overlaps, locale)}</div>
            </div>
            <div className="rounded-[24px] border border-[#E8E4DB] bg-[linear-gradient(180deg,#ffffff_0%,#fff6f3_100%)] p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">Average Base</div>
              <div className="mt-2 text-3xl font-light tracking-tight text-[#183223]">{formatCurrencyByLocale(templateStats.averageBase, locale)}</div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-[28px] border border-[#E6E3DA] bg-white p-5 shadow-[0_14px_34px_rgba(26,54,38,0.05)] lg:p-6">
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.selectService)}</label>
          <select value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)} className="w-full max-w-xl rounded-full border border-[#E2E5DF] bg-[#FCFCFA] px-4 py-3 text-sm outline-none transition-colors focus:border-[#1A3626]">
            <option value="">{pickLocalizedText(locale, copy.selectServicePlaceholder)}</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>{service.service_name || (service as any).name || pickLocalizedText(locale, copy.unnamed)}</option>
            ))}
          </select>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/admin/services" className="inline-flex items-center rounded-full border border-[#D8DED8] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#183223] transition-colors hover:bg-gray-50">
              {pickLocalizedText(locale, appCopy.adminServices.title)}
            </Link>
            {!selectedService ? (
              <Link href="/dashboard/admin/services/create" className="inline-flex items-center rounded-full bg-[#1A3626] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                <PlusIcon className="mr-1 h-4 w-4" /> {pickLocalizedText(locale, appCopy.adminServices.createService)}
              </Link>
            ) : null}
          </div>
        </section>

        {error && (
          <div className="mb-4 flex items-center rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700 shadow-sm">
            <ExclamationTriangleIcon className="mr-2 h-5 w-5" /> {error}
          </div>
        )}

        <div className="overflow-hidden rounded-[28px] border border-[#E6E3DA] bg-white shadow-[0_14px_34px_rgba(26,54,38,0.05)]">
          <div className="flex items-center justify-between border-b border-[#F0ECE4] p-4 lg:p-5">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{selectedService ? pickLocalizedText(locale, copy.allPackages) : pickLocalizedText(locale, copy.selectService)}</div>
              <div className="mt-1 font-semibold text-[#183223]">{selectedService?.service_name || (selectedService as any)?.name || pickLocalizedText(locale, copy.title)}</div>
            </div>
            {overlaps.length > 0 && <div className="text-sm text-red-600">{pickLocalizedText(locale, copy.overlapFound)} {formatNumberByLocale(overlaps.length, locale)} {pickLocalizedText(locale, copy.points)}</div>}
          </div>

          {loading ? (
            <div className="p-6 text-gray-500">{pickLocalizedText(locale, copy.loading)}</div>
          ) : templates.length === 0 ? (
            <div className="p-6 text-gray-500">
              <div>{pickLocalizedText(locale, copy.empty)}</div>
              {selectedService ? (
                <button onClick={openCreate} className="mt-4 inline-flex items-center rounded-full bg-[#1A3626] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                  <PlusIcon className="mr-1 h-4 w-4" /> {pickLocalizedText(locale, copy.addPackage)}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="divide-y divide-[#F3F0E9]">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className={`font-medium ${template.is_active === false ? 'text-gray-400' : 'text-[#183223]'}`}>{template.template_name}</div>
                      {template.is_active === false && <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-400">{pickLocalizedText(locale, copy.inactive)}</span>}
                    </div>
                    <div className="text-sm text-gray-600">
                      {pickLocalizedText(locale, copy.areaRange)} {formatNumberByLocale(template.area_min, locale)} - {formatNumberByLocale(template.area_max, locale)} {pickLocalizedText(locale, copy.sqm)} • {formatCurrencyByLocale(template.base_price || 0, locale)} + {formatCurrencyByLocale(template.price_per_unit || 0, locale)}/{pickLocalizedText(locale, copy.sqm)}
                    </div>
                    {template.description && <div className="text-sm text-gray-500 mt-1">{template.description}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(template)} className="rounded-full border border-[#D8DED8] px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-50">
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

        {form && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/30 md:items-center md:justify-center">
            <div className="w-full rounded-t-2xl bg-white p-6 shadow-lg md:max-w-xl md:rounded-[28px] md:border md:border-[#E6E3DA]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">Pricing Console</div>
                  <div className="mt-1 text-lg font-semibold text-[#183223]">{form.id ? pickLocalizedText(locale, copy.editPackage) : pickLocalizedText(locale, copy.createPackage)}</div>
                </div>
                <button onClick={() => setForm(null)} className="p-2 text-gray-500 hover:text-gray-700"><XMarkIcon className="h-5 w-5" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-gray-700">{pickLocalizedText(locale, copy.packageName)}</label>
                  <input value={form.template_name} onChange={(event) => setForm({ ...form, template_name: event.target.value })} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 outline-none transition-colors focus:border-[#1A3626]" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700">{pickLocalizedText(locale, copy.areaMin)}</label>
                  <input type="number" min={0} value={form.area_min} onChange={(event) => setForm({ ...form, area_min: parseInt(event.target.value, 10) || 0 })} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 outline-none transition-colors focus:border-[#1A3626]" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700">{pickLocalizedText(locale, copy.areaMax)}</label>
                  <input type="number" min={0} value={form.area_max} onChange={(event) => setForm({ ...form, area_max: parseInt(event.target.value, 10) || 0 })} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 outline-none transition-colors focus:border-[#1A3626]" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700">{pickLocalizedText(locale, copy.basePrice)}</label>
                  <input type="number" min={0} step="0.01" value={form.base_price} onChange={(event) => setForm({ ...form, base_price: parseFloat(event.target.value) || 0 })} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 outline-none transition-colors focus:border-[#1A3626]" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700">{pickLocalizedText(locale, copy.unitPrice)}</label>
                  <input type="number" min={0} step="0.01" value={form.price_per_unit} onChange={(event) => setForm({ ...form, price_per_unit: parseFloat(event.target.value) || 0 })} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 outline-none transition-colors focus:border-[#1A3626]" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-gray-700">{pickLocalizedText(locale, copy.extraDetails)}</label>
                  <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 outline-none transition-colors focus:border-[#1A3626]" rows={3} />
                </div>
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.is_active ?? true} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
                    {pickLocalizedText(locale, copy.enablePackage)}
                  </label>
                </div>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2" /> {error}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setForm(null)} className="rounded-full border border-[#D8DED8] px-4 py-2 text-[#183223]">{pickLocalizedText(locale, copy.cancel)}</button>
                <button onClick={save} disabled={saving} className="rounded-full bg-[#1A3626] px-4 py-2 text-white disabled:opacity-50">
                  {saving ? pickLocalizedText(locale, copy.saving) : pickLocalizedText(locale, copy.save)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
