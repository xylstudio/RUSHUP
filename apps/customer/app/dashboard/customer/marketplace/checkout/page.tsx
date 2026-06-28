'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/AuthContext'
import { useI18n } from '@/lib/I18nContext'
import { formatCurrencyByLocale, formatNumberByLocale } from '@/lib/localeFormat'

type CartItemRow = {
  id: string
  quantity: number
  plant_id: string
}

type Plant = {
  id: string
  name: string
  price: number
}

type CheckoutRow = {
  id: string
  quantity: number
  plant_id: string
  plant: Plant | null
}

export default function CustomerMarketplaceCheckoutPage() {
  const { user } = useAuth()
  const { locale } = useI18n()
  const copy = {
    th: { loadError: 'โหลดข้อมูลชำระเงินไม่สำเร็จ', insertError: 'สร้างรายการชำระเงินไม่สำเร็จ', clearError: 'ชำระเงินสำเร็จบางส่วน แต่ล้างตะกร้าไม่สำเร็จ', created: 'สร้างคำขอชำระเงินแล้ว', loading: 'กำลังโหลดข้อมูลชำระเงิน...', title: 'ชำระเงิน', subtitle: 'ตรวจสอบรายการก่อนยืนยันการสั่งซื้อ', empty: 'ไม่มีสินค้าในตะกร้า', qty: 'จำนวน', subtotal: 'ยอดสินค้า', fee: 'ค่าดำเนินการ', total: 'ยอดสุทธิ', backToCart: 'กลับไปตะกร้า', processing: 'กำลังดำเนินการ...', confirm: 'ยืนยันชำระเงิน', back: 'กลับ' },
    en: { loadError: 'Unable to load checkout data', insertError: 'Unable to create payment record', clearError: 'Payment created, but the cart could not be cleared', created: 'Payment request created', loading: 'Loading checkout data...', title: 'Checkout', subtitle: 'Review your order before confirming', empty: 'Your cart is empty', qty: 'Qty', subtotal: 'Subtotal', fee: 'Service fee', total: 'Grand total', backToCart: 'Back to Cart', processing: 'Processing...', confirm: 'Confirm Payment', back: 'Back' },
    zh: { loadError: '加载结算信息失败', insertError: '创建支付记录失败', clearError: '支付记录已创建，但清空购物车失败', created: '已创建支付请求', loading: '正在加载结算信息...', title: '结算', subtitle: '确认订单前请再次检查', empty: '购物车为空', qty: '数量', subtotal: '商品金额', fee: '服务费', total: '应付总额', backToCart: '返回购物车', processing: '处理中...', confirm: '确认支付', back: '返回' },
  }[locale]
  const [rows, setRows] = useState<CheckoutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [placingOrder, setPlacingOrder] = useState(false)
  const [notice, setNotice] = useState('')

  const loadCheckout = async () => {
    if (!user?.id) {
      setRows([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data: cartData, error: cartError } = await supabase
      .from('marketplace_cart_items')
      .select('id, quantity, plant_id')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (cartError) {
      setError(copy.loadError)
      setRows([])
      setLoading(false)
      return
    }

    const cartRows = (cartData || []) as CartItemRow[]
    const plantIds = Array.from(new Set(cartRows.map((row) => row.plant_id).filter(Boolean)))

    let plantMap: Record<string, Plant> = {}
    if (plantIds.length > 0) {
      const { data: plantData } = await supabase.from('marketplace_plants').select('id, name, price').in('id', plantIds)
      plantMap = ((plantData || []) as Plant[]).reduce((acc, plant) => {
        acc[plant.id] = plant
        return acc
      }, {} as Record<string, Plant>)
    }

    setRows(
      cartRows.map((row) => ({
        ...row,
        plant: plantMap[row.plant_id] || null,
      }))
    )
    setError('')
    setLoading(false)
  }

  useEffect(() => {
    loadCheckout()
  }, [copy.loadError, user?.id])

  const subtotal = useMemo(() => {
    return rows.reduce((sum, row) => sum + (row.plant?.price || 0) * row.quantity, 0)
  }, [rows])

  const serviceFee = useMemo(() => (subtotal > 0 ? Math.round(subtotal * 0.02) : 0), [subtotal])
  const grandTotal = subtotal + serviceFee

  const placeOrder = async () => {
    if (!user?.id || rows.length === 0) return

    setPlacingOrder(true)
    setNotice('')

    const summary = rows.map((row) => ({
      plant_id: row.plant_id,
      name: row.plant?.name || '-',
      quantity: row.quantity,
      unit_price: row.plant?.price || 0,
      line_total: (row.plant?.price || 0) * row.quantity,
    }))

    const { error: insertError } = await supabase.from('payments').insert({
      user_id: user.id,
      provider: 'marketplace_checkout',
      amount: grandTotal,
      currency: 'THB',
      status: 'pending',
      provider_charge_id: `market-${Date.now()}`,
    })

    if (insertError) {
      setNotice(copy.insertError)
      setPlacingOrder(false)
      return
    }

    const { error: clearError } = await supabase.from('marketplace_cart_items').delete().eq('customer_id', user.id)

    if (clearError) {
      setNotice(copy.clearError)
      setPlacingOrder(false)
      return
    }

    window.dispatchEvent(new CustomEvent('marketplaceCartUpdated'))
    setRows([])
    setNotice(`${copy.created} (${formatCurrencyByLocale(grandTotal, locale)})`)
    setPlacingOrder(false)
  }

  if (loading) {
    return <div className="customer-editorial-page"><div className="customer-editorial-container"><div className="customer-editorial-body">{copy.loading}</div></div></div>
  }

  return (
    <div className="customer-editorial-page">
      <div className="customer-editorial-container">
        <div className="customer-editorial-header">
          <div className="customer-editorial-toolbar">
            <Link href="/dashboard/customer/marketplace/cart" aria-label={copy.back} className="customer-editorial-icon-button">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="customer-editorial-kicker">Marketplace Checkout</p>
              <h1 className="customer-editorial-title">{copy.title}</h1>
              <p className="customer-editorial-subtitle">{copy.subtitle}</p>
            </div>
          </div>
        </div>

        {error ? <div className="customer-editorial-panel text-sm text-red-700">{error}</div> : null}
        {notice ? <div className="customer-editorial-panel text-sm text-[#2A4532]">{notice}</div> : null}

        <div className="customer-editorial-list">
        {rows.length === 0 ? (
          <div className="customer-editorial-empty">
            <p className="customer-editorial-empty-title">{copy.empty}</p>
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="customer-editorial-list-item">
              <div>
                <p className="customer-editorial-card-title text-[1.35rem]">{row.plant?.name || '-'}</p>
                <p className="customer-editorial-body text-xs">{copy.qty} {formatNumberByLocale(row.quantity, locale)}</p>
              </div>
              <p className="text-sm font-semibold text-[#1F3A2C]">{formatCurrencyByLocale((row.plant?.price || 0) * row.quantity, locale)}</p>
            </div>
          ))
        )}
        </div>

        <div className="customer-editorial-panel mt-6 text-sm text-[#1A1A1A]">
        <div className="mb-2 flex items-center justify-between"><span>{copy.subtotal}</span><span>{formatCurrencyByLocale(subtotal, locale)}</span></div>
        <div className="mb-2 flex items-center justify-between"><span>{copy.fee}</span><span>{formatCurrencyByLocale(serviceFee, locale)}</span></div>
        <div className="flex items-center justify-between border-t border-[#E5E5DF] pt-2 font-semibold"><span>{copy.total}</span><span>{formatCurrencyByLocale(grandTotal, locale)}</span></div>
        </div>

        <div className="customer-editorial-button-row mt-6 justify-between">
          <Link href="/dashboard/customer/marketplace/cart" className="customer-editorial-button-secondary">
            {copy.backToCart}
          </Link>
          <button type="button" onClick={placeOrder} disabled={placingOrder || rows.length === 0} className="customer-editorial-button-primary">
            {placingOrder ? copy.processing : copy.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
