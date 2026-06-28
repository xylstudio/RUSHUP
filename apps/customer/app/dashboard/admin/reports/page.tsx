'use client';
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BarChart3, CalendarDays, Download, RefreshCcw, Users, Wallet, FileText, Sparkles } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../../../lib/supabaseClient'
import { trackProductEvent } from '../../../../lib/analytics/events'
import { useI18n } from "@/lib/I18nContext";

type WorkReportRow = {
  id: string
  order_id: string
  staff_id: string
  customer_id: string
  problems_found?: string | null
  next_visit_date?: string | null
  updated_at?: string | null
  created_at?: string | null
}

type OrderRow = {
  id: string
  order_code?: string | null
  status?: string | null
  total?: number | null
  service_id?: string | null
  pricing_period?: string | null
  total_sessions?: number | null
  completed_sessions?: number | null
  created_at?: string | null
}

type ServiceRow = {
  id: string
  service_name?: string | null
  name?: string | null
}

type ProductEventRow = {
  id: string
  event_name: string
  created_at?: string | null
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)

const toDateOnlyKey = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const csvEscape = (value: unknown) => {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

const formatDateTH = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDateShort = (value: Date) =>
  value.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })

export default function AdminReports() {
    const { locale } = useI18n();
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reports, setReports] = useState<WorkReportRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [services, setServices] = useState<ServiceRow[]>([])
  const [productEvents, setProductEvents] = useState<ProductEventRow[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activePreset, setActivePreset] = useState<'all' | '7d' | '30d' | 'month'>('all')
  const [trendDays, setTrendDays] = useState<7 | 30>(7)

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
        const [reportsRes, ordersRes, servicesRes] = await Promise.all([
          supabase
            .from('work_reports')
            .select('id, order_id, staff_id, customer_id, problems_found, next_visit_date, updated_at, created_at')
            .order('updated_at', { ascending: false })
            .limit(500),
          supabase
            .from('orders')
            .select('id, order_code, status, total, service_id, pricing_period, total_sessions, completed_sessions, created_at')
            .order('created_at', { ascending: false })
            .limit(1000),
          supabase
            .from('services')
            .select('id, service_name, name')
            .limit(500),
        ])

        if (reportsRes.error) throw reportsRes.error
        if (ordersRes.error) throw ordersRes.error
        if (servicesRes.error) throw servicesRes.error

        const safeReports = (reportsRes.data as WorkReportRow[]) || []
        setReports(safeReports)
        setOrders((ordersRes.data as OrderRow[]) || [])
        setServices((servicesRes.data as ServiceRow[]) || [])

        const { data: eventsData, error: eventsError } = await supabase
          .from('product_events')
          .select('id, event_name, created_at')
          .order('created_at', { ascending: false })
          .limit(3000)

        if (eventsError) {
          console.warn('Load product_events failed:', eventsError.message)
          setProductEvents([])
        } else {
          setProductEvents((eventsData as ProductEventRow[]) || [])
        }

        trackProductEvent('admin_reports_viewed', {
          reportCount: safeReports.length,
          orderCount: ((ordersRes.data as OrderRow[]) || []).length,
        })
      } catch (e: any) {
        setError(e?.message || 'โหลดรายงานไม่สำเร็จ')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const serviceNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of services) {
      map.set(item.id, item.service_name || item.name || item.id)
    }
    return map
  }, [services])

  const orderById = useMemo(() => {
    const map = new Map<string, OrderRow>()
    for (const order of orders) {
      map.set(order.id, order)
    }
    return map
  }, [orders])

  const filteredReports = useMemo(() => {
    const hasStart = !!startDate
    const hasEnd = !!endDate

    if (!hasStart && !hasEnd) return reports

    return reports.filter((row) => {
      const rowDateKey = toDateOnlyKey(row.updated_at || row.created_at)
      if (!rowDateKey) return false
      if (hasStart && rowDateKey < startDate) return false
      if (hasEnd && rowDateKey > endDate) return false
      return true
    })
  }, [reports, startDate, endDate])

  const filteredOrders = useMemo(() => {
    const orderIds = new Set(filteredReports.map((row) => row.order_id).filter(Boolean))
    return orders.filter((order) => orderIds.has(order.id))
  }, [orders, filteredReports])

  const filteredProductEvents = useMemo(() => {
    const hasStart = !!startDate
    const hasEnd = !!endDate
    if (!hasStart && !hasEnd) return productEvents

    return productEvents.filter((row) => {
      const eventDateKey = toDateOnlyKey(row.created_at)
      if (!eventDateKey) return false
      if (hasStart && eventDateKey < startDate) return false
      if (hasEnd && eventDateKey > endDate) return false
      return true
    })
  }, [productEvents, startDate, endDate])

  const eventFunnel = useMemo(() => {
    const countByName = new Map<string, number>()
    for (const event of filteredProductEvents) {
      const key = String(event.event_name || '')
      countByName.set(key, (countByName.get(key) || 0) + 1)
    }

    const staffSubmitted = countByName.get('work_report_submitted') || 0
    const customerViewed = countByName.get('customer_reports_viewed') || 0
    const adminViewed = countByName.get('admin_reports_viewed') || 0
    const csvExported = countByName.get('admin_reports_csv_exported') || 0

    const viewRate = staffSubmitted > 0 ? Math.round((customerViewed / staffSubmitted) * 100) : 0
    const exportRate = adminViewed > 0 ? Math.round((csvExported / adminViewed) * 100) : 0

    return {
      staffSubmitted,
      customerViewed,
      adminViewed,
      csvExported,
      viewRate,
      exportRate,
      total: filteredProductEvents.length,
    }
  }, [filteredProductEvents])

  const eventTrend = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const start = new Date(now)
    start.setDate(now.getDate() - (trendDays - 1))

    const buckets: Record<string, {
      key: string
      label: string
      work_report_submitted: number
      customer_reports_viewed: number
      admin_reports_viewed: number
      admin_reports_csv_exported: number
    }> = {}

    for (let index = 0; index < trendDays; index += 1) {
      const day = new Date(start)
      day.setDate(start.getDate() + index)
      const key = day.toISOString().slice(0, 10)
      buckets[key] = {
        key,
        label: formatDateShort(day),
        work_report_submitted: 0,
        customer_reports_viewed: 0,
        admin_reports_viewed: 0,
        admin_reports_csv_exported: 0,
      }
    }

    for (const item of filteredProductEvents) {
      const key = toDateOnlyKey(item.created_at)
      if (!key || !buckets[key]) continue
      if (item.event_name === 'work_report_submitted') buckets[key].work_report_submitted += 1
      if (item.event_name === 'customer_reports_viewed') buckets[key].customer_reports_viewed += 1
      if (item.event_name === 'admin_reports_viewed') buckets[key].admin_reports_viewed += 1
      if (item.event_name === 'admin_reports_csv_exported') buckets[key].admin_reports_csv_exported += 1
    }

    const rows = Object.values(buckets)
    const maxTotal = rows.reduce((acc, row) => {
      const total = row.work_report_submitted + row.customer_reports_viewed + row.admin_reports_viewed + row.admin_reports_csv_exported
      return Math.max(acc, total)
    }, 1)

    return { rows, maxTotal }
  }, [filteredProductEvents, trendDays])

  const trendChartRows = useMemo(() => {
    return eventTrend.rows.map((row) => {
      const submit = row.work_report_submitted
      const customerView = row.customer_reports_viewed
      const adminView = row.admin_reports_viewed
      const csvExport = row.admin_reports_csv_exported

      return {
        label: row.label,
        submit,
        customerView,
        adminView,
        csvExport,
        customerViewRate: submit > 0 ? Math.round((customerView / submit) * 100) : 0,
        adminExportRate: adminView > 0 ? Math.round((csvExport / adminView) * 100) : 0,
      }
    })
  }, [eventTrend.rows])

  const trendRates = useMemo(() => {
    const viewRates = trendChartRows
      .filter((row) => row.submit > 0)
      .map((row) => row.customerViewRate)
    const exportRates = trendChartRows
      .filter((row) => row.adminView > 0)
      .map((row) => row.adminExportRate)

    const avgViewRate = viewRates.length > 0 ? Math.round(viewRates.reduce((acc, item) => acc + item, 0) / viewRates.length) : 0
    const avgExportRate = exportRates.length > 0 ? Math.round(exportRates.reduce((acc, item) => acc + item, 0) / exportRates.length) : 0

    return {
      avgViewRate,
      avgExportRate,
      latestRows: trendChartRows.slice(-8),
    }
  }, [trendChartRows])

  const hasTelemetryTrendData = useMemo(() => {
    return trendChartRows.some((row) => row.submit + row.customerView + row.adminView + row.csvExport > 0)
  }, [trendChartRows])

  const analytics = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()

    let completedRevenue = 0
    let activeOrders = 0
    const serviceCount = new Map<string, number>()

    for (const order of filteredOrders) {
      const status = String(order.status || '').toLowerCase()
      const total = Number(order.total) || 0
      if (status === 'completed' || status === 'paid') {
        completedRevenue += total
      }
      if (status === 'confirmed' || status === 'in_progress' || status === 'pending') {
        activeOrders += 1
      }
      if (order.service_id) {
        serviceCount.set(order.service_id, (serviceCount.get(order.service_id) || 0) + 1)
      }
    }

    const reportsThisMonth = filteredReports.filter((row) => {
      const date = new Date(row.updated_at || row.created_at || 0)
      return date.getFullYear() === year && date.getMonth() === month
    }).length

    const activeStaff = new Set(filteredReports.map((row) => row.staff_id).filter(Boolean)).size
    const customersServed = new Set(filteredReports.map((row) => row.customer_id).filter(Boolean)).size

    const topServices = Array.from(serviceCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([serviceId, count]) => ({
        serviceId,
        label: serviceNameById.get(serviceId) || serviceId,
        count,
      }))

    return {
      completedRevenue,
      activeOrders,
      reportsThisMonth,
      reportsInRange: filteredReports.length,
      activeStaff,
      customersServed,
      totalReports: filteredReports.length,
      topServices,
    }
  }, [filteredOrders, filteredReports, serviceNameById])

  const recentReports = useMemo(() => {
    return filteredReports.slice(0, 15).map((report) => {
      const linkedOrder = orderById.get(report.order_id)
      return {
        id: report.id,
        orderCode: linkedOrder?.order_code || report.order_id?.slice?.(0, 8) || '-',
        status: linkedOrder?.status || '-',
        staffId: report.staff_id || '-',
        customerId: report.customer_id || '-',
        pricingPeriod: linkedOrder?.pricing_period || 'one-time',
        totalSessions: linkedOrder?.total_sessions || 1,
        completedSessions: linkedOrder?.completed_sessions || 0,
        updatedAt: report.updated_at || report.created_at || null,
      }
    })
  }, [filteredReports, orderById])

  const exceptionInbox = useMemo(() => {
    const now = new Date()
    const reportedOrderIds = new Set(filteredReports.map((item) => item.order_id).filter(Boolean))

    const issues = filteredReports
      .filter((item) => !!String(item.problems_found || '').trim())
      .slice(0, 6)
      .map((item) => {
        const linkedOrder = orderById.get(item.order_id)
        return {
          id: `issue-${item.id}`,
          severity: 'high' as const,
          title: 'พบปัญหาในรายงานหน้างาน',
          subtitle: linkedOrder?.order_code || item.order_id?.slice?.(0, 8) || item.id,
          date: item.updated_at || item.created_at || null,
        }
      })

    const missingFollowup = filteredReports
      .filter((item) => {
        if (item.next_visit_date) return false
        const ref = new Date(item.updated_at || item.created_at || 0)
        if (Number.isNaN(ref.getTime())) return false
        const diffDays = (now.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24)
        return diffDays >= 14
      })
      .slice(0, 4)
      .map((item) => {
        const linkedOrder = orderById.get(item.order_id)
        return {
          id: `followup-${item.id}`,
          severity: 'medium' as const,
          title: 'ยังไม่มีนัดหมายรอบถัดไป',
          subtitle: linkedOrder?.order_code || item.order_id?.slice?.(0, 8) || item.id,
          date: item.updated_at || item.created_at || null,
        }
      })

    const noReportYet = filteredOrders
      .filter((order) => {
        const status = String(order.status || '').toLowerCase()
        if (!(status === 'confirmed' || status === 'in_progress')) return false
        return !reportedOrderIds.has(order.id)
      })
      .slice(0, 4)
      .map((order) => ({
        id: `noreport-${order.id}`,
        severity: 'low' as const,
        title: 'งานที่ยังไม่มีรายงานหน้างาน',
        subtitle: order.order_code || order.id.slice(0, 8),
        date: order.created_at || null,
      }))

    return [...issues, ...missingFollowup, ...noReportYet].slice(0, 10)
  }, [filteredReports, filteredOrders, orderById])

  const downloadCsv = () => {
    if (filteredReports.length === 0) return

    const header = ['report_id', 'order_code', 'order_status', 'staff_id', 'customer_id', 'updated_at']
    const rows = filteredReports.map((report) => {
      const linkedOrder = orderById.get(report.order_id)
      return [
        report.id,
        linkedOrder?.order_code || report.order_id || '-',
        linkedOrder?.status || '-',
        report.staff_id || '-',
        report.customer_id || '-',
        report.updated_at || report.created_at || '-',
      ]
    })

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `work-reports-${startDate || 'all'}-to-${endDate || 'all'}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)

    trackProductEvent('admin_reports_csv_exported', {
      reportCount: filteredReports.length,
      startDate: startDate || null,
      endDate: endDate || null,
      source: 'work_reports',
    })
  }

  const downloadTelemetryCsv = () => {
    if (trendChartRows.length === 0) return

    const header = [
      'date_label',
      'staff_submitted',
      'customer_viewed',
      'admin_viewed',
      'csv_exported',
      'customer_view_rate_pct',
      'admin_export_rate_pct',
    ]

    const rows = trendChartRows.map((row) => [
      row.label,
      row.submit,
      row.customerView,
      row.adminView,
      row.csvExport,
      row.customerViewRate,
      row.adminExportRate,
    ])

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `telemetry-trend-${trendDays}d.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)

    trackProductEvent('admin_reports_csv_exported', {
      source: 'telemetry_trend',
      trendDays,
      rowCount: trendChartRows.length,
      startDate: startDate || null,
      endDate: endDate || null,
    })
  }

  const downloadTelemetryJson = () => {
    if (trendChartRows.length === 0) return

    const payload = {
      exportedAt: new Date().toISOString(),
      trendDays,
      range: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary: {
        avgDailyCustomerViewRate: trendRates.avgViewRate,
        avgDailyAdminExportRate: trendRates.avgExportRate,
      },
      rows: trendChartRows,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `telemetry-trend-${trendDays}d.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)

    trackProductEvent('admin_reports_csv_exported', {
      source: 'telemetry_trend_json',
      trendDays,
      rowCount: trendChartRows.length,
      startDate: startDate || null,
      endDate: endDate || null,
    })
  }

  const applyDatePreset = (preset: 'all' | '7d' | '30d' | 'month') => {
    setActivePreset(preset)
    if (preset === 'all') {
      setStartDate('')
      setEndDate('')
      return
    }

    const now = new Date()
    const end = now.toISOString().slice(0, 10)
    let start = end

    if (preset === '7d') {
      const date = new Date(now)
      date.setDate(now.getDate() - 6)
      start = date.toISOString().slice(0, 10)
    } else if (preset === '30d') {
      const date = new Date(now)
      date.setDate(now.getDate() - 29)
      start = date.toISOString().slice(0, 10)
    } else if (preset === 'month') {
      const date = new Date(now.getFullYear(), now.getMonth(), 1)
      start = date.toISOString().slice(0, 10)
    }

    setStartDate(start)
    setEndDate(end)
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-[#ECECE6] pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 border border-[#E5E5DF] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">
              <BarChart3 className="h-3 w-3" /> Admin Report Center
            </span>
            <h1 className="mt-3 text-3xl font-light tracking-tight text-[#1A1A1A]">{locale === 'en' ? 'รายงานและสถิติ' : locale === 'zh' ? 'รายงานและสถิติ' : 'รายงานและสถิติ'}</h1>
            <p className="mt-1 text-sm text-[#70706B]">{locale === 'en' ? 'เน้นข้อมูลสำคัญ รายได้ ผลงาน และจุดที่ต้องติดตามจากข้อมูลจริง' : locale === 'zh' ? 'เน้นข้อมูลสำคัญ รายได้ ผลงาน และจุดที่ต้องติดตามจากข้อมูลจริง' : 'เน้นข้อมูลสำคัญ รายได้ ผลงาน และจุดที่ต้องติดตามจากข้อมูลจริง'}</p>
          </div>
            <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard/admin/reports/create-single"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
                >
                  <FileText size={14} className="text-indigo-500" />
                  {locale === 'en' ? 'Make an individual report' : locale === 'zh' ? '制作个人报告' : '                   ลงรายงานรายตัว                 '}</Link>
                <Link
                  href="/dashboard/admin/reports/create"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1F3A2C] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#162A20] transition-all shadow-sm shadow-emerald-100"
                >
                  <Sparkles size={14} className="text-emerald-300" />
                  {locale === 'en' ? '                   ลงรายงานแบบรวม                 ' : locale === 'zh' ? '                   ลงรายงานแบบรวม                 ' : '                   ลงรายงานแบบรวม                 '}</Link>
                <button
                  onClick={() => applyDatePreset('all')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-500 border border-gray-100 rounded-xl text-xs font-bold uppercase tracking-widest hover:text-gray-900 transition-all"
                >
                  <RefreshCcw size={14} />
                  {locale === 'en' ? '                   รีเซ็ต                 ' : locale === 'zh' ? '                   รีเซ็ต                 ' : '                   รีเซ็ต                 '}</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
          <div className="border-t border-[#E9E9E2] pt-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B5B5B0]">Completed Revenue</p>
                <p className="mt-1 text-2xl font-light text-[#1A1A1A]">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{loading ? '...' : formatMoney(analytics.completedRevenue)}</p>
              </div>
              <Wallet className="h-4 w-4 text-[#2A4532]" />
            </div>
          </div>

          <div className="border-t border-[#E9E9E2] pt-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B5B5B0]">Reports In Range</p>
                <p className="mt-1 text-2xl font-light text-[#1A1A1A]">{loading ? '...' : analytics.reportsInRange}</p>
              </div>
              <CalendarDays className="h-4 w-4 text-[#2A4532]" />
            </div>
          </div>

          <div className="border-t border-[#E9E9E2] pt-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B5B5B0]">Active Orders</p>
                <p className="mt-1 text-2xl font-light text-[#1A1A1A]">{loading ? '...' : analytics.activeOrders}</p>
              </div>
              <BarChart3 className="h-4 w-4 text-[#2A4532]" />
            </div>
          </div>

          <div className="border-t border-[#E9E9E2] pt-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B5B5B0]">Customers Served</p>
                <p className="mt-1 text-2xl font-light text-[#1A1A1A]">{loading ? '...' : analytics.customersServed}</p>
              </div>
              <Users className="h-4 w-4 text-[#2A4532]" />
            </div>
          </div>
        </div>
      </div>

      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="border border-[#ECECE6] bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F1EB] pb-3">
          <div className="inline-flex flex-wrap gap-2">
            <button
              onClick={() => applyDatePreset('all')}
              className={`px-3 py-2 text-xs font-semibold border ${activePreset === 'all' ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-[#666666] border-[#E5E5DF]'}`}
            >
              {locale === 'en' ? '               ทั้งหมด             ' : locale === 'zh' ? '               ทั้งหมด             ' : '               ทั้งหมด             '}</button>
            <button
              onClick={() => applyDatePreset('7d')}
              className={`px-3 py-2 text-xs font-semibold border ${activePreset === '7d' ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-[#666666] border-[#E5E5DF]'}`}
            >
              {locale === 'en' ? '               7 วัน             ' : locale === 'zh' ? '               7 วัน             ' : '               7 วัน             '}</button>
            <button
              onClick={() => applyDatePreset('30d')}
              className={`px-3 py-2 text-xs font-semibold border ${activePreset === '30d' ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-[#666666] border-[#E5E5DF]'}`}
            >
              {locale === 'en' ? '               30 วัน             ' : locale === 'zh' ? '               30 วัน             ' : '               30 วัน             '}</button>
            <button
              onClick={() => applyDatePreset('month')}
              className={`px-3 py-2 text-xs font-semibold border ${activePreset === 'month' ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-[#666666] border-[#E5E5DF]'}`}
            >
              {locale === 'en' ? '               เดือนนี้             ' : locale === 'zh' ? '               เดือนนี้             ' : '               เดือนนี้             '}</button>
          </div>

          <button
            onClick={downloadCsv}
            disabled={filteredReports.length === 0 || loading}
            className="inline-flex items-center gap-2 bg-[#1A1A1A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] mb-5 items-end">
          <div>
            <label className="block text-xs font-semibold text-[#666666] mb-1">{locale === 'en' ? 'วันที่เริ่ม' : locale === 'zh' ? 'วันที่เริ่ม' : 'วันที่เริ่ม'}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setActivePreset('all')
                setStartDate(e.target.value)
              }}
              className="xyl-input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#666666] mb-1">{locale === 'en' ? 'วันที่สิ้นสุด' : locale === 'zh' ? 'วันที่สิ้นสุด' : 'วันที่สิ้นสุด'}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setActivePreset('all')
                setEndDate(e.target.value)
              }}
              className="xyl-input w-full"
            />
          </div>
          <div>
            <div className="border-t border-[#E9E9E2] pt-3 text-right md:min-w-[180px]">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B5B5B0]">Visible Reports</div>
              <div className="mt-1 text-2xl font-light text-[#1A1A1A]">{loading ? '...' : filteredReports.length}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="border border-[#ECECE6] bg-white p-4 lg:col-span-2">
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#1A1A1A] mb-3">Telemetry Funnel v1</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="border-t border-[#E9E9E2] pt-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A9A94]">Staff Submitted</div>
                <div className="mt-1 text-2xl font-light text-[#1A1A1A]">{loading ? '...' : eventFunnel.staffSubmitted}</div>
              </div>
              <div className="border-t border-[#E9E9E2] pt-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A9A94]">Customer Viewed</div>
                <div className="mt-1 text-2xl font-light text-[#1A1A1A]">{loading ? '...' : eventFunnel.customerViewed}</div>
              </div>
              <div className="border-t border-[#E9E9E2] pt-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A9A94]">Admin Viewed</div>
                <div className="mt-1 text-2xl font-light text-[#1A1A1A]">{loading ? '...' : eventFunnel.adminViewed}</div>
              </div>
              <div className="border-t border-[#E9E9E2] pt-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A9A94]">CSV Exported</div>
                <div className="mt-1 text-2xl font-light text-[#1A1A1A]">{loading ? '...' : eventFunnel.csvExported}</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#666666]">
              <span className="border border-[#E5E5DF] bg-white px-2.5 py-1">Customer View Rate: {eventFunnel.viewRate}%</span>
              <span className="border border-[#E5E5DF] bg-white px-2.5 py-1">Admin Export Rate: {eventFunnel.exportRate}%</span>
              <span className="border border-[#E5E5DF] bg-white px-2.5 py-1">Events In Range: {eventFunnel.total}</span>
            </div>
          </div>

          <div className="border border-[#ECECE6] bg-white p-4 lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#1A1A1A]">Telemetry Trend</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadTelemetryCsv}
                  disabled={!hasTelemetryTrendData || loading}
                  className="inline-flex items-center gap-1.5 border border-[#E5E5DF] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#666666] hover:text-[#1A1A1A] disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> Export Telemetry CSV
                </button>
                <button
                  onClick={downloadTelemetryJson}
                  disabled={!hasTelemetryTrendData || loading}
                  className="inline-flex items-center gap-1.5 border border-[#E5E5DF] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#666666] hover:text-[#1A1A1A] disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> Export Telemetry JSON
                </button>

                <div className="inline-flex border border-[#E5E5DF] bg-white p-1">
                  <button
                    onClick={() => setTrendDays(7)}
                    className={`px-2.5 py-1 text-xs font-semibold ${trendDays === 7 ? 'bg-[#1A1A1A] text-white' : 'text-[#666666]'}`}
                  >
                    {locale === 'en' ? '                     7 วัน                   ' : locale === 'zh' ? '                     7 วัน                   ' : '                     7 วัน                   '}</button>
                  <button
                    onClick={() => setTrendDays(30)}
                    className={`px-2.5 py-1 text-xs font-semibold ${trendDays === 30 ? 'bg-[#1A1A1A] text-white' : 'text-[#666666]'}`}
                  >
                    {locale === 'en' ? '                     30 วัน                   ' : locale === 'zh' ? '                     30 วัน                   ' : '                     30 วัน                   '}</button>
                </div>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#666666]">
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#2A4532]" />Submit</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#4B7A59]" />Customer View</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#7FA08A]" />Admin View</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 bg-[#A9BFAF]" />CSV Export</span>
            </div>

            <div className="mb-4 h-64 border border-[#F3F3EF] bg-[#FDFDFB] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartRows}>
                  <CartesianGrid stroke="#ECECE7" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#666666' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#666666' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ border: '1px solid #E5E5DF', fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="submit" stroke="#2A4532" strokeWidth={2} dot={false} name="Submit" />
                  <Line type="monotone" dataKey="customerView" stroke="#4B7A59" strokeWidth={2} dot={false} name="Customer View" />
                  <Line type="monotone" dataKey="adminView" stroke="#7FA08A" strokeWidth={2} dot={false} name="Admin View" />
                  <Line type="monotone" dataKey="csvExport" stroke="#A9BFAF" strokeWidth={2} dot={false} name="CSV Export" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="border-t border-[#E9E9E2] pt-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A9A94]">Avg Daily Customer View Rate</div>
                <div className="mt-1 text-xl font-light text-[#1A1A1A]">{trendRates.avgViewRate}%</div>
              </div>
              <div className="border-t border-[#E9E9E2] pt-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A9A94]">Avg Daily Admin Export Rate</div>
                <div className="mt-1 text-xl font-light text-[#1A1A1A]">{trendRates.avgExportRate}%</div>
              </div>
            </div>

            <div className="space-y-2">
              {eventTrend.rows.map((row) => {
                const submit = row.work_report_submitted
                const customerView = row.customer_reports_viewed
                const adminView = row.admin_reports_viewed
                const csvExport = row.admin_reports_csv_exported
                const total = submit + customerView + adminView + csvExport
                const widthPercent = total > 0 ? Math.max(4, Math.round((total / eventTrend.maxTotal) * 100)) : 0

                return (
                  <div key={row.key} className="grid grid-cols-[76px_1fr_52px] items-center gap-2">
                    <div className="text-[11px] font-semibold text-[#666666]">{row.label}</div>
                    <div className="h-6 bg-[#F6F6F2] overflow-hidden flex">
                      {submit > 0 && <div className="h-full bg-[#2A4532]" style={{ width: `${Math.max(2, Math.round((submit / total) * widthPercent))}%` }} />}
                      {customerView > 0 && <div className="h-full bg-[#4B7A59]" style={{ width: `${Math.max(2, Math.round((customerView / total) * widthPercent))}%` }} />}
                      {adminView > 0 && <div className="h-full bg-[#7FA08A]" style={{ width: `${Math.max(2, Math.round((adminView / total) * widthPercent))}%` }} />}
                      {csvExport > 0 && <div className="h-full bg-[#A9BFAF]" style={{ width: `${Math.max(2, Math.round((csvExport / total) * widthPercent))}%` }} />}
                    </div>
                    <div className="text-right text-[11px] font-semibold text-[#666666]">{total}</div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 border border-[#F3F3EF] bg-[#FDFDFB] p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A9A94]">Daily Conversion Snapshot</div>
              <div className="space-y-1.5">
                {trendRates.latestRows.length === 0 ? (
                  <div className="text-xs text-[#70706B]">{locale === 'en' ? 'ยังไม่มีข้อมูล trend' : locale === 'zh' ? 'ยังไม่มีข้อมูล trend' : 'ยังไม่มีข้อมูล trend'}</div>
                ) : (
                  trendRates.latestRows.map((row) => (
                    <div key={row.label} className="grid grid-cols-[68px_1fr_1fr] gap-2 text-[11px]">
                      <span className="font-semibold text-[#666666]">{row.label}</span>
                      <span className="text-[#2A4532]">View {row.customerViewRate}%</span>
                      <span className="text-[#4B7A59]">Export {row.adminExportRate}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="border border-[#ECECE6] bg-white p-4 lg:col-span-2">
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#1A1A1A] mb-3">Exception Inbox v1</h3>
            <div className="space-y-2">
              {loading ? (
                <div className="text-sm text-[#70706B]">{locale === 'en' ? 'Loading...' : locale === 'zh' ? '加载中...' : 'กำลังโหลด...'}</div>
              ) : exceptionInbox.length === 0 ? (
                <div className="text-sm text-[#70706B]">{locale === 'en' ? 'ไม่พบรายการเสี่ยงในช่วงเวลานี้' : locale === 'zh' ? 'ไม่พบรายการเสี่ยงในช่วงเวลานี้' : 'ไม่พบรายการเสี่ยงในช่วงเวลานี้'}</div>
              ) : (
                exceptionInbox.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-[#F3F3EF] px-0 py-2 last:border-b-0">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1A1A1A] truncate">{item.title}</div>
                      <div className="text-xs text-[#70706B] truncate">{item.subtitle}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase border ${
                        item.severity === 'high'
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : item.severity === 'medium'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {item.severity}
                      </span>
                      <span className="text-[11px] text-[#9A9A94]">{formatDateTH(item.date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border border-[#ECECE6] bg-white p-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#1A1A1A] mb-3">Top Services</h3>
            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-[#70706B]">{locale === 'en' ? 'Loading...' : locale === 'zh' ? '加载中...' : 'กำลังโหลด...'}</div>
              ) : analytics.topServices.length === 0 ? (
                <div className="text-sm text-[#70706B]">{locale === 'en' ? 'ยังไม่มีข้อมูลบริการ' : locale === 'zh' ? 'ยังไม่มีข้อมูลบริการ' : 'ยังไม่มีข้อมูลบริการ'}</div>
              ) : (
                analytics.topServices.map((item, index) => {
                  const max = analytics.topServices[0]?.count || 1
                  const widthPercent = Math.max(10, Math.round((item.count / max) * 100))
                  return (
                    <div key={item.serviceId}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-[#1A1A1A]">{index + 1}. {item.label}</span>
                        <span className="text-xs font-semibold text-[#666666]">{item.count}</span>
                      </div>
                      <div className="h-2 bg-[#F3F3EF]">
                        <div className="h-2 bg-[#2A4532]" style={{ width: `${widthPercent}%` }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="border border-[#ECECE6] bg-white p-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#1A1A1A] mb-3">Recent Work Reports</h3>
            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-[#70706B]">{locale === 'en' ? 'Loading...' : locale === 'zh' ? '加载中...' : 'กำลังโหลด...'}</div>
              ) : recentReports.length === 0 ? (
                <div className="text-sm text-[#70706B]">{locale === 'en' ? 'ยังไม่มีรายงาน' : locale === 'zh' ? 'ยังไม่มีรายงาน' : 'ยังไม่มีรายงาน'}</div>
              ) : (
                recentReports.map((item) => (
                  <div key={item.id} className="border-b border-[#F3F3EF] bg-[#FDFDFB] p-4 last:border-b-0 hover:bg-[#F9F9F7] transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="truncate text-sm font-bold text-[#1A1A1A]">{item.orderCode}</span>
                          {item.pricingPeriod === 'yearly' && (
                            <span className="bg-[#FAF7E6] text-[#A48E21] border border-[#EBE3B5] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">Annual Plan</span>
                          )}
                          {item.pricingPeriod === 'monthly' && (
                            <span className="bg-[#E6F1FA] text-[#2168A4] border border-[#B5D5EB] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">Monthly Care</span>
                          )}
                          {item.pricingPeriod === 'one-time' && (
                            <span className="bg-[#F1F1F1] text-[#666666] border border-[#E5E5DF] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">One-time</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#70706B]">
                          <span className="flex items-center gap-1"><Users size={12} className="text-[#A9A9A4]" /> {item.staffId.slice(0, 8)}</span>
                          {item.pricingPeriod !== 'one-time' && (
                            <span className="flex items-center gap-1 font-medium text-[#1F3A2C]">
                              <RefreshCcw size={12} />
                              Progress: {item.completedSessions}/{item.totalSessions}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-medium text-[#1A1A1A]">{formatDateTH(item.updatedAt)}</div>
                        <Link 
                          href={`/dashboard/admin/reports/edit/${item.id}`}
                          className="mt-1 inline-block text-[10px] font-bold uppercase text-[#A45A2A] hover:underline"
                        >
                          View Detail →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
