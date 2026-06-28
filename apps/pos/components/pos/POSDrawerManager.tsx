'use client';
import React, { useState, useEffect } from 'react'
import { 
  Plus, Search, Edit3, Trash2, Loader2, 
  ChevronRight, Save, LayoutGrid, X,
  Menu as MenuIcon, LogOut, Settings, Wallet,
  ArrowDownLeft, ArrowUpRight, History, Banknote,
  Receipt, Landmark, Printer, ShieldCheck, RefreshCcw,
  AlertTriangle, ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Capacitor } from '@capacitor/core'
import POSPinModal from './POSPinModal'
import { printOpenDrawer } from '@/lib/printerUtils'
import { printGraphicModeZReport } from '@/lib/graphicPrinter'
import { playAppSound } from '@/lib/audioUtils';
import { useI18n } from "@/lib/I18nContext";

interface POSDrawerManagerProps {
  profile: any
  activeView: string
  allowedNav: any[]
  onSetView: (view: any) => void
  onShiftModalOpen?: () => void
  activeShift: any
  shiftStats: any
  onOpenShift: (cash: number) => Promise<void> | void
  onCloseShift: (cash: number) => Promise<void> | void
  fetchShiftStats: (id: string) => void
  setViewExtraHeader: (node: React.ReactNode) => void
  shopSettings: any
}

