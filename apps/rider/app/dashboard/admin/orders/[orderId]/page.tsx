'use client';
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  Home,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { supabase, updateOrder } from '@/lib/supabaseClient'
import type { OrderStatus } from '@/lib/supabaseClient'
import { notifyOrderStatusChanged, notifyStaffAssigned } from '@/lib/notify'
import { getReceiptGateForInvoice } from '@/lib/installmentFlow'
import { useI18n } from "@/lib/I18nContext";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'รอดำเนินการ',    color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  confirmed:   { label: 'ยืนยันแล้ว',      color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  in_progress: { label: 'กำลังดำเนินการ', color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200' },
  completed:   { label: 'เสร็จสิ้น',       color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  cancelled:   { label: 'ยกเลิก',          color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
}

const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'in_progress', 'completed']

const DOC_CONFIG: Record<string, { label: string; tone: string; createTone: string; createLabel: string }> = {
  quotation: { label: 'ใบเสนอราคา',  tone: 'xyl-doc-quotation', createTone: 'xyl-doc-quotation-solid', createLabel: 'สร้างใบเสนอราคา' },
  invoice:   { label: 'ใบแจ้งหนี้',    tone: 'xyl-doc-invoice', createTone: 'xyl-doc-invoice-solid', createLabel: 'สร้างใบแจ้งหนี้' },
  receipt:   { label: 'ใบเสร็จ',     tone: 'xyl-doc-receipt', createTone: 'xyl-doc-receipt-solid', createLabel: 'สร้างใบเสร็จ' },
}

export default function AdminOrderDetailPage({ params }: { params: { orderId: string } }) {
    const { locale } = useI18n();
  const { profile } = useAuth()
  const [order, setOrder] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  // Work reports
  const [workReports, setWorkReports] = useState<any[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)

  // Staff assignment state
  const [staffList, setStaffList] = useState<any[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningStaffId, setAssigningStaffId] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignMsg, setAssignMsg] = useState('')

  const fetchOrder = async () => {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_code,
        status,
        total,
        calculated_price,
        base_price,
        additional_services_price,
        service_area,
        scheduled_date,
        preferred_time_start,
        preferred_time_end,
        notes,
        special_instructions,
        created_at,
        updated_at,
        completed_at,
        customer_id,
        house_id,
        service_id,
        profiles!orders_customer_id_fkey (
          id,
          display_name,
          email,
          phone,
          customer_base_code,
          address
        ),
        services (
          id,
          service_name,
          service_code,
          billing_type,
          base_price,
          has_estimated_duration,
          estimated_duration,
          estimated_duration_unit,
          category,
          description
        ),
        houses!orders_house_id_fkey (
          id,
          house_code,
          name,
          address,
          area_size,
          house_type
        ),
        price_templates (
          id,
          template_name,
          description,
          area_min,
          area_max,
          base_price,
          price_per_unit
        ),
        order_additional_services (
          id,
          quantity,
          unit_price,
          total_price,
          additional_services (
            service_name,
            description,
            category
          )
        ),
        documents (
          id,
          type,
          source_document_id,
          description,
          document_code,
          status,
          created_at
        ),
        job_assignments (
          id,
          status,
          assigned_at,
          notes,
          profiles!job_assignments_staff_id_fkey (
            display_name,
            email,
            phone
          )
        )
      `)
      .eq('id', params.orderId)
      .single()

    if (error) {
      setError(error.message || 'ไม่พบข้อมูลคำสั่งงาน')
      setOrder(null)
    } else {
      setOrder(data)
    }
    setLoading(false)
  }

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, email, phone')
      .eq('role', 'staff')
      .order('display_name', { ascending: true })
    setStaffList(data || [])
  }

  const fetchWorkReports = async () => {
    if (!params.orderId || !supabase) return
    setReportsLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('work_reports')
        .select('id, job_assignment_id, work_done, problems_found, recommendations, next_visit_date, next_visit_time_start, next_visit_time_end, next_visit_notes, before_photos, after_photos, updated_at')
        .eq('order_id', params.orderId)
        .order('updated_at', { ascending: false })
        .limit(20)
      if (!err && data) setWorkReports(data)
    } catch {}
    setReportsLoading(false)
  }

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'admin') return
    void fetchOrder()
    void fetchStaff()
  }, [profile, params.orderId])

  const formatTHB = (n: number | null | undefined) => {
    const v = typeof n === 'number' ? n : 0
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(v)
  }

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const formatDateTime = (iso: string | null | undefined) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('th-TH')
  }

  const orderTotal = () => Number(order?.calculated_price ?? order?.total ?? order?.base_price ?? 0)

  const handleAssignStaff = async () => {
    if (!order || !assigningStaffId) return
    setAssignLoading(true)
    setAssignMsg('')

    // First confirm order if still pending
    if (order.status === 'pending') {
      const { error: statusErr } = await updateOrder(order.id, { status: 'confirmed' })
      if (statusErr) {
        setAssignMsg('ยืนยันออเดอร์ไม่สำเร็จ: ' + (statusErr.message || ''))
        setAssignLoading(false)
        return
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const response = await fetch('/api/job-assignments/assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({
        orderId: order.id,
        staffId: assigningStaffId,
        note: assignNote.trim() || null,
        serviceName: order.services?.service_name ?? 'บริการ',
        scheduledDate: order.scheduled_date ?? null,
      }),
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setAssignMsg('มอบหมายงานไม่สำเร็จ: ' + (result?.error || response.statusText))
    } else {
      setAssignMsg('มอบหมายงานแล้ว')
      setShowAssignModal(false)
      setAssigningStaffId('')
      setAssignNote('')
      void fetchOrder()
      setTimeout(() => setAssignMsg(''), 3000)
    }
    setAssignLoading(false)
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!window.confirm('ต้องการยกเลิกการมอบหมายนี้ใช่หรือไม่?')) return
    const { error } = await supabase.from('job_assignments').delete().eq('id', assignmentId)
    if (!error) void fetchOrder()
  }

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return
    if (updatingStatus) return
    setUpdatingStatus(true)
    setStatusMsg('')

    const { error } = await updateOrder(order.id, { status: newStatus })
    if (error) {
      setStatusMsg('อัปเดตสถานะไม่สำเร็จ: ' + (error.message || ''))
    } else {
      setOrder((prev: any) => ({ ...prev, status: newStatus }))
      setStatusMsg('อัปเดตสถานะแล้ว')
      // แจ้งลูกค้าเมื่อสถานะเปลี่ยน
      if (order.customer_id) {
        void notifyOrderStatusChanged(
          order.customer_id,
          order.id,
          newStatus,
          order.order_code ?? undefined
        )
      }
      setTimeout(() => setStatusMsg(''), 3000)
    }
    setUpdatingStatus(false)
  }

  if (!profile) return null
  if (profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{locale === 'en' ? 'You do not have permission to access this page.' : locale === 'zh' ? '您没有访问此页面的权限。' : 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้'}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        {locale === 'en' ? 'Loading...' : locale === 'zh' ? '加载中...' : '         กำลังโหลด...       '}</div>
    )
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/admin/orders" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ChevronLeft size={16} /> {locale === 'en' ? 'Return work list' : locale === 'zh' ? '返回工作清单' : ' กลับรายการงาน         '}</Link>
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 text-sm">
          {error || 'ไม่พบข้อมูลคำสั่งงาน'}
        </div>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['pending']
  const docs: any[] = Array.isArray(order.documents) ? order.documents : []
  const assignments: any[] = Array.isArray(order.job_assignments) ? order.job_assignments : []
  const addons: any[] = Array.isArray(order.order_additional_services) ? order.order_additional_services : []

  const quotation = docs.find((d) => d.type === 'quotation')
  const invoice   = docs.find((d) => d.type === 'invoice')
  const receipt   = docs.find((d) => d.type === 'receipt')

  const currentStepIdx = STATUS_STEPS.indexOf(order.status as OrderStatus)

  const billingLabel = (bt: string | null | undefined) => {
    if (bt === 'one-time')  return 'รายครั้ง'
    if (bt === 'recurring') return 'รายเดือน/ปี'
    if (bt === 'both')      return 'ยืดหยุ่น'
    return null
  }

  return (
    <div className="space-y-6">
      {/* Top nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/admin/orders"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
        >
          <ChevronLeft size={16} />
          {locale === 'en' ? 'Return work list' : locale === 'zh' ? '返回工作清单' : '           กลับรายการงาน         '}</Link>
        <button
          type="button"
          onClick={() => void fetchOrder()}
          className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800"
        >
          <RefreshCw size={13} />
          {locale === 'en' ? 'Refresh' : locale === 'zh' ? '刷新' : '           รีเฟรช         '}</button>
      </div>

      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {order.order_code || order.id.slice(0, 8).toUpperCase()}
            </h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
            {billingLabel(order.services?.billing_type) ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                {billingLabel(order.services?.billing_type)}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-gray-500">{locale === 'en' ? 'Created when' : locale === 'zh' ? '创建时间' : 'สร้างเมื่อ '}{formatDateTime(order.created_at)}</p>
        </div>

        {/* Status update buttons */}
        <div className="flex flex-wrap gap-2">
          {(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const).map((s) => {
            const sc = STATUS_CONFIG[s]
            const isActive = order.status === s
            return (
              <button
                key={s}
                type="button"
                disabled={updatingStatus || isActive}
                onClick={() => void handleStatusChange(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isActive
                    ? sc.bg + ' ' + sc.color + ' cursor-default'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-800'
                } disabled:opacity-50`}
              >
                {sc.label}
              </button>
            )
          })}
        </div>
      </div>

      {statusMsg ? (
        <div className={`text-xs px-3 py-2 rounded-lg border ${
          statusMsg.includes('ไม่สำเร็จ') ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
        }`}>
          {statusMsg}
        </div>
      ) : null}

      {/* Progress steps */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-0">
          {STATUS_STEPS.map((s, idx) => {
            const sc = STATUS_CONFIG[s]
            const done = currentStepIdx > idx
            const active = currentStepIdx === idx
            const isCancelled = order.status === 'cancelled'
            return (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                    isCancelled ? 'border-red-300 bg-red-50 text-red-400' :
                    done   ? 'border-emerald-500 bg-emerald-500 text-white' :
                    active ? 'border-blue-600 bg-blue-600 text-white' :
                             'border-gray-200 bg-white text-gray-400'
                  }`}>
                    {done ? <CheckCircle2 size={14} /> : idx + 1}
                  </div>
                  <span className={`text-[10px] font-semibold text-center leading-tight ${
                    isCancelled ? 'text-red-400' :
                    active ? 'text-blue-700' : done ? 'text-emerald-600' : 'text-gray-400'
                  }`}>
                    {sc.label}
                  </span>
                </div>
                {idx < STATUS_STEPS.length - 1 ? (
                  <div className={`flex-1 h-0.5 mb-4 mx-1 transition-colors ${
                    done && !isCancelled ? 'bg-emerald-400' : 'bg-gray-100'
                  }`} />
                ) : null}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main column */}
        <div className="lg:col-span-8 space-y-6">

          {/* Document chain */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText size={15} className="text-blue-600" /> {locale === 'en' ? 'Related documents' : locale === 'zh' ? '相关文件' : ' เอกสารที่เกี่ยวข้อง             '}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['quotation', 'invoice', 'receipt'] as const).map((type) => {
                  const { locale } = useI18n();
                const doc = docs.find((d) => d.type === type)
                const dcfg = DOC_CONFIG[type]
                if (doc) {
                  return (
                    <Link
                      key={type}
                      href={`/dashboard/admin/documents/create-manual?edit=${doc.id}`}
                      className={`group flex flex-col p-4 rounded-xl border transition-all hover:shadow-sm ${dcfg.tone}`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest mb-1">{dcfg.label}</div>
                      <div className="text-sm font-bold">{doc.document_code || doc.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-[11px] mt-1 opacity-70">{formatDate(doc.created_at)}</div>
                      <div className="flex items-center gap-1 mt-2 text-xs font-semibold">
                        {locale === 'en' ? 'Open it and see.' : locale === 'zh' ? '打开看看。' : '                         เปิดดู '}<ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  )
                }

                // Show "create" button for next step in chain
                const receiptGate = type === 'receipt' && !!invoice
                  ? getReceiptGateForInvoice(invoice, docs)
                  : null

                const canCreate =
                  (type === 'quotation' && !quotation) ||
                  (type === 'invoice' && !!quotation && !invoice) ||
                  (type === 'receipt' && !!invoice && !receipt && !!receiptGate?.allowed)

                const blockedReceiptCreate =
                  type === 'receipt' && !!invoice && !receipt && !!receiptGate && !receiptGate.allowed

                if (canCreate) {
                  const createHref =
                    type === 'quotation'
                      ? `/dashboard/admin/documents/create-manual?type=quotation&orderId=${order.id}`
                      : type === 'invoice' && quotation
                      ? `/dashboard/admin/documents/create-manual?type=invoice&sourceDocId=${quotation.id}`
                      : invoice
                      ? `/dashboard/admin/documents/create-manual?type=receipt&sourceDocId=${invoice.id}`
                      : '#'

                  return (
                    <Link
                      key={type}
                      href={createHref}
                      className={`flex flex-col p-4 rounded-xl border transition-all ${dcfg.createTone}`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/80 mb-1">{dcfg.label}</div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold mt-1 text-white">
                        <Plus size={14} /> {dcfg.createLabel}
                      </div>
                    </Link>
                  )
                }

                if (blockedReceiptCreate) {
                  return (
                    <div
                      key={type}
                      className="flex flex-col p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50"
                      title={receiptGate?.reason || undefined}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{dcfg.label}</div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 mt-1">
                        <Plus size={14} /> {dcfg.createLabel}
                      </div>
                      <div className="mt-2 text-[11px] text-amber-700">{receiptGate?.reason}</div>
                    </div>
                  )
                }

                return (
                  <div key={type} className="flex flex-col p-4 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{dcfg.label}</div>
                    <div className="text-sm text-gray-400">-</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Service + pricing */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Tag size={15} className="text-indigo-600" /> {locale === 'en' ? 'Service details' : locale === 'zh' ? '服务详情' : ' รายละเอียดบริการ             '}</h2>

            {order.services ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{order.services.service_name}</p>
                    {order.services.service_code ? (
                      <p className="text-xs text-gray-400 mt-0.5">{order.services.service_code}</p>
                    ) : null}
                    {order.services.category ? (
                      <p className="text-xs text-gray-500 mt-0.5">{locale === 'en' ? 'group:' : locale === 'zh' ? '团体：' : 'หมวด: '}{order.services.category}</p>
                    ) : null}
                    {order.services.description ? (
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{order.services.description}</p>
                    ) : null}
                  </div>
                  <Link
                    href={`/dashboard/admin/services`}
                    className="text-xs text-blue-600 hover:underline shrink-0"
                  >
                    {locale === 'en' ? 'View service' : locale === 'zh' ? '查看服务' : '                     ดูบริการ                   '}</Link>
                </div>

                {order.price_templates ? (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                    <p className="font-semibold text-gray-700">{locale === 'en' ? 'Price package:' : locale === 'zh' ? '套餐价格：' : 'แพ็กเกจราคา: '}{order.price_templates.template_name}</p>
                    {order.price_templates.area_min != null ? (
                      <p className="text-xs text-gray-500 mt-1">
                        {locale === 'en' ? 'area' : locale === 'zh' ? '区域' : '                         พื้นที่ '}{order.price_templates.area_min}–{order.price_templates.area_max} {locale === 'en' ? ' sq m.                         • Base price ' : locale === 'zh' ? ' 平方米。                         • 基本价格 ' : ' ตร.ม.                         • ราคาฐาน '}{formatTHB(order.price_templates.base_price)}
                        {order.price_templates.price_per_unit ? ` + ${formatTHB(order.price_templates.price_per_unit)}/ตร.ม.` : ''}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {order.service_area ? (
                  <p className="text-sm text-gray-600">{locale === 'en' ? 'Actual space:' : locale === 'zh' ? '实际空间：' : 'พื้นที่จริง: '}<strong>{order.service_area} {locale === 'en' ? 'sq m.' : locale === 'zh' ? '平方米。' : ' ตร.ม.'}</strong></p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{locale === 'en' ? 'Service not specified' : locale === 'zh' ? '未指定服务' : 'ไม่ระบุบริการ'}</p>
            )}

            {/* Price breakdown */}
            <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
              {order.base_price ? (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{locale === 'en' ? 'Base price' : locale === 'zh' ? '基价' : 'ราคาฐาน'}</span>
                  <span>{formatTHB(order.base_price)}</span>
                </div>
              ) : null}
              {order.additional_services_price ? (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{locale === 'en' ? 'Additional services' : locale === 'zh' ? '附加服务' : 'บริการเสริม'}</span>
                  <span>{formatTHB(order.additional_services_price)}</span>
                </div>
              ) : null}
              {order.calculated_price ? (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{locale === 'en' ? 'Calculate price' : locale === 'zh' ? '计算价格' : 'ราคาคำนวณ'}</span>
                  <span>{formatTHB(order.calculated_price)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>{locale === 'en' ? 'Total' : locale === 'zh' ? '全部的' : 'ยอดรวม'}</span>
                <span>{formatTHB(orderTotal())}</span>
              </div>
            </div>
          </div>

          {/* Additional services */}
          {addons.length > 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">{locale === 'en' ? 'Additional services' : locale === 'zh' ? '附加服务' : 'บริการเสริม'}</h2>
              <div className="space-y-2">
                {addons.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                    <div>
                      <p className="font-medium text-gray-800">{a.additional_services?.service_name || '-'}</p>
                      {a.additional_services?.description ? (
                        <p className="text-xs text-gray-400">{a.additional_services.description}</p>
                      ) : null}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900">{formatTHB(a.total_price ?? (a.unit_price * a.quantity))}</p>
                      {a.quantity > 1 ? (
                        <p className="text-xs text-gray-400">{a.quantity} × {formatTHB(a.unit_price)}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Notes */}
          {(order.notes || order.special_instructions) ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-3">{locale === 'en' ? 'note' : locale === 'zh' ? '笔记' : 'หมายเหตุ'}</h2>
              {order.notes ? <p className="text-sm text-gray-700 leading-relaxed">{order.notes}</p> : null}
              {order.special_instructions ? (
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  <span className="font-semibold">{locale === 'en' ? 'Special instructions:' : locale === 'zh' ? '特别说明：' : 'คำแนะนำพิเศษ:'}</span> {order.special_instructions}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Work Reports */}
          {workReports.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText size={15} className="text-emerald-600" /> {locale === 'en' ? 'Work report (' : locale === 'zh' ? '工作报告（' : ' รายงานผลการทำงาน ('}{workReports.length})
              </h2>
              <div className="space-y-4">
                {workReports.map((r) => {
                    const { locale } = useI18n();
                  const before = (r.before_photos || []).filter(Boolean)
                  const after = (r.after_photos || []).filter(Boolean)
                  return (
                    <div key={r.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500">{locale === 'en' ? 'Work site report' : locale === 'zh' ? '工作现场报告' : 'รายงานหน้างาน'}</span>
                        <span className="text-[10px] text-gray-400">
                          {r.updated_at ? new Date(r.updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </span>
                      </div>
                      {r.work_done && (
                        <div className="mb-2">
                          <span className="text-[10px] font-bold uppercase text-gray-400">{locale === 'en' ? 'Work done' : locale === 'zh' ? '工作完成' : 'งานที่ทำ'}</span>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.work_done}</p>
                        </div>
                      )}
                      {r.problems_found && (
                        <div className="mb-2">
                          <span className="text-[10px] font-bold uppercase text-gray-400">{locale === 'en' ? 'Problems encountered' : locale === 'zh' ? '遇到的问题' : 'ปัญหาที่พบ'}</span>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.problems_found}</p>
                        </div>
                      )}
                      {r.recommendations && (
                        <div className="mb-2">
                          <span className="text-[10px] font-bold uppercase text-gray-400">{locale === 'en' ? 'advice' : locale === 'zh' ? '建议' : 'คำแนะนำ'}</span>
                          <p className="text-sm text-amber-700 whitespace-pre-wrap">{r.recommendations}</p>
                        </div>
                      )}
                      {(before.length > 0 || after.length > 0) && (
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">{locale === 'en' ? 'Picture before making (' : locale === 'zh' ? '制作前的图（' : 'รูปก่อนทำ ('}{before.length})</span>
                            <div className="grid grid-cols-2 gap-1">
                              {before.slice(0, 6).map((url: string) => (
                                <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-gray-200">
                                  <img src={url} alt="before" className="h-16 w-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">{locale === 'en' ? 'Picture after making (' : locale === 'zh' ? '制作完成后的图（' : 'รูปหลังทำ ('}{after.length})</span>
                            <div className="grid grid-cols-2 gap-1">
                              {after.slice(0, 6).map((url: string) => (
                                <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-gray-200">
                                  <img src={url} alt="after" className="h-16 w-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {r.next_visit_date && (
                        <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
                          {locale === 'en' ? 'Next match:' : locale === 'zh' ? '下一场比赛：' : '                           นัดถัดไป: '}{r.next_visit_date}{r.next_visit_time_start ? ` ${r.next_visit_time_start}` : ''}{r.next_visit_time_end ? `-${r.next_visit_time_end}` : ''}
                          {r.next_visit_notes ? ` — ${r.next_visit_notes}` : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Staff assignments */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <UserCheck size={15} className="text-indigo-600" /> {locale === 'en' ? 'Assign employees' : locale === 'zh' ? '分配员工' : ' มอบหมายพนักงาน               '}</h2>
              {order.status !== 'completed' && order.status !== 'cancelled' ? (
                <button
                  type="button"
                  onClick={() => setShowAssignModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition-colors"
                >
                  <UserPlus size={13} /> {locale === 'en' ? 'Add employees' : locale === 'zh' ? '添加员工' : ' เพิ่มพนักงาน                 '}</button>
              ) : null}
            </div>

            {assignMsg ? (
              <div className={`mb-3 text-xs px-3 py-2 rounded-lg border ${
                assignMsg.includes('ไม่สำเร็จ') ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
              }`}>
                {assignMsg}
              </div>
            ) : null}

            {assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-gray-400 gap-2">
                <UserCheck size={28} strokeWidth={1.5} />
                <p className="text-xs text-center">{locale === 'en' ? 'There is still no responsible employee.' : locale === 'zh' ? '仍然没有负责任的员工。' : 'ยังไม่มีพนักงานรับผิดชอบ'}<br />{locale === 'en' ? 'Press &ldquo;add employee&rdquo; to assign' : locale === 'zh' ? '按“添加员工”分配' : 'กด &ldquo;เพิ่มพนักงาน&rdquo; เพื่อมอบหมาย'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => {
                    const { locale } = useI18n();
                  const staffProfile = a.profiles
                  const assignStatusLabel =
                    a.status === 'completed'   ? 'เสร็จแล้ว' :
                    a.status === 'in_progress' ? 'กำลังทำงาน' :
                    a.status === 'accepted'    ? 'รับงานแล้ว' :
                                                  'มอบหมายแล้ว'
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                        {(staffProfile?.display_name || staffProfile?.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{staffProfile?.display_name || staffProfile?.email || '-'}</p>
                        {staffProfile?.phone ? <p className="text-xs text-gray-500">{staffProfile.phone}</p> : null}
                        {a.notes ? <p className="text-xs text-gray-400 mt-0.5 truncate">{a.notes}</p> : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/dashboard/admin/reports/edit/${a.id}`}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                          title={locale === 'en' ? 'Post report/edit report' : locale === 'zh' ? '发布报告/编辑报告' : 'ลงรายงาน/แก้ไขรายงาน'}
                        >
                          <FileText size={14} />
                        </Link>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          a.status === 'completed'   ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          a.status === 'in_progress' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          a.status === 'accepted'    ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          {assignStatusLabel}
                        </span>
                        {a.status !== 'completed' && a.status !== 'in_progress' ? (
                          <button
                            type="button"
                            onClick={() => void handleRemoveAssignment(a.id)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                            aria-label={locale === 'en' ? 'Cancel assignment' : locale === 'zh' ? '取消分配' : 'ยกเลิกการมอบหมาย'}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Customer */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <User size={13} /> {locale === 'en' ? 'customer' : locale === 'zh' ? '顾客' : ' ลูกค้า             '}</h3>
            {order.profiles ? (
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">{order.profiles.display_name || order.profiles.email}</p>
                {order.profiles.customer_base_code ? (
                  <p className="text-xs text-gray-500">{locale === 'en' ? 'code:' : locale === 'zh' ? '代码：' : 'รหัส: '}{order.profiles.customer_base_code}</p>
                ) : null}
                {order.profiles.email ? (
                  <p className="text-xs text-gray-600">{order.profiles.email}</p>
                ) : null}
                {order.profiles.phone ? (
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <Phone size={11} /> {order.profiles.phone}
                  </p>
                ) : null}
                <Link
                  href={`/dashboard/admin/customers/${order.profiles.id}`}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                >
                  {locale === 'en' ? 'View customer information' : locale === 'zh' ? '查看客户信息' : '                   ดูข้อมูลลูกค้า '}<ArrowRight size={11} />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-400">-</p>
            )}
          </div>

          {/* House */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Home size={13} /> {locale === 'en' ? 'Home/Place' : locale === 'zh' ? '首页/地点' : ' บ้าน / สถานที่             '}</h3>
            {order.houses ? (
              <div className="space-y-1.5">
                <p className="font-semibold text-gray-900">{order.houses.name || order.houses.house_code}</p>
                {order.houses.house_code && order.houses.name ? (
                  <p className="text-xs text-gray-500">{locale === 'en' ? 'code:' : locale === 'zh' ? '代码：' : 'รหัส: '}{order.houses.house_code}</p>
                ) : null}
                {order.houses.address ? (
                  <p className="text-sm text-gray-600 flex items-start gap-1">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    {order.houses.address}
                  </p>
                ) : null}
                {order.houses.area_size ? (
                  <p className="text-xs text-gray-500">{locale === 'en' ? 'area:' : locale === 'zh' ? '区域：' : 'พื้นที่: '}{order.houses.area_size} {locale === 'en' ? 'sq m.' : locale === 'zh' ? '平方米。' : ' ตร.ม.'}</p>
                ) : null}
                {order.houses.house_type ? (
                  <p className="text-xs text-gray-500">{locale === 'en' ? 'type:' : locale === 'zh' ? '类型：' : 'ประเภท: '}{order.houses.house_type}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-400">-</p>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <CalendarDays size={13} /> {locale === 'en' ? 'Schedule' : locale === 'zh' ? '日程' : ' กำหนดการ             '}</h3>
            <div className="space-y-2 text-sm">
              {order.scheduled_date ? (
                <div>
                  <p className="text-xs text-gray-400">{locale === 'en' ? 'Appointment date' : locale === 'zh' ? '预约日期' : 'วันที่นัดหมาย'}</p>
                  <p className="font-semibold text-gray-800">{formatDate(order.scheduled_date)}</p>
                  {order.preferred_time_start ? (
                    <p className="text-xs text-gray-500">
                      {order.preferred_time_start.slice(0, 5)}
                      {order.preferred_time_end ? ` – ${order.preferred_time_end.slice(0, 5)}` : ''}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-gray-400 text-xs">{locale === 'en' ? 'Date not yet set' : locale === 'zh' ? '日期尚未确定' : 'ยังไม่กำหนดวัน'}</p>
              )}
              {order.completed_at ? (
                <div>
                  <p className="text-xs text-gray-400">{locale === 'en' ? 'finished when' : locale === 'zh' ? '完成时' : 'เสร็จสิ้นเมื่อ'}</p>
                  <p className="font-semibold text-gray-800">{formatDate(order.completed_at)}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs text-gray-400">{locale === 'en' ? 'Created when' : locale === 'zh' ? '创建时间' : 'สร้างเมื่อ'}</p>
                <p className="text-gray-700">{formatDate(order.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{locale === 'en' ? 'Last edited' : locale === 'zh' ? '最后编辑' : 'แก้ไขล่าสุด'}</p>
                <p className="text-gray-700">{formatDate(order.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Service estimated duration */}
          {order.services?.has_estimated_duration && order.services?.estimated_duration ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Clock size={13} /> {locale === 'en' ? 'Estimated duration' : locale === 'zh' ? '预计持续时间' : ' ระยะเวลาโดยประมาณ               '}</h3>
              <p className="font-semibold text-gray-800">
                {order.services.estimated_duration}{' '}
                {order.services.estimated_duration_unit === 'hours' ? 'ชั่วโมง' :
                  order.services.estimated_duration_unit === 'days' ? 'วัน' :
                  order.services.estimated_duration_unit === 'weeks' ? 'สัปดาห์' :
                  order.services.estimated_duration_unit === 'months' ? 'เดือน' :
                  order.services.estimated_duration_unit || ''}
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      {/* Assign Staff Modal */}
      {showAssignModal ? (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <UserPlus size={18} className="text-indigo-600" /> {locale === 'en' ? 'Assign employees' : locale === 'zh' ? '分配员工' : ' มอบหมายพนักงาน               '}</h3>
              <button
                type="button"
                onClick={() => { setShowAssignModal(false); setAssigningStaffId(''); setAssignNote('') }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {order.status === 'pending' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  {locale === 'en' ? 'This order is also &ldquo;Pending&rdquo; — Assignment will' : locale === 'zh' ? '该订单也处于“待处理”状态— 作业将' : '                   ออเดอร์นี้ยังเป็น &ldquo;รอดำเนินการ&rdquo; — การมอบหมายจะ'}<strong>{locale === 'en' ? 'Confirm order' : locale === 'zh' ? '确认订单' : 'ยืนยันออเดอร์'}</strong>{locale === 'en' ? 'automatic' : locale === 'zh' ? '自动的' : 'ให้อัตโนมัติ                 '}</div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{locale === 'en' ? 'Choose employees' : locale === 'zh' ? '选择员工' : 'เลือกพนักงาน'}</label>
                {staffList.length === 0 ? (
                  <p className="text-sm text-gray-400">{locale === 'en' ? 'No employees found in the system' : locale === 'zh' ? '系统中未找到员工' : 'ไม่พบพนักงานในระบบ'}</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {staffList.map((s) => {
                        const { locale } = useI18n();
                      const alreadyAssigned = assignments.some((a: any) => a.profiles?.id === s.id || a.staff_id === s.id)
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            alreadyAssigned ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100' :
                            assigningStaffId === s.id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="staffSelect"
                            value={s.id}
                            disabled={alreadyAssigned}
                            checked={assigningStaffId === s.id}
                            onChange={() => setAssigningStaffId(s.id)}
                            className="hidden"
                          />
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            assigningStaffId === s.id ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {(s.display_name || s.email || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{s.display_name || s.email}</p>
                            {s.phone ? <p className="text-xs text-gray-500">{s.phone}</p> : null}
                            {alreadyAssigned ? <p className="text-xs text-amber-600">{locale === 'en' ? 'Assigned' : locale === 'zh' ? '已分配' : 'มอบหมายแล้ว'}</p> : null}
                          </div>
                          {assigningStaffId === s.id ? (
                            <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                          ) : null}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{locale === 'en' ? 'Note (optional)' : locale === 'zh' ? '注意（可选）' : 'หมายเหตุ (ไม่บังคับ)'}</label>
                <textarea
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  rows={2}
                  placeholder={locale === 'en' ? 'Job details, special instructions...' : locale === 'zh' ? '工作细节、特别说明...' : 'รายละเอียดงาน, คำแนะนำพิเศษ...'}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setShowAssignModal(false); setAssigningStaffId(''); setAssignNote('') }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '                 ยกเลิก               '}</button>
              <button
                type="button"
                disabled={!assigningStaffId || assignLoading}
                onClick={() => void handleAssignStaff()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {assignLoading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {assignLoading ? 'กำลังมอบหมาย...' : 'มอบหมายงาน'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}