'use client';
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MessageSquareWarning, Star, RefreshCcw, Inbox } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useI18n } from "@/lib/I18nContext";

type FeedbackType = 'rating' | 'issue'
type SourceType = 'table' | 'audit_logs'
type FilterMode = 'all' | 'rating' | 'issue'

type FeedbackRow = {
  id: string
  order_id: string
  report_id?: string | null
  staff_id?: string | null
  customer_id: string
  feedback_type: FeedbackType
  rating: number | null
  comment_message?: string | null
  issue_message: string | null
  source: string | null
  status: string | null
  created_at: string | null
  updated_at?: string | null
  order_code?: string | null
  report_created_at?: string | null
  customer_name?: string | null
  customer_email?: string | null
  staff_name?: string | null
  storage_source: SourceType
  scope: 'order' | 'report'
}

type AuditFeedbackDetail = {
  order_id?: string
  order_code?: string
  feedback_type?: FeedbackType
  rating?: number | null
  issue_message?: string | null
  source?: string | null
}

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const formatDateTime = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const isMissingRelationError = (message: string) =>
  /customer_order_feedback|relation .* does not exist|could not find the table/i.test(message)

export default function AdminCustomerFeedbackPage() {
    const { locale } = useI18n();
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<FeedbackRow[]>([])
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const feedbackRows: FeedbackRow[] = []
        let tableUnavailable = false

        const tableResult = await supabase
          .from('customer_order_feedback')
          .select('id, order_id, customer_id, feedback_type, rating, comment_message, issue_message, source, status, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(300)

        if (tableResult.error) {
          if (isMissingRelationError(tableResult.error.message || '')) {
            tableUnavailable = true
          } else {
            throw tableResult.error
          }
        } else {
          for (const row of (tableResult.data || []) as Array<Record<string, unknown>>) {
            feedbackRows.push({
              id: String(row.id || crypto.randomUUID()),
              order_id: asText(row.order_id),
              customer_id: asText(row.customer_id),
              feedback_type: asText(row.feedback_type) === 'issue' ? 'issue' : 'rating',
              rating: typeof row.rating === 'number' ? row.rating : row.rating ? Number(row.rating) : null,
              comment_message: asText(row.comment_message) || null,
              issue_message: asText(row.issue_message) || null,
              source: asText(row.source) || null,
              status: asText(row.status) || null,
              created_at: asText(row.created_at) || null,
              updated_at: asText(row.updated_at) || null,
              storage_source: 'table',
              scope: 'order',
            })
          }
        }

        const reportTableResult = await supabase
          .from('work_report_feedback')
          .select('id, report_id, staff_id, order_id, customer_id, feedback_type, rating, comment_message, issue_message, source, status, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(300)

        if (!reportTableResult.error) {
          for (const row of (reportTableResult.data || []) as Array<Record<string, unknown>>) {
            feedbackRows.push({
              id: String(row.id || crypto.randomUUID()),
              report_id: asText(row.report_id) || null,
              staff_id: asText(row.staff_id) || null,
              order_id: asText(row.order_id),
              customer_id: asText(row.customer_id),
              feedback_type: asText(row.feedback_type) === 'issue' ? 'issue' : 'rating',
              rating: typeof row.rating === 'number' ? row.rating : row.rating ? Number(row.rating) : null,
              comment_message: asText(row.comment_message) || null,
              issue_message: asText(row.issue_message) || null,
              source: asText(row.source) || null,
              status: asText(row.status) || null,
              created_at: asText(row.created_at) || null,
              updated_at: asText(row.updated_at) || null,
              storage_source: 'table',
              scope: 'report',
            })
          }
        }

        const auditResult = await supabase
          .from('audit_logs')
          .select('id, user_id, user_email, action, details, created_at')
          .eq('action', 'customer_order_feedback_submitted')
          .order('created_at', { ascending: false })
          .limit(300)

        if (auditResult.error) throw auditResult.error

        const seenFallback = new Set(feedbackRows.map((row) => `${row.order_id}:${row.feedback_type}:${row.created_at}:${row.rating ?? ''}:${row.issue_message ?? ''}`))

        for (const log of (auditResult.data || []) as Array<Record<string, unknown>>) {
          const details = (log.details && typeof log.details === 'object' ? log.details : {}) as AuditFeedbackDetail
          const orderId = asText(details.order_id)
          const feedbackType = details.feedback_type === 'issue' ? 'issue' : details.feedback_type === 'rating' ? 'rating' : null
          if (!orderId || !feedbackType) continue

          const key = `${orderId}:${feedbackType}:${asText(log.created_at)}:${details.rating ?? ''}:${asText(details.issue_message)}`
          if (!tableUnavailable && seenFallback.has(key)) continue

          feedbackRows.push({
            id: `audit-${String(log.id)}`,
            order_id: orderId,
            customer_id: asText(log.user_id),
            feedback_type: feedbackType,
            rating: typeof details.rating === 'number' ? details.rating : details.rating ? Number(details.rating) : null,
            comment_message: null,
            issue_message: asText(details.issue_message) || null,
            source: asText(details.source) || 'web',
            status: 'new',
            created_at: asText(log.created_at) || null,
            updated_at: asText(log.created_at) || null,
            order_code: asText(details.order_code) || null,
            customer_email: asText(log.user_email) || null,
            storage_source: 'audit_logs',
            scope: 'order',
          })
        }

        const orderIds = Array.from(new Set(feedbackRows.map((row) => row.order_id).filter(Boolean)))
        const customerIds = Array.from(new Set(feedbackRows.map((row) => row.customer_id).filter(Boolean)))
        const reportIds = Array.from(new Set(feedbackRows.map((row) => row.report_id).filter(Boolean)))
        const staffIds = Array.from(new Set(feedbackRows.map((row) => row.staff_id).filter(Boolean)))

        const [ordersRes, customersRes, reportsRes, staffRes] = await Promise.all([
          orderIds.length > 0
            ? supabase.from('orders').select('id, order_code').in('id', orderIds)
            : Promise.resolve({ data: [], error: null }),
          customerIds.length > 0
            ? supabase.from('profiles').select('id, display_name, email').in('id', customerIds)
            : Promise.resolve({ data: [], error: null }),
          reportIds.length > 0
            ? supabase.from('work_reports').select('id, created_at').in('id', reportIds)
            : Promise.resolve({ data: [], error: null }),
          staffIds.length > 0
            ? supabase.from('profiles').select('id, display_name').in('id', staffIds)
            : Promise.resolve({ data: [], error: null }),
        ])

        if (ordersRes.error) throw ordersRes.error
        if (customersRes.error) throw customersRes.error
        if (reportsRes.error) throw reportsRes.error
        if (staffRes.error) throw staffRes.error

        const orderMap = new Map<string, string>()
        for (const order of (ordersRes.data || []) as Array<Record<string, unknown>>) {
          orderMap.set(asText(order.id), asText(order.order_code) || asText(order.id))
        }

        const customerMap = new Map<string, { name: string; email: string }>()
        for (const customer of (customersRes.data || []) as Array<Record<string, unknown>>) {
          customerMap.set(asText(customer.id), {
            name: asText(customer.display_name),
            email: asText(customer.email),
          })
        }

        const reportMap = new Map<string, string>()
        for (const report of (reportsRes.data || []) as Array<Record<string, unknown>>) {
          reportMap.set(asText(report.id), asText(report.created_at) || '')
        }

        const staffMap = new Map<string, string>()
        for (const staff of (staffRes.data || []) as Array<Record<string, unknown>>) {
          staffMap.set(asText(staff.id), asText(staff.display_name) || asText(staff.id))
        }

        const merged = feedbackRows
          .map((row) => ({
            ...row,
            order_code: row.order_code || orderMap.get(row.order_id) || row.order_id,
            report_created_at: row.report_id ? reportMap.get(row.report_id) || null : null,
            customer_name: customerMap.get(row.customer_id)?.name || null,
            customer_email: row.customer_email || customerMap.get(row.customer_id)?.email || null,
            staff_name: row.staff_id ? staffMap.get(row.staff_id) || null : null,
          }))
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

        setItems(merged)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'โหลด feedback ไม่สำเร็จ')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const filteredItems = useMemo(() => {
    if (filterMode === 'all') return items
    return items.filter((item) => item.feedback_type === filterMode)
  }, [items, filterMode])

  const stats = useMemo(() => {
    const ratings = items.filter((item) => item.feedback_type === 'rating')
    const issues = items.filter((item) => item.feedback_type === 'issue')
    const averageRating = ratings.length > 0
      ? (ratings.reduce((sum, item) => sum + (item.rating || 0), 0) / ratings.length).toFixed(1)
      : '0.0'
    return {
      total: items.length,
      ratings: ratings.length,
      issues: issues.length,
      averageRating,
    }
  }, [items])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A9A94]">Customer Signals</div>
          <h1 className="mt-1 text-3xl font-semibold text-[#1A1A1A]">{locale === 'en' ? 'คะแนนและปัญหาจากลูกค้า' : locale === 'zh' ? 'คะแนนและปัญหาจากลูกค้า' : 'คะแนนและปัญหาจากลูกค้า'}</h1>
          <p className="mt-2 text-sm text-[#666666]">{locale === 'en' ? 'รวม feedback ที่ส่งจากหน้าเว็บลูกค้าและปุ่มใน LINE หลังจบงาน' : locale === 'zh' ? 'รวม feedback ที่ส่งจากหน้าเว็บลูกค้าและปุ่มใน LINE หลังจบงาน' : 'รวม feedback ที่ส่งจากหน้าเว็บลูกค้าและปุ่มใน LINE หลังจบงาน'}</p>
        </div>
        <Link href="/dashboard/admin/audit-logs" className="inline-flex items-center gap-2 rounded-xl border border-[#E5E5DF] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] hover:bg-[#F7F7F2]">
          <RefreshCcw className="h-4 w-4" /> {locale === 'en' ? ' เปิด audit logs         ' : locale === 'zh' ? ' เปิด audit logs         ' : ' เปิด audit logs         '}</Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#E5E5DF] bg-white p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[#9A9A94]">{locale === 'en' ? 'ทั้งหมด' : locale === 'zh' ? 'ทั้งหมด' : 'ทั้งหมด'}</div>
          <div className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-amber-700">{locale === 'en' ? 'คะแนน' : locale === 'zh' ? 'คะแนน' : 'คะแนน'}</div>
          <div className="mt-2 text-3xl font-semibold text-amber-900">{stats.ratings}</div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-red-700">{locale === 'en' ? 'ปัญหา' : locale === 'zh' ? 'ปัญหา' : 'ปัญหา'}</div>
          <div className="mt-2 text-3xl font-semibold text-red-900">{stats.issues}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-emerald-700">{locale === 'en' ? 'คะแนนเฉลี่ย' : locale === 'zh' ? 'คะแนนเฉลี่ย' : 'คะแนนเฉลี่ย'}</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-900">{stats.averageRating}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {([
          ['all', 'ทั้งหมด'],
          ['rating', 'เฉพาะให้ดาว'],
          ['issue', 'เฉพาะแจ้งปัญหา'],
        ] as Array<[FilterMode, string]>).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilterMode(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${filterMode === value ? 'bg-[#1F3A2C] text-white' : 'border border-[#E5E5DF] bg-white text-[#666666]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-[#E5E5DF] bg-white p-5">
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="mt-3 h-3 w-full rounded bg-gray-200" />
              <div className="mt-2 h-3 w-2/3 rounded bg-gray-200" />
            </div>
          ))
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E5DF] bg-[#FAFAF8] px-4 py-12 text-center text-sm text-[#70706B]">
            <Inbox className="mx-auto mb-3 h-6 w-6 text-[#B5B5B0]" />
            {locale === 'en' ? '             ยังไม่มี feedback จากลูกค้า           ' : locale === 'zh' ? '             ยังไม่มี feedback จากลูกค้า           ' : '             ยังไม่มี feedback จากลูกค้า           '}</div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[#E5E5DF] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${item.feedback_type === 'rating' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {item.feedback_type === 'rating' ? <Star className="h-3.5 w-3.5" /> : <MessageSquareWarning className="h-3.5 w-3.5" />}
                      {item.feedback_type === 'rating' ? 'ให้ดาว' : 'แจ้งปัญหา'}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-[#E5E5DF] bg-[#FAFAF8] px-3 py-1 text-xs font-semibold text-[#666666]">
                      {item.storage_source === 'table' ? 'stored table' : 'audit fallback'}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-[#1A1A1A]">{locale === 'en' ? 'ออเดอร์ #' : locale === 'zh' ? 'ออเดอร์ #' : 'ออเดอร์ #'}{item.order_code || item.order_id}</h2>
                  <p className="mt-1 text-sm text-[#666666]">
                    {item.customer_name || 'ลูกค้าไม่ระบุชื่อ'}
                    {item.customer_email ? ` • ${item.customer_email}` : ''}
                  </p>
                  {item.scope === 'report' ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#214031]">
                      report-level{item.staff_name ? ` • ${item.staff_name}` : ''}
                    </p>
                  ) : null}
                </div>
                <div className="text-right text-sm text-[#70706B]">
                  <div>{formatDateTime(item.created_at)}</div>
                  {item.report_created_at ? <div className="mt-1">visit: {formatDateTime(item.report_created_at)}</div> : null}
                  <div className="mt-1">source: {item.source || '-'}</div>
                  <div className="mt-1">status: {item.status || '-'}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
                <div className="rounded-2xl border border-[#F1F1EC] bg-[#FCFCFA] p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A9A94]">{locale === 'en' ? 'สรุป' : locale === 'zh' ? 'สรุป' : 'สรุป'}</div>
                  {item.feedback_type === 'rating' ? (
                    <div className="mt-3">
                      <div className="text-sm text-[#70706B]">{locale === 'en' ? 'คะแนนที่ลูกค้าให้' : locale === 'zh' ? 'คะแนนที่ลูกค้าให้' : 'คะแนนที่ลูกค้าให้'}</div>
                      <div className="mt-2 flex gap-1 text-amber-500">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star key={value} className={`h-6 w-6 ${value <= (item.rating || 0) ? 'fill-current' : ''}`} />
                        ))}
                      </div>
                      <div className="mt-1 text-sm text-[#666666]">{item.rating || 0} / 5</div>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-red-700">{locale === 'en' ? 'ลูกค้าแจ้งให้ทีมงานตรวจสอบเพิ่มเติม' : locale === 'zh' ? 'ลูกค้าแจ้งให้ทีมงานตรวจสอบเพิ่มเติม' : 'ลูกค้าแจ้งให้ทีมงานตรวจสอบเพิ่มเติม'}</div>
                  )}
                </div>

                <div className="rounded-2xl border border-[#F1F1EC] bg-[#FCFCFA] p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A9A94]">{locale === 'en' ? 'รายละเอียด' : locale === 'zh' ? 'รายละเอียด' : 'รายละเอียด'}</div>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#1A1A1A]">
                    {item.feedback_type === 'issue' ? item.issue_message || '-' : item.comment_message || 'ลูกค้าให้คะแนนหลังรับบริการ'}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/dashboard/admin/orders/${item.order_id}`} className="rounded-xl bg-[#1F3A2C] px-4 py-2 text-sm font-semibold text-white">{locale === 'en' ? 'ดูออเดอร์นี้' : locale === 'zh' ? 'ดูออเดอร์นี้' : 'ดูออเดอร์นี้'}</Link>
                    <Link href={`/dashboard/customer/orders/${item.order_id}`} className="rounded-xl border border-[#D9DED8] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A]">{locale === 'en' ? 'เปิดมุมมองลูกค้า' : locale === 'zh' ? 'เปิดมุมมองลูกค้า' : 'เปิดมุมมองลูกค้า'}</Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
