'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  History,
  CheckCircle2,
  AlertCircle,
  FileText,
  Save,
  Download,
  Layout,
  Package,
  User,
  MapPin,
  Phone,
  Clock,
  Plus,
  Pencil,
  Trash2, Calendar, Eye,
  ChevronLeft,
  ChevronDown,
  X,
  Settings2,
  ListChecks,
  Info,
  ArrowRight,
  Lock,
  LayoutGrid,
  RotateCcw,
  Move
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/AuthContext'
import { generateDocumentPdfUrl, downloadFile } from '@/lib/documentPdf'
import { buildContractDocumentViewModel } from '@/lib/contractDocumentShared'
import {
  buildDocumentCategoryLabel,
  DOCUMENT_MAIN_CATEGORY_OPTIONS,
  getDocumentCategoryDefaults,
  getDocumentSubcategoryOptions,
  type DocumentCatalogMainCategory,
  type DocumentCatalogSubcategory,
} from '@/lib/documentItemCatalog'
import { buildPlantDocumentCardKey, DEFAULT_PLANT_LAYOUT_PAGE_SETTINGS, DEFAULT_PLANT_LAYOUT_SETTINGS, getPlantDocumentCategory, getPlantDocumentCategoryLabel, isPlantDocumentEligible, normalizePlantDocumentMode, normalizePlantLayoutSettings, paginatePlantLayoutCards, PLANT_LAYOUT_A4_HEIGHT_PX, PLANT_LAYOUT_A4_WIDTH_PX, resolvePlantLayoutCardTuning, resolvePlantLayoutPageSettings, type PlantLayoutCardTuning, type PlantLayoutSettings } from '@/lib/plantMaterial'
import { ContractDocumentType, DocumentItemCatalogEntry, House, PlantItemCategory, PlantingSpacingReference, Profile, createManualDocument, getAllOrders, getCustomerHouses, getCustomers, getDocumentDetails, getDocumentItemCatalog, getPlantLibraryVariants, getPlantingSpacingReferences, supabase, updateManualDocument } from '@/lib/supabaseClient'
import type { PlantDocumentMode } from '@/lib/plantMaterial'
import { getReceiptGateForInvoice } from '@/lib/installmentFlow'
import { useI18n } from "@/lib/I18nContext";

type ManualType = 'quotation' | 'invoice' | 'receipt' | 'plant_material' | 'contract'

type ItemRow = {
  id: string
  description: string
  english_name: string
  image_url?: string
  detail: string
  spec: string
  item_category: PlantItemCategory
  plant_document_mode: PlantDocumentMode
  size_mode: 'shrub' | 'tree' | 'other'
  shrub_size_style: 'height_spacing' | 'pot_inch'
  shrub_container_type: 'pot' | 'bag'
  height_m: number
  pot_diameter_inch: number
  trunk_diameter_inch: number
  tree_height_label: string
  size: string
  spacing_x: number
  spacing_y: number
  area_sqm: number
  unit: string
  quantity: number
  unit_price_material: number
  unit_price_labor: number
}

type CategoryRow = {
  id: string
  name: string
  main_category: DocumentCatalogMainCategory
  subcategory: DocumentCatalogSubcategory
  labor_percentage?: number
  items: ItemRow[]
}

type ZoneRow = {
  id: string
  name: string
  categories: CategoryRow[]
}

function PlantLayoutA4PreviewFrame({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [availableWidth, setAvailableWidth] = useState(PLANT_LAYOUT_A4_WIDTH_PX)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const updateWidth = () => {
      setAvailableWidth(element.clientWidth || PLANT_LAYOUT_A4_WIDTH_PX)
    }

    updateWidth()

    const observer = new ResizeObserver(() => updateWidth())
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const scale = Math.min(1, availableWidth / PLANT_LAYOUT_A4_WIDTH_PX)

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden" style={{ height: PLANT_LAYOUT_A4_HEIGHT_PX * scale }}>
      <div
        className="absolute top-0 left-1/2 bg-white shadow-[0_18px_40px_rgba(17,17,17,0.08)]"
        style={{
          width: PLANT_LAYOUT_A4_WIDTH_PX,
          height: PLANT_LAYOUT_A4_HEIGHT_PX,
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {children}
      </div>
    </div>
  )
}

const formatThaiDate = (value?: string | null) => {
  const raw = String(value || '').trim()
  if (!raw) return '-'

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return '-'

  return parsed.toLocaleDateString('th-TH')
}

const CONTRACT_DOTTED_SHORT = '………………………………'
const CONTRACT_DOTTED_MEDIUM = '……………………………………………………'
const CONTRACT_DOTTED_LONG = '………………………………………………………………………………………………………………'

const DEFAULT_SYSTEM_COMPANY_INFO = {
  name_th: 'บริษัท เอ็กซ์วายแอล แลนด์สเคป จำกัด',
  name_en: 'XYLEM LANDSCAPE CO., LTD.',
  address: '158/13-14 หมู่บ้าน บ้านสวนพรีเมียร์ หมู่ที่ 6 ต.หนองจ๊อม อ.สันทราย จ.เชียงใหม่',
  tax_id: '0505567008779',
  phone: '02-xxx-xxxx',
  email: 'contact@xylem.co.th',
  logo_url: '',
  contract_company_name: 'บริษัท เอ็กซ์วายแอล สตูดิโอ จำกัด',
  contract_company_address: '158/13-14 หมู่บ้านบ้านสวนธาร หมู่ที่ 6 ซอย 1 ถนนเชียงใหม่-เชียงราย ตำบลเชิงดอย อำเภอดอยสะเก็ด จังหวัดเชียงใหม่ 50220',
  contract_company_tax_id: '0505568019024',
  contract_signer_name: 'นางสาวเจนจิรา วงค์โพธิสาร',
  contract_witness_name: 'นายศุภโชค บุรีคำ',
}

const DEFAULT_SYSTEM_FINANCIAL_INFO = {
  bank_name: 'ธนาคารกสิกรไทย',
  account_no: '180-3-31959-5',
  account_name: 'บจก. เอ็กซ์วายแอล แลนด์สเคป',
  branch: 'สาขาสันทราย',
  promptpay_id: '',
  bank_code: '',
  bank_icon: '',
}

const DEFAULT_CONTRACT_FORM_FIELDS = {
  land_deed_number: '',
  work_start_date: '',
  work_end_date: '',
  signing_location: '',
  project_location: '',
  quotation_attachment_pages: '1',
  invoice_reference_code: '',
  invoice_attachment_pages: '',
  employer_signer_name: '',
  employer_witness_name: '',
  employer_id_attachment_pages: '',
  contractor_id_attachment_pages: '',
  contractor_company_name: '',
  contractor_company_address: '',
  contractor_company_tax_id: '',
  contractor_signer_name: '',
  contractor_witness_name: '',
}

const normalizeContractFormFields = (value: any) => ({
  ...DEFAULT_CONTRACT_FORM_FIELDS,
  ...(value && typeof value === 'object'
    ? {
        land_deed_number: String(value.land_deed_number || '').trim(),
        work_start_date: String(value.work_start_date || '').slice(0, 10),
        work_end_date: String(value.work_end_date || '').slice(0, 10),
        signing_location: String(value.signing_location || '').trim(),
        project_location: String(value.project_location || '').trim(),
        quotation_attachment_pages: String(value.quotation_attachment_pages || '').trim() || DEFAULT_CONTRACT_FORM_FIELDS.quotation_attachment_pages,
        invoice_reference_code: String(value.invoice_reference_code || '').trim(),
        invoice_attachment_pages: String(value.invoice_attachment_pages || '').trim(),
        employer_signer_name: String(value.employer_signer_name || '').trim(),
        employer_witness_name: String(value.employer_witness_name || '').trim(),
        employer_id_attachment_pages: String(value.employer_id_attachment_pages || '').trim(),
        contractor_id_attachment_pages: String(value.contractor_id_attachment_pages || '').trim(),
        contractor_company_name: String(value.contractor_company_name || '').trim(),
        contractor_company_address: String(value.contractor_company_address || '').trim(),
        contractor_company_tax_id: String(value.contractor_company_tax_id || '').trim(),
        contractor_signer_name: String(value.contractor_signer_name || '').trim(),
        contractor_witness_name: String(value.contractor_witness_name || '').trim(),
      }
    : {}),
})

const toThaiIntegerText = (value: number): string => {
  const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']

  if (value === 0) return digits[0]

  const renderChunk = (chunk: number): string => {
    const numbers = String(chunk).split('').map((char) => Number(char))
    let result = ''

    numbers.forEach((digit, index) => {
      if (digit === 0) return
      const pos = numbers.length - index - 1

      if (pos === 0 && digit === 1 && numbers.length > 1) {
        result += 'เอ็ด'
        return
      }

      if (pos === 1) {
        if (digit === 1) {
          result += 'สิบ'
          return
        }
        if (digit === 2) {
          result += 'ยี่สิบ'
          return
        }
      }

      result += `${digits[digit]}${positions[pos] || ''}`
    })

    return result
  }

  const parts: string[] = []
  let remaining = Math.floor(Math.abs(value))

  while (remaining > 0) {
    parts.unshift(renderChunk(remaining % 1_000_000))
    remaining = Math.floor(remaining / 1_000_000)
  }

  return parts
    .map((part, index) => (index < parts.length - 1 ? `${part}ล้าน` : part))
    .join('')
}

const formatThaiBahtText = (value: number) => {
  const amount = Number(value) || 0
  const integerPart = Math.floor(Math.abs(amount))
  const satang = Math.round((Math.abs(amount) - integerPart) * 100)
  const bahtText = `${toThaiIntegerText(integerPart)}บาท`

  if (satang === 0) return `${bahtText}ถ้วน`
  return `${bahtText}${toThaiIntegerText(satang)}สตางค์`
}

function ContractEditableText({
  value,
  displayValue,
  fallback,
  disabled,
  onChange,
  placeholder,
  className = '',
  type = 'text',
  inputMode,
}: {
  value: string
  displayValue?: string
  fallback: string
  disabled: boolean
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  type?: 'text' | 'number' | 'date'
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  if (disabled || !onChange) {
    return <span className={className}>{String((displayValue ?? value) || '').trim() || fallback}</span>
  }

  return (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`inline-block min-h-[30px] border-b border-[#94A3B8] bg-transparent px-1.5 py-0.5 text-inherit font-inherit leading-inherit text-[#111827] outline-none ${className}`}
    />
  )
}

function ContractEditableArea({
  value,
  displayValue,
  fallback,
  disabled,
  onChange,
  placeholder,
  rows = 2,
  className = '',
}: {
  value: string
  displayValue?: string
  fallback: string
  disabled: boolean
  onChange?: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}) {
  if (disabled || !onChange) {
    return <span className={`whitespace-pre-wrap ${className}`}>{String((displayValue ?? value) || '').trim() || fallback}</span>
  }

  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`block w-full resize-none border-b border-[#94A3B8] bg-transparent px-1.5 py-1 text-inherit font-inherit leading-inherit text-[#111827] outline-none ${className}`}
    />
  )
}

function ContractPreviewSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-[#D8DBE8] pb-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#5B5345]">
      {children}
    </div>
  )
}

function ContractPreviewFieldRow({
  label,
  children,
  multiline = false,
}: {
  label: string
  children: React.ReactNode
  multiline?: boolean
}) {
  return (
    <div className={`grid gap-3 ${multiline ? 'items-start' : 'items-baseline'} grid-cols-[108px_minmax(0,1fr)]`}>
      <div className="text-[10px] font-bold tracking-[0.04em] text-[#756B57]">{label}</div>
      <div className="min-w-0 text-[11px] leading-[1.6] text-[#111827]">{children}</div>
    </div>
  )
}

function LandscapeTurnkeyContractPreview({
  contractType,
  onContractTypeChange,
  referenceQuotations,
  referenceQuotationsLoading,
  referenceDocumentLabel,
  selectedReferenceQuotationId,
  onReferenceQuotationChange,
  onApplyReferenceQuotation,
  onApplySystemSettings,
  onResetOverrides,
  errorMessage,
  blockingErrors,
  documentCode,
  contractPreviewDate,
  signingLocation,
  onSigningLocationChange,
  customerName,
  customerNameDisplay,
  onCustomerNameChange,
  customerTaxId,
  customerTaxIdDisplay,
  onCustomerTaxIdChange,
  customerAddress,
  customerAddressDisplay,
  onCustomerAddressChange,
  employerSignerName,
  employerSignerDisplay,
  onEmployerSignerNameChange,
  companyName,
  onCompanyNameChange,
  companyAddress,
  onCompanyAddressChange,
  companyTaxId,
  onCompanyTaxIdChange,
  grandTotal,
  grandTotalText,
  referenceCode,
  referenceDate,
  projectLocation,
  onProjectLocationChange,
  scopePreviewItems,
  scopeExtraCount,
  scopeCategoryCount,
  scopeZoneCount,
  installments,
  bankText,
  landDeedNumber,
  onLandDeedNumberChange,
  workStartDate,
  workStartDateDisplay,
  onWorkStartDateChange,
  workEndDate,
  workEndDateDisplay,
  onWorkEndDateChange,
  quotationAttachmentPages,
  onQuotationAttachmentPagesChange,
  invoiceReferenceCode,
  onInvoiceReferenceCodeChange,
  invoiceAttachmentPages,
  onInvoiceAttachmentPagesChange,
  employerWitnessName,
  onEmployerWitnessNameChange,
  employerAttachmentPages,
  onEmployerAttachmentPagesChange,
  contractorSignerName,
  onContractorSignerNameChange,
  contractorWitnessName,
  onContractorWitnessNameChange,
  contractorAttachmentPages,
  onContractorAttachmentPagesChange,
  selectedConditions,
  notes,
  disabled,
}: {
  contractType: ContractDocumentType
  onContractTypeChange: (value: ContractDocumentType) => void
  referenceQuotations: QuotationReferenceRow[]
  referenceQuotationsLoading: boolean
  referenceDocumentLabel: string
  selectedReferenceQuotationId: string
  onReferenceQuotationChange: (value: string) => void
  onApplyReferenceQuotation: () => void
  onApplySystemSettings: () => void
  onResetOverrides: () => void
  errorMessage?: string
  blockingErrors: string[]
  documentCode: string
  contractPreviewDate: string
  signingLocation: string
  onSigningLocationChange: (value: string) => void
  customerName: string
  customerNameDisplay: string
  onCustomerNameChange: (value: string) => void
  customerTaxId: string
  customerTaxIdDisplay: string
  onCustomerTaxIdChange: (value: string) => void
  customerAddress: string
  customerAddressDisplay: string
  onCustomerAddressChange: (value: string) => void
  employerSignerName: string
  employerSignerDisplay: string
  onEmployerSignerNameChange: (value: string) => void
  companyName: string
  onCompanyNameChange: (value: string) => void
  companyAddress: string
  onCompanyAddressChange: (value: string) => void
  companyTaxId: string
  onCompanyTaxIdChange: (value: string) => void
  grandTotal: number
  grandTotalText: string
  referenceCode: string
  referenceDate: string
  projectLocation: string
  onProjectLocationChange: (value: string) => void
  scopePreviewItems: Array<{ description: string; quantity: number; unit: string }>
  scopeExtraCount: number
  scopeCategoryCount: number
  scopeZoneCount: number
  installments: Array<{ id: string; label: string; dueScope: string; amount: number; percent: number }>
  bankText: string
  landDeedNumber: string
  onLandDeedNumberChange: (value: string) => void
  workStartDate: string
  workStartDateDisplay: string
  onWorkStartDateChange: (value: string) => void
  workEndDate: string
  workEndDateDisplay: string
  onWorkEndDateChange: (value: string) => void
  quotationAttachmentPages: string
  onQuotationAttachmentPagesChange: (value: string) => void
  invoiceReferenceCode: string
  onInvoiceReferenceCodeChange: (value: string) => void
  invoiceAttachmentPages: string
  onInvoiceAttachmentPagesChange: (value: string) => void
  employerWitnessName: string
  onEmployerWitnessNameChange: (value: string) => void
  employerAttachmentPages: string
  onEmployerAttachmentPagesChange: (value: string) => void
  contractorSignerName: string
  onContractorSignerNameChange: (value: string) => void
  contractorWitnessName: string
  onContractorWitnessNameChange: (value: string) => void
  contractorAttachmentPages: string
  onContractorAttachmentPagesChange: (value: string) => void
  selectedConditions: string[]
  notes: string
  disabled: boolean
}) {
    const { locale } = useI18n();
  const contractView = buildContractDocumentViewModel({
    contractType,
    referenceDocumentLabel,
    referenceCode,
    projectLocation: projectLocation || CONTRACT_DOTTED_LONG,
    grandTotal,
    grandTotalText,
    bankText,
    workStartDateDisplay,
    workEndDateDisplay,
    scopePreviewItemCount: scopePreviewItems.length,
    scopeExtraCount,
    scopeCategoryCount,
    scopeZoneCount,
    selectedConditions,
    notes,
    installments: installments.map((installment) => ({
      label: installment.label,
      dueScope: installment.dueScope,
      amount: installment.amount,
      percent: installment.percent,
    })),
    customerNameDisplay,
    employerSignerDisplay,
    companyName,
    contractorSignerName: contractorSignerName || CONTRACT_DOTTED_SHORT,
    employerWitnessName: employerWitnessName || CONTRACT_DOTTED_SHORT,
    contractorWitnessName: contractorWitnessName || CONTRACT_DOTTED_SHORT,
  })

  return (
    <div className="border border-[#D8DBE8] bg-[#F3F0E8] p-3 sm:p-4 space-y-5" style={{ fontFamily: 'var(--font-sarabun), Arial, Helvetica, sans-serif' }}>
      <div className="border border-[#D8DBE8] bg-white px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-3 md:grid-cols-2 xl:min-w-[560px]">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7C6F58] mb-2">{locale === 'en' ? 'Contract type' : locale === 'zh' ? '合同类型' : 'ประเภทสัญญา'}</div>
              <select
                value={contractType}
                onChange={(event) => onContractTypeChange(event.target.value as ContractDocumentType)}
                disabled={disabled}
                className="w-full border border-[#D6D0C2] bg-[#FFFCF6] px-3 py-2.5 text-xs font-bold text-[#111827] outline-none disabled:opacity-50"
              >
                <option value="landscape_turnkey">{locale === 'en' ? 'Garden contract' : locale === 'zh' ? '园林承包' : 'สัญญารับเหมาจัดสวน'}</option>
                <option value="annual_maintenance">{locale === 'en' ? 'Annual garden care contract' : locale === 'zh' ? '年度花园护理合同' : 'สัญญาดูแลสวนรายปี'}</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7C6F58] mb-2">{referenceDocumentLabel}{locale === 'en' ? 'refer' : locale === 'zh' ? '参考' : 'อ้างอิง'}</div>
              <select
                value={selectedReferenceQuotationId}
                onChange={(event) => onReferenceQuotationChange(event.target.value)}
                disabled={referenceQuotationsLoading || disabled}
                className="w-full border border-[#D6D0C2] bg-[#FFFCF6] px-3 py-2.5 text-xs font-bold text-[#111827] outline-none disabled:opacity-50"
              >
                <option value="">{referenceQuotationsLoading ? `กำลังโหลด${referenceDocumentLabel}...` : `เลือก${referenceDocumentLabel}`}</option>
                {referenceQuotations.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {(doc.document_code || doc.id.slice(0, 8))} {doc.created_at ? `• ${new Date(doc.created_at).toLocaleDateString('th-TH')}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button
              type="button"
              onClick={onApplyReferenceQuotation}
              disabled={!selectedReferenceQuotationId || disabled}
              className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] border border-[#D6D0C2] bg-white text-[#111827] disabled:opacity-40"
            >
              {locale === 'en' ? 'Retrieve customer information' : locale === 'zh' ? '检索客户信息' : '               ดึงข้อมูลลูกค้า             '}</button>
            <button
              type="button"
              onClick={onApplySystemSettings}
              disabled={disabled}
              className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] border border-[#D6D0C2] bg-white text-[#111827] disabled:opacity-40"
            >
              {locale === 'en' ? 'Retrieve company information' : locale === 'zh' ? '检索公司信息' : '               ดึงข้อมูลบริษัท             '}</button>
            <button
              type="button"
              onClick={onResetOverrides}
              disabled={disabled}
              className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] border border-[#D6D0C2] bg-white text-[#111827] disabled:opacity-40"
            >
              {locale === 'en' ? 'Clear override value' : locale === 'zh' ? '清除覆盖值' : '               ล้างค่า override             '}</button>
          </div>
        </div>

        {errorMessage && <div className="mt-3 text-xs font-bold text-red-600">{errorMessage}</div>}
        {blockingErrors.length > 0 && (
          <div className="mt-3 space-y-1 text-xs font-bold text-amber-700">
            {blockingErrors.map((message) => (
              <div key={message}>{message}</div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5">
      <PlantLayoutA4PreviewFrame>
        <div className="h-full w-full border border-[#D8DBE8] bg-white px-9 py-8 flex flex-col text-[#111827]" style={{ fontFamily: 'var(--font-sarabun), Arial, Helvetica, sans-serif' }}>
          <div className="border-t-[3px] border-[#111827] pt-5">
            <div className="text-center mb-4">
              <div className="text-[21px] font-black tracking-[0.01em] whitespace-nowrap leading-none inline-block w-max max-w-none [word-break:keep-all] [overflow-wrap:normal]">{contractView.nonBreakingPreviewTitle}</div>
              <div className="text-[10px] font-bold tracking-[0.18em] text-[#6B7280] uppercase mt-1.5">{contractView.previewSubtitle}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-[11px]">
              <div className="border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] mb-1">{locale === 'en' ? 'Contract number' : locale === 'zh' ? '合同号' : 'เลขที่สัญญา'}</div>
                <div className="font-black">{documentCode || CONTRACT_DOTTED_SHORT}</div>
              </div>
              <div className="border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] mb-1">{locale === 'en' ? 'Contract date' : locale === 'zh' ? '合约日期' : 'วันที่ทำสัญญา'}</div>
                <div className="font-black">{contractPreviewDate !== '-' ? contractPreviewDate : CONTRACT_DOTTED_SHORT}</div>
              </div>
              <div className="border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] mb-1">{locale === 'en' ? 'Reference documents' : locale === 'zh' ? '参考文件' : 'เอกสารอ้างอิง'}</div>
                <div className="font-black">{referenceCode}</div>
              </div>
              <div className="border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] mb-1">{locale === 'en' ? 'Place of contract' : locale === 'zh' ? '合同地点' : 'สถานที่ทำสัญญา'}</div>
                <ContractEditableText
                  value={signingLocation}
                  fallback={CONTRACT_DOTTED_MEDIUM}
                  disabled={disabled}
                  onChange={onSigningLocationChange}
                  placeholder={locale === 'en' ? 'Place of contract' : locale === 'zh' ? '合同地点' : 'สถานที่ทำสัญญา'}
                  className="min-w-[180px]"
                />
              </div>
            </div>

            <div className="text-[11px] leading-[1.68] text-justify mb-4">
              {locale === 'en' ? 'This contract was made at' : locale === 'zh' ? '本合同签订于' : '               สัญญาฉบับนี้จัดทำขึ้น ณ '}{signingLocation.trim() || CONTRACT_DOTTED_MEDIUM} {locale === 'en' ? 'between the two contracting parties We have checked the details of the contracting party, the work site, and reference documents. Therefore agree to be bound by the following statements and conditions.' : locale === 'zh' ? '两个缔约方之间的关系 我们已检查了缔约方的详细信息、工作地点和参考文件。因此同意受以下声明和条件的约束。' : ' ระหว่างคู่สัญญาทั้งสองฝ่าย ซึ่งได้ตรวจสอบรายละเอียดคู่สัญญา หน้างาน และเอกสารอ้างอิงแล้ว จึงตกลงผูกพันตามข้อความและเงื่อนไขดังต่อไปนี้             '}</div>

            <div className="grid grid-cols-2 gap-5 mb-4">
              <div className="border border-[#CBD5E1] overflow-hidden">
                <div className="bg-[#111827] px-4 py-2.5 text-white text-[10px] font-black uppercase tracking-[0.16em]">{locale === 'en' ? 'Employer\'s side' : locale === 'zh' ? '雇主方' : 'ฝ่ายผู้ว่าจ้าง'}</div>
                <div className="px-4 py-3.5 space-y-2 text-[11px] leading-6">
                  <div><span className="text-[#6B7280]">{locale === 'en' ? 'Name/Juristic Person:' : locale === 'zh' ? '姓名/法人：' : 'ชื่อ / นิติบุคคล:'}</span> <span className="font-black text-[#111827]"><ContractEditableText value={customerName} displayValue={customerNameDisplay} fallback={CONTRACT_DOTTED_SHORT} disabled={disabled} onChange={onCustomerNameChange} placeholder={locale === 'en' ? 'Customer name' : locale === 'zh' ? '客户名称' : 'ชื่อลูกค้า'} className="min-w-[220px]" /></span></div>
                  <div><span className="text-[#6B7280]">{locale === 'en' ? 'Identification number:' : locale === 'zh' ? '识别号码：' : 'เลขประจำตัว:'}</span> <span className="font-bold text-[#111827]"><ContractEditableText value={customerTaxId} displayValue={customerTaxIdDisplay} fallback={CONTRACT_DOTTED_SHORT} disabled={disabled} onChange={onCustomerTaxIdChange} placeholder={locale === 'en' ? 'Taxpayer number or ID card' : locale === 'zh' ? '纳税人号码或身份证' : 'เลขผู้เสียภาษีหรือบัตรประชาชน'} className="min-w-[180px]" inputMode="numeric" /></span></div>
                  <div><span className="text-[#6B7280]">{locale === 'en' ? 'address:' : locale === 'zh' ? '地址：' : 'ที่อยู่:'}</span></div>
                  <div className="font-bold text-[#111827] leading-5"><ContractEditableArea value={customerAddress} displayValue={customerAddressDisplay} fallback={CONTRACT_DOTTED_LONG} disabled={disabled} onChange={onCustomerAddressChange} placeholder={locale === 'en' ? 'Customer address' : locale === 'zh' ? '客户地址' : 'ที่อยู่ลูกค้า'} rows={2} className="w-full" /></div>
                  <div><span className="text-[#6B7280]">{locale === 'en' ? 'Signer:' : locale === 'zh' ? '签名人：' : 'ผู้ลงนาม:'}</span> <span className="font-black text-[#111827]"><ContractEditableText value={employerSignerName} displayValue={employerSignerDisplay} fallback={CONTRACT_DOTTED_SHORT} disabled={disabled} onChange={onEmployerSignerNameChange} placeholder={locale === 'en' ? 'Name of the employer\'s signatory' : locale === 'zh' ? '雇主签字人姓名' : 'ชื่อผู้ลงนามฝ่ายผู้ว่าจ้าง'} className="min-w-[180px]" /></span></div>
                </div>
              </div>
              <div className="border border-[#CBD5E1] overflow-hidden">
                <div className="bg-[#334155] px-4 py-2.5 text-white text-[10px] font-black uppercase tracking-[0.16em]">{locale === 'en' ? 'Contractor\'s side' : locale === 'zh' ? '承包商方' : 'ฝ่ายผู้รับจ้าง'}</div>
                <div className="px-4 py-3.5 space-y-2 text-[11px] leading-6">
                  <div><span className="text-[#6B7280]">{locale === 'en' ? 'Company name:' : locale === 'zh' ? '公司名称：' : 'ชื่อบริษัท:'}</span> <span className="font-black text-[#111827]"><ContractEditableText value={companyName} fallback={CONTRACT_DOTTED_SHORT} disabled={disabled} onChange={onCompanyNameChange} placeholder={locale === 'en' ? 'Contractor\'s name' : locale === 'zh' ? '承包商名称' : 'ชื่อผู้รับจ้าง'} className="min-w-[220px]" /></span></div>
                  <div><span className="text-[#6B7280]">{locale === 'en' ? 'Registration number:' : locale === 'zh' ? '注册号：' : 'เลขทะเบียน:'}</span> <span className="font-bold text-[#111827]"><ContractEditableText value={companyTaxId} fallback={CONTRACT_DOTTED_SHORT} disabled={disabled} onChange={onCompanyTaxIdChange} placeholder={locale === 'en' ? 'Registration number/Employer tax' : locale === 'zh' ? '注册号/雇主税' : 'เลขทะเบียน/ภาษีผู้รับจ้าง'} className="min-w-[180px]" inputMode="numeric" /></span></div>
                  <div><span className="text-[#6B7280]">{locale === 'en' ? 'Office location:' : locale === 'zh' ? '办公地点：' : 'ที่ตั้งสำนักงาน:'}</span></div>
                  <div className="font-bold text-[#111827] leading-5"><ContractEditableArea value={companyAddress} fallback={CONTRACT_DOTTED_LONG} disabled={disabled} onChange={onCompanyAddressChange} placeholder={locale === 'en' ? 'Contractor\'s address' : locale === 'zh' ? '承包商地址' : 'ที่อยู่ผู้รับจ้าง'} rows={2} className="w-full" /></div>
                  <div><span className="text-[#6B7280]">{locale === 'en' ? 'Signer:' : locale === 'zh' ? '签名人：' : 'ผู้ลงนาม:'}</span> <span className="font-black text-[#111827]"><ContractEditableText value={contractorSignerName} fallback={CONTRACT_DOTTED_SHORT} disabled={disabled} onChange={onContractorSignerNameChange} placeholder={locale === 'en' ? 'Name of the contractor\'s signatory' : locale === 'zh' ? '承包商签字人姓名' : 'ชื่อผู้ลงนามฝ่ายผู้รับจ้าง'} className="min-w-[180px]" /></span></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="border border-[#E5E7EB] bg-[#FCFCFD] px-4 py-3 text-[11px] leading-6">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] mb-2">{locale === 'en' ? 'Project summary' : locale === 'zh' ? '项目概要' : 'สรุปโครงการ'}</div>
                <div><span className="text-[#6B7280]">{locale === 'en' ? 'Contract type:' : locale === 'zh' ? '合同类型：' : 'ประเภทสัญญา:'}</span> <span className="font-black text-[#111827]">{contractView.isAnnualContract ? 'ดูแลสวนรายปี' : 'รับเหมางานจัดสวน'}</span></div>
                <div><span className="text-[#6B7280]">{locale === 'en' ? 'Title deed number:' : locale === 'zh' ? '产权契据号码：' : 'เลขที่โฉนด:'}</span> <span className="font-bold text-[#111827]"><ContractEditableText value={landDeedNumber} fallback={CONTRACT_DOTTED_SHORT} disabled={disabled} onChange={onLandDeedNumberChange} placeholder={locale === 'en' ? 'Title deed number' : locale === 'zh' ? '地契号码' : 'เลขที่โฉนด'} className="min-w-[140px]" /></span></div>
                <div><span className="text-[#6B7280]">{locale === 'en' ? 'Project location:' : locale === 'zh' ? '项目地点：' : 'สถานที่โครงการ:'}</span></div>
                <div className="font-bold text-[#111827] leading-5"><ContractEditableArea value={projectLocation} fallback={CONTRACT_DOTTED_LONG} disabled={disabled} onChange={onProjectLocationChange} placeholder={locale === 'en' ? 'Project location' : locale === 'zh' ? '项目地点' : 'สถานที่โครงการ'} rows={2} className="w-full" /></div>
              </div>
              <div className="border border-[#E5E7EB] bg-[#FCFCFD] px-4 py-3 text-[11px] leading-6">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6B7280] mb-2">{locale === 'en' ? 'Reference information' : locale === 'zh' ? '参考信息' : 'ข้อมูลเอกสารอ้างอิง'}</div>
                <div><span className="text-[#6B7280]">{locale === 'en' ? 'number' : locale === 'zh' ? '数字' : 'เลขที่'}{referenceDocumentLabel}:</span> <span className="font-black text-[#111827]">{referenceCode}</span></div>
                <div><span className="text-[#6B7280]">{locale === 'en' ? 'date' : locale === 'zh' ? '日期' : 'วันที่'}{referenceDocumentLabel}:</span> <span className="font-bold text-[#111827]">{referenceDate !== '-' ? referenceDate : CONTRACT_DOTTED_SHORT}</span></div>
                <div>
                  <span className="text-[#6B7280]">{locale === 'en' ? 'Processing time:' : locale === 'zh' ? '处理时间：' : 'ระยะเวลาดำเนินการ:'}</span>{' '}
                  <span className="font-bold text-[#111827] inline-flex items-center gap-2 flex-wrap">
                    <ContractEditableText
                      value={workStartDate}
                      displayValue={workStartDateDisplay}
                      fallback={CONTRACT_DOTTED_SHORT}
                      disabled={disabled}
                      onChange={onWorkStartDateChange}
                      type="date"
                      className="min-w-[150px]"
                    />
                    <span>{locale === 'en' ? 'to' : locale === 'zh' ? '到' : 'ถึง'}</span>
                    <ContractEditableText
                      value={workEndDate}
                      displayValue={workEndDateDisplay}
                      fallback={CONTRACT_DOTTED_SHORT}
                      disabled={disabled}
                      onChange={onWorkEndDateChange}
                      type="date"
                      className="min-w-[150px]"
                    />
                  </span>
                </div>
                <div><span className="text-[#6B7280]">{locale === 'en' ? 'Contract limit:' : locale === 'zh' ? '合约限额：' : 'วงเงินสัญญา:'}</span> <span className="font-black text-[#111827]">{grandTotal.toLocaleString('th-TH')} {locale === 'en' ? 'baht' : locale === 'zh' ? '铢' : ' บาท'}</span></div>
              </div>
            </div>

            <div className="space-y-3 text-[10.85px] leading-[1.68] text-justify">
              <div>
                <div className="font-black text-[#111827] mb-1">{contractView.clauseOneTitle}</div>
                <p>{contractView.clauseOneBody}</p>
              </div>
              <div>
                <div className="font-black text-[#111827] mb-1">{contractView.clauseTwoTitle}</div>
                <p>{contractView.clauseTwoBody}</p>
              </div>
            </div>

            <div className="mt-4 border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
              <div className="font-black text-[11px] text-[#111827] mb-1.5">{locale === 'en' ? 'Work list attached to the contract' : locale === 'zh' ? '工作清单附在合同上' : 'บัญชีรายการงานแนบท้ายสัญญา'}</div>
              <div className="text-[10.6px] leading-[1.6] text-[#4B5563]">{contractView.scopeSummaryText}</div>
            </div>
          </div>

          <div className="mt-auto pt-4 text-right text-[10px] font-bold text-[#9CA3AF]">{locale === 'en' ? 'Page 1 / 2' : locale === 'zh' ? '第 1 / 2 页' : 'หน้า 1 / 2'}</div>
        </div>
      </PlantLayoutA4PreviewFrame>

      <PlantLayoutA4PreviewFrame>
        <div className="h-full w-full border border-[#D8DBE8] bg-white px-9 py-8 flex flex-col text-[#111827]" style={{ fontFamily: 'var(--font-sarabun), Arial, Helvetica, sans-serif' }}>
          <div className="border-t-[3px] border-[#111827] pt-5">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.16em] mb-4">
              <span>{contractView.previewTitle}</span>
              <span>{contractPreviewDate}</span>
            </div>

            <div className="mb-4">
              <div className="font-black text-[11px] text-[#111827] mb-2">{locale === 'en' ? 'Payment terms' : locale === 'zh' ? '付款条件' : 'เงื่อนไขการชำระเงิน'}</div>
              <div className="space-y-2.5">
                {installments.length > 0 ? installments.map((installment, index) => (
                  <div key={installment.id} className="border border-[#E5E7EB] bg-[#FCFCFD] px-4 py-3 text-[10.8px]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-black text-[#111827]">{installment.label || `งวดที่ ${index + 1}`}</div>
                        <div className="text-[#4B5563] mt-1 leading-5">{installment.dueScope || (contractView.isAnnualContract ? 'ชำระตามรอบบริการที่ตกลง' : 'ชำระตามความคืบหน้างาน')}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-[#111827]">{installment.amount.toLocaleString('th-TH')} {locale === 'en' ? 'baht' : locale === 'zh' ? '铢' : ' บาท'}</div>
                        <div className="text-[#6B7280]">{installment.percent > 0 ? `${installment.percent}%` : 'ตามจำนวนเงิน'}</div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="border border-[#E5E7EB] bg-[#FCFCFD] px-4 py-3 text-[10.8px] leading-6 text-[#374151]">
                    {locale === 'en' ? 'Full payment' : locale === 'zh' ? '全额付款' : '                     ชำระเต็มจำนวน '}{grandTotal.toLocaleString('th-TH')} {locale === 'en' ? 'baht (' : locale === 'zh' ? '泰铢（' : ' บาท ('}{grandTotalText}{locale === 'en' ? ') through account' : locale === 'zh' ? ') 通过账户' : ') ผ่านบัญชี '}{bankText}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 text-[10.75px] leading-[1.66] text-justify">
              <div>
                <div className="font-black text-[#111827] mb-1">{contractView.clauseThreeTitle}</div>
                <p>{contractView.clauseThreeBody}</p>
              </div>
              <div>
                <div className="font-black text-[#111827] mb-1">{contractView.clauseFourTitle}</div>
                <p>{contractView.clauseFourBody}</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="font-black text-[11px] text-[#111827] mb-2">{locale === 'en' ? 'Contract conditions' : locale === 'zh' ? '合同条件' : 'เงื่อนไขประกอบสัญญา'}</div>
              <div className="space-y-2 text-[10.6px] leading-[1.7]">
                {contractView.previewConditions.map((condition, index) => (
                  <div key={`${condition}-${index}`} className="grid grid-cols-[18px_minmax(0,1fr)] items-start gap-x-2">
                    <span className="font-black text-[#111827] leading-[1.7]">{index + 1}.</span>
                    <span className="text-[#374151] break-words">{condition}</span>
                  </div>
                ))}
              </div>
            </div>

            {contractView.notesText && (
              <div className="mt-4 border border-[#E5E7EB] bg-[#FCFCFD] px-4 py-3">
                <div className="font-black text-[11px] text-[#111827] mb-1.5">{locale === 'en' ? 'Additional Notes' : locale === 'zh' ? '附加说明' : 'หมายเหตุเพิ่มเติม'}</div>
                <div className="text-[10.6px] leading-[1.6] text-[#374151] whitespace-pre-line">{contractView.notesText}</div>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-10 text-[11px] leading-6">
              <div className="text-center">
                <div>{contractView.signature.employerTitle}</div>
                <div className="mt-10">( {contractView.signature.employerName} )</div>
              </div>
              <div className="text-center">
                <div>{contractView.signature.contractorTitle}</div>
                <div className="mt-10">( {contractView.signature.contractorName} )</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10 text-[11px] leading-6">
              <div className="text-center">
                <div>{contractView.signature.employerWitnessTitle}</div>
                <div className="mt-10">( {contractView.signature.employerWitnessName} )</div>
              </div>
              <div className="text-center">
                <div>{contractView.signature.contractorWitnessTitle}</div>
                <div className="mt-10">( {contractView.signature.contractorWitnessName} )</div>
              </div>
            </div>

            {contractView.showAttachmentRegistry && (
            <div className="border-t border-[#D8DBE8] pt-4 text-[10.7px] leading-6">
              <div className="text-[16px] font-black mb-2.5">{locale === 'en' ? 'Account of documents at the end of the contract' : locale === 'zh' ? '合同结束时的文件说明' : 'บัญชีเอกสารท้ายสัญญา'}</div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <div>
                  {locale === 'en' ? 'Quotation number' : locale === 'zh' ? '报价单号' : '                   ใบเสนอราคาเลขที่ '}{referenceCode} {locale === 'en' ? 'quantity' : locale === 'zh' ? '数量' : ' จำนวน'}{' '}
                  <ContractEditableText
                    value={quotationAttachmentPages}
                    fallback="1"
                    disabled={disabled}
                    onChange={onQuotationAttachmentPagesChange}
                    type="number"
                    className="min-w-[52px] text-center"
                  />{' '}
                  {locale === 'en' ? 'sheet' : locale === 'zh' ? '床单' : '                   แผ่น                 '}</div>
                <div>
                  {locale === 'en' ? 'Invoice number' : locale === 'zh' ? '发票号码' : '                   ใบแจ้งหนี้เลขที่'}{' '}
                  <ContractEditableText
                    value={invoiceReferenceCode}
                    fallback={CONTRACT_DOTTED_MEDIUM}
                    disabled={disabled}
                    onChange={onInvoiceReferenceCodeChange}
                    placeholder={locale === 'en' ? 'Invoice number' : locale === 'zh' ? '发票号码' : 'เลขที่ใบแจ้งหนี้'}
                    className="min-w-[180px]"
                  />{' '}
                  {locale === 'en' ? 'quantity' : locale === 'zh' ? '数量' : '                   จำนวน'}{' '}
                  <ContractEditableText
                    value={invoiceAttachmentPages}
                    fallback={CONTRACT_DOTTED_SHORT}
                    disabled={disabled}
                    onChange={onInvoiceAttachmentPagesChange}
                    type="number"
                    className="min-w-[52px] text-center"
                  />{' '}
                  {locale === 'en' ? 'sheet' : locale === 'zh' ? '床单' : '                   แผ่น                 '}</div>
                <div>
                  {locale === 'en' ? 'Employer\'s signature' : locale === 'zh' ? '雇主签名' : '                   ผู้ลงนามฝ่ายผู้ว่าจ้าง'}{' '}
                  <ContractEditableText
                    value={employerSignerName}
                    displayValue={employerSignerDisplay}
                    fallback={CONTRACT_DOTTED_SHORT}
                    disabled={disabled}
                    onChange={onEmployerSignerNameChange}
                    placeholder={locale === 'en' ? 'Name of the employer\'s signatory' : locale === 'zh' ? '雇主签字人姓名' : 'ชื่อผู้ลงนามฝ่ายผู้ว่าจ้าง'}
                    className="min-w-[180px]"
                  />
                </div>
                <div>
                  {locale === 'en' ? 'Contractor\'s signatory' : locale === 'zh' ? '承包商签字人' : '                   ผู้ลงนามฝ่ายผู้รับจ้าง'}{' '}
                  <ContractEditableText
                    value={contractorSignerName}
                    fallback={CONTRACT_DOTTED_SHORT}
                    disabled={disabled}
                    onChange={onContractorSignerNameChange}
                    placeholder={locale === 'en' ? 'Name of the contractor\'s signatory' : locale === 'zh' ? '承包商签字人姓名' : 'ชื่อผู้ลงนามฝ่ายผู้รับจ้าง'}
                    className="min-w-[180px]"
                  />
                </div>
                <div>
                  {locale === 'en' ? 'Copy of employer\'s ID card' : locale === 'zh' ? '雇主身份证复印件' : '                   สำเนาบัตรประชาชนผู้ว่าจ้าง'}{' '}
                  <ContractEditableText
                    value={employerSignerName}
                    displayValue={employerSignerDisplay}
                    fallback={CONTRACT_DOTTED_SHORT}
                    disabled={disabled}
                    onChange={onEmployerSignerNameChange}
                    placeholder={locale === 'en' ? 'Employer\'s name' : locale === 'zh' ? '雇主名称' : 'ชื่อผู้ว่าจ้าง'}
                    className="min-w-[180px]"
                  />{' '}
                  {locale === 'en' ? 'quantity' : locale === 'zh' ? '数量' : '                   จำนวน'}{' '}
                  <ContractEditableText
                    value={employerAttachmentPages}
                    fallback={CONTRACT_DOTTED_SHORT}
                    disabled={disabled}
                    onChange={onEmployerAttachmentPagesChange}
                    type="number"
                    className="min-w-[52px] text-center"
                  />{' '}
                  {locale === 'en' ? 'sheet' : locale === 'zh' ? '床单' : '                   แผ่น                 '}</div>
                <div>
                  {locale === 'en' ? 'Copy of the contractor\'s ID card' : locale === 'zh' ? '承包商身份证复印件' : '                   สำเนาบัตรประชาชนผู้รับจ้าง'}{' '}
                  <ContractEditableText
                    value={contractorSignerName}
                    fallback={CONTRACT_DOTTED_SHORT}
                    disabled={disabled}
                    onChange={onContractorSignerNameChange}
                    placeholder={locale === 'en' ? 'Contractor\'s name' : locale === 'zh' ? '承包商名称' : 'ชื่อผู้รับจ้าง'}
                    className="min-w-[180px]"
                  />{' '}
                  {locale === 'en' ? 'quantity' : locale === 'zh' ? '数量' : '                   จำนวน'}{' '}
                  <ContractEditableText
                    value={contractorAttachmentPages}
                    fallback={CONTRACT_DOTTED_SHORT}
                    disabled={disabled}
                    onChange={onContractorAttachmentPagesChange}
                    type="number"
                    className="min-w-[52px] text-center"
                  />{' '}
                  {locale === 'en' ? 'sheet' : locale === 'zh' ? '床单' : '                   แผ่น                 '}</div>
              </div>
            </div>
            )}
          </div>

          <div className="mt-auto pt-4 text-right text-[10px] font-bold text-[#9CA3AF]">{locale === 'en' ? 'Page 2 / 2' : locale === 'zh' ? '第 2 / 2 页' : 'หน้า 2 / 2'}</div>
        </div>
      </PlantLayoutA4PreviewFrame>
      </div>
    </div>
  )
}

const PLANT_MATERIAL_ZONE_ID = 'pm-zone'
const PLANT_MATERIAL_CAT_TREE_ID = 'pm-cat-tree'
const PLANT_MATERIAL_CAT_SHRUB_ID = 'pm-cat-shrub'
const PLANT_MATERIAL_CAT_MATERIAL_ID = 'pm-cat-material'

const normalizeItemCategory = (value?: string | null, sizeMode?: 'shrub' | 'tree' | 'other', categoryName?: string | null): PlantItemCategory => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'tree' || normalized === 'palm' || normalized === 'shrub' || normalized === 'material' || normalized === 'other') {
    return normalized
  }

  const normalizedCategoryName = String(categoryName || '').trim().toLowerCase()
  if (normalizedCategoryName) {
    if (normalizedCategoryName.includes('ต้นไม้ใหญ่') || normalizedCategoryName.includes('tree')) return 'tree'
    if (normalizedCategoryName.includes('ปาล์ม') || normalizedCategoryName.includes('palm')) return 'palm'
    if (normalizedCategoryName.includes('ไม้พุ่ม') || normalizedCategoryName.includes('shrub')) return 'shrub'
    if (normalizedCategoryName.includes('วัสดุ') || normalizedCategoryName.includes('material')) return 'material'
  }

  if (sizeMode === 'tree') return 'tree'
  if (sizeMode === 'shrub') return 'shrub'
  return 'other'
}

const deriveItemCategoryFromSizeMode = (
  sizeMode: 'shrub' | 'tree' | 'other',
  currentCategory?: PlantItemCategory
): PlantItemCategory => {
  if (currentCategory === 'palm' || currentCategory === 'material') return currentCategory
  if (sizeMode === 'tree') return 'tree'
  if (sizeMode === 'shrub') return 'shrub'
  return currentCategory || 'other'
}

const resolveRowItemCategory = (item: ItemRow, categoryName?: string) =>
  normalizeItemCategory(item.item_category, item.size_mode, categoryName)

const buildCatalogIdentityKey = (entry: Partial<DocumentItemCatalogEntry>) => [
  normalizeCatalogQuery(entry.item_name),
  normalizeCatalogQuery(entry.english_name),
  normalizeCatalogQuery(entry.scientific_name),
  normalizeCatalogQuery(entry.size_label),
  normalizeCatalogQuery(entry.unit),
  String(entry.item_category || '').trim().toLowerCase(),
  String(entry.size_mode || '').trim().toLowerCase(),
].join('|')

const resetItemForSizeMode = (item: ItemRow, sizeMode: 'shrub' | 'tree' | 'other'): ItemRow => {
  const next = { ...item, size_mode: sizeMode }
  if (sizeMode !== 'shrub') {
    next.shrub_size_style = 'height_spacing'
    next.shrub_container_type = 'pot'
    next.height_m = 0
    next.pot_diameter_inch = 0
    next.spacing_x = 0
    next.spacing_y = 0
  }
  if (sizeMode !== 'tree') {
    next.trunk_diameter_inch = 0
    next.tree_height_label = ''
  }
  if (sizeMode !== 'other') {
    next.size = ''
  }
  next.size = buildSizeLabelByMode(next)
  return next
}

const applyCategoryDefaultsToItem = (
  item: ItemRow,
  mainCategory: DocumentCatalogMainCategory,
  subcategory: DocumentCatalogSubcategory,
  force: boolean = true
): ItemRow => {
  const defaults = getDocumentCategoryDefaults(mainCategory, subcategory, item.description, item.item_category, item.size_mode)
  
  const unitToApply = (force || !item.unit || item.unit === 'หน่วย') ? defaults.defaultUnit : item.unit;
  const itemCategoryToApply = (force || !item.item_category) ? (defaults.itemCategory as PlantItemCategory) : item.item_category;
  const sizeModeToApply = (force || !item.size_mode) ? defaults.sizeMode : item.size_mode;

  const next = resetItemForSizeMode(
    {
      ...item,
      item_category: itemCategoryToApply,
      plant_document_mode: force ? 'auto' : (item.plant_document_mode || 'auto'),
      unit: unitToApply,
    },
    sizeModeToApply
  )

  return next
}

const applySizeLabelForMode = (item: ItemRow, sizeLabel: string | null | undefined, sizeMode: ItemRow['size_mode']): ItemRow => {
  const normalizedSizeLabel = String(sizeLabel || '').trim()
  const next = resetItemForSizeMode(
    {
      ...item,
      size: normalizedSizeLabel,
    },
    sizeMode
  )

  if (sizeMode === 'shrub') {
    const shrubParsed = parseShrubSizeFromLabel(normalizedSizeLabel)
    next.shrub_size_style = shrubParsed.shrub_size_style
    next.shrub_container_type = shrubParsed.shrub_container_type
    if (shrubParsed.height_m > 0) next.height_m = shrubParsed.height_m
    if (shrubParsed.pot_diameter_inch > 0) next.pot_diameter_inch = shrubParsed.pot_diameter_inch
    if (shrubParsed.spacing_m > 0) {
      next.spacing_x = shrubParsed.spacing_m
      next.spacing_y = shrubParsed.spacing_m
      next.size = buildSizeLabelByMode(next)
      if (next.area_sqm > 0) {
        const density = 1 / (shrubParsed.spacing_m * shrubParsed.spacing_m)
        if (Number.isFinite(density) && density > 0) {
          next.quantity = Math.max(1, Math.ceil(next.area_sqm * density))
        }
      }
    } else {
      if (shrubParsed.shrub_size_style === 'pot_inch') {
        next.shrub_container_type = shrubParsed.shrub_container_type
      }
      next.size = buildSizeLabelByMode(next)
    }
    return next
  }

  if (sizeMode === 'tree') {
    const treeParsed = parseTreeSizeFromLabel(normalizedSizeLabel)
    if (treeParsed.trunk_diameter_inch > 0) next.trunk_diameter_inch = treeParsed.trunk_diameter_inch
    if (treeParsed.tree_height_label) next.tree_height_label = treeParsed.tree_height_label
    next.size = buildSizeLabelByMode(next)
    return next
  }

  next.size = normalizedSizeLabel
  return next
}

const buildPlantMaterialGroupedZones = (sourceZones: ZoneRow[]): ZoneRow[] => {
  const allItems = sourceZones.flatMap((zone) =>
    zone.categories.flatMap((category) =>
      (category.items || []).map((item) => ({
        ...item,
        item_category: resolveRowItemCategory(item, category.name),
        plant_document_mode: normalizePlantDocumentMode(item.plant_document_mode),
        detail: item.detail,
        spec: item.spec,
        category_name: category.name,
        zone_name: zone.name,
      }))
    )
  )

  const eligibleItems = allItems.filter((item) => isPlantDocumentEligible(item))
  const treeItems = eligibleItems.filter((item) => getPlantDocumentCategory(item) === 'tree')
  const shrubItems = eligibleItems.filter((item) => getPlantDocumentCategory(item) === 'shrub')
  const materialItems = eligibleItems.filter((item) => getPlantDocumentCategory(item) === 'material')

  const categories: CategoryRow[] = [
    {
      id: PLANT_MATERIAL_CAT_TREE_ID,
      name: getPlantDocumentCategoryLabel('tree'),
      main_category: 'softscape' as DocumentCatalogMainCategory,
      subcategory: 'tree' as DocumentCatalogSubcategory,
      items: treeItems as ItemRow[],
    },
    {
      id: PLANT_MATERIAL_CAT_SHRUB_ID,
      name: getPlantDocumentCategoryLabel('shrub'),
      main_category: 'softscape' as DocumentCatalogMainCategory,
      subcategory: 'shrub' as DocumentCatalogSubcategory,
      items: shrubItems as ItemRow[],
    },
    {
      id: PLANT_MATERIAL_CAT_MATERIAL_ID,
      name: getPlantDocumentCategoryLabel('material'),
      main_category: 'hardscape' as DocumentCatalogMainCategory,
      subcategory: 'stone' as DocumentCatalogSubcategory,
      items: materialItems as ItemRow[],
    },
  ].filter((category) => category.items.length > 0)

  return [
    {
      id: PLANT_MATERIAL_ZONE_ID,
      name: 'PLANT MATERIAL',
      categories,
    },
  ]
}

const isPlantMaterialGrouped = (sourceZones: ZoneRow[]) => {
  const grouped = buildPlantMaterialGroupedZones(sourceZones)
  const currentCompact = JSON.stringify(
    sourceZones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      categories: zone.categories.map((category) => ({
        id: category.id,
        name: category.name,
        itemIds: category.items.map((item) => item.id),
      })),
    }))
  )
  const groupedCompact = JSON.stringify(
    grouped.map((zone) => ({
      id: zone.id,
      name: zone.name,
      categories: zone.categories.map((category) => ({
        id: category.id,
        name: category.name,
        itemIds: category.items.map((item) => item.id),
      })),
    }))
  )
  return currentCompact === groupedCompact
}

type InstallmentRow = {
  id: string
  label: string
  due_at: string
  due_scope: string
  amount: number
  percent: number
}

type ConditionRow = {
  id: string
  text: string
  selected: boolean
}

type OrderRow = any
type QuotationReferenceRow = {
  id: string
  document_code?: string
  user_id?: string
  order_id?: string
  created_at?: string
}
const PROJECT_NAME_STORAGE_KEY = 'xylem.manualDocument.projectNames'
const ITEM_DETAIL_STORAGE_KEY = 'xylem.manualDocument.itemDetails'

const canEditAfterSaveByType = (type: ManualType) => type === 'quotation' || type === 'plant_material' || type === 'contract'

const mergeUniqueSuggestions = (base: string[], additions: string[], limit: number = 200) => {
  const normalizedSeen = new Set<string>()
  const merged: string[] = []

  const pushValue = (value: string) => {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim()
    if (!normalized) return

    const key = normalized.toLowerCase()
    if (normalizedSeen.has(key)) return

    normalizedSeen.add(key)
    merged.push(normalized)
  }

  additions.forEach(pushValue)
  base.forEach(pushValue)

  return merged.slice(0, limit)
}

const normalizeCatalogQuery = (value?: string | null) =>
  String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const SUPABASE_PUBLIC_URL = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')

const resolvePlantImageUrl = (value?: string | null) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) return raw

  const cleaned = raw
    .replace(/^\/+/, '')
    .replace(/^marketplace-images\//, '')
    .replace(/^plants\//, 'plants/')

  if (!SUPABASE_PUBLIC_URL) return raw
  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/marketplace-images/${cleaned}`
}

type CatalogSuggestion = DocumentItemCatalogEntry & {
  _score: number
}

const scoreCatalogEntry = (entry: DocumentItemCatalogEntry, normalizedQuery: string) => {
  if (!normalizedQuery) return 0

  const name = normalizeCatalogQuery(entry.item_name)
  const english = normalizeCatalogQuery(entry.english_name)
  const scientific = normalizeCatalogQuery(entry.scientific_name)

  if (!name && !english && !scientific) return 0

  if (name === normalizedQuery) return 120
  if (english === normalizedQuery) return 115
  if (scientific === normalizedQuery) return 110

  if (name.startsWith(normalizedQuery)) return 95
  if (english.startsWith(normalizedQuery)) return 90
  if (scientific.startsWith(normalizedQuery)) return 85

  if (name.includes(normalizedQuery)) return 70
  if (english.includes(normalizedQuery)) return 65
  if (scientific.includes(normalizedQuery)) return 60

  return 0
}

const getCatalogSuggestions = (catalog: DocumentItemCatalogEntry[], query: string, limit: number = 6): CatalogSuggestion[] => {
  const normalizedQuery = normalizeCatalogQuery(query)
  if (!normalizedQuery) return []

  return catalog
    .map((entry) => ({ ...entry, _score: scoreCatalogEntry(entry, normalizedQuery) }))
    .filter((entry) => entry._score > 0)
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score
      return (Number(b.usage_count) || 0) - (Number(a.usage_count) || 0)
    })
    .slice(0, limit)
}

const buildManualIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `manual-${crypto.randomUUID()}`
  }
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const getCategoryDisplayName = (mainCategory: DocumentCatalogMainCategory, subcategory: DocumentCatalogSubcategory) => {
  return buildDocumentCategoryLabel(mainCategory, subcategory)
}

const newItem = (
  mainCategory: DocumentCatalogMainCategory = 'softscape',
  subcategory: DocumentCatalogSubcategory = 'shrub'
): ItemRow => {
  const defaults = getDocumentCategoryDefaults(mainCategory, subcategory)
  return {
    id: Math.random().toString(36).slice(2, 10),
    description: '',
    english_name: '',
    detail: '',
    spec: '',
    item_category: defaults.itemCategory as PlantItemCategory,
    plant_document_mode: 'auto',
    size_mode: defaults.sizeMode,
    shrub_size_style: 'height_spacing',
    shrub_container_type: 'pot',
    height_m: 0,
    pot_diameter_inch: 0,
    trunk_diameter_inch: 0,
    tree_height_label: '',
    size: '',
    spacing_x: 0,
    spacing_y: 0,
    area_sqm: 0,
    unit: defaults.defaultUnit,
    quantity: 1,
    unit_price_material: 0,
    unit_price_labor: 0,
  }
}

const newCategory = (
  index: number,
  mainCategory: DocumentCatalogMainCategory = 'softscape',
  subcategory: DocumentCatalogSubcategory = 'shrub'
): CategoryRow => {
  const defaults = getDocumentCategoryDefaults(mainCategory, subcategory)
  return {
    id: Math.random().toString(36).slice(2, 10),
    name: getCategoryDisplayName(defaults.mainCategory, defaults.subcategory),
    main_category: defaults.mainCategory,
    subcategory: defaults.subcategory,
    labor_percentage: 0,
    items: [newItem(defaults.mainCategory, defaults.subcategory)],
  }
}

const newZone = (index: number): ZoneRow => ({
  id: Math.random().toString(36).slice(2, 10),
  name: `ZONE ${String.fromCharCode(64 + index)}: พื้นที่ใหม่`,
  categories: [newCategory(1)],
})

const newInstallment = (index: number): InstallmentRow => ({
  id: Math.random().toString(36).slice(2, 10),
  label: `งวดที่ ${index}`,
  due_at: '',
  due_scope: '',
  amount: 0,
  percent: 0,
})

const INSTALLMENT_SCOPE_SUGGESTIONS = [
  'ชำระก่อนเริ่มงาน',
  'ชำระเมื่อเข้าหน้างาน',
  'ชำระหลังส่งวัสดุเข้าหน้างาน',
  'ชำระเมื่อดำเนินงานได้ 50%',
  'ชำระเมื่อดำเนินงานได้ 80%',
  'ชำระหลังจบงานงวดนี้',
  'ชำระหลังส่งมอบงาน',
  'ชำระหลังตรวจรับงานงวดสุดท้าย',
]

const DEFAULT_CONDITIONS: string[] = [
  'ยืนยันราคาภายใน 30 วันนับจากวันที่ในใบเสนอราคา',
  'การรับประกันงานจะเริ่มนับจากวันที่ส่งมอบงานเสร็จสิ้น',
  'ขอสงวนสิทธิ์ในการเข้าดำเนินการเมื่อพื้นที่หน้างานพร้อมปฏิบัติงาน',
  'ราคานี้ไม่รวมการรื้อถอนหรืองานระบบอื่นนอกเหนือจากที่ระบุในแบบ',
  'การเปลี่ยนแปลงงานหรือขอเพิ่มงาน จะมีการตกลงค่าใช้จ่ายเพิ่มเติมก่อนดำเนินการ'
]

const newCondition = (text: string = '', selected: boolean = false): ConditionRow => ({
  id: Math.random().toString(36).slice(2, 10),
  text,
  selected
})

const parseShrubSizeFromLabel = (label?: string): {
  shrub_size_style: 'height_spacing' | 'pot_inch'
  shrub_container_type: 'pot' | 'bag'
  height_m: number
  spacing_m: number
  pot_diameter_inch: number
} => {
  const raw = String(label || '').trim()
  if (!raw) {
    return {
      shrub_size_style: 'height_spacing',
      shrub_container_type: 'pot',
      height_m: 0,
      spacing_m: 0,
      pot_diameter_inch: 0,
    }
  }

  const normalized = raw.replace(/,/g, '.')
  const potMatch = normalized.match(/(?:กระถาง|ถุง)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:นิ้ว|inch|inches|\")/i)
  const heightMatch = normalized.match(/H\.?\s*([0-9]+(?:\.[0-9]+)?)/i)
  const spacingMatch = normalized.match(/@\s*([0-9]+(?:\.[0-9]+)?)/i)

  if (potMatch) {
    const shrubContainerType = normalized.includes('ถุง') ? 'bag' : 'pot'
    return {
      shrub_size_style: 'pot_inch',
      shrub_container_type: shrubContainerType,
      height_m: 0,
      spacing_m: 0,
      pot_diameter_inch: Number(potMatch[1]) || 0,
    }
  }

  return {
    shrub_size_style: 'height_spacing',
    shrub_container_type: 'pot',
    height_m: heightMatch ? Number(heightMatch[1]) || 0 : 0,
    spacing_m: spacingMatch ? Number(spacingMatch[1]) || 0 : 0,
    pot_diameter_inch: 0,
  }
}

const parseTreeSizeFromLabel = (label?: string): { trunk_diameter_inch: number; tree_height_label: string } => {
  const raw = String(label || '').trim()
  if (!raw) return { trunk_diameter_inch: 0, tree_height_label: '' }

  const normalized = raw.replace(/,/g, '.')
  const diameterMatch = normalized.match(/Ø\s*([0-9]+(?:\.[0-9]+)?)\s*"?/i)
  const heightMatch = normalized.match(/H\s*([0-9]+(?:\.[0-9]+)?(?:\s*-\s*[0-9]+(?:\.[0-9]+)?)?)/i)

  return {
    trunk_diameter_inch: diameterMatch ? Number(diameterMatch[1]) || 0 : 0,
    tree_height_label: heightMatch ? String(heightMatch[1]).replace(/\s+/g, '') : '',
  }
}

const formatNumericLabel = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return ''
  return Number(value.toFixed(2)).toString()
}

const formatShrubSizeLabel = (item: { shrub_size_style?: 'height_spacing' | 'pot_inch'; shrub_container_type?: 'pot' | 'bag'; height_m?: number; pot_diameter_inch?: number; spacing_x?: number; size?: string }) => {
  const shrubSizeStyle = item.shrub_size_style === 'pot_inch' ? 'pot_inch' : 'height_spacing'
  const shrubContainerType = item.shrub_container_type === 'bag' ? 'bag' : 'pot'
  const potDiameter = Number(item.pot_diameter_inch) || 0
  const height = Number(item.height_m) || 0
  const spacing = Number(item.spacing_x) || 0

  if (shrubSizeStyle === 'pot_inch') {
    if (potDiameter > 0) return `${shrubContainerType === 'bag' ? 'ถุง' : 'กระถาง'} ${formatNumericLabel(potDiameter)} นิ้ว`
    return String(item.size || '').trim()
  }

  if (height > 0 && spacing > 0) return `H.${formatNumericLabel(height)} m. @ ${formatNumericLabel(spacing)} m.`
  if (height > 0) return `H.${formatNumericLabel(height)} m.`
  if (spacing > 0) return `@ ${formatNumericLabel(spacing)} m.`

  return String(item.size || '').trim()
}

const formatTreeSizeLabel = (item: { trunk_diameter_inch?: number; tree_height_label?: string; size?: string }) => {
  const diameter = Number(item.trunk_diameter_inch) || 0
  const heightLabel = String(item.tree_height_label || '').trim()

  if (diameter > 0 && heightLabel) return `Ø ${formatNumericLabel(diameter)}" H ${heightLabel} m.`
  if (diameter > 0) return `Ø ${formatNumericLabel(diameter)}"`
  if (heightLabel) return `H ${heightLabel} m.`

  return String(item.size || '').trim()
}

const buildSizeLabelByMode = (item: ItemRow) => {
  if (item.size_mode === 'shrub') return formatShrubSizeLabel(item)
  if (item.size_mode === 'tree') return formatTreeSizeLabel(item)
  return String(item.size || '').trim()
}

const parseManualPayload = (raw: any) => {
  if (!raw || typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed?.kind === 'manual_document' ? parsed : null
  } catch {
    return null
  }
}

const normalizeManualItem = (rawItem: any, fallbackId: string): ItemRow => {
  const shrubParsed = parseShrubSizeFromLabel(rawItem?.size)
  const treeParsed = parseTreeSizeFromLabel(rawItem?.size)
  const inferredSizeMode: 'shrub' | 'tree' | 'other' =
    rawItem?.size_mode === 'shrub' || rawItem?.size_mode === 'tree' || rawItem?.size_mode === 'other'
      ? rawItem.size_mode
      : shrubParsed.spacing_m > 0 || shrubParsed.height_m > 0 || shrubParsed.pot_diameter_inch > 0
        ? 'shrub'
        : (treeParsed.trunk_diameter_inch > 0 || treeParsed.tree_height_label)
          ? 'tree'
          : 'other'

  return {
    id: rawItem?.id || fallbackId,
    description: rawItem?.description || '',
    english_name: rawItem?.english_name || rawItem?.englishName || '',
    image_url: resolvePlantImageUrl(rawItem?.image_url || rawItem?.imageUrl || ''),
    detail: rawItem?.detail || rawItem?.details || '',
    spec: rawItem?.spec || '',
    item_category: normalizeItemCategory(rawItem?.item_category, inferredSizeMode, rawItem?.category_name),
    plant_document_mode: 'auto',
    size_mode: inferredSizeMode,
    shrub_size_style: rawItem?.shrub_size_style === 'pot_inch' || shrubParsed.shrub_size_style === 'pot_inch' ? 'pot_inch' : 'height_spacing',
    shrub_container_type: rawItem?.shrub_container_type === 'bag' || shrubParsed.shrub_container_type === 'bag' ? 'bag' : 'pot',
    height_m: Number(rawItem?.height_m) || shrubParsed.height_m,
    pot_diameter_inch: Number(rawItem?.pot_diameter_inch) || shrubParsed.pot_diameter_inch,
    trunk_diameter_inch: Number(rawItem?.trunk_diameter_inch) || treeParsed.trunk_diameter_inch,
    tree_height_label: String(rawItem?.tree_height_label || treeParsed.tree_height_label || ''),
    size: rawItem?.size || '',
    spacing_x: Number(rawItem?.spacing_x) || shrubParsed.spacing_m || 0,
    spacing_y: Number(rawItem?.spacing_y) || Number(rawItem?.spacing_x) || shrubParsed.spacing_m || 0,
    area_sqm: Number(rawItem?.area_sqm) || 0,
    unit: rawItem?.unit || 'หน่วย',
    quantity: Number(rawItem?.quantity) || 1,
    unit_price_material: Number(rawItem?.unit_price_material ?? rawItem?.unit_price) || 0,
    unit_price_labor: Number(rawItem?.unit_price_labor) || 0,
  }
}

const normalizeCategoryRow = (rawCategory: any, fallbackIndex: number): CategoryRow => {
  const items = (Array.isArray(rawCategory?.items) ? rawCategory.items : []).map((item: any, iIdx: number) =>
    normalizeManualItem(item, `i-${fallbackIndex}-${iIdx}-${Math.random().toString(36).slice(2, 8)}`)
  )
  const sampleItem = items[0]
  const defaults = getDocumentCategoryDefaults(
    rawCategory?.main_category,
    rawCategory?.subcategory,
    rawCategory?.name,
    sampleItem?.item_category,
    sampleItem?.size_mode
  )

  return {
    id: rawCategory?.id || `c-${fallbackIndex}-${Math.random().toString(36).slice(2, 8)}`,
    name: getCategoryDisplayName(defaults.mainCategory, defaults.subcategory),
    main_category: defaults.mainCategory,
    subcategory: defaults.subcategory,
    labor_percentage: Number(rawCategory?.labor_percentage) || 0,
    items: items.length
      ? items.map((item: ItemRow) => applyCategoryDefaultsToItem(item, defaults.mainCategory, defaults.subcategory, false))
      : [newItem(defaults.mainCategory, defaults.subcategory)],
  }
}

const extractSourceZones = (parsed: any, sourceDoc: any): ZoneRow[] => {
  if (Array.isArray(parsed?.zones) && parsed.zones.length > 0) {
    return parsed.zones.map((zone: any, zIdx: number) => ({
      id: zone?.id || `src-zone-${zIdx}-${Math.random().toString(36).slice(2, 8)}`,
      name: String(zone?.name || `Zone ${zIdx + 1}`),
      categories: (Array.isArray(zone?.categories) ? zone.categories : []).map((category: any, cIdx: number) =>
        normalizeCategoryRow(category, zIdx * 100 + cIdx)
      ),
    }))
  }

  if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
    return [{
      id: 'src-legacy-zone',
      name: 'General',
      categories: [{
        ...newCategory(1, 'other', 'general'),
        id: 'src-legacy-category',
        items: parsed.items.map((item: any, idx: number) =>
          normalizeManualItem(item, `src-legacy-${idx}-${Math.random().toString(36).slice(2, 8)}`)
        ),
      }],
    }]
  }

  if (sourceDoc?.orders) {
    return mapOrderToZones(sourceDoc.orders)
  }

  return []
}

const buildPlantMaterialZonesFromSource = (parsed: any, sourceDoc: any): ZoneRow[] =>
  buildPlantMaterialGroupedZones(extractSourceZones(parsed, sourceDoc))

type PlantLayoutPreviewLine = {
  size: string
  qty: number
  unit: string
}

type PlantLayoutPreviewCard = {
  key: string
  category: 'tree' | 'shrub' | 'material'
  categoryLabel: string
  description: string
  englishName: string
  scientificName: string
  imageUrl: string
  detail: string
  qty: number
  unit: string
  lines: PlantLayoutPreviewLine[]
}

type PlantLayoutPresetKey = 'balanced' | 'compact' | 'showcase'
type PlantLayoutDragHandleKey = 'cardHeight' | 'imageHeight' | 'contentOffsetY'
type PlantLayoutEditSurfaceKey = 'image' | 'content' | 'frame'

const PLANT_LAYOUT_LIMITS: Record<keyof PlantLayoutSettings['global'], { min: number; max: number }> = {
  pagePadding: { min: 8, max: 32 },
  cardGap: { min: 4, max: 24 },
  sectionGap: { min: 4, max: 24 },
  cardHeight: { min: 120, max: 320 },
  imageHeight: { min: 48, max: 180 },
  cardPadding: { min: 4, max: 24 },
  contentOffsetY: { min: -24, max: 36 },
  titleFontSize: { min: 8, max: 18 },
  subtitleFontSize: { min: 6, max: 14 },
  metaFontSize: { min: 6, max: 14 },
}

const PLANT_LAYOUT_PRESETS: Record<PlantLayoutPresetKey, Partial<PlantLayoutSettings['global']>> = {
  balanced: {
    pagePadding: 16,
    cardGap: 10,
    sectionGap: 10,
    cardHeight: 188,
    imageHeight: 96,
    cardPadding: 9,
    contentOffsetY: 0,
    titleFontSize: 10,
    subtitleFontSize: 7.5,
    metaFontSize: 8,
  },
  compact: {
    pagePadding: 14,
    cardGap: 8,
    sectionGap: 8,
    cardHeight: 170,
    imageHeight: 84,
    cardPadding: 8,
    contentOffsetY: -1,
    titleFontSize: 9,
    subtitleFontSize: 7,
    metaFontSize: 7.5,
  },
  showcase: {
    pagePadding: 18,
    cardGap: 12,
    sectionGap: 12,
    cardHeight: 208,
    imageHeight: 112,
    cardPadding: 10,
    contentOffsetY: 1,
    titleFontSize: 10.5,
    subtitleFontSize: 8,
    metaFontSize: 8.5,
  },
}

const clampPlantLayoutValue = (key: keyof PlantLayoutSettings['global'], value: number) => {
  const range = PLANT_LAYOUT_LIMITS[key]
  const numericValue = Number.isFinite(value) ? value : range.min
  return Math.min(range.max, Math.max(range.min, numericValue))
}

const getPlantLayoutSurfaceHandleKey = (surface: PlantLayoutEditSurfaceKey): PlantLayoutDragHandleKey => {
  if (surface === 'image') return 'imageHeight'
  if (surface === 'content') return 'contentOffsetY'
  return 'cardHeight'
}

const buildPlantLayoutPresetSettings = (presetKey: PlantLayoutPresetKey, previous: PlantLayoutSettings | null | undefined) => {
  const normalizedPrevious = previous ? normalizePlantLayoutSettings(previous) : DEFAULT_PLANT_LAYOUT_SETTINGS
  return normalizePlantLayoutSettings({
    ...normalizedPrevious,
    global: {
      ...normalizedPrevious.global,
      ...PLANT_LAYOUT_PRESETS[presetKey],
    },
  })
}

const buildAutoPlantLayoutSettings = (cards: PlantLayoutPreviewCard[]) => {
  const base = buildPlantLayoutPresetSettings('balanced', DEFAULT_PLANT_LAYOUT_SETTINGS)
  const nextCards = Object.fromEntries(cards.map((card) => {
    const titleLength = String(card.description || '').trim().length
    const subtitleLength = Math.max(
      String(card.englishName || '').trim().length,
      String(card.scientificName || '').trim().length,
      String(card.detail || '').trim().length,
    )
    const extraLineCount = Math.max(0, card.lines.length - 1)
    const hasImage = !!String(card.imageUrl || '').trim()

    let cardHeight = base.global.cardHeight
    let imageHeight = base.global.imageHeight
    let contentOffsetY = base.global.contentOffsetY
    let titleFontSize = base.global.titleFontSize
    let subtitleFontSize = base.global.subtitleFontSize
    let metaFontSize = base.global.metaFontSize
    const cardPadding = base.global.cardPadding

    if (titleLength > 28) {
      cardHeight += 12
      titleFontSize -= 0.5
    }
    if (titleLength > 40) {
      cardHeight += 10
      titleFontSize -= 0.5
      contentOffsetY += 2
    }
    if (subtitleLength > 30) {
      cardHeight += 8
      subtitleFontSize -= 0.5
    }
    if (extraLineCount > 0) {
      cardHeight += Math.min(24, extraLineCount * 6)
      metaFontSize -= Math.min(1, extraLineCount * 0.25)
    }
    if (!hasImage) {
      imageHeight -= 10
      contentOffsetY += 4
    }
    if (card.category === 'material') {
      imageHeight -= 4
      cardHeight -= 4
    }
    if (card.category === 'tree') {
      imageHeight += 6
      cardHeight += 4
    }

    return [card.key, {
      cardHeight: clampPlantLayoutValue('cardHeight', cardHeight),
      imageHeight: clampPlantLayoutValue('imageHeight', imageHeight),
      cardPadding: clampPlantLayoutValue('cardPadding', cardPadding),
      contentOffsetY: clampPlantLayoutValue('contentOffsetY', contentOffsetY),
      titleFontSize: clampPlantLayoutValue('titleFontSize', titleFontSize),
      subtitleFontSize: clampPlantLayoutValue('subtitleFontSize', subtitleFontSize),
      metaFontSize: clampPlantLayoutValue('metaFontSize', metaFontSize),
    }]
  }))

  return normalizePlantLayoutSettings({
    ...base,
    cards: nextCards,
  })
}

const buildPlantLayoutPreviewCards = (sourceZones: ZoneRow[]): PlantLayoutPreviewCard[] => {
  const eligibleItems = sourceZones.flatMap((zone) =>
    zone.categories.flatMap((category) =>
      (category.items || [])
        .map((item) => {
          const seed = {
            item_name: item.description,
            english_name: item.english_name,
            scientific_name: item.spec,
            item_category: resolveRowItemCategory(item, category.name),
            plant_document_mode: normalizePlantDocumentMode(item.plant_document_mode),
            size_mode: item.size_mode,
            category_name: category.name,
            zone_name: zone.name,
            image_url: item.image_url,
          }
          const categoryKey = getPlantDocumentCategory(seed)
          if (!categoryKey || !isPlantDocumentEligible(seed)) {
            return null
          }

          return {
            key: buildPlantDocumentCardKey(seed),
            category: categoryKey,
            categoryLabel: getPlantDocumentCategoryLabel(categoryKey),
            description: String(item.description || '').trim() || '-',
            englishName: String(item.english_name || '').trim(),
            scientificName: String(item.spec || '').trim(),
            imageUrl: resolvePlantImageUrl(item.image_url || ''),
            detail: String(item.detail || '').trim(),
            size: buildSizeLabelByMode(item) || '-',
            qty: Number(item.quantity) || 0,
            unit: String(item.unit || 'หน่วย').trim() || 'หน่วย',
          }
        })
        .filter((item): item is NonNullable<typeof item> => !!item)
    )
  )

  const grouped = new Map<string, PlantLayoutPreviewCard & { lineMap: Map<string, PlantLayoutPreviewLine> }>()

  eligibleItems.forEach((item) => {
    if (!grouped.has(item.key)) {
      grouped.set(item.key, {
        key: item.key,
        category: item.category,
        categoryLabel: item.categoryLabel,
        description: item.description,
        englishName: item.englishName,
        scientificName: item.scientificName,
        imageUrl: item.imageUrl,
        detail: item.detail,
        qty: 0,
        unit: '',
        lines: [],
        lineMap: new Map<string, PlantLayoutPreviewLine>(),
      })
    }

    const group = grouped.get(item.key)
    if (!group) return

    const lineKey = [String(item.size || '-').trim().toLowerCase(), String(item.unit || 'หน่วย').trim().toLowerCase()].join('|')
    const existingLine = group.lineMap.get(lineKey)
    if (existingLine) {
      existingLine.qty += Number(item.qty) || 0
    } else {
      group.lineMap.set(lineKey, {
        size: item.size || '-',
        qty: Number(item.qty) || 0,
        unit: item.unit || 'หน่วย',
      })
    }
  })

  return Array.from(grouped.values()).map((group) => {
    const lines = Array.from(group.lineMap.values())
    return {
      key: group.key,
      category: group.category,
      categoryLabel: group.categoryLabel,
      description: group.description,
      englishName: group.englishName,
      scientificName: group.scientificName,
      imageUrl: group.imageUrl,
      detail: group.detail,
      qty: lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0),
      unit: lines.length === 1 ? lines[0].unit : '',
      lines,
    }
  })
}

const normalizePlantLayoutOrder = (cards: Array<{ key: string }>, preferredOrder: string[] | null | undefined) => {
  const availableKeys = new Set(cards.map((card) => card.key))
  const seen = new Set<string>()
  const normalized: string[] = []

  ;(preferredOrder || []).forEach((key) => {
    const normalizedKey = String(key || '').trim()
    if (!normalizedKey || !availableKeys.has(normalizedKey) || seen.has(normalizedKey)) return
    seen.add(normalizedKey)
    normalized.push(normalizedKey)
  })

  cards.forEach((card) => {
    if (seen.has(card.key)) return
    seen.add(card.key)
    normalized.push(card.key)
  })

  return normalized
}

const sortPlantLayoutPreviewCards = (cards: PlantLayoutPreviewCard[], preferredOrder: string[] | null | undefined) => {
  const normalizedOrder = normalizePlantLayoutOrder(cards, preferredOrder)
  const orderIndex = new Map(normalizedOrder.map((key, index) => [key, index]))

  return [...cards].sort((left, right) => {
    const leftIndex = orderIndex.get(left.key) ?? Number.MAX_SAFE_INTEGER
    const rightIndex = orderIndex.get(right.key) ?? Number.MAX_SAFE_INTEGER
    return leftIndex - rightIndex
  })
}

const areStringArraysEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index])

const extractSourceItems = (parsed: any, sourceDoc: any): ItemRow[] => {
  return extractSourceZones(parsed, sourceDoc).flatMap((zone) =>
    zone.categories.flatMap((category) => category.items || [])
  )
}

const hasPlantMaterialSourceItems = (parsed: any, sourceDoc: any) => {
  const sourceItems = extractSourceItems(parsed, sourceDoc)
  return sourceItems.some((item) => isPlantDocumentEligible(item))
}

const isSourceTypeCompatible = (targetType: ManualType, sourceType: string) => {
  if (targetType === 'invoice') return sourceType === 'quotation'
  if (targetType === 'receipt') return sourceType === 'invoice'
  if (targetType === 'plant_material') return sourceType === 'quotation'
  if (targetType === 'contract') return sourceType === 'invoice'
  return true
}

const sourceTypeErrorMessage = (targetType: ManualType) => {
  if (targetType === 'invoice') return 'ใบแจ้งหนี้ต้องสร้างจากใบเสนอราคาเท่านั้น'
  if (targetType === 'receipt') return 'ใบเสร็จต้องสร้างจากใบแจ้งหนี้เท่านั้น'
  if (targetType === 'plant_material') return 'เอกสารประเภทนี้ต้องอ้างอิงจากใบเสนอราคาเท่านั้น'
  if (targetType === 'contract') return 'สัญญาต้องอ้างอิงจากใบแจ้งหนี้เท่านั้น'
  return 'เอกสารต้นทางไม่ถูกต้อง'
}

const mapOrderToZones = (order: OrderRow): ZoneRow[] => {
  const items: ItemRow[] = []

  const mainService = order?.services?.service_name || order?.services?.service_code
  const mainPrice = Number(order?.calculated_price ?? order?.base_price ?? order?.total ?? 0) || 0
  if (mainService) {
    items.push({
      ...newItem('service', 'general_service'),
      description: mainService,
      unit: 'งาน',
      unit_price_material: mainPrice,
    })
  }

  const addons = Array.isArray(order?.order_additional_services) ? order.order_additional_services : []
  addons.forEach((addon: any) => {
    items.push({
      ...newItem('service', 'general_service'),
      description: addon?.additional_services?.service_name || 'บริการเพิ่มเติม',
      unit: 'รายการ',
      quantity: Number(addon?.quantity) || 1,
      unit_price_material: Number(addon?.unit_price) || 0,
    })
  })

  if (!items.length) {
    items.push(newItem('service', 'general_service'))
  }

  return [{
    id: Math.random().toString(36).slice(2, 10),
    name: 'ZONE A: งานหลัก',
    categories: [{
      ...newCategory(1, 'service', 'general_service'),
      items
    }]
  }]
}

export default function CreateManualDocumentPage(props: any) {
    const { locale } = useI18n();
  const propDocId = props?.docId;
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useAuth()

  const presetTypeParam = searchParams.get('type')
  const presetContractTypeParam = searchParams.get('contractType')
  const presetSourceDocId = searchParams.get('sourceDocId')
  const presetPaymentPlanParam = searchParams.get('paymentPlan')
  const shouldUseSourcePreset = !!presetSourceDocId && (presetTypeParam === 'invoice' || presetTypeParam === 'receipt' || presetTypeParam === 'plant_material' || presetTypeParam === 'contract')
  const editId = shouldUseSourcePreset ? null : (propDocId || searchParams.get('edit'))
  const [editLoading, setEditLoading] = useState(false)
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [issuedAt, setIssuedAt] = useState<string | undefined>(undefined)
  const [chainSourceDocumentId, setChainSourceDocumentId] = useState('')
  const [chainSourceDocument, setChainSourceDocument] = useState<{ id: string; type: ManualType; document_code?: string; created_at?: string } | null>(null)
  const [issuedNextDocument, setIssuedNextDocument] = useState<{ id: string; type: ManualType; document_code?: string } | null>(null)

  const [docType, setDocType] = useState<ManualType>(() => {
    if (presetTypeParam === 'invoice' || presetTypeParam === 'receipt' || presetTypeParam === 'plant_material' || presetTypeParam === 'contract') {
      return presetTypeParam
    }
    return 'quotation'
  })
  const [contractType, setContractType] = useState<ContractDocumentType>(presetContractTypeParam === 'annual_maintenance' ? 'annual_maintenance' : 'landscape_turnkey')
  const [systemCompanyInfo, setSystemCompanyInfo] = useState(DEFAULT_SYSTEM_COMPANY_INFO)
  const [systemFinancialInfo, setSystemFinancialInfo] = useState(DEFAULT_SYSTEM_FINANCIAL_INFO)
  const [contractFormFields, setContractFormFields] = useState(DEFAULT_CONTRACT_FORM_FIELDS)
  const [sourceOrderId, setSourceOrderId] = useState('')
  const [sourceCustomerId, setSourceCustomerId] = useState('')
  const [sourceHouseId, setSourceHouseId] = useState('')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [referenceQuotations, setReferenceQuotations] = useState<QuotationReferenceRow[]>([])
  const [referenceQuotationsLoading, setReferenceQuotationsLoading] = useState(false)
  const [customers, setCustomers] = useState<Profile[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [customersLoading, setCustomersLoading] = useState(false)
  const [housesLoading, setHousesLoading] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [recipientTaxId, setRecipientTaxId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectNameHistory, setProjectNameHistory] = useState<string[]>([])
  const [detailSuggestionPool, setDetailSuggestionPool] = useState<string[]>([])
  const [focusedDescriptionRowKey, setFocusedDescriptionRowKey] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [documentCode, setDocumentCode] = useState('')
  const [totalLabel, setTotalLabel] = useState('')
  const [showTotalLabel, setShowTotalLabel] = useState(false)

  const [vatRate, setVatRate] = useState<number>(0)
  const [overheadRate, setOverheadRate] = useState<number>(15)
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [showVat, setShowVat] = useState(false)
  const [showOverhead, setShowOverhead] = useState(true)
  const [showGlobalLabor, setShowGlobalLabor] = useState(false)
  const [globalLaborRate, setGlobalLaborRate] = useState<number>(10)
  const [withholdingRate, setWithholdingRate] = useState<number>(3)
  const [showWithholdingTax, setShowWithholdingTax] = useState(false)

  const [dueAt, setDueAt] = useState('')
  const [paidAt, setPaidAt] = useState('')

  const [showZones, setShowZones] = useState(false)
  const [pageBreakPerCategory, setPageBreakPerCategory] = useState(false)
  const [zones, setZones] = useState<ZoneRow[]>([newZone(1)])
  const [plantLayoutOrder, setPlantLayoutOrder] = useState<string[]>([])
  const [plantLayoutSettings, setPlantLayoutSettings] = useState<PlantLayoutSettings>(DEFAULT_PLANT_LAYOUT_SETTINGS)
  const [draggingPlantCardKey, setDraggingPlantCardKey] = useState<string | null>(null)
  const [selectedPlantCardKey, setSelectedPlantCardKey] = useState<string | null>(null)
  const [plantLayoutReorderMode, setPlantLayoutReorderMode] = useState(false)

  const [split, setSplit] = useState(false)
  const [installmentMode, setInstallmentMode] = useState<'amount' | 'percent'>('amount')
  const [installments, setInstallments] = useState<InstallmentRow[]>([newInstallment(1), newInstallment(2)])
  const [invoiceIssueMode, setInvoiceIssueMode] = useState<'full' | 'installments'>('full')
  const [invoiceInstallmentDownloadLabel, setInvoiceInstallmentDownloadLabel] = useState('')
  const [invoiceInstallmentOptions, setInvoiceInstallmentOptions] = useState<InstallmentRow[]>([])
  const [selectedInvoiceInstallmentId, setSelectedInvoiceInstallmentId] = useState('')
  const [invoicePaidInstallmentIds, setInvoicePaidInstallmentIds] = useState<string[]>([])
  const [selectedInvoiceDownloadInstallmentId, setSelectedInvoiceDownloadInstallmentId] = useState<string>('')
  const [issuedInvoiceCount, setIssuedInvoiceCount] = useState(0)
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState<'cash' | 'transfer' | 'credit_card' | 'cheque' | 'other'>('transfer')
  const [receiptPaymentScope, setReceiptPaymentScope] = useState<'full' | 'installments'>('full')
// Ensure receiptInstallments state is defined
  const [receiptInstallments, setReceiptInstallments] = useState<{ id: string; label: string; due_at: string; due_scope: string; computed_amount: number; amount: number; percent?: number }[]>([])
  const [receiptPaidAmount, setReceiptPaidAmount] = useState<number>(0)


// Re-add selected state lost in previous replacement
  const [selectedReceiptInstallmentIds, setSelectedReceiptInstallmentIds] = useState<string[]>([])
  const [conditions, setConditions] = useState<ConditionRow[]>(DEFAULT_CONDITIONS.map(t => newCondition(t, true)))
  const [itemCatalog, setItemCatalog] = useState<DocumentItemCatalogEntry[]>([])
  const [spacingReferences, setSpacingReferences] = useState<PlantingSpacingReference[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedDocumentStatus, setSavedDocumentStatus] = useState<string>('')
  const [isInstallmentInvoiceFlow, setIsInstallmentInvoiceFlow] = useState(false)
  const [isInstallmentInvoiceComplete, setIsInstallmentInvoiceComplete] = useState(true)
  const [receiptEligibilityReason, setReceiptEligibilityReason] = useState('')
  const [receiptInstallmentProgress, setReceiptInstallmentProgress] = useState('')
  const [isEditingContent, setIsEditingContent] = useState(!editId)
  const [sourcePresetApplied, setSourcePresetApplied] = useState(false)
  const [activePlantLayoutHandle, setActivePlantLayoutHandle] = useState<PlantLayoutDragHandleKey | null>(null)
  const [activePlantEditSurface, setActivePlantEditSurface] = useState<{ cardKey: string; surface: PlantLayoutEditSurfaceKey } | null>(null)
  const [plantLayoutSyncSourceKey, setPlantLayoutSyncSourceKey] = useState<string | null>(null)
  const pendingCreateIdempotencyKeyRef = useRef<string | null>(null)
  const hydratedEditDocIdRef = useRef<string | null>(null)
  const plantLayoutDragRef = useRef<{
    cardKey: string
    key: PlantLayoutDragHandleKey
    startY: number
    startValue: number
  } | null>(null)
  const fullItemGridColumns = 'sm:grid-cols-[minmax(220px,1.32fr)_minmax(124px,0.72fr)_minmax(136px,0.82fr)_minmax(228px,1.24fr)_76px_minmax(108px,0.68fr)_minmax(104px,0.7fr)_minmax(104px,0.7fr)_minmax(112px,0.74fr)]'

  useEffect(() => {
    if (docType !== 'plant_material') return

    if (showZones) {
      setShowZones(false)
    }

    if (!isPlantMaterialGrouped(zones)) {
      setZones(buildPlantMaterialGroupedZones(zones))
    }
  }, [docType, zones, showZones])

  useEffect(() => {
    if (editId) return

    pendingCreateIdempotencyKeyRef.current = null
    setSourcePresetApplied(false)
    setEditingDocId(null)
    setIssuedNextDocument(null)
    setIssuedInvoiceCount(0)
    setSavedDocumentStatus('')
    setDocumentCode('')
    setInvoiceInstallmentOptions([])
    setSelectedInvoiceInstallmentId('')
    setInvoicePaidInstallmentIds([])
    setPlantLayoutOrder([])
    setPlantLayoutSettings(DEFAULT_PLANT_LAYOUT_SETTINGS)
    setDraggingPlantCardKey(null)
    setSelectedPlantCardKey(null)
    setChainSourceDocument(null)
    setContractFormFields(DEFAULT_CONTRACT_FORM_FIELDS)
    if (!presetSourceDocId) {
      setChainSourceDocumentId('')
    }

    const presetType = presetTypeParam
    let nextDocType: ManualType = 'quotation'
    if (presetType === 'quotation' || presetType === 'invoice' || presetType === 'receipt' || presetType === 'plant_material' || presetType === 'contract') {
      // Guard: chained document types MUST have a sourceDocId
      const requiresSource = presetType !== 'quotation'
      if (requiresSource && !presetSourceDocId) {
        setError(`ไม่สามารถสร้าง${presetType === 'invoice' ? 'ใบแจ้งหนี้' : presetType === 'receipt' ? 'ใบเสร็จ' : presetType === 'plant_material' ? 'เอกสารพืช' : 'สัญญา'}ได้โดยตรง — ต้องสร้างจากเอกสารอ้างอิงในรายการเอกสาร`)
        // Fallback to quotation to prevent form submission without source
        setDocType('quotation')
        setIsEditingContent(true)
        return
      }

      setDocType(presetType)
      nextDocType = presetType

      if (presetType === 'invoice') {
        setSplit(false)
        setInstallmentMode('amount')
        setInstallments([newInstallment(1), newInstallment(2)])
        setDueAt('')
      }
    }

    if (presetType === 'contract') {
      setContractType(presetContractTypeParam === 'annual_maintenance' ? 'annual_maintenance' : 'landscape_turnkey')
    }

    if (presetType === 'quotation') {
      setInvoiceIssueMode('full')
    }

    // New documents must start editable (especially plant_material),
    // then lock/editability is controlled after first save by type.
    setIsEditingContent(true)
  }, [editId, presetTypeParam, presetSourceDocId, presetContractTypeParam])

  useEffect(() => {
    const run = async () => {
      if (!profile?.id || profile.role !== 'admin') return

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const response = await fetch(`/api/system/settings?t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          headers: {
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
        })

        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(result?.error || 'โหลดการตั้งค่าระบบไม่สำเร็จ')
        }

        setSystemCompanyInfo({ ...DEFAULT_SYSTEM_COMPANY_INFO, ...(result?.companyInfo || {}) })
        setSystemFinancialInfo({ ...DEFAULT_SYSTEM_FINANCIAL_INFO, ...(result?.financialInfo || {}) })
      } catch (fetchError) {
        console.error(fetchError)
      }
    }

    void run()
  }, [profile?.id, profile?.role])

  useEffect(() => {
    const run = async () => {
      if (editId || !presetSourceDocId || sourcePresetApplied) return

      try {
        const { data, error } = await getDocumentDetails(presetSourceDocId)
        if (error || !data) throw error || new Error('ไม่พบเอกสารต้นทาง')

        const parsed = parseManualPayload(data.description)
        const currentType = presetTypeParam as ManualType
        const sourceType = String(data.type || '').toLowerCase()

        if (!isSourceTypeCompatible(currentType, sourceType)) {
          throw new Error(sourceTypeErrorMessage(currentType))
        }

        if (currentType === 'plant_material' && !hasPlantMaterialSourceItems(parsed, data)) {
          throw new Error('ไม่สามารถสร้างเอกสารพืชได้: ใบเสนอราคาอ้างอิงไม่มีรายการต้นไม้ ไม้พุ่ม หรือวัสดุตกแต่งที่แสดงรูปได้')
        }

        const requestedPaymentPlan = currentType === 'invoice'
          ? (presetPaymentPlanParam === 'installments' ? 'installments' : (presetPaymentPlanParam === 'full' ? 'full' : null))
          : null

         // If creating Invoice from Quote, payment plan comes from quotation dropdown selection
         if (currentType === 'invoice') {
             setInvoicePaidInstallmentIds([])
             const sourceInstallments = Array.isArray(parsed?.installments)
               ? parsed.installments
               : []
             const hasSourceInstallments = sourceInstallments.length > 0
             const shouldUseInstallments = requestedPaymentPlan === 'installments'
               || (requestedPaymentPlan === null && hasSourceInstallments)
             setSplit(shouldUseInstallments)
             if (shouldUseInstallments && hasSourceInstallments) {
               setInstallmentMode(sourceInstallments.some((it: any) => Number(it?.percent) > 0) ? 'percent' : 'amount')
               setInstallments(sourceInstallments.map((it: any, idx: number) => ({
                 id: String(it?.id || `inst-${idx + 1}`),
                 label: it?.label || `งวดที่ ${idx + 1}`,
                 due_at: it?.due_at?.slice(0, 10) || '',
                 due_scope: String(it?.due_scope || ''),
                 amount: Number(it?.amount) || 0,
                 percent: Number(it?.percent) || 0,
               })))
             } else if (shouldUseInstallments) {
               setInstallmentMode('amount')
               setInstallments([newInstallment(1), newInstallment(2)])
             } else {
               setInstallments([newInstallment(1), newInstallment(2)])
             }
             setDueAt('') 
         }

         // If creating Receipt from Invoice, pull the payment info
         if (currentType === 'receipt') {
           setReceiptPaymentScope('full')
           setSelectedReceiptInstallmentIds([])
           setReceiptPaidAmount(Number(data.total) || 0)
             setPaidAt(new Date().toISOString().slice(0, 10))
         }

        setChainSourceDocumentId(data.id)
        setSourceOrderId(parsed?.source_order_id || data.order_id || '')
        setSourceCustomerId(parsed?.source_customer_id || data.orders?.customer_id || '')
        setSourceHouseId(parsed?.source_house_id || data.orders?.house_id || '')
        setRecipientName(parsed?.recipient?.name || data.orders?.profiles?.display_name || data.orders?.profiles?.email || '')
        setRecipientPhone(parsed?.recipient?.phone || data.orders?.profiles?.phone || '')
        setRecipientAddress(parsed?.recipient?.address || data.orders?.houses?.address || data.orders?.profiles?.address || '')
        setRecipientTaxId(parsed?.recipient?.tax_id || parsed?.recipient?.taxId || '')
        setProjectName(parsed?.project_name || data.orders?.services?.service_name || '')
        setTotalLabel(String(parsed?.total_label || ''))
        setShowTotalLabel(parsed?.show_total_label === true || !!parsed?.total_label)

        const sourceVatRate = Number(parsed?.vat_rate)
        setVatRate(Number.isFinite(sourceVatRate) ? sourceVatRate : 0)

        const sourceOverheadRate = Number(parsed?.overhead_rate)
        setOverheadRate(Number.isFinite(sourceOverheadRate) ? sourceOverheadRate : 15)
        const sourceDiscountType = parsed?.discount_type === 'percent' ? 'percent' : 'amount'
        const sourceDiscountValue = Number(parsed?.discount_value)
        const sourceDiscountAmount = Number(parsed?.discount_amount)
        setDiscountType(sourceDiscountType)
        setDiscountAmount(
          Number.isFinite(sourceDiscountValue)
            ? sourceDiscountValue
            : Number.isFinite(sourceDiscountAmount)
              ? sourceDiscountAmount
              : 0
        )
        setShowVat(parsed?.show_vat === true)
        setShowOverhead(parsed?.show_overhead !== false)
        setShowGlobalLabor(parsed?.show_global_labor === true)
        
        const sourceGlobalLaborRate = Number(parsed?.global_labor_rate)
        setGlobalLaborRate(Number.isFinite(sourceGlobalLaborRate) ? sourceGlobalLaborRate : 10)

        const sourceWithholdingRate = Number(parsed?.withholding_tax_rate)
        setWithholdingRate(Number.isFinite(sourceWithholdingRate) ? sourceWithholdingRate : 3)
        setShowWithholdingTax(parsed?.show_withholding_tax === true)

        if (Array.isArray(parsed?.conditions) && parsed.conditions.length > 0) {
          setConditions(parsed.conditions.map((c: any) => ({
            id: String(c?.id || Math.random().toString(36).slice(2, 10)),
            text: typeof c === 'string' ? c : String(c?.text || ''),
            selected: typeof c === 'string' ? true : !!c?.selected,
          })))
        }

        if (currentType === 'invoice' && !dueAt) {
          const fallbackDueAt = String(parsed?.due_at || '').slice(0, 10)
          if (fallbackDueAt) {
            setDueAt(fallbackDueAt)
          }
        }

        if (currentType === 'plant_material') {
          setShowZones(false)
          setPlantLayoutOrder([])
          setPlantLayoutSettings(DEFAULT_PLANT_LAYOUT_SETTINGS)
          setSelectedPlantCardKey(null)
          setZones(buildPlantMaterialZonesFromSource(parsed, data))
        } else if (Array.isArray(parsed?.zones) && parsed.zones.length > 0) {
          setShowZones(parsed?.show_zones === true || parsed.zones.length > 1)
          setZones(
            parsed.zones.map((zone: any, zIdx: number) => ({
              id: zone?.id || `z-${zIdx}-${Math.random().toString(36).slice(2, 8)}`,
              name: zone?.name || `Zone ${zIdx + 1}`,
              categories: (Array.isArray(zone?.categories) ? zone.categories : []).map((category: any, cIdx: number) =>
                normalizeCategoryRow(category, cIdx)
              ),
            }))
          )
        } else if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
          setShowZones(false)
          setZones([{
            id: 'z-legacy',
            name: 'General',
            categories: [{
              ...newCategory(1, 'other', 'general'),
              id: 'c-legacy',
              items: parsed.items.map((it: any, idx: number) =>
                normalizeManualItem(it, `${idx}-${Math.random().toString(36).slice(2, 8)}`)
              )
            }]
          }])
        } else if (data.orders) {
          setShowZones(false)
          setZones(mapOrderToZones(data.orders || data))
        }

        if (Array.isArray(parsed?.installments) && parsed.installments.length > 0) {
          if (currentType === 'invoice') {
            const requestedPaymentPlan = presetPaymentPlanParam === 'installments'
              ? 'installments'
              : (presetPaymentPlanParam === 'full' ? 'full' : null)
            const shouldUseInstallments = requestedPaymentPlan === 'installments' || requestedPaymentPlan === null
            setSplit(shouldUseInstallments)

            const sourceInstallments: InstallmentRow[] = parsed.installments.map((it: any, idx: number) => ({
              id: String(it?.id || `inst-${idx + 1}`),
              label: it?.label || `งวดที่ ${idx + 1}`,
              due_at: it?.due_at?.slice(0, 10) || '',
              due_scope: String(it?.due_scope || ''),
              amount: Number(it?.amount) || 0,
              percent: Number(it?.percent) || 0,
            }))

            const needle = `"source_document_id":"${data.id}"`
            const { data: existingInvoices } = await supabase
              .from('documents')
              .select('id, description')
              .eq('type', 'invoice')
              .ilike('description', `%${needle}%`)

            const issuedInstallmentIds = new Set(
              (existingInvoices || [])
                .map((inv: any) => parseManualPayload(inv?.description))
                .map((payload: any) => String(payload?.current_installment_id || ''))
                .filter(Boolean)
            )

            let nextInstallment: InstallmentRow | null = null
            for (const installment of sourceInstallments) {
              if (!issuedInstallmentIds.has(installment.id)) {
                nextInstallment = installment
                break
              }
            }

            const availableInstallments = sourceInstallments.filter((installment) => !issuedInstallmentIds.has(installment.id))
            setInvoiceInstallmentOptions(availableInstallments)
            setSelectedInvoiceInstallmentId(availableInstallments[0]?.id || '')

            if (nextInstallment?.due_at) {
              setDueAt(nextInstallment.due_at)
            }
            if (shouldUseInstallments) {
              setInstallmentMode(sourceInstallments.some((it: any) => Number(it?.percent) > 0) ? 'percent' : 'amount')
              setInstallments(sourceInstallments)
            }
          } else {
            setSplit(true)
            setInstallmentMode(parsed.installments.some((it: any) => Number(it?.percent) > 0) ? 'percent' : 'amount')
            setInstallments(parsed.installments.map((it: any, idx: number) => ({
              id: it?.id || `${idx}-${Math.random().toString(36).slice(2, 8)}`,
              label: it?.label || `งวดที่ ${idx + 1}`,
              due_at: it?.due_at?.slice(0, 10) || '',
              amount: Number(it?.amount) || 0,
              percent: Number(it?.percent) || 0,
            })))
          }
        } else if (currentType === 'invoice') {
          setInvoiceInstallmentOptions([])
          setSelectedInvoiceInstallmentId('')
        }
      } catch (err: any) {
        console.error(err)
        setError(err?.message || 'ไม่สามารถโหลดเอกสารต้นทางได้')
      } finally {
        setSourcePresetApplied(true)
      }
    }

    void run()
  }, [editId, presetSourceDocId, presetTypeParam, presetPaymentPlanParam, sourcePresetApplied])

  const persistProjectName = (value: string) => {
    const normalized = value.trim()
    if (!normalized) return

    setProjectNameHistory((prev) => {
      const deduped = prev.filter((name) => name.toLowerCase() !== normalized.toLowerCase())
      const next = [normalized, ...deduped].slice(0, 30)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PROJECT_NAME_STORAGE_KEY, JSON.stringify(next))
      }
      return next
    })
  }

  const persistItemDetailSuggestions = (values: string[]) => {
    if (!Array.isArray(values) || values.length === 0) return

    setDetailSuggestionPool((prev) => {
      const next = mergeUniqueSuggestions(prev, values)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ITEM_DETAIL_STORAGE_KEY, JSON.stringify(next))
      }
      return next
    })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(PROJECT_NAME_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setProjectNameHistory(parsed.filter((name) => typeof name === 'string' && name.trim()))
      }
    } catch {
      setProjectNameHistory([])
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(ITEM_DETAIL_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setDetailSuggestionPool(parsed.filter((text) => typeof text === 'string' && text.trim()))
      }
    } catch {
      setDetailSuggestionPool([])
    }
  }, [])

  useEffect(() => {
    hydratedEditDocIdRef.current = null
  }, [editId])

  useEffect(() => {
    const run = async () => {
      if (!profile?.id || profile.role !== 'admin' || !editId) return
      if (hydratedEditDocIdRef.current === editId) return

      setEditLoading(true)
      try {
        const { data, error } = await getDocumentDetails(editId)
        if (error || !data) throw error || new Error('ไม่พบเอกสาร')

        const raw = data.description
        if (!raw || typeof raw !== 'string') throw new Error('รูปแบบเอกสารไม่ถูกต้อง')

        const parsed = JSON.parse(raw)
        const isManual = parsed?.kind === 'manual_document'

        setEditingDocId(data.id)
        setIsEditingContent(false)
        const loadedType = (data.type as ManualType) || 'quotation'
        setDocType(loadedType)
        setInvoiceInstallmentDownloadLabel('')
        if (loadedType === 'contract') {
          setContractType(parsed?.contract_type === 'annual_maintenance' ? 'annual_maintenance' : 'landscape_turnkey')
        }
        setDocumentCode(data.document_code || parsed?.document_code || '')
        setSavedDocumentStatus(String(data.status || '').toLowerCase())

        if (!isManual) {
          if (data.type !== 'quotation') throw new Error('เอกสารนี้ยังไม่รองรับการแก้ไข')

          setIssuedAt(data.generated_at || data.created_at || undefined)
          setTotalLabel('')
          setShowTotalLabel(false)
          setSourceOrderId(data.order_id || '')
          setSourceCustomerId(data.orders?.customer_id || '')
          setSourceHouseId(data.orders?.house_id || '')
          setRecipientName(data.orders?.profiles?.display_name || data.orders?.profiles?.email || '')
          setRecipientPhone(data.orders?.profiles?.phone || '')
          setRecipientAddress(data.orders?.houses?.address || data.orders?.profiles?.address || '')
          setRecipientTaxId('')
          setInvoicePaidInstallmentIds([])
          setProjectName(data.orders?.services?.service_name || '')
          setNotes('')
          setVatRate(0)
          setOverheadRate(15)
          setShowVat(false)
          setShowOverhead(true)
          setWithholdingRate(3)
          setShowWithholdingTax(false)
          setShowZones(false)
          setDueAt('')
          setPaidAt('')
          setConditions(DEFAULT_CONDITIONS.map(t => newCondition(t, true)))
          setZones(mapOrderToZones(data.orders || data))
          setDiscountType('amount')
          setDiscountAmount(0)
          setSplit(false)
          setInstallmentMode('amount')
          setInstallments([newInstallment(1), newInstallment(2)])
          setChainSourceDocumentId('')
          setChainSourceDocument(null)
          setReceiptPaymentMethod('transfer')
          setReceiptPaymentScope('full')
          setSelectedReceiptInstallmentIds([])
          return
        }

        let latestPlantMaterialZones: ZoneRow[] | null = null
        if (loadedType === 'plant_material' && parsed?.source_document_id) {
          try {
            const { data: sourceDoc, error: sourceError } = await getDocumentDetails(parsed.source_document_id)
            if (sourceError || !sourceDoc) throw sourceError || new Error('ไม่พบใบเสนอราคาอ้างอิง')

            const sourceType = String(sourceDoc.type || '').toLowerCase()
            if (!isSourceTypeCompatible('plant_material', sourceType)) {
              throw new Error(sourceTypeErrorMessage('plant_material'))
            }

            const sourceParsed = parseManualPayload(sourceDoc.description)
            if (!hasPlantMaterialSourceItems(sourceParsed, sourceDoc)) {
              throw new Error('ไม่สามารถซิงก์เอกสารพืชได้: ใบเสนอราคาอ้างอิงไม่มีรายการต้นไม้ ไม้พุ่ม หรือวัสดุตกแต่งที่แสดงรูปได้')
            }

            latestPlantMaterialZones = buildPlantMaterialZonesFromSource(sourceParsed, sourceDoc)
          } catch (syncError) {
            console.error(syncError)
          }
        }

        setIssuedAt(parsed.issued_at)
        setTotalLabel(parsed.total_label || '')
        setShowTotalLabel(parsed?.show_total_label === true || !!parsed?.total_label)
        setSourceCustomerId(parsed?.source_customer_id || '')
        setSourceHouseId(parsed?.source_house_id || '')
        setChainSourceDocumentId(parsed?.source_document_id || '')
        setContractFormFields(normalizeContractFormFields(parsed?.contract_details))
        setPlantLayoutOrder(
          Array.isArray(parsed?.plant_layout_order)
            ? parsed.plant_layout_order.map((key: any) => String(key || '').trim()).filter(Boolean)
            : []
        )
        setPlantLayoutSettings(normalizePlantLayoutSettings(parsed?.plant_layout_settings))
        setSelectedPlantCardKey(null)
        setRecipientName(parsed?.recipient?.name || '')
        setRecipientPhone(parsed?.recipient?.phone || '')
        setRecipientAddress(parsed?.recipient?.address || '')
        setRecipientTaxId(parsed?.recipient?.tax_id || parsed?.recipient?.taxId || '')
        setProjectName(parsed?.project_name || '')
        setNotes(parsed?.notes || '')
        setVatRate(Number(parsed?.vat_rate) || 0)
        setOverheadRate(Number(parsed?.overhead_rate) ?? 15)
        setDiscountType(parsed?.discount_type === 'percent' ? 'percent' : 'amount')
        setDiscountAmount(Number(parsed?.discount_value) || Number(parsed?.discount_amount) || 0)
        setShowVat(parsed?.show_vat === true)
        setShowOverhead(parsed?.show_overhead !== false)
        setShowGlobalLabor(parsed?.show_global_labor === true)
        setGlobalLaborRate(Number(parsed?.global_labor_rate) ?? 10)
        setWithholdingRate(Number(parsed?.withholding_tax_rate) || 3)
        setShowWithholdingTax(parsed?.show_withholding_tax === true)
        setShowZones(parsed?.show_zones === true || (Array.isArray(parsed?.zones) && parsed.zones.length > 1))
        setSourceOrderId(parsed?.source_order_id || '')

        if (Array.isArray(parsed?.conditions)) {
          setConditions(parsed.conditions.map((c: any) => ({
            id: c.id || Math.random().toString(36).slice(2, 10),
            text: typeof c === 'string' ? c : (c.text || ''),
            selected: typeof c === 'string' ? true : (!!c.selected)
          })))
        }

        setDueAt(parsed?.due_at?.slice(0, 10) || '')
        setPaidAt(parsed?.paid_at?.slice(0, 10) || '')
        setReceiptPaymentMethod(parsed?.payment_method || 'transfer')

        if (loadedType === 'invoice') {
          const parsedInstallments: InstallmentRow[] = Array.isArray(parsed?.installments)
            ? parsed.installments.map((it: any, idx: number) => ({
                id: String(it?.id || `inst-${idx + 1}`),
                label: String(it?.label || `งวดที่ ${idx + 1}`),
                due_at: String(it?.due_at || '').slice(0, 10),
                due_scope: String(it?.due_scope || ''),
                amount: Number(it?.amount) || 0,
                percent: Number(it?.percent) || 0,
              }))
            : []

          const paidInstallmentIds = Array.isArray(parsed?.paid_installment_ids)
            ? parsed.paid_installment_ids.map((id: any) => String(id || '').trim()).filter(Boolean)
            : []
          setInvoicePaidInstallmentIds(paidInstallmentIds)

          if (parsedInstallments.length > 0) {
            const paidSet = new Set(paidInstallmentIds)
            const currentInstallmentId = String(parsed?.current_installment_id || '').trim()
            const currentInstallment = currentInstallmentId
              ? parsedInstallments.find((it) => String(it.id) === currentInstallmentId) || null
              : null
            const selectedUnpaidInstallment = currentInstallment && !paidSet.has(String(currentInstallment.id))
              ? currentInstallment
              : null
            const nextInstallment = parsedInstallments.find((it) => !paidSet.has(String(it.id))) || null
            const targetInstallment = selectedUnpaidInstallment || nextInstallment || currentInstallment

            if (targetInstallment) {
              setInvoiceInstallmentOptions([targetInstallment])
              setSelectedInvoiceInstallmentId(targetInstallment.id)
              setInvoiceInstallmentDownloadLabel(String(targetInstallment.label || targetInstallment.id || '').trim())
              setSelectedInvoiceDownloadInstallmentId(targetInstallment.id)
            } else {
              setInvoiceInstallmentOptions([])
              setSelectedInvoiceInstallmentId('')
              setInvoiceInstallmentDownloadLabel('ครบทุกงวดแล้ว')
              setSelectedInvoiceDownloadInstallmentId(parsedInstallments[0]?.id || '')
            }
          } else {
            const currentInstallmentLabel = String(parsed?.current_installment_label || '').trim()
            if (currentInstallmentLabel) {
              setInvoiceInstallmentDownloadLabel(currentInstallmentLabel)
            } else {
              const currentInstallmentId = String(parsed?.current_installment_id || '').trim()
              setInvoiceInstallmentDownloadLabel(currentInstallmentId)
            }
            setInvoicePaidInstallmentIds([])
            setSelectedInvoiceDownloadInstallmentId('')
          }
        }

        if (loadedType === 'plant_material' && parsed?.zones?.length) {
          setShowZones(false)
          setZones(
            parsed.zones.map((zone: any, zIdx: number) => ({
              id: zone?.id || `z-${zIdx}-${Math.random().toString(36).slice(2, 8)}`,
              name: zone?.name || `Zone ${zIdx + 1}`,
              categories: (Array.isArray(zone?.categories) ? zone.categories : []).map((category: any, cIdx: number) =>
                normalizeCategoryRow(category, cIdx)
              ),
            }))
          )
        } else if (loadedType === 'plant_material' && latestPlantMaterialZones) {
          setShowZones(false)
          setZones(latestPlantMaterialZones)
        } else if (parsed?.zones?.length) {
          setZones(
            parsed.zones.map((zone: any, zIdx: number) => ({
              id: zone?.id || `z-${zIdx}-${Math.random().toString(36).slice(2, 8)}`,
              name: zone?.name || `Zone ${zIdx + 1}`,
              categories: (Array.isArray(zone?.categories) ? zone.categories : []).map((category: any, cIdx: number) =>
                normalizeCategoryRow(category, cIdx)
              ),
            }))
          )
        } else if (parsed?.items?.length) {
          setZones([{
            id: 'z-legacy',
            name: 'General',
            categories: [{
              ...newCategory(1, 'other', 'general'),
              id: 'c-legacy',
              items: parsed.items.map((it: any, idx: number) =>
                normalizeManualItem(it, `${idx}-${Math.random().toString(36).slice(2, 8)}`)
              )
            }]
          }])
        }

        if (loadedType !== 'plant_material') {
          setPlantLayoutOrder([])
          setPlantLayoutSettings(DEFAULT_PLANT_LAYOUT_SETTINGS)
          setSelectedPlantCardKey(null)
        }

        if (parsed?.installments?.length) {
          setSplit(true)
          setInstallmentMode(parsed.installments.some((it: any) => it.percent > 0) ? 'percent' : 'amount')
          setInstallments(parsed.installments.map((it: any, idx: number) => ({
            id: it?.id || `${idx}-${Math.random().toString(36).slice(2, 8)}`,
            label: it?.label || `งวดที่ ${idx + 1}`,
            due_at: it?.due_at?.slice(0, 10) || '',
            due_scope: String(it?.due_scope || ''),
            amount: Number(it?.amount) || 0,
            percent: Number(it?.percent) || 0,
          })))
          const parsedAppliedIds = Array.isArray(parsed?.applied_installment_ids)
            ? parsed.applied_installment_ids.map((id: any) => String(id)).filter(Boolean)
            : []
          if (parsedAppliedIds.length > 0) {
            setReceiptPaymentScope('installments')
            setSelectedReceiptInstallmentIds(parsedAppliedIds)
          } else {
            setReceiptPaymentScope('full')
            setSelectedReceiptInstallmentIds([])
          }
        } else {
          setReceiptPaymentScope('full')
          setSelectedReceiptInstallmentIds([])
        }

        hydratedEditDocIdRef.current = editId
      } catch (err: any) {
        hydratedEditDocIdRef.current = null
        setError(err?.message || 'โหลดข้อมูลไม่สำเร็จ')
      } finally {
        setEditLoading(false)
      }
    }
    run()
  }, [editId, profile?.id, profile?.role])

  useEffect(() => {
    if (docType !== 'quotation') return
    setInvoiceIssueMode(split ? 'installments' : 'full')
  }, [docType, split])

  useEffect(() => {
    const run = async () => {
      if (docType !== 'quotation' || !editingDocId) {
        setIssuedInvoiceCount(0)
        return
      }

      const { data, error } = await supabase
        .from('documents')
        .select('id')
        .eq('type', 'invoice')
        .eq('source_document_id', editingDocId)

      if (error || !Array.isArray(data)) {
        setIssuedInvoiceCount(0)
        return
      }

      setIssuedInvoiceCount(data.length)
    }

    void run()
  }, [docType, editingDocId, savedDocumentStatus])

  const handleCreateInvoiceFromQuotation = (requestedPlan?: 'full' | 'installments') => {
    if (!editingDocId) {
      setError('กรุณาบันทึกใบเสนอราคาก่อนสร้างใบแจ้งหนี้')
      return
    }

    const plan = requestedPlan || (invoiceIssueMode === 'installments' ? 'installments' : 'full')
    const hasInstallmentsConfigured = split && installments.length > 0

    if (plan === 'installments') {
      if (hasInstallmentsConfigured && issuedInvoiceCount >= installments.length) {
        setError('ใบเสนอราคานี้ออกใบแจ้งหนี้ครบทุกงวดแล้ว')
        return
      }
      if (!hasInstallmentsConfigured && issuedInvoiceCount > 0) {
        setError('ใบเสนอราคานี้สร้างใบแจ้งหนี้แล้ว')
        return
      }
    } else {
      if (issuedInvoiceCount > 0) {
        setError('ใบเสนอราคานี้สร้างใบแจ้งหนี้แล้ว')
        return
      }
    }

    router.push(`/dashboard/admin/documents/create-manual?type=invoice&sourceDocId=${editingDocId}&paymentPlan=${plan}`)
  }

  useEffect(() => {
    const run = async () => {
      if (!chainSourceDocumentId) {
        setChainSourceDocument(null)
        return
      }

      const { data } = await getDocumentDetails(chainSourceDocumentId)
      if (!data) {
        setChainSourceDocument(null)
        return
      }

      setChainSourceDocument({
        id: data.id,
        type: (data.type as ManualType) || 'quotation',
        document_code: data.document_code || undefined,
        created_at: data.created_at || undefined,
      })
    }

    void run()
  }, [chainSourceDocumentId])

  useEffect(() => {
    const run = async () => {
      if (!editingDocId || (docType !== 'quotation' && docType !== 'invoice')) {
        setIssuedNextDocument(null)
        return
      }

      const nextType: ManualType = docType === 'quotation' ? 'invoice' : 'receipt'
      const { data, error } = await supabase
        .from('documents')
        .select('id, type, document_code, description, created_at')
        .eq('type', nextType)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error || !Array.isArray(data) || data.length === 0) {
        setIssuedNextDocument(null)
        return
      }

      const matched = data.find((row: any) => {
        const payload = parseManualPayload(row?.description)
        return String(payload?.source_document_id || '') === editingDocId
      })

      if (!matched) {
        setIssuedNextDocument(null)
        return
      }

      const latest = matched as any
      setIssuedNextDocument({
        id: latest.id,
        type: (latest.type as ManualType) || nextType,
        document_code: latest.document_code || undefined,
      })
    }

    void run()
  }, [editingDocId, docType])

  useEffect(() => {
    const run = async () => {
      const invoiceId = docType === 'receipt'
        ? chainSourceDocumentId
        : (docType === 'invoice' ? (editingDocId || '') : '')

      if (!invoiceId) {
        setReceiptEligibilityReason('')
        setReceiptInstallmentProgress('')
        if (docType !== 'receipt') {
          setIsInstallmentInvoiceFlow(false)
          setIsInstallmentInvoiceComplete(true)
        }
        return
      }

      try {
        const { data: invoiceDoc, error: invoiceError } = await getDocumentDetails(invoiceId)
        if (invoiceError || !invoiceDoc) {
          throw invoiceError || new Error('ไม่พบข้อมูลใบแจ้งหนี้สำหรับตรวจสอบงวด')
        }

        const quotationId = String(invoiceDoc?.source_document_id || parseManualPayload(invoiceDoc?.description)?.source_document_id || '')
        if (!quotationId) {
          setReceiptEligibilityReason('')
          setReceiptInstallmentProgress('')
          if (docType === 'invoice') {
            setIsInstallmentInvoiceFlow(false)
            setIsInstallmentInvoiceComplete(true)
          }
          return
        }

        const { data: quotationDoc, error: quotationError } = await getDocumentDetails(quotationId)
        if (quotationError || !quotationDoc) {
          throw quotationError || new Error('ไม่พบใบเสนอราคาอ้างอิงสำหรับตรวจสอบงวด')
        }

        const { data: invoiceDocs, error: invoiceDocsError } = await supabase
          .from('documents')
          .select('id, type, source_document_id, description')
          .eq('type', 'invoice')
          .eq('source_document_id', quotationId)

        if (invoiceDocsError) throw invoiceDocsError

        const invoiceIds = (invoiceDocs || []).map((doc: any) => String(doc.id)).filter(Boolean)
        let receiptDocs: any[] = []

        if (invoiceIds.length > 0) {
          const { data: receipts, error: receiptDocsError } = await supabase
            .from('documents')
            .select('id, type, source_document_id, description')
            .eq('type', 'receipt')
            .in('source_document_id', invoiceIds)

          if (receiptDocsError) throw receiptDocsError
          receiptDocs = receipts || []
        }

        const flowDocs = [quotationDoc, ...(invoiceDocs || []), ...receiptDocs]
        const gate = getReceiptGateForInvoice(invoiceDoc, flowDocs)
        const progress = gate.progress
        const invoicePayload = parseManualPayload(invoiceDoc?.description)
        const payloadInstallmentCount = Array.isArray(invoicePayload?.installments) ? invoicePayload.installments.length : 0
        const payloadPaidCount = Array.isArray(invoicePayload?.paid_installment_ids)
          ? invoicePayload.paid_installment_ids.map((id: any) => String(id || '').trim()).filter(Boolean).length
          : 0
        const payloadInstallmentFullyPaid = payloadInstallmentCount > 0 && payloadPaidCount >= payloadInstallmentCount
        const installmentFullyPaid = !!progress?.isInstallmentFlow
          && Number(progress?.totalInstallments || 0) > 0
          && Number(progress?.paidCount || 0) >= Number(progress?.totalInstallments || 0)

        if (progress?.isInstallmentFlow) {
          setReceiptInstallmentProgress(`ชำระงวดแล้ว ${progress.paidCount}/${progress.totalInstallments}`)
        } else {
          setReceiptInstallmentProgress('')
        }

        setReceiptEligibilityReason((gate.allowed || installmentFullyPaid || payloadInstallmentFullyPaid) ? '' : (gate.reason || 'ต้องชำระครบทุกงวดก่อนออกใบเสร็จ'))

        if (docType === 'invoice') {
          setIsInstallmentInvoiceFlow(!!progress?.isInstallmentFlow)
          setIsInstallmentInvoiceComplete(!!gate.allowed || installmentFullyPaid || payloadInstallmentFullyPaid)
        }
      } catch {
        setReceiptEligibilityReason('ไม่สามารถตรวจสอบสถานะงวดได้ กรุณาตรวจสอบข้อมูลอีกครั้ง')
        if (docType === 'invoice') {
          setIsInstallmentInvoiceFlow(true)
          setIsInstallmentInvoiceComplete(false)
        }
      }
    }

    void run()
  }, [docType, chainSourceDocumentId, editingDocId, savedDocumentStatus])

  useEffect(() => {
    const run = async () => {
      if (!profile?.id || profile.role !== 'admin') return
      setOrdersLoading(true)
      const { data, error } = await getAllOrders()
      if (!error && Array.isArray(data)) {
        setOrders(data)

        const presetOrderId = searchParams.get('orderId')
        if (!editId && presetOrderId && !sourceOrderId) {
          const found = data.find((o: any) => o.id === presetOrderId)
          if (found) {
            setSourceOrderId(found.id)
            setRecipientName(found?.profiles?.display_name || found?.profiles?.email || '')
            setRecipientPhone(found?.profiles?.phone || '')
            setRecipientAddress(found?.houses?.address || found?.profiles?.address || '')
            setProjectName(found?.services?.service_name || '')
            setZones(mapOrderToZones(found))
            setShowZones(false)
            setSourceCustomerId(found?.customer_id || '')
            setSourceHouseId(found?.house_id || '')
          }
        }
      }
      setOrdersLoading(false)
    }

    run()
  }, [profile, editId, searchParams, sourceOrderId])

  useEffect(() => {
    const run = async () => {
      if (!profile?.id || profile.role !== 'admin') return
      setCustomersLoading(true)
      const { data, error } = await getCustomers()
      if (!error && Array.isArray(data)) {
        setCustomers(data)
      }
      setCustomersLoading(false)
    }

    run()
  }, [profile])

  useEffect(() => {
    const run = async () => {
      if (!profile?.id || profile.role !== 'admin') return

      setReferenceQuotationsLoading(true)
      const referenceType = docType === 'contract' ? 'invoice' : 'quotation'
      const { data, error } = await supabase
        .from('documents')
        .select('id, document_code, user_id, order_id, created_at')
        .eq('type', referenceType)
        .order('created_at', { ascending: false })
        .limit(300)

      if (!error && Array.isArray(data)) {
        setReferenceQuotations(data as QuotationReferenceRow[])
      }
      setReferenceQuotationsLoading(false)
    }

    void run()
  }, [docType, profile])

  const handleSelectReferenceQuotation = async (docId: string) => {
    setChainSourceDocumentId(docId)
    setError('')
    if (!docId) {
      setChainSourceDocument(null)
      if (docType === 'contract') {
        setSplit(false)
        setInstallments([newInstallment(1), newInstallment(2)])
      }
      return
    }

    const { data, error } = await getDocumentDetails(docId)
    if (error || !data) return

    const parsed = parseManualPayload(data.description)
    if (docType === 'plant_material' && !hasPlantMaterialSourceItems(parsed, data)) {
      setError('ไม่สามารถสร้างเอกสารพืชได้: ใบเสนอราคาอ้างอิงไม่มีรายการต้นไม้ ไม้พุ่ม หรือวัสดุตกแต่งที่แสดงรูปได้')
    } else if (docType === 'plant_material') {
      setShowZones(false)
      setZones(buildPlantMaterialZonesFromSource(parsed, data))
    } else if (docType === 'contract') {
      if (Array.isArray(parsed?.installments) && parsed.installments.length > 0) {
        setSplit(true)
        setInstallmentMode(parsed.installments.some((it: any) => Number(it?.percent) > 0) ? 'percent' : 'amount')
        setInstallments(parsed.installments.map((it: any, idx: number) => ({
          id: String(it?.id || `inst-${idx + 1}`),
          label: String(it?.label || `งวดที่ ${idx + 1}`),
          due_at: String(it?.due_at || '').slice(0, 10),
          due_scope: String(it?.due_scope || ''),
          amount: Number(it?.amount) || 0,
          percent: Number(it?.percent) || 0,
        })))
      } else {
        setSplit(false)
        setInstallments([newInstallment(1), newInstallment(2)])
      }
      setPageBreakPerCategory(!!parsed?.page_break_per_category)
      setContractFormFields((prev) => ({
        ...prev,
        invoice_reference_code: data.document_code || prev.invoice_reference_code,
      }))
    }
    setSourceOrderId(parsed?.source_order_id || data.order_id || sourceOrderId)
    setSourceCustomerId(parsed?.source_customer_id || data.orders?.customer_id || sourceCustomerId)
    setSourceHouseId(parsed?.source_house_id || data.orders?.house_id || sourceHouseId)
    if (!recipientName.trim()) setRecipientName(parsed?.recipient?.name || data.orders?.profiles?.display_name || data.orders?.profiles?.email || '')
    if (!recipientPhone.trim()) setRecipientPhone(parsed?.recipient?.phone || data.orders?.profiles?.phone || '')
    if (!recipientAddress.trim()) setRecipientAddress(parsed?.recipient?.address || data.orders?.houses?.address || data.orders?.profiles?.address || '')
    if (!recipientTaxId.trim()) setRecipientTaxId(parsed?.recipient?.tax_id || parsed?.recipient?.taxId || '')
    if (!projectName.trim()) setProjectName(parsed?.project_name || data.orders?.services?.service_name || '')
  }

  const applyReferenceQuotationToContract = async (docId?: string) => {
    const targetDocId = String(docId || chainSourceDocumentId || '').trim()
    if (!targetDocId) return

    const { data, error } = await getDocumentDetails(targetDocId)
    if (error || !data) return

    const parsed = parseManualPayload(data.description)
    const nextRecipientName = parsed?.recipient?.name || data.orders?.profiles?.display_name || data.orders?.profiles?.email || ''
    const nextRecipientPhone = parsed?.recipient?.phone || data.orders?.profiles?.phone || ''
    const nextRecipientAddress = parsed?.recipient?.address || data.orders?.houses?.address || data.orders?.profiles?.address || ''
    const nextRecipientTaxId = parsed?.recipient?.tax_id || parsed?.recipient?.taxId || ''
    const nextProjectName = parsed?.project_name || data.orders?.services?.service_name || ''

    setRecipientName(nextRecipientName)
    setRecipientPhone(nextRecipientPhone)
    setRecipientAddress(nextRecipientAddress)
    setRecipientTaxId(nextRecipientTaxId)
    setProjectName(nextProjectName)
    setSourceOrderId(parsed?.source_order_id || data.order_id || '')
    setSourceCustomerId(parsed?.source_customer_id || data.orders?.customer_id || '')
    setSourceHouseId(parsed?.source_house_id || data.orders?.house_id || '')
    setContractFormFields((prev) => ({
      ...prev,
      invoice_reference_code: data.document_code || prev.invoice_reference_code,
      signing_location: nextRecipientAddress || prev.signing_location,
      project_location: nextRecipientAddress || prev.project_location,
      quotation_attachment_pages: prev.quotation_attachment_pages || '1',
    }))
  }

  const applySystemSettingsToContract = () => {
    setContractFormFields((prev) => ({
      ...prev,
      contractor_company_name: systemCompanyInfo.contract_company_name?.trim() || systemCompanyInfo.name_th?.trim() || prev.contractor_company_name,
      contractor_company_address: systemCompanyInfo.contract_company_address?.trim() || systemCompanyInfo.address?.trim() || prev.contractor_company_address,
      contractor_company_tax_id: systemCompanyInfo.contract_company_tax_id?.trim() || systemCompanyInfo.tax_id?.trim() || prev.contractor_company_tax_id,
      contractor_signer_name: systemCompanyInfo.contract_signer_name?.trim() || prev.contractor_signer_name,
      contractor_witness_name: systemCompanyInfo.contract_witness_name?.trim() || prev.contractor_witness_name,
    }))
  }

  const resetContractOverrides = () => {
    setContractFormFields(DEFAULT_CONTRACT_FORM_FIELDS)
  }

  const contractBlockingErrors = useMemo(() => {
    if (docType !== 'contract') return [] as string[]

    const messages: string[] = []
    if (!chainSourceDocumentId) {
      messages.push('กรุณาเลือกใบแจ้งหนี้อ้างอิงจากแถบพรีวิวก่อนบันทึกสัญญา')
    }

    const startDate = contractFormFields.work_start_date ? new Date(contractFormFields.work_start_date) : null
    const endDate = contractFormFields.work_end_date ? new Date(contractFormFields.work_end_date) : null
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
      messages.push('วันเริ่มงานต้องไม่ช้ากว่าวันสิ้นสุดงาน')
    }

    const attachmentFields = [
      ['จำนวนแผ่นใบเสนอราคา', contractFormFields.quotation_attachment_pages],
      ['จำนวนแผ่นใบแจ้งหนี้', contractFormFields.invoice_attachment_pages],
      ['จำนวนสำเนาบัตรผู้ว่าจ้าง', contractFormFields.employer_id_attachment_pages],
      ['จำนวนสำเนาบัตรผู้รับจ้าง', contractFormFields.contractor_id_attachment_pages],
    ] as const

    attachmentFields.forEach(([label, value]) => {
      const raw = String(value || '').trim()
      if (!raw) return
      const numeric = Number(raw)
      if (!Number.isFinite(numeric) || numeric <= 0) {
        messages.push(`${label} ต้องเป็นตัวเลขมากกว่า 0`)
      }
    })

    return messages
  }, [chainSourceDocumentId, contractFormFields, docType])

  useEffect(() => {
    const run = async () => {
      if (!sourceCustomerId) {
        setHouses([])
        setSourceHouseId('')
        return
      }

      setHousesLoading(true)
      const { data, error } = await getCustomerHouses(sourceCustomerId)
      if (!error && Array.isArray(data)) {
        setHouses(data)
      } else {
        setHouses([])
      }
      setHousesLoading(false)
    }

    run()
  }, [sourceCustomerId])

  useEffect(() => {
    const run = async () => {
      if (!profile?.id || profile.role !== 'admin') return
      const [plantCatalogResult, documentCatalogResult, spacingResult] = await Promise.all([
        getPlantLibraryVariants(),
        getDocumentItemCatalog(),
        getPlantingSpacingReferences(),
      ])

      if (!plantCatalogResult.error || !documentCatalogResult.error) {
        const mappedUnifiedCatalog: DocumentItemCatalogEntry[] = (Array.isArray(plantCatalogResult.data) ? plantCatalogResult.data : []).map((entry) => {
          const categoryDefaults = getDocumentCategoryDefaults(undefined, undefined, entry.category, entry.item_category, entry.size_mode)
          return {
          id: entry.document_item_catalog_id || entry.marketplace_plant_id || entry.id,
          item_name: String(entry.item_name || '').trim() || 'Unnamed Plant',
          english_name: String(entry.english_name || '').trim() || undefined,
          scientific_name: String(entry.scientific_name || '').trim() || undefined,
          size_label: String(entry.size_label || '').trim() || undefined,
          main_category: categoryDefaults.mainCategory,
          subcategory: categoryDefaults.subcategory,
          item_category: normalizeItemCategory(entry.item_category, entry.size_mode, entry.category),
          size_mode: entry.size_mode || 'other',
          unit: String(entry.unit || '').trim() || 'ต้น',
          material_price: Number(entry.material_price) > 0 ? Number(entry.material_price) : Number(entry.preferred_price) || 0,
          labor_price: Number(entry.labor_price) || 0,
          image_url: resolvePlantImageUrl(entry.image_url || ''),
          normalized_name: normalizeCatalogQuery(entry.item_name),
          normalized_english_name: normalizeCatalogQuery(entry.english_name),
          normalized_scientific_name: normalizeCatalogQuery(entry.scientific_name),
          normalized_size_label: normalizeCatalogQuery(entry.size_label),
          normalized_unit: normalizeCatalogQuery(entry.unit || 'ต้น'),
          last_total_price: (Number(entry.material_price) > 0 ? Number(entry.material_price) : Number(entry.preferred_price) || 0) + (Number(entry.labor_price) || 0),
          usage_count: 0,
          created_at: String(entry.created_at || new Date().toISOString()),
          updated_at: String(entry.updated_at || new Date().toISOString()),
        }})

        const manualCatalog = Array.isArray(documentCatalogResult.data) ? documentCatalogResult.data : []
        const mergedCatalogMap = new Map<string, DocumentItemCatalogEntry>()

        ;[...mappedUnifiedCatalog, ...manualCatalog].forEach((entry) => {
          mergedCatalogMap.set(buildCatalogIdentityKey(entry), entry)
        })

        setItemCatalog(Array.from(mergedCatalogMap.values()).sort((a, b) => {
          return (Number(b.usage_count) || 0) - (Number(a.usage_count) || 0)
        }))
      }

      if (!spacingResult.error && Array.isArray(spacingResult.data)) {
        setSpacingReferences(spacingResult.data)
      }

      const { data: recentManualDocs, error: recentDocsError } = await supabase
        .from('documents')
        .select('description')
        .in('type', ['quotation', 'invoice', 'receipt'])
        .order('created_at', { ascending: false })
        .limit(250)

      if (!recentDocsError && Array.isArray(recentManualDocs)) {
        const detailsFromSystem = recentManualDocs.flatMap((row: any) => {
          const payload = parseManualPayload(row?.description)
          if (!payload) return [] as string[]

          return extractSourceItems(payload, null)
            .map((item) => String(item?.detail || '').trim())
            .filter(Boolean)
        })

        if (detailsFromSystem.length > 0) {
          persistItemDetailSuggestions(detailsFromSystem)
        }
      }
    }

    run()
  }, [profile])

  const getDensityBySpacing = (spacing: number) => {
    if (spacing <= 0) return 0

    const matched = spacingReferences.find((row) => Math.abs(Number(row.spacing_meter) - spacing) < 0.0001)
    if (matched && Number(matched.plants_per_sqm) > 0) {
      return Number(matched.plants_per_sqm)
    }

    return 1 / (spacing * spacing)
  }

  const calculateAutoQuantity = (item: ItemRow) => {
    if (item.area_sqm <= 0 || item.spacing_x <= 0) return item.quantity
    const density = getDensityBySpacing(item.spacing_x)
    if (!Number.isFinite(density) || density <= 0) return item.quantity
    return Math.max(1, Math.ceil(item.area_sqm * density))
  }

  const applySpacingToItem = (item: ItemRow, spacing: number) => {
    item.size_mode = 'shrub'
    item.item_category = deriveItemCategoryFromSizeMode('shrub', item.item_category)
    item.shrub_size_style = 'height_spacing'
    item.spacing_x = spacing
    item.spacing_y = spacing
    item.size = buildSizeLabelByMode(item)
    if (item.area_sqm > 0 && spacing > 0) {
      item.quantity = calculateAutoQuantity(item)
    }
  }



  useEffect(() => {
     if (docType !== 'receipt' || !chainSourceDocumentId) {
         setReceiptInstallments([])
         return
     }
     const run = async () => {
        const { data } = await getDocumentDetails(chainSourceDocumentId)
        if (!data) return
        const parsed = parseManualPayload(data.description)
        if (Array.isArray(parsed?.installments) && parsed.installments.length > 0) {
            setReceiptInstallments(parsed.installments.map((it:any) => ({
                id: it.id,
                label: it.label,
                due_at: it.due_at,
            due_scope: String(it?.due_scope || ''),
                computed_amount: Number(it.amount), // In invoice payload, 'amount' is the computed amount
                amount: Number(it.amount),
                percent: Number(it.percent)
            })))
        } else {
            setReceiptInstallments([])
        }
     }
     void run()
  }, [docType, chainSourceDocumentId])



  const handleSelectOrder = (orderId: string) => {
    setSourceOrderId(orderId)
    const selected = orders.find((o) => o.id === orderId)
    if (!selected) return

    setRecipientName(selected?.profiles?.display_name || selected?.profiles?.email || '')
    setRecipientPhone(selected?.profiles?.phone || '')
    setRecipientAddress(selected?.houses?.address || selected?.profiles?.address || '')
    setRecipientTaxId('')
    setProjectName(selected?.services?.service_name || '')
    setZones(mapOrderToZones(selected))
    setShowZones(false)
    setSourceCustomerId(selected?.customer_id || '')
    setSourceHouseId(selected?.house_id || '')
  }

  const handleSelectCustomer = (customerId: string) => {
    setSourceCustomerId(customerId)
    setSourceHouseId('')

    const selected = customers.find((c) => c.id === customerId)
    if (!selected) return

    setSourceOrderId('')
    setRecipientName(selected.display_name || selected.email || '')
    setRecipientPhone(selected.phone || '')
    setRecipientAddress(selected.address || '')
    setRecipientTaxId('')
  }

  const syncCustomerFromInput = (value: string) => {
    const normalized = value.trim().toLowerCase()
    if (!normalized) {
      setSourceCustomerId('')
      return
    }

    const selected = customers.find((customer) => {
      const displayName = String(customer.display_name || '').trim().toLowerCase()
      const email = String(customer.email || '').trim().toLowerCase()
      return displayName === normalized || email === normalized
    })

    if (!selected) {
      setSourceCustomerId('')
      return
    }

    handleSelectCustomer(selected.id)
  }

  const handleSelectHouse = (houseId: string) => {
    setSourceHouseId(houseId)
    const selected = houses.find((h) => h.id === houseId)
    if (!selected) return

    if (selected.address) setRecipientAddress(selected.address)
    if (!projectName.trim()) setProjectName(selected.name || '')
  }

  const applyCatalogEntryToRow = (zIdx: number, cIdx: number, iIdx: number, matched: Partial<DocumentItemCatalogEntry>) => {
    const nz = [...zones]
    const category = nz[zIdx]?.categories?.[cIdx]
    const item = nz[zIdx]?.categories?.[cIdx]?.items?.[iIdx]
    if (!item || !category) return

    let categoryMain = category.main_category
    let categorySub = category.subcategory
    if (matched.main_category || matched.subcategory) {
      const categoryDefaults = getDocumentCategoryDefaults(
        matched.main_category,
        matched.subcategory,
        matched.item_name,
        matched.item_category,
        matched.size_mode
      )
      categoryMain = categoryDefaults.mainCategory
      categorySub = categoryDefaults.subcategory
      category.main_category = categoryMain
      category.subcategory = categorySub
      category.name = getCategoryDisplayName(categoryMain, categorySub)
    }

    let nextItem = applyCategoryDefaultsToItem(item, categoryMain, categorySub)

    if (matched.item_name !== undefined) nextItem.description = matched.item_name || nextItem.description
    if (matched.english_name !== undefined) nextItem.english_name = matched.english_name || ''
    if (matched.image_url !== undefined) nextItem.image_url = resolvePlantImageUrl(matched.image_url || '')
    if (matched.scientific_name !== undefined) nextItem.spec = matched.scientific_name || ''
    if (matched.size_label !== undefined) {
      nextItem = applySizeLabelForMode(nextItem, matched.size_label, nextItem.size_mode)
    }
    if (matched.unit !== undefined) nextItem.unit = matched.unit || nextItem.unit
    if (matched.material_price !== undefined) nextItem.unit_price_material = Number(matched.material_price) || 0
    if (matched.labor_price !== undefined) nextItem.unit_price_labor = Number(matched.labor_price) || nextItem.unit_price_labor

    nz[zIdx].categories[cIdx].items[iIdx] = nextItem

    setZones(nz)
  }

  const applyCatalogItemToRow = (zIdx: number, cIdx: number, iIdx: number, description: string, mode: 'typing' | 'blur' = 'typing') => {
    const normalized = normalizeCatalogQuery(description)
    if (!normalized) return

    const suggestions = getCatalogSuggestions(itemCatalog, normalized, 3)
    if (!suggestions.length) return

    const top = suggestions[0]
    const second = suggestions[1]
    const isConfident = mode === 'blur'
      ? top._score >= 90 || (top._score >= 70 && (!second || top._score - second._score >= 15))
      : top._score >= 115

    const matched = isConfident ? top : null
    if (!matched) return

    applyCatalogEntryToRow(zIdx, cIdx, iIdx, matched)
  }

  // Calculations
  const subTotalZones = useMemo(() => {
    return zones.reduce((sum: number, z: ZoneRow) =>
      sum + z.categories.reduce((cSum: number, c: CategoryRow) => {
        const materialSubtotal = c.items.reduce((iSum: number, i: ItemRow) => {
          const qty = Number.isFinite(i.quantity) ? i.quantity : 0
          const mat = Number.isFinite(i.unit_price_material) ? i.unit_price_material : 0
          return iSum + (qty * mat)
        }, 0)
        
        const laborSubtotal = c.items.reduce((iSum: number, i: ItemRow) => {
          const qty = Number.isFinite(i.quantity) ? i.quantity : 0
          const lab = Number.isFinite(i.unit_price_labor) ? i.unit_price_labor : 0
          return iSum + (qty * lab)
        }, 0)

        // If labor_percentage is used, the items' unit_price_labor are already updated to match it.
        // We do not add categoryLaborPercentageCost separately to avoid double-counting.
        return cSum + materialSubtotal + laborSubtotal
      }, 0)
      , 0)
  }, [zones])

  const overheadAmount = useMemo(() => (showOverhead ? subTotalZones * (overheadRate / 100) : 0), [subTotalZones, overheadRate, showOverhead])
  const globalLaborAmount = useMemo(() => (showGlobalLabor ? subTotalZones * (globalLaborRate / 100) : 0), [subTotalZones, globalLaborRate, showGlobalLabor])
  const subTotalWithOverhead = useMemo(() => subTotalZones + overheadAmount + globalLaborAmount, [subTotalZones, overheadAmount, globalLaborAmount])
  const normalizedDiscountValue = useMemo(() => {
    const rawValue = Number.isFinite(discountAmount) ? discountAmount : 0
    if (discountType === 'percent') {
      return Math.min(Math.max(rawValue, 0), 100)
    }
    return Math.max(rawValue, 0)
  }, [discountAmount, discountType])
  const appliedDiscountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.min(subTotalWithOverhead * (normalizedDiscountValue / 100), subTotalWithOverhead)
    }
    return Math.min(normalizedDiscountValue, subTotalWithOverhead)
  }, [discountType, normalizedDiscountValue, subTotalWithOverhead])
  const discountedSubtotal = useMemo(() => Math.max(subTotalWithOverhead - appliedDiscountAmount, 0), [subTotalWithOverhead, appliedDiscountAmount])
  const vatAmount = useMemo(() => (showVat ? discountedSubtotal * (vatRate / 100) : 0), [discountedSubtotal, vatRate, showVat])
  const beforeWithholdingTotal = useMemo(() => discountedSubtotal + vatAmount, [discountedSubtotal, vatAmount])
  const withholdingTaxAmount = useMemo(() => (showWithholdingTax ? beforeWithholdingTotal * (withholdingRate / 100) : 0), [beforeWithholdingTotal, withholdingRate, showWithholdingTax])
  const grandTotal = useMemo(() => Math.max(beforeWithholdingTotal - withholdingTaxAmount, 0), [beforeWithholdingTotal, withholdingTaxAmount])

  // Installments calculations
  const percentSum = useMemo(() => installments.reduce((sum: number, it: InstallmentRow) => sum + (Number(it.percent) || 0), 0), [installments])

  // Helper for computing installments
  const computedInstallments = useMemo(() => {
    if (!split) return []
    if (installments.length === 0) return []

    const totalToSplit = grandTotal
    
    // Safety check loop
    return installments.map((it, idx) => {
      let val = 0
      if (installmentMode === 'percent') {
        const p = Number(it.percent) || 0
        // Round to 2 decimals
        val = Math.round((totalToSplit * p) / 100 * 100) / 100
      } else {
        val = Number(it.amount) || 0
      }

      // If last item in percent mode, adjust to match exact total
      if (installmentMode === 'percent' && idx === installments.length - 1) {
         const sumPrev = installments.slice(0, idx).reduce((acc, curr) => {
             const prevP = Number(curr.percent) || 0
             return acc + Math.round((totalToSplit * prevP) / 100 * 100) / 100
         }, 0)
         val = Math.max(0, totalToSplit - sumPrev)
      }

      return {
          ...it,
          computed_amount: val
      }
    })
  }, [split, installments, grandTotal, installmentMode])
  const installmentSum = useMemo(
    () => computedInstallments.reduce((sum: number, it: any) => sum + (Number(it.computed_amount) || 0), 0),
    [computedInstallments]
  )

  // Use memo only for derived selected installmnets
  const selectedReceiptInstallments = useMemo(() => {
    if (receiptPaymentScope !== 'installments') return [] as Array<InstallmentRow & { computed_amount: number }>
    // receiptInstallments is now a state
    const selected = new Set(selectedReceiptInstallmentIds)
    return receiptInstallments.filter((it) => selected.has(it.id))
  }, [receiptInstallments, receiptPaymentScope, selectedReceiptInstallmentIds])

  const receiptConfigEnabled = docType === 'receipt' || docType === 'invoice'

    useEffect(() => {
    if (docType === 'receipt') {
        if (receiptPaymentScope === 'full') {
             setReceiptPaidAmount(grandTotal)
        } else {
            const sum = receiptInstallments
                .filter(it => selectedReceiptInstallmentIds.includes(it.id))
                .reduce((acc, it) => acc + (Number(it.computed_amount)||0), 0)
            setReceiptPaidAmount(sum)
        }
    }
  }, [docType, receiptPaymentScope, selectedReceiptInstallmentIds, receiptInstallments, grandTotal])

  // Removed memoized receiptPaidAmount as it is now useState
  
  // Logic to auto-select if needed
  useEffect(() => {
    if (!receiptConfigEnabled) return
    if (!receiptInstallments.length) {
      // If no installments, force full payment? Or just clear selection
      // But if we are in 'receipt', we usually default to full unless changed.
       if (docType === 'receipt') {
           // Keep user setting or default
       }
      return
    }
  }, [receiptConfigEnabled, receiptInstallments, docType])

  const scrollToError = (elementId?: string) => {
    if (!elementId) return
    const el = document.getElementById(elementId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => {
        el.focus()
        // If it's a standard input, highlight it briefly
        el.classList.add('ring-2', 'ring-red-500')
        setTimeout(() => el.classList.remove('ring-2', 'ring-red-500'), 2000)
      }, 500)
    }
  }

  const formatTHB = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const validationErrors = useMemo(() => {
    const errors: { message: string; elementId?: string }[] = []

    const checkItems = () => {
      if (zones.length === 0) {
        errors.push({ message: 'กรุณาเพิ่มอย่างน้อย 1 โซน' })
        return
      }
      zones.forEach((z, zIdx) => {
        if (showZones && !z.name.trim()) {
          errors.push({ message: `โซนที่ ${zIdx + 1}: กรุณากรอกชื่อโซน`, elementId: `zone-name-${z.id}` })
        }
        if (z.categories.length === 0) {
          errors.push({ message: `โซน ${z.name || zIdx + 1}: กรุณาเพิ่มอย่างน้อย 1 หมวดหมู่` })
        }
        z.categories.forEach((c, cIdx) => {
          if (showZones && !c.name.trim()) {
            errors.push({ message: `โซน ${z.name || zIdx + 1}, หมวดหมู่ที่ ${cIdx + 1}: กรุณากรอกชื่อหมวดหมู่`, elementId: `cat-name-${c.id}` })
          }
          if (c.labor_percentage !== undefined && isNaN(Number(c.labor_percentage))) {
            errors.push({ 
              message: `หมวดหมู่ ${c.name || cIdx + 1}: ค่าแรง (%) ต้องเป็นตัวเลข`, 
              elementId: `cat-labor-${c.id}` 
            })
          }
          if (c.items.length === 0) {
            errors.push({ message: `หมวดหมู่ ${c.name || cIdx + 1}: กรุณาเพิ่มอย่างน้อย 1 รายการ` })
          }
          c.items.forEach((i, iIdx) => {
            if (!i.description.trim()) {
              errors.push({ 
                message: `หมวดหมู่ ${c.name || cIdx + 1}: กรุณากรอกชื่อรายการลำดับที่ ${iIdx + 1}`, 
                elementId: `item-desc-${zIdx}-${cIdx}-${iIdx}` 
              })
            }
            if (i.quantity <= 0) {
              errors.push({ 
                message: `หมวดหมู่ ${c.name || cIdx + 1}: รายการ "${i.description || iIdx + 1}" ต้องมีจำนวนมากกว่า 0`, 
                elementId: `item-qty-${zIdx}-${cIdx}-${iIdx}` 
              })
            }
          })
        })
      })
    }

    switch (docType) {
      case 'plant_material': {
        if (!recipientName.trim()) errors.push({ message: 'กรุณากรอกชื่อลูกค้า/ผู้รับเอกสาร', elementId: 'recipient-name' })
        if (!chainSourceDocumentId) errors.push({ message: 'กรุณาเลือกเอกสารอ้างอิง', elementId: 'source-doc-select' })
        
        const allItems = zones.flatMap((zone) =>
          zone.categories.flatMap((category) => category.items || [])
        )
        const hasTreeOrShrub = allItems.some((item) => item.size_mode === 'tree' || item.size_mode === 'shrub')
        if (allItems.length === 0) {
          errors.push({ message: 'กรุณาเพิ่มรายการสินค้า' })
        } else if (!hasTreeOrShrub) {
          errors.push({ message: 'เอกสารพืชต้องมีรายการต้นไม้หรือไม้พุ่มอย่างน้อย 1 รายการ' })
        }
        checkItems()
        break
      }
      case 'invoice': {
        const isInvoiceFromQuotationPreset = shouldUseSourcePreset && !!chainSourceDocumentId
        const effectiveInvoiceSplit = split && !(isInvoiceFromQuotationPreset && presetPaymentPlanParam === 'full')
        
        if (!effectiveInvoiceSplit && !dueAt) {
          errors.push({ message: 'กรุณาระบุวันครบกำหนดชำระ', elementId: 'due-at' })
        }
        
        if (effectiveInvoiceSplit) {
          if (installments.length === 0) {
            errors.push({ message: 'กรุณาเพิ่มงวดการชำระเงิน' })
          } else {
            installments.forEach((it, idx) => {
              if (!String(it.due_at || '').trim()) {
                errors.push({ message: `งวดที่ ${idx + 1}: กรุณาระบุวันที่ครบกำหนด`, elementId: `inst-date-${it.id}` })
              }
              const val = installmentMode === 'amount' ? (Number(it.amount) || 0) : (Number(it.percent) || 0)
              if (val <= 0) {
                errors.push({ message: `งวดที่ ${idx + 1}: จำนวนเงิน/เปอร์เซ็นต์ต้องมากกว่า 0`, elementId: installmentMode === 'amount' ? `inst-amount-${it.id}` : `inst-percent-${it.id}` })
              }
            })
            
            // NOTE: installment-amount mismatch is shown as a UI warning (not a blocking error)
            // because changing labor_percentage updates grandTotal but not existing installment amounts.
            // Blocking save here creates a deadlock. The warning at line ~5711 informs the user.
            if (installmentMode === 'percent' && Math.abs(percentSum - 100) > 0.0001) {
              errors.push({ message: `ยอดรวมเปอร์เซ็นต์ทุกงวด (${percentSum}%) ไม่เท่ากับ 100%` })
            }
          }
        }
        break
      }
      case 'receipt': {
        if (!paidAt) errors.push({ message: 'กรุณาระบุวันที่รับชำระ', elementId: 'paid-at' })
        if (receiptPaymentScope === 'installments' && receiptInstallments.length > 0 && selectedReceiptInstallmentIds.length === 0) {
          errors.push({ message: 'กรุณาเลือกงวดที่รับชำระ' })
        }
        if (!Number.isFinite(receiptPaidAmount) || receiptPaidAmount <= 0) {
          errors.push({ message: 'ยอดเงินที่รับชำระต้องมากกว่า 0', elementId: 'receipt-paid-amount' })
        }
        if (!receiptPaymentMethod) errors.push({ message: 'กรุณาเลือกวิธีการชำระเงิน', elementId: 'receipt-payment-method' })
        if (receiptEligibilityReason) errors.push({ message: receiptEligibilityReason })
        break
      }
      case 'contract': {
        contractBlockingErrors.forEach(msg => errors.push({ message: msg }))
        break
      }
      case 'quotation':
      default: {
        if (!recipientName.trim()) errors.push({ message: 'กรุณากรอกชื่อลูกค้า/ผู้รับเอกสาร', elementId: 'recipient-name' })
        checkItems()
        
        if (split) {
          if (installments.length === 0) {
            errors.push({ message: 'กรุณาเพิ่มงวดการชำระเงิน' })
          } else {
            installments.forEach((it, idx) => {
              const val = installmentMode === 'amount' ? (Number(it.amount) || 0) : (Number(it.percent) || 0)
              if (val <= 0) {
                errors.push({ message: `งวดที่ ${idx + 1}: จำนวนเงิน/เปอร์เซ็นต์ต้องมากกว่า 0`, elementId: installmentMode === 'amount' ? `inst-amount-${it.id}` : `inst-percent-${it.id}` })
              }
            })
            // NOTE: installment-amount mismatch is a soft UI warning only — not a blocking error.
            // See reason above (invoice case same deadlock risk when labor_percentage changes).
            if (installmentMode === 'percent') {
              if (Math.abs(percentSum - 100) > 0.0001) {
                errors.push({ message: `ยอดรวมเปอร์เซ็นต์ทุกงวด (${percentSum}%) ไม่เท่ากับ 100%` })
              }
              if (Math.abs(installmentSum - grandTotal) > 0.1) {
                errors.push({ message: `ยอดเงินรวมทุกงวด (${formatTHB(installmentSum)}) ไม่ตรงกับยอดรวมสุทธิ (${formatTHB(grandTotal)})` })
              }
            }
          }
        }
        break
      }
    }
    return errors
  }, [recipientName, zones, showZones, split, installments, installmentMode, installmentSum, grandTotal, percentSum, docType, paidAt, receiptPaymentScope, receiptInstallments.length, selectedReceiptInstallmentIds.length, receiptPaidAmount, receiptPaymentMethod, chainSourceDocumentId, receiptEligibilityReason, shouldUseSourcePreset, presetPaymentPlanParam, dueAt, contractBlockingErrors])

  const isValid = validationErrors.length === 0

  const sanitizeFilePart = (value: string) => value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[\\/:*?"<>|#%&{}$!'@+=`~]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')

  const autoResizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  // Zone Operations
  const addZone = () => setZones((prev) => [...prev, newZone(prev.length + 1)])
  const removeZone = (zId: string) => setZones((prev) => prev.filter(z => z.id !== zId))
  const updateZone = (zId: string, name: string) => setZones((prev) => prev.map(z => z.id === zId ? { ...z, name } : z))

  // Category Operations
  const addCategory = (zId: string) => setZones((prev) => prev.map(z => {
    if (z.id !== zId) return z
    return { ...z, categories: [...z.categories, newCategory(z.categories.length + 1)] }
  }))
  const removeCategory = (zId: string, cId: string) => setZones((prev) => prev.map(z => {
    if (z.id !== zId) return z
    return { ...z, categories: z.categories.filter(c => c.id !== cId) }
  }))
  const updateCategory = (zId: string, cId: string, name: string) => setZones((prev) => prev.map(z => {
    if (z.id !== zId) return z
    return { ...z, categories: z.categories.map(c => c.id === cId ? { ...c, name } : c) }
  }))

  const updateCategorySelection = (
    zId: string,
    cId: string,
    mainCategory: DocumentCatalogMainCategory,
    subcategory?: DocumentCatalogSubcategory
  ) => setZones((prev) => prev.map((zone) => {
    if (zone.id !== zId) return zone
    return {
      ...zone,
      categories: zone.categories.map((category) => {
        if (category.id !== cId) return category
        const defaults = getDocumentCategoryDefaults(
          mainCategory,
          subcategory || category.subcategory,
          category.name,
          category.items[0]?.item_category,
          category.items[0]?.size_mode
        )
        return {
          ...category,
          name: getCategoryDisplayName(defaults.mainCategory, defaults.subcategory),
          main_category: defaults.mainCategory,
          subcategory: defaults.subcategory,
          items: category.items.map((item) => applyCategoryDefaultsToItem(item, defaults.mainCategory, defaults.subcategory)),
        }
      })
    }
  }))

  // Item Operations
  const addItem = (zId: string, cId: string) => setZones((prev) => prev.map(z => {
    if (z.id !== zId) return z
    return {
      ...z, categories: z.categories.map(c => {
        if (c.id !== cId) return c
        return { ...c, items: [...c.items, newItem(c.main_category, c.subcategory)] }
      })
    }
  }))
  const removeItem = (zId: string, cId: string, iId: string) => setZones((prev) => prev.map(z => {
    if (z.id !== zId) return z
    return {
      ...z, categories: z.categories.map(c => {
        if (c.id !== cId) return c
        return { ...c, items: c.items.filter(i => i.id !== iId) }
      })
    }
  }))
  const updateItem = (zId: string, cId: string, iId: string, patch: Partial<ItemRow>) => setZones((prev) => prev.map(z => {
    if (z.id !== zId) return z
    return {
      ...z, categories: z.categories.map(c => {
        if (c.id !== cId) return c
        return { ...c, items: c.items.map(i => i.id === iId ? { ...i, ...patch } : i) }
      })
    }
  }))

  // Installments Operations
  const updateInstallment = (id: string, patch: Partial<InstallmentRow>) => {
    setInstallments((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }
  const addInstallment = () => setInstallments((prev) => [...prev, newInstallment(prev.length + 1)])
  const removeInstallment = (id: string) => setInstallments((prev) => (prev.length <= 1 ? prev : prev.filter((it) => it.id !== id)))

  const addCondition = () => setConditions((prev) => [...prev, newCondition('', true)])
  const removeCondition = (id: string) => setConditions((prev) => prev.filter((c) => c.id !== id))
  const toggleCondition = (id: string) => setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)))
  const updateConditionText = (id: string, text: string) => setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, text } : c)))

  const movePlantLayoutCard = (sourceKey: string, targetKey: string) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return

    setPlantLayoutOrder((prev) => {
      const baseOrder = normalizePlantLayoutOrder(plantLayoutPreviewBaseCards, prev)
      const nextOrder = [...baseOrder]
      const fromIndex = nextOrder.indexOf(sourceKey)
      const toIndex = nextOrder.indexOf(targetKey)

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return prev
      }

      const [moved] = nextOrder.splice(fromIndex, 1)
      nextOrder.splice(toIndex, 0, moved)
      return nextOrder
    })
  }

  const resetPlantLayoutOrder = () => {
    setPlantLayoutOrder(plantLayoutPreviewBaseCards.map((card) => card.key))
    setDraggingPlantCardKey(null)
    setPlantLayoutReorderMode(false)
  }

  const applyPlantLayoutPreset = (presetKey: PlantLayoutPresetKey) => {
    setPlantLayoutSettings((prev) => buildPlantLayoutPresetSettings(presetKey, prev))
  }

  const applyPlantAutoLayout = () => {
    setPlantLayoutSettings(buildAutoPlantLayoutSettings(plantMaterialPreviewCards))
  }

  const selectPlantEditSurface = (cardKey: string, surface: PlantLayoutEditSurfaceKey) => {
    setSelectedPlantCardKey(cardKey)
    setActivePlantEditSurface({ cardKey, surface })
  }

  const isPlantLayoutSyncEnabledForCard = (cardKey: string) => plantLayoutSyncSourceKey === cardKey

  const resolvePlantLayoutSyncTargetCardKeys = (cardKey: string) => {
    if (plantLayoutSyncSourceKey !== cardKey) {
      return [cardKey]
    }

    return plantMaterialPreviewCards.map((card) => card.key)
  }

  const togglePlantLayoutSyncSource = (cardKey: string) => {
    setSelectedPlantCardKey(cardKey)
    const isSameSelection = plantLayoutSyncSourceKey === cardKey

    if (isSameSelection) {
      setPlantLayoutSyncSourceKey(null)
      return
    }

    setPlantLayoutSettings((prev) => {
      const normalized = normalizePlantLayoutSettings(prev)
      const sourceLayout = resolvePlantLayoutCardTuning(normalized, cardKey)
      const targetCardKeys = plantMaterialPreviewCards.map((card) => card.key)
      const nextCards = { ...normalized.cards }

      for (const targetCardKey of targetCardKeys) {
        nextCards[targetCardKey] = {
          ...sourceLayout,
        }
      }

      return normalizePlantLayoutSettings({
        ...normalized,
        cards: nextCards,
      })
    })

    setPlantLayoutSyncSourceKey(cardKey)
  }

  const updatePlantCardLayoutValue = (cardKey: string, key: PlantLayoutDragHandleKey, nextValue: number) => {
    const clampedValue = clampPlantLayoutValue(key, nextValue)

    setPlantLayoutSettings((prev) => {
      const targetCardKeys = resolvePlantLayoutSyncTargetCardKeys(cardKey)
      const nextCards = { ...prev.cards }

      for (const targetCardKey of targetCardKeys) {
        nextCards[targetCardKey] = {
          ...(nextCards[targetCardKey] || {}),
          [key]: clampedValue,
        }
      }

      return normalizePlantLayoutSettings({
        ...prev,
        cards: nextCards,
      })
    })
  }

  const resetPlantCardLayoutValue = (cardKey: string, key: PlantLayoutDragHandleKey) => {
    setPlantLayoutSettings((prev) => {
      const nextCards = { ...prev.cards }
      const targetCardKeys = resolvePlantLayoutSyncTargetCardKeys(cardKey)

      for (const targetCardKey of targetCardKeys) {
        const nextCard: Partial<PlantLayoutCardTuning> = { ...(nextCards[targetCardKey] || {}) }
        delete nextCard[key]

        if (Object.keys(nextCard).length === 0) {
          delete nextCards[targetCardKey]
        } else {
          nextCards[targetCardKey] = nextCard
        }
      }

      return normalizePlantLayoutSettings({
        ...prev,
        cards: nextCards,
      })
    })
  }

  const beginPlantLayoutHandleDrag = (cardKey: string, key: PlantLayoutDragHandleKey, currentValue: number, event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setSelectedPlantCardKey(cardKey)
    plantLayoutDragRef.current = {
      cardKey,
      key,
      startY: event.clientY,
      startValue: currentValue,
    }
    setActivePlantLayoutHandle(key)
  }

  const resetSelectedPlantCardLayout = () => {
    if (!selectedPlantCardKey) return

    setPlantLayoutSettings((prev) => {
      const nextCards = { ...prev.cards }
      delete nextCards[selectedPlantCardKey]
      return normalizePlantLayoutSettings({
        ...prev,
        cards: nextCards,
      })
    })

    if (plantLayoutSyncSourceKey === selectedPlantCardKey) {
      setPlantLayoutSyncSourceKey(null)
    }
  }

  const resetPlantLayoutSettings = () => {
    setPlantLayoutSettings(DEFAULT_PLANT_LAYOUT_SETTINGS)
    setSelectedPlantCardKey(null)
    setPlantLayoutSyncSourceKey(null)
  }

  const updatePlantLayoutPageSetting = (pageIndex: number, key: 'columns' | 'rows', delta: number) => {
    setPlantLayoutSettings((prev) => {
      const normalized = normalizePlantLayoutSettings(prev)
      const current = resolvePlantLayoutPageSettings(normalized, pageIndex)
      const nextValue = key === 'columns'
        ? Math.min(4, Math.max(1, current.columns + delta))
        : Math.min(6, Math.max(1, current.rows + delta))
      const nextPages = {
        ...normalized.pages,
        [String(pageIndex)]: {
          ...current,
          [key]: nextValue,
        },
      }
      return normalizePlantLayoutSettings({
        ...normalized,
        pages: nextPages,
      })
    })
  }

  const resetPlantLayoutPageSetting = (pageIndex: number) => {
    setPlantLayoutSettings((prev) => {
      const normalized = normalizePlantLayoutSettings(prev)
      const nextPages = { ...normalized.pages }
      delete nextPages[String(pageIndex)]
      return normalizePlantLayoutSettings({
        ...normalized,
        pages: nextPages,
      })
    })
  }

  useEffect(() => {
    if (!activePlantLayoutHandle) return

    const handleMouseMove = (event: MouseEvent) => {
      const dragState = plantLayoutDragRef.current
      if (!dragState) return

      const deltaY = event.clientY - dragState.startY
      const nextValue = clampPlantLayoutValue(dragState.key, dragState.startValue + deltaY)
      updatePlantCardLayoutValue(dragState.cardKey, dragState.key, nextValue)
    }

    const handleMouseUp = () => {
      plantLayoutDragRef.current = null
      setActivePlantLayoutHandle(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [activePlantLayoutHandle])

  const handleDownload = async (overrideInstallmentId?: string, downloadOptions?: { isCopy?: boolean; includeCopy?: boolean }) => {
    if (generatingPdf || !editingDocId) return
    if (!isReceiptDownloadReady) {
      setError('ใบเสร็จยังดาวน์โหลดไม่ได้: กรุณาระบุวิธีชำระเงิน วันที่รับชำระ และงวดที่ชำระให้ครบก่อน')
      return
    }
    setGeneratingPdf(true)
    try {
      const { data, error } = await getDocumentDetails(editingDocId)
      if (error || !data) throw error || new Error('ไม่สามารถดาวน์โหลดเอกสารได้')

      const persistedPayload = parseManualPayload(data.description)
      const invoiceSplitActive = docType === 'invoice' && split && !(isInvoiceFromQuotationFlow && presetPaymentPlanParam === 'full')
      const effectiveInvoiceDueAt = docType === 'invoice'
        ? (invoiceSplitActive
            ? (selectedDownloadInstallmentMeta?.due_at || selectedInvoiceInstallmentMeta?.due_at || dueAt || '')
            : dueAt)
        : ''
      const runtimePayload = buildManualPayload({
        currentInstallmentMeta: selectedDownloadInstallmentMeta || selectedInvoiceInstallmentMeta || null,
        effectiveInvoiceDueAt,
      })
      const payload = data.type === 'plant_material'
        ? (persistedPayload || runtimePayload)
        : {
            ...persistedPayload,
            ...runtimePayload,
          }

      if (data.type === 'invoice' && Array.isArray(payload?.installments) && payload.installments.length > 0) {
        const plan: InstallmentRow[] = payload.installments.map((it: any, idx: number) => ({
          id: String(it?.id || `inst-${idx + 1}`),
          label: String(it?.label || `งวดที่ ${idx + 1}`),
          due_at: String(it?.due_at || '').slice(0, 10),
          amount: Number(it?.amount) || 0,
          percent: Number(it?.percent) || 0,
        }))

        const paidIds = Array.isArray(payload?.paid_installment_ids)
          ? payload.paid_installment_ids.map((id: any) => String(id || '').trim()).filter(Boolean)
          : []
        const paidSet = new Set<string>(paidIds)
        const preferredInstallmentId = String(selectedInvoiceInstallmentId || payload?.current_installment_id || '').trim()
        const preferredInstallment = preferredInstallmentId
          ? plan.find((it) => String(it.id) === preferredInstallmentId) || null
          : null
        const selectedUnpaidInstallment = preferredInstallment && !paidSet.has(String(preferredInstallment.id))
          ? preferredInstallment
          : null
        const nextInstallment = selectedUnpaidInstallment || plan.find((it) => !paidSet.has(String(it.id))) || null
        const isCompleted = paidSet.size >= plan.length

        if (isCompleted) {
          const requestedId = String(overrideInstallmentId || selectedInvoiceDownloadInstallmentId || '').trim()
          const selectedInstallment = (requestedId
            ? plan.find((it) => String(it.id) === requestedId) || null
            : null) || preferredInstallment || plan[0] || null

          if (!selectedInstallment) {
            throw new Error('ไม่พบงวดที่เลือกสำหรับดาวน์โหลด')
          }

          const previewPayload = {
            ...payload,
            current_installment_id: selectedInstallment.id,
            current_installment_label: selectedInstallment.label,
            current_installment_percent: Number(selectedInstallment.percent) || undefined,
            total: Number(selectedInstallment.amount) || 0,
            installment_progress: `ชำระงวดแล้ว ${paidSet.size}/${plan.length}`,
          }

        const { url } = await generateDocumentPdfUrl({
          ...data,
          description: JSON.stringify(previewPayload),
        }, downloadOptions)

          const code = data.document_code || data.id?.slice?.(0, 8) || 'DOC'
          const labelForFile = String(selectedInstallment.label || selectedInstallment.id || '').trim()
          const installmentPart = labelForFile ? `_${sanitizeFilePart(labelForFile)}` : ''
          downloadFile(url, `${data.type}_${code}${installmentPart}.pdf`)
          return
        }

        if (!nextInstallment) {
          setInvoiceInstallmentDownloadLabel('ครบทุกงวดแล้ว')
          setIsInstallmentInvoiceComplete(true)
          throw new Error('เอกสารนี้ถูกยืนยันการชำระครบทุกงวดแล้ว')
        }

        const previewPayload = {
          ...payload,
          current_installment_id: nextInstallment.id,
          current_installment_label: nextInstallment.label,
          current_installment_percent: Number(nextInstallment.percent) || undefined,
          total: Number(nextInstallment.amount) || 0,
          installment_progress: `ชำระงวดแล้ว ${paidSet.size}/${plan.length}`,
        }

        const { url } = await generateDocumentPdfUrl({
          ...data,
          description: JSON.stringify(previewPayload),
        }, downloadOptions)

        const code = data.document_code || data.id?.slice?.(0, 8) || 'DOC'
        const labelForFile = String(nextInstallment.label || nextInstallment.id || '').trim()
        const installmentPart = labelForFile ? `_${sanitizeFilePart(labelForFile)}` : ''
        downloadFile(url, `${data.type}_${code}${installmentPart}.pdf`)

        const updatedPaidSet = new Set<string>([...Array.from(paidSet), String(nextInstallment.id)])
        const updatedPaidIds = Array.from(updatedPaidSet)
        const nextQueueInstallment = plan.find((it) => !updatedPaidSet.has(String(it.id))) || null
        const isCompletedAfterDownload = updatedPaidIds.length >= plan.length

        const persistPayload = {
          ...payload,
          current_installment_id: nextQueueInstallment?.id || nextInstallment.id,
          current_installment_label: nextQueueInstallment?.label || nextInstallment.label,
          current_installment_percent: Number((nextQueueInstallment || nextInstallment).percent) || undefined,
          paid_installment_ids: updatedPaidIds,
          installment_progress: `ชำระงวดแล้ว ${updatedPaidIds.length}/${plan.length}`,
          paid_at: isCompletedAfterDownload ? new Date().toISOString() : payload?.paid_at,
          paid_amount: isCompletedAfterDownload ? Number(payload?.total ?? data.total ?? 0) : payload?.paid_amount,
        }

        const { error: persistError } = await updateManualDocument({
          doc_id: String(data.id),
          type: 'invoice',
          payload: persistPayload,
          status: isCompletedAfterDownload ? 'paid' : 'issued',
        })
        if (persistError) throw persistError

        setInvoicePaidInstallmentIds(updatedPaidIds)
        setInvoiceInstallmentOptions(nextQueueInstallment ? [nextQueueInstallment] : [])
        setSelectedInvoiceInstallmentId(nextQueueInstallment?.id || '')
        setInvoiceInstallmentDownloadLabel(nextQueueInstallment?.label || 'ครบทุกงวดแล้ว')
        setSelectedInvoiceDownloadInstallmentId(nextQueueInstallment?.id || '')
        setIsInstallmentInvoiceFlow(true)
        setIsInstallmentInvoiceComplete(isCompletedAfterDownload)
        setReceiptInstallmentProgress(`ชำระงวดแล้ว ${updatedPaidIds.length}/${plan.length}`)
        setSavedDocumentStatus(isCompletedAfterDownload ? 'paid' : 'issued')
      } else {
        const { url } = await generateDocumentPdfUrl({
          ...data,
          description: JSON.stringify(payload),
        }, downloadOptions)
        const code = data.document_code || data.id?.slice?.(0, 8) || 'DOC'
        const installmentLabel = data.type === 'invoice'
          ? String(payload?.current_installment_label || invoiceInstallmentDownloadLabel || '').trim()
          : ''
        const installmentPart = installmentLabel ? `_${sanitizeFilePart(installmentLabel)}` : ''
        downloadFile(url, `${data.type}_${code}${installmentPart}.pdf`)
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'ดาวน์โหลดไม่สำเร็จ')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleSave = async (actionType: 'save' | 'issue_chained' = 'save') => {
    if (!profile?.id || profile.role !== 'admin' || saving || (!editingDocId && !isValid)) return

    setSaving(true)
    setError('')

    if (docType === 'receipt') {
      if (receiptEligibilityReason) {
        setError(receiptEligibilityReason)
        setSaving(false)
        return
      }
      if (!paidAt) {
        setError('กรุณาระบุวันที่รับชำระเงิน')
        setSaving(false)
        return
      }
      if (receiptPaymentScope === 'installments' && selectedReceiptInstallmentIds.length === 0) {
        setError('กรุณาเลือกงวดที่ต้องการชำระ')
        setSaving(false)
        return
      }
      if (receiptPaidAmount <= 0) {
        setError('ยอดชำระไม่ถูกต้อง')
        setSaving(false)
        return
      }
      if (!receiptPaymentMethod) {
        setError('กรุณาระบุวิธีการชำระเงิน')
        setSaving(false)
        return
      }
    }

    if (docType === 'invoice') {
       const invoiceSplitActive = split && !(isInvoiceFromQuotationFlow && presetPaymentPlanParam === 'full')
       if (!invoiceSplitActive && !dueAt) {
         setError('กรุณาระบุวันที่ครบกำหนดชำระ')
         setSaving(false)
         return
       }
       if (invoiceSplitActive && Math.abs(installmentSum - grandTotal) > 0.01) {
          setError('ยอดรวมงวดไม่เท่ากับยอดสุทธิ')
          setSaving(false)
          return
       }
       if (invoiceSplitActive && installmentMode === 'percent' && Math.abs(percentSum - 100) > 0.0001) {
         setError('สัดส่วนรวมของงวดไม่เท่ากับ 100%')
         setSaving(false)
         return
       }
    }

    if ((docType === 'plant_material' || docType === 'contract') && !chainSourceDocumentId) {
      setError(docType === 'contract' ? 'กรุณาเลือกเอกสารใบแจ้งหนี้อ้างอิงก่อนบันทึกเอกสารนี้' : 'กรุณาเลือกเอกสารใบเสนอราคาอ้างอิงก่อนบันทึกเอกสารนี้')
      setSaving(false)
      return
    }

    try {
      let currentInstallmentMeta: { id: string; label?: string; due_at?: string; amount?: number } | null = null
      let sourceDocForValidation: any = null

      if (chainSourceDocumentId) {
        const { data: sourceDoc, error: sourceError } = await getDocumentDetails(chainSourceDocumentId)
        if (sourceError || !sourceDoc) {
          throw sourceError || new Error('ไม่พบเอกสารต้นทาง')
        }

        const sourceType = String(sourceDoc.type || '').toLowerCase()
        if (!isSourceTypeCompatible(docType, sourceType)) {
          throw new Error(sourceTypeErrorMessage(docType))
        }

        if (docType === 'plant_material') {
          const sourceParsed = parseManualPayload(sourceDoc.description)
          if (!hasPlantMaterialSourceItems(sourceParsed, sourceDoc)) {
            throw new Error('ไม่สามารถสร้างเอกสารพืชได้: ใบเสนอราคาอ้างอิงไม่มีรายการต้นไม้ ไม้พุ่ม หรือวัสดุตกแต่งที่แสดงรูปได้')
          }
        }

        sourceDocForValidation = sourceDoc
      }

      if (docType === 'invoice' && shouldUseSourcePreset && chainSourceDocumentId) {
        const sourceDoc = sourceDocForValidation
        if (!sourceDoc) {
          throw new Error('ไม่พบเอกสารต้นทางสำหรับออกใบแจ้งหนี้')
        }

        const requestedPaymentPlan = presetPaymentPlanParam === 'installments'
          ? 'installments'
          : (presetPaymentPlanParam === 'full' ? 'full' : null)

        const sourcePayload = parseManualPayload(sourceDoc.description)
        const sourceInstallments = Array.isArray(sourcePayload?.installments)
          ? sourcePayload.installments
              .map((it: any, idx: number) => ({
                id: String(it?.id || `inst-${idx + 1}`),
                label: String(it?.label || `งวดที่ ${idx + 1}`),
                due_at: String(it?.due_at || '').slice(0, 10),
                amount: Number(it?.amount) || 0,
              }))
              .filter((it: any) => !!it.id)
          : []

        const shouldUseInstallmentFlow = requestedPaymentPlan === 'installments'
          || (requestedPaymentPlan === null && split)

        if (sourceInstallments.length > 0 && shouldUseInstallmentFlow) {
          const needle = `"source_document_id":"${chainSourceDocumentId}"`
          const { data: existingInvoices, error: invoiceSearchError } = await supabase
            .from('documents')
            .select('id, description')
            .eq('type', 'invoice')
            .ilike('description', `%${needle}%`)

          if (invoiceSearchError) throw invoiceSearchError

          const issuedInstallmentIds = new Set(
            (existingInvoices || [])
              .map((inv: any) => parseManualPayload(inv?.description))
              .map((payload: any) => String(payload?.current_installment_id || ''))
              .filter(Boolean)
          )

          const selectedInstallmentId = String(selectedInvoiceInstallmentId || '').trim()
          if (selectedInstallmentId && issuedInstallmentIds.has(selectedInstallmentId)) {
            throw new Error('งวดที่เลือกถูกออกใบแจ้งหนี้แล้ว กรุณาเลือกงวดที่ยังไม่ออก')
          }

          const nextInstallment = selectedInstallmentId
            ? sourceInstallments.find((it: any) => it.id === selectedInstallmentId)
            : sourceInstallments.find((it: any) => !issuedInstallmentIds.has(it.id))

          if (!nextInstallment) {
            throw new Error('ออกใบแจ้งหนี้ครบทุกงวดแล้ว ไม่สามารถออกซ้ำได้')
          }

          currentInstallmentMeta = nextInstallment
          if (!dueAt && nextInstallment.due_at) {
            setDueAt(nextInstallment.due_at)
          }
        }
      }

      if ((docType === 'plant_material' || docType === 'contract') && chainSourceDocumentId && !sourceDocForValidation) {
        throw new Error(docType === 'contract' ? 'ไม่พบเอกสารใบแจ้งหนี้อ้างอิง' : 'ไม่พบเอกสารใบเสนอราคาอ้างอิง')
      }

      const invoiceSplitActive = docType === 'invoice' && split && !(isInvoiceFromQuotationFlow && presetPaymentPlanParam === 'full')
      const effectiveInvoiceDueAt = docType === 'invoice'
        ? (invoiceSplitActive
            ? (currentInstallmentMeta?.due_at || selectedInvoiceInstallmentMeta?.due_at || dueAt || '')
            : dueAt)
        : ''

      const payload = buildManualPayload({
        currentInstallmentMeta,
        effectiveInvoiceDueAt,
      })

      persistProjectName(projectName)

      persistItemDetailSuggestions(
        zones.flatMap((zone) =>
          zone.categories.flatMap((category) =>
            category.items
              .map((item) => String(item.detail || '').trim())
              .filter(Boolean)
          )
        )
      )

      const manualStatus = docType === 'receipt' ? 'paid' : 'issued'

      const updatableDocId = editId || editingDocId
      const canUpdateExistingDoc = !!updatableDocId && !shouldUseSourcePreset
      const idempotencyKey = canUpdateExistingDoc
        ? undefined
        : (pendingCreateIdempotencyKeyRef.current || buildManualIdempotencyKey())

      if (!canUpdateExistingDoc && idempotencyKey && !pendingCreateIdempotencyKeyRef.current) {
        pendingCreateIdempotencyKeyRef.current = idempotencyKey
      }

      if (!canUpdateExistingDoc) {
        payload.idempotency_key = idempotencyKey
      }

      const { data, error } = canUpdateExistingDoc
        ? await updateManualDocument({ doc_id: updatableDocId as string, type: docType, payload, status: manualStatus })
        : await createManualDocument({ owner_user_id: profile.id, type: docType, payload, status: manualStatus })

      if (error || !data) throw error || new Error('บันทึกไม่สำเร็จ')
      pendingCreateIdempotencyKeyRef.current = null
      setSavedDocumentStatus(String((data as any)?.status || manualStatus || '').toLowerCase())

      // Show visual success feedback
      alert('บันทึกเอกสารเรียบร้อยแล้ว')

      const targetDocId = data.id

      if (actionType === 'issue_chained' && (docType === 'quotation' || docType === 'invoice')) {
        if (docType === 'quotation') {
          router.push(`/dashboard/admin/documents/create-manual?type=invoice&sourceDocId=${data.id}`)
          return
        }

        if (docType === 'invoice') {
          const sourceDocId = chainSourceDocumentId || ''

          if (sourceDocId) {
            const { data: sourceDoc, error: sourceError } = await getDocumentDetails(sourceDocId)
            if (sourceError || !sourceDoc) throw sourceError || new Error('ไม่พบใบเสนอราคาอ้างอิง')

            const { data: invoiceDocs, error: invoiceDocsError } = await supabase
              .from('documents')
              .select('id, type, source_document_id, description')
              .eq('type', 'invoice')
              .eq('source_document_id', sourceDocId)

            if (invoiceDocsError) throw invoiceDocsError

            const invoiceIds = (invoiceDocs || []).map((doc: any) => String(doc.id)).filter(Boolean)
            let receiptDocs: any[] = []

            if (invoiceIds.length > 0) {
              const { data: receipts, error: receiptDocsError } = await supabase
                .from('documents')
                .select('id, type, source_document_id, description')
                .eq('type', 'receipt')
                .in('source_document_id', invoiceIds)

              if (receiptDocsError) throw receiptDocsError
              receiptDocs = receipts || []
            }

            const flowDocs = [sourceDoc, ...(invoiceDocs || []), ...receiptDocs]
            const gate = getReceiptGateForInvoice(data as any, flowDocs)
            const progress = gate.progress
            const invoicePayload = parseManualPayload(data?.description)
            const payloadInstallmentCount = Array.isArray(invoicePayload?.installments) ? invoicePayload.installments.length : 0
            const payloadPaidCount = Array.isArray(invoicePayload?.paid_installment_ids)
              ? invoicePayload.paid_installment_ids.map((id: any) => String(id || '').trim()).filter(Boolean).length
              : 0
            const payloadInstallmentFullyPaid = payloadInstallmentCount > 0 && payloadPaidCount >= payloadInstallmentCount
            const installmentFullyPaid = !!progress?.isInstallmentFlow
              && Number(progress?.totalInstallments || 0) > 0
              && Number(progress?.paidCount || 0) >= Number(progress?.totalInstallments || 0)
            if (!gate.allowed && !installmentFullyPaid && !payloadInstallmentFullyPaid) {
              throw new Error(gate.reason || 'ยังชำระไม่ครบทุกงวด ต้องรับชำระให้ครบก่อนจึงจะสร้างใบเสร็จได้')
            }
          }

          router.push(`/dashboard/admin/documents/create-manual?type=receipt&sourceDocId=${data.id}`)
          return
        }
      }

      if (actionType === 'save') {
        if (!editingDocId) {
          window.history.replaceState(null, '', `/dashboard/admin/documents/create-manual?edit=${targetDocId}`)
          setEditingDocId(targetDocId)
          setIsEditingContent(false)
        } else if (canEditAfterSaveByType(docType)) {
          setIsEditingContent(false)
        }

        if (docType === 'invoice') {
          const labelToShow = currentInstallmentMeta?.label || selectedInvoiceInstallmentId || ''
          setInvoiceInstallmentDownloadLabel(String(labelToShow || '').trim())
        }
        try {
          const { data: updated } = await getDocumentDetails(targetDocId)
          if (updated?.document_code) setDocumentCode(updated.document_code)
        } catch (_) {}

        if (typeof window !== 'undefined') {
          window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          })
        }
      } else {
        router.push(`/dashboard/admin/documents/create-manual?edit=${targetDocId}`)
      }
    } catch (err: any) {
      setError(err?.message || 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const style = {
    quotation: { label: 'ใบเสนอราคา', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    invoice: { label: 'ใบแจ้งหนี้', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    receipt: { label: 'ใบเสร็จ', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    plant_material: { label: 'เอกสารพืช', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    contract: { label: 'สัญญา', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' }
  }[docType]

  const isSavedReadonly = !!editingDocId
  const isDocTypeLocked = !!editId || !!editingDocId  // Lock after first save too
  const isQuoteOrInvoice = docType === 'quotation' || docType === 'invoice'
  const isReceiptDoc = docType === 'receipt'
  const isContractDoc = docType === 'contract'
  const isSimpleDoc = docType === 'plant_material' || docType === 'contract'
  const isPlantMaterialDoc = docType === 'plant_material'
  const isCompactItemListDoc = docType === 'invoice' || docType === 'receipt'
  const isReceiptReadonly = docType === 'receipt' && isSavedReadonly
  // Quotation, plant material, and contract are editable after save (toggle); invoice and receipt stay locked.
  const isEditableDocType = canEditAfterSaveByType(docType)
  const isStrictContentLockedDoc = docType === 'invoice' || docType === 'receipt'
  const canEditCoreContent = isEditingContent && (!isCompactItemListDoc || docType === 'invoice')
  const disableDocumentFormInputs = (!isEditingContent && (docType === 'quotation' || docType === 'contract' || docType === 'plant_material')) || isReceiptReadonly
  const isWorkflowDoc = isSavedReadonly && isQuoteOrInvoice
  const canIssueNext = isWorkflowDoc && (savedDocumentStatus === 'issued' || savedDocumentStatus === 'generated' || savedDocumentStatus === 'paid')
  const isReceiptDownloadReady = docType !== 'receipt'
    || (
      !!paidAt
      && !!receiptPaymentMethod
      && Number.isFinite(receiptPaidAmount)
      && receiptPaidAmount > 0
      && (
        receiptInstallments.length === 0
        || receiptPaymentScope === 'full'
        || (receiptPaymentScope === 'installments' && selectedReceiptInstallmentIds.length > 0)
      )
    )
  const canDownloadNow = !!editingDocId && (docType !== 'receipt' || isReceiptDownloadReady)
  const isInvoiceFromQuotationFlow = docType === 'invoice' && shouldUseSourcePreset && !!chainSourceDocumentId
  const isInvoicePaymentModeLocked = isInvoiceFromQuotationFlow && (presetPaymentPlanParam === 'full' || presetPaymentPlanParam === 'installments')
  const canEditInvoiceInstallmentDetails = docType === 'invoice' && !isSavedReadonly && split && !(isInvoiceFromQuotationFlow && presetPaymentPlanParam === 'full')
  const effectiveInvoiceSplit = docType === 'invoice' ? (split && !(isInvoiceFromQuotationFlow && presetPaymentPlanParam === 'full')) : split
  const canSaveNow = (!isSavedReadonly || isEditingContent || isStrictContentLockedDoc) && isValid && !saving
  const selectedInvoiceInstallmentMeta = invoiceInstallmentOptions.find((item) => item.id === selectedInvoiceInstallmentId) || null
  const invoiceDownloadInstallmentOptions = docType === 'invoice' && isSavedReadonly && effectiveInvoiceSplit && installments.length > 0
    ? installments
    : []
  const isInvoiceDownloadFullyPaid = invoiceDownloadInstallmentOptions.length > 0
    && invoicePaidInstallmentIds.length >= invoiceDownloadInstallmentOptions.length
  const remainingInvoiceInstallmentLabels = invoiceInstallmentOptions
    .filter((item) => item.id !== selectedInvoiceInstallmentId)
    .map((item) => item.label)
    .filter(Boolean)
  const selectedDownloadInstallmentMeta = invoiceDownloadInstallmentOptions.find((it) => it.id === selectedInvoiceDownloadInstallmentId)
    || invoiceDownloadInstallmentOptions[0]
    || null
  const buildManualPayload = (options?: {
    currentInstallmentMeta?: { id?: string; label?: string; due_at?: string } | null
    effectiveInvoiceDueAt?: string
    totalOverride?: number
    paidAmountOverride?: number
    paidAtOverride?: string
    paidInstallmentIdsOverride?: string[]
    zonesOverride?: ZoneRow[]
  }) => {
    const currentInstallmentMeta = options?.currentInstallmentMeta ?? selectedInvoiceInstallmentMeta ?? null
    const effectiveInvoiceDueAt = options?.effectiveInvoiceDueAt ?? dueAt
    const zonesForPayload = options?.zonesOverride ?? zones
    const selectedReferenceQuotation = referenceQuotations.find((doc) => doc.id === chainSourceDocumentId) || null
    const includeFinancialFields = docType !== 'plant_material'
    const normalizedPlantOrder = docType === 'plant_material'
      ? normalizePlantLayoutOrder(buildPlantLayoutPreviewCards(zonesForPayload), plantLayoutOrder)
      : undefined
    const normalizedPlantLayoutSettings = docType === 'plant_material'
      ? normalizePlantLayoutSettings(plantLayoutSettings)
      : undefined

    return {
      kind: 'manual_document',
      idempotency_key: undefined as string | undefined,
      contract_type: docType === 'contract' ? contractType : undefined,
      contract_details: docType === 'contract' ? normalizeContractFormFields(contractFormFields) : undefined,
      source_document_id: chainSourceDocumentId || undefined,
      source_document_code: chainSourceDocument?.document_code || selectedReferenceQuotation?.document_code || undefined,
      source_document_created_at: chainSourceDocument?.created_at || selectedReferenceQuotation?.created_at || undefined,
      current_installment_id: currentInstallmentMeta?.id || undefined,
      current_installment_label: currentInstallmentMeta?.label || undefined,
      source_order_id: sourceOrderId || undefined,
      source_customer_id: sourceCustomerId || undefined,
      source_house_id: sourceHouseId || undefined,
      project_name: projectName.trim() || undefined,
      house_name: houses.find((h) => h.id === sourceHouseId)?.name || undefined,
      recipient: {
        name: recipientName.trim(),
        phone: recipientPhone.trim() || undefined,
        address: recipientAddress.trim() || undefined,
        tax_id: recipientTaxId.trim() || undefined,
      },
      zones: zonesForPayload.map(z => ({
        id: z.id,
        name: z.name.trim() || 'General',
        categories: z.categories.map(c => ({
          id: c.id,
          name: getCategoryDisplayName(c.main_category, c.subcategory),
          main_category: c.main_category,
          subcategory: c.subcategory,
          labor_percentage: Number(c.labor_percentage) || 0,
          items: c.items.map(i => ({
            id: i.id,
            description: i.description.trim(),
            english_name: i.english_name.trim() || undefined,
            image_url: i.image_url?.trim() || undefined,
            detail: i.detail.trim() || undefined,
            spec: i.spec.trim() || undefined,
            item_category: resolveRowItemCategory(i, c.name),
            plant_document_mode: normalizePlantDocumentMode(i.plant_document_mode),
            size_mode: i.size_mode,
            shrub_size_style: i.size_mode === 'shrub' ? i.shrub_size_style : undefined,
            shrub_container_type: i.size_mode === 'shrub' ? i.shrub_container_type : undefined,
            height_m: Number(i.height_m) || undefined,
            pot_diameter_inch: Number(i.pot_diameter_inch) || undefined,
            trunk_diameter_inch: Number(i.trunk_diameter_inch) || undefined,
            tree_height_label: i.tree_height_label?.trim() || undefined,
            size: buildSizeLabelByMode(i) || undefined,
            spacing_x: Number(i.spacing_x) || undefined,
            spacing_y: Number(i.spacing_y) || undefined,
            area_sqm: Number(i.area_sqm) || undefined,
            unit: i.unit.trim() || 'หน่วย',
            quantity: Number(i.quantity) || 0,
            ...(includeFinancialFields
              ? {
                  unit_price_material: Number(i.unit_price_material) || 0,
                  unit_price_labor: Number(i.unit_price_labor) || 0,
                }
              : {}),
          }))
        }))
      })),
      notes: notes.trim() || undefined,
      issued_at: issuedAt || new Date().toISOString(),
      due_at: docType === 'invoice' && effectiveInvoiceDueAt
        ? new Date(effectiveInvoiceDueAt).toISOString()
        : undefined,
      paid_at: (docType === 'receipt' || docType === 'invoice') && (options?.paidAtOverride || paidAt)
        ? new Date(options?.paidAtOverride || paidAt).toISOString()
        : undefined,
      payment_method: (docType === 'receipt' || docType === 'invoice') ? receiptPaymentMethod : undefined,
      paid_amount: (docType === 'receipt' || docType === 'invoice')
        ? (options?.paidAmountOverride ?? receiptPaidAmount)
        : undefined,
      applied_installment_ids: (docType === 'receipt' || docType === 'invoice') && receiptPaymentScope === 'installments' && receiptInstallments.length > 0
        ? selectedReceiptInstallmentIds
        : undefined,
      ...(includeFinancialFields
        ? {
            total: options?.totalOverride ?? (docType === 'receipt' ? receiptPaidAmount : grandTotal),
            vat_rate: vatRate,
            overhead_rate: overheadRate,
            discount_type: discountType,
            discount_value: normalizedDiscountValue,
            discount_amount: appliedDiscountAmount,
            show_vat: showVat,
            show_overhead: showOverhead,
            show_global_labor: showGlobalLabor,
            global_labor_rate: globalLaborRate,
            withholding_tax_rate: withholdingRate,
            show_withholding_tax: showWithholdingTax,
            total_label: totalLabel.trim() || undefined,
            show_total_label: showTotalLabel,
          }
        : {}),
      show_zones: showZones,
      page_break_per_category: pageBreakPerCategory,
      plant_layout_order: normalizedPlantOrder && normalizedPlantOrder.length > 0 ? normalizedPlantOrder : undefined,
      plant_layout_settings: normalizedPlantLayoutSettings,
      document_code: documentCode.trim() || undefined,
      conditions: conditions.filter(c => c.text.trim()).map(c => ({ id: c.id, text: c.text.trim(), selected: !!c.selected })),
      installments: split || (docType === 'receipt' && receiptInstallments.length > 0)
        ? (docType === 'receipt' && receiptInstallments.length > 0 ? receiptInstallments : computedInstallments).map((it) => ({
            id: it.id,
            label: it.label || undefined,
            due_at: it.due_at ? new Date(it.due_at).toISOString() : undefined,
            due_scope: String((it as any).due_scope || '').trim() || undefined,
            amount: Number(it.computed_amount ?? it.amount) || 0,
            percent: installmentMode === 'percent' ? (Number(it.percent) || 0) : undefined,
          }))
        : undefined,
      paid_installment_ids: docType === 'invoice'
        ? (options?.paidInstallmentIdsOverride && options.paidInstallmentIdsOverride.length > 0
            ? options.paidInstallmentIdsOverride
            : invoicePaidInstallmentIds.length > 0
              ? invoicePaidInstallmentIds
              : undefined)
        : undefined,
    }
  }
  const invoiceDownloadButtonLabel = docType === 'invoice' && invoiceDownloadInstallmentOptions.length > 0
    ? (selectedDownloadInstallmentMeta
      ? `ดาวน์โหลดงวด • ${selectedDownloadInstallmentMeta.label || selectedDownloadInstallmentMeta.id}`
      : 'ดาวน์โหลดงวด')
    : docType === 'invoice' && invoiceInstallmentDownloadLabel
    ? `ดาวน์โหลดทีละงวด • ${invoiceInstallmentDownloadLabel}`
    : docType === 'invoice' && isInstallmentInvoiceFlow
      ? 'ดาวน์โหลดทีละงวด'
    : 'ดาวน์โหลด PDF'
  const nextIssueType: ManualType = docType === 'quotation' ? 'invoice' : 'receipt'
  const canIssueReceiptNow = docType === 'invoice'
    ? (!effectiveInvoiceSplit || isInstallmentInvoiceComplete)
    : true
  const primaryActionTone = {
    quotation: 'xyl-doc-quotation-solid',
    invoice: 'xyl-doc-invoice-solid',
    receipt: 'xyl-doc-receipt-solid',
    plant_material: 'xyl-doc-plant-solid',
    contract: 'xyl-doc-contract-solid',
  }[isWorkflowDoc ? nextIssueType : docType]
// Ensure proper document flow
  const primaryActionLabel = isWorkflowDoc
    ? (nextIssueType === 'invoice' ? 'สร้างใบแจ้งหนี้' : 'สร้างใบเสร็จ')
    : docType === 'quotation'
      ? 'บันทึกใบเสนอราคา'
      : docType === 'invoice'
        ? 'บันทึกใบแจ้งหนี้'
        : docType === 'receipt'
          ? 'บันทึกใบเสร็จ'
          : docType === 'plant_material'
            ? 'บันทึกเอกสารพืช'
            : docType === 'contract'
              ? 'บันทึกสัญญา'
          : 'บันทึกเอกสาร'
  const hasIssuedNextDocument = !!issuedNextDocument
  const quotationInstallmentTotal = docType === 'quotation' && split ? installments.length : 0
  const hasQuotationInstallmentsConfigured = quotationInstallmentTotal > 0
  const canCreateInvoiceFromQuotation = docType === 'quotation'
    && isSavedReadonly
    && (quotationInstallmentTotal > 0 ? issuedInvoiceCount < quotationInstallmentTotal : issuedInvoiceCount === 0)
  const quotationInvoiceOptionLabel = quotationInstallmentTotal > 0
    ? `งวดที่ ${Math.min(issuedInvoiceCount + 1, quotationInstallmentTotal)}/${quotationInstallmentTotal}`
    : 'ชำระเต็ม'
  const canCreateFullInvoiceFromQuotation = docType === 'quotation' && isSavedReadonly && issuedInvoiceCount === 0
  const canCreateInstallmentInvoiceFromQuotation = docType === 'quotation'
    && isSavedReadonly
    && (quotationInstallmentTotal > 0 ? issuedInvoiceCount < quotationInstallmentTotal : issuedInvoiceCount === 0)
  const canSelectInstallmentOptionFromQuotation = docType === 'quotation'
    && isSavedReadonly
    && canCreateInstallmentInvoiceFromQuotation
  const canSelectFullOptionFromQuotation = docType === 'quotation'
    && isSavedReadonly
    && issuedInvoiceCount === 0
  const hideLockedInputSections = false
  // If next document exists, always show "Open Form" button
  const canProceedToNext = hasIssuedNextDocument || (canIssueNext && (docType !== 'invoice' || canIssueReceiptNow))
  const nextDocActionLabel = hasIssuedNextDocument
    ? (nextIssueType === 'invoice' ? 'ดูใบแจ้งหนี้' : 'ดูใบเสร็จ')
    : (nextIssueType === 'invoice' ? 'สร้างใบแจ้งหนี้' : 'สร้างใบเสร็จ')

  const displayedZones = showZones ? zones : zones.slice(0, 1)
  const selectedReferenceQuotation = useMemo(
    () => referenceQuotations.find((doc) => doc.id === chainSourceDocumentId) || null,
    [chainSourceDocumentId, referenceQuotations]
  )
  const contractScopeItems = useMemo(
    () => zones.flatMap((zone) => zone.categories.flatMap((category) => category.items.map((item) => ({
      zoneName: zone.name,
      categoryName: category.name,
      description: item.description || '-',
      detail: item.detail || '',
      quantity: Number(item.quantity) || 0,
      unit: item.unit || '-',
    })))),
    [zones]
  )
  const contractScopePreviewItems = useMemo(
    () => contractScopeItems.slice(0, 10),
    [contractScopeItems]
  )
  const contractScopeExtraCount = Math.max(0, contractScopeItems.length - contractScopePreviewItems.length)
  const contractCategorySummaries = useMemo(() => {
    const summaryMap = new Map<string, { label: string; itemCount: number; totalQty: number }>()

    zones.forEach((zone) => {
      zone.categories.forEach((category) => {
        const key = `${zone.name || 'หน้างาน'}::${category.name || 'หมวดหมู่'}`
        const current = summaryMap.get(key) || {
          label: zone.name?.trim() ? `${zone.name} / ${category.name || 'หมวดหมู่'}` : (category.name || 'หมวดหมู่'),
          itemCount: 0,
          totalQty: 0,
        }

        category.items.forEach((item) => {
          current.itemCount += 1
          current.totalQty += Number(item.quantity) || 0
        })

        summaryMap.set(key, current)
      })
    })

    return Array.from(summaryMap.values())
  }, [zones])
  const contractPreviewInstallments = useMemo(
    () => (split
      ? installments
          .filter((installment) => (Number(installment.amount) || 0) > 0 || (Number(installment.percent) || 0) > 0)
          .map((installment, index) => ({
            id: installment.id,
            label: installment.label?.trim() || `งวดที่ ${index + 1}`,
            dueAt: formatThaiDate(installment.due_at),
            dueScope: installment.due_scope?.trim() || '',
            amount: Number(installment.amount) || 0,
            percent: Number(installment.percent) || 0,
          }))
      : []),
    [installments, split]
  )
  const selectedContractConditions = useMemo(
    () => conditions
      .filter((condition) => condition.selected && condition.text.trim())
      .map((condition) => condition.text.trim()),
    [conditions]
  )
  const contractTitle = contractType === 'annual_maintenance' ? 'สัญญาดูแลรักษาภูมิทัศน์' : 'สัญญารับจ้างเหมาจัดสวน'
  const contractSubtitle = contractType === 'annual_maintenance' ? 'LANDSCAPE MAINTENANCE AGREEMENT' : 'LANDSCAPE CONSTRUCTION CONTRACT'
  const contractPreviewDate = formatThaiDate(issuedAt || new Date().toISOString())
  const contractReferenceCode = chainSourceDocument?.document_code || selectedReferenceQuotation?.document_code || (chainSourceDocumentId ? chainSourceDocumentId.slice(0, 8) : CONTRACT_DOTTED_SHORT)
  const contractReferenceDate = formatThaiDate(chainSourceDocument?.created_at || selectedReferenceQuotation?.created_at)
  const contractGrandTotalText = formatThaiBahtText(grandTotal)
  const contractCustomerName = recipientName.trim() || CONTRACT_DOTTED_SHORT
  const contractCustomerTaxId = recipientTaxId.trim() || CONTRACT_DOTTED_SHORT
  const contractCustomerAddress = recipientAddress.trim() || CONTRACT_DOTTED_LONG
  const contractProjectLocation = contractFormFields.project_location.trim() || recipientAddress.trim() || CONTRACT_DOTTED_LONG
  const contractSigningLocation = contractFormFields.signing_location.trim() || recipientAddress.trim() || CONTRACT_DOTTED_MEDIUM
  const contractLandDeedNumber = contractFormFields.land_deed_number.trim() || CONTRACT_DOTTED_SHORT
  const contractWorkStartDate = formatThaiDate(contractFormFields.work_start_date) !== '-' ? formatThaiDate(contractFormFields.work_start_date) : CONTRACT_DOTTED_SHORT
  const contractWorkEndDate = formatThaiDate(contractFormFields.work_end_date) !== '-' ? formatThaiDate(contractFormFields.work_end_date) : CONTRACT_DOTTED_SHORT
  const contractQuotationAttachmentPages = contractFormFields.quotation_attachment_pages.trim() || '1'
  const contractInvoiceReferenceCode = contractFormFields.invoice_reference_code.trim() || contractReferenceCode
  const contractInvoiceAttachmentPages = contractFormFields.invoice_attachment_pages.trim() || CONTRACT_DOTTED_SHORT
  const contractEmployerSignerName = contractFormFields.employer_signer_name.trim() || contractCustomerName
  const contractEmployerWitnessName = contractFormFields.employer_witness_name.trim() || CONTRACT_DOTTED_SHORT
  const contractEmployerAttachmentPages = contractFormFields.employer_id_attachment_pages.trim() || CONTRACT_DOTTED_SHORT
  const contractContractorAttachmentPages = contractFormFields.contractor_id_attachment_pages.trim() || CONTRACT_DOTTED_SHORT
  const landscapeContractCompanyName = contractFormFields.contractor_company_name.trim() || systemCompanyInfo.contract_company_name?.trim() || systemCompanyInfo.name_th?.trim() || DEFAULT_SYSTEM_COMPANY_INFO.contract_company_name
  const landscapeContractCompanyAddress = contractFormFields.contractor_company_address.trim() || systemCompanyInfo.contract_company_address?.trim() || systemCompanyInfo.address?.trim() || DEFAULT_SYSTEM_COMPANY_INFO.contract_company_address
  const landscapeContractCompanyTaxId = contractFormFields.contractor_company_tax_id.trim() || systemCompanyInfo.contract_company_tax_id?.trim() || systemCompanyInfo.tax_id?.trim() || DEFAULT_SYSTEM_COMPANY_INFO.contract_company_tax_id
  const landscapeContractSignerName = contractFormFields.contractor_signer_name.trim() || systemCompanyInfo.contract_signer_name?.trim() || DEFAULT_SYSTEM_COMPANY_INFO.contract_signer_name
  const landscapeContractWitnessName = contractFormFields.contractor_witness_name.trim() || systemCompanyInfo.contract_witness_name?.trim() || DEFAULT_SYSTEM_COMPANY_INFO.contract_witness_name
  const landscapeContractBankText = `${systemFinancialInfo.bank_name?.trim() || 'ธนาคารกสิกรไทย'} ${systemFinancialInfo.account_name?.trim() || landscapeContractCompanyName} หมายเลขบัญชี ${systemFinancialInfo.account_no?.trim() || CONTRACT_DOTTED_SHORT} สาขา${systemFinancialInfo.branch?.trim() || CONTRACT_DOTTED_SHORT}`
  const plantLayoutPreviewBaseCards = useMemo(
    () => (docType === 'plant_material' ? buildPlantLayoutPreviewCards(zones) : []),
    [docType, zones]
  )
  const normalizedPlantLayoutOrder = useMemo(
    () => normalizePlantLayoutOrder(plantLayoutPreviewBaseCards, plantLayoutOrder),
    [plantLayoutPreviewBaseCards, plantLayoutOrder]
  )
  const normalizedPlantLayoutSettingsState = useMemo(
    () => normalizePlantLayoutSettings(plantLayoutSettings),
    [plantLayoutSettings]
  )
  const plantMaterialPreviewCards = useMemo(
    () => sortPlantLayoutPreviewCards(plantLayoutPreviewBaseCards, normalizedPlantLayoutOrder),
    [plantLayoutPreviewBaseCards, normalizedPlantLayoutOrder]
  )
  const plantMaterialResolvedCardLayouts = useMemo(
    () => Object.fromEntries(
      plantMaterialPreviewCards.map((card) => [card.key, resolvePlantLayoutCardTuning(normalizedPlantLayoutSettingsState, card.key)])
    ) as Record<string, PlantLayoutCardTuning>,
    [normalizedPlantLayoutSettingsState, plantMaterialPreviewCards]
  )
  const plantMaterialPreviewPages = useMemo(
    () => paginatePlantLayoutCards(
      plantMaterialPreviewCards,
      normalizedPlantLayoutSettingsState,
      (card) => (plantMaterialResolvedCardLayouts[card.key] || normalizedPlantLayoutSettingsState.global).cardHeight
    ),
    [normalizedPlantLayoutSettingsState, plantMaterialPreviewCards, plantMaterialResolvedCardLayouts]
  )
  const plantMaterialCategoryStats = useMemo(() => {
    return plantMaterialPreviewCards.reduce<Record<string, number>>((stats, card) => {
      stats[card.categoryLabel] = (stats[card.categoryLabel] || 0) + 1
      return stats
    }, {})
  }, [plantMaterialPreviewCards])
  const selectedPlantCard = useMemo(
    () => plantMaterialPreviewCards.find((card) => card.key === selectedPlantCardKey) || null,
    [plantMaterialPreviewCards, selectedPlantCardKey]
  )
  const selectedPlantCardLayout = useMemo(
    () => (selectedPlantCard ? resolvePlantLayoutCardTuning(normalizedPlantLayoutSettingsState, selectedPlantCard.key) : normalizedPlantLayoutSettingsState.global),
    [normalizedPlantLayoutSettingsState, selectedPlantCard]
  )

  useEffect(() => {
    if (docType !== 'plant_material' || !plantLayoutReorderMode) {
      if (draggingPlantCardKey) {
        setDraggingPlantCardKey(null)
      }
    }
  }, [docType, draggingPlantCardKey, plantLayoutReorderMode])

  useEffect(() => {
    if (docType !== 'plant_material') {
      if (plantLayoutOrder.length > 0) {
        setPlantLayoutOrder([])
      }
      if (draggingPlantCardKey) {
        setDraggingPlantCardKey(null)
      }
      if (plantLayoutReorderMode) {
        setPlantLayoutReorderMode(false)
      }
      return
    }

    if (!areStringArraysEqual(plantLayoutOrder, normalizedPlantLayoutOrder)) {
      setPlantLayoutOrder(normalizedPlantLayoutOrder)
    }
  }, [docType, draggingPlantCardKey, normalizedPlantLayoutOrder, plantLayoutOrder, plantLayoutReorderMode])

  useEffect(() => {
    if (docType !== 'plant_material') {
      if (selectedPlantCardKey) {
        setSelectedPlantCardKey(null)
      }
      if (activePlantEditSurface) {
        setActivePlantEditSurface(null)
      }
      if (plantLayoutSyncSourceKey) {
        setPlantLayoutSyncSourceKey(null)
      }
      return
    }

    if (plantMaterialPreviewCards.length === 0) {
      if (selectedPlantCardKey) {
        setSelectedPlantCardKey(null)
      }
      if (activePlantEditSurface) {
        setActivePlantEditSurface(null)
      }
      if (plantLayoutSyncSourceKey) {
        setPlantLayoutSyncSourceKey(null)
      }
      return
    }

    if (!selectedPlantCardKey || !plantMaterialPreviewCards.some((card) => card.key === selectedPlantCardKey)) {
      setSelectedPlantCardKey(plantMaterialPreviewCards[0].key)
    }

    if (activePlantEditSurface && !plantMaterialPreviewCards.some((card) => card.key === activePlantEditSurface.cardKey)) {
      setActivePlantEditSurface(null)
    }
    if (plantLayoutSyncSourceKey && !plantMaterialPreviewCards.some((card) => card.key === plantLayoutSyncSourceKey)) {
      setPlantLayoutSyncSourceKey(null)
    }
  }, [activePlantEditSurface, docType, plantLayoutSyncSourceKey, plantMaterialPreviewCards, selectedPlantCardKey])

  if (!profile || profile.role !== 'admin') return null

  const catalogEnglishNameOptions = Array.from(
    new Map(
      itemCatalog
        .map((entry) => String(entry.english_name || '').trim())
        .filter(Boolean)
        .map((value) => [value.toLowerCase(), value])
    ).values()
  )
  const catalogScientificOptions = Array.from(
    new Map(
      itemCatalog
        .map((entry) => String(entry.scientific_name || '').trim())
        .filter(Boolean)
        .map((value) => [value.toLowerCase(), value])
    ).values()
  )

// Ensure user is not confused by multiple buttons
  const showSaveButton = (docType === 'invoice' ? !isSavedReadonly : isEditingContent) && (docType === 'invoice' || docType === 'quotation' || !hasIssuedNextDocument)
  const showQuotationIssueDropdown = docType === 'quotation'
    && !showSaveButton
    && isSavedReadonly
    && !isEditingContent
    && (canCreateInvoiceFromQuotation || canSelectFullOptionFromQuotation || canSelectInstallmentOptionFromQuotation)
  const showQuotationViewInvoiceButton = docType === 'quotation'
    && !showSaveButton
    && isSavedReadonly
    && !isEditingContent
    && hasIssuedNextDocument
  const showNextButton = docType === 'invoice'
    && !showSaveButton
    && (isSavedReadonly || hasIssuedNextDocument)
    && (docType !== 'invoice' || hasIssuedNextDocument || canIssueReceiptNow)

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] text-[#111111] pb-20 font-sans">
      <div className="bg-white border-b border-[#E5E5E5] sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin/documents"
              className="w-10 h-10 border border-[#E5E5E5] hover:border-[#111111] flex items-center justify-center text-[#A3A3A3] hover:text-[#111111] transition-colors"
            >
              <ChevronLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#111111] uppercase tracking-[0.2em]">{locale === 'en' ? 'page' : locale === 'zh' ? '页' : 'หน้า'}{style.label}</span>
                <span className="w-1 h-1 rounded-full bg-[#D4D4D4]"></span>
                <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">Editor</span>
              </div>
              <h1 className="text-xl font-light tracking-tight mt-0.5 uppercase flex items-center gap-2">
                <span>{locale === 'en' ? 'form' : locale === 'zh' ? '形式' : 'แบบฟอร์ม'}</span>
                {isPlantMaterialDoc ? (
                  <span className="text-xl font-light tracking-tight uppercase">{locale === 'en' ? 'plant documents' : locale === 'zh' ? '工厂文件' : 'เอกสารพืช'}</span>
                ) : (
                  <span className="relative inline-flex items-center">
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as ManualType)}
                      disabled={isDocTypeLocked} // Strict lock after save or edit mode
                      className="appearance-none bg-transparent border-none pr-6 text-xl font-light tracking-tight uppercase focus:ring-0 outline-none disabled:opacity-80"
                    >
                      <option value="quotation">{locale === 'en' ? 'quotation' : locale === 'zh' ? '引述' : 'ใบเสนอราคา'}</option>
                      <option value="invoice">{locale === 'en' ? 'Invoice' : locale === 'zh' ? '发票' : 'ใบแจ้งหนี้'}</option>
                      <option value="receipt">{locale === 'en' ? 'receipt' : locale === 'zh' ? '收据' : 'ใบเสร็จ'}</option>
                      <option value="plant_material">{locale === 'en' ? 'plant documents' : locale === 'zh' ? '工厂文件' : 'เอกสารพืช'}</option>
                      <option value="contract">{locale === 'en' ? 'contract' : locale === 'zh' ? '合同' : 'สัญญา'}</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  </span>
                )}
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isEditableDocType && isSavedReadonly && !isEditingContent && (
              <button
                onClick={() => setIsEditingContent(true)}
                title={locale === 'en' ? 'Edit information' : locale === 'zh' ? '编辑信息' : 'แก้ไขข้อมูล'}
                aria-label={locale === 'en' ? 'Edit information' : locale === 'zh' ? '编辑信息' : 'แก้ไขข้อมูล'}
                className="inline-flex items-center justify-center w-10 h-10 border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white transition-all"
              >
                <Pencil size={16} />
              </button>
            )}
            {isQuoteOrInvoice ? (
              <>
                {docType === 'invoice' && isSavedReadonly && isInvoiceDownloadFullyPaid && invoiceDownloadInstallmentOptions.length > 0 ? (
                  <div className="relative inline-flex items-center">
                    <Download className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const value = e.target.value
                        if (!value) return
                        void handleDownload(value, { includeCopy: true })
                        e.currentTarget.value = ''
                      }}
                      disabled={generatingPdf || saving || !canDownloadNow}
                      className="appearance-none bg-white border border-[#E5E5E5] pl-9 pr-8 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA] transition-all disabled:opacity-40"
                    >
                      <option value="">{invoiceDownloadButtonLabel}</option>
                      {invoiceDownloadInstallmentOptions.map((item, index) => (
                        <option key={item.id} value={item.id}>
                          {(item.label || `งวดที่ ${index + 1}`)} • {formatTHB(Number(item.amount) || 0)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
                  </div>
                ) : (
                  <div className="relative inline-flex items-center">
                    <button
                      disabled={generatingPdf || saving || !canDownloadNow}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[#666666] transition-all border border-[#E5E5E5] disabled:opacity-40"
                    >
                      {generatingPdf ? <Clock size={16} className="animate-spin" /> : <Download size={16} />}
                      {invoiceDownloadButtonLabel}
                    </button>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const v = e.target.value
                        if (!v) return
                        void handleDownload(undefined, { includeCopy: v === 'all', isCopy: v === 'copy' })
                        e.target.value = ''
                      }}
                      disabled={generatingPdf || saving || !canDownloadNow}
                      className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>{locale === 'en' ? 'Choose a format' : locale === 'zh' ? '选择格式' : 'เลือกรูปแบบ'}</option>
                      <option value="all">{locale === 'en' ? 'Original + copy' : locale === 'zh' ? '原件+复印件' : 'ตัวจริง + สำเนา'}</option>
                      <option value="original">{locale === 'en' ? 'Only the real one' : locale === 'zh' ? '只有真品' : 'ตัวจริงเท่านั้น'}</option>
                      <option value="copy">{locale === 'en' ? 'Copy only' : locale === 'zh' ? '仅复制' : 'สำเนาเท่านั้น'}</option>
                    </select>
                  </div>
                )}
                {showSaveButton ? (
                  <div className="flex flex-col items-end gap-1.5">
                    <motion.button
                      whileHover={{ scale: canSaveNow ? 1.02 : 1 }}
                      whileTap={{ scale: canSaveNow ? 0.98 : 1 }}
                      onClick={() => handleSave('save')}
                      disabled={!canSaveNow}
                      className="inline-flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all disabled:opacity-50"
                    >
                      {saving ? <Clock size={16} className="animate-spin" /> : <Save size={16} />}
                      {docType === 'quotation' ? 'บันทึกใบเสนอราคา' : 
                       docType === 'invoice' ? 'บันทึกใบแจ้งหนี้' :
                       docType === 'receipt' ? 'บันทึกใบเสร็จรับเงิน' : 'บันทึกเอกสาร'}
                    </motion.button>
                    {!isValid && validationErrors.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => {
                          const summary = document.getElementById('validation-summary-bottom');
                          if (summary) {
                            summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            summary.classList.add('ring-4', 'ring-amber-400/50');
                            setTimeout(() => summary.classList.remove('ring-4', 'ring-amber-400/50'), 2000);
                          } else {
                            scrollToError(validationErrors[0].elementId);
                          }
                        }}
                        className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 border border-amber-100 hover:bg-amber-100 transition-all flex items-center gap-1.5"
                      >
                        <AlertCircle size={10} />
                        {locale === 'en' ? 'The information is not complete.' : locale === 'zh' ? '信息不完整。' : '                         ข้อมูลยังไม่ครบ '}{validationErrors.length} {locale === 'en' ? 'Point (Click to see the list)' : locale === 'zh' ? '点（点击查看列表）' : ' จุด (คลิกดูรายการ)                       '}</button>
                    )}
                  </div>
                ) : (
                  <>
                    {showNextButton && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (hasIssuedNextDocument && issuedNextDocument?.id) {
                            router.push(`/dashboard/admin/documents/create-manual?edit=${issuedNextDocument.id}`)
                            return
                          }

                          handleSave('issue_chained')
                        }}
                        disabled={(!canProceedToNext && !hasIssuedNextDocument) || saving}
                        className={`inline-flex items-center gap-2.5 ${primaryActionTone} text-white px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all disabled:opacity-50`}
                      >
                        {saving ? <Clock size={16} className="animate-spin" /> : (hasIssuedNextDocument ? <Eye size={16} /> : <ArrowRight size={16} />)}
                        {nextDocActionLabel}
                      </motion.button>
                    )}

                    {showQuotationViewInvoiceButton && issuedNextDocument?.id && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push(`/dashboard/admin/documents/create-manual?edit=${issuedNextDocument.id}`)}
                        disabled={saving}
                        className="inline-flex items-center gap-2.5 xyl-doc-invoice-solid text-white px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all disabled:opacity-50"
                      >
                        <Eye size={16} />
                        {locale === 'en' ? 'View invoice' : locale === 'zh' ? '查看发票' : '                         ดูใบแจ้งหนี้                       '}</motion.button>
                    )}

                    {showQuotationIssueDropdown && (
                      <div className="relative inline-flex items-center">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (saving) return
                            if (e.target.value === 'issue_full') {
                              handleCreateInvoiceFromQuotation('full')
                            } else if (e.target.value === 'issue_installments') {
                              handleCreateInvoiceFromQuotation('installments')
                            }
                            e.currentTarget.value = ''
                          }}
                          disabled={saving}
                          className="appearance-none xyl-doc-invoice-solid text-white border px-6 py-2.5 pr-10 text-xs font-bold uppercase tracking-[0.12em] transition-all disabled:opacity-50"
                        >
                          <option value="" disabled>{locale === 'en' ? 'Create an invoice' : locale === 'zh' ? '创建发票' : 'สร้างใบแจ้งหนี้'}</option>
                          <option value="issue_full" disabled={!canSelectFullOptionFromQuotation}>
                            {canSelectFullOptionFromQuotation ? 'สร้างใบแจ้งหนี้ (ชำระเต็ม)' : 'สร้างใบแจ้งหนี้ (ชำระเต็ม) — ออกแล้ว'}
                          </option>
                          <option value="issue_installments" disabled={!canSelectInstallmentOptionFromQuotation}>
                            {canSelectInstallmentOptionFromQuotation
                              ? (hasQuotationInstallmentsConfigured ? `สร้างใบแจ้งหนี้ (แบ่งชำระ • ${quotationInvoiceOptionLabel})` : 'สร้างใบแจ้งหนี้ (แบ่งชำระ)')
                              : 'สร้างใบแจ้งหนี้ (แบ่งชำระ) — ออกแล้ว'}
                          </option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
                      </div>
                    )}
                  </>
                )}
              </>
            ) : isReceiptDoc ? (
              !isSavedReadonly ? (
                <div className="flex flex-col items-end gap-1.5">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSave('save')}
                    disabled={!canSaveNow}
                    className="inline-flex items-center gap-2.5 xyl-doc-receipt-solid text-white px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all disabled:opacity-50"
                  >
                    {saving ? <Clock size={16} className="animate-spin" /> : <Save size={16} />}
                    {locale === 'en' ? 'Save the receipt' : locale === 'zh' ? '保存收据' : '                     บันทึกใบเสร็จ                   '}</motion.button>
                  {!isValid && validationErrors.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => {
                        const summary = document.getElementById('validation-summary-bottom');
                        if (summary) {
                          summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          summary.classList.add('ring-4', 'ring-amber-400/50');
                          setTimeout(() => summary.classList.remove('ring-4', 'ring-amber-400/50'), 2000);
                        } else {
                          scrollToError(validationErrors[0].elementId);
                        }
                      }}
                      className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 border border-amber-100 hover:bg-amber-100 transition-all flex items-center gap-1.5"
                    >
                      <AlertCircle size={10} />
                      {locale === 'en' ? 'The information is not complete.' : locale === 'zh' ? '信息不完整。' : '                       ข้อมูลยังไม่ครบ '}{validationErrors.length} {locale === 'en' ? 'point' : locale === 'zh' ? '观点' : ' จุด                     '}</button>
                  )}
                </div>
              ) : (
                <div className="relative inline-flex items-center">
                  <button
                    disabled={generatingPdf || saving || !canDownloadNow}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white bg-[#111111] transition-all disabled:opacity-40"
                  >
                    {generatingPdf ? <Clock size={16} className="animate-spin" /> : <Download size={16} />}
                    {locale === 'en' ? 'Download PDF' : locale === 'zh' ? '下载PDF' : '                     ดาวน์โหลด PDF                   '}</button>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const v = e.target.value
                      if (!v) return
                      void handleDownload(undefined, { includeCopy: v === 'all', isCopy: v === 'copy' })
                      e.target.value = ''
                    }}
                    disabled={generatingPdf || saving || !canDownloadNow}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>{locale === 'en' ? 'Choose a format' : locale === 'zh' ? '选择格式' : 'เลือกรูปแบบ'}</option>
                    <option value="all">{locale === 'en' ? 'Original + copy' : locale === 'zh' ? '原件+复印件' : 'ตัวจริง + สำเนา'}</option>
                    <option value="original">{locale === 'en' ? 'Only the real one' : locale === 'zh' ? '只有真品' : 'ตัวจริงเท่านั้น'}</option>
                    <option value="copy">{locale === 'en' ? 'Copy only' : locale === 'zh' ? '仅复制' : 'สำเนาเท่านั้น'}</option>
                  </select>
                </div>
              )
            ) : isSimpleDoc ? (
              !isSavedReadonly || (isEditableDocType && isEditingContent) ? (
                <div className="flex flex-col items-end gap-1.5">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSave('save')}
                    disabled={!canSaveNow}
                    className={`inline-flex items-center gap-2.5 ${primaryActionTone} text-white px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all disabled:opacity-50`}
                  >
                    {saving ? <Clock size={16} className="animate-spin" /> : <Save size={16} />}
                    {primaryActionLabel}
                  </motion.button>
                  {!isValid && validationErrors.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => {
                        const summary = document.getElementById('validation-summary-bottom');
                        if (summary) {
                          summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          summary.classList.add('ring-4', 'ring-amber-400/50');
                          setTimeout(() => summary.classList.remove('ring-4', 'ring-amber-400/50'), 2000);
                        } else {
                          scrollToError(validationErrors[0].elementId);
                        }
                      }}
                      className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 border border-amber-100 hover:bg-amber-100 transition-all flex items-center gap-1.5"
                    >
                      <AlertCircle size={10} />
                      {locale === 'en' ? 'The information is not complete.' : locale === 'zh' ? '信息不完整。' : '                       ข้อมูลยังไม่ครบ '}{validationErrors.length} {locale === 'en' ? 'point' : locale === 'zh' ? '观点' : ' จุด                     '}</button>
                  )}
                </div>
              ) : (
                <div className="relative inline-flex items-center">
                  <button
                    disabled={generatingPdf || saving || !canDownloadNow}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white bg-[#111111] transition-all disabled:opacity-40"
                  >
                    {generatingPdf ? <Clock size={16} className="animate-spin" /> : <Download size={16} />}
                    {locale === 'en' ? 'Download PDF' : locale === 'zh' ? '下载PDF' : '                     ดาวน์โหลด PDF                   '}</button>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const v = e.target.value
                      if (!v) return
                      void handleDownload(undefined, { includeCopy: v === 'all', isCopy: v === 'copy' })
                      e.target.value = ''
                    }}
                    disabled={generatingPdf || saving || !canDownloadNow}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>{locale === 'en' ? 'Choose a format' : locale === 'zh' ? '选择格式' : 'เลือกรูปแบบ'}</option>
                    <option value="all">{locale === 'en' ? 'Original + copy' : locale === 'zh' ? '原件+复印件' : 'ตัวจริง + สำเนา'}</option>
                    <option value="original">{locale === 'en' ? 'Only the real one' : locale === 'zh' ? '只有真品' : 'ตัวจริงเท่านั้น'}</option>
                    <option value="copy">{locale === 'en' ? 'Copy only' : locale === 'zh' ? '仅复制' : 'สำเนาเท่านั้น'}</option>
                  </select>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>

      <main className={`w-full px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 ${(isPlantMaterialDoc || isContractDoc) ? 'gap-6' : 'lg:grid-cols-2 gap-6 lg:gap-8'}`}>
        {(docType === 'quotation') && (
          <div className="lg:col-span-2">
            {error && <p className="text-[10px] text-red-500 font-black bg-red-500/5 p-3 border border-red-500/10 text-center mb-6">{error}</p>}
          </div>
        )}

        {(docType !== 'quotation' && !isContractDoc) && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#E5E5E5] p-6 sm:p-8 lg:col-span-2"
        >
          <fieldset disabled={disableDocumentFormInputs} className="space-y-6 border-0 m-0 p-0 min-w-0">
            {error && <p className="text-[10px] text-red-500 font-black bg-red-500/5 p-3 border border-red-500/10 text-center">{error}</p>}

            {docType === 'plant_material' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-3 border border-[#E5E5E5] bg-[#FAFAFA]">
                  <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest block mb-2">{locale === 'en' ? 'Select reference invoice' : locale === 'zh' ? '选择参考发票' : 'เลือกใบแจ้งหนี้อ้างอิง'}</label>
                  <select
                    value={chainSourceDocumentId}
                    onChange={(e) => { void handleSelectReferenceQuotation(e.target.value) }}
                    className="w-full py-2 px-3 bg-white border border-[#E5E5E5] text-xs font-bold text-[#111111] outline-none focus:border-[#111111]"
                  >
                    <option value="">{referenceQuotationsLoading ? 'กำลังโหลดใบแจ้งหนี้...' : 'เลือกใบแจ้งหนี้'}</option>
                    {referenceQuotations.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {(doc.document_code || doc.id.slice(0, 8))} {doc.created_at ? `• ${new Date(doc.created_at).toLocaleDateString('th-TH')}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-3 border border-[#E5E5E5] bg-[#FAFAFA]">
                <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-1.5">{locale === 'en' ? 'Reference documents (invoices)' : locale === 'zh' ? '参考文件（发票）' : 'เอกสารอ้างอิง (ใบแจ้งหนี้)'}</div>
                <div className="text-xs font-black text-[#111111]">{chainSourceDocument?.document_code || chainSourceDocumentId.slice(0, 8) || 'ยังไม่ได้เลือก'}</div>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-[#E5E5E5]">
                  {docType === 'receipt' ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="p-3 border border-[#E5E5E5] bg-[#FAFAFA]">
                        <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-1.5">{locale === 'en' ? 'Reference documents' : locale === 'zh' ? '参考文件' : 'เอกสารอ้างอิง'}</div>
                        <div className="text-xs font-black text-[#111111]">{chainSourceDocument?.document_code || chainSourceDocumentId.slice(0, 8) || '-'}</div>
                      </div>
                      <div className="p-3 border border-[#E5E5E5] bg-[#FAFAFA]">
                        <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-1.5">{locale === 'en' ? 'Net balance of reference documents' : locale === 'zh' ? '参考文件净余额' : 'ยอดสุทธิเอกสารอ้างอิง'}</div>
                        <div className="text-xs font-black text-[#111111]">{formatTHB(grandTotal)}</div>
                      </div>
                      <div className="p-3 border border-[#E5E5E5] bg-[#FAFAFA]">
                        <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-1.5">{locale === 'en' ? 'Total payment received according to this document' : locale === 'zh' ? '根据本文件收到的总付款' : 'ยอดรับชำระตามเอกสารนี้'}</div>
                        <div className="text-xs font-black text-[#111111]">{formatTHB(receiptPaidAmount)}</div>
                      </div>
                    </div>

                    <div className="p-3 border border-[#E5E5E5] bg-white text-[10px] font-bold uppercase tracking-widest text-[#666666]">
                      {isSavedReadonly
                        ? 'โหมดสรุปหลังบันทึก: แสดงข้อมูลใบเสร็จที่บันทึกแล้ว'
                        : 'โหมดบันทึก: กรอกข้อมูลรับชำระและเลือกงวดก่อนกดบันทึก'}
                    </div>

                    {(receiptInstallmentProgress || receiptEligibilityReason) && (
                      <div className={`p-3 border text-xs font-bold ${receiptEligibilityReason ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        {receiptInstallmentProgress ? `${receiptInstallmentProgress}` : ''}
                        {receiptInstallmentProgress && receiptEligibilityReason ? ' • ' : ''}
                        {receiptEligibilityReason || 'ชำระครบทุกงวดแล้ว สามารถออกใบเสร็จได้'}
                      </div>
                    )}

                    {isSavedReadonly ? (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="p-3 border border-[#E5E5E5] bg-white">
                          <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-1.5">{locale === 'en' ? 'Payment received date' : locale === 'zh' ? '付款收到日期' : 'วันที่รับชำระ'}</div>
                          <div className="text-xs font-black text-[#111111]">{paidAt ? new Date(paidAt).toLocaleDateString('th-TH') : '-'}</div>
                        </div>
                        <div className="p-3 border border-[#E5E5E5] bg-white">
                          <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-1.5">{locale === 'en' ? 'Payment method' : locale === 'zh' ? '付款方式' : 'วิธีการชำระเงิน'}</div>
                          <div className="text-xs font-black text-[#111111]">{receiptPaymentMethod || '-'}</div>
                        </div>
                        <div className="p-3 border border-[#E5E5E5] bg-white">
                          <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-1.5">{locale === 'en' ? 'Scope of payment' : locale === 'zh' ? '付款范围' : 'ขอบเขตการชำระ'}</div>
                          <div className="text-xs font-black text-[#111111]">{receiptPaymentScope === 'installments' ? 'ชำระรายงวด' : 'ชำระเต็ม'}</div>
                        </div>
                      </div>
                    ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                        <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest block mb-2">{locale === 'en' ? 'Date of receipt of payment *' : locale === 'zh' ? '收到付款日期 *' : 'วันที่รับชำระ *'}</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" size={14} />
                            <input
                              id="paid-at"
                              type="date"
                              value={paidAt}
                              onChange={(e) => setPaidAt(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 bg-[#FAFAFA] border border-[#E5E5E5] text-xs font-bold text-[#111111] outline-none focus:border-[#111111] required:border-red-500"
                            required
                            />
                        </div>
                        </div>

                        <div>
                        <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest block mb-2">{locale === 'en' ? 'Payment method *' : locale === 'zh' ? '付款方式 *' : 'วิธีการชำระเงิน *'}</label>
                        <select
                            id="receipt-payment-method"
                            value={receiptPaymentMethod}
                            onChange={(e) => setReceiptPaymentMethod(e.target.value as 'cash' | 'transfer' | 'credit_card' | 'cheque' | 'other')}
                            className="w-full py-2.5 px-3 bg-[#FAFAFA] border border-[#E5E5E5] text-xs font-bold text-[#111111] outline-none focus:border-[#111111]"
                        >
                            <option value="">{locale === 'en' ? 'Choose payment method' : locale === 'zh' ? '选择付款方式' : 'เลือกวิธีการชำระเงิน'}</option>
                            <option value="transfer">{locale === 'en' ? 'transfer money' : locale === 'zh' ? '转账' : 'โอนเงิน'}</option>
                            <option value="cash">{locale === 'en' ? 'cash' : locale === 'zh' ? '现金' : 'เงินสด'}</option>
                            <option value="credit_card">{locale === 'en' ? 'credit card' : locale === 'zh' ? '信用卡' : 'บัตรเครดิต'}</option>
                            <option value="cheque">{locale === 'en' ? 'check' : locale === 'zh' ? '查看' : 'เช็ค'}</option>
                            <option value="other">{locale === 'en' ? 'other' : locale === 'zh' ? '其他' : 'อื่นๆ'}</option>
                        </select>
                        </div>
        
                        <div>
                        <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">{locale === 'en' ? 'Total payment received' : locale === 'zh' ? '收到的付款总额' : 'ยอดรับชำระ'}</div>
                        <div className="h-[42px] px-3 border border-[#E5E5E5] bg-[#FAFAFA] flex items-center text-sm font-black text-[#111111]">
                            {formatTHB(receiptPaidAmount)}
                        </div>
                        </div>
                    </div>
                    )}

                  {!isSavedReadonly && receiptInstallments.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[#111111]">{locale === 'en' ? 'payment of receipt' : locale === 'zh' ? '付款收据' : 'การชำระของใบเสร็จ'}</h3>
                        <div className="flex bg-[#F5F5F5] p-1">
                          <button
                            onClick={() => setReceiptPaymentScope('full')}
                            className={`px-3 py-1.5 text-[10px] font-bold transition-all ${receiptPaymentScope === 'full' ? 'bg-white text-[#111111] border border-[#E5E5E5]' : 'text-[#666666] hover:text-[#111111]'}`}
                          >
                            {locale === 'en' ? 'Paid in full' : locale === 'zh' ? '已全额付款' : '                             ชำระเต็ม                           '}</button>
                          <button
                            onClick={() => setReceiptPaymentScope('installments')}
                            className={`px-3 py-1.5 text-[10px] font-bold transition-all ${receiptPaymentScope === 'installments' ? 'bg-white text-[#111111] border border-[#E5E5E5]' : 'text-[#666666] hover:text-[#111111]'}`}
                          >
                            {locale === 'en' ? 'Select period' : locale === 'zh' ? '选择期间' : '                             เลือกงวด                           '}</button>
                        </div>
                      </div>

                      {receiptPaymentScope === 'installments' && (
                        <div id="receipt-installments-list" className="space-y-2">
                          {receiptInstallments.map((it, idx) => {
                            const checked = selectedReceiptInstallmentIds.includes(it.id)
                            return (
                              <label key={it.id} className="flex items-center justify-between gap-3 p-3 border border-[#E5E5E5] bg-white cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setSelectedReceiptInstallmentIds((prev) =>
                                        prev.includes(it.id) ? prev.filter((id) => id !== it.id) : [...prev, it.id]
                                      )
                                    }}
                                    className="accent-[#111111]"
                                  />
                                  <div>
                                    <div className="text-xs font-bold text-[#111111]">{it.label || `งวดที่ ${idx + 1}`}</div>
                                    <div className="text-[10px] text-[#A3A3A3] font-bold">{it.due_at ? new Date(it.due_at).toLocaleDateString('th-TH') : 'ไม่ระบุวันครบกำหนด'}</div>
                                  </div>
                                </div>
                                <div className="text-xs font-black text-[#111111]">{formatTHB(Number(it.computed_amount) || 0)}</div>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : docType === 'invoice' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="p-3 border border-[#E5E5E5] bg-[#FAFAFA]">
                      <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-1.5">{locale === 'en' ? 'Reference documents' : locale === 'zh' ? '参考文件' : 'เอกสารอ้างอิง'}</div>
                      <div className="text-xs font-black text-[#111111]">{chainSourceDocument?.document_code || chainSourceDocumentId.slice(0, 8) || '-'}</div>
                    </div>
                    <div className="p-3 border border-[#E5E5E5] bg-[#FAFAFA]">
                      <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-1.5">{locale === 'en' ? 'Invoice net amount' : locale === 'zh' ? '发票净额' : 'ยอดสุทธิใบแจ้งหนี้'}</div>
                      <div className="text-xs font-black text-[#111111]">{formatTHB(grandTotal)}</div>
                    </div>
                    <div className="p-3 border border-[#E5E5E5] bg-[#FAFAFA]">
                      <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-1.5">{locale === 'en' ? 'Payment status' : locale === 'zh' ? '付款状态' : 'สถานะการชำระ'}</div>
                      <div className="text-xs font-black text-[#111111]">{split ? 'แบ่งงวด' : 'ชำระเต็ม'}</div>
                    </div>
                  </div>

                  {docType === 'invoice' && !isSavedReadonly && !effectiveInvoiceSplit && (
                    <div className="max-w-[260px]">
                      <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest block mb-2">{locale === 'en' ? 'Payment is due within *' : locale === 'zh' ? '付款期限为 *' : 'กำหนดชำระภายในวันที่ *'}</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" size={12} />
                        <input
                          type="date"
                          value={dueAt}
                          onChange={(e) => setDueAt(e.target.value)}
                          className={`w-full pl-8 pr-3 py-2 bg-white border text-[10px] font-bold text-[#111111] outline-none ${dueAt ? 'border-[#E5E5E5] focus:border-[#111111]' : 'border-red-300 focus:border-red-500'}`}
                        />
                      </div>
                    </div>
                  )}

                  {docType === 'invoice' && !isSavedReadonly && effectiveInvoiceSplit && isInvoiceFromQuotationFlow && invoiceInstallmentOptions.length > 0 && (
                    <div className="p-4 border border-indigo-200 bg-indigo-50/60 space-y-3">
                      <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">{locale === 'en' ? 'Select the invoice period.' : locale === 'zh' ? '选择发票期间。' : 'เลือกงวดที่ออกใบแจ้งหนี้'}</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <select
                          value={selectedInvoiceInstallmentId}
                          onChange={(e) => {
                            const nextId = e.target.value
                            setSelectedInvoiceInstallmentId(nextId)
                            const nextMeta = invoiceInstallmentOptions.find((item) => item.id === nextId)
                            if (nextMeta?.due_at) {
                              setDueAt(nextMeta.due_at)
                            }
                          }}
                          className="w-full py-2.5 px-3 bg-white border border-indigo-200 text-xs font-bold text-[#111111] outline-none focus:border-indigo-500"
                        >
                          {invoiceInstallmentOptions.map((item, index) => (
                            <option key={item.id} value={item.id}>
                              {item.label || `งวดที่ ${index + 1}`}
                            </option>
                          ))}
                        </select>
                        <div className="text-xs font-bold text-indigo-700 flex items-center lg:justify-end">
                          {remainingInvoiceInstallmentLabels.length > 0
                            ? `งวดที่เหลือ: ${remainingInvoiceInstallmentLabels.join(', ')}`
                            : 'งวดนี้เป็นงวดสุดท้าย'}
                        </div>
                      </div>
                      {selectedInvoiceInstallmentMeta?.due_at && (
                        <div className="text-[11px] font-bold text-indigo-700">
                          {locale === 'en' ? 'Due date for this period:' : locale === 'zh' ? '此期间的截止日期：' : '                           วันครบกำหนดของงวดนี้: '}{new Date(selectedInvoiceInstallmentMeta.due_at).toLocaleDateString('th-TH')}
                        </div>
                      )}
                      {selectedInvoiceInstallmentMeta?.due_scope && (
                        <div className="text-[11px] font-bold text-indigo-700/90">
                          {locale === 'en' ? 'Determined according to the scope of work:' : locale === 'zh' ? '根据工作范围确定：' : '                           กำหนดตามขอบเขตงาน: '}{selectedInvoiceInstallmentMeta.due_scope}
                        </div>
                      )}
                    </div>
                  )}

                  {!isSavedReadonly && (
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#111111]">{locale === 'en' ? 'Payment plan' : locale === 'zh' ? '付款计划' : 'แผนการชำระเงิน'}</h3>
                    <div className="flex bg-[#F5F5F5] p-1">
                      <button
                        onClick={() => setSplit(false)}
                        disabled={isInvoicePaymentModeLocked}
                        className={`px-3 py-1.5 text-[10px] font-bold transition-all ${!split ? 'bg-white text-[#111111] border border-[#E5E5E5]' : 'text-[#666666] hover:text-[#111111]'}`}
                      >
                        {locale === 'en' ? 'Paid in full' : locale === 'zh' ? '已全额付款' : '                         ชำระเต็ม                       '}</button>
                      <button
                        onClick={() => setSplit(true)}
                        disabled={isInvoicePaymentModeLocked}
                        className={`px-3 py-1.5 text-[10px] font-bold transition-all ${split ? 'bg-white text-[#111111] border border-[#E5E5E5]' : 'text-[#666666] hover:text-[#111111]'}`}
                      >
                        {locale === 'en' ? 'Split installments' : locale === 'zh' ? '分期付款' : '                         แบ่งงวด                       '}</button>
                    </div>
                  </div>
                  )}

                  {!isSavedReadonly && isInvoicePaymentModeLocked && (
                    <div className="p-3 border border-amber-200 bg-amber-50 text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                      {locale === 'en' ? 'The invoice payment plan is determined from the quote.' : locale === 'zh' ? '发票付款计划根据报价确定。' : '                       แผนชำระเงินของใบแจ้งหนี้ถูกกำหนดจากใบเสนอราคาแล้ว                     '}</div>
                  )}

                  {!isSavedReadonly ? (
                  <AnimatePresence mode="wait">
                    {!split ? (
                      <motion.div
                        key="full-top"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="py-2"
                      >
                        <div className="p-4 bg-[#F5F5F5] border border-dashed border-[#E5E5E5] text-center space-y-4">
                          <p className="text-xs font-bold text-[#111111]">{locale === 'en' ? 'Pay the net amount' : locale === 'zh' ? '支付净额' : 'ชำระยอดสุทธิ '}{formatTHB(grandTotal)} {locale === 'en' ? 'in one installment' : locale === 'zh' ? '一次性' : ' ในงวดเดียว'}</p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="split-top"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-6"
                      >
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setInstallmentMode('amount')}
                              disabled={!canEditInvoiceInstallmentDetails}
                              className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 transition-all outline-none ${installmentMode === 'amount' ? 'bg-[#111111] text-white' : 'bg-[#F5F5F5] text-[#666666] hover:text-[#111111]'}`}
                            >
                              {locale === 'en' ? 'Specify the amount' : locale === 'zh' ? '指定金额' : '                               ระบุยอดเงิน                             '}</button>
                            <button
                              onClick={() => setInstallmentMode('percent')}
                              disabled={!canEditInvoiceInstallmentDetails}
                              className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 transition-all outline-none ${installmentMode === 'percent' ? 'bg-[#111111] text-white' : 'bg-[#F5F5F5] text-[#666666] hover:text-[#111111]'}`}
                            >
                              {locale === 'en' ? 'Specify the proportion' : locale === 'zh' ? '指定比例' : '                               ระบุสัดส่วน                             '}</button>
                          </div>
                          <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">
                            {installments.length} {locale === 'en' ? 'period' : locale === 'zh' ? '时期' : ' งวด                           '}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                          {installments.map((it, idx) => {
                              const { locale } = useI18n();
                            const computed = computedInstallments.find((x) => x.id === it.id)?.computed_amount || 0
                            return (
                              <div key={it.id} className="p-4 border border-[#E5E5E5] bg-white relative space-y-4">
                                <div className="flex justify-between items-center mb-2">
                                  <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'Period details' : locale === 'zh' ? '期间详情' : 'รายละเอียดงวดที่ '}{idx + 1}</label>
                                  <button
                                    onClick={() => removeInstallment(it.id)}
                                    disabled={installments.length <= 1 || !canEditInvoiceInstallmentDetails}
                                    className="text-[#A3A3A3] hover:text-red-500 transition-colors disabled:opacity-30"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <div className="space-y-3">
                                  <input
                                    id={`inst-label-${it.id}`}
                                    type="text"
                                    placeholder={locale === 'en' ? 'Name of the period, such as period 1.' : locale === 'zh' ? '期间名称，例如期间 1。' : 'ชื่องวด เช่น งวดที่ 1'}
                                    value={it.label}
                                    disabled={!canEditInvoiceInstallmentDetails}
                                    onChange={(e) => updateInstallment(it.id, { label: e.target.value })}
                                    className="w-full bg-[#FAFAFA] border border-[#E5E5E5] px-3 py-2 text-xs font-bold text-[#111111] outline-none focus:border-[#111111]"
                                  />
                                  <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" size={12} />
                                      <input
                                        id={`inst-date-${it.id}`}
                                        type="date"
                                        value={it.due_at}
                                        disabled={!canEditInvoiceInstallmentDetails}
                                        onChange={(e) => updateInstallment(it.id, { due_at: e.target.value })}
                                        className="w-full pl-8 pr-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] text-[10px] font-bold text-[#111111] outline-none focus:border-[#111111]"
                                      />
                                    </div>
                                    <div className="relative flex-1 flex flex-col items-end">
                                      <div className="flex items-center w-full">
                                        <input
                                          id={installmentMode === 'amount' ? `inst-amount-${it.id}` : `inst-percent-${it.id}`}
                                          type="number"
                                          placeholder={installmentMode === 'amount' ? 'จำนวนเงิน (฿)' : 'สัดส่วน (%)'}
                                          value={installmentMode === 'amount' ? it.amount || '' : it.percent || ''}
                                          disabled={!canEditInvoiceInstallmentDetails}
                                          onChange={(e) => updateInstallment(it.id, installmentMode === 'amount' ? { amount: Number(e.target.value) } : { percent: Number(e.target.value) })}
                                          className="w-full bg-[#FAFAFA] border border-[#E5E5E5] px-3 py-2 text-xs font-bold text-[#111111] text-right outline-none focus:border-[#111111]"
                                        />
                                      </div>
                                      {installmentMode === 'percent' && (
                                        <div className="mt-1 text-[9px] font-bold text-[#A3A3A3] uppercase tracking-widest text-right w-full">
                                          = {formatTHB(computed)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest block">{locale === 'en' ? 'Set according to the scope of work' : locale === 'zh' ? '根据工作范围设定' : 'กำหนดตามขอบเขตงาน'}</label>
                                    <input
                                      type="text"
                                      list="installment-scope-suggestions"
                                      placeholder={locale === 'en' ? 'For example, pay before starting work, pay after delivering work.' : locale === 'zh' ? '例如，上班前付款、交工后付款。' : 'เช่น ชำระก่อนเริ่มงาน, ชำระหลังส่งมอบงาน'}
                                      value={it.due_scope}
                                      disabled={!canEditInvoiceInstallmentDetails}
                                      onChange={(e) => updateInstallment(it.id, { due_scope: e.target.value })}
                                      className="w-full bg-[#FAFAFA] border border-[#E5E5E5] px-3 py-2 text-xs font-bold text-[#111111] outline-none focus:border-[#111111]"
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        <datalist id="installment-scope-suggestions">
                          {INSTALLMENT_SCOPE_SUGGESTIONS.map((suggestion) => (
                            <option key={suggestion} value={suggestion} />
                          ))}
                        </datalist>

                        <button
                          onClick={addInstallment}
                          disabled={!canEditInvoiceInstallmentDetails}
                          className="w-full py-3 bg-[#F5F5F5] text-[#111111] text-[10px] font-bold uppercase tracking-widest hover:bg-[#E5E5E5] transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> {locale === 'en' ? 'Increase payment period' : locale === 'zh' ? '延长付款期限' : ' เพิ่มงวดชำระ                         '}</button>

                        {Math.abs(installmentSum - grandTotal) > 0.01 && installmentMode === 'amount' && (
                          <div className="p-3 border border-red-500/20 bg-red-500/5 text-center">
                            <p className="text-[10px] font-bold text-red-500">
                              {locale === 'en' ? 'Total amount divided into installments (' : locale === 'zh' ? '总金额分为分期付款（' : '                               ยอดรวมที่แบ่งงวด ('}{formatTHB(installmentSum)}{locale === 'en' ? ') does not match the net amount (' : locale === 'zh' ? ') 与净额 (' : ') ไม่ตรงกับยอดสุทธิ ('}{formatTHB(grandTotal)})
                            </p>
                          </div>
                        )}
                        {Math.abs(percentSum - 100) > 0.01 && installmentMode === 'percent' && (
                          <div className="p-3 border border-red-500/20 bg-red-500/5 text-center">
                            <p className="text-[10px] font-bold text-red-500">
                              {locale === 'en' ? 'Total proportion (' : locale === 'zh' ? '总比例（' : '                               สัดส่วนรวม ('}{percentSum}{locale === 'en' ? '%) is not equal to 100%' : locale === 'zh' ? '%) 不等于 100%' : '%) ไม่เท่ากับ 100%                             '}</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  ) : (
                    <div className="p-4 border border-[#E5E5E5] bg-white">
                      <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-2">{locale === 'en' ? 'Invoice payment information' : locale === 'zh' ? '发票付款信息' : 'ข้อมูลการชำระของใบแจ้งหนี้'}</div>
                      {!effectiveInvoiceSplit && (
                        <div className="text-xs font-black text-[#111111]">{locale === 'en' ? 'Payment due date:' : locale === 'zh' ? '付款到期日：' : 'กำหนดชำระ: '}{dueAt ? new Date(dueAt).toLocaleDateString('th-TH') : '-'}</div>
                      )}
                      <div className="text-xs font-black text-[#111111] mt-1">{locale === 'en' ? 'Payment type:' : locale === 'zh' ? '付款方式：' : 'ประเภทชำระ: '}{split ? 'แบ่งงวด' : 'ชำระเต็ม'}</div>
                      {split && (
                        <>
                          <div className="text-xs font-bold text-[#666666] mt-1">{locale === 'en' ? 'Number of installments:' : locale === 'zh' ? '分期付款次数：' : 'จำนวนงวด: '}{installments.length} {locale === 'en' ? 'period' : locale === 'zh' ? '时期' : ' งวด'}</div>
                          <div className="mt-2 space-y-1.5">
                            {installments.map((installment, index) => (
                              <div key={installment.id} className="text-xs text-[#444444]">
                                <span className="font-black text-[#111111]">{installment.label || `งวดที่ ${index + 1}`}</span>
                                {installment.due_scope ? ` • ${installment.due_scope}` : ''}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </fieldset>
        </motion.section>
        )}

        {!hideLockedInputSections && (
        <fieldset disabled={!canEditCoreContent} className="contents">
          {/* Section 1: General Info */}
          {!isPlantMaterialDoc && !isContractDoc && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#E5E5E5] p-6 sm:p-8 lg:col-span-2"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 border border-[#E5E5E5] text-[#111111] flex items-center justify-center">
                <Layout size={20} />
              </div>
              <h2 className="text-lg font-medium tracking-wide uppercase">{locale === 'en' ? 'Basic information' : locale === 'zh' ? '基本信息' : 'ข้อมูลพื้นฐาน'}</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2 px-1">{locale === 'en' ? 'Extract data from orders (optional)' : locale === 'zh' ? '从订单中提取数据（可选）' : 'ดึงข้อมูลจากคำสั่งซื้อ (ไม่บังคับ)'}</label>
                  <select
                    value={sourceOrderId}
                    onChange={(e) => handleSelectOrder(e.target.value)}
                    disabled={ordersLoading}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  >
                    <option value="">{locale === 'en' ? 'Fill it all out yourself' : locale === 'zh' ? '全部自己填写' : 'กรอกเองทั้งหมด'}</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {(o.order_code || o.id?.slice?.(0, 8) || 'ORDER')} • {(o.profiles?.display_name || o.profiles?.email || 'ลูกค้า')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2 px-1">{locale === 'en' ? 'Customer / document recipient *' : locale === 'zh' ? '客户/文件收件人*' : 'ลูกค้า / ผู้รับเอกสาร *'}</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="recipient-name"
                      type="text"
                      list="customer-name-suggestions"
                      value={recipientName}
                      onChange={(e) => {
                        const value = e.target.value
                        setRecipientName(value)
                        syncCustomerFromInput(value)
                      }}
                      onBlur={(e) => syncCustomerFromInput(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      placeholder={locale === 'en' ? 'Type a name or select from a list of customers.' : locale === 'zh' ? '输入名称或从客户列表中进行选择。' : 'พิมพ์ชื่อหรือเลือกจากรายชื่อลูกค้า'}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2 px-1">{locale === 'en' ? 'Document number' : locale === 'zh' ? '文件编号' : 'เลขที่เอกสาร'}</label>
                  <input
                    id="document-code"
                    type="text"
                    value={documentCode}
                    onChange={(e) => setDocumentCode(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    placeholder={locale === 'en' ? 'Leave blank to run automatically.' : locale === 'zh' ? '留空即可自动运行。' : 'เว้นว่างเพื่อรันอัตโนมัติ'}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2 px-1">{locale === 'en' ? 'Project name / Work name' : locale === 'zh' ? '项目名称/作品名称' : 'ชื่อโปรเจค / ชื่องาน'}</label>
                  <input
                    type="text"
                    list="project-name-suggestions"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={(e) => persistProjectName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white transition-all outline-none"
                    placeholder={locale === 'en' ? 'For example, improving the garden of Mr. Somchai\'s house.' : locale === 'zh' ? '例如，改善Somchai先生家的花园。' : 'เช่น ปรับปรุงสวนบ้านคุณสมชาย'}
                  />
                  <datalist id="project-name-suggestions">
                    {projectNameHistory.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{locale === 'en' ? 'Customer\'s home address' : locale === 'zh' ? '客户的家庭住址' : 'ที่อยู่บ้านลูกค้า'}</label>
                    {houses.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleSelectHouse(e.target.value)
                        }}
                        disabled={!sourceCustomerId || housesLoading}
                        className="text-[10px] font-bold text-blue-600 bg-transparent border-none outline-none cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed text-right max-w-[150px]"
                      >
                        <option value="">{locale === 'en' ? '+ Choose from notes' : locale === 'zh' ? '+ 从笔记中选择' : '+ เลือกจากบันทึก'}</option>
                        {houses.map((house) => (
                          <option key={house.id} value={house.id}>
                            {(house.name || house.house_code)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-4 text-gray-400" />
                    <textarea 
                      rows={1} 
                      value={recipientAddress} 
                      onChange={(e) => setRecipientAddress(e.target.value)} 
                      className="w-full h-[52px] bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-gray-900 focus:bg-white transition-all outline-none resize-none leading-relaxed" 
                      placeholder={locale === 'en' ? 'Specify the address at the work site...' : locale === 'zh' ? '指定工作地点的地址...' : 'ระบุที่อยู่นหน้างาน...'} 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2 px-1">{locale === 'en' ? 'Recipient phone number' : locale === 'zh' ? '收件人电话号码' : 'เบอร์โทรศัพท์ผู้รับ'}</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-gray-900 focus:bg-white transition-all outline-none" placeholder="0xxxxxxxxx" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2 px-1">{locale === 'en' ? 'Tax identification number' : locale === 'zh' ? '税号' : 'เลขประจำตัวผู้เสียภาษี'}</label>
                  <input
                    type="text"
                    value={recipientTaxId}
                    onChange={(e) => setRecipientTaxId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white transition-all outline-none"
                    placeholder={locale === 'en' ? 'For example: 010xxxxxxxxx' : locale === 'zh' ? '例如：010xxxxxxxxx' : 'เช่น 010xxxxxxxxx'}
                  />
                </div>
              </div>
            </div>
          </motion.section>
          )}

          {/* Section 2: Items & Zones */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4 sm:space-y-6 lg:col-span-2"
          >
            {!isContractDoc && (
            <div className="flex items-center justify-between px-2 sm:px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-[#E5E5E5] text-[#111111] flex items-center justify-center">
                  <Package size={20} />
                </div>
                <h2 className="text-sm sm:text-lg font-medium tracking-wide uppercase">{isPlantMaterialDoc ? 'Plant Layout' : isContractDoc ? 'Document Preview' : 'รายการสินค้าและการจัดโซน'}</h2>
              </div>
              {!isContractDoc && (
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <input
                    type="checkbox"
                    checked={showZones}
                    disabled={isCompactItemListDoc}
                    onChange={(e) => {
                      const next = e.target.checked
                      setShowZones(next)
                      if (!next) {
                        setZones((prev) => {
                          if (!prev.length) return [newZone(1)]
                          const fallbackZone = prev[0]
                          const mergedCategories = prev
                            .flatMap((z) => z.categories)
                            .map((category, idx) => ({
                              id: category.id || `${idx}-${Math.random().toString(36).slice(2, 8)}`,
                              name: category.name || `หมวดหมู่ ${idx + 1}`,
                              main_category: category.main_category,
                              subcategory: category.subcategory,
                              items: Array.isArray(category.items) && category.items.length ? category.items : [newItem(category.main_category, category.subcategory)],
                            }))

                          return [{
                            id: fallbackZone.id,
                            name: fallbackZone.name,
                            categories: mergedCategories.length ? mergedCategories : [newCategory(1)],
                          }]
                        })
                      }
                    }}
                    className="accent-[#0A7B4A]"
                  />
                  {locale === 'en' ? 'Turn on zone mode' : locale === 'zh' ? '开启区域模式' : '                   เปิดโหมดโซน                 '}</label>
                {showZones && !isCompactItemListDoc && (
                  <button
                    onClick={() => setZones([...zones, newZone(zones.length + 1)])}
                    className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-[0.12em] transition-all"
                  >
                    <Plus size={14} /> {locale === 'en' ? 'Add a new zone' : locale === 'zh' ? '添加新区域' : ' เพิ่มโซนใหม่                   '}</button>
                )}
              </div>
              )}
            </div>
            )}

            {isContractDoc && (
              <div className="mx-2 sm:mx-4">
                <LandscapeTurnkeyContractPreview
                  contractType={contractType}
                  onContractTypeChange={setContractType}
                  referenceQuotations={referenceQuotations}
                  referenceQuotationsLoading={referenceQuotationsLoading}
                  referenceDocumentLabel={locale === 'en' ? 'Invoice' : locale === 'zh' ? '发票' : 'ใบแจ้งหนี้'}
                  selectedReferenceQuotationId={chainSourceDocumentId}
                  onReferenceQuotationChange={(value) => { void handleSelectReferenceQuotation(value) }}
                  onApplyReferenceQuotation={() => { void applyReferenceQuotationToContract() }}
                  onApplySystemSettings={applySystemSettingsToContract}
                  onResetOverrides={resetContractOverrides}
                  errorMessage={error}
                  blockingErrors={contractBlockingErrors}
                  documentCode={documentCode}
                  contractPreviewDate={contractPreviewDate}
                  signingLocation={contractSigningLocation}
                  onSigningLocationChange={(value) => setContractFormFields((prev) => ({ ...prev, signing_location: value }))}
                  customerName={recipientName}
                  customerNameDisplay={contractCustomerName}
                  onCustomerNameChange={setRecipientName}
                  customerTaxId={recipientTaxId}
                  customerTaxIdDisplay={contractCustomerTaxId}
                  onCustomerTaxIdChange={setRecipientTaxId}
                  customerAddress={recipientAddress}
                  customerAddressDisplay={contractCustomerAddress}
                  onCustomerAddressChange={setRecipientAddress}
                  employerSignerName={contractFormFields.employer_signer_name}
                  employerSignerDisplay={contractEmployerSignerName}
                  onEmployerSignerNameChange={(value) => setContractFormFields((prev) => ({ ...prev, employer_signer_name: value }))}
                  companyName={landscapeContractCompanyName}
                  onCompanyNameChange={(value) => setContractFormFields((prev) => ({ ...prev, contractor_company_name: value }))}
                  companyAddress={landscapeContractCompanyAddress}
                  onCompanyAddressChange={(value) => setContractFormFields((prev) => ({ ...prev, contractor_company_address: value }))}
                  companyTaxId={landscapeContractCompanyTaxId}
                  onCompanyTaxIdChange={(value) => setContractFormFields((prev) => ({ ...prev, contractor_company_tax_id: value }))}
                  grandTotal={grandTotal}
                  grandTotalText={contractGrandTotalText}
                  referenceCode={contractReferenceCode}
                  referenceDate={contractReferenceDate}
                  projectLocation={contractProjectLocation}
                  onProjectLocationChange={(value) => setContractFormFields((prev) => ({ ...prev, project_location: value }))}
                  scopePreviewItems={contractScopePreviewItems.map((item) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                  }))}
                  scopeExtraCount={contractScopeExtraCount}
                  scopeCategoryCount={contractCategorySummaries.length}
                  scopeZoneCount={zones.length}
                  installments={contractPreviewInstallments}
                  bankText={landscapeContractBankText}
                  landDeedNumber={contractLandDeedNumber}
                  onLandDeedNumberChange={(value) => setContractFormFields((prev) => ({ ...prev, land_deed_number: value }))}
                  workStartDate={contractFormFields.work_start_date}
                  workStartDateDisplay={contractWorkStartDate}
                  onWorkStartDateChange={(value) => setContractFormFields((prev) => ({ ...prev, work_start_date: value }))}
                  workEndDate={contractFormFields.work_end_date}
                  workEndDateDisplay={contractWorkEndDate}
                  onWorkEndDateChange={(value) => setContractFormFields((prev) => ({ ...prev, work_end_date: value }))}
                  quotationAttachmentPages={contractQuotationAttachmentPages}
                  onQuotationAttachmentPagesChange={(value) => setContractFormFields((prev) => ({ ...prev, quotation_attachment_pages: value }))}
                  invoiceReferenceCode={contractInvoiceReferenceCode}
                  onInvoiceReferenceCodeChange={(value) => setContractFormFields((prev) => ({ ...prev, invoice_reference_code: value }))}
                  invoiceAttachmentPages={contractInvoiceAttachmentPages}
                  onInvoiceAttachmentPagesChange={(value) => setContractFormFields((prev) => ({ ...prev, invoice_attachment_pages: value }))}
                  employerWitnessName={contractEmployerWitnessName}
                  onEmployerWitnessNameChange={(value) => setContractFormFields((prev) => ({ ...prev, employer_witness_name: value }))}
                  employerAttachmentPages={contractEmployerAttachmentPages}
                  onEmployerAttachmentPagesChange={(value) => setContractFormFields((prev) => ({ ...prev, employer_id_attachment_pages: value }))}
                  contractorSignerName={landscapeContractSignerName}
                  onContractorSignerNameChange={(value) => setContractFormFields((prev) => ({ ...prev, contractor_signer_name: value }))}
                  contractorWitnessName={landscapeContractWitnessName}
                  onContractorWitnessNameChange={(value) => setContractFormFields((prev) => ({ ...prev, contractor_witness_name: value }))}
                  contractorAttachmentPages={contractContractorAttachmentPages}
                  onContractorAttachmentPagesChange={(value) => setContractFormFields((prev) => ({ ...prev, contractor_id_attachment_pages: value }))}
                  selectedConditions={selectedContractConditions}
                  notes={notes}
                  disabled={disableDocumentFormInputs}
                />
              </div>
            )}

            {docType === 'plant_material' && (
              <div
                className="mx-2 sm:mx-4 border border-[#E5E5E5] bg-[#FCFCF8] p-5 sm:p-6"
                style={{ fontFamily: 'var(--font-sarabun), Arial, Helvetica, sans-serif' }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5">
                  <div>
                    <div className="text-[11px] font-bold text-[#8A8A82] uppercase tracking-[0.22em] mb-2">Plant Material Layout</div>
                    <div className="text-lg sm:text-xl font-black text-[#111111] leading-tight">{locale === 'en' ? 'Live preview of PDF pages, ready to drag and change card positions instantly.' : locale === 'zh' ? 'PDF 页面的实时预览，可立即拖动和更改卡片位置。' : 'พรีวิวหน้า PDF แบบสด พร้อมลากสลับตำแหน่งการ์ดได้ทันที'}</div>
                    <div className="text-sm text-[#5F5F58] mt-2 leading-6">{locale === 'en' ? 'This preview uses the same layout as the actual PDF file. Order, resize, and save directly from this page.' : locale === 'zh' ? '此预览使用与实际 PDF 文件相同的布局。直接从此页面订购、调整大小和保存。' : 'พรีวิวนี้ใช้ layout เดียวกับไฟล์ PDF จริง จัดลำดับ ปรับขนาด แล้วบันทึกได้จากหน้านี้โดยตรง'}</div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 min-w-0">
                    <div className="border border-[#E7E7DE] bg-white px-3 py-3">
                      <div className="text-[10px] font-bold text-[#9A9A92] uppercase tracking-[0.18em] mb-1">Source</div>
                      <div className="text-sm font-black text-[#111111] truncate">{chainSourceDocument?.document_code || chainSourceDocumentId.slice(0, 8) || '-'}</div>
                    </div>
                    <div className="border border-[#E7E7DE] bg-white px-3 py-3">
                      <div className="text-[10px] font-bold text-[#9A9A92] uppercase tracking-[0.18em] mb-1">Pages</div>
                      <div className="text-sm font-black text-[#111111]">{plantMaterialPreviewPages.length}</div>
                    </div>
                    <div className="border border-[#E7E7DE] bg-white px-3 py-3">
                      <div className="text-[10px] font-bold text-[#9A9A92] uppercase tracking-[0.18em] mb-1">Cards</div>
                      <div className="text-sm font-black text-[#111111]">{plantMaterialPreviewCards.length}</div>
                    </div>
                    <div className="border border-[#E7E7DE] bg-white px-3 py-3 col-span-2 sm:col-span-1">
                      <div className="text-[10px] font-bold text-[#9A9A92] uppercase tracking-[0.18em] mb-1">Sections</div>
                      <div className="text-sm font-black text-[#111111]">{Object.keys(plantMaterialCategoryStats).length}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-[#E7E7DE] bg-white px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPlantLayoutReorderMode((prev) => {
                        const next = !prev
                        if (next) {
                          setActivePlantEditSurface(null)
                        } else {
                          setDraggingPlantCardKey(null)
                        }
                        return next
                      })
                    }}
                    className={`inline-flex items-center gap-2 px-3 py-2 border text-[11px] font-black uppercase tracking-[0.16em] transition-colors ${plantLayoutReorderMode ? 'border-[#111111] bg-[#111111] text-white' : 'border-[#B8B3A3] text-[#444444] hover:border-[#111111] hover:text-[#111111]'}`}
                  >
                    <Move size={13} />
                    <span>{plantLayoutReorderMode ? 'Done Position' : 'Edit Position'}</span>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyPlantLayoutPreset('compact')}
                      className="inline-flex items-center justify-center px-4 py-2 border border-[#B8B3A3] text-[11px] font-black uppercase tracking-[0.16em] text-[#444444] hover:border-[#111111] hover:text-[#111111] transition-colors"
                    >
                      Compact
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPlantLayoutPreset('balanced')}
                      className="inline-flex items-center justify-center px-4 py-2 border border-[#111111] text-[11px] font-black uppercase tracking-[0.16em] text-[#111111] hover:bg-[#111111] hover:text-white transition-colors"
                    >
                      Balanced
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPlantLayoutPreset('showcase')}
                      className="inline-flex items-center justify-center px-4 py-2 border border-[#B8B3A3] text-[11px] font-black uppercase tracking-[0.16em] text-[#444444] hover:border-[#111111] hover:text-[#111111] transition-colors"
                    >
                      Showcase
                    </button>
                    <button
                      type="button"
                      onClick={applyPlantAutoLayout}
                      className="inline-flex items-center justify-center px-4 py-2 border border-[#111111] bg-[#111111] text-[11px] font-black uppercase tracking-[0.16em] text-white hover:bg-[#2A2A2A] transition-colors"
                    >
                      Auto Layout
                    </button>
                    <button
                      type="button"
                      onClick={resetPlantLayoutOrder}
                      className="inline-flex items-center justify-center px-4 py-2 border border-[#111111] text-[11px] font-black uppercase tracking-[0.16em] text-[#111111] hover:bg-[#111111] hover:text-white transition-colors"
                    >
                      Reset Order
                    </button>
                    <button
                      type="button"
                      onClick={resetPlantLayoutSettings}
                      className="inline-flex items-center justify-center px-4 py-2 border border-[#B8B3A3] text-[11px] font-black uppercase tracking-[0.16em] text-[#444444] hover:border-[#111111] hover:text-[#111111] transition-colors"
                    >
                      Reset Size
                    </button>
                  </div>
                </div>

                {Object.keys(plantMaterialCategoryStats).length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-2">
                    {Object.entries(plantMaterialCategoryStats).map(([label, count]) => (
                      <div key={label} className="inline-flex items-center gap-2 border border-[#E7E7DE] bg-white px-3 py-2 text-xs text-[#4F4F46]">
                        <span className="font-black text-[#111111]">{label}</span>
                        <span>{count} {locale === 'en' ? 'card' : locale === 'zh' ? '卡片' : ' การ์ด'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {plantMaterialPreviewPages.length === 0 ? (
                  <div className="border border-dashed border-[#D9D9CE] bg-white px-4 py-6 text-sm text-[#666666]">{locale === 'en' ? 'There is no item yet for creating layouts from reference quotations.' : locale === 'zh' ? '目前还没有用于根据参考报价创建布局的项目。' : 'ยังไม่มีรายการสำหรับสร้าง layout จากใบเสนอราคาอ้างอิง'}</div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                      {plantMaterialPreviewPages.map((page, pageIdx) => (
                        <div key={`preview-page-${pageIdx}`} className="border border-[#E5E5DC] bg-[#F5F2E8] p-3 sm:p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
                            <div>
                              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7A7A72]">Preview Page {pageIdx + 1}</div>
                              <div className="text-xs text-[#5F5F58] mt-1">{page.cards.length} cards</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1 border border-[#D9D4C4] bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#55554D]">
                                <span>Cols</span>
                                <button type="button" onClick={() => updatePlantLayoutPageSetting(pageIdx, 'columns', -1)} className="h-5 w-5 border border-[#D9D4C4] text-[#111111] hover:bg-[#F3F0E6]">-</button>
                                <span className="min-w-5 text-center text-[#111111]">{page.columns || DEFAULT_PLANT_LAYOUT_PAGE_SETTINGS.columns}</span>
                                <button type="button" onClick={() => updatePlantLayoutPageSetting(pageIdx, 'columns', 1)} className="h-5 w-5 border border-[#D9D4C4] text-[#111111] hover:bg-[#F3F0E6]">+</button>
                              </div>
                              <div className="flex items-center gap-1 border border-[#D9D4C4] bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#55554D]">
                                <span>Rows</span>
                                <button type="button" onClick={() => updatePlantLayoutPageSetting(pageIdx, 'rows', -1)} className="h-5 w-5 border border-[#D9D4C4] text-[#111111] hover:bg-[#F3F0E6]">-</button>
                                <span className="min-w-5 text-center text-[#111111]">{page.rows || DEFAULT_PLANT_LAYOUT_PAGE_SETTINGS.rows}</span>
                                <button type="button" onClick={() => updatePlantLayoutPageSetting(pageIdx, 'rows', 1)} className="h-5 w-5 border border-[#D9D4C4] text-[#111111] hover:bg-[#F3F0E6]">+</button>
                              </div>
                              <button type="button" onClick={() => resetPlantLayoutPageSetting(pageIdx)} className="inline-flex items-center justify-center px-3 py-1 border border-[#D9D4C4] bg-white text-[10px] font-black uppercase tracking-[0.14em] text-[#55554D] hover:border-[#111111] hover:text-[#111111]">Reset Page</button>
                            </div>
                          </div>

                          <motion.div layout className="mx-auto w-full max-w-[860px] overflow-hidden">
                            <PlantLayoutA4PreviewFrame>
                              <div
                                className="h-full w-full border border-[#DCD8C9] bg-white flex flex-col overflow-hidden"
                                style={{ padding: normalizedPlantLayoutSettingsState.global.pagePadding }}
                              >
                                {/* Page header — brand name + document name */}
                                <div className="flex items-end justify-between mb-2 pb-1.5 border-b border-[#E8E5D8] shrink-0">
                                  <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#111111] leading-tight">Xylem Landscape</div>
                                    <div className="text-[7.5px] font-bold uppercase tracking-[0.12em] text-[#9A9A93] leading-tight mt-0.5">Plant Material Layout</div>
                                  </div>
                                  {(documentCode || projectName) && (
                                    <div className="text-right">
                                      {documentCode && <div className="text-[7px] font-bold text-[#9A9A93] tracking-[0.1em] leading-tight">{documentCode}</div>}
                                      {projectName && <div className="text-[7px] font-bold text-[#9A9A93] tracking-[0.1em] leading-tight truncate max-w-[120px]">{projectName}</div>}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 overflow-hidden" style={{ display: 'flex', flexDirection: 'column', gap: normalizedPlantLayoutSettingsState.global.sectionGap }}>
                                  {page.sections.map((section) => (
                                    <div key={`${pageIdx}-${section.label}`}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="text-[11px] font-black text-[#111111] whitespace-nowrap">{section.label}</div>
                                        <div className="h-px bg-[#E8E5D8] flex-1" />
                                      </div>

                                      <div className="grid" style={{ gap: normalizedPlantLayoutSettingsState.global.cardGap, gridTemplateColumns: `repeat(${page.columns || DEFAULT_PLANT_LAYOUT_PAGE_SETTINGS.columns}, minmax(0, 1fr))` }}>
                                        {section.cards.map((card) => {
                                            const { locale } = useI18n();
                                      const cardLayout = plantMaterialResolvedCardLayouts[card.key] || normalizedPlantLayoutSettingsState.global
                                      const firstLine = card.lines[0] || { size: '-', qty: card.qty, unit: card.unit || 'หน่วย' }
                                      const extraSizeCount = Math.max(0, card.lines.length - 1)
                                      const totalQtyText = `${card.qty || 0} ${card.unit || ''}`.trim()
                                      const isDragging = draggingPlantCardKey === card.key
                                      const isSelected = selectedPlantCardKey === card.key
                                      const canEditPlantCard = isSelected && !plantLayoutReorderMode
                                      const isSyncSource = isPlantLayoutSyncEnabledForCard(card.key)

                                        return (
                                          <motion.div
                                          layout
                                          key={card.key}
                                          draggable={plantLayoutReorderMode}
                                          onClick={() => {
                                            if (plantLayoutReorderMode) {
                                              setSelectedPlantCardKey(card.key)
                                              return
                                            }
                                            selectPlantEditSurface(card.key, 'frame')
                                          }}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                              event.preventDefault()
                                              if (plantLayoutReorderMode) {
                                                setSelectedPlantCardKey(card.key)
                                                return
                                              }
                                              selectPlantEditSurface(card.key, 'frame')
                                            }
                                          }}
                                          onDragStart={() => {
                                            if (!plantLayoutReorderMode) return
                                            setSelectedPlantCardKey(card.key)
                                            setDraggingPlantCardKey(card.key)
                                          }}
                                          onDragEnd={() => setDraggingPlantCardKey(null)}
                                          onDragOver={(event) => {
                                            if (!plantLayoutReorderMode) return
                                            event.preventDefault()
                                            if (!draggingPlantCardKey || draggingPlantCardKey === card.key) return
                                            movePlantLayoutCard(draggingPlantCardKey, card.key)
                                          }}
                                          onDrop={(event) => {
                                            if (!plantLayoutReorderMode) return
                                            event.preventDefault()
                                            if (draggingPlantCardKey && draggingPlantCardKey !== card.key) {
                                              movePlantLayoutCard(draggingPlantCardKey, card.key)
                                            }
                                            setDraggingPlantCardKey(null)
                                          }}
                                          className={`group relative border bg-white flex flex-col text-left transition-all ${plantLayoutReorderMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${isSelected ? 'border-[#111111] shadow-[0_12px_30px_rgba(17,17,17,0.14)]' : 'border-[#E7E4D7] hover:border-[#C9C3AF] hover:shadow-[0_10px_24px_rgba(17,17,17,0.08)]'} ${isDragging ? 'opacity-70' : ''}`}
                                          style={{
                                            minHeight: cardLayout.cardHeight,
                                            padding: cardLayout.cardPadding,
                                          }}
                                          role="button"
                                          tabIndex={0}
                                          title={plantLayoutReorderMode ? 'ลากเพื่อสลับตำแหน่งการ์ด' : 'คลิกเพื่อเลือกและปรับการ์ด'}
                                        >
                                          {canEditPlantCard ? (
                                            <div className="absolute right-2 top-2 z-30 flex items-center gap-1.5 rounded-full border border-[#D9D4C4] bg-white/92 p-1 shadow-[0_10px_20px_rgba(17,17,17,0.08)] backdrop-blur-sm">
                                              <button
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation()
                                                  togglePlantLayoutSyncSource(card.key)
                                                }}
                                                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${isSyncSource ? 'border-[#111111] bg-[#111111] text-white' : 'border-transparent bg-transparent text-[#55554D] hover:border-[#111111]/18 hover:bg-[#F4F1E8] hover:text-[#111111]'}`}
                                                title={isSyncSource ? 'ยกเลิก sync ทุกการ์ด' : 'sync ทุกการ์ดตามค่าจากการ์ดนี้'}
                                              >
                                                {isSyncSource ? <Lock size={13} /> : <LayoutGrid size={13} />}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation()
                                                  resetSelectedPlantCardLayout()
                                                }}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent bg-transparent text-[#55554D] transition-colors hover:border-[#111111]/18 hover:bg-[#F4F1E8] hover:text-[#111111]"
                                                title={locale === 'en' ? 'Reset this card' : locale === 'zh' ? '重置此卡' : 'รีเซ็ตการ์ดนี้'}
                                              >
                                                <RotateCcw size={13} />
                                              </button>
                                            </div>
                                          ) : null}

                                          <div className="relative border border-[#ECE9DC] bg-[#F6F4EC] overflow-hidden mb-1.5" style={{ height: cardLayout.imageHeight }}>
                                            {canEditPlantCard ? (
                                              <button
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation()
                                                  selectPlantEditSurface(card.key, 'image')
                                                }}
                                                className={`absolute inset-0 z-10 border transition-colors ${activePlantEditSurface?.cardKey === card.key && activePlantEditSurface.surface === 'image' ? 'border-[#111111]' : 'border-transparent hover:border-[#111111]/40'}`}
                                                title={locale === 'en' ? 'Select image area' : locale === 'zh' ? '选择图像区域' : 'เลือกพื้นที่รูป'}
                                              />
                                            ) : null}
                                            {card.imageUrl ? (
                                              <img src={card.imageUrl} alt={card.description} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                                            ) : (
                                              <div className="flex h-full items-center justify-center text-[9px] font-bold tracking-[0.16em] text-[#A3A39A] uppercase">No Image</div>
                                            )}
                                            {canEditPlantCard && activePlantEditSurface?.cardKey === card.key && activePlantEditSurface.surface === 'image' ? (
                                              <>
                                                <button
                                                  type="button"
                                                  onMouseDown={(event) => beginPlantLayoutHandleDrag(card.key, getPlantLayoutSurfaceHandleKey('image'), cardLayout.imageHeight, event)}
                                                  className="absolute inset-x-3 bottom-0 z-20 h-4 translate-y-1/2 cursor-ns-resize"
                                                  title={locale === 'en' ? 'Drag from the bottom edge of the image to stretch or shrink it.' : locale === 'zh' ? '从图像的底部边缘拖动以拉伸或缩小图像。' : 'ลากจากขอบล่างของรูปเพื่อยืดหรือหด'}
                                                >
                                                  <span className="mx-auto block h-[4px] w-14 rounded-full bg-[#111111] shadow-[0_4px_10px_rgba(17,17,17,0.28)]" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(event) => {
                                                    event.stopPropagation()
                                                    resetPlantCardLayoutValue(card.key, 'imageHeight')
                                                  }}
                                                  className="absolute bottom-2 left-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#D9D4C4] bg-white/92 text-[#55554D] shadow-[0_8px_18px_rgba(17,17,17,0.08)] hover:border-[#111111] hover:text-[#111111]"
                                                  title={locale === 'en' ? 'Reset image size' : locale === 'zh' ? '重置图像尺寸' : 'รีเซ็ตขนาดรูป'}
                                                >
                                                  <RotateCcw size={12} />
                                                </button>
                                              </>
                                            ) : null}
                                            {isSyncSource ? (
                                              <div className="absolute left-2 top-2 z-20 flex items-center gap-1.5 rounded-full bg-[#111111] px-2 py-1 text-white shadow-[0_8px_18px_rgba(17,17,17,0.18)]">
                                                <LayoutGrid size={11} />
                                                <Lock size={10} />
                                              </div>
                                            ) : null}
                                          </div>

                                          <div
                                            className="relative flex flex-col min-h-0 flex-1"
                                            style={{ transform: `translateY(${cardLayout.contentOffsetY}px)` }}
                                          >
                                            {canEditPlantCard ? (
                                              <button
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation()
                                                  selectPlantEditSurface(card.key, 'content')
                                                }}
                                                className={`absolute inset-0 z-10 border transition-colors ${activePlantEditSurface?.cardKey === card.key && activePlantEditSurface.surface === 'content' ? 'border-[#111111]' : 'border-transparent hover:border-[#111111]/35'}`}
                                                title={locale === 'en' ? 'Select the text area' : locale === 'zh' ? '选择文本区域' : 'เลือกพื้นที่ข้อความ'}
                                              />
                                            ) : null}
                                            {canEditPlantCard && activePlantEditSurface?.cardKey === card.key && activePlantEditSurface.surface === 'content' ? (
                                              <>
                                                <button
                                                  type="button"
                                                  onMouseDown={(event) => beginPlantLayoutHandleDrag(card.key, getPlantLayoutSurfaceHandleKey('content'), cardLayout.contentOffsetY, event)}
                                                  className="absolute inset-x-3 top-0 z-20 h-4 -translate-y-1/2 cursor-ns-resize"
                                                  title={locale === 'en' ? 'Drag from the top edge of the text to move it.' : locale === 'zh' ? '从文本的顶部边​​缘拖动以移动它。' : 'ลากจากขอบบนของข้อความเพื่อเลื่อนตำแหน่ง'}
                                                >
                                                  <span className="mx-auto block h-[4px] w-14 rounded-full bg-[#111111] shadow-[0_4px_10px_rgba(17,17,17,0.24)]" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(event) => {
                                                    event.stopPropagation()
                                                    resetPlantCardLayoutValue(card.key, 'contentOffsetY')
                                                  }}
                                                  className="absolute right-1 top-1 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#D9D4C4] bg-white/92 text-[#55554D] shadow-[0_8px_18px_rgba(17,17,17,0.08)] hover:border-[#111111] hover:text-[#111111]"
                                                  title={locale === 'en' ? 'Reset message position' : locale === 'zh' ? '重置消息位置' : 'รีเซ็ตตำแหน่งข้อความ'}
                                                >
                                                  <RotateCcw size={12} />
                                                </button>
                                              </>
                                            ) : null}
                                            <div className="font-black text-[#111111] leading-tight line-clamp-2" style={{ fontSize: cardLayout.titleFontSize }}>
                                              {card.description || '-'}
                                            </div>
                                            <div className="text-[#67675F] mt-1 line-clamp-1" style={{ fontSize: cardLayout.subtitleFontSize }}>
                                              {card.englishName || card.scientificName || card.detail || '\u00a0'}
                                            </div>

                                            <div className="mt-auto pt-1.5 border-t border-[#F0ECDD] grid grid-cols-[1fr_auto] gap-2 items-end">
                                              <div>
                                                <div className="font-bold uppercase tracking-[0.14em] text-[#A3A39A] mb-0.5" style={{ fontSize: Math.max(cardLayout.metaFontSize - 1, 6) }}>Size</div>
                                                <div className="font-bold text-[#2B2B27] leading-tight line-clamp-2" style={{ fontSize: cardLayout.metaFontSize }}>{firstLine.size || '-'}</div>
                                              </div>
                                              <div className="text-right">
                                                <div className="font-bold uppercase tracking-[0.14em] text-[#A3A39A] mb-0.5" style={{ fontSize: Math.max(cardLayout.metaFontSize - 1, 6) }}>Qty</div>
                                                <div className="font-black text-[#111111] whitespace-nowrap" style={{ fontSize: cardLayout.metaFontSize + 1 }}>{totalQtyText || '-'}</div>
                                              </div>
                                            </div>

                                            <div className="mt-1 flex items-center justify-between gap-2 text-[#7B7B74]" style={{ fontSize: Math.max(cardLayout.metaFontSize - 0.5, 6.5) }}>
                                              <span className="truncate">{extraSizeCount > 0 ? `+${extraSizeCount} size` : card.categoryLabel}</span>
                                              <span className="truncate text-right">{card.scientificName || '\u00a0'}</span>
                                            </div>
                                          </div>

                                          {canEditPlantCard && activePlantEditSurface?.cardKey === card.key && activePlantEditSurface.surface === 'frame' ? (
                                            <>
                                              <button
                                                type="button"
                                                onMouseDown={(event) => beginPlantLayoutHandleDrag(card.key, getPlantLayoutSurfaceHandleKey('frame'), cardLayout.cardHeight, event)}
                                                className="absolute inset-x-3 bottom-0 z-20 h-4 translate-y-1/2 cursor-ns-resize"
                                                title={locale === 'en' ? 'Drag from the bottom edge of the frame to stretch or shrink it.' : locale === 'zh' ? '从框架的底部边缘拖动以拉伸或收缩它。' : 'ลากจากขอบล่างของกรอบเพื่อยืดหรือหด'}
                                              >
                                                <span className="mx-auto block h-[4px] w-14 rounded-full bg-[#111111] shadow-[0_4px_10px_rgba(17,17,17,0.28)]" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation()
                                                  resetPlantCardLayoutValue(card.key, 'cardHeight')
                                                }}
                                                className="absolute bottom-2 right-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#D9D4C4] bg-white/92 text-[#55554D] shadow-[0_8px_18px_rgba(17,17,17,0.08)] hover:border-[#111111] hover:text-[#111111]"
                                                title={locale === 'en' ? 'Reset frame size' : locale === 'zh' ? '重置帧大小' : 'รีเซ็ตขนาดกรอบ'}
                                              >
                                                <RotateCcw size={12} />
                                              </button>
                                            </>
                                          ) : null}
                                          </motion.div>
                                        )
                                      })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PlantLayoutA4PreviewFrame>
                          </motion.div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isContractDoc && docType !== 'plant_material' && displayedZones.map((zone, zIdx) => (
              <div key={zone.id} className="bg-white border border-[#E5E5E5] overflow-hidden">
                <div className="bg-[#111111] p-4 sm:p-6 flex items-center justify-between gap-4">
                  <div className="flex-1 max-w-md">
                    {showZones ? (
                      <input
                        id={`zone-name-${zone.id}`}
                        type="text"
                        value={zone.name}
                        disabled={isCompactItemListDoc}
                        onChange={(e) => {
                          const newZones = [...zones];
                          newZones[zIdx].name = e.target.value;
                          setZones(newZones);
                        }}
                        className="bg-white/10 border border-white/20 text-white text-xs sm:text-sm font-bold focus:ring-2 focus:ring-white/40 rounded-none px-4 py-2 sm:py-2.5 w-full outline-none transition-all"
                      />
                    ) : (
                      <div className="text-white text-xs sm:text-sm font-black px-1">{locale === 'en' ? 'General items (not separated into zones)' : locale === 'zh' ? '一般物品（不分区域）' : 'รายการทั่วไป (ไม่แยกโซน)'}</div>
                    )}
                  </div>
                  {showZones && isEditingContent && !isCompactItemListDoc && (
                    <button
                      onClick={() => setZones(zones.filter(z => z.id !== zone.id))}
                      className="w-10 h-10 rounded-xl hover:bg-white/10 text-gray-500 hover:text-red-400 flex items-center justify-center transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <div className="p-4 sm:p-10 space-y-6 sm:space-y-10">
                  {zone.categories.map((cat, cIdx) => (
                    <div key={cat.id} className="space-y-4 sm:space-y-6">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-1 sm:w-1.5 h-5 sm:h-6 rounded-full ${style.bg.replace('50', '500')}`}></div>
                          {isCompactItemListDoc ? (
                            <div className="text-xs sm:text-sm font-black text-gray-900 w-48 sm:w-64 truncate">{cat.name}</div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-xs sm:text-sm font-black text-gray-900">{cat.name}</div>
                              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                <select
                                  value={cat.main_category}
                                  onChange={(e) => {
                                    updateCategorySelection(zone.id, cat.id, e.target.value as DocumentCatalogMainCategory)
                                  }}
                                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[11px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200"
                                >
                                  {DOCUMENT_MAIN_CATEGORY_OPTIONS.map((option) => (
                                    <option key={`${cat.id}-${option.value}`} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                                <select
                                  value={cat.subcategory}
                                  onChange={(e) => {
                                    updateCategorySelection(zone.id, cat.id, cat.main_category, e.target.value as DocumentCatalogSubcategory)
                                  }}
                                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[11px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200"
                                >
                                  {getDocumentSubcategoryOptions(cat.main_category).map((option) => (
                                    <option key={`${cat.id}-${option.value}`} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                        {isEditingContent && !isCompactItemListDoc && (
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{locale === 'en' ? 'Labor cost (%)' : locale === 'zh' ? '人工成本(%)' : 'ค่าแรง (%)'}</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={cat.labor_percentage || ''}
                                onChange={(e) => {
                                  const val = Number(e.target.value)
                                  setZones(prev => prev.map(z => z.id === zone.id ? {
                                    ...z,
                                    categories: z.categories.map(c => c.id === cat.id ? { 
                                      ...c, 
                                      labor_percentage: val,
                                      // Bulk update all items in this category
                                      items: c.items.map(item => ({
                                        ...item,
                                        unit_price_labor: Math.round(item.unit_price_material * (val / 100))
                                      }))
                                    } : c)
                                  } : z))
                                }}
                                className="w-12 bg-transparent border-none text-[11px] font-bold text-[#111111] text-center focus:ring-0 outline-none"
                                placeholder="0"
                              />
                            </div>
                            {(showZones || zone.categories.length > 1) && (
                              <button onClick={() => setZones(zones.map(z => z.id === zone.id ? { ...z, categories: z.categories.filter(c => c.id !== cat.id) } : z))} className="text-gray-300 hover:text-red-500 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                        {!isEditingContent && !isCompactItemListDoc && (cat.labor_percentage || 0) > 0 && (
                           <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                             {locale === 'en' ? 'wage' : locale === 'zh' ? '工资' : '                              ค่าแรง '}{cat.labor_percentage}%
                           </div>
                        )}
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        {isCompactItemListDoc ? (
                          <div className="hidden sm:grid sm:grid-cols-[minmax(220px,2fr)_90px_90px_120px] gap-2 px-1 items-center">
                            <div className="text-[11px] font-extrabold text-[#4B5563] uppercase tracking-widest pl-2">{locale === 'en' ? 'Product list' : locale === 'zh' ? '产品列表' : 'รายการสินค้า'}</div>
                            <div className="text-[11px] font-extrabold text-[#4B5563] uppercase tracking-widest text-center">{locale === 'en' ? 'unit' : locale === 'zh' ? '单元' : 'หน่วย'}</div>
                            <div className="text-[11px] font-extrabold text-[#4B5563] uppercase tracking-widest text-right pr-1">{locale === 'en' ? 'quantity' : locale === 'zh' ? '数量' : 'จำนวน'}</div>
                            <div className="text-[11px] font-extrabold text-[#4B5563] uppercase tracking-widest text-right pr-2">{locale === 'en' ? 'together' : locale === 'zh' ? '一起' : 'รวม'}</div>
                          </div>
                        ) : (
                          <div className={`hidden sm:grid ${fullItemGridColumns} gap-2 px-2 items-center`}>
                            <div className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-[0.18em] leading-tight pl-2">{locale === 'en' ? 'Product list' : locale === 'zh' ? '产品列表' : 'รายการสินค้า'}</div>
                            <div className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-[0.16em] leading-tight">{locale === 'en' ? 'English name' : locale === 'zh' ? '英文名' : 'ชื่ออังกฤษ'}</div>
                            <div className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-[0.16em] leading-tight">{locale === 'en' ? 'Scientific name' : locale === 'zh' ? '学名' : 'ชื่อวิทยาศาสตร์'}</div>
                            <div className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-[0.16em] leading-tight">{locale === 'en' ? 'Size/value' : locale === 'zh' ? '尺寸/价值' : 'ขนาด / ค่า'}</div>
                            <div className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-[0.16em] leading-tight text-right pr-1">{locale === 'en' ? 'unit' : locale === 'zh' ? '单元' : 'หน่วย'}</div>
                            <div className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-[0.16em] leading-tight text-right pr-1">{locale === 'en' ? 'Quantity / Area' : locale === 'zh' ? '数量/面积' : 'จำนวน / พื้นที่'}</div>
                            <div className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-[0.15em] leading-tight text-right pr-1">{locale === 'en' ? 'Material cost/unit' : locale === 'zh' ? '材料成本/单位' : 'ค่าวัสดุ/หน่วย'}</div>
                            <div className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-[0.15em] leading-tight text-right pr-1">{locale === 'en' ? 'Labor cost/unit' : locale === 'zh' ? '人工成本/单位' : 'ค่าแรง/หน่วย'}</div>
                            <div className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-[0.16em] leading-tight text-right pr-2">{locale === 'en' ? 'together' : locale === 'zh' ? '一起' : 'รวม'}</div>
                          </div>
                        )}
                        {cat.items.map((item, iIdx) => {
                            const { locale } = useI18n();
                          const rowKey = `${zone.id}-${cat.id}-${item.id}`
                          const spacingValue = item.spacing_x > 0 ? String(item.spacing_x) : ''
                          const spacingExists = spacingReferences.some((row) => Number(row.spacing_meter) === Number(item.spacing_x))
                          const descriptionSuggestions = canEditCoreContent
                            ? getCatalogSuggestions(itemCatalog, item.description || '', 5)
                            : []
                          const normalizedDescription = normalizeCatalogQuery(item.description || '')
                          const hasExactDescriptionSuggestion = normalizedDescription.length > 0
                            && descriptionSuggestions.some((suggestion) => normalizeCatalogQuery(suggestion.item_name) === normalizedDescription)
                          const showDescriptionSuggestions = canEditCoreContent
                            && focusedDescriptionRowKey === rowKey
                            && descriptionSuggestions.length > 0
                            && !hasExactDescriptionSuggestion
                          const normalizedDetailPrefix = String(item.detail || '').replace(/\s+/g, ' ').trim().toLowerCase()
                          const detailSuggestions = normalizedDetailPrefix
                            ? detailSuggestionPool
                                .filter((text) => {
                                  const normalized = text.toLowerCase()
                                  return normalized.startsWith(normalizedDetailPrefix) && normalized !== normalizedDetailPrefix
                                })
                                .slice(0, 6)
                            : []

                          if (isCompactItemListDoc) {
                            const itemTotal = (item.quantity || 0) * ((item.unit_price_material || 0) + (item.unit_price_labor || 0))
                            return (
                              <div key={item.id} className="flex flex-col sm:grid sm:grid-cols-[minmax(220px,2fr)_90px_90px_120px] gap-2 p-4 sm:p-2.5 bg-gray-50/50 sm:bg-transparent rounded-2xl border border-gray-100 sm:border-none items-center">
                                <div className="w-full pl-1">
                                  <div className="text-xs font-extrabold text-gray-900">{item.description || '-'}</div>
                                  {(item.detail && item.detail.trim() !== '') && (
                                    <div className="mt-1 text-[11px] font-medium text-gray-700">{item.detail}</div>
                                  )}
                                </div>
                                <div className="text-xs font-semibold text-gray-800 text-center w-full">{item.unit || '-'}</div>
                                <div className="text-xs font-black text-gray-900 text-right w-full pr-1">{Number(item.quantity || 0).toLocaleString()}</div>
                                <div className="text-sm font-black text-gray-900 text-right w-full pr-1">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{itemTotal.toLocaleString()}</div>
                              </div>
                            )
                          }

                          return (
                          <div key={item.id} className={`flex flex-col sm:grid ${fullItemGridColumns} gap-x-2 gap-y-3 p-5 sm:px-2 sm:py-3.5 rounded-2xl border border-gray-100/70 relative group items-start sm:items-center ${iIdx % 2 === 0 ? 'bg-gray-50/35' : 'bg-white'}`}>
                            <div className="relative pl-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest sm:hidden mb-1 block">{locale === 'en' ? 'Product list' : locale === 'zh' ? '产品列表' : 'รายการสินค้า'}</label>
                              <div className="relative">
                                <input id={`item-desc-${zIdx}-${cIdx}-${iIdx}`} type="text" value={item.description} onChange={(e) => {
                                  const nz = [...zones]; nz[zIdx].categories[cIdx].items[iIdx].description = e.target.value; setZones(nz);
                                  applyCatalogItemToRow(zIdx, cIdx, iIdx, e.target.value, 'typing')
                                }} onFocus={() => {
                                  setFocusedDescriptionRowKey(rowKey)
                                }} onBlur={(e) => {
                                  applyCatalogItemToRow(zIdx, cIdx, iIdx, e.target.value, 'blur')
                                  setFocusedDescriptionRowKey(null)
                                }} className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-100 rounded-lg pl-3 pr-9 text-xs font-extrabold text-gray-900 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all" placeholder={locale === 'en' ? 'Description...' : locale === 'zh' ? '描述...' : 'คำอธิบาย...'} />
                                {isEditingContent && item.description.trim() !== '' && (
                                  <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      const nz = [...zones]
                                      nz[zIdx].categories[cIdx].items[iIdx].description = ''
                                      setZones(nz)
                                      setFocusedDescriptionRowKey(rowKey)
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center"
                                    title={locale === 'en' ? 'Delete message' : locale === 'zh' ? '删除留言' : 'ลบข้อความ'}
                                    aria-label={locale === 'en' ? 'Delete product list text' : locale === 'zh' ? '删除产品列表文本' : 'ลบข้อความรายการสินค้า'}
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                              {showDescriptionSuggestions && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white border border-gray-200 rounded-lg p-2 shadow-sm flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                  {descriptionSuggestions.map((suggestion) => (
                                    <button
                                      key={`${item.id}-${suggestion.id}-catalog-desc`}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault()
                                        const nz = [...zones]
                                        nz[zIdx].categories[cIdx].items[iIdx].description = suggestion.item_name
                                        setZones(nz)
                                        applyCatalogEntryToRow(zIdx, cIdx, iIdx, suggestion)
                                        setFocusedDescriptionRowKey(null)
                                      }}
                                      className="px-2 py-1 text-[10px] font-bold text-[#374151] bg-[#EEF2FF] border border-[#E0E7FF] rounded-lg hover:bg-[#E0E7FF] transition-colors"
                                      title={`เลือก: ${suggestion.item_name}`}
                                    >
                                      {suggestion.item_name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest sm:hidden mb-1 block">{locale === 'en' ? 'English name' : locale === 'zh' ? '英文名' : 'ชื่ออังกฤษ'}</label>
                              <input type="text" value={item.english_name} onChange={(e) => {
                                const nz = [...zones]; nz[zIdx].categories[cIdx].items[iIdx].english_name = e.target.value; setZones(nz);
                              }} list="document-item-english-catalog" className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-100 rounded-lg px-3 text-xs font-semibold text-gray-800 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all" placeholder="English name" />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest sm:hidden mb-1 block">{locale === 'en' ? 'Scientific name' : locale === 'zh' ? '学名' : 'ชื่อวิทยาศาสตร์'}</label>
                              <input type="text" value={item.spec} onChange={(e) => {
                                const nz = [...zones]; nz[zIdx].categories[cIdx].items[iIdx].spec = e.target.value; setZones(nz);
                              }} list="document-item-scientific-catalog" className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-100 rounded-lg px-3 text-xs font-semibold text-gray-800 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all" placeholder={locale === 'en' ? 'such as Syzygium campanulatum' : locale === 'zh' ? '例如蒲桃' : 'เช่น Syzygium campanulatum'} />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest sm:hidden mb-1 block">{locale === 'en' ? 'Size/value' : locale === 'zh' ? '尺寸/价值' : 'ขนาด / ค่า'}</label>
                              <div className="w-full">
                                {item.size_mode === 'shrub' && (
                                  <div className="grid grid-cols-1 gap-2 w-full">
                                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,108px)_minmax(0,1fr)] gap-2 w-full">
                                      <div className="space-y-1">
                                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-400">{locale === 'en' ? 'type' : locale === 'zh' ? '类型' : 'รูปแบบ'}</div>
                                        <select value={item.shrub_size_style || 'height_spacing'} onChange={(e) => {
                                          const nz = [...zones]
                                          const current = nz[zIdx].categories[cIdx].items[iIdx]
                                          const nextStyle = e.target.value === 'pot_inch' ? 'pot_inch' : 'height_spacing'
                                          current.shrub_size_style = nextStyle
                                          current.size = buildSizeLabelByMode(current)
                                          setZones(nz)
                                        }} className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-200 rounded-lg px-2 text-xs font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all">
                                          <option value="height_spacing">{locale === 'en' ? 'H + planting distance' : locale === 'zh' ? 'H+种植距离' : 'H + ระยะปลูก'}</option>
                                          <option value="pot_inch">{locale === 'en' ? 'Container (inches)' : locale === 'zh' ? '集装箱（英寸）' : 'ภาชนะ (นิ้ว)'}</option>
                                        </select>
                                      </div>

                                      {item.shrub_size_style === 'pot_inch' ? (
                                        <div className="space-y-1">
                                          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-400">{locale === 'en' ? 'Pot/bag' : locale === 'zh' ? '锅/袋' : 'กระถาง / ถุง'}</div>
                                          <div className="grid grid-cols-[minmax(88px,0.85fr)_minmax(0,1fr)] gap-1.5 w-full">
                                            <select value={item.shrub_container_type || 'pot'} onChange={(e) => {
                                              const nz = [...zones]
                                              const current = nz[zIdx].categories[cIdx].items[iIdx]
                                              current.shrub_size_style = 'pot_inch'
                                              current.shrub_container_type = e.target.value === 'bag' ? 'bag' : 'pot'
                                              current.size = buildSizeLabelByMode(current)
                                              setZones(nz)
                                            }} className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-200 rounded-lg px-2 text-xs font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all">
                                              <option value="pot">{locale === 'en' ? 'pot' : locale === 'zh' ? '锅' : 'กระถาง'}</option>
                                              <option value="bag">{locale === 'en' ? 'bag' : locale === 'zh' ? '包' : 'ถุง'}</option>
                                            </select>
                                            <input type="number" min={0} step="0.1" value={item.pot_diameter_inch || ''} onChange={(e) => {
                                              const nz = [...zones]
                                              const current = nz[zIdx].categories[cIdx].items[iIdx]
                                              current.shrub_size_style = 'pot_inch'
                                              current.pot_diameter_inch = Number(e.target.value) || 0
                                              current.size = buildSizeLabelByMode(current)
                                              setZones(nz)
                                            }} className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-200 rounded-lg px-2 text-xs font-bold text-gray-700 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all" placeholder={locale === 'en' ? 'finger' : locale === 'zh' ? '手指' : 'นิ้ว'} />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-2 gap-1.5 w-full">
                                          <div className="space-y-1">
                                            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-400">{locale === 'en' ? 'height' : locale === 'zh' ? '高度' : 'ความสูง'}</div>
                                            <input type="number" min={0} step="0.01" value={item.height_m || ''} onChange={(e) => {
                                              const nz = [...zones]
                                              const current = nz[zIdx].categories[cIdx].items[iIdx]
                                              current.shrub_size_style = 'height_spacing'
                                              current.height_m = Number(e.target.value) || 0
                                              current.size = buildSizeLabelByMode(current)
                                              setZones(nz)
                                            }} className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-200 rounded-lg px-2 text-xs font-bold text-gray-700 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all" placeholder={locale === 'en' ? 'Height (m.)' : locale === 'zh' ? '高度（米）' : 'สูง (ม.)'} />
                                          </div>
                                          <div className="space-y-1">
                                            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-400">{locale === 'en' ? 'Planting period' : locale === 'zh' ? '种植期' : 'ระยะปลูก'}</div>
                                            <select value={spacingValue} onChange={(e) => {
                                              const nz = [...zones]
                                              const current = nz[zIdx].categories[cIdx].items[iIdx]
                                              const spacing = Number(e.target.value) || 0
                                              applySpacingToItem(current, spacing)
                                              setZones(nz)
                                            }} className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-200 rounded-lg px-2 text-xs font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all">
                                              <option value="">{locale === 'en' ? 'Choose planting distance' : locale === 'zh' ? '选择种植距离' : 'เลือกระยะปลูก'}</option>
                                              {spacingValue && !spacingExists && (
                                                <option value={spacingValue}>@ {Number(item.spacing_x).toFixed(2)}</option>
                                              )}
                                              {spacingReferences.map((row) => (
                                                <option key={row.id} value={String(row.spacing_meter)}>
                                                  {row.label || `@${Number(row.spacing_meter).toFixed(2)} m.`}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {item.size_mode === 'tree' && (
                                  <div className="grid grid-cols-2 gap-1.5 w-full">
                                    <input type="number" min={0} step="0.1" value={item.trunk_diameter_inch || ''} onChange={(e) => {
                                      const nz = [...zones]
                                      const current = nz[zIdx].categories[cIdx].items[iIdx]
                                      current.trunk_diameter_inch = Number(e.target.value) || 0
                                      current.size = buildSizeLabelByMode(current)
                                      setZones(nz)
                                    }} className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-200 rounded-lg px-2 text-xs font-bold text-gray-700 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all" placeholder={locale === 'en' ? 'Diameter (inches)' : locale === 'zh' ? '直径（英寸）' : 'เส้นผ่านศูนย์กลาง (นิ้ว)'} />
                                    <input type="text" value={item.tree_height_label || ''} onChange={(e) => {
                                      const nz = [...zones]
                                      const current = nz[zIdx].categories[cIdx].items[iIdx]
                                      current.tree_height_label = e.target.value
                                      current.size = buildSizeLabelByMode(current)
                                      setZones(nz)
                                    }} className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-200 rounded-lg px-2 text-xs font-bold text-gray-700 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all" placeholder={locale === 'en' ? 'Height such as 2-3' : locale === 'zh' ? '高度如2-3' : 'ความสูง เช่น 2-3'} />
                                  </div>
                                )}

                                {item.size_mode === 'other' && (
                                  <input type="text" value={item.size || ''} onChange={(e) => {
                                    const nz = [...zones]
                                    nz[zIdx].categories[cIdx].items[iIdx].size = e.target.value
                                    setZones(nz)
                                  }} className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-200 rounded-lg px-2 text-xs font-bold text-gray-700 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all" placeholder={locale === 'en' ? 'Specify size' : locale === 'zh' ? '指定尺寸' : 'ระบุขนาด'} />
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest sm:hidden mb-1 block">{locale === 'en' ? 'unit' : locale === 'zh' ? '单元' : 'หน่วย'}</label>
                              <input type="text" value={item.unit} onChange={(e) => {
                                const nz = [...zones]; nz[zIdx].categories[cIdx].items[iIdx].unit = e.target.value; setZones(nz);
                              }} className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-200 rounded-none px-2 text-xs font-semibold text-right tabular-nums text-gray-800 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all" placeholder={locale === 'en' ? 'unit' : locale === 'zh' ? '单元' : 'หน่วย'} />
                            </div>
                            
                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest sm:hidden mb-1 block">{locale === 'en' ? 'area/quantity' : locale === 'zh' ? '面积/数量' : 'พื้นที่/จำนวน'}</label>
                              <div className="w-full h-10">
                                {item.size_mode === 'shrub' && item.shrub_size_style !== 'pot_inch' && item.spacing_x > 0 ? (
                                  <div className="grid grid-cols-[1fr_52px] gap-1 w-full h-10">
                                    <div className="relative">
                                          <input 
                                        type="number" 
                                        min={0} 
                                        step="0.1" 
                                        value={item.area_sqm || ''} 
                                        onChange={(e) => {
                                          const nz = [...zones]
                                          const current = nz[zIdx].categories[cIdx].items[iIdx]
                                          current.area_sqm = Number(e.target.value) || 0
                                          if (current.size_mode === 'shrub' && current.spacing_x > 0 && current.area_sqm > 0) {
                                            current.quantity = calculateAutoQuantity(current)
                                          }
                                          setZones(nz)
                                        }} 
                                        className="w-full h-10 bg-white sm:bg-gray-50 border border-gray-200 rounded-none px-2 text-xs font-bold text-right text-gray-900 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all" 
                                        placeholder={locale === 'en' ? 'sq m.' : locale === 'zh' ? '平方米。' : 'ตร.ม.'} 
                                      />
                                    </div>
                                    <div className="h-10 border border-gray-200 bg-white sm:bg-gray-50 rounded-none flex items-center justify-center text-xs font-bold text-gray-700">
                                      {item.quantity}
                                    </div>
                                  </div>
                                ) : (
                                  <input type="number" value={item.quantity || ''} onChange={(e) => {
                                    const nz = [...zones]; nz[zIdx].categories[cIdx].items[iIdx].quantity = Number(e.target.value); setZones(nz);
                                  }} className="w-full h-10 bg-white sm:bg-gray-50 border border-gray-200 rounded-none px-2 text-xs font-black text-right text-gray-900 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all" placeholder="0" />
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest sm:hidden mb-1 block">{locale === 'en' ? 'value/unit' : locale === 'zh' ? '值/单位' : 'ค่าของ/หน่วย'}</label>
                              <input type="number" value={item.unit_price_material || ''} onChange={(e) => {
                                const val = Number(e.target.value)
                                setZones(prev => prev.map((z, idx) => {
                                  if (idx !== zIdx) return z
                                  const nextCategories = [...z.categories]
                                  const nextItems = [...nextCategories[cIdx].items]
                                  const laborPct = nextCategories[cIdx].labor_percentage || 0
                                  nextItems[iIdx] = {
                                    ...nextItems[iIdx],
                                    unit_price_material: val,
                                    unit_price_labor: laborPct > 0 ? Math.round(val * (laborPct / 100)) : nextItems[iIdx].unit_price_labor
                                  }
                                  nextCategories[cIdx] = { ...nextCategories[cIdx], items: nextItems }
                                  return { ...z, categories: nextCategories }
                                }))
                              }} className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-200 rounded-none px-2 text-xs font-black text-right tabular-nums text-gray-900 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all" placeholder="0" />
                            </div>

                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest sm:hidden mb-1 block">{locale === 'en' ? 'Labor cost/unit' : locale === 'zh' ? '人工成本/单位' : 'ค่าแรง/หน่วย'}</label>
                              <input type="number" value={item.unit_price_labor || ''} onChange={(e) => {
                                const val = Number(e.target.value)
                                setZones(prev => prev.map((z, idx) => {
                                  if (idx !== zIdx) return z
                                  const nextCategories = [...z.categories]
                                  const nextItems = [...nextCategories[cIdx].items]
                                  nextItems[iIdx] = { ...nextItems[iIdx], unit_price_labor: val }
                                  nextCategories[cIdx] = { ...nextCategories[cIdx], items: nextItems }
                                  return { ...z, categories: nextCategories }
                                }))
                              }} className="h-10 w-full bg-white sm:bg-gray-50 border border-gray-200 rounded-none px-2 text-xs font-black text-right tabular-nums text-gray-900 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all" placeholder="0" />
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2 mt-2 sm:mt-0 pr-1 w-full">
                              <div className="sm:hidden text-[10px] font-black text-gray-400 uppercase">{locale === 'en' ? 'together:' : locale === 'zh' ? '一起：' : 'รวม:'}</div>
                              <span className="text-sm font-black text-gray-900 sm:block sm:w-full sm:text-right">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{((item.quantity || 0) * ((item.unit_price_material || 0) + (item.unit_price_labor || 0))).toLocaleString()}</span>
                              {isEditingContent && (
                                <button onClick={() => {
                                  const nz = [...zones]; nz[zIdx].categories[cIdx].items.splice(iIdx, 1); setZones(nz);
                                }} className="w-8 h-8 rounded-lg bg-red-50 sm:bg-transparent sm:opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-500 sm:text-gray-300 sm:hover:text-red-500 transition-all absolute right-0 top-1/2 -translate-y-1/2 translate-x-full sm:translate-x-0 sm:right-[-30px]">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            {(isEditingContent || (item.detail && item.detail.trim() !== '')) && (
                              <div className="sm:col-span-1 sm:col-start-1 -mt-0.5 border-t border-gray-100 pt-2 pr-4 relative">
                                <label className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1 block">{locale === 'en' ? 'Item details' : locale === 'zh' ? '商品详情' : 'รายละเอียดรายการ'}</label>
                                <textarea
                                  rows={1}
                                  value={item.detail || ''}
                                  onChange={(e) => {
                                    const nz = [...zones]
                                    nz[zIdx].categories[cIdx].items[iIdx].detail = e.target.value
                                    setZones(nz)
                                  }}
                                  onInput={(e) => autoResizeTextarea(e.currentTarget)}
                                  className="w-full bg-white sm:bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-[11px] font-medium text-gray-800 placeholder:text-[10px] placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-200 outline-none transition-all resize-none"
                                  placeholder={locale === 'en' ? 'Such as trimming shrubs, fertilizing, weeding, and cleaning up leaves.' : locale === 'zh' ? '例如修剪灌木、施肥、除草和清理树叶。' : 'เช่น ตัดแต่งพุ่มไม้, ใส่ปุ๋ย, กำจัดวัชพืช, เก็บกวาดเศษใบไม้'}
                                />
                                {canEditCoreContent && detailSuggestions.length > 0 && (
                                  <div className="absolute left-0 right-4 top-full mt-1.5 z-20 bg-white border border-gray-200 rounded-lg p-2 shadow-sm flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                    {detailSuggestions.map((suggestion) => (
                                      <button
                                        key={`${item.id}-${suggestion}`}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          const nz = [...zones]
                                          nz[zIdx].categories[cIdx].items[iIdx].detail = suggestion
                                          setZones(nz)
                                        }}
                                        className="px-2 py-1 text-[10px] font-bold text-[#374151] bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg hover:bg-[#E5E7EB] transition-colors"
                                        title={`ใช้คำแนะนำ: ${suggestion}`}
                                      >
                                        {suggestion}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          )
                        })}
                        {isEditingContent && !isCompactItemListDoc && (
                          <button
                            onClick={() => {
                              const nz = [...zones]
                              const nextItem = newItem(cat.main_category, cat.subcategory)
                              nz[zIdx].categories[cIdx].items.push(nextItem)
                              setZones(nz)
                            }}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#0A7B4A] hover:bg-green-50 rounded-lg p-2 transition-colors w-fit"
                          >
                            <Plus size={14} /> {locale === 'en' ? 'Add item' : locale === 'zh' ? '添加项目' : ' เพิ่มรายการ                           '}</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {isEditingContent && !isCompactItemListDoc && (
                    <button
                      onClick={() => {
                        const nz = [...zones]
                        const seedCategory = zone.categories[zone.categories.length - 1]
                        const nextCategory = newCategory(
                          zone.categories.length + 1,
                          seedCategory?.main_category || 'softscape',
                          seedCategory?.subcategory || 'shrub'
                        )
                        nz[zIdx].categories.push(nextCategory)
                        setZones(nz)
                      }}
                      className="w-full py-5 border-2 border-dashed border-gray-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50/50 hover:text-[#0A7B4A] transition-all"
                    >
                      {showZones ? '+ เพิ่มหมวดหมู่ใหม่ลงในโซน' : '+ เพิ่มหมวดหมู่ใหม่'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {showZones && isEditingContent && !isCompactItemListDoc && !isContractDoc && (
              <button
                onClick={() => setZones([...zones, newZone(zones.length + 1)])}
                className="sm:hidden w-full flex items-center justify-center gap-2 py-4 bg-green-50 text-[#0A7B4A] border border-green-100 rounded-2xl text-[10px] font-black uppercase tracking-widest mx-4"
              >
                <Plus size={16} /> {locale === 'en' ? 'Add a new zone' : locale === 'zh' ? '添加新区域' : ' เพิ่มโซนใหม่               '}</button>
            )}
          </motion.section>

          {/* Section 3: Terms & Notes */}
          {!isPlantMaterialDoc && !isContractDoc && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-[#E5E5E5] p-6 sm:p-10 lg:col-span-1"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-[#E5E5E5] text-[#111111] flex items-center justify-center">
                  <ListChecks size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-medium tracking-wide uppercase">{locale === 'en' ? 'Conditions and Notes' : locale === 'zh' ? '条件及注意事项' : 'เงื่อนไขและหมายเหตุ'}</h3>
                  <p className="text-[10px] sm:text-xs text-[#A3A3A3] font-medium">{locale === 'en' ? 'Manage details of conditions at the end of documents' : locale === 'zh' ? '管理文档末尾的条件详细信息' : 'จัดการรายละเอียดเงื่อนไขท้ายเอกสาร'}</p>
                </div>
              </div>
              <button
                onClick={() => setConditions([...conditions, newCondition('', true)])}
                className="w-8 h-8 border border-[#E5E5E5] text-[#111111] flex items-center justify-center hover:bg-[#FAFAFA] transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {conditions.map((cond, idx) => (
                <div key={cond.id} className="flex gap-3 sm:gap-4 items-start group p-3 rounded-2xl hover:bg-gray-50/50 transition-all border border-transparent hover:border-gray-100">
                  <button
                    onClick={() => {
                      const nc = [...conditions]; nc[idx].selected = !nc[idx].selected; setConditions(nc);
                    }}
                    className={`shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${cond.selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-transparent'}`}
                  >
                    <CheckCircle2 size={12} />
                  </button>
                  <div className="flex-1">
                    <textarea
                      rows={1}
                      value={cond.text}
                      onChange={(e) => {
                        const nc = [...conditions]; nc[idx].text = e.target.value; setConditions(nc);
                      }}
                      className={`w-full bg-transparent border-none text-xs sm:text-sm font-medium focus:ring-0 outline-none resize-none transition-all ${cond.selected ? 'text-gray-900 font-bold' : 'text-gray-300 italic'}`}
                      placeholder={locale === 'en' ? 'Type conditions here...' : locale === 'zh' ? '在此输入条件...' : 'พิมพ์เงื่อนไขที่นี่...'}
                    />
                  </div>
                  <button onClick={() => setConditions(conditions.filter(c => c.id !== cond.id))} className="sm:opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-50">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4 px-1">{locale === 'en' ? 'Additional Notes (for customers)' : locale === 'zh' ? '附加说明（针对客户）' : 'หมายเหตุเพิ่มเติม (สำหรับลูกค้า)'}</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl p-5 text-xs sm:text-sm font-bold text-gray-700 focus:bg-white focus:ring-4 focus:ring-green-500/5 focus:border-[#0A7B4A] transition-all outline-none resize-none placeholder:text-gray-300"
                placeholder={locale === 'en' ? 'Specify special notes...' : locale === 'zh' ? '指定特别注释...' : 'ระบุหมายเหตุพิเศษ...'}
              />
            </div>
          </motion.div>
          )}
        </fieldset>
        )}

        {/* Bottom Summary */}
        {!isPlantMaterialDoc && !isContractDoc && (
        <div className="grid gap-4 sm:gap-8 lg:col-span-1 self-start">
          <datalist id="customer-name-suggestions">
            {customers.map((customer) => {
              const label = customer.display_name || customer.email || ''
              return label ? <option key={customer.id} value={label} /> : null
            })}
          </datalist>
          <datalist id="document-item-english-catalog">
            {catalogEnglishNameOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <datalist id="document-item-scientific-catalog">
            {catalogScientificOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <div className="bg-white border border-[#E5E5E5] p-6 sm:p-8 text-[#111111]">
            <div>
              <>
                  <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em] mb-6">{locale === 'en' ? 'Summary of document totals' : locale === 'zh' ? '文件总数摘要' : 'สรุปยอดรวมเอกสาร'}</div>
                  <fieldset disabled={!isEditingContent || docType === 'receipt'} className="space-y-4 mb-8">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm font-bold text-[#666666]">{locale === 'en' ? 'Total estimated price' : locale === 'zh' ? '预计总价' : 'ราคาประเมินรวม'}</span>
                      <span className="text-sm sm:text-base font-bold text-[#111111]">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{subTotalZones.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'Processing fee' : locale === 'zh' ? '加工费' : 'ค่าดำเนินการ'}</span>
                      <label className="inline-flex items-center gap-2 text-[10px] font-bold text-[#666666] uppercase tracking-widest">
                        <input type="checkbox" checked={showOverhead} onChange={(e) => setShowOverhead(e.target.checked)} className="accent-[#111111]" />
                        {locale === 'en' ? 'Enable' : locale === 'zh' ? '使能够' : '                         เปิดใช้                       '}</label>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'Processing rate (%)' : locale === 'zh' ? '处理率(%)' : 'อัตราค่าดำเนินการ (%)'}</span>
                      <input
                        type="number"
                        value={overheadRate}
                        onChange={(e) => setOverheadRate(Number(e.target.value))}
                        disabled={!showOverhead}
                        className="w-16 bg-white border border-[#E5E5E5] text-xs font-bold py-1.5 text-center text-[#111111] focus:ring-2 focus:ring-[#111111]/20 outline-none transition-all disabled:opacity-40"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'Total labor cost' : locale === 'zh' ? '总人工成本' : 'ค่าแรงรวม'}</span>
                      <label className="inline-flex items-center gap-2 text-[10px] font-bold text-[#666666] uppercase tracking-widest">
                        <input type="checkbox" checked={showGlobalLabor} onChange={(e) => setShowGlobalLabor(e.target.checked)} className="accent-[#111111]" />
                        {locale === 'en' ? 'Enable' : locale === 'zh' ? '使能够' : '                         เปิดใช้                       '}</label>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'Total labor rate (%)' : locale === 'zh' ? '总劳动力率(%)' : 'อัตราค่าแรงรวม (%)'}</span>
                      <input
                        type="number"
                        value={globalLaborRate}
                        onChange={(e) => setGlobalLaborRate(Number(e.target.value))}
                        disabled={!showGlobalLabor}
                        className="w-16 bg-white border border-[#E5E5E5] text-xs font-bold py-1.5 text-center text-[#111111] focus:ring-2 focus:ring-[#111111]/20 outline-none transition-all disabled:opacity-40"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'discount' : locale === 'zh' ? '折扣' : 'ส่วนลด'}</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value === 'percent' ? 'percent' : 'amount')}
                          className="w-24 bg-white border border-[#E5E5E5] text-xs font-bold py-1.5 px-2 text-[#111111] focus:ring-2 focus:ring-[#111111]/20 outline-none transition-all"
                        >
                          <option value="amount">{locale === 'en' ? 'Amount of money' : locale === 'zh' ? '金额' : 'จำนวนเงิน'}</option>
                          <option value="percent">{locale === 'en' ? 'percent' : locale === 'zh' ? '百分比' : 'เปอร์เซ็นต์'}</option>
                        </select>
                        <input
                          type="number"
                          min={0}
                          max={discountType === 'percent' ? 100 : undefined}
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                          className="w-28 bg-white border border-[#E5E5E5] text-xs font-bold py-1.5 px-2 text-right text-[#111111] focus:ring-2 focus:ring-[#111111]/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">VAT</span>
                      <label className="inline-flex items-center gap-2 text-[10px] font-bold text-[#666666] uppercase tracking-widest">
                        <input type="checkbox" checked={showVat} onChange={(e) => setShowVat(e.target.checked)} className="accent-[#111111]" />
                        {locale === 'en' ? 'Enable' : locale === 'zh' ? '使能够' : '                         เปิดใช้                       '}</label>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'VAT rate (%)' : locale === 'zh' ? '增值税税率（%）' : 'อัตรา VAT (%)'}</span>
                      <select value={vatRate} disabled={!showVat} onChange={(e) => setVatRate(Number(e.target.value))} className="w-16 bg-white border border-[#E5E5E5] rounded-none text-xs font-bold py-1.5 text-center text-[#111111] focus:ring-2 focus:ring-[#111111]/20 outline-none transition-all appearance-none cursor-pointer disabled:opacity-40">
                        <option value={0} className="text-gray-900">0%</option>
                        <option value={7} className="text-gray-900">7%</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'Withholding' : locale === 'zh' ? '预扣税' : 'หัก ณ ที่จ่าย'}</span>
                      <label className="inline-flex items-center gap-2 text-[10px] font-bold text-[#666666] uppercase tracking-widest">
                        <input type="checkbox" checked={showWithholdingTax} onChange={(e) => setShowWithholdingTax(e.target.checked)} className="accent-[#111111]" />
                        {locale === 'en' ? 'Enable' : locale === 'zh' ? '使能够' : '                         เปิดใช้                       '}</label>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'Withholding rate (%)' : locale === 'zh' ? '预扣税率（%）' : 'อัตราหัก ณ ที่จ่าย (%)'}</span>
                      <select value={withholdingRate} disabled={!showWithholdingTax} onChange={(e) => setWithholdingRate(Number(e.target.value))} className="w-16 bg-white border border-[#E5E5E5] rounded-none text-xs font-bold py-1.5 text-center text-[#111111] focus:ring-2 focus:ring-[#111111]/20 outline-none transition-all appearance-none cursor-pointer disabled:opacity-40">
                        <option value={1}>1%</option>
                        <option value={3}>3%</option>
                        <option value={5}>5%</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'New page for 1 category' : locale === 'zh' ? '1 个类别的新页面' : 'ขึ้นหน้าใหม่ต่อ 1 หมวดหมู่'}</span>
                      <label className="inline-flex items-center gap-2 text-[10px] font-bold text-[#666666] uppercase tracking-widest">
                        <input type="checkbox" checked={pageBreakPerCategory} onChange={(e) => setPageBreakPerCategory(e.target.checked)} className="accent-[#111111]" />
                        {locale === 'en' ? 'Enable' : locale === 'zh' ? '使能够' : '                         เปิดใช้                       '}</label>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'Show message before netting' : locale === 'zh' ? '联网前显示消息' : 'แสดงข้อความก่อนรวมสุทธิ'}</span>
                      <label className="inline-flex items-center gap-2 text-[10px] font-bold text-[#666666] uppercase tracking-widest">
                        <input type="checkbox" checked={showTotalLabel} onChange={(e) => setShowTotalLabel(e.target.checked)} className="accent-[#111111]" />
                        {locale === 'en' ? 'Enable' : locale === 'zh' ? '使能够' : '                         เปิดใช้                       '}</label>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'message' : locale === 'zh' ? '信息' : 'ข้อความ'}</span>
                      <input
                        type="text"
                        value={totalLabel}
                        onChange={(e) => setTotalLabel(e.target.value)}
                        disabled={!showTotalLabel}
                        placeholder={locale === 'en' ? 'For example, include zones 1+2.' : locale === 'zh' ? '例如，包括区域 1+2。' : 'เช่น รวมโซน 1+2'}
                        className="w-44 bg-white border border-[#E5E5E5] text-xs font-bold py-1.5 px-2 text-[#111111] focus:ring-2 focus:ring-[#111111]/20 outline-none transition-all disabled:opacity-40"
                      />
                    </div>
                  </fieldset>

                  <div className="pt-8 border-t border-[#E5E5E5] mb-8">
                    {appliedDiscountAmount > 0 && (
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-[10px] font-bold text-[#666666] uppercase tracking-widest">{locale === 'en' ? 'discount' : locale === 'zh' ? '折扣' : 'ส่วนลด '}{discountType === 'percent' ? `(${normalizedDiscountValue}%)` : ''}</div>
                        <div className="text-sm font-bold text-[#111111]">-{formatTHB(appliedDiscountAmount)}</div>
                      </div>
                    )}
                    {showWithholdingTax && (
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-[10px] font-bold text-[#666666] uppercase tracking-widest">{locale === 'en' ? 'Withholding (' : locale === 'zh' ? '预扣税（' : 'หัก ณ ที่จ่าย ('}{withholdingRate}%)</div>
                        <div className="text-sm font-bold text-[#111111]">-{formatTHB(withholdingTaxAmount)}</div>
                      </div>
                    )}
                    <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest mb-1.5">{locale === 'en' ? 'Net amount to be paid' : locale === 'zh' ? '应付净额' : 'ยอดสุทธิที่ต้องชำระ'}</div>
                    <div className="text-3xl sm:text-4xl font-light tracking-tight text-[#111111]">
                      {formatTHB(grandTotal)}
                    </div>
                  </div>
              </>

              {showSaveButton && (
                <div className="border border-[#E5E5E5] bg-[#FAFAFA] p-4 sm:p-5">
                  {!isValid && validationErrors.length > 0 && (
                    <div id="validation-summary-bottom" className="mb-4 space-y-2 transition-all duration-500 rounded-lg">
                      <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <AlertCircle size={14} className="text-amber-500" />
                        {locale === 'en' ? 'Please check the information (' : locale === 'zh' ? '请检查信息（' : '                         กรุณาตรวจสอบข้อมูล ('}{validationErrors.length} {locale === 'en' ? 'list)' : locale === 'zh' ? '列表）' : ' รายการ)                       '}</div>
                      <div className="grid gap-1.5">
                        {validationErrors.map((err, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => scrollToError(err.elementId)}
                            className="w-full text-left bg-white border border-amber-200 px-3 py-2.5 hover:border-amber-400 transition-all group flex items-start gap-3"
                          >
                            <span className="text-[10px] font-black text-amber-500 mt-0.5">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-bold text-gray-700 leading-tight group-hover:text-amber-800 transition-colors">{err.message}</div>
                              {err.elementId && (
                                <div className="text-[9px] font-bold text-amber-600/60 uppercase tracking-tighter mt-1 flex items-center gap-1 group-hover:text-amber-600">
                                  {locale === 'en' ? 'Click to go to this box.' : locale === 'zh' ? '单击可转到此框。' : '                                   คลิกเพื่อไปที่ช่องนี้ '}<ArrowRight size={8} />
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'Ready to save documents' : locale === 'zh' ? '准备保存文档' : 'พร้อมบันทึกเอกสาร'}</div>
                      <div className="text-xs font-bold text-[#111111]">
                        {docType === 'quotation' ? 'บันทึกใบเสนอราคาจากสรุปยอดด้านบน' : 
                         docType === 'invoice' ? 'บันทึกใบแจ้งหนี้จากสรุปยอดด้านบน' :
                         docType === 'receipt' ? 'บันทึกใบเสร็จรับเงิน' : 'บันทึกข้อมูลเอกสาร'}
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: canSaveNow ? 1.01 : 1 }}
                    whileTap={{ scale: canSaveNow ? 0.99 : 1 }}
                    onClick={() => handleSave('save')}
                    disabled={!canSaveNow}
                    className={`w-full inline-flex items-center justify-center gap-2.5 ${docType === 'quotation' ? 'xyl-doc-quotation-solid' : 'bg-[#111111]'} text-white px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] transition-all disabled:opacity-30`}
                  >
                    {saving ? <Clock size={16} className="animate-spin" /> : <Save size={16} />}
                    {docType === 'quotation' ? 'บันทึกใบเสนอราคา' : 
                     docType === 'invoice' ? 'บันทึกใบแจ้งหนี้' :
                     docType === 'receipt' ? 'บันทึกใบเสร็จรับเงิน' : 'บันทึกข้อมูลเอกสาร'}
                  </motion.button>
                </div>
              )}

            </div>
          </div>

          <div className="bg-white border border-[#E5E5E5] p-6 flex items-start gap-4">
            <div className="w-10 h-10 border border-[#E5E5E5] text-[#111111] flex items-center justify-center shrink-0">
              <span className="text-xs font-black">?</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#111111] uppercase tracking-[0.12em] mb-1">{locale === 'en' ? 'Broker User Guide' : locale === 'zh' ? '经纪商用户指南' : 'คู่มือการใช้งานโบรกเกอร์'}</h4>
              <p className="text-[10px] text-[#666666] leading-relaxed font-medium">
                {locale === 'en' ? 'You can separate work zones for clarity in estimating prices. The system will automatically group items.' : locale === 'zh' ? '您可以分隔工作区域，以便清楚地估算价格。系统会自动对项目进行分组。' : '                 คุณสามารถแยกโซนหน้างานเพื่อความชัดเจนในการประเมินราคา ระบบจะจัดกลุ่มรายการให้อัตโนมัติ               '}</p>
            </div>
          </div>
        </div>
        )}
      </main>

    </div>
  )
}
