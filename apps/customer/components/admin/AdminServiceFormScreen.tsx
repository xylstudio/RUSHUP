"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  BeakerIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ScissorsIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/I18nContext";
import { appCopy, pickLocalizedText } from "@/lib/appLocale";
import { createService, supabase, updateService, type BillingType, type DurationUnit, type Service } from "@/lib/supabaseClient";
import { formatCurrencyByLocale, formatDateByLocale } from "@/lib/localeFormat";

type FormState = {
  service_name: string;
  description: string;
  base_price: string;
  category: string;
  service_code: string;
  billing_type: BillingType;
  is_active: boolean;
  has_estimated_duration: boolean;
  estimated_duration: string;
  estimated_duration_unit: DurationUnit;
  icon: string;
  unit: string;
};

type Props = {
  mode: "create" | "edit";
  serviceId?: string;
};

type LoadedServiceInfo = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};

const INITIAL_FORM: FormState = {
  service_name: "",
  description: "",
  base_price: "",
  category: "",
  service_code: "",
  billing_type: "both",
  is_active: true,
  has_estimated_duration: false,
  estimated_duration: "",
  estimated_duration_unit: "days",
  icon: "WrenchScrewdriverIcon",
  unit: "job",
};

function normalizeServiceToForm(data: any): FormState {
  return {
    service_name: data.service_name || data.name || "",
    description: data.description || "",
    base_price: String(data.base_price ?? data.price ?? ""),
    category: data.category || "",
    service_code: data.service_code || "",
    billing_type: (data.billing_type as BillingType) || "both",
    is_active: data.is_active ?? true,
    has_estimated_duration: data.has_estimated_duration ?? false,
    estimated_duration: data.estimated_duration ? String(data.estimated_duration) : "",
    estimated_duration_unit: (data.estimated_duration_unit as DurationUnit) || "days",
    icon: "WrenchScrewdriverIcon",
    unit: "job",
  };
}

