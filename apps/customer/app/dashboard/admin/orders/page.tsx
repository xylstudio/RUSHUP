'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  TrendingUp,
  User,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { useI18n } from '@/lib/I18nContext'
import { appCopy, orderStatusLabel, pickLocalizedText } from '@/lib/appLocale'
import { getFollowUpSourceOrderId, isFollowUpOrder } from '@/lib/serviceFlow'
import { formatCurrencyByLocale, formatDateByLocale } from '@/lib/localeFormat'

type OrderRow = any

const STATUS_CONFIG: Record<string, { color: string; dot: string }> = {
  pending:     { color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
  confirmed:   { color: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500' },
  in_progress: { color: 'bg-purple-50 text-purple-700 border-purple-200',    dot: 'bg-purple-500' },
  completed:   { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  cancelled:   { color: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-400' },
}

const ALL_STATUSES = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const
type FilterStatus = (typeof ALL_STATUSES)[number]

export default function AdminOrdersPage() {
  const { profile } = useAuth()
  const { locale } = useI18n()

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const run = async () => {
      if (!profile) return
      if (profile.role !== 'admin') return

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
          scheduled_date,
          preferred_time_start,
          special_instructions,
          notes,
          created_at,
          customer_id,
          profiles!orders_customer_id_fkey (
            display_name,
            email,
            customer_base_code
          ),
          services (
            service_name,
            service_code,
            billing_type
          ),
          houses!orders_house_id_fkey (
            house_code,
            name,
            address
          ),
          documents (
            id,
            type,
            document_code,
            status
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message || pickLocalizedText(locale, appCopy.adminOrders.loadFailed))
        setOrders([])
      } else {
        setOrders(data || [])
      }
      setLoading(false)
    }

    void run()
  }, [profile, refreshKey, locale])

  const formatTHB = (n: number | null | undefined) => {
    return formatCurrencyByLocale(typeof n === 'number' ? n : 0, locale)
  }

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '-'
    return formatDateByLocale(iso, locale, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const orderTotal = (o: OrderRow) => Number(o.calculated_price ?? o.total ?? o.base_price ?? 0)

  const docSummary = (o: OrderRow) => {
    const docs: any[] = Array.isArray(o.documents) ? o.documents : []
    if (docs.some((d) => d.type === 'receipt'))   return { label: pickLocalizedText(locale, appCopy.adminOrders.hasReceipt), tone: 'text-emerald-600' }
    if (docs.some((d) => d.type === 'invoice'))   return { label: pickLocalizedText(locale, appCopy.adminOrders.hasInvoice), tone: 'text-indigo-600' }
    if (docs.some((d) => d.type === 'quotation')) return { label: pickLocalizedText(locale, appCopy.adminOrders.hasQuotation), tone: 'text-blue-600' }
    return { label: pickLocalizedText(locale, appCopy.adminOrders.noDocuments), tone: 'text-gray-400' }
  }

  const billingLabel = (bt: string | null | undefined) => {
    if (bt === 'one-time')  return pickLocalizedText(locale, appCopy.adminOrders.oneTime)
    if (bt === 'recurring') return pickLocalizedText(locale, appCopy.adminOrders.recurring)
    if (bt === 'both')      return pickLocalizedText(locale, appCopy.adminOrders.flexible)
    return null
  }

  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of ALL_STATUSES.slice(1)) counts[s] = 0
    for (const o of orders) { if (o.status in counts) counts[o.status]++ }
    return counts
  }, [orders])

  const filtered = useMemo(() => {
    let list = orders
    if (filter !== 'all') list = list.filter((o) => o.status === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((o) => {
        const code    = (o.order_code || '').toLowerCase()
        const cust    = (o.profiles?.display_name || o.profiles?.email || '').toLowerCase()
        const service = (o.services?.service_name || '').toLowerCase()
        const house   = (o.houses?.name || o.houses?.house_code || '').toLowerCase()
        return code.includes(q) || cust.includes(q) || service.includes(q) || house.includes(q)
      })
    }
    return list
  }, [orders, filter, search])

  if (!profile) return null
  if (profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{pickLocalizedText(locale, appCopy.adminOrders.accessDenied)}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pickLocalizedText(locale, appCopy.adminOrders.title)}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pickLocalizedText(locale, appCopy.adminOrders.totalItems)} {orders.length} {pickLocalizedText(locale, appCopy.adminOrders.items)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin/orders/create"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-black"
          >
            {pickLocalizedText(locale, appCopy.adminOrders.createOrder)}
          </Link>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            <RefreshCw size={15} />
            {pickLocalizedText(locale, appCopy.adminOrders.refresh)}
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const).map((s) => {
          const cfg = STATUS_CONFIG[s]
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                filter === s ? cfg.color + ' shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`text-2xl font-bold ${filter === s ? '' : 'text-gray-900'}`}>{stats[s]}</div>
              <div className={`text-xs font-medium mt-0.5 ${filter === s ? '' : 'text-gray-500'}`}>{orderStatusLabel(locale, s)}</div>
            </button>
          )
        })}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
          <input
            type="text"
            placeholder={pickLocalizedText(locale, appCopy.adminOrders.searchPlaceholder)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-gray-400 shrink-0" />
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === s
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {s === 'all' ? pickLocalizedText(locale, appCopy.adminOrders.all) : orderStatusLabel(locale, s)}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 text-sm">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center h-52 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={20} />
          {pickLocalizedText(locale, appCopy.adminOrders.loading)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 text-gray-400 gap-3">
          <XCircle size={32} strokeWidth={1.5} />
          <p className="text-sm">{pickLocalizedText(locale, appCopy.adminOrders.empty)}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {filtered.map((o) => {
              const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG['pending']
              const doc = docSummary(o)
              const total = orderTotal(o)
              const bt = billingLabel(o.services?.billing_type)
              const followUpOrder = isFollowUpOrder(o)
              const followUpSourceOrderId = getFollowUpSourceOrderId(o)

              return (
                <Link
                  key={o.id}
                  href={`/dashboard/admin/orders/${o.id}`}
                  className="group block bg-white border border-gray-100 rounded-2xl p-5 hover:border-blue-200 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900">
                            {o.order_code || o.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.color}`}>
                            {orderStatusLabel(locale, o.status)}
                          </span>
                          {followUpOrder ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border border-[#D6C08F] bg-[#FAF4E7] text-[#7B5F22]">
                              {locale === 'en' ? 'Follow-up' : locale === 'zh' ? '复访' : 'นัดต่อเนื่อง'}
                            </span>
                          ) : null}
                          {bt ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 border border-gray-200 text-gray-600">
                              {bt}
                            </span>
                          ) : null}
                        </div>

                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {o.services?.service_name || pickLocalizedText(locale, appCopy.adminOrders.unspecifiedService)}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {o.profiles?.display_name || o.profiles?.email || o.customer_id?.slice(0, 8) || '-'}
                          </span>
                          {o.houses ? (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {o.houses.name || o.houses.house_code}
                            </span>
                          ) : null}
                          {o.scheduled_date ? (
                            <span className="flex items-center gap-1">
                              <CalendarDays size={12} />
                              {formatDate(o.scheduled_date)}
                              {o.preferred_time_start ? ` ${o.preferred_time_start.slice(0, 5)}` : ''}
                            </span>
                          ) : null}
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(o.created_at)}
                          </span>
                          {followUpOrder && followUpSourceOrderId ? (
                            <span className="flex items-center gap-1 text-[#7B5F22]">
                              <RefreshCw size={12} />
                              {locale === 'en' ? `From ${followUpSourceOrderId.slice(0, 8)}` : locale === 'zh' ? `来源 ${followUpSourceOrderId.slice(0, 8)}` : `ต่อจาก ${followUpSourceOrderId.slice(0, 8)}`}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 pl-6 sm:pl-0">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{formatTHB(total)}</div>
                        <div className={`text-[11px] font-medium ${doc.tone}`}>{doc.label}</div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-gray-400">
            <span>{pickLocalizedText(locale, appCopy.adminOrders.showing)} {filtered.length} {pickLocalizedText(locale, appCopy.adminOrders.items)}</span>
            <span className="flex items-center gap-1">
              <TrendingUp size={12} />
              {pickLocalizedText(locale, appCopy.adminOrders.totalAmount)} {formatTHB(filtered.reduce((s, o) => s + orderTotal(o), 0))}
            </span>
          </div>
        </>
      )}
    </div>
  )
}