export default function POSDrawerManager({ 
  profile, activeView, allowedNav, onSetView, onShiftModalOpen, 
  activeShift, shiftStats, onOpenShift, onCloseShift, fetchShiftStats, setViewExtraHeader,
  shopSettings
}: POSDrawerManagerProps) {
    const { locale } = useI18n();
  const [openingCash, setOpeningCash] = useState(0)
  const [closingCash, setClosingCash] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [isClosingShift, setIsClosingShift] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isOpeningDrawerForShift, setIsOpeningDrawerForShift] = useState(false)
  const [transactionModal, setTransactionModal] = useState<{
    open: boolean
    type: 'pay_in' | 'pay_out' | null
    amount: string
    reason: string
  }>({
    open: false,
    type: null,
    amount: '',
    reason: '',
  })

  const getLocalDayBounds = () => {
    const now = new Date()
    const businessDay = now.getHours() < 4 ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now
    const start = new Date(businessDay.getFullYear(), businessDay.getMonth(), businessDay.getDate(), 4, 0, 0, 0)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    return { start, end }
  }

  useEffect(() => {
    if (activeShift) {
        fetchTransactions()
        fetchShiftStats(activeShift.id)
    }
  }, [activeShift])

  useEffect(() => {
    if (!activeShift?.id) {
      setTransactions([])
      return
    }

    const channel = supabase
      .channel(`drawer-transactions-${activeShift.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pos_shift_transactions' },
        () => {
          fetchTransactions()
          fetchShiftStats(activeShift.id)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pos_orders' },
        () => {
          fetchShiftStats(activeShift.id)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pos_order_payments' },
        () => {
          fetchShiftStats(activeShift.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeShift?.id])

  useEffect(() => {
    if (!activeShift?.id) return

    const handleShiftRefresh = (event: Event) => {
      const customEvent = event as CustomEvent<{ shiftId?: string }>
      const shiftId = customEvent.detail?.shiftId
      if (shiftId && shiftId !== activeShift.id) return
      fetchTransactions()
      fetchShiftStats(activeShift.id)
    }

    window.addEventListener('xyl-pos-shift-refresh', handleShiftRefresh as EventListener)
    return () => {
      window.removeEventListener('xyl-pos-shift-refresh', handleShiftRefresh as EventListener)
    }
  }, [activeShift?.id, fetchShiftStats])

  useEffect(() => {
    setViewExtraHeader(null);
    return () => setViewExtraHeader(null);
  }, [setViewExtraHeader]);

  const fetchTransactions = async () => {
      const { start, end } = getLocalDayBounds()
      const { data } = await supabase
        .from('pos_shift_transactions')
        .select('*')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .order('created_at', { ascending: false })
      if (data) setTransactions(data)
  }

  const handleOpenShift = async () => {
      if (loading) return
      setLoading(true)
      try {
        await onOpenShift(openingCash)
      } finally {
        setLoading(false)
      }
  }

  const handleOpenDrawerBeforeShift = async () => {
    if (isOpeningDrawerForShift) return
    setIsOpeningDrawerForShift(true)
    try {
      let printers = shopSettings?.printers || []
      let receiptPrinters = printers.filter((p: any) => p.type === 'receipt' || p.type === 'both')

      if (receiptPrinters.length === 0 && typeof window !== 'undefined') {
        const ip = localStorage.getItem('xylem_printer_ip')
        if (ip) {
          receiptPrinters = [{ ip, type: 'receipt', model: 'xprinter-xp-n160ii' }]
        }
      }

      if (receiptPrinters.length === 0) {
        alert('ยังไม่พบเครื่องปริ้นสำหรับเปิดลิ้นชัก')
        return
      }

      for (const rp of receiptPrinters) {
        if (!rp.ip) continue
        await printOpenDrawer(rp.ip, rp.model)
      }
    } catch (e) {
      console.error('Open drawer before shift failed:', e)
      alert('เปิดลิ้นชักไม่สำเร็จ กรุณาตรวจสอบเครื่องปริ้น')
    } finally {
      setIsOpeningDrawerForShift(false)
    }
  }

  const handleCloseShift = () => {
      setShowCloseConfirm(true)
  }

  const openTransactionModal = (type: 'pay_in' | 'pay_out') => {
    setTransactionModal({
      open: true,
      type,
      amount: '',
      reason: type === 'pay_in' ? 'นำเงินเข้า' : 'นำเงินออก',
    })
  }

  const closeTransactionModal = () => {
    if (loading) return
    setTransactionModal({
      open: false,
      type: null,
      amount: '',
      reason: '',
    })
  }

  const submitTransaction = async () => {
    if (!activeShift || !transactionModal.type) return

    const amount = Number(transactionModal.amount)
    if (!Number.isFinite(amount) || amount <= 0) return

    setLoading(true)
    try {
      const { error } = await supabase.from('pos_shift_transactions').insert({
        shift_id: activeShift.id,
        type: transactionModal.type,
        amount,
        reason: transactionModal.reason.trim() || (transactionModal.type === 'pay_in' ? 'นำเงินเข้า' : 'นำเงินออก'),
      })

      if (error) throw error

      await fetchTransactions()
      await fetchShiftStats(activeShift.id)
      setTransactionModal({
        open: false,
        type: null,
        amount: '',
        reason: '',
      })
    } catch (error) {
      console.error('Failed to save drawer transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmedClose = async () => {
      if (isClosingShift) return
      setIsClosingShift(true)
      try {
      const { start, end } = getLocalDayBounds()
      const branchId = activeShift?.branch_id || shopSettings?.branch_id || null

      let orderQuery = supabase
        .from('pos_orders')
        .select('status, order_type, payment_method, discount_amount, paid_at, branch_id, pos_order_payments(amount, payment_method)')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())

      if (branchId) {
        orderQuery = orderQuery.or(`branch_id.eq.${branchId},branch_id.is.null`)
      }

      const { data: orderRows } = await orderQuery
      const validOrders = orderRows || []

      let printers = shopSettings?.printers || []
      let receiptPrinters = printers.filter((p: any) => p.type === 'receipt' || p.type === 'both')
      
      if (receiptPrinters.length === 0) {
        let ip = localStorage.getItem('xylem_printer_ip')
        if (ip) {
          receiptPrinters = [{ ip, type: 'receipt', model: 'xprinter-xp-n160ii' }]
        }
      }
      
      if (receiptPrinters.length > 0) {
        const orderTypeGroups = new Map<string, { label: string; count: number }>()
        const txGroups = new Map<string, { label: string; amount: number }>()
        const paymentSummary = { cash: 0, transfer: 0, card: 0, other: 0 }
        const paymentCounts = { cash: 0, transfer: 0, card: 0, other: 0 }
        let discountTotal = 0

        const normalizePaymentBucket = (method?: string | null) => {
          const normalized = String(method || '').toLowerCase()
          if (normalized === 'cash' || normalized === 'cod') return 'cash'
          if (normalized === 'card' || normalized === 'credit_card') return 'card'
          if (normalized === 'bank_transfer' || normalized === 'transfer' || normalized === 'promptpay' || normalized === 'qr') return 'transfer'
          return 'other'
        }

        const orderTypeLabel = (type?: string | null) => {
          switch ((type || '').replace(/_/g, '-').toLowerCase()) {
            case 'dine-in':
              return 'ทานที่ร้าน'
            case 'takeaway':
              return 'สั่งกลับบ้าน'
            case 'delivery':
              return 'เดลิเวอรี่'
            default:
              return type ? type.toUpperCase() : 'ไม่ระบุ'
          }
        }

        validOrders.forEach((order: any) => {
          const status = String(order.status || '').toLowerCase()
          if (['cancelled', 'void', 'refunded'].includes(status)) return
          const hasPaymentRows = Array.isArray(order.pos_order_payments) && order.pos_order_payments.length > 0
          const isSoldOrder = ['paid', 'completed', 'delivered'].includes(status) || Boolean(order.paid_at) || hasPaymentRows
          if (!isSoldOrder) return

          discountTotal += Number(order.discount_amount || 0)

          const orderTypeKey = order.order_type || 'unknown'
          const existingOrderType = orderTypeGroups.get(orderTypeKey) || {
            label: orderTypeLabel(order.order_type),
            count: 0,
          }
          existingOrderType.count += 1
          orderTypeGroups.set(orderTypeKey, existingOrderType)

          const payments = order.pos_order_payments || []
          payments.forEach((payment: any) => {
            const bucket = normalizePaymentBucket(payment.payment_method)
            paymentSummary[bucket] += Number(payment.amount || 0)
            paymentCounts[bucket] += 1
          })

          if (payments.length === 0) {
            const bucket = normalizePaymentBucket(order.payment_method)
            const amount = Number(order.net_total ?? order.total_amount ?? 0)
            paymentSummary[bucket] += amount
            paymentCounts[bucket] += 1
          }
        })

        const payInTotal = transactions.filter((t: any) => t.type === 'pay_in').reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0)
        const payOutTotal = transactions.filter((t: any) => t.type === 'pay_out').reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0)
        txGroups.set('pay_in', { label: `รับเงินเข้าระหว่างกะ (${transactions.filter((t: any) => t.type === 'pay_in').length} ครั้ง)`, amount: payInTotal })
        txGroups.set('pay_out', { label: `จ่ายเงินออกระหว่างกะ (${transactions.filter((t: any) => t.type === 'pay_out').length} ครั้ง)`, amount: payOutTotal })

        const paymentBreakdown = [
          { label: 'เงินสด', amount: paymentSummary.cash, count: paymentCounts.cash },
          { label: 'โอนเงิน / QR', amount: paymentSummary.transfer, count: paymentCounts.transfer },
          { label: 'บัตรเครดิต / เดบิต', amount: paymentSummary.card, count: paymentCounts.card },
        ]
        if (paymentSummary.other > 0) paymentBreakdown.push({ label: 'อื่น ๆ', amount: paymentSummary.other, count: paymentCounts.other })

        const reportData = {
          shiftId: activeShift.id,
          openedAt: new Date(activeShift.opened_at).toLocaleString(),
          closedAt: new Date().toLocaleString(),
          staffName: profile?.full_name || 'Staff',
          startCash: activeShift?.start_cash || 0,
          orderCount: orderRows?.length || 0,
          cashOrderCount: paymentCounts.cash,
          nonCashOrderCount: paymentCounts.transfer + paymentCounts.card + paymentCounts.other,
          expectedCash: shiftStats?.expected || 0,
          actualCash: closingCash,
          difference: closingCash - (shiftStats?.expected || 0),
          cashSales: paymentSummary.cash,
          transferSales: paymentSummary.transfer,
          cardSales: paymentSummary.card,
          otherSales: paymentSummary.other,
          discountTotal,
          payInTotal,
          payOutTotal,
          paymentBreakdown,
          orderTypeBreakdown: Array.from(orderTypeGroups.values()).sort((a, b) => b.count - a.count),
          transactionBreakdown: Array.from(txGroups.values()),
          notes: closingCash === (shiftStats?.expected || 0)
            ? 'ยอดตรงตามระบบ'
            : closingCash < (shiftStats?.expected || 0)
              ? 'เงินนับจริงน้อยกว่ายอดคาดหวัง'
              : 'เงินนับจริงมากกว่ายอดคาดหวัง'
        }
        const printShopData = {
          name: shopSettings?.name || 'XYL STUDIO',
          branch: shopSettings?.branch_name
        }
        try {
          for (const rp of receiptPrinters) {
             if (!rp.ip) continue;
             await printGraphicModeZReport(rp.ip, reportData, printShopData, rp.model, rp.encoding)
          }
        } catch (e) { console.error(e) }
      }

      await onCloseShift(closingCash)
      setShowCloseConfirm(false)
      } finally {
        setIsClosingShift(false)
      }
  }

  const [isPinModalOpen, setIsPinModalOpen] = useState(false)

  const handleOpenDrawerClick = () => {
    const correctPin = shopSettings?.role_permissions?.manager_pin
    if (correctPin) {
      setIsPinModalOpen(true)
    } else {
      performOpenDrawer()
    }
  }

  const performOpenDrawer = async () => {
    playAppSound('pay');
    setIsDrawerOpen(true)
    setTimeout(() => setIsDrawerOpen(false), 3000)

    let printers = shopSettings?.printers || []
    let receiptPrinters = printers.filter((p: any) => p.type === 'receipt' || p.type === 'both')
    
    if (receiptPrinters.length === 0) {
      let ip = localStorage.getItem('xylem_printer_ip')
      if (ip) {
        receiptPrinters = [{ ip, type: 'receipt', model: 'xprinter-xp-n160ii' }]
      }
    }
    
    if (receiptPrinters.length > 0) {
      try {
        for (const rp of receiptPrinters) {
           if (!rp.ip) continue;
           await printOpenDrawer(rp.ip, rp.model)
        }
      } catch (e) { console.error(e) }
    }
  }

    return (
        <main className="flex-1 overflow-y-auto p-2 sm:p-10 bg-[#FDFDFB] custom-scrollbar font-bold overflow-x-hidden">
            {!activeShift ? (
                <div className="max-w-xl mx-auto py-10 sm:py-20 font-bold">
                    <section className="bg-white border border-[#E5E5DF] p-6 sm:p-16 shadow-2xl">
                        <h2 className="font-serif-luxury text-3xl sm:text-5xl font-light tracking-tighter text-[#1A1A18]">{locale === 'en' ? 'เริ่มกะทำงานใหม่' : locale === 'zh' ? 'เริ่มกะทำงานใหม่' : 'เริ่มกะทำงานใหม่'}</h2>
                        <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-[#8C8A81] mt-4 sm:mt-6">{locale === 'en' ? 'ระบุเงินสดเริ่มต้น (Starting Cash)' : locale === 'zh' ? 'ระบุเงินสดเริ่มต้น (Starting Cash)' : 'ระบุเงินสดเริ่มต้น (Starting Cash)'}</p>
                        <div className="mt-8 sm:mt-12 space-y-6 sm:space-y-10">
                            <button
                              type="button"
                              onClick={handleOpenDrawerBeforeShift}
                              disabled={isOpeningDrawerForShift}
                              className="w-full py-4 sm:py-5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] disabled:opacity-50"
                            >
                              {isOpeningDrawerForShift ? 'กำลังเปิดลิ้นชัก...' : 'เปิดลิ้นชักก่อนนับเงิน'}
                            </button>
                            <input type="number" value={openingCash} onChange={e => setOpeningCash(Number(e.target.value))} className="w-full bg-[#fcfcf9] border border-gray-100 py-4 sm:py-8 px-6 sm:px-8 text-2xl sm:text-4xl font-black outline-none text-black" />
                            <button onClick={handleOpenShift} disabled={loading} className="w-full py-4 sm:py-8 bg-[#1A1A18] text-white text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] disabled:opacity-50">{loading ? 'กำลังเปิดกะ...' : locale === 'en' ? 'เปิดกะทำงาน (START SHIFT)' : locale === 'zh' ? 'เปิดกะทำงาน (START SHIFT)' : 'เปิดกะทำงาน (START SHIFT)'}</button>
                        </div>
                    </section>
                </div>
            ) : (
                <div className="max-w-5xl mx-auto flex flex-col gap-6 font-sans h-full min-h-0">
                    {/* TOP SECTION: CLEAN HERO */}
                    <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-none relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 relative z-10">
                            <div className="flex-1">
                                <div className="flex flex-col gap-2 mb-4">
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                                        {locale === 'en' ? 'Expected Cash in Drawer' : 'เงินสดที่ควรมีในลิ้นชัก'}
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 w-fit">
                                        {locale === 'en' ? 'Started: ' : 'เริ่มกะ: '}
                                        {new Date(activeShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="text-5xl sm:text-6xl md:text-7xl font-black font-sans tracking-tight text-gray-900">
                                    {locale === 'en' ? '฿ ' : '฿ '}{shiftStats?.expected?.toLocaleString() || '0'}
                                </div>
                            </div>

                            {/* Horizontal Breakdown - Clean */}
                            <div className="grid grid-cols-2 lg:flex gap-4 w-full md:w-auto p-4 rounded-[1.5rem] bg-gray-50 border border-gray-100">
                                <div className="flex flex-col md:w-28 p-2">
                                   <span className="text-gray-400 uppercase tracking-widest text-[9px] mb-1 font-bold">{locale === 'en' ? 'Starting Cash' : 'เริ่มต้น'}</span>
                                   <span className="font-sans text-lg md:text-xl font-bold text-gray-900">฿ {Number(activeShift?.start_cash || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col md:w-28 p-2">
                                   <span className="text-gray-400 uppercase tracking-widest text-[9px] mb-1 font-bold">{locale === 'en' ? 'Cash Sales' : 'ยอดขายเงินสด'}</span>
                                   <span className="text-emerald-500 font-sans text-lg md:text-xl font-bold">+ ฿ {shiftStats?.cashSales?.toLocaleString() || '0'}</span>
                                </div>
                                <div className="flex flex-col md:w-28 p-2">
                                   <span className="text-gray-400 uppercase tracking-widest text-[9px] mb-1 font-bold">{locale === 'en' ? 'Pay In' : 'นำเงินเข้า'}</span>
                                   <span className="text-emerald-500 font-sans text-lg md:text-xl font-bold">+ ฿ {shiftStats?.payIns?.toLocaleString() || '0'}</span>
                                </div>
                                <div className="flex flex-col md:w-28 p-2">
                                   <span className="text-gray-400 uppercase tracking-widest text-[9px] mb-1 font-bold">{locale === 'en' ? 'Pay Out' : 'นำเงินออก'}</span>
                                   <span className="text-rose-500 font-sans text-lg md:text-xl font-bold">- ฿ {shiftStats?.payOuts?.toLocaleString() || '0'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM SECTION: SPLIT PANEL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                        {/* BOTTOM LEFT: TRANSACTIONS */}
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col min-h-0 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-widest">{locale === 'en' ? 'Transactions' : 'ประวัตินำเงินเข้า-ออก'}</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                      onClick={() => openTransactionModal('pay_in')}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors font-bold text-[10px] uppercase tracking-widest"
                                    >
                                      <ArrowUpRight size={14} /> {locale === 'en' ? 'Pay In' : 'นำเข้า'}
                                    </button>
                                    <button
                                      onClick={() => openTransactionModal('pay_out')}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors font-bold text-[10px] uppercase tracking-widest"
                                    >
                                      <ArrowDownLeft size={14} /> {locale === 'en' ? 'Pay Out' : 'นำออก'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                <div className="space-y-1">
                                    {transactions.map(t => (
                                        <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50/80 rounded-2xl transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${t.type === 'pay_in' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                                    {t.type === 'pay_in' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-800">{t.reason}</div>
                                                    <div className="text-[10px] font-semibold text-gray-400 uppercase mt-0.5">{new Date(t.created_at).toLocaleTimeString()}</div>
                                                </div>
                                            </div>
                                            <div className={`text-sm font-black ${t.type === 'pay_in' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {t.type === 'pay_in' ? '+' : '-'} ฿ {t.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                    {transactions.length === 0 && <div className="py-16 flex flex-col items-center justify-center text-gray-300 text-xs font-bold uppercase tracking-widest"><ArrowUpRight size={28} className="mb-3 opacity-30"/>{locale === 'en' ? 'No transactions' : 'ไม่มีรายการ'}</div>}
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM RIGHT: SHIFT ACTIONS */}
                        <div className="flex flex-col gap-6 min-h-0">
                            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex-1 flex flex-col">
                                <div className="mb-6 flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-widest">{locale === 'en' ? 'Actual Cash Counted' : 'สรุปยอดเงินสดปิดกะ'}</h3>
                                </div>
                                <div className="flex-1 flex flex-col justify-center gap-6">
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300 select-none">฿</span>
                                        <input 
                                            type="number" 
                                            value={closingCash === 0 && closingCash.toString() === "0" ? "" : closingCash} 
                                            onChange={e => setClosingCash(Number(e.target.value))} 
                                            className="w-full text-right bg-gray-50/50 border border-gray-100 p-6 pl-14 text-4xl sm:text-5xl font-black text-gray-900 rounded-[1.5rem] focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all outline-none" 
                                            placeholder="0" 
                                        />
                                    </div>
                                    <button 
                                        onClick={handleCloseShift} 
                                        className="w-full py-5 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-[0.2em] rounded-[1.5rem] transition-all shadow-lg shadow-gray-900/20 flex flex-col items-center justify-center"
                                    >
                                        <span>{locale === 'en' ? 'Close Shift' : 'ปิดกะทำงาน (Close Shift)'}</span>
                                    </button>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleOpenDrawerClick}
                                className={`w-full py-4 border border-gray-200 text-xs font-bold uppercase tracking-widest transition-all rounded-[1.5rem] shadow-sm ${isDrawerOpen ? 'bg-gray-50 text-gray-400' : 'bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'}`}
                            >
                                {isDrawerOpen ? 'LOCKED / OPENED' : locale === 'en' ? 'OPEN DRAWER' : 'สั่งเปิดลิ้นชัก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shift Closure Step-Down Confirmation Modal */}
            <AnimatePresence>
                {showCloseConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white border border-[#E5E5DF] p-10 max-w-lg w-full shadow-2xl space-y-8"
                        >
                            <div className="flex items-center gap-4 text-red-500">
                                <AlertTriangle size={32} />
                                <h3 className="text-2xl font-black uppercase tracking-tight text-[#1A1A18]">{locale === 'en' ? 'ยืนยันการปิดกะ?' : locale === 'zh' ? 'ยืนยันการปิดกะ?' : 'ยืนยันการปิดกะ?'}</h3>
                            </div>
                            <p className="text-sm font-bold text-gray-500 leading-relaxed">
                                {locale === 'en' ? '                                 เมื่อยืนยันการปิดกะแล้ว ระบบจะสรุปยอดเงินสดและปิดการทำงานของลิ้นชักทันที                                  เงินสดที่นับได้จริงคือ ' : locale === 'zh' ? '                                 เมื่อยืนยันการปิดกะแล้ว ระบบจะสรุปยอดเงินสดและปิดการทำงานของลิ้นชักทันที                                  เงินสดที่นับได้จริงคือ ' : '                                 เมื่อยืนยันการปิดกะแล้ว ระบบจะสรุปยอดเงินสดและปิดการทำงานของลิ้นชักทันที                                  เงินสดที่นับได้จริงคือ '}<span className="text-black font-black">{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{closingCash.toLocaleString()}</span>
                            </p>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setShowCloseConfirm(false)}
                                    className="flex-1 py-4 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-colors"
                                >
                                    {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '                                     ยกเลิก                                 '}</button>
                                <button 
                                    onClick={handleConfirmedClose}
                                    disabled={isClosingShift}
                                    className="flex-1 py-4 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isClosingShift ? 'กำลังปิดกะ...' : locale === 'en' ? '                                     ยืนยันปิดกะ                                 ' : locale === 'zh' ? '                                     ยืนยันปิดกะ                                 ' : '                                     ยืนยันปิดกะ                                 '}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
              {transactionModal.open && transactionModal.type && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.98 }}
                    className="bg-white border border-[#E5E5DF] p-6 sm:p-10 max-w-lg w-full shadow-2xl space-y-6"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 flex items-center justify-center ${transactionModal.type === 'pay_in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {transactionModal.type === 'pay_in' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-[#1A1A18]">
                          {transactionModal.type === 'pay_in' ? 'นำเงินเข้า' : 'นำเงินออก'}
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 mt-1">
                          {locale === 'en' ? 'บันทึกเงินสดเข้าหรือออกจากลิ้นชัก' : locale === 'zh' ? 'บันทึกเงินสดเข้าหรือออกจากลิ้นชัก' : 'บันทึกเงินสดเข้าหรือออกจากลิ้นชัก'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">จำนวนเงิน</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={transactionModal.amount}
                          onChange={(e) => setTransactionModal(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-full bg-[#fcfcf9] border border-gray-200 p-4 text-2xl font-black outline-none text-black"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">เหตุผล</label>
                        <input
                          type="text"
                          value={transactionModal.reason}
                          onChange={(e) => setTransactionModal(prev => ({ ...prev, reason: e.target.value }))}
                          className="w-full bg-[#fcfcf9] border border-gray-200 p-4 text-sm font-black outline-none text-black"
                          placeholder={transactionModal.type === 'pay_in' ? 'เช่น เติมเงินทอน' : 'เช่น เงินทอน / คืนเงิน'}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={closeTransactionModal}
                        disabled={loading}
                        className="flex-1 py-4 border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={submitTransaction}
                        disabled={loading || !transactionModal.amount}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50 ${transactionModal.type === 'pay_in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                      >
                        {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <POSPinModal
              isOpen={isPinModalOpen}
              onClose={() => setIsPinModalOpen(false)}
              onSuccess={performOpenDrawer}
              correctPin={shopSettings?.role_permissions?.manager_pin || ''}
              title={locale === 'en' ? 'เปิดลิ้นชัก (NO SALE DRAWER OPEN)' : locale === 'zh' ? 'เปิดลิ้นชัก (NO SALE DRAWER OPEN)' : 'เปิดลิ้นชัก (NO SALE DRAWER OPEN)'}
              description={locale === 'en' ? 'จำเป็นต้องใช้รหัสผ่านผู้จัดการเพื่อเปิดลิ้นชักเก็บเงิน' : locale === 'zh' ? 'จำเป็นต้องใช้รหัสผ่านผู้จัดการเพื่อเปิดลิ้นชักเก็บเงิน' : 'จำเป็นต้องใช้รหัสผ่านผู้จัดการเพื่อเปิดลิ้นชักเก็บเงิน'}
            />

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Outfit:wght@200;300;400;500;900&family=Prompt:wght@200;300;400&display=swap');
                .font-serif-luxury { font-family: 'Cormorant Garamond', serif; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </main>
    )
}