export default function AdminServiceFormScreen({ mode, serviceId }: Props) {
  const router = useRouter();
  const { profile } = useAuth();
  const { locale } = useI18n();
  const copy = appCopy.adminServiceEditor;
  const servicesCopy = appCopy.adminServices;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(mode === "edit");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [serviceInfo, setServiceInfo] = useState<LoadedServiceInfo | null>(null);
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);

  useEffect(() => {
    if (mode !== "edit" || !serviceId) return;

    const fetchService = async () => {
      try {
        if (!supabase) {
          throw new Error(pickLocalizedText(locale, copy.dbUnavailable));
        }

        const { data, error: fetchError } = await supabase
          .from("services")
          .select("*")
          .eq("id", serviceId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error(pickLocalizedText(locale, copy.notFound));

        setFormData(normalizeServiceToForm(data));
        setServiceInfo({
          id: data.id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : pickLocalizedText(locale, copy.loadFailed));
      } finally {
        setFetching(false);
      }
    };

    void fetchService();
  }, [copy.dbUnavailable, copy.loadFailed, copy.notFound, locale, mode, serviceId]);

  const iconOptions = useMemo(
    () => [
      { value: "WrenchScrewdriverIcon", label: pickLocalizedText(locale, copy.toolIcon), icon: WrenchScrewdriverIcon },
      { value: "ScissorsIcon", label: pickLocalizedText(locale, copy.trimIcon), icon: ScissorsIcon },
      { value: "BeakerIcon", label: pickLocalizedText(locale, copy.soilIcon), icon: BeakerIcon },
      { value: "SparklesIcon", label: pickLocalizedText(locale, copy.decorIcon), icon: SparklesIcon },
    ],
    [copy.decorIcon, copy.soilIcon, copy.toolIcon, copy.trimIcon, locale]
  );

  const unitOptions = useMemo(
    () => [
      { value: "job", label: locale === "th" ? "งาน" : locale === "zh" ? "项工作" : "job" },
      { value: "sqm", label: locale === "th" ? "ตร.ม." : locale === "zh" ? "平方米" : "sq m" },
      { value: "piece", label: locale === "th" ? "ชิ้น" : locale === "zh" ? "件" : "piece" },
      { value: "visit", label: locale === "th" ? "ครั้ง" : locale === "zh" ? "次" : "visit" },
      { value: "month", label: locale === "th" ? "เดือน" : locale === "zh" ? "月" : "month" },
    ],
    [locale]
  );

  const durationUnitLabel = (value: DurationUnit) => {
    switch (value) {
      case "hours":
        return pickLocalizedText(locale, copy.hours);
      case "weeks":
        return pickLocalizedText(locale, copy.weeks);
      case "months":
        return pickLocalizedText(locale, copy.months);
      case "days":
      default:
        return pickLocalizedText(locale, copy.days);
    }
  };

  const billingTypeLabel = (value: BillingType) => {
    switch (value) {
      case "one-time":
        return pickLocalizedText(locale, copy.oneTime);
      case "recurring":
        return pickLocalizedText(locale, copy.recurring);
      case "both":
      default:
        return pickLocalizedText(locale, copy.both);
    }
  };

  const selectedUnitLabel = unitOptions.find((unit) => unit.value === formData.unit)?.label || formData.unit;
  const selectedIcon = iconOptions.find((option) => option.value === formData.icon);
  const PreviewIcon = selectedIcon?.icon || WrenchScrewdriverIcon;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.service_name.trim() || !formData.description.trim() || !formData.base_price.trim()) {
      setError(pickLocalizedText(locale, copy.formIncomplete));
      return;
    }

    const basePrice = parseFloat(formData.base_price);
    if (Number.isNaN(basePrice) || basePrice <= 0) {
      setError(pickLocalizedText(locale, copy.invalidPrice));
      return;
    }

    setLoading(true);
    setError("");

    const payload: Partial<Service> = {
      service_name: formData.service_name.trim(),
      description: formData.description.trim(),
      base_price: basePrice,
      category: formData.category.trim() || undefined,
      service_code: formData.service_code.trim() || undefined,
      billing_type: formData.billing_type,
      is_active: formData.is_active,
      has_estimated_duration: formData.has_estimated_duration,
      estimated_duration: formData.has_estimated_duration ? Math.max(0, parseInt(formData.estimated_duration || "0", 10) || 0) : undefined,
      estimated_duration_unit: formData.has_estimated_duration ? formData.estimated_duration_unit : undefined,
    };

    try {
      if (mode === "edit" && serviceId) {
        const { error: updateError } = await updateService(serviceId, payload);
        if (updateError) throw updateError;
        setSuccess(true);
        setLoading(false);
        setTimeout(() => {
          router.push("/dashboard/admin/services");
        }, 1200);
        return;
      }

      const { data, error: createError } = await createService(payload);
      if (createError) throw createError;

      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push(data?.id ? `/dashboard/admin/services/pricing?serviceId=${data.id}` : "/dashboard/admin/services");
      }, 1200);
    } catch (submitError: any) {
      setLoading(false);
      setError(submitError?.message || pickLocalizedText(locale, copy.saveFailed));
    }
  };

  if (!profile) return null;

  if (profile.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(26,54,38,0.08),_transparent_28%),linear-gradient(180deg,#f7f8f4_0%,#f4f1ea_100%)] p-6">
        <div className="rounded-[28px] border border-[#E6E3DA] bg-white px-8 py-6 text-gray-700 shadow-[0_14px_34px_rgba(26,54,38,0.06)]">
          {pickLocalizedText(locale, servicesCopy.accessDenied)}
        </div>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(26,54,38,0.08),_transparent_28%),linear-gradient(180deg,#f7f8f4_0%,#f4f1ea_100%)]">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-b-2 border-[#1A3626]" />
          <p className="mt-4 text-gray-600">{pickLocalizedText(locale, copy.loading)}</p>
        </div>
      </div>
    );
  }

  if (mode === "edit" && !serviceInfo && error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(26,54,38,0.08),_transparent_28%),linear-gradient(180deg,#f7f8f4_0%,#f4f1ea_100%)] p-6">
        <div className="rounded-[28px] border border-[#E6E3DA] bg-white p-8 text-center shadow-[0_16px_40px_rgba(26,54,38,0.06)]">
          <ExclamationTriangleIcon className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900">{pickLocalizedText(locale, copy.notFound)}</h2>
          <p className="mb-4 text-gray-600">{error || pickLocalizedText(locale, copy.notFoundBody)}</p>
          <button onClick={() => router.push("/dashboard/admin/services")} className="rounded-full bg-[#1A3626] px-5 py-3 text-sm font-semibold text-white hover:bg-[#13291d]">
            {pickLocalizedText(locale, copy.backToList)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(26,54,38,0.08),_transparent_28%),linear-gradient(180deg,#f7f8f4_0%,#f4f1ea_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button onClick={() => router.push("/dashboard/admin/services")} className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5E6963] transition-colors hover:text-[#183223]">
              <ArrowLeftIcon className="h-4 w-4" />
              {pickLocalizedText(locale, copy.backToList)}
            </button>
            {mode === "edit" && serviceId ? (
              <Link href={`/dashboard/admin/services/pricing?serviceId=${serviceId}`} className="inline-flex items-center rounded-full border border-[#D8DED8] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#183223] transition-colors hover:bg-gray-50">
                {pickLocalizedText(locale, servicesCopy.pricingPackages)}
              </Link>
            ) : null}
          </div>

          <section className="rounded-[32px] border border-[#E6E3DA] bg-white/85 p-6 shadow-[0_16px_40px_rgba(26,54,38,0.06)] backdrop-blur-sm lg:p-8">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex rounded-full border border-[#D6DDD7] bg-[#F4F7F4] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#32513E]">
                {mode === "create" ? "Service Launch" : "Service Editor"}
              </div>
              <h1 className="text-3xl font-light tracking-tight text-[#183223] lg:text-4xl">
                {mode === "create" ? pickLocalizedText(locale, copy.createTitle) : pickLocalizedText(locale, copy.title)}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66716B]">
                {mode === "create" ? pickLocalizedText(locale, copy.createSubtitle) : pickLocalizedText(locale, copy.subtitle)}
              </p>
            </div>
          </section>
        </div>

        {success ? (
          <div className="mb-6 flex items-center rounded-2xl border border-green-200 bg-green-50 p-4">
            <CheckIcon className="mr-3 h-5 w-5 text-green-600" />
            <p className="text-green-700">{mode === "create" ? pickLocalizedText(locale, copy.createSuccess) : pickLocalizedText(locale, copy.success)}</p>
          </div>
        ) : null}

        {error && !success ? (
          <div className="mb-6 flex items-center rounded-2xl border border-red-200 bg-red-50 p-4">
            <ExclamationTriangleIcon className="mr-3 h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="rounded-[28px] border border-[#E6E3DA] bg-white p-6 shadow-[0_14px_34px_rgba(26,54,38,0.05)]">
            <form onSubmit={submit} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{pickLocalizedText(locale, copy.serviceName)}</label>
                <input value={formData.service_name} onChange={(event) => setFormData({ ...formData, service_name: event.target.value })} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 focus:border-[#1A3626] focus:outline-none" placeholder={pickLocalizedText(locale, copy.serviceNamePlaceholder)} required />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{pickLocalizedText(locale, copy.description)}</label>
                <textarea value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} rows={4} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 focus:border-[#1A3626] focus:outline-none" placeholder={pickLocalizedText(locale, copy.descriptionPlaceholder)} required />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">{pickLocalizedText(locale, copy.price)}</label>
                  <input type="number" min="0" step="0.01" value={formData.base_price} onChange={(event) => setFormData({ ...formData, base_price: event.target.value })} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 focus:border-[#1A3626] focus:outline-none" placeholder="0" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">{pickLocalizedText(locale, copy.unit)}</label>
                  <select value={formData.unit} onChange={(event) => setFormData({ ...formData, unit: event.target.value })} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 focus:border-[#1A3626] focus:outline-none">
                    {unitOptions.map((unit) => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">{pickLocalizedText(locale, copy.category)}</label>
                  <input value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 focus:border-[#1A3626] focus:outline-none" placeholder={pickLocalizedText(locale, copy.categoryPlaceholder)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">{pickLocalizedText(locale, copy.serviceCode)}</label>
                  <input value={formData.service_code} onChange={(event) => setFormData({ ...formData, service_code: event.target.value })} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 focus:border-[#1A3626] focus:outline-none" placeholder={pickLocalizedText(locale, copy.serviceCodePlaceholder)} />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{pickLocalizedText(locale, copy.icon)}</label>
                <div className="grid grid-cols-2 gap-3">
                  {iconOptions.map((option) => {
                    const IconComponent = option.icon;
                    const isActive = formData.icon === option.value;
                    return (
                      <button key={option.value} type="button" onClick={() => setFormData({ ...formData, icon: option.value })} className={`rounded-2xl border p-3 text-left transition-colors ${isActive ? "border-[#1A3626] bg-[#F4F7F4] text-[#1A3626]" : "border-[#E2E5DF] hover:border-[#C7D0C9]"}`}>
                        <div className="flex items-center space-x-2">
                          <IconComponent className="h-5 w-5" />
                          <span className="text-sm">{option.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">{pickLocalizedText(locale, copy.billingType)}</label>
                  <select value={formData.billing_type} onChange={(event) => setFormData({ ...formData, billing_type: event.target.value as BillingType })} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 focus:border-[#1A3626] focus:outline-none">
                    <option value="one-time">{pickLocalizedText(locale, copy.oneTime)}</option>
                    <option value="recurring">{pickLocalizedText(locale, copy.recurring)}</option>
                    <option value="both">{pickLocalizedText(locale, copy.both)}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">{pickLocalizedText(locale, copy.status)}</label>
                  <select value={formData.is_active ? "active" : "inactive"} onChange={(event) => setFormData({ ...formData, is_active: event.target.value === "active" })} className="w-full rounded-xl border border-[#E2E5DF] bg-[#FCFCFA] px-3 py-2.5 focus:border-[#1A3626] focus:outline-none">
                    <option value="active">{pickLocalizedText(locale, copy.active)}</option>
                    <option value="inactive">{pickLocalizedText(locale, copy.inactive)}</option>
                  </select>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E8E4DB] bg-[#FAFBF8] p-5">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={formData.has_estimated_duration} onChange={(event) => setFormData({ ...formData, has_estimated_duration: event.target.checked, estimated_duration: event.target.checked ? formData.estimated_duration || "1" : "" })} />
                  {pickLocalizedText(locale, copy.showEstimatedDuration)}
                </label>

                {formData.has_estimated_duration ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">{pickLocalizedText(locale, copy.amount)}</label>
                      <input type="number" min="0" step="1" value={formData.estimated_duration} onChange={(event) => setFormData({ ...formData, estimated_duration: event.target.value })} className="w-full rounded-xl border border-[#E2E5DF] bg-white px-3 py-2.5 focus:border-[#1A3626] focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">{pickLocalizedText(locale, copy.unit)}</label>
                      <select value={formData.estimated_duration_unit} onChange={(event) => setFormData({ ...formData, estimated_duration_unit: event.target.value as DurationUnit })} className="w-full rounded-xl border border-[#E2E5DF] bg-white px-3 py-2.5 focus:border-[#1A3626] focus:outline-none">
                        <option value="hours">{pickLocalizedText(locale, copy.hours)}</option>
                        <option value="days">{pickLocalizedText(locale, copy.days)}</option>
                        <option value="weeks">{pickLocalizedText(locale, copy.weeks)}</option>
                        <option value="months">{pickLocalizedText(locale, copy.months)}</option>
                      </select>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end space-x-4 pt-2">
                <button type="button" onClick={() => router.push("/dashboard/admin/services")} className="rounded-full border border-[#D8DED8] px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50">
                  {pickLocalizedText(locale, copy.cancel)}
                </button>
                <button type="submit" disabled={loading} className="rounded-full bg-[#1A3626] px-6 py-2 text-white transition-colors hover:bg-[#13291d] disabled:bg-gray-400">
                  {loading ? pickLocalizedText(locale, copy.saving) : mode === "create" ? pickLocalizedText(locale, copy.createService) : pickLocalizedText(locale, copy.saveChanges)}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-[#E6E3DA] bg-white p-6 shadow-[0_14px_34px_rgba(26,54,38,0.05)]">
              <h3 className="mb-4 text-lg font-semibold text-[#183223]">{pickLocalizedText(locale, copy.preview)}</h3>
              <div className="rounded-[24px] border border-[#E8E4DB] bg-[linear-gradient(180deg,#ffffff_0%,#faf7f1_100%)] p-5">
                <div className="mb-4 flex items-start gap-3">
                  <PreviewIcon className="h-8 w-8 text-[#1A3626]" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{formData.service_name || pickLocalizedText(locale, copy.defaultName)}</h4>
                    <p className="text-sm text-gray-600">{formData.description || pickLocalizedText(locale, copy.defaultDescription)}</p>
                  </div>
                </div>
                <div className="flex items-baseline justify-between border-t border-[#ECE7DF] pt-4">
                  <div className="text-2xl font-bold text-[#1A3626]">{formatCurrencyByLocale(formData.base_price ? parseFloat(formData.base_price) : 0, locale)}</div>
                  <div className="text-sm text-gray-500">{pickLocalizedText(locale, copy.per)} {selectedUnitLabel}</div>
                </div>
              </div>
            </div>

            {mode === "edit" && serviceInfo ? (
              <div className="rounded-[28px] border border-[#E6E3DA] bg-white p-6 shadow-[0_14px_34px_rgba(26,54,38,0.05)]">
                <h4 className="mb-4 text-lg font-semibold text-[#183223]">{pickLocalizedText(locale, copy.originalInfo)}</h4>
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="rounded-[20px] border border-[#E8E4DB] bg-[#FAFBF8] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.createdAt)}</div>
                    <div className="mt-2 font-medium text-[#183223]">{serviceInfo.createdAt ? formatDateByLocale(serviceInfo.createdAt, locale) : pickLocalizedText(locale, copy.notSpecified)}</div>
                  </div>
                  <div className="rounded-[20px] border border-[#E8E4DB] bg-[#FAFBF8] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.updatedAt)}</div>
                    <div className="mt-2 font-medium text-[#183223]">{serviceInfo.updatedAt ? formatDateByLocale(serviceInfo.updatedAt, locale) : pickLocalizedText(locale, copy.notSpecified)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-[#E6E3DA] bg-white p-6 shadow-[0_14px_34px_rgba(26,54,38,0.05)]">
                <h4 className="mb-2 text-lg font-semibold text-[#183223]">{pickLocalizedText(locale, copy.launchSummary)}</h4>
                <p className="mb-4 text-sm leading-6 text-[#66716B]">{pickLocalizedText(locale, copy.readinessBody)}</p>
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="rounded-[20px] border border-[#E8E4DB] bg-[#FAFBF8] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.billingType)}</div>
                    <div className="mt-2 font-medium text-[#183223]">{billingTypeLabel(formData.billing_type)}</div>
                  </div>
                  <div className="rounded-[20px] border border-[#E8E4DB] bg-[#FAFBF8] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.status)}</div>
                    <div className="mt-2 font-medium text-[#183223]">{formData.is_active ? pickLocalizedText(locale, copy.active) : pickLocalizedText(locale, copy.inactive)}</div>
                  </div>
                  <div className="rounded-[20px] border border-[#E8E4DB] bg-[#FAFBF8] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.estimatedDurationLabel)}</div>
                    <div className="mt-2 font-medium text-[#183223]">{formData.has_estimated_duration && formData.estimated_duration ? `${formData.estimated_duration} ${durationUnitLabel(formData.estimated_duration_unit)}` : pickLocalizedText(locale, copy.notSpecified)}</div>
                  </div>
                  <div className="rounded-[20px] border border-[#E8E4DB] bg-[#FAFBF8] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7E8A83]">{pickLocalizedText(locale, copy.serviceCode)}</div>
                    <div className="mt-2 font-medium text-[#183223]">{formData.service_code || pickLocalizedText(locale, copy.notSpecified)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
