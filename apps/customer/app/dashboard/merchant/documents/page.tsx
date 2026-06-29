'use client';
import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  FolderOpen, 
  Search,
  LayoutGrid,
  List as ListIcon,
  FileText,
  FileCheck,
  TrendingUp,
  Clock,
  Loader2,
  Plus,
  Trash2,
  FilePlus2,
  Download,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { deleteAdminDocument, getAdminDocuments, updateManualDocument } from '@/lib/supabaseClient'
import { downloadFile, generateDocumentPdfUrl } from '@/lib/documentPdf'
import { buildQuotationInstallmentProgress, getReceiptGateForInvoice, parseManualPayload, resolveSourceDocumentId } from '@/lib/installmentFlow'
import { useI18n } from "@/lib/I18nContext";

export default function AdminDocuments() {
    const { locale } = useI18n();
  const { profile } = useAuth()
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const [activeFilter, setActiveFilter] = useState('ทั้งหมด');
  const [viewMode, setViewMode] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([])

  const filters = ['ทั้งหมด', 'ใบเสนอราคา', 'ใบแจ้งหนี้', 'ใบเสร็จ', 'Plant Material', 'สัญญา'];

  useEffect(() => {
    const run = async () => {
      // Admin might not have a profile immediately if auth is loading, handle gracefully
      if (!profile) return 

      setLoading(true)
      setError('')
      const { data, error } = await getAdminDocuments()
      
      if (error) {
        console.error('Failed to load documents:', error)
        setError(error.message || 'โหลดเอกสารไม่สำเร็จ')
        setDocs([])
      } else {
        setDocs(data || [])
      }
      setLoading(false)
    }

    void run()
  }, [profile])


  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '-'
    try {
        const d = new Date(iso)
        return d.toLocaleDateString('th-TH', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        })
    } catch {
      return iso
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalValue = docs
      .filter((doc) => doc.type === 'receipt')
      .reduce((acc, doc) => acc + (Number(doc.total) || 0), 0)
    const quotations = docs.filter(d => d.type === 'quotation').length
    const invoicesReceipts = docs.filter(d => d.type === 'invoice' || d.type === 'receipt').length
    const plantAndContracts = docs.filter(d => d.type === 'plant_material' || d.type === 'contract').length
    
    return {
        totalValue,
        totalDocs: docs.length,
        quotations,
      invoicesReceipts,
      plantAndContracts
    }
  }, [docs])

  // Filter documents
  const filteredDocs = useMemo(() => {
    return docs.filter(doc => {
        // Tab filtering logic if needed (currently using same logic as dropdown for simplicity)
        const matchesFilter = activeFilter === 'ทั้งหมด' || 
            (activeFilter === 'ใบเสนอราคา' && doc.type === 'quotation') ||
            (activeFilter === 'ใบแจ้งหนี้' && doc.type === 'invoice') ||
          (activeFilter === 'ใบเสร็จ' && doc.type === 'receipt') ||
          (activeFilter === 'Plant Material' && doc.type === 'plant_material') ||
          (activeFilter === 'สัญญา' && doc.type === 'contract');
        
        const searchLower = searchTerm.toLowerCase();
        // recipient can be an object or null, check structure safely. 
        // With getAdminDocuments, recipient is { name, email }, so .name works.
        const recipientName = doc.recipient?.name || '';
        
        const matchesSearch = !searchTerm || 
            (doc.document_code && doc.document_code.toLowerCase().includes(searchLower)) ||
            (doc.id && doc.id.toLowerCase().includes(searchLower)) ||
            (recipientName.toLowerCase().includes(searchLower));

          return matchesFilter && matchesSearch;
    })
        }, [docs, activeFilter, searchTerm])

  const getTypeLabel = (doc: any) => {
      switch(doc?.type) {
          case 'quotation': return 'ใบเสนอราคา';
          case 'invoice': return 'ใบแจ้งหนี้';
          case 'receipt': return 'ใบเสร็จ';
        case 'plant_material': return 'Plant Material';
          case 'contract': {
            const payload = parseManualPayload(doc?.description)
            if (payload?.contract_type === 'annual_maintenance') return 'สัญญาดูแลสวนรายปี'
            return 'สัญญารับเหมาจัดสวน'
          }
          default: return 'เอกสาร';
      }
  }

  const getDocToneClass = (type?: string) => {
    if (type === 'quotation') return 'xyl-doc-quotation'
    if (type === 'invoice') return 'xyl-doc-invoice'
    if (type === 'receipt') return 'xyl-doc-receipt'
    if (type === 'plant_material') return 'xyl-doc-plant'
    if (type === 'contract') return 'xyl-doc-contract'
    return 'border-[#E5E5E5] bg-white text-[#666666]'
  }

  const getCreateActionToneClass = (label?: string) => {
    const text = String(label || '')
    if (text.includes('ใบแจ้งหนี้')) return 'xyl-doc-invoice-solid'
    if (text.includes('ใบเสร็จ')) return 'xyl-doc-receipt-solid'
    if (text.includes('Plant') || text.includes('พืช')) return 'xyl-doc-plant-solid'
    if (text.includes('สัญญา')) return 'xyl-doc-contract-solid'
    if (text.includes('ใบเสนอราคา')) return 'xyl-doc-quotation-solid'
    return 'bg-[#111111] border-[#111111] text-white'
  }

  const getCustomerName = (doc: any) => {
    return doc.customer_name || doc.customer?.name || doc.order?.customer?.display_name || 'ลูกค้าทั่วไป'
  }

  const isPlantMaterialDoc = (doc: any) => String(doc?.type || '') === 'plant_material'

  const getDocumentAmountDisplay = (doc: any) => {
    if (isPlantMaterialDoc(doc)) return 'ไม่แสดงราคา'
    return formatCurrency(Number(doc?.total) || 0)
  }

  const getGroupFlowSummary = (group: any) => {
    const parts = [`${group.docs.length} เอกสารในกลุ่ม`]

    if (!group.docs.some((doc: any) => isPlantMaterialDoc(doc))) {
      parts.push(`ยอดรับจริง ${formatCurrency(group.receiptTotal)}`)
    }

    if (group.installmentProgressLabel) {
      parts.push(group.installmentProgressLabel)
    }

    if (group.nextInstallmentLabel) {
      parts.push(`เหลืองวด ${group.nextInstallmentLabel}`)
    }

    return parts.join(' • ')
  }

  const getInvoiceDownloadMeta = (doc: any) => {
    if (doc?.type !== 'invoice') {
      return {
        actionLabel: 'ดาวน์โหลด',
        installmentDisplay: '',
        amountDisplay: '',
        summaryText: '',
        ariaLabel: 'ดาวน์โหลดเอกสาร',
        title: 'ดาวน์โหลดเอกสาร',
      }
    }

    const payload = parseManualPayload(doc?.description)
    const installments = Array.isArray(payload?.installments)
      ? payload.installments.map((it: any, idx: number) => ({
          id: String(it?.id || `inst-${idx + 1}`),
          label: String(it?.label || `งวดที่ ${idx + 1}`),
          amount: Number(it?.amount) || 0,
        }))
      : []

    if (installments.length === 0) {
      const fallbackLabel = String(invoiceInstallmentLabelById.get(String(doc?.id || '')) || payload?.current_installment_label || '').trim()
      return {
        actionLabel: fallbackLabel ? 'ดาวน์โหลดงวด' : 'ดาวน์โหลด',
        installmentDisplay: fallbackLabel,
        amountDisplay: '',
        summaryText: fallbackLabel,
        ariaLabel: fallbackLabel ? `ดาวน์โหลดเอกสารทีละงวด ${fallbackLabel}` : 'ดาวน์โหลดเอกสาร',
        title: fallbackLabel ? `ดาวน์โหลดทีละงวด • ${fallbackLabel}` : 'ดาวน์โหลดเอกสาร',
      }
    }

    const paidIds = Array.isArray(payload?.paid_installment_ids)
      ? payload.paid_installment_ids.map((id: any) => String(id || '').trim()).filter(Boolean)
      : []
    const paidSet = new Set<string>(paidIds)
    const preferredInstallmentId = String(payload?.current_installment_id || '').trim()
    const preferredInstallment = preferredInstallmentId
      ? installments.find((it: any) => String(it.id) === preferredInstallmentId) || null
      : null
    const selectedUnpaidInstallment = preferredInstallment && !paidSet.has(String(preferredInstallment.id))
      ? preferredInstallment
      : null
    const nextInstallment = selectedUnpaidInstallment || installments.find((it: any) => !paidSet.has(String(it.id))) || preferredInstallment

    if (!nextInstallment) {
      return {
        actionLabel: 'ดาวน์โหลด',
        installmentDisplay: 'ครบทุกงวดแล้ว',
        amountDisplay: '',
        summaryText: 'ครบทุกงวดแล้ว',
        ariaLabel: 'ดาวน์โหลดเอกสาร',
        title: 'ดาวน์โหลดเอกสาร',
      }
    }

    const installmentIndex = installments.findIndex((it: any) => String(it.id) === String(nextInstallment.id))
    const installmentDisplay = installmentIndex >= 0
      ? `งวด ${installmentIndex + 1}/${installments.length}`
      : String(nextInstallment.label || '').trim()
    const amountDisplay = `฿${formatCurrency(Number(nextInstallment.amount) || 0)}`
    const summaryText = `${installmentDisplay} • ${amountDisplay}`

    return {
      actionLabel: installmentDisplay ? `ดาวน์โหลด${installmentDisplay}` : 'ดาวน์โหลดงวด',
      installmentDisplay,
      amountDisplay,
      summaryText,
      ariaLabel: `ดาวน์โหลดเอกสารทีละงวด ${installmentDisplay} ยอด ${amountDisplay}`,
      title: `ดาวน์โหลดทีละงวด • ${installmentDisplay} • ${amountDisplay}`,
    }
  }

  const getInvoiceInstallmentDownloadOptions = (doc: any) => {
    if (doc?.type !== 'invoice') return { options: [] as Array<{ id: string; label: string; amount: number }>, isCompleted: false }
    const payload = parseManualPayload(doc?.description)
    const options = Array.isArray(payload?.installments)
      ? payload.installments.map((it: any, idx: number) => ({
          id: String(it?.id || `inst-${idx + 1}`),
          label: String(it?.label || `งวดที่ ${idx + 1}`),
          amount: Number(it?.amount) || 0,
        }))
      : []
    const paidCount = Array.isArray(payload?.paid_installment_ids)
      ? payload.paid_installment_ids.map((id: any) => String(id || '').trim()).filter(Boolean).length
      : 0
    return {
      options,
      isCompleted: options.length > 0 && paidCount >= options.length,
    }
  }

  const invoiceInstallmentLabelById = useMemo(() => {
    const map = new Map<string, string>()
    const installmentCountByQuotationId = new Map<string, number>()
    const invoices = docs.filter((doc) => doc?.type === 'invoice' && !!doc?.id)
    const invoicesBySource = new Map<string, any[]>()

    for (const item of docs) {
      if (item?.type !== 'quotation' || !item?.id) continue
      const payload = parseManualPayload(item?.description)
      if (Array.isArray(payload?.installments) && payload.installments.length > 0) {
        installmentCountByQuotationId.set(String(item.id), payload.installments.length)
      }
    }

    for (const invoice of invoices) {
      const payload = parseManualPayload(invoice?.description)
      const explicitLabel = String(payload?.current_installment_label || '').trim()

      if (explicitLabel) {
        map.set(String(invoice.id), explicitLabel)
      }

      const sourceId = resolveSourceDocumentId(invoice)
      if (!sourceId) continue

      const group = invoicesBySource.get(sourceId) || []
      group.push(invoice)
      invoicesBySource.set(sourceId, group)
    }

    invoicesBySource.forEach((sourceInvoices, sourceId) => {
      const totalInstallments = installmentCountByQuotationId.get(sourceId) || 0
      if (totalInstallments <= 0) return

      const sorted = [...sourceInvoices].sort((a, b) => {
        const timeA = new Date(a?.created_at || 0).getTime()
        const timeB = new Date(b?.created_at || 0).getTime()
        if (timeA !== timeB) return timeA - timeB
        return String(a?.id || '').localeCompare(String(b?.id || ''))
      })

      sorted.forEach((invoice, index) => {
        const invoiceId = String(invoice.id)
        if (map.has(invoiceId)) return
        map.set(invoiceId, `งวดที่ ${Math.min(index + 1, totalInstallments)}/${totalInstallments}`)
      })
    })

    return map
  }, [docs])

  const sourceDocumentMap = useMemo(() => {
    const map = {
      invoiceSourceIds: new Set<string>(),
      receiptSourceIds: new Set<string>(),
      plantMaterialSourceIds: new Set<string>(),
      contractSourceIds: new Set<string>(),
      /** Track how many invoices exist per quotation (for installment flow) */
      invoiceCountBySourceId: new Map<string, number>(),
      /** Track installment count from source quotation payload */
      installmentCountByQuotationId: new Map<string, number>(),
    }

    for (const item of docs) {
      const sourceId = resolveSourceDocumentId(item)
      if (!sourceId) continue

      if (item?.type === 'invoice') {
        map.invoiceSourceIds.add(sourceId)
        map.invoiceCountBySourceId.set(sourceId, (map.invoiceCountBySourceId.get(sourceId) || 0) + 1)
      }
      if (item?.type === 'receipt') {
        map.receiptSourceIds.add(sourceId)
      }
      if (item?.type === 'plant_material') {
        map.plantMaterialSourceIds.add(sourceId)
      }
      if (item?.type === 'contract') {
        map.contractSourceIds.add(sourceId)
      }
    }

    // Pre-compute installment counts for quotations that have installment plans
    for (const item of docs) {
      if (item?.type !== 'quotation') continue
      const payload = parseManualPayload(item?.description)
      if (Array.isArray(payload?.installments) && payload.installments.length > 0) {
        map.installmentCountByQuotationId.set(item.id, payload.installments.length)
      }
    }

    return map
  }, [docs])

  const referencedDocumentIds = useMemo(() => {
    const ids = new Set<string>()

    for (const item of docs) {
      const sourceId = resolveSourceDocumentId(item)
      if (sourceId) ids.add(sourceId)
    }

    return ids
  }, [docs])

  const isDeleteBlocked = (doc: any) => referencedDocumentIds.has(doc.id)

  const docsById = useMemo(() => {
    const map = new Map<string, any>()
    for (const item of docs) {
      if (item?.id) map.set(String(item.id), item)
    }
    return map
  }, [docs])

  const resolveGroupRootId = (doc: any): string => {
    if (!doc?.id) return ''

    let current = doc
    let guard = 0
    while (guard < 12) {
      guard += 1
      const sourceId = resolveSourceDocumentId(current)
      if (!sourceId) return String(current.id)
      const sourceDoc = docsById.get(sourceId)
      if (!sourceDoc) return sourceId
      current = sourceDoc
    }

    return String(doc.id)
  }

  const groupedDocs = useMemo(() => {
    const typeOrder: Record<string, number> = {
      quotation: 1,
      invoice: 2,
      receipt: 3,
      plant_material: 4,
      contract: 5,
    }

    const groups = new Map<string, { rootId: string; docs: any[]; rootDoc: any | null }>()

    for (const doc of filteredDocs) {
      const rootId = resolveGroupRootId(doc)
      const existing = groups.get(rootId)
      if (!existing) {
        groups.set(rootId, {
          rootId,
          docs: [doc],
          rootDoc: docsById.get(rootId) || null,
        })
      } else {
        existing.docs.push(doc)
      }
    }

    const sortedGroups = Array.from(groups.values())
      .map((group) => {
        const sortedDocs = [...group.docs].sort((a, b) => {
          const typeA = typeOrder[String(a?.type || '')] || 99
          const typeB = typeOrder[String(b?.type || '')] || 99
          if (typeA !== typeB) return typeA - typeB

          const createdA = new Date(a?.created_at || 0).getTime()
          const createdB = new Date(b?.created_at || 0).getTime()
          return createdA - createdB
        })

        const rootTime = new Date((group.rootDoc || sortedDocs[0])?.created_at || 0).getTime()

        const receiptTotal = sortedDocs
          .filter((item) => item?.type === 'receipt')
          .reduce((acc, item) => acc + (Number(item?.total) || 0), 0)

        let completedByReceipt = sortedDocs.some((item) => item?.type === 'receipt')
        let installmentProgressLabel = ''
        let nextInstallmentLabel = ''

        const rootQuotation = (group.rootDoc?.type === 'quotation'
          ? group.rootDoc
          : sortedDocs.find((item) => item?.type === 'quotation')) || null

        if (rootQuotation) {
          const progress = buildQuotationInstallmentProgress(rootQuotation, docs)
          if (progress.isInstallmentFlow) {
            completedByReceipt = progress.isFullyPaid
            installmentProgressLabel = `ชำระงวด ${progress.paidCount}/${progress.totalInstallments}`
            const nextInstallmentId = progress.installmentIds.find((id) => !progress.paidInstallmentIdSet.has(id))
            if (nextInstallmentId) {
              nextInstallmentLabel = progress.labelsById.get(nextInstallmentId) || nextInstallmentId
            }
          }
        }
        const groupAnchor = group.rootDoc || sortedDocs[0]
        const customerName =
          groupAnchor?.customer_name ||
          groupAnchor?.customer?.name ||
          groupAnchor?.order?.customer?.display_name ||
          'ลูกค้าทั่วไป'
        const documentNo = groupAnchor?.document_code || String(groupAnchor?.id || group.rootId).slice(0, 8)

        return {
          ...group,
          docs: sortedDocs,
          rootTime,
          customerName,
          documentNo,
          receiptTotal,
          completedByReceipt,
          installmentProgressLabel,
          nextInstallmentLabel,
        }
      })
      .sort((a, b) => b.rootTime - a.rootTime)

    return sortedGroups
  }, [filteredDocs, docsById])

  const toggleGroup = (groupId: string) => {
    setExpandedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    )
  }

  /** Status-less flow: allow chaining by document type rules only */
  const isChainableStatus = (_doc: any): boolean => true

  const getNextDocumentAction = (doc: any): { label: string; href: string; disabled?: boolean; reason?: string } | null => {
    if (!isChainableStatus(doc)) return null

    // Quotation → Invoice (handles installment invoicing)
    if (doc.type === 'quotation') {
      const installmentCount = sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0
      const invoiceCount = sourceDocumentMap.invoiceCountBySourceId.get(doc.id) || 0

      if (installmentCount > 0) {
        // Installment flow: allow creating invoices until all installments are covered
        if (invoiceCount >= installmentCount) return null
        return { label: `สร้างใบแจ้งหนี้ (งวด ${invoiceCount + 1}/${installmentCount})`, href: `/dashboard/admin/documents/create-manual?type=invoice&sourceDocId=${doc.id}` }
      }

      // Non-installment: only one invoice per quotation
      if (sourceDocumentMap.invoiceSourceIds.has(doc.id)) return null
      return { label: 'สร้างใบแจ้งหนี้', href: `/dashboard/admin/documents/create-manual?type=invoice&sourceDocId=${doc.id}` }
    }

    // Invoice → Receipt (issued/generated/paid invoice can create receipt)
    if (doc.type === 'invoice') {
      const gate = getReceiptGateForInvoice(doc, docs)
      const payload = parseManualPayload(doc?.description)
      const payloadInstallmentCount = Array.isArray(payload?.installments) ? payload.installments.length : 0
      const payloadPaidCount = Array.isArray(payload?.paid_installment_ids)
        ? payload.paid_installment_ids.map((id: any) => String(id || '').trim()).filter(Boolean).length
        : 0
      const payloadInstallmentFullyPaid = payloadInstallmentCount > 0 && payloadPaidCount >= payloadInstallmentCount
      const installmentFullyPaid = !!gate.progress?.isInstallmentFlow
        && Number(gate.progress?.totalInstallments || 0) > 0
        && Number(gate.progress?.paidCount || 0) >= Number(gate.progress?.totalInstallments || 0)
      if (!gate.allowed && gate.reason === 'ใบแจ้งหนี้นี้มีใบเสร็จแล้ว') return null
      if (!gate.allowed && (installmentFullyPaid || payloadInstallmentFullyPaid)) {
        return { label: 'สร้างใบเสร็จ', href: `/dashboard/admin/documents/create-manual?type=receipt&sourceDocId=${doc.id}` }
      }
      if (!gate.allowed && gate.progress?.isInstallmentFlow) return null
      if (!gate.allowed) {
        return {
          label: 'สร้างใบเสร็จ',
          href: '#',
          disabled: true,
          reason: gate.reason,
        }
      }
      return { label: 'สร้างใบเสร็จ', href: `/dashboard/admin/documents/create-manual?type=receipt&sourceDocId=${doc.id}` }
    }

    // Plant material, Contract, Receipt are TERMINAL
    return null
  }

  /** Check if a quotation contains tree or shrub items (required for plant material) */
  const quotationHasPlantItems = (doc: any): boolean => {
    const payload = parseManualPayload(doc?.description)
    if (!payload) return false
    const allItems: any[] = []
    if (Array.isArray(payload.zones)) {
      for (const zone of payload.zones) {
        for (const cat of zone.categories || []) {
          for (const item of cat.items || []) allItems.push(item)
        }
      }
    } else if (Array.isArray(payload.items)) {
      allItems.push(...payload.items)
    }
    return allItems.some((item: any) => {
      const mode = String(item?.size_mode || '').toLowerCase()
      return mode === 'tree' || mode === 'shrub'
    })
  }

  /** Quotation can branch to Plant Material — ONLY if quotation has tree/shrub items */
  const getPlantMaterialAction = (doc: any): { label: string; href: string } | null => {
    if (doc?.type !== 'quotation') return null
    if (!isChainableStatus(doc)) return null
    if (sourceDocumentMap.plantMaterialSourceIds.has(doc.id)) return null
    if (!quotationHasPlantItems(doc)) return null
    return {
      label: 'Plant Material',
      href: `/dashboard/admin/documents/create-manual?type=plant_material&sourceDocId=${doc.id}`,
    }
  }

  /** Invoice can branch to Contract */
  const getContractAction = (doc: any): { label: string; href: string } | null => {
    if (doc?.type !== 'invoice') return null
    if (!isChainableStatus(doc)) return null
    if (sourceDocumentMap.contractSourceIds.has(doc.id)) return null
    return {
      label: 'สร้างสัญญา',
      href: `/dashboard/admin/documents/create-manual?type=contract&sourceDocId=${doc.id}`,
    }
  }

  const handleDownloadDocument = async (doc: any, selectedInstallmentId?: string, downloadOptions?: { isCopy?: boolean; includeCopy?: boolean }) => {
    setDownloadingId(doc.id)
    setError('')

    try {
      const payload = parseManualPayload(doc?.description)

      if (doc?.type === 'invoice' && Array.isArray(payload?.installments) && payload.installments.length > 0) {
        const plan = payload.installments.map((it: any, idx: number) => ({
          id: String(it?.id || `inst-${idx + 1}`),
          label: String(it?.label || `งวดที่ ${idx + 1}`),
          amount: Number(it?.amount) || 0,
          percent: Number(it?.percent) || 0,
        }))

        const paidIds = Array.isArray(payload?.paid_installment_ids)
          ? payload.paid_installment_ids.map((id: any) => String(id || '').trim()).filter(Boolean)
          : []
        const paidSet = new Set<string>(paidIds)

        const preferredInstallmentId = String(payload?.current_installment_id || '').trim()
        const preferredInstallment = preferredInstallmentId
          ? plan.find((it: any) => String(it.id) === preferredInstallmentId) || null
          : null
        const selectedUnpaidInstallment = preferredInstallment && !paidSet.has(String(preferredInstallment.id))
          ? preferredInstallment
          : null
        const nextInstallment = selectedUnpaidInstallment || plan.find((it: any) => !paidSet.has(String(it.id))) || null

        const isCompleted = paidSet.size >= plan.length
        if (isCompleted) {
          const requestedId = String(selectedInstallmentId || '').trim()
          const selectedInstallment = (requestedId
            ? plan.find((it: any) => String(it.id) === requestedId) || null
            : null) || preferredInstallment || plan[0] || null
          if (!selectedInstallment) throw new Error('ไม่พบงวดที่เลือกสำหรับดาวน์โหลด')

          const previewPayload = {
            ...payload,
            current_installment_id: selectedInstallment.id,
            current_installment_label: selectedInstallment.label,
            current_installment_percent: Number(selectedInstallment.percent) || undefined,
            total: Number(selectedInstallment.amount) || 0,
            installment_progress: `ชำระงวดแล้ว ${paidSet.size}/${plan.length}`,
          }

          const { url } = await generateDocumentPdfUrl({
            ...doc,
            description: JSON.stringify(previewPayload),
          }, downloadOptions)

          const code = doc.document_code || doc.id?.slice(0, 8) || 'document'
          const installmentLabel = String(selectedInstallment.label || selectedInstallment.id || '').trim()
          const installmentPart = installmentLabel
            ? `_${installmentLabel.replace(/\s+/g, '_').replace(/[\\/:*?"<>|#%&{}$!'@+=`~]/g, '-').replace(/-+/g, '-').replace(/^[-_]+|[-_]+$/g, '')}`
            : ''
          downloadFile(url, `${doc.type || 'document'}_${code}${installmentPart}.pdf`)
          return
        }

        if (!nextInstallment) {
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
          ...doc,
          description: JSON.stringify(previewPayload),
        }, downloadOptions)

        const code = doc.document_code || doc.id?.slice(0, 8) || 'document'
        const installmentLabel = String(nextInstallment.label || nextInstallment.id || '').trim()
        const installmentPart = installmentLabel
          ? `_${installmentLabel.replace(/\s+/g, '_').replace(/[\\/:*?"<>|#%&{}$!'@+=`~]/g, '-').replace(/-+/g, '-').replace(/^[-_]+|[-_]+$/g, '')}`
          : ''
        downloadFile(url, `${doc.type || 'document'}_${code}${installmentPart}.pdf`)

        const updatedPaidSet = new Set<string>([...Array.from(paidSet), String(nextInstallment.id)])
        const updatedPaidIds = Array.from(updatedPaidSet)
        const nextQueueInstallment = plan.find((it: any) => !updatedPaidSet.has(String(it.id))) || null
        const isCompletedAfterDownload = updatedPaidIds.length >= plan.length

        const persistPayload = {
          ...payload,
          current_installment_id: nextQueueInstallment?.id || nextInstallment.id,
          current_installment_label: nextQueueInstallment?.label || nextInstallment.label,
          current_installment_percent: Number((nextQueueInstallment || nextInstallment).percent) || undefined,
          paid_installment_ids: updatedPaidIds,
          installment_progress: `ชำระงวดแล้ว ${updatedPaidIds.length}/${plan.length}`,
          paid_at: isCompletedAfterDownload ? new Date().toISOString() : payload?.paid_at,
          paid_amount: isCompletedAfterDownload ? Number(payload?.total ?? doc.total ?? 0) : payload?.paid_amount,
        }

        const { error: persistError } = await updateManualDocument({
          doc_id: String(doc.id),
          type: 'invoice',
          payload: persistPayload as any,
          status: isCompletedAfterDownload ? 'paid' : 'issued',
        })
        if (persistError) throw persistError

        const nextDescription = JSON.stringify(persistPayload)
        setDocs((prev) => prev.map((row) => {
          if (String(row?.id) !== String(doc?.id)) return row
          return {
            ...row,
            description: nextDescription,
            status: isCompletedAfterDownload ? 'paid' : 'issued',
          }
        }))
      } else {
        const { url } = await generateDocumentPdfUrl(doc, downloadOptions)
        const code = doc.document_code || doc.id?.slice(0, 8) || 'document'
        const installmentLabel = doc?.type === 'invoice'
          ? String(invoiceInstallmentLabelById.get(String(doc?.id || '')) || parseManualPayload(doc?.description)?.current_installment_label || '').trim()
          : ''
        const installmentPart = installmentLabel
          ? `_${installmentLabel.replace(/\s+/g, '_').replace(/[\\/:*?"<>|#%&{}$!'@+=`~]/g, '-').replace(/-+/g, '-').replace(/^[-_]+|[-_]+$/g, '')}`
          : ''
        downloadFile(url, `${doc.type || 'document'}_${code}${installmentPart}.pdf`)
      }
    } catch (err: any) {
      setError(err?.message || 'ดาวน์โหลดเอกสารไม่สำเร็จ')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDeleteDocument = async (doc: any) => {
    if (isDeleteBlocked(doc)) {
      setError('ไม่สามารถลบเอกสารนี้ได้ เพราะมีเอกสารอื่นอ้างอิงอยู่แล้ว')
      return
    }

    const confirmed = window.confirm(`ยืนยันการลบเอกสาร ${doc.document_code || doc.id?.slice(0, 8)} ?`)
    if (!confirmed) return

    setDeletingId(doc.id)
    const { error } = await deleteAdminDocument(doc.id)

    if (error) {
      setError(error.message || 'ไม่สามารถลบเอกสารได้')
      setDeletingId(null)
      return
    }

    setDocs(prev => prev.filter(item => item.id !== doc.id))
    setDeletingId(null)
  }

  if (!profile) return null

  return (
    <div className="relative min-h-screen font-sans text-[#111111] selection:bg-[#111111] selection:text-white">
      <div className="fixed inset-0 -z-10 bg-white" />
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-10 md:pt-14 pb-24 md:pb-32">
        <main className="space-y-14 md:space-y-20">
          <section className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter uppercase leading-none">
                  Management Console
                </h1>
                <p className="text-sm text-[#666666] font-light flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 shrink-0" /> {locale === 'en' ? ' ศูนย์จัดการเอกสาร (Admin)                 ' : locale === 'zh' ? ' ศูนย์จัดการเอกสาร (Admin)                 ' : ' ศูนย์จัดการเอกสาร (Admin)                 '}</p>
              </div>

              <div className="relative z-20 w-full md:w-auto md:min-w-[220px]">
                <button
                  onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                  className="flex items-center gap-3 bg-[#111111] text-white px-5 py-3 w-full justify-between hover:bg-[#333333] transition-colors"
                >
                  <span className="text-xs font-bold tracking-[0.1em] uppercase">{locale === 'en' ? 'สร้างเอกสารใหม่' : locale === 'zh' ? 'สร้างเอกสารใหม่' : 'สร้างเอกสารใหม่'}</span>
                  <Plus className={`w-4 h-4 transition-transform duration-300 ${isCreateMenuOpen ? 'rotate-45' : ''}`} />
                </button>

                <div className={`absolute top-full left-0 right-0 bg-white border border-[#E5E5E5] border-t-0 shadow-lg transition-all duration-300 overflow-hidden ${isCreateMenuOpen ? 'max-h-56 opacity-100 visible' : 'max-h-0 opacity-0 invisible'}`}>
                  <Link href="/dashboard/admin/documents/create-manual?type=quotation" className="block px-5 py-3 text-xs border-b border-[#F5F5F5] uppercase tracking-wider xyl-doc-quotation">
                    {locale === 'en' ? 'Create a quote' : locale === 'zh' ? '创建报价' : '                     สร้างใบเสนอราคา                   '}</Link>
                  <div className="px-5 py-2.5 border-t border-[#F5F5F5]">
                    <p className="text-[9px] font-bold text-[#A3A3A3] uppercase tracking-[0.15em]">{locale === 'en' ? 'เอกสารต่อเนื่อง (สร้างจากปุ่มในรายการเอกสาร)' : locale === 'zh' ? 'เอกสารต่อเนื่อง (สร้างจากปุ่มในรายการเอกสาร)' : 'เอกสารต่อเนื่อง (สร้างจากปุ่มในรายการเอกสาร)'}</p>
                  </div>
                  <div className="px-5 py-2 text-[10px] text-[#999999] flex items-center gap-2">
                    <span className="w-2 h-2 xyl-doc-invoice rounded-full border"></span> {locale === 'en' ? ' ใบแจ้งหนี้ — สร้างจากใบเสนอราคา                   ' : locale === 'zh' ? ' ใบแจ้งหนี้ — สร้างจากใบเสนอราคา                   ' : ' ใบแจ้งหนี้ — สร้างจากใบเสนอราคา                   '}</div>
                  <div className="px-5 py-2 text-[10px] text-[#999999] flex items-center gap-2">
                    <span className="w-2 h-2 xyl-doc-receipt rounded-full border"></span> {locale === 'en' ? ' ใบเสร็จ — สร้างจากใบแจ้งหนี้                   ' : locale === 'zh' ? ' ใบเสร็จ — สร้างจากใบแจ้งหนี้                   ' : ' ใบเสร็จ — สร้างจากใบแจ้งหนี้                   '}</div>
                  <div className="px-5 py-2 text-[10px] text-[#999999] flex items-center gap-2">
                    <span className="w-2 h-2 xyl-doc-plant rounded-full border"></span> {locale === 'en' ? ' Plant Material — สร้างจากใบเสนอราคา                   ' : locale === 'zh' ? ' Plant Material — สร้างจากใบเสนอราคา                   ' : ' Plant Material — สร้างจากใบเสนอราคา                   '}</div>
                  <div className="px-5 py-2 text-[10px] text-[#999999] flex items-center gap-2">
                    <span className="w-2 h-2 xyl-doc-contract rounded-full border"></span> {locale === 'en' ? ' สัญญา — สร้างจากใบแจ้งหนี้                   ' : locale === 'zh' ? ' สัญญา — สร้างจากใบแจ้งหนี้                   ' : ' สัญญา — สร้างจากใบแจ้งหนี้                   '}</div>
                </div>
              </div>
            </div>
          </section>
          
          {/* 01. OVERVIEW (สถิติเอกสาร) */}
          <section className="space-y-8 md:space-y-10">
            <h2 className="text-lg md:text-xl font-medium tracking-wide uppercase border-b border-[#111111] pb-4">{locale === 'en' ? 'ภาพรวมเอกสาร' : locale === 'zh' ? 'ภาพรวมเอกสาร' : 'ภาพรวมเอกสาร'}</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-4 pt-2 md:pt-4">
              
              {/* Box 1: Total Value (Highlight) */}
              <div className="col-span-2 md:col-span-2 border border-[#111111] bg-[#111111] text-white p-6 md:p-8 flex flex-col justify-between relative group">
                <div className="flex justify-between items-start mb-8">
                  <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'มูลค่ารับเงินจริง (จากใบเสร็จ)' : locale === 'zh' ? 'มูลค่ารับเงินจริง (จากใบเสร็จ)' : 'มูลค่ารับเงินจริง (จากใบเสร็จ)'}</span>
                  <TrendingUp className="w-5 h-5 text-[#A3A3A3]" strokeWidth={1.5} />
                </div>
                <div>
                  <span className="text-2xl md:text-3xl font-light text-[#A3A3A3]">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}</span>
                  <span className="text-4xl md:text-5xl font-light tracking-tighter ml-1">{formatCurrency(stats.totalValue).split('.')[0]}</span>
                  <span className="text-xl md:text-2xl font-light text-[#A3A3A3]">.{formatCurrency(stats.totalValue).split('.')[1]}</span>
                </div>
              </div>

              {/* Box 2: Total Docs */}
              <div className="col-span-1 border border-[#E5E5E5] p-6 flex flex-col justify-between relative bg-white hover:border-[#111111] transition-colors">
                 <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'ฉบับทั้งหมด' : locale === 'zh' ? 'ฉบับทั้งหมด' : 'ฉบับทั้งหมด'}</span>
                 </div>
                <span className="text-4xl md:text-5xl font-light text-[#111111] mt-6">{stats.totalDocs}</span>
              </div>

              {/* Box 3 & 4: Sub Categories */}
              <div className="col-span-1 flex flex-col gap-4">
                <div className="flex-1 border border-[#E5E5E5] p-4 flex flex-col justify-between bg-white hover:border-[#111111] transition-colors">
                  <span className="text-[8px] font-bold text-[#A3A3A3] uppercase tracking-[0.1em]">{locale === 'en' ? 'quotation' : locale === 'zh' ? '引述' : 'ใบเสนอราคา'}</span>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-3xl font-light text-[#111111]">{stats.quotations}</span>
                    <FileText className="w-4 h-4 text-[#A3A3A3] mb-1" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="flex-1 border border-[#E5E5E5] p-4 flex flex-col justify-between bg-white hover:border-[#111111] transition-colors">
                  <span className="text-[8px] font-bold text-[#A3A3A3] uppercase tracking-[0.1em]">{locale === 'en' ? 'ใบแจ้งหนี้/ใบเสร็จ' : locale === 'zh' ? 'ใบแจ้งหนี้/ใบเสร็จ' : 'ใบแจ้งหนี้/ใบเสร็จ'}</span>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-3xl font-light text-[#111111]">{stats.invoicesReceipts}</span>
                    <FileCheck className="w-4 h-4 text-[#A3A3A3] mb-1" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="flex-1 border border-[#E5E5E5] p-4 flex flex-col justify-between bg-white hover:border-[#111111] transition-colors">
                  <span className="text-[8px] font-bold text-[#A3A3A3] uppercase tracking-[0.1em]">{locale === 'en' ? 'Plant/สัญญา' : locale === 'zh' ? 'Plant/สัญญา' : 'Plant/สัญญา'}</span>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-3xl font-light text-[#111111]">{stats.plantAndContracts}</span>
                    <FileText className="w-4 h-4 text-[#A3A3A3] mb-1" strokeWidth={1.5} />
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* 02. DOCUMENT ARCHIVE (คลังเอกสาร) */}
          <section className="space-y-8 md:space-y-10">
            <h2 className="text-lg md:text-xl font-medium tracking-wide uppercase border-b border-[#111111] pb-4">{locale === 'en' ? 'คลังเอกสาร' : locale === 'zh' ? 'คลังเอกสาร' : 'คลังเอกสาร'}</h2>

            {/* Toolbar: Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
              
              {/* Search Bar */}
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3] group-focus-within:text-[#111111] transition-colors" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={locale === 'en' ? 'ค้นหาตามรหัสเอกสาร หรือ ชื่อลูกค้า...' : locale === 'zh' ? 'ค้นหาตามรหัสเอกสาร หรือ ชื่อลูกค้า...' : 'ค้นหาตามรหัสเอกสาร หรือ ชื่อลูกค้า...'}
                  className="w-full bg-white border border-[#E5E5E5] pl-12 pr-4 py-4 text-sm font-light focus:outline-none focus:border-[#111111] transition-colors placeholder:text-[#A3A3A3] rounded-none"
                />
              </div>

              {/* Filters & View Toggle */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                <div className="flex border border-[#E5E5E5] bg-white p-1">
                  {filters.map(filter => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-3 py-2 text-[10px] font-bold tracking-[0.1em] whitespace-nowrap transition-colors ${
                        activeFilter === filter 
                          ? 'bg-[#111111] text-white' 
                          : 'text-[#666666] hover:bg-[#FAFAFA] hover:text-[#111111]'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="hidden md:flex border border-[#E5E5E5] bg-white p-1 shrink-0">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[#E5E5E5] text-[#111111]' : 'text-[#A3A3A3] hover:text-[#111111]'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-[#E5E5E5] text-[#111111]' : 'text-[#A3A3A3] hover:text-[#111111]'}`}
                  >
                    <ListIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

            <div className="min-h-[400px]">
              {loading ? (
                 <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p>{locale === 'en' ? 'กำลังโหลดเอกสาร...' : locale === 'zh' ? 'กำลังโหลดเอกสาร...' : 'กำลังโหลดเอกสาร...'}</p>
                 </div>
              ) : error ? (
                <div className="py-20 text-center text-red-500">{error}</div>
              ) : filteredDocs.length === 0 ? (
                <div className="py-20 text-center text-gray-400 font-light">
                    {locale === 'en' ? '                     ไม่พบเอกสารตามเงื่อนไขที่กำหนด                 ' : locale === 'zh' ? '                     ไม่พบเอกสารตามเงื่อนไขที่กำหนด                 ' : '                     ไม่พบเอกสารตามเงื่อนไขที่กำหนด                 '}</div>
              ) : viewMode === 'list' ? (
                <div className="border border-[#E5E5E5] bg-white">
                  <div className="hidden md:grid grid-cols-[160px_1fr_150px_160px_320px] items-center px-4 py-3 border-b border-[#E5E5E5] text-[10px] font-bold tracking-[0.14em] text-[#666666] uppercase">
                    <span>{locale === 'en' ? 'ประเภท' : locale === 'zh' ? 'ประเภท' : 'ประเภท'}</span>
                    <span>{locale === 'en' ? 'เอกสาร' : locale === 'zh' ? 'เอกสาร' : 'เอกสาร'}</span>
                    <span>{locale === 'en' ? 'วันที่สร้าง' : locale === 'zh' ? 'วันที่สร้าง' : 'วันที่สร้าง'}</span>
                    <span className="text-right">{locale === 'en' ? 'information' : locale === 'zh' ? '信息' : 'ข้อมูล'}</span>
                    <span className="text-right">{locale === 'en' ? 'จัดการ' : locale === 'zh' ? 'จัดการ' : 'จัดการ'}</span>
                  </div>

                  <div className="divide-y divide-[#EFEFEF]">
                    {groupedDocs.map((group) => (
                      <div key={`group-${group.rootId}`}>
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.rootId)}
                          className="w-full px-4 py-3 bg-[#FAFAFA] border-b border-[#EFEFEF] hover:bg-[#F5F5F5] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3 text-left">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-[#666666] uppercase">
                                {expandedGroupIds.includes(group.rootId) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                <span className="truncate">{group.customerName} • {group.documentNo}</span>
                              </div>
                              <div className="mt-1 text-[11px] text-[#666666]">{getGroupFlowSummary(group)}</div>
                            </div>
                            <span className={`shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] border ${
                              group.completedByReceipt
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-[#666666] border-[#D4D4D4]'
                            }`}>
                              {group.completedByReceipt ? 'เสร็จสิ้น' : 'รอดำเนินการ'}
                            </span>
                          </div>
                        </button>
                        {expandedGroupIds.includes(group.rootId) && group.docs.map((doc) => {
                            const { locale } = useI18n();
                      const nextAction = getNextDocumentAction(doc)
                      const plantAction = getPlantMaterialAction(doc)
                      const contractAction = getContractAction(doc)
                      const documentHref = `/dashboard/admin/documents/create-manual?edit=${doc.id}`
                          const invoiceDownloadMeta = getInvoiceDownloadMeta(doc)
                          const invoiceInstallmentLabel = invoiceDownloadMeta.summaryText
                            const invoiceInstallmentDownload = getInvoiceInstallmentDownloadOptions(doc)
                      const deleting = deletingId === doc.id
                      const downloading = downloadingId === doc.id
                      const deleteBlocked = isDeleteBlocked(doc)

                      return (
                        <div key={doc.id} className="px-4 py-3 md:py-2.5 hover:bg-[#FCFCFC] transition-colors">
                          <div className="hidden md:grid grid-cols-[160px_1fr_150px_160px_320px] items-center gap-3">
                            <span className={`w-fit text-[10px] font-bold tracking-[0.15em] px-2 py-1 uppercase border ${getDocToneClass(doc.type)}`}>
                              {getTypeLabel(doc)}
                            </span>

                            <div className="min-w-0">
                              <Link href={documentHref} className="text-sm font-medium text-[#111111] hover:underline truncate block">
                                {doc.document_code || doc.id?.slice(0, 8)}
                              </Link>
                              {doc.type === 'invoice' && invoiceInstallmentLabel && (
                                <p className="text-[10px] font-bold text-indigo-600 truncate">{invoiceInstallmentLabel}</p>
                              )}
                              <p className="text-xs text-[#666666] truncate">{getCustomerName(doc)}</p>
                            </div>

                            <span className="text-xs text-[#666666]">{formatDate(doc.created_at)}</span>
                            <span className="text-sm font-medium text-[#111111] text-right">{getDocumentAmountDisplay(doc)}</span>

                            <div className="flex items-center justify-end gap-1.5">
                              {nextAction && (
                                nextAction.disabled ? (
                                  <span
                                    title={nextAction.reason || undefined}
                                    className="inline-flex items-center gap-1.5 border border-[#E5E5E5] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#A3A3A3] cursor-not-allowed"
                                  >
                                    <FilePlus2 className="w-3.5 h-3.5" /> {nextAction.label}
                                  </span>
                                ) : doc.type === 'quotation' ? (
                                  <div className="relative inline-flex items-center">
                                    <select
                                      defaultValue=""
                                      onChange={(e) => {
                                        if (!e.target.value) return
                                        const baseHref = `/dashboard/admin/documents/create-manual?type=invoice&sourceDocId=${doc.id}`
                                        if (e.target.value === 'issue_full') {
                                          window.location.href = `${baseHref}&paymentPlan=full`
                                        } else if (e.target.value === 'issue_installments') {
                                          window.location.href = `${baseHref}&paymentPlan=installments`
                                        }
                                        e.currentTarget.value = ''
                                      }}
                                      className="appearance-none xyl-doc-invoice-solid border px-2.5 py-1.5 pr-7 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors"
                                    >
                                      <option value="" disabled>{locale === 'en' ? 'Create an invoice' : locale === 'zh' ? '创建发票' : 'สร้างใบแจ้งหนี้'}</option>
                                      <option value="issue_full" disabled={(sourceDocumentMap.invoiceCountBySourceId.get(doc.id) || 0) > 0}>{locale === 'en' ? 'สร้างใบแจ้งหนี้ (ชำระเต็ม)' : locale === 'zh' ? 'สร้างใบแจ้งหนี้ (ชำระเต็ม)' : 'สร้างใบแจ้งหนี้ (ชำระเต็ม)'}</option>
                                      <option
                                        value="issue_installments"
                                        disabled={(sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0) > 0
                                          ? (sourceDocumentMap.invoiceCountBySourceId.get(doc.id) || 0) >= (sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0)
                                          : (sourceDocumentMap.invoiceCountBySourceId.get(doc.id) || 0) > 0}
                                      >
                                        {(sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0) > 0
                                          ? `สร้างใบแจ้งหนี้ (งวด ${Math.min((sourceDocumentMap.invoiceCountBySourceId.get(doc.id) || 0) + 1, (sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0))}/${sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0})`
                                          : 'สร้างใบแจ้งหนี้ (แบ่งงวด)'}
                                      </option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <Link href={nextAction.href} className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors ${getCreateActionToneClass(nextAction.label)}`}>
                                    <FilePlus2 className="w-3.5 h-3.5" /> {nextAction.label}
                                  </Link>
                                )
                              )}

                              {plantAction && (
                                <Link href={plantAction.href} className="inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors xyl-doc-plant-solid">
                                  <FilePlus2 className="w-3.5 h-3.5" /> {plantAction.label}
                                </Link>
                              )}

                              {contractAction && (
                                <Link href={contractAction.href} className="inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors xyl-doc-contract-solid">
                                  <FilePlus2 className="w-3.5 h-3.5" /> {contractAction.label}
                                </Link>
                              )}

                              {doc.type === 'invoice' && invoiceInstallmentDownload.isCompleted && invoiceInstallmentDownload.options.length > 0 ? (
                                <div className="relative inline-flex items-center">
                                  <Download className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666666]" />
                                  <select
                                    defaultValue=""
                                    onChange={(e) => {
                                      const value = e.target.value
                                      if (!value) return
                                      void handleDownloadDocument(doc, value)
                                      e.currentTarget.value = ''
                                    }}
                                    disabled={downloading}
                                    className="appearance-none bg-white border border-[#E5E5E5] pl-7 pr-6 py-1.5 text-[10px] font-bold tracking-[0.08em] text-[#666666] hover:border-[#111111] hover:text-[#111111] transition-colors disabled:opacity-50"
                                    aria-label={invoiceDownloadMeta.ariaLabel}
                                    title={invoiceDownloadMeta.title}
                                  >
                                    <option value="">{locale === 'en' ? 'ดาวน์โหลดงวด' : locale === 'zh' ? 'ดาวน์โหลดงวด' : 'ดาวน์โหลดงวด'}</option>
                                    {invoiceInstallmentDownload.options.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.label} {locale === 'en' ? ' • ฿' : locale === 'zh' ? ' • ฿' : ' • ฿'}{formatCurrency(Number(item.amount) || 0)}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9CA3AF]" />
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleDownloadDocument(doc)}
                                  disabled={downloading}
                                  className="inline-flex items-center justify-center border border-[#E5E5E5] w-7 h-7 text-[#666666] hover:border-[#111111] hover:text-[#111111] transition-colors disabled:opacity-50"
                                  aria-label={doc.type === 'invoice' ? invoiceDownloadMeta.ariaLabel : 'ดาวน์โหลดเอกสาร'}
                                  title={doc.type === 'invoice' ? invoiceDownloadMeta.title : 'ดาวน์โหลดเอกสาร'}
                                >
                                  {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteDocument(doc)}
                                disabled={deleting || deleteBlocked}
                                title={deleteBlocked ? 'ลบไม่ได้: มีเอกสารอ้างอิง' : undefined}
                                className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors disabled:opacity-50 ${
                                  deleteBlocked
                                    ? 'border-[#EFEFEF] text-[#B0B0B0]'
                                    : 'border-[#E5E5E5] text-[#666666] hover:border-red-300 hover:text-red-600'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> {deleting ? 'กำลังลบ' : deleteBlocked ? 'ลบไม่ได้' : 'ลบ'}
                              </button>
                            </div>
                          </div>

                          <div className="md:hidden space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <span className={`text-[9px] font-bold tracking-[0.15em] px-2 py-1 uppercase border ${getDocToneClass(doc.type)}`}>
                                {getTypeLabel(doc)}
                              </span>
                              <span className="text-[11px] text-[#666666]">{formatDate(doc.created_at)}</span>
                            </div>

                            <Link href={documentHref} className="block">
                              <p className="text-sm font-medium text-[#111111] truncate">{doc.document_code || doc.id?.slice(0, 8)}</p>
                              {doc.type === 'invoice' && invoiceInstallmentLabel && (
                                <p className="text-[10px] font-bold text-indigo-600 truncate">{invoiceInstallmentLabel}</p>
                              )}
                              <p className="text-xs text-[#666666] truncate">{getCustomerName(doc)}</p>
                            </Link>

                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-[#666666]">{locale === 'en' ? 'information' : locale === 'zh' ? '信息' : 'ข้อมูล'}</span>
                              <span className="text-sm font-medium text-[#111111]">{getDocumentAmountDisplay(doc)}</span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {nextAction && (
                                nextAction.disabled ? (
                                  <span
                                    title={nextAction.reason || undefined}
                                    className="border border-[#E5E5E5] px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[#A3A3A3]"
                                  >
                                    {nextAction.label}
                                  </span>
                                ) : doc.type === 'quotation' ? (
                                  <div className="relative inline-block">
                                    <select
                                      defaultValue=""
                                      onChange={(e) => {
                                        if (!e.target.value) return
                                        const baseHref = `/dashboard/admin/documents/create-manual?type=invoice&sourceDocId=${doc.id}`
                                        if (e.target.value === 'issue_full') {
                                          window.location.href = `${baseHref}&paymentPlan=full`
                                        } else if (e.target.value === 'issue_installments') {
                                          window.location.href = `${baseHref}&paymentPlan=installments`
                                        }
                                        e.currentTarget.value = ''
                                      }}
                                      className="appearance-none xyl-doc-invoice-solid border px-2.5 py-2 pr-7 text-center text-[10px] font-bold uppercase tracking-[0.08em]"
                                    >
                                      <option value="" disabled>{locale === 'en' ? 'Create an invoice' : locale === 'zh' ? '创建发票' : 'สร้างใบแจ้งหนี้'}</option>
                                      <option value="issue_full" disabled={(sourceDocumentMap.invoiceCountBySourceId.get(doc.id) || 0) > 0}>{locale === 'en' ? 'สร้างใบแจ้งหนี้ (ชำระเต็ม)' : locale === 'zh' ? 'สร้างใบแจ้งหนี้ (ชำระเต็ม)' : 'สร้างใบแจ้งหนี้ (ชำระเต็ม)'}</option>
                                      <option
                                        value="issue_installments"
                                        disabled={(sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0) > 0
                                          ? (sourceDocumentMap.invoiceCountBySourceId.get(doc.id) || 0) >= (sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0)
                                          : (sourceDocumentMap.invoiceCountBySourceId.get(doc.id) || 0) > 0}
                                      >
                                        {(sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0) > 0
                                          ? `สร้างใบแจ้งหนี้ (งวด ${Math.min((sourceDocumentMap.invoiceCountBySourceId.get(doc.id) || 0) + 1, (sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0))}/${sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0})`
                                          : 'สร้างใบแจ้งหนี้ (แบ่งงวด)'}
                                      </option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <Link href={nextAction.href} className={`border px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] ${getCreateActionToneClass(nextAction.label)}`}>
                                    {nextAction.label}
                                  </Link>
                                )
                              )}
                              {plantAction && (
                                <Link href={plantAction.href} className="border px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] xyl-doc-plant-solid">
                                  Plant
                                </Link>
                              )}
                              {contractAction && (
                                <Link href={contractAction.href} className="border px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] xyl-doc-contract-solid">
                                  {locale === 'en' ? 'contract' : locale === 'zh' ? '合同' : '                                   สัญญา                                 '}</Link>
                              )}
                              {doc.type === 'invoice' && invoiceInstallmentDownload.isCompleted && invoiceInstallmentDownload.options.length > 0 ? (
                                <div className="relative inline-block">
                                  <Download className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666666]" />
                                  <select
                                    defaultValue=""
                                    onChange={(e) => {
                                      const value = e.target.value
                                      if (!value) return
                                      void handleDownloadDocument(doc, value, { includeCopy: true })
                                      e.currentTarget.value = ''
                                    }}
                                    disabled={downloading}
                                    className="appearance-none border border-[#E5E5E5] pl-8 pr-7 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[#666666] disabled:opacity-50"
                                    aria-label={invoiceDownloadMeta.ariaLabel}
                                    title={invoiceDownloadMeta.title}
                                  >
                                    <option value="">{locale === 'en' ? 'ดาวน์โหลดงวด' : locale === 'zh' ? 'ดาวน์โหลดงวด' : 'ดาวน์โหลดงวด'}</option>
                                    {invoiceInstallmentDownload.options.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.label} {locale === 'en' ? ' • ฿' : locale === 'zh' ? ' • ฿' : ' • ฿'}{formatCurrency(Number(item.amount) || 0)}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
                                </div>
                              ) : (
                                <div className="relative inline-block">
                                  <button
                                    disabled={downloading}
                                    className="inline-flex items-center justify-center border border-[#E5E5E5] w-8 h-8 text-[#666666] disabled:opacity-50"
                                    aria-label={locale === 'en' ? 'ดาวน์โหลดเอกสาร' : locale === 'zh' ? 'ดาวน์โหลดเอกสาร' : 'ดาวน์โหลดเอกสาร'}
                                    title={locale === 'en' ? 'ดาวน์โหลดเอกสาร' : locale === 'zh' ? 'ดาวน์โหลดเอกสาร' : 'ดาวน์โหลดเอกสาร'}
                                  >
                                    {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                  </button>
                                  <select
                                    defaultValue=""
                                    onChange={(e) => {
                                      const v = e.target.value
                                      if (!v) return
                                      const opts = {
                                        includeCopy: v === 'all',
                                        isCopy: v === 'copy'
                                      }
                                      void handleDownloadDocument(doc, undefined, opts)
                                      e.target.value = ''
                                    }}
                                    disabled={downloading}
                                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                  >
                                    <option value="" disabled>{locale === 'en' ? 'Choose a format' : locale === 'zh' ? '选择格式' : 'เลือกรูปแบบ'}</option>
                                    <option value="all">{locale === 'en' ? 'Original + copy' : locale === 'zh' ? '原件+复印件' : 'ตัวจริง + สำเนา'}</option>
                                    <option value="original">{locale === 'en' ? 'Only the real one' : locale === 'zh' ? '只有真品' : 'ตัวจริงเท่านั้น'}</option>
                                    <option value="copy">{locale === 'en' ? 'Copy only' : locale === 'zh' ? '仅复制' : 'สำเนาเท่านั้น'}</option>
                                  </select>
                                </div>
                              )}
                              <button
                                onClick={() => handleDeleteDocument(doc)}
                                disabled={deleting || deleteBlocked}
                                title={deleteBlocked ? 'ลบไม่ได้: มีเอกสารอ้างอิง' : undefined}
                                className={`border px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] disabled:opacity-50 ${
                                  deleteBlocked
                                    ? 'border-[#EFEFEF] text-[#B0B0B0]'
                                    : 'border-[#E5E5E5] text-[#666666]'
                                }`}
                              >
                                {deleting ? 'กำลังลบ' : deleteBlocked ? 'ลบไม่ได้' : 'ลบ'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {groupedDocs.map((group) => (
                    <div key={`grid-group-${group.rootId}`} className="border border-[#E5E5E5] bg-white">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.rootId)}
                        className="w-full px-4 py-3 bg-[#FAFAFA] border-b border-[#EFEFEF] hover:bg-[#F5F5F5] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3 text-left">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] text-[#666666] uppercase">
                              {expandedGroupIds.includes(group.rootId) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              <span className="truncate">{group.customerName} • {group.documentNo}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-[#666666]">{getGroupFlowSummary(group)}</div>
                          </div>
                          <span className={`shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] border ${
                            group.completedByReceipt
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-[#666666] border-[#D4D4D4]'
                          }`}>
                            {group.completedByReceipt ? 'เสร็จสิ้น' : 'รอดำเนินการ'}
                          </span>
                        </div>
                      </button>

                      {expandedGroupIds.includes(group.rootId) && (
                        <div className="divide-y divide-[#EFEFEF]">
                          {group.docs.map((doc) => {
                              const { locale } = useI18n();
                            const nextAction = getNextDocumentAction(doc)
                            const plantAction = getPlantMaterialAction(doc)
                            const contractAction = getContractAction(doc)
                            const documentHref = `/dashboard/admin/documents/create-manual?edit=${doc.id}`
                            const invoiceDownloadMeta = getInvoiceDownloadMeta(doc)
                            const invoiceInstallmentLabel = invoiceDownloadMeta.summaryText
                            const invoiceInstallmentDownload = getInvoiceInstallmentDownloadOptions(doc)
                            const deleting = deletingId === doc.id
                            const downloading = downloadingId === doc.id
                            const deleteBlocked = isDeleteBlocked(doc)

                            return (
                              <div key={`grid-doc-${doc.id}`} className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <span className={`text-[9px] font-bold tracking-[0.15em] px-2 py-1 uppercase border ${
                                    doc.type === 'receipt' ? 'bg-[#111111] text-white border-[#111111]' :
                                    doc.type === 'invoice' ? 'bg-transparent text-[#111111] border-[#111111]' :
                                    'bg-transparent text-[#666666] border-[#E5E5E5]'
                                  }`}>
                                    {getTypeLabel(doc)}
                                  </span>
                                  <span className="text-[11px] text-[#666666]">{formatDate(doc.created_at)}</span>
                                </div>

                                <Link href={documentHref} className="block">
                                  <p className="text-sm font-medium text-[#111111] truncate">{doc.document_code || doc.id?.slice(0, 8)}</p>
                                  {doc.type === 'invoice' && invoiceInstallmentLabel && (
                                    <p className="text-[10px] font-bold text-indigo-600 truncate">{invoiceInstallmentLabel}</p>
                                  )}
                                  <p className="text-xs text-[#666666] truncate">{getCustomerName(doc)}</p>
                                </Link>

                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-[#666666]">{locale === 'en' ? 'information' : locale === 'zh' ? '信息' : 'ข้อมูล'}</span>
                                  <span className="text-sm font-medium text-[#111111]">{getDocumentAmountDisplay(doc)}</span>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  {nextAction && (
                                    nextAction.disabled ? (
                                      <span
                                        title={nextAction.reason || undefined}
                                        className="border border-[#E5E5E5] px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[#A3A3A3]"
                                      >
                                        {nextAction.label}
                                      </span>
                                    ) : doc.type === 'quotation' ? (
                                      <div className="relative inline-block">
                                        <select
                                          defaultValue=""
                                          onChange={(e) => {
                                            if (!e.target.value) return
                                            const baseHref = `/dashboard/admin/documents/create-manual?type=invoice&sourceDocId=${doc.id}`
                                            if (e.target.value === 'issue_full') {
                                              window.location.href = `${baseHref}&paymentPlan=full`
                                            } else if (e.target.value === 'issue_installments') {
                                              window.location.href = `${baseHref}&paymentPlan=installments`
                                            }
                                            e.currentTarget.value = ''
                                          }}
                                          className="appearance-none xyl-doc-invoice-solid border px-2.5 py-2 pr-7 text-center text-[10px] font-bold uppercase tracking-[0.08em]"
                                        >
                                          <option value="" disabled>{locale === 'en' ? 'Create an invoice' : locale === 'zh' ? '创建发票' : 'สร้างใบแจ้งหนี้'}</option>
                                          <option value="issue_full" disabled={(sourceDocumentMap.invoiceCountBySourceId.get(doc.id) || 0) > 0}>{locale === 'en' ? 'สร้างใบแจ้งหนี้ (ชำระเต็ม)' : locale === 'zh' ? 'สร้างใบแจ้งหนี้ (ชำระเต็ม)' : 'สร้างใบแจ้งหนี้ (ชำระเต็ม)'}</option>
                                          <option
                                            value="issue_installments"
                                            disabled={(sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0) > 0
                                              ? (sourceDocumentMap.invoiceCountBySourceId.get(doc.id) || 0) >= (sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0)
                                              : (sourceDocumentMap.invoiceCountBySourceId.get(doc.id) || 0) > 0}
                                          >
                                            {(sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0) > 0
                                              ? `สร้างใบแจ้งหนี้ (งวด ${Math.min((sourceDocumentMap.invoiceCountBySourceId.get(doc.id) || 0) + 1, (sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0))}/${sourceDocumentMap.installmentCountByQuotationId.get(doc.id) || 0})`
                                              : 'สร้างใบแจ้งหนี้ (แบ่งงวด)'}
                                          </option>
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
                                      </div>
                                    ) : (
                                      <Link href={nextAction.href} className={`border px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] ${getCreateActionToneClass(nextAction.label)}`}>
                                        {nextAction.label}
                                      </Link>
                                    )
                                  )}
                                  {plantAction && (
                                    <Link href={plantAction.href} className="border px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] xyl-doc-plant-solid">
                                      Plant
                                    </Link>
                                  )}
                                  {contractAction && (
                                    <Link href={contractAction.href} className="border px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] xyl-doc-contract-solid">
                                      {locale === 'en' ? 'contract' : locale === 'zh' ? '合同' : '                                       สัญญา                                     '}</Link>
                                  )}
                                  {doc.type === 'invoice' && invoiceInstallmentDownload.isCompleted && invoiceInstallmentDownload.options.length > 0 ? (
                                    <div className="relative inline-block">
                                      <Download className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666666]" />
                                      <select
                                        defaultValue=""
                                        onChange={(e) => {
                                          const value = e.target.value
                                          if (!value) return
                                          void handleDownloadDocument(doc, value, { includeCopy: true })
                                          e.currentTarget.value = ''
                                        }}
                                        disabled={downloading}
                                        className="appearance-none border border-[#E5E5E5] pl-8 pr-7 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[#666666] disabled:opacity-50"
                                        aria-label={invoiceDownloadMeta.ariaLabel}
                                        title={invoiceDownloadMeta.title}
                                      >
                                        <option value="">{locale === 'en' ? 'ดาวน์โหลดงวด' : locale === 'zh' ? 'ดาวน์โหลดงวด' : 'ดาวน์โหลดงวด'}</option>
                                        {invoiceInstallmentDownload.options.map((item) => (
                                          <option key={item.id} value={item.id}>
                                            {item.label} {locale === 'en' ? ' • ฿' : locale === 'zh' ? ' • ฿' : ' • ฿'}{formatCurrency(Number(item.amount) || 0)}
                                          </option>
                                        ))}
                                      </select>
                                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
                                    </div>
                                  ) : (
                                    <div className="relative inline-block">
                                      <button
                                        disabled={downloading}
                                        className="inline-flex items-center justify-center border border-[#E5E5E5] w-8 h-8 text-[#666666] disabled:opacity-50"
                                        aria-label={locale === 'en' ? 'ดาวน์โหลดเอกสาร' : locale === 'zh' ? 'ดาวน์โหลดเอกสาร' : 'ดาวน์โหลดเอกสาร'}
                                        title={locale === 'en' ? 'ดาวน์โหลดเอกสาร' : locale === 'zh' ? 'ดาวน์โหลดเอกสาร' : 'ดาวน์โหลดเอกสาร'}
                                      >
                                        {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                      </button>
                                      <select
                                        defaultValue=""
                                        onChange={(e) => {
                                          const v = e.target.value
                                          if (!v) return
                                          const opts = {
                                            includeCopy: v === 'all',
                                            isCopy: v === 'copy'
                                          }
                                          void handleDownloadDocument(doc, undefined, opts)
                                          e.target.value = ''
                                        }}
                                        disabled={downloading}
                                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                      >
                                        <option value="" disabled>{locale === 'en' ? 'Choose a format' : locale === 'zh' ? '选择格式' : 'เลือกรูปแบบ'}</option>
                                        <option value="all">{locale === 'en' ? 'Original + copy' : locale === 'zh' ? '原件+复印件' : 'ตัวจริง + สำเนา'}</option>
                                        <option value="original">{locale === 'en' ? 'Only the real one' : locale === 'zh' ? '只有真品' : 'ตัวจริงเท่านั้น'}</option>
                                        <option value="copy">{locale === 'en' ? 'Copy only' : locale === 'zh' ? '仅复制' : 'สำเนาเท่านั้น'}</option>
                                      </select>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => handleDeleteDocument(doc)}
                                    disabled={deleting || deleteBlocked}
                                    title={deleteBlocked ? 'ลบไม่ได้: มีเอกสารอ้างอิง' : undefined}
                                    className={`border px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] disabled:opacity-50 ${
                                      deleteBlocked
                                        ? 'border-[#EFEFEF] text-[#B0B0B0]'
                                        : 'border-[#E5E5E5] text-[#666666]'
                                    }`}
                                  >
                                    {deleting ? 'กำลังลบ' : deleteBlocked ? 'ลบไม่ได้' : 'ลบ'}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </section>

        </main>
      </div>

    </div>
  )
}
