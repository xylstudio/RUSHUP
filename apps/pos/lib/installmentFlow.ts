export type FlowDocumentLike = {
  id?: string
  type?: string | null
  status?: string | null
  total?: number | null
  description?: string | null
  source_document_id?: string | null
}

type ManualPayload = Record<string, any>

const asString = (value: any) => String(value || '').trim()

export const parseManualPayload = (raw: any): ManualPayload | null => {
  if (!raw || typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed?.kind === 'manual_document' ? parsed : null
  } catch {
    return null
  }
}

export const resolveSourceDocumentId = (doc: FlowDocumentLike): string => {
  if (doc?.source_document_id) return String(doc.source_document_id)
  const payload = parseManualPayload(doc?.description)
  return asString(payload?.source_document_id)
}

export const getInstallmentPlan = (quotationDoc: FlowDocumentLike) => {
  const payload = parseManualPayload(quotationDoc?.description)
  const installments = Array.isArray(payload?.installments) ? payload.installments : []

  const installmentIds: string[] = []
  const labelsById = new Map<string, string>()

  installments.forEach((item: any, idx: number) => {
    const id = asString(item?.id) || `inst-${idx + 1}`
    const label = asString(item?.label) || `งวดที่ ${idx + 1}`
    installmentIds.push(id)
    labelsById.set(id, label)
  })

  return {
    installmentIds,
    labelsById,
    isInstallmentFlow: installmentIds.length > 0,
  }
}

export const getInvoiceInstallmentId = (invoiceDoc: FlowDocumentLike): string => {
  const payload = parseManualPayload(invoiceDoc?.description)
  return asString(payload?.current_installment_id)
}

const getInvoicePaidInstallmentIds = (invoiceDoc: FlowDocumentLike): string[] => {
  const payload = parseManualPayload(invoiceDoc?.description)
  if (!Array.isArray(payload?.paid_installment_ids)) return []
  return payload.paid_installment_ids.map((id: any) => asString(id)).filter(Boolean)
}

const getReceiptAppliedInstallmentIds = (receiptDoc: FlowDocumentLike): string[] => {
  const payload = parseManualPayload(receiptDoc?.description)
  if (!Array.isArray(payload?.applied_installment_ids)) return []
  return payload.applied_installment_ids.map((id: any) => asString(id)).filter(Boolean)
}

export const buildQuotationInstallmentProgress = (quotationDoc: FlowDocumentLike, allDocs: FlowDocumentLike[]) => {
  const { installmentIds, labelsById, isInstallmentFlow } = getInstallmentPlan(quotationDoc)
  const quotationId = asString(quotationDoc?.id)

  const invoiceDocs = allDocs.filter((doc) => doc?.type === 'invoice' && resolveSourceDocumentId(doc) === quotationId)
  const invoiceById = new Map(invoiceDocs.map((doc) => [asString(doc.id), doc]))

  const issuedInstallmentIdSet = new Set<string>()
  invoiceDocs.forEach((invoice) => {
    const installmentId = getInvoiceInstallmentId(invoice)
    if (installmentId) issuedInstallmentIdSet.add(installmentId)
  })

  if (isInstallmentFlow && issuedInstallmentIdSet.size === 0) {
    invoiceDocs.slice(0, installmentIds.length).forEach((_, idx) => {
      const id = installmentIds[idx]
      if (id) issuedInstallmentIdSet.add(id)
    })
  }

  const receiptDocs = allDocs.filter((doc) => {
    if (doc?.type !== 'receipt') return false
    const invoiceId = resolveSourceDocumentId(doc)
    return invoiceById.has(invoiceId)
  })

  const paidInstallmentIdSet = new Set<string>()
  let hasInstallmentMarkers = false

  invoiceDocs.forEach((invoice) => {
    const paidIds = getInvoicePaidInstallmentIds(invoice)
    if (paidIds.length > 0) {
      hasInstallmentMarkers = true
      paidIds.forEach((id) => paidInstallmentIdSet.add(id))
    }
  })

  receiptDocs.forEach((receipt) => {
    const sourceInvoiceId = resolveSourceDocumentId(receipt)
    const sourceInvoice = invoiceById.get(sourceInvoiceId)
    const invoiceInstallmentId = sourceInvoice ? getInvoiceInstallmentId(sourceInvoice) : ''
    if (invoiceInstallmentId) {
      hasInstallmentMarkers = true
      paidInstallmentIdSet.add(invoiceInstallmentId)
    }

    const appliedIds = getReceiptAppliedInstallmentIds(receipt)
    if (appliedIds.length > 0) {
      hasInstallmentMarkers = true
      appliedIds.forEach((id) => paidInstallmentIdSet.add(id))
    }
  })

  if (isInstallmentFlow && !hasInstallmentMarkers) {
    receiptDocs.slice(0, installmentIds.length).forEach((_, idx) => {
      const id = installmentIds[idx]
      if (id) paidInstallmentIdSet.add(id)
    })
  }

  const issuedCount = isInstallmentFlow
    ? installmentIds.filter((id) => issuedInstallmentIdSet.has(id)).length
    : invoiceDocs.length

  const paidCount = isInstallmentFlow
    ? installmentIds.filter((id) => paidInstallmentIdSet.has(id)).length
    : receiptDocs.length

  return {
    quotationId,
    isInstallmentFlow,
    totalInstallments: installmentIds.length,
    installmentIds,
    labelsById,
    invoiceDocs,
    receiptDocs,
    issuedInstallmentIdSet,
    paidInstallmentIdSet,
    issuedCount,
    paidCount,
    isFullyPaid: isInstallmentFlow
      ? installmentIds.every((id) => paidInstallmentIdSet.has(id))
      : receiptDocs.length > 0,
  }
}

