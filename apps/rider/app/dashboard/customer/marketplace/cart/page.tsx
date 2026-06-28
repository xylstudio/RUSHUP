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

type PlantMap = Record<
  string,
  {
    id: string
    name: string
    image_url?: string
    price: number
    stock_quantity: number
  }
>

type CartRow = {
  id: string
  quantity: number
  plant_id: string
  plant: {
    id: string
    name: string
    image_url?: string
    price: number
    stock_quantity: number
  } | null
}

export default function CustomerMarketplaceCartPage() {
  const { user } = useAuth()
  const { locale } = useI18n()
  const copy = {
    th: { loadError: 'โหลดตะกร้าไม่สำเร็จ', loading: 'กำลังโหลดตะกร้า...', title: 'ตะกร้าสินค้า', subtitle: 'รายการสินค้าที่คุณเลือกไว้', empty: 'ยังไม่มีสินค้าในตะกร้า', qty: 'จำนวน', remove: 'ลบ', total: 'รวมทั้งสิ้น', checkout: 'ไปชำระเงิน', back: 'กลับ' },
    en: { loadError: 'Unable to load cart', loading: 'Loading cart...', title: 'Shopping Cart', subtitle: 'Items you selected', empty: 'Your cart is empty', qty: 'Qty', remove: 'Remove', total: 'Total', checkout: 'Proceed to Checkout', back: 'Back' },
    zh: { loadError: '加载购物车失败', loading: '正在加载购物车...', title: '购物车', subtitle: '您已选择的商品', empty: '购物车为空', qty: '数量', remove: '删除', total: '总计', checkout: '去结算', back: '返回' },
  }[locale]
  const [rows, setRows] = useState<CartRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCart = async () => {
    if (!user?.id) {
      setRows([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data: cartItems, error: cartError } = await supabase
      .from('marketplace_cart_items')
      .select('id, quantity, plant_id')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (cartError) {
      setError(copy.loadError)
      setRows([])
    } else {
      setError('')
      const cartList = (cartItems || []) as CartItemRow[]
      const plantIds = Array.from(new Set(cartList.map((item) => item.plant_id).filter(Boolean)))

      let plantMap: PlantMap = {}

      if (plantIds.length > 0) {
        const { data: plantsData } = await supabase
          .from('marketplace_plants')
          .select('id, name, image_url, price, stock_quantity')
          .in('id', plantIds)

        plantMap = ((plantsData || []) as any[]).reduce((acc, plant) => {
          acc[plant.id] = plant
          return acc
        }, {} as PlantMap)
      }

      setRows(
        cartList.map((item) => ({
          ...item,
          plant: plantMap[item.plant_id] || null,
        }))
      )
    }

    setLoading(false)
  }

  useEffect(() => {
    loadCart()
  }, [copy.loadError, user?.id])

  const total = useMemo(() => {
    return rows.reduce((sum, row) => sum + (row.plant?.price || 0) * (row.quantity || 0), 0)
  }, [rows])

  const removeItem = async (id: string) => {
    const { error } = await supabase.from('marketplace_cart_items').delete().eq('id', id)
    if (!error) {
      setRows((prev) => prev.filter((item) => item.id !== id))
      window.dispatchEvent(new CustomEvent('marketplaceCartUpdated'))
    }
  }

  if (loading) {
    return <div className="customer-editorial-page"><div className="customer-editorial-container"><div className="customer-editorial-body">{copy.loading}</div></div></div>
  }

  return (
    <div className="customer-editorial-page">
      <div className="customer-editorial-container">
        <div className="customer-editorial-header">
          <div className="customer-editorial-toolbar">
            <Link href="/dashboard/customer/marketplace" aria-label={copy.back} className="customer-editorial-icon-button">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="customer-editorial-kicker">Marketplace Cart</p>
              <h1 className="customer-editorial-title">{copy.title}</h1>
              <p className="customer-editorial-subtitle">{copy.subtitle}</p>
            </div>
          </div>
        </div>

        {error ? <div className="customer-editorial-panel text-sm text-red-700">{error}</div> : null}

        <div className="customer-editorial-list">
        {rows.length === 0 ? (
          <div className="customer-editorial-empty">
            <p className="customer-editorial-empty-title">{copy.empty}</p>
          </div>
        ) : (
          rows.map((row) => {
            const plant = row.plant

            return (
              <div key={row.id} className="customer-editorial-list-item">
                <img
                  src={plant?.image_url || 'https://images.unsplash.com/photo-1463320726281-696a485928c7?q=80&w=600&auto=format&fit=crop'}
                  alt={plant?.name || 'plant'}
                  className="h-16 w-16 object-cover border border-[#EAE5DA]"
                />
                <div className="flex-1">
                  <p className="customer-editorial-card-title text-[1.35rem]">{plant?.name || '-'}</p>
                  <p className="customer-editorial-body text-xs">{copy.qty} {formatNumberByLocale(row.quantity, locale)}</p>
                  <p className="mt-2 text-xs font-semibold text-[#214031]">{formatCurrencyByLocale(Number(plant?.price || 0), locale)}</p>
                </div>
                <button onClick={() => removeItem(row.id)} className="customer-editorial-button-secondary">
                  {copy.remove}
                </button>
              </div>
            )
          })
        )}
        </div>

        <div className="customer-editorial-stat mt-6">
          <p className="customer-editorial-meta">{copy.total}</p>
          <div className="flex items-center justify-between gap-4">
            <p className="customer-editorial-stat-value">{formatCurrencyByLocale(total, locale)}</p>
            <Link href="/dashboard/customer/marketplace/checkout" className="customer-editorial-button-primary">
              {copy.checkout}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
