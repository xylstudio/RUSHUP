'use client';
import React, { useState, useEffect, useCallback } from 'react'
import { Receipt, Trash2, RefreshCw, Printer, PencilLine } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import POSPinModal from './POSPinModal'
import { useI18n } from "@/lib/I18nContext";
import { printCustomerReceipt } from '@/lib/printerUtils'

export default function POSHistory({ shopSettings, profile, activeShift, onSetView, fetchShiftStats }: any) {
    const { locale } = useI18n();
  const [completedOrders, setCompletedOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [pinCallback, setPinCallback] = useState<(() => void) | null>(null)
  const [pinTitle, setPinTitle] = useState('')
  const [pinDesc, setPinDesc] = useState('')
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null)
  const [paymentEditOrder, setPaymentEditOrder] = useState<any | null>(null)
  const [paymentEditMethod, setPaymentEditMethod] = useState<string>('cash')
  const [paymentEditOpen, setPaymentEditOpen] = useState(false)

  const fetchCompletedOrders = useCallback(async () => {
    setLoading(true)
    try {
      // Use local midnight as the start of today (handles timezone correctly)
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      
      const { data, error } = await supabase
        .from('pos_orders')
        .select('*, pos_order_items(*, item:pos_menu_items!item_id(*)), pos_order_payments(amount, payment_method, status)')
        .in('status', ['paid', 'completed', 'cancelled'])
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        return
      }

      if (data) {
        // Use shift branch_id first, fallback to shopSettings branch_id
        const branchId = activeShift?.branch_id || shopSettings?.branch_id
        const filtered = branchId
          ? data.filter(o => !o.branch_id || o.branch_id === branchId)
          : data
        setCompletedOrders(filtered)
      }
    } finally {
      setLoading(false)
    }
  }, [shopSettings?.branch_id, activeShift?.branch_id])

  // Always fetch when component mounts
  useEffect(() => {
    fetchCompletedOrders()
  }, [fetchCompletedOrders])

  const checkManagerPin = (
    onSuccessCallback: () => void,
    title = 'MANAGER AUTHORIZATION',
    desc = 'Please enter manager PIN to proceed'
  ) => {
    const requiredPin = shopSettings?.role_permissions?.manager_pin
    if (!requiredPin) {
      alert('ยังไม่ได้ตั้งรหัสผ่าน Manager PIN กรุณาไปตั้งค่าที่ Shop Settings')
      return
    }



    setPinTitle(title)
    setPinDesc(desc)
    setPinCallback(() => onSuccessCallback)
    setIsPinModalOpen(true)
  }

  const handleVoidCompletedOrder = async (order: any) => {
    checkManagerPin(async () => {
      const reason = window.prompt(locale === 'en' ? 'Please enter void reason (Required):' : locale === 'zh' ? '请输入取消原因（必填）：' : 'กรุณาระบุเหตุผลในการยกเลิกบิล (จำเป็นต้องระบุ):')
      if (!reason || reason.trim() === '') {
        alert(locale === 'en' ? 'Void reason is required' : locale === 'zh' ? '必须提供取消原因' : 'การยกเลิกบิลต้องระบุเหตุผลเสมอ')
        return
      }

      try {
        let { error } = await supabase
          .from('pos_orders')
          .update({ 
            status: 'cancelled', 
            updated_at: new Date().toISOString(),
            void_reason: reason.trim()
          })
          .eq('id', order.id)

        if (error && error.message.includes("Could not find the 'void_reason' column")) {
          const { error: fallbackError } = await supabase
            .from('pos_orders')
            .update({ 
              status: 'cancelled', 
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id)
            
          error = fallbackError
        }
        
        if (error) throw error

        const { data: movements } = await supabase
          .from('inventory_movements')
          .select('*')
          .eq('reference_id', order.id)
          .eq('reason', 'sale')
        
        if (movements && movements.length > 0) {
          const revertMovements = movements.map((m: any) => ({
            item_id: m.item_id,
            change_amount: Math.abs(m.change_amount),
            reason: 'void',
            reference_id: order.id,
          }))
          await supabase.from('inventory_movements').insert(revertMovements)
        }
        
        fetchCompletedOrders()
        alert('ยกเลิกบิลสำเร็จและคืนสต็อกเรียบร้อยแล้ว')
      } catch (e: any) {
        alert('ไม่สามารถยกเลิกบิลได้: ' + e.message)
      }
    }, 'ยกเลิกบิล (VOID ORDER)', 'จำเป็นต้องใช้รหัสผ่านผู้จัดการในการยกเลิกบิลที่ชำระเงินแล้ว')
  }

  const normalizePaymentMethod = (method?: string | null) => {
    const normalized = String(method || '').toLowerCase()
    if (normalized === 'cash' || normalized === 'cod') return 'cash'
    if (normalized === 'transfer' || normalized === 'bank_transfer') return 'transfer'
    if (normalized === 'card' || normalized === 'credit_card') return 'credit_card'
    if (normalized === 'promptpay' || normalized === 'qr') return 'promptpay'
    return normalized || 'cash'
  }

  const formatPaymentMethodLabel = (method?: string | null) => {
    const normalized = normalizePaymentMethod(method)
    if (normalized === 'cash') return 'เงินสด'
    if (normalized === 'transfer') return 'โอนเงิน'
    if (normalized === 'credit_card') return 'บัตรเครดิต'
    if (normalized === 'promptpay') return 'พร้อมเพย์'
    return method || 'ไม่ระบุ'
  }

  const getPaidAmount = (order: any) => {
    const paymentRows = Array.isArray(order.pos_order_payments) ? order.pos_order_payments : []
    const paidFromRows = paymentRows
      .filter((row: any) => String(row.status || '').toLowerCase() === 'paid')
      .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)
    return paidFromRows > 0 ? paidFromRows : Number(order.net_total ?? order.total_amount ?? 0)
  }

  const getOrderPaymentMethod = (order: any) => {
    const paymentRows = Array.isArray(order.pos_order_payments) ? order.pos_order_payments : []
    const firstPaidMethod = paymentRows.find((row: any) => String(row.status || '').toLowerCase() === 'paid')?.payment_method
    return firstPaidMethod || order.payment_method || 'cash'
  }

  const buildPrintOrder = (order: any) => ({
    orderNumber: order.order_number,
    date: new Date(order.created_at).toLocaleString('th-TH'),
    orderSource: order.order_source || 'pos',
    staffName: profile?.full_name || profile?.display_name || 'POS',
    customerName: order.customer_name || undefined,
    tableNumber: order.table_number || undefined,
    queueNumber: order.queue_number ? String(order.queue_number) : undefined,
    items: (order.pos_order_items || []).map((item: any) => ({
      name: item.item?.name || item.name || 'Unknown Item',
      quantity: Number(item.quantity || 0),
      subtotal: Number(item.subtotal || (Number(item.unit_price || 0) * Number(item.quantity || 0))),
      selected_modifiers: item.selected_modifiers || [],
    })),
    subtotal: Number(order.total_amount || 0),
    discount: Number(order.discount_amount || 0),
    tax: Number(order.tax_amount || 0),
    total: Number(order.net_total ?? order.total_amount ?? 0),
    paymentMethod: getOrderPaymentMethod(order),
    receivedAmount: getPaidAmount(order),
    changeAmount: Math.max(0, getPaidAmount(order) - Number(order.net_total ?? order.total_amount ?? 0)),
    orderType: order.order_type || 'dine_in',
    deliveryPlatform: order.delivery_platform || undefined,
    referenceName: order.reference_name || undefined,
    deliveryFee: Number(order.delivery_fee || 0),
  })

  const handlePrintReceipt = async (order: any) => {
    const printers = Array.isArray(shopSettings?.printers) ? shopSettings.printers : []
    let receiptPrinters = printers.filter((p: any) => p?.type === 'receipt' || p?.type === 'both')
    if (receiptPrinters.length === 0) {
      receiptPrinters = printers.filter((p: any) => p?.type === 'kitchen' || p?.type === 'both')
    }
    if (receiptPrinters.length === 0) {
      const fallbackIp = typeof window !== 'undefined' ? localStorage.getItem('xylem_printer_ip') : ''
      if (!fallbackIp) {
        alert('ยังไม่พบเครื่องปริ้นใบเสร็จในระบบ')
        return
      }
      receiptPrinters.push({ ip: fallbackIp, model: 'xprinter-xp-n160ii', encoding: 'cp874' })
    }

    setPrintingOrderId(order.id)
    try {
      const orderData = buildPrintOrder(order)
      const shopData = {
        name: shopSettings?.name || shopSettings?.branch_name || 'XYL STUDIO',
        branch: shopSettings?.branch_name || '',
        taxId: shopSettings?.tax_id || '',
        address: shopSettings?.address || '',
        phone: shopSettings?.phone || '',
        receiptHeader: shopSettings?.receipt_header || '',
        receiptFooter: shopSettings?.receipt_footer || '',
        receiptFontSize: shopSettings?.receipt_font_size || 'normal',
        receipt_story_mode: shopSettings?.receipt_story_mode || false,
        receipt_stories: shopSettings?.receipt_stories || [],
        receiptPaymentQrImage: shopSettings?.opening_hours?.receipt_payment_qr_image
          || shopSettings?.receipt_payment_qr_image
          || (shopSettings as any)?.receipt_payment_qr_image,
      }

      for (const printer of receiptPrinters) {
        if (!printer?.ip) continue
        if (printer.encoding === 'graphic') {
          const { printGraphicModeCustomerReceipt } = await import('@/lib/graphicPrinter')
          await printGraphicModeCustomerReceipt(printer.ip, orderData, shopData, printer.model, printer.encoding)
        } else {
          await printCustomerReceipt(printer.ip, orderData, shopData, printer.model, printer.encoding)
        }
      }
    } catch (error: any) {
      console.error('Receipt reprint error:', error)
      alert(`ปริ้นใบเสร็จไม่สำเร็จ: ${error.message || 'unknown error'}`)
    } finally {
      setPrintingOrderId(null)
    }
  }

  const openPaymentEdit = (order: any) => {
    setPaymentEditOrder(order)
    setPaymentEditMethod(normalizePaymentMethod(order.payment_method || getOrderPaymentMethod(order)))
    setPaymentEditOpen(true)
  }

  const savePaymentEdit = async () => {
    if (!paymentEditOrder) return
    const paymentMethod = normalizePaymentMethod(paymentEditMethod)
    try {
      const { error: orderError } = await supabase
        .from('pos_orders')
        .update({
          payment_method: paymentMethod,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentEditOrder.id)
      if (orderError) throw orderError

      await supabase
        .from('pos_order_payments')
        .update({
          payment_method: paymentMethod,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', paymentEditOrder.id)
      await fetchCompletedOrders()
      if (typeof window !== 'undefined' && activeShift?.id) {
        await supabase
          .from('pos_shifts')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeShift.id)

        window.dispatchEvent(new CustomEvent('xyl-pos-shift-refresh', {
          detail: { shiftId: activeShift.id },
        }))
        await new Promise(resolve => setTimeout(resolve, 300))
        if (typeof fetchShiftStats === 'function') {
          await fetchShiftStats(activeShift.id)
        }
      }
      setPaymentEditOpen(false)
      setPaymentEditOrder(null)
    } catch (error: any) {
      alert(`แก้ไขช่องทางชำระเงินไม่สำเร็จ: ${error.message}`)
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#FDFDFB]">
      <header className="flex-shrink-0 flex items-center justify-between border-b border-[#F0F0E8] bg-white p-6 sm:p-10">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tighter uppercase text-[#1A1A18] flex items-center gap-3">
            <Receipt className="text-emerald-500" /> 
            {locale === 'en' ? '              ประวัติการขาย (วันนี้)           ' : locale === 'zh' ? '              ประวัติการขาย (วันนี้)           ' : '              ประวัติการขาย (วันนี้)           '}</h2>
          <p className="mt-1 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
            Sales History · {completedOrders.length} {locale === 'en' ? ' รายการ           ' : locale === 'zh' ? ' รายการ           ' : ' รายการ           '}</p>
        </div>
        <button
          onClick={fetchCompletedOrders}
          disabled={loading}
          className="flex items-center gap-2 border border-[#F0F0E8] bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 transition-all hover:bg-black hover:text-white disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {locale === 'en' ? 'Refresh' : locale === 'zh' ? '刷新' : '           รีเฟรช         '}</button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-10 space-y-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <RefreshCw size={32} className="mb-4 animate-spin opacity-50" />
            <p className="text-[12px] font-black uppercase tracking-widest">{locale === 'en' ? 'Loading...' : locale === 'zh' ? '加载中...' : 'กำลังโหลด...'}</p>
          </div>
        )}
        {!loading && completedOrders.map(order => (
          <div key={order.id} className="flex flex-col mb-3">
            <div
              onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
              className="group flex flex-col items-center justify-between border bg-white p-6 transition-all hover:border-[#1A1A18] sm:flex-row shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-8 font-bold">
                <Receipt size={32} className="text-emerald-500" />
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-black uppercase tracking-widest text-[#1A1A18]">
                      {order.order_number}
                    </div>
                    {order.order_type === 'dine_in' && order.table_number && (
                      <span className="bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-amber-700">
                        Table {order.table_number}
                      </span>
                    )}
                    <span className="bg-gray-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-gray-500">
                      {formatPaymentMethodLabel(getOrderPaymentMethod(order))}
                    </span>
                    {order.order_type === 'delivery' && order.delivery_platform && (
                      <span className="bg-orange-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-orange-700">
                        {order.delivery_platform}
                      </span>
                    )}
                    {order.order_source === 'liff' && Number(order.delivery_fee || 0) > 0 && (
                      <span className="bg-emerald-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-emerald-700">
                        ส่ง ฿{Number(order.delivery_fee).toLocaleString()}
                      </span>
                    )}
                    {order.reference_name && (
                      <span className="bg-blue-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-blue-700">
                        #{order.reference_name}
                      </span>
                    )}
                    {order.status === 'cancelled' && (
                      <span className="bg-red-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-red-600">
                        {locale === 'en' ? '                         ยกเลิกแล้ว                       ' : locale === 'zh' ? '                         ยกเลิกแล้ว                       ' : '                         ยกเลิกแล้ว                       '}</span>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] text-gray-400">
                    {new Date(order.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex w-full items-center justify-between gap-6 sm:mt-0 sm:w-auto">
                <div className="text-right">
                  <div className="text-xs font-black text-gray-400 line-through">
                    {order.discount_amount > 0 ? `฿${(Number(order.total_amount)).toLocaleString()}` : ''}
                  </div>
                  <div className={`text-xl font-black tracking-tighter ${order.status === 'cancelled' ? 'text-gray-300 line-through' : 'text-emerald-600'}`}>
                    {locale === 'en' ? '                     ฿' : locale === 'zh' ? '                     ฿' : '                     ฿'}{(Number(order.net_total ?? order.total_amount)).toLocaleString()}
                  </div>
                  {Number(order.delivery_gp_amount) > 0 && order.status !== 'cancelled' && (
                    <div className="text-[10px] font-black text-red-500 mt-0.5">
                      GP {order.delivery_platform?.toUpperCase()}: -฿{Number(order.delivery_gp_amount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                    </div>
                  )}
                  {Number(order.delivery_gp_amount) > 0 && order.status !== 'cancelled' && (
                    <div className="text-[10px] font-black text-blue-600 mt-0.5">
                      รับจริง: ฿{(Number(order.net_total ?? order.total_amount) - Number(order.delivery_gp_amount)).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePrintReceipt(order) }}
                    disabled={printingOrderId === order.id}
                    className="group/btn flex h-10 w-10 items-center justify-center border border-black bg-black text-white transition-all hover:bg-gray-900 disabled:opacity-50"
                    title="พิมพ์ใบเสร็จ"
                  >
                    <Printer size={16} className={printingOrderId === order.id ? 'animate-pulse' : ''} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      checkManagerPin(
                        () => openPaymentEdit(order),
                        'แก้ไขช่องทางชำระเงิน',
                        'กรุณาใส่รหัสผู้จัดการเพื่อแก้ไขรูปแบบการชำระเงิน'
                      )
                    }}
                    className="group/btn flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600 transition-all hover:bg-blue-600 hover:text-white"
                    title="แก้ไขช่องทางชำระเงิน"
                  >
                    <PencilLine size={16} />
                  </button>
                  {order.status !== 'cancelled' && (
                    <button onClick={(e) => { e.stopPropagation(); handleVoidCompletedOrder(order) }} className="group/btn flex h-10 w-10 items-center justify-center border border-red-200 bg-red-50 text-red-600 transition-all hover:bg-red-600 hover:text-white" title={locale === 'en' ? 'ทำลายบิล' : locale === 'zh' ? 'ทำลายบิล' : 'ทำลายบิล'}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {expandedOrderId === order.id && (
              <div className="bg-[#FDFDFB] p-6 border-b border-l border-r border-[#F0F0E8] text-sm animate-in slide-in-from-top-2">
                <div className="font-black text-xs uppercase tracking-widest text-gray-500 mb-4 pb-2 border-b border-dashed border-gray-200">
                  {locale === 'en' ? '                   รายการสินค้าในบิล (Order Items)                 ' : locale === 'zh' ? '                   รายการสินค้าในบิล (Order Items)                 ' : '                   รายการสินค้าในบิล (Order Items)                 '}</div>
                <div className="space-y-3">
                  {order.pos_order_items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start font-bold">
                      <div className="flex gap-3">
                        <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-xs min-w-[24px] text-center">
                          {item.quantity}x
                        </span>
                        <div>
                          <div className="text-[#1A1A18]">{item.item?.name || 'Unknown Item'}</div>
                          {item.note && <div className="text-xs text-gray-400 font-medium">{locale === 'en' ? 'note:' : locale === 'zh' ? '笔记：' : 'หมายเหตุ: '}{item.note}</div>}
                          {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                            <div className="text-[10px] text-gray-400 font-medium flex flex-wrap gap-1 mt-1">
                              {item.selected_modifiers.map((m: any, i: number) => {
                                const modifierLabel = m?.is_note
                                  ? `หมายเหตุ: ${m?.value || m?.name || ''}`
                                  : m?.value && m.value !== m.name
                                    ? `${m.name}: ${m.value}`
                                    : m?.name || ''

                                if (!modifierLabel) return null

                                return (
                                  <span key={i} className="bg-white border px-1 rounded">
                                    + {modifierLabel}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[#1A1A18]">
                        {locale === 'en' ? '                         ฿' : locale === 'zh' ? '                         ฿' : '                         ฿'}{(Number(item.subtotal) || (Number(item.unit_price) * Number(item.quantity)) || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-dashed border-gray-200 space-y-1 font-bold text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>{locale === 'en' ? 'ยอดรวม (Subtotal)' : locale === 'zh' ? 'ยอดรวม (Subtotal)' : 'ยอดรวม (Subtotal)'}</span>
                    <span>{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{(Number(order.total_amount)).toLocaleString()}</span>
                  </div>
                  {Number(order.discount_amount) > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>{locale === 'en' ? 'ส่วนลด (Discount)' : locale === 'zh' ? 'ส่วนลด (Discount)' : 'ส่วนลด (Discount)'}</span>
                      <span>{locale === 'en' ? '- ฿' : locale === 'zh' ? '- ฿' : '- ฿'}{(Number(order.discount_amount)).toLocaleString()}</span>
                    </div>
                  )}
                  {Number(order.service_charge_amount) > 0 && (
                    <div className="flex justify-between">
                      <span>Service Charge</span>
                      <span>{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{(Number(order.service_charge_amount)).toLocaleString()}</span>
                    </div>
                  )}
                  {Number(order.tax_amount) > 0 && (
                    <div className="flex justify-between">
                      <span>VAT</span>
                      <span>{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{(Number(order.tax_amount)).toLocaleString()}</span>
                    </div>
                  )}
                  {order.order_source === 'liff' && Number(order.delivery_fee) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>ค่าส่ง / Delivery Fee</span>
                      <span>{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{Number(order.delivery_fee).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#1A1A18] text-base font-black pt-2 border-t border-gray-100 mt-2">
                    <span>{locale === 'en' ? 'ยอดสุทธิ (Net Total)' : locale === 'zh' ? 'ยอดสุทธิ (Net Total)' : 'ยอดสุทธิ (Net Total)'}</span>
                    <span className="text-emerald-600">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{(Number(order.net_total ?? order.total_amount)).toLocaleString()}</span>
                  </div>
                  {Number(order.delivery_gp_amount) > 0 && (
                    <div className="mt-3 pt-3 border-t border-dashed border-red-200 space-y-1">
                      <div className="flex justify-between text-red-600 font-black">
                        <span className="flex items-center gap-2">
                          <span className="bg-red-100 text-red-700 text-[8px] font-black uppercase tracking-widest px-2 py-0.5">GP</span>
                          {locale === 'en' ? `หักค่า GP ${order.delivery_platform?.toUpperCase() || ''}` : `หักค่า GP ${order.delivery_platform?.toUpperCase() || ''}`}
                        </span>
                        <span>- ฿{(Number(order.delivery_gp_amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-[#1A1A18] text-sm font-black pt-1">
                        <span>{locale === 'en' ? 'ยอดสุทธิหลังหัก GP (Net Received)' : 'ยอดสุทธิหลังหัก GP (Net Received)'}</span>
                        <span className="text-blue-700">฿{(Number(order.net_total ?? order.total_amount) - Number(order.delivery_gp_amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {!loading && completedOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <Receipt size={48} className="mb-4 opacity-50" />
            <p className="text-[12px] font-black uppercase tracking-widest">
              {locale === 'en' ? '               ไม่มีประวัติการขายวันนี้             ' : locale === 'zh' ? '               ไม่มีประวัติการขายวันนี้             ' : '               ไม่มีประวัติการขายวันนี้             '}</p>
            <button
              onClick={fetchCompletedOrders}
              className="mt-6 flex items-center gap-2 border border-gray-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-black hover:text-black transition-all"
            >
              <RefreshCw size={12} /> {locale === 'en' ? ' โหลดใหม่อีกครั้ง             ' : locale === 'zh' ? ' โหลดใหม่อีกครั้ง             ' : ' โหลดใหม่อีกครั้ง             '}</button>
          </div>
        )}
      </div>

      <POSPinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false)
          setPinCallback(null)
        }}
        onSuccess={() => {
          if (pinCallback) pinCallback()
        }}
        correctPin={shopSettings?.role_permissions?.manager_pin || ''}
        title={pinTitle}
        description={pinDesc}
      />

      {paymentEditOpen && paymentEditOrder && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPaymentEditOpen(false)} />
          <div className="relative w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Payment Method</div>
              <h3 className="mt-2 text-2xl font-black text-[#1A1A18]">แก้ไขช่องทางชำระเงิน</h3>
              <p className="mt-2 text-sm font-bold text-gray-500">
                {paymentEditOrder.order_number} · {paymentEditOrder.customer_name || 'Guest'}
              </p>
            </div>

            <div className="space-y-3">
              <select
                value={paymentEditMethod}
                onChange={(e) => setPaymentEditMethod(e.target.value)}
                className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base font-black text-[#1A1A18] outline-none focus:border-[#1A1A18] focus:bg-white"
              >
                <option value="cash">เงินสด</option>
                <option value="transfer">โอนเงิน</option>
                <option value="credit_card">บัตรเครดิต</option>
                <option value="promptpay">พร้อมเพย์</option>
              </select>

              <button
                type="button"
                onClick={savePaymentEdit}
                className="w-full rounded-2xl bg-[#1A1A18] py-4 text-[12px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-black"
              >
                บันทึกการเปลี่ยนแปลง
              </button>

              <button
                type="button"
                onClick={() => setPaymentEditOpen(false)}
                className="w-full py-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-600"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