export const getReceiptGateForInvoice = (invoiceDoc: FlowDocumentLike, allDocs: FlowDocumentLike[]) => {
  const invoiceId = asString(invoiceDoc?.id)
  if (!invoiceId) {
    return { allowed: false, reason: 'ไม่พบข้อมูลใบแจ้งหนี้อ้างอิง', progress: null as any }
  }

  const existingReceipt = allDocs.some((doc) => doc?.type === 'receipt' && resolveSourceDocumentId(doc) === invoiceId)
  if (existingReceipt) {
    return { allowed: false, reason: 'ใบแจ้งหนี้นี้มีใบเสร็จแล้ว', progress: null as any }
  }

  const quotationId = resolveSourceDocumentId(invoiceDoc)
  const quotationDoc = allDocs.find((doc) => asString(doc?.id) === quotationId && doc?.type === 'quotation')

  const invoicePayload = parseManualPayload(invoiceDoc?.description)
  const invoiceInstallments = Array.isArray(invoicePayload?.installments) ? invoicePayload.installments : []

  const invoiceTotal = Number(invoicePayload?.total ?? invoiceDoc?.total ?? 0)
  const invoicePaidAmount = Number(invoicePayload?.paid_amount ?? 0)
  const invoiceStatus = asString(invoiceDoc?.status).toLowerCase()
  const invoiceFullyPaid = invoiceStatus === 'paid' || (invoiceTotal > 0 && invoicePaidAmount >= invoiceTotal - 0.01)

  if (!quotationDoc) {
    if (invoiceInstallments.length > 0 && !invoiceFullyPaid) {
      return {
        allowed: false,
        reason: 'ใบแจ้งหนี้นี้เป็นแบบแบ่งงวด ต้องชำระครบก่อนจึงจะสร้างใบเสร็จได้',
        progress: null as any,
      }
    }

    return { allowed: true, reason: '', progress: null as any }
  }

  const progress = buildQuotationInstallmentProgress(quotationDoc, allDocs)
  if (!progress.isInstallmentFlow) {
    if (invoiceInstallments.length > 0 && !invoiceFullyPaid) {
      return {
        allowed: false,
        reason: 'ใบแจ้งหนี้นี้เป็นแบบแบ่งงวด ต้องชำระครบก่อนจึงจะสร้างใบเสร็จได้',
        progress,
      }
    }

    return { allowed: true, reason: '', progress }
  }

  const missingIds = progress.installmentIds.filter((id) => !progress.paidInstallmentIdSet.has(id))
  if (missingIds.length === 0) {
    return { allowed: true, reason: '', progress }
  }

  const missingLabels = missingIds.map((id) => progress.labelsById.get(id) || id)
  return {
    allowed: false,
    reason: `ต้องชำระให้ครบทุกงวดก่อน (คงเหลือ: ${missingLabels.join(', ')})`,
    progress,
  }
}
