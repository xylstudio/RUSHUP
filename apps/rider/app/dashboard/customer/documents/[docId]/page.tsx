'use client';
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Printer } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useI18n } from '@/lib/I18nContext'
import { formatCurrencyByLocale, formatDateByLocale } from '@/lib/localeFormat'
import { getDocumentDetails } from '@/lib/supabaseClient'
import { generateDocumentPdfUrl } from '@/lib/documentPdf'

export default function DocumentDetails({ params }: { params: { docId: string } }) {
  const { profile } = useAuth()
  const { locale } = useI18n()
  const copy = {
    th: { notFound: 'ไม่พบเอกสาร', details: 'รายละเอียดเอกสาร', receipt: 'ใบเสร็จ', back: 'กลับ', preparing: 'กำลังเตรียมพรีวิว...', preview: 'พรีวิว PDF / ดาวน์โหลด', loading: 'กำลังโหลด...', noPdf: 'ยังไม่มีไฟล์ PDF', noPdfDesc: 'เอกสารนี้ยังไม่พบไฟล์ PDF จริงในระบบ', document: 'Document', status: 'สถานะ', createdAt: 'สร้างเมื่อ', recipient: 'ผู้รับเอกสาร', dueAt: 'กำหนดชำระ', paidAt: 'วันที่รับชำระ', total: 'ยอดรวม', service: 'บริการ', paymentPlan: 'แผนการชำระเงิน', installmentCount: 'แบ่งชำระ', installment: 'งวดชำระ', noDue: 'ไม่ระบุวันกำหนดชำระ', items: 'รายการ', itemDesc: 'รายละเอียดสินค้า/บริการในเอกสาร', qty: 'จำนวน', netTotal: 'ยอดรวมสุทธิ', notes: 'หมายเหตุ', extraService: 'บริการเพิ่มเติม', serviceFee: 'ค่าบริการ' },
    en: { notFound: 'Document not found', details: 'Document Details', receipt: 'Receipt', back: 'Back', preparing: 'Preparing preview...', preview: 'Preview PDF / Download', loading: 'Loading...', noPdf: 'No PDF file yet', noPdfDesc: 'A real PDF file is not available for this document yet', document: 'Document', status: 'Status', createdAt: 'Created', recipient: 'Recipient', dueAt: 'Due date', paidAt: 'Paid at', total: 'Total', service: 'Service', paymentPlan: 'Payment Plan', installmentCount: 'installments', installment: 'Installment', noDue: 'No due date specified', items: 'Items', itemDesc: 'Products / services listed in this document', qty: 'Qty', netTotal: 'Net Total', notes: 'Notes', extraService: 'Additional Service', serviceFee: 'Service Fee' },
    zh: { notFound: '未找到文件', details: '文件详情', receipt: '收据', back: '返回', preparing: '正在准备预览...', preview: '预览 PDF / 下载', loading: '加载中...', noPdf: '暂无 PDF 文件', noPdfDesc: '系统中暂时没有该文件对应的 PDF', document: '文件', status: '状态', createdAt: '创建时间', recipient: '收件人', dueAt: '到期日', paidAt: '付款日期', total: '总额', service: '服务', paymentPlan: '付款计划', installmentCount: '期分期', installment: '分期', noDue: '未指定到期日', items: '项目', itemDesc: '文件中的商品/服务明细', qty: '数量', netTotal: '净额', notes: '备注', extraService: '附加服务', serviceFee: '服务费' },
  }[locale]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [doc, setDoc] = useState<any | null>(null)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    const run = async () => {
      if (!profile?.id) return
      setLoading(true)
      setError('')
      const { data, error } = await getDocumentDetails(params.docId)
      if (error || !data) {
        setError(error?.message || copy.notFound)
        setDoc(null)
      } else {
        // Any document the user owns should be viewable
        if (data.user_id !== profile.id) {
          setError(copy.notFound)
          setDoc(null)
        } else {
          setDoc(data)
        }
      }
      setLoading(false)
    }

    void run()
  }, [copy.notFound, params.docId, profile?.id])

  const title = useMemo(() => {
    if (!doc) return copy.details
    if (doc.type === 'receipt') return copy.receipt
    if (doc.type === 'quotation') return 'Quotation'
    if (doc.type === 'invoice') return 'Invoice'
    return copy.details
  }, [copy.details, copy.receipt, doc])

  const manual = useMemo(() => {
    const raw = doc?.description
    if (!raw || typeof raw !== 'string') return null
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.kind === 'manual_document') return parsed
      return null
    } catch {
      return null
    }
  }, [doc])

  const resolvedPdfUrl = useMemo(() => {
    const rawUrl = doc?.file_url
    if (!rawUrl || typeof rawUrl !== 'string') return null

    const trimmed = rawUrl.trim()
    if (!trimmed) return null

    try {
      const parsed = new URL(trimmed)
      parsed.searchParams.delete('download')
      parsed.searchParams.delete('dl')
      parsed.searchParams.delete('response-content-disposition')
      return parsed.toString()
    } catch {
      return trimmed
    }
  }, [doc?.file_url])

  useEffect(() => {
    let active = true

    const run = async () => {
      if (resolvedPdfUrl || !doc || error || loading) {
        if (!resolvedPdfUrl) setGeneratedPdfUrl(null)
        return
      }

      setGeneratingPdf(true)
      try {
        const { url } = await generateDocumentPdfUrl(doc)
        if (active) setGeneratedPdfUrl(url)
      } catch {
        if (active) setGeneratedPdfUrl(null)
      } finally {
        if (active) setGeneratingPdf(false)
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [doc, error, loading, resolvedPdfUrl])

  useEffect(() => {
    return () => {
      if (generatedPdfUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(generatedPdfUrl)
      }
    }
  }, [generatedPdfUrl])

  const pdfOpenUrl = useMemo(() => {
    const rawUrl = resolvedPdfUrl
    if (!rawUrl || typeof rawUrl !== 'string') return null

    const [base, rawHash = ''] = rawUrl.split('#')
    const hash = new URLSearchParams(rawHash)
    hash.set('page', '1')
    hash.set('zoom', 'page-fit')
    return `${base}#${hash.toString()}`
  }, [resolvedPdfUrl])

  const activePdfUrl = pdfOpenUrl || resolvedPdfUrl || generatedPdfUrl
  const hasPdfFile = Boolean(activePdfUrl)

  const handlePreviewDownload = () => {
    const rawUrl = activePdfUrl
    if (!rawUrl || typeof rawUrl !== 'string') {
      return
    }

    const printWindow = window.open(pdfOpenUrl || rawUrl, '_blank', 'noopener,noreferrer')
    if (!printWindow) return
    printWindow.focus()
  }

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '-'
    try {
      return formatDateByLocale(iso, locale, { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return iso
    }
  }

  const formatTHB = (amount: number | null | undefined) => {
    const value = typeof amount === 'number' ? amount : 0
    return formatCurrencyByLocale(value, locale)
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900">
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/dashboard/customer/documents"
                className="p-2 rounded-full hover:bg-gray-50 text-gray-500"
                aria-label={copy.back}
              >
                <ChevronLeft size={20} />
              </Link>
              <div className="h-4 w-px bg-gray-200" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{title}</div>
                <div className="text-sm font-semibold text-gray-900 truncate">#{doc?.document_code || doc?.id?.slice?.(0, 8) || params.docId}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePreviewDownload}
              disabled={!hasPdfFile || generatingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={16} /> {generatingPdf ? copy.preparing : copy.preview}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {loading ? <p className="text-gray-500">{copy.loading}</p> : null}
        {!loading && error ? <p className="text-red-600">{error}</p> : null}

        {!loading && doc && !error ? (
          <div className="space-y-8">
            {!hasPdfFile ? (
              <section className="bg-white p-6 rounded-3xl border border-amber-200 shadow-sm">
                <div className="text-lg font-bold text-gray-900">{copy.noPdf}</div>
                <div className="text-sm text-gray-600 mt-1">{copy.noPdfDesc}</div>
              </section>
            ) : null}

            <section className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div>
                  <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{copy.document}</div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-2">{title}</h1>
                  <div className="text-sm text-gray-500 mt-1">
                    #{doc.document_code || doc.id?.slice?.(0, 8)}
                    {doc.status ? <span className="text-gray-300"> • </span> : null}
                    {doc.status ? <span className="text-gray-500">{copy.status}: {doc.status}</span> : null}
                  </div>
                </div>
                <div className="md:text-right">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{copy.createdAt}</div>
                  <div className="text-sm font-semibold text-gray-800">{formatDate(doc.created_at)}</div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                {manual ? (
                  <>
                    <div className="p-5 rounded-2xl border border-gray-100 bg-white">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{copy.recipient}</div>
                      <div className="text-sm font-bold text-gray-900 mt-2">{manual.recipient?.name || '—'}</div>
                      {manual.recipient?.phone ? <div className="text-xs font-semibold text-blue-700 mt-2">{manual.recipient.phone}</div> : null}
                      {manual.recipient?.address ? <div className="text-xs text-gray-500 mt-2 leading-relaxed">{manual.recipient.address}</div> : null}
                      {manual.due_at ? <div className="text-xs text-gray-500 mt-2">{copy.dueAt}: {formatDate(manual.due_at)}</div> : null}
                      {manual.paid_at ? <div className="text-xs text-gray-500 mt-1">{copy.paidAt}: {formatDate(manual.paid_at)}</div> : null}
                    </div>
                    <div className="p-5 rounded-2xl border border-gray-100 bg-white">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{copy.total}</div>
                      <div className="text-3xl font-bold tracking-tight text-gray-900 mt-2">{formatTHB(manual.total)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-5 rounded-2xl border border-gray-100 bg-white">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{copy.service}</div>
                      <div className="text-sm font-bold text-gray-900 mt-2">
                        {doc.orders?.services?.service_name || doc.orders?.services?.service_code || '—'}
                      </div>
                      {doc.orders?.houses?.address ? <div className="text-xs text-gray-500 mt-2 leading-relaxed">{doc.orders.houses.address}</div> : null}
                    </div>
                    <div className="p-5 rounded-2xl border border-gray-100 bg-white">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{copy.total}</div>
                      <div className="text-3xl font-bold tracking-tight text-gray-900 mt-2">{formatTHB(doc.orders?.total)}</div>
                    </div>
                  </>
                )}
              </div>

              {Array.isArray((manual as any)?.installments) && (manual as any).installments.length ? (
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <div className="text-sm font-bold text-gray-900">{copy.paymentPlan}</div>
                  <div className="text-xs text-gray-500 mt-1">{(manual as any).installments.length} {copy.installmentCount}</div>
                  <div className="mt-4 space-y-2">
                    {(manual as any).installments.map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{it.label || copy.installment}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {it.due_at ? `${copy.dueAt}: ${formatDate(it.due_at)}` : copy.noDue}
                            {typeof it.percent === 'number' ? ` • ${it.percent}%` : ''}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-gray-900">{formatTHB(Number(it.amount) || 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-gray-100">
                <div className="text-lg font-bold text-gray-900">{copy.items}</div>
                <div className="text-sm text-gray-500 mt-1">{copy.itemDesc}</div>
              </div>
              <div className="divide-y divide-gray-100">
                {manual ? (
                  <>
                    {(manual.items || []).map((it: any, idx: number) => (
                      <div key={`${idx}-${it.description}`} className="flex items-start justify-between gap-6 p-6">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{it.description}</div>
                          <div className="text-xs text-gray-500 mt-1">{copy.qty} {Number(it.quantity) || 1}</div>
                        </div>
                        <div className="text-sm font-bold text-gray-900 shrink-0">
                          {formatTHB((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}
                        </div>
                      </div>
                    ))}
                    <div className="flex items-end justify-between gap-6 p-6 bg-gray-50">
                      <div className="text-sm font-bold text-gray-900">{copy.netTotal}</div>
                      <div className="text-xl font-bold text-gray-900">{formatTHB(manual.total)}</div>
                    </div>
                    {manual.notes ? (
                      <div className="p-6">
                        <div className="text-sm font-bold text-gray-900">{copy.notes}</div>
                        <div className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{manual.notes}</div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-6 p-6">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {doc.orders?.services?.service_name || 'ค่าบริการ'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{locale === 'en' ? 'Quantity 1' : locale === 'zh' ? '数量 1' : 'จำนวน 1'}</div>
                      </div>
                      <div className="text-sm font-bold text-gray-900 shrink-0">
                        {formatTHB(doc.orders?.calculated_price ?? doc.orders?.base_price ?? doc.orders?.total)}
                      </div>
                    </div>
                    {(doc.orders?.order_additional_services || []).map((item: any) => (
                      <div key={item.id} className="flex items-start justify-between gap-6 p-6">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {item.additional_services?.service_name || copy.extraService}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{copy.qty} {Number(item.quantity) || 1}</div>
                        </div>
                        <div className="text-sm font-bold text-gray-900 shrink-0">{formatTHB(item.total_price ?? item.unit_price)}</div>
                      </div>
                    ))}
                    <div className="flex items-end justify-between gap-6 p-6 bg-gray-50">
                      <div className="text-sm font-bold text-gray-900">{copy.netTotal}</div>
                      <div className="text-xl font-bold text-gray-900">{formatTHB(doc.orders?.total)}</div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  )
}