'use client';
import { useI18n } from '@/lib/I18nContext';

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
  RefreshCw,
  User,
  UserCheck,
  UserPlus,
  X,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { supabase, updateOrder } from '@/lib/supabaseClient'
import type { OrderStatus } from '@/lib/supabaseClient'
import { getFollowUpSourceOrderId, isFollowUpOrder } from '@/lib/serviceFlow'

type OrderRow = any
type StaffRow = any
type AssignmentRow = any

const getOrderStatusConfig = (locale: string): Record<string, { label: string; color: string }> => ({
  pending:     { label: locale === 'en' ? 'Pending' : locale === 'zh' ? '待处理' : 'รอดำเนินการ',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed:   { label: locale === 'en' ? 'Confirmed' : locale === 'zh' ? '已确认' : 'ยืนยันแล้ว',      color: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: locale === 'en' ? 'In Progress' : locale === 'zh' ? '进行中' : 'กำลังดำเนินการ', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  completed:   { label: locale === 'en' ? 'Completed' : locale === 'zh' ? '已完成' : 'เสร็จสิ้น',       color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:   { label: locale === 'en' ? 'Cancelled' : locale === 'zh' ? '已取消' : 'ยกเลิก',          color: 'bg-red-50 text-red-700 border-red-200' },
})

const getAssignStatusConfig = (locale: string): Record<string, { label: string; color: string }> => ({
  assigned:    { label: locale === 'en' ? 'Assigned' : locale === 'zh' ? '已分配' : 'มอบหมายแล้ว',     color: 'bg-gray-50 text-gray-600 border-gray-200' },
  accepted:    { label: locale === 'en' ? 'Accepted' : locale === 'zh' ? '已接受' : 'รับงานแล้ว',       color: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: locale === 'en' ? 'Working' : locale === 'zh' ? '工作中' : 'กำลังทำงาน',       color: 'bg-purple-50 text-purple-700 border-purple-200' },
  completed:   { label: locale === 'en' ? 'Done' : locale === 'zh' ? '已完成' : 'เสร็จแล้ว',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
})

export default function AdminJobAssignment() {
  const { locale } = useI18n();
  const { profile } = useAuth()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [staffList, setStaffList] = useState<StaffRow[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Modal
  const [modalOrder, setModalOrder] = useState<OrderRow | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Filter
  const [tab, setTab] = useState<'unassigned' | 'assigned'>('unassigned')

  useEffect(() => {
    const run = async () => {
      if (!profile || profile.role !== 'admin') return
      setLoading(true)

      const [ordersRes, staffRes, assignRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            id, order_code, status, total, calculated_price, base_price,
            scheduled_date, created_at, notes, special_instructions,
            profiles!orders_customer_id_fkey (display_name, email),
            services (service_name, billing_type),
            houses!orders_house_id_fkey (name, house_code, address)
          `)
          .not('status', 'in', '("completed","cancelled")')
          .order('created_at', { ascending: false }),

        supabase
          .from('profiles')
          .select('id, display_name, email, phone')
          .eq('role', 'staff')
          .order('display_name', { ascending: true }),

        supabase
          .from('job_assignments')
          .select(`
            id, order_id, staff_id, status, notes, assigned_at, created_at,
            profiles!job_assignments_staff_id_fkey (display_name, email, phone)
          `)
          .order('created_at', { ascending: false }),
      ])

      setOrders(ordersRes.data || [])
      setStaffList(staffRes.data || [])
      setAssignments(assignRes.data || [])
      setLoading(false)
    }
    void run()
  }, [profile, refreshKey])

  const formatTHB = (n: number | null | undefined) => {
    const v = typeof n === 'number' ? n : 0
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(v)
  }

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const orderTotal = (o: OrderRow) => Number(o.calculated_price ?? o.total ?? o.base_price ?? 0)

  const assignmentsForOrder = (orderId: string) =>
    assignments.filter((a) => a.order_id === orderId)

  const unassignedOrders = useMemo(
    () => orders.filter((o) => assignmentsForOrder(o.id).length === 0),
    [orders, assignments]
  )
  const assignedOrders = useMemo(
    () => orders.filter((o) => assignmentsForOrder(o.id).length > 0),
    [orders, assignments]
  )
  const displayOrders = tab === 'unassigned' ? unassignedOrders : assignedOrders
  const primaryDisplayOrders = useMemo(
    () => displayOrders.filter((order) => !isFollowUpOrder(order)),
    [displayOrders]
  )
  const followUpDisplayOrders = useMemo(
    () => displayOrders.filter((order) => isFollowUpOrder(order)),
    [displayOrders]
  )

  const handleAssign = async () => {
    if (!modalOrder || !selectedStaffId) return
    setSaving(true)
    setMsg(null)

    // Auto-confirm if still pending
    if (modalOrder.status === 'pending') {
      await updateOrder(modalOrder.id, { status: 'confirmed' as OrderStatus })
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
        orderId: modalOrder.id,
        staffId: selectedStaffId,
        note: assignNote.trim() || null,
        serviceName: modalOrder.services?.service_name || locale === 'en' ? 'Service' : locale === 'zh' ? '服务' : 'บริการ',
        scheduledDate: modalOrder.scheduled_date || null,
      }),
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setMsg({ type: 'err', text: 'มอบหมายไม่สำเร็จ: ' + (result?.error || response.statusText) })
    } else {
      setMsg({ type: 'ok', text: locale === 'en' ? 'Assigned successfully' : locale === 'zh' ? '分配成功' : 'มอบหมายงานแล้ว' })
      setModalOrder(null)
      setSelectedStaffId('')
      setAssignNote('')
      setRefreshKey((k) => k + 1)
      setTimeout(() => setMsg(null), 3000)
    }
    setSaving(false)
  }

  const handleRemove = async (assignmentId: string) => {
    if (!window.confirm('ต้องการยกเลิกการมอบหมายนี้ใช่หรือไม่?')) return
    const { error } = await supabase.from('job_assignments').delete().eq('id', assignmentId)
    if (!error) setRefreshKey((k) => k + 1)
  }

  if (!profile) return null
  if (profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{locale === 'en' ? 'You do not have permission to access this page.' : locale === 'zh' ? '您没有访问此页面的权限。' : 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้'}</p>
      </div>
    )
  }

  const renderOrderCard = (o: OrderRow, variant: 'primary' | 'follow-up') => {
      const { locale } = useI18n();
    const orderAssignments = assignmentsForOrder(o.id)
    const cfg = getOrderStatusConfig(locale as string)[o.status] || getOrderStatusConfig(locale as string)['pending']
    const followUpSourceOrderId = getFollowUpSourceOrderId(o)

    return (
      <div key={o.id} className={`border rounded-2xl p-5 transition-all ${variant === 'follow-up' ? 'bg-[#FFFCF4] border-[#E9DFC5] hover:border-[#D7C38D]' : 'bg-white border-gray-100 hover:border-indigo-100'}`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-bold text-gray-900">
                {o.order_code || o.id.slice(0, 8).toUpperCase()}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.color}`}>
                {cfg.label}
              </span>
              {variant === 'follow-up' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border border-[#D6C08F] bg-[#FAF4E7] text-[#7B5F22]">
                  {locale === 'en' ? '                   นัดต่อเนื่อง                 ' : locale === 'zh' ? '                   นัดต่อเนื่อง                 ' : '                   นัดต่อเนื่อง                 '}</span>
              ) : null}
            </div>
            <p className="text-sm font-semibold text-gray-800">{o.services?.service_name || '-'}</p>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1"><User size={11} />
                {o.profiles?.display_name || o.profiles?.email || '-'}
              </span>
              {o.houses ? (
                <span className="flex items-center gap-1"><MapPin size={11} />
                  {o.houses.name || o.houses.house_code}
                </span>
              ) : null}
              {o.scheduled_date ? (
                <span>{formatDate(o.scheduled_date)}</span>
              ) : null}
              {variant === 'follow-up' && followUpSourceOrderId ? (
                <span className="text-[#7B5F22] font-medium">{locale === 'en' ? 'ต่อจาก ' : locale === 'zh' ? 'ต่อจาก ' : 'ต่อจาก '}{followUpSourceOrderId.slice(0, 8)}</span>
              ) : null}
            </div>

            {orderAssignments.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {orderAssignments.map((a: AssignmentRow) => {
                    const { locale } = useI18n();
                  const asCfg = getAssignStatusConfig(locale as string)[a.status] || getAssignStatusConfig(locale as string)['assigned']
                  return (
                    <div
                      key={a.id}
                      className={`inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full border text-xs font-semibold ${asCfg.color}`}
                    >
                      <Link 
                        href={`/dashboard/admin/reports/edit/${a.id}`}
                        className="hover:underline flex items-center gap-1"
                      >
                        <FileText size={10} />
                        <span>{a.profiles?.display_name || a.profiles?.email || '-'}</span>
                      </Link>
                      <span className="opacity-60">· {asCfg.label}</span>
                      {a.status !== 'in_progress' && a.status !== 'completed' ? (
                        <button
                          type="button"
                          onClick={() => void handleRemove(a.id)}
                          className="ml-0.5 p-0.5 rounded-full hover:bg-black/10"
                          aria-label={locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : 'ยกเลิก'}
                        >
                          <X size={10} />
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-base font-bold text-gray-900">{formatTHB(orderTotal(o))}</p>
            </div>
            <button
              type="button"
              onClick={() => { setModalOrder(o); setSelectedStaffId(''); setAssignNote('') }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${variant === 'follow-up' ? 'text-[#7B5F22] bg-[#FAF4E7] hover:bg-[#F5ECD7] border-[#E2D1A7]' : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-100'}`}
            >
              <UserPlus size={13} /> {locale === 'en' ? ' มอบหมาย             ' : locale === 'zh' ? ' มอบหมาย             ' : ' มอบหมาย             '}</button>
            <Link
              href={`/dashboard/admin/orders/${o.id}`}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 border border-gray-100"
            >
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{locale === 'en' ? 'Assign Job' : locale === 'zh' ? '分配任务' : 'มอบหมายงาน'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {locale === 'en' ? '             รอมอบหมาย ' : locale === 'zh' ? '             รอมอบหมาย ' : '             รอมอบหมาย '}{unassignedOrders.length} {locale === 'en' ? ' งาน • มอบหมายแล้ว ' : locale === 'zh' ? ' งาน • มอบหมายแล้ว ' : ' งาน • มอบหมายแล้ว '}{assignedOrders.length} {locale === 'en' ? ' งาน           ' : locale === 'zh' ? ' งาน           ' : ' งาน           '}</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <RefreshCw size={15} />
          {locale === 'en' ? 'Refresh' : locale === 'zh' ? '刷新' : '           รีเฟรช         '}</button>
      </div>

      {/* Global msg */}
      {msg ? (
        <div className={`text-sm px-4 py-3 rounded-xl border ${
          msg.type === 'err' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
        }`}>
          {msg.text}
        </div>
      ) : null}

      {/* Tabs */}
      <div className="inline-flex p-1 bg-gray-100 rounded-xl">
        {([
          { key: 'unassigned', label: `รอมอบหมาย (${unassignedOrders.length})` },
          { key: 'assigned',   label: `มอบหมายแล้ว (${assignedOrders.length})` },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-52 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={20} />
          {locale === 'en' ? 'Loading...' : locale === 'zh' ? '加载中...' : '           กำลังโหลด...         '}</div>
      ) : displayOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 text-gray-400 gap-3">
          <UserCheck size={32} strokeWidth={1.5} />
          <p className="text-sm">{tab === 'unassigned' ? locale === 'en' ? 'No pending jobs' : locale === 'zh' ? '没有待分配任务' : 'ไม่มีงานที่รอมอบหมาย' : locale === 'en' ? 'No assigned jobs yet' : locale === 'zh' ? '尚无已分配任务' : 'ยังไม่มีงานที่มอบหมายแล้ว'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-500">{locale === 'en' ? 'New Jobs' : locale === 'zh' ? '新任务' : 'งานใหม่'}</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            {primaryDisplayOrders.length > 0 ? primaryDisplayOrders.map((o) => renderOrderCard(o, 'primary')) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-6 text-sm text-gray-400 text-center">
                {locale === 'en' ? '                 ไม่มีงานใหม่ในกลุ่มนี้               ' : locale === 'zh' ? '                 ไม่มีงานใหม่ในกลุ่มนี้               ' : '                 ไม่มีงานใหม่ในกลุ่มนี้               '}</div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E9DFC5]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#7B5F22]">{locale === 'en' ? 'Follow-up Jobs' : locale === 'zh' ? '复访任务' : 'งานดูแลต่อเนื่อง'}</span>
              <div className="h-px flex-1 bg-[#E9DFC5]" />
            </div>
            {followUpDisplayOrders.length > 0 ? followUpDisplayOrders.map((o) => renderOrderCard(o, 'follow-up')) : (
              <div className="rounded-2xl border border-dashed border-[#E9DFC5] bg-[#FFFCF4] px-5 py-6 text-sm text-[#B79A58] text-center">
                {locale === 'en' ? '                 ไม่มีงานดูแลต่อเนื่องในกลุ่มนี้               ' : locale === 'zh' ? '                 ไม่มีงานดูแลต่อเนื่องในกลุ่มนี้               ' : '                 ไม่มีงานดูแลต่อเนื่องในกลุ่มนี้               '}</div>
            )}
          </section>
        </div>
      )}

      {/* Assign Modal */}
      {modalOrder ? (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest mb-0.5">{locale === 'en' ? 'Assign Job' : locale === 'zh' ? '分配任务' : 'มอบหมายงาน'}</div>
                <h3 className="font-bold text-gray-900">
                  {modalOrder.services?.service_name || 'ไม่ระบุบริการ'}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
                  <p>
                    {modalOrder.order_code} · {modalOrder.profiles?.display_name || modalOrder.profiles?.email}
                  </p>
                  {isFollowUpOrder(modalOrder) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold border border-[#D6C08F] bg-[#FAF4E7] text-[#7B5F22]">
                      {locale === 'en' ? '                       นัดต่อเนื่อง                     ' : locale === 'zh' ? '                       นัดต่อเนื่อง                     ' : '                       นัดต่อเนื่อง                     '}</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOrder(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {modalOrder.status === 'pending' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  {locale === 'en' ? '                   ออเดอร์นี้ยัง &ldquo;รอดำเนินการ&rdquo; — การมอบหมายจะ' : locale === 'zh' ? '                   ออเดอร์นี้ยัง &ldquo;รอดำเนินการ&rdquo; — การมอบหมายจะ' : '                   ออเดอร์นี้ยัง &ldquo;รอดำเนินการ&rdquo; — การมอบหมายจะ'}<strong>{locale === 'en' ? 'ยืนยัน' : locale === 'zh' ? 'ยืนยัน' : 'ยืนยัน'}</strong>{locale === 'en' ? 'ให้' : locale === 'zh' ? 'ให้' : 'ให้'}{' '}{locale === 'en' ? 'อัตโนมัติ                 ' : locale === 'zh' ? 'อัตโนมัติ                 ' : 'อัตโนมัติ                 '}</div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{locale === 'en' ? 'Choose employees' : locale === 'zh' ? '选择员工' : 'เลือกพนักงาน'}</label>
                {staffList.length === 0 ? (
                  <p className="text-sm text-gray-400">{locale === 'en' ? 'No employees found in the system' : locale === 'zh' ? '系统中未找到员工' : 'ไม่พบพนักงานในระบบ'}</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {staffList.map((s) => {
                        const { locale } = useI18n();
                      const alreadyAssigned = assignmentsForOrder(modalOrder.id).some(
                        (a: AssignmentRow) => a.staff_id === s.id
                      )
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            alreadyAssigned ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100' :
                            selectedStaffId === s.id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-100 hover:border-indigo-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="staff"
                            value={s.id}
                            disabled={alreadyAssigned}
                            checked={selectedStaffId === s.id}
                            onChange={() => setSelectedStaffId(s.id)}
                            className="hidden"
                          />
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            selectedStaffId === s.id ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {(s.display_name || s.email || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{s.display_name || s.email}</p>
                            {s.phone ? <p className="text-xs text-gray-500">{s.phone}</p> : null}
                            {alreadyAssigned ? <p className="text-xs text-amber-600">{locale === 'en' ? 'Assigned' : locale === 'zh' ? '已分配' : 'มอบหมายแล้ว'}</p> : null}
                          </div>
                          {selectedStaffId === s.id ? <CheckCircle2 size={16} className="text-indigo-600 shrink-0" /> : null}
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
                onClick={() => setModalOrder(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '                 ยกเลิก               '}</button>
              <button
                type="button"
                disabled={!selectedStaffId || saving}
                onClick={() => void handleAssign()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {saving ? 'กำลังมอบหมาย...' : 'มอบหมายงาน'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
