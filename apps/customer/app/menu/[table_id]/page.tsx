'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { StripePaymentModal } from '@/components/pos/StripePaymentModal'
import { supabase } from '@/lib/supabaseClient'
import { PromoBannerSlider } from '@/components/pos/PromoBannerSlider'
import { getBranchName } from '@/app/actions/getBranchName'
import { ChevronLeft, Home, Search, ShoppingBag, ShoppingCart, Plus, Minus, Check, ChevronDown, Clock, Camera, FileText, QrCode, ArrowLeft, ArrowRight, UserCircle, CreditCard, Receipt, SplitSquareHorizontal, Banknote, Sparkles, X, Loader2, Coffee, Utensils, Users, Printer, Flame, Trash2, ChevronRight, Star, Info } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useReactToPrint } from 'react-to-print'
import { POSReceipt } from '@/components/pos/POSReceipt'
import { useI18n } from "@/lib/I18nContext";
import { getPrimaryMenuName, getSecondaryMenuName } from '@/lib/posMenuLabels'
import { sortMenuItemsByOrder } from '@/lib/posMenuOrder'

interface MenuItem {
  id: string
  name: string
  name_en?: string | null
  name_zh?: string | null
  sale_price: number
  image_url: string | null
  description?: string
  category_id: string
  category?: { name: string }
  is_recommended?: boolean
  is_popular?: boolean
  is_online_available?: boolean
}

interface MenuCategory {
  id: string
  name: string
}

const ORDER_NOTE_LABEL = 'หมายเหตุ'
const normalizeNoteText = (value?: string | null) => String(value || '').trim()
const buildOrderItemModifiers = (selectedModifiers: any[] = [], note?: string | null) => {
  const normalizedNote = normalizeNoteText(note)
  const baseModifiers = Array.isArray(selectedModifiers) ? [...selectedModifiers] : []
  return normalizedNote
    ? [...baseModifiers, { name: ORDER_NOTE_LABEL, value: normalizedNote, is_note: true }]
    : baseModifiers
}
const formatModifierLabel = (modifier: any) => {
  if (!modifier) return ''
  const name = modifier.display_name || modifier.label || modifier.group_name || modifier.name || ''
  const value = modifier.value || modifier.selected_value || modifier.option_value || modifier.option_name || ''
  if (value && value !== name) return `${name}: ${value}`
  return name
}
const getItemModifierSummary = (item: any) => buildOrderItemModifiers(item.selected_modifiers || [], item.note).map(formatModifierLabel).filter(Boolean).join(', ')
const getModifierIdsKey = (modifiers: any[] = []) => modifiers.map((modifier: any) => modifier.id).sort().join(',')
const isSameCartLine = (item: any, id: string, modifiers: any[] = []) =>
  item.id === id && getModifierIdsKey(item.selected_modifiers || []) === getModifierIdsKey(modifiers)
const getCartItemUnitPrice = (item: any) =>
  Number(item.sale_price || 0) + ((item.selected_modifiers || []).reduce((acc: number, modifier: any) => acc + Number(modifier.price_adjustment || modifier.price || 0), 0))


const translations = {
  en: {
    loading: 'Loading',
    configuring: 'Configuring Experience',
    welcomeTable: 'Welcome to Table',
    askNickname: '{t.askNickname}',
    enterNickname: 'Enter your nickname',
    viewMenu: 'View Menu',
    orderPlaced: 'Order Placed!',
    orderDesc: 'Your order has been sent to the kitchen. We are preparing it now!',
    returning: 'Returning to menu in a moment...',
    table: 'TABLE',
    tableBill: 'Table Bill',
    welcomeTo: 'Welcome to',
    orderingAs: 'Ordering as',
    popular: 'Popular',
    allMenu: 'All Menu',
    itemsCount: 'Items',
    viewCart: 'View Cart',
    yourOrder: 'Your Order',
    reviewOrder: 'Review before confirming',
    total: 'Total',
    tryAgain: 'Try Again',
    sendingOrder: 'Placing order...',
    placeOrder: 'Place Order',
    paymentNote: 'Payment at counter',
    billTitle: 'Table Bill',
    tablePrefix: 'Table',
    noBill: 'No Bill Yet',
    noBillDesc: 'This table has been fully paid or has no orders yet.',
    grandTotal: 'Grand Total',
    paid: 'Paid',
    outstanding: 'Outstanding',
    fullyPaid: 'Fully Paid!',
    fullyPaidDesc: 'We hope you had a great experience with us. Thank you!',
    payAll: 'Pay All',
    splitEqual: 'Split Equally',
    splitItem: 'Split by Item',
    allItems: 'All Items',
    noItems: 'No items found (Please refresh)',
    menuItem: 'Menu Item',
    itemPaid: 'Paid',
    orderedBy: 'Ordered by',
    customer: 'Customer',
    payOutstanding: 'Pay outstanding balance',
    guests: 'Guests to share',
    perPerson: 'Per Person',
    payYourPart: 'Pay your part',
    paySelected: 'Pay selected items'
  },
  th: {
    loading: 'กำลังโหลด',
    configuring: 'กำลังจัดเตรียมระบบ',
    welcomeTable: 'ยินดีต้อนรับสู่โต๊ะ',
    askNickname: 'ให้เราเรียกคุณว่าอะไรดี?',
    enterNickname: 'พิมพ์ชื่อของคุณ',
    viewMenu: 'ดูเมนู',
    orderPlaced: 'สั่งอาหารสำเร็จ!',
    orderDesc: 'ออเดอร์ของคุณถูกส่งไปยังห้องครัวแล้ว เรากำลังเตรียมอาหารให้คุณ!',
    returning: 'กำลังกลับสู่หน้าเมนู...',
    table: 'โต๊ะ',
    tableBill: 'บิลของโต๊ะ',
    welcomeTo: 'ยินดีต้อนรับสู่',
    orderingAs: 'สั่งในชื่อ',
    popular: 'ยอดนิยม',
    allMenu: 'เมนูทั้งหมด',
    itemsCount: 'รายการ',
    viewCart: 'ตะกร้าของฉัน',
    yourOrder: 'ออเดอร์ของคุณ',
    reviewOrder: 'ตรวจสอบรายการก่อนยืนยัน',
    total: 'ยอดรวม',
    tryAgain: 'ลองอีกครั้ง',
    sendingOrder: 'กำลังส่งคำสั่งซื้อ...',
    placeOrder: 'ยืนยันการสั่งอาหาร',
    paymentNote: 'ชำระเงินที่เคาน์เตอร์',
    billTitle: 'บิลของโต๊ะ',
    tablePrefix: 'โต๊ะ',
    noBill: 'ยังไม่มีบิล',
    noBillDesc: 'โต๊ะนี้ยังไม่มีรายการสั่งอาหารที่ต้องชำระ',
    grandTotal: 'ยอดรวมทั้งหมด',
    paid: 'ชำระแล้ว',
    outstanding: 'ค้างชำระ',
    fullyPaid: 'ชำระเงินครบแล้ว!',
    fullyPaidDesc: 'หวังว่าลูกค้าจะได้รับประสบการณ์ที่ดีจากทางร้าน ขอบคุณที่ใช้บริการครับ',
    payAll: 'จ่ายทั้งหมด',
    splitEqual: 'หารเท่ากัน',
    splitItem: 'จ่ายแยกรายการ',
    allItems: 'รายการอาหารทั้งหมด',
    noItems: '{t.noItems}',
    menuItem: '{t.menuItem}',
    itemPaid: '{t.itemPaid}',
    orderedBy: 'สั่งโดย',
    customer: 'ลูกค้า',
    payOutstanding: 'จ่ายยอดค้างทั้งหมด',
    guests: 'จำนวนคนแชร์',
    perPerson: 'ตกคนละ',
    payYourPart: '{t.payYourPart}',
    paySelected: '{t.paySelected}'
  },
  zh: {
    loading: '加载中',
    configuring: '配置体验中',
    welcomeTable: '欢迎来到',
    askNickname: '怎么称呼您？',
    enterNickname: '输入您的昵称',
    viewMenu: '查看菜单',
    orderPlaced: '下单成功！',
    orderDesc: '您的订单已发送到厨房，我们正在为您准备！',
    returning: '即将返回菜单...',
    table: '桌号',
    tableBill: '账单',
    welcomeTo: '欢迎来到',
    orderingAs: '点餐人',
    popular: '热门',
    allMenu: '全部菜单',
    itemsCount: '项',
    viewCart: '查看购物车',
    yourOrder: '您的订单',
    reviewOrder: '确认前请核对',
    total: '总计',
    tryAgain: '重试',
    sendingOrder: '正在下单...',
    placeOrder: '确认下单',
    paymentNote: '柜台付款',
    billTitle: '桌台账单',
    tablePrefix: '桌号',
    noBill: '暂无账单',
    noBillDesc: '此桌已结账或暂未点餐。',
    grandTotal: '总计',
    paid: '已付',
    outstanding: '未付',
    fullyPaid: '已全部结清！',
    fullyPaidDesc: '希望您在这里有一个愉快的体验。感谢您的光临！',
    payAll: '支付全部',
    splitEqual: 'AA平摊',
    splitItem: '按项目付款',
    allItems: '所有项目',
    noItems: '未找到项目 (请刷新)',
    menuItem: '菜单项目',
    itemPaid: '已付',
    orderedBy: '点餐人',
    customer: '顾客',
    payOutstanding: '支付未付余额',
    guests: '平摊人数',
    perPerson: '每人',
    payYourPart: '支付您的部分',
    paySelected: '支付所选项目'
  }
}

export default function CustomerMenuPage() {
    const { locale } = useI18n();
  const { table_id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [table, setTable] = useState<any>(null)
  const [banners, setBanners] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState('all')
  const [showCart, setShowCart] = useState(false)
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [orderError, setOrderError] = useState<string | null>(null)
  const [tableClearedAlert, setTableClearedAlert] = useState(false)
  const [addedItemId, setAddedItemId] = useState<string | null>(null) // for +1 animation

  const [modifierModalItem, setModifierModalItem] = useState<MenuItem | null>(null)
  const [modifierGroups, setModifierGroups] = useState<any[]>([])
  const [tempSelectedModifiers, setTempSelectedModifiers] = useState<any[]>([])
  const [tempQuantity, setTempQuantity] = useState(1)
  const [errorGroupId, setErrorGroupId] = useState<string | null>(null)

  const [nickname, setNickname] = useState<string | null>(null)
  const [tempName, setTempName] = useState('')
  const [showTableBill, setShowTableBill] = useState(false)
  const [orderedItemCount, setOrderedItemCount] = useState(0)
  const showTableBillRef = useRef(showTableBill)
  useEffect(() => {
      showTableBillRef.current = showTableBill
  }, [showTableBill])

  const [allowQrPayment, setAllowQrPayment] = useState(true)
  const [isShopOpen, setIsShopOpen] = useState(true)
  const [shopClosedMessage, setShopClosedMessage] = useState('ขณะนี้ร้านปิดให้บริการ')
  const [tableBillItems, setTableBillItems] = useState<any[]>([])
  const [tableBillLoading, setTableBillLoading] = useState(false)
  const [lang, setLang] = useState<'th' | 'en' | 'zh'>('th')
  const isMountedRef = useRef(true)
  const nicknameRef = useRef<string | null>(null)
  const tempNameRef = useRef('')
  const tableStatusRef = useRef<string | null>(null)

  // Advanced Split-Bill & Checkout States
  const [openOrder, setOpenOrder] = useState<any>(null)
  const openOrderIdRef = useRef(openOrder?.id)

  useEffect(() => {
      openOrderIdRef.current = openOrder?.id
  }, [openOrder?.id])
  useEffect(() => {
      nicknameRef.current = nickname
  }, [nickname])
  useEffect(() => {
      tempNameRef.current = tempName
  }, [tempName])
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([])
  const [splitMode, setSplitMode] = useState<'none' | 'equal' | 'item'>('none')
  const [equalSplitCount, setEqualSplitCount] = useState<number>(2)
  const [selectedBillItems, setSelectedBillItems] = useState<Record<string, number>>({}) // order_item_id -> quantity to pay
  
  // Checkout Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'credit_card' | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'verifying' | 'success'>('idle')
  const tableClearedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (tableClearedTimeoutRef.current) {
        clearTimeout(tableClearedTimeoutRef.current)
      }
    }
  }, [])

  const clearLocalTableSession = useCallback(() => {
    setNickname(null)
    setTempName('')
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`customer_nickname_${table_id}`)
    }
  }, [table_id])

  const restoreLocalTableSession = useCallback(() => {
    if (typeof window === 'undefined') return false
    const savedName = localStorage.getItem(`customer_nickname_${table_id}`)
    if (!savedName) return false
    setNickname(savedName)
    setTempName(savedName)
    return true
  }, [table_id])

  const triggerTableClearedAnimation = useCallback(() => {
    if (!isMountedRef.current) return

    clearLocalTableSession()
    setShowTableBill(false)
    setOpenOrder(null)
    setTableBillItems([])
    setPaymentsHistory([])
    setTable(prev => (prev ? { ...prev, status: 'available' } : prev))
    setTableClearedAlert(true)

    if (tableClearedTimeoutRef.current) {
      clearTimeout(tableClearedTimeoutRef.current)
    }

    tableClearedTimeoutRef.current = setTimeout(() => {
      clearLocalTableSession()
      setOrderStatus('idle')
      setTableClearedAlert(false)
    }, 5500)
  }, [clearLocalTableSession])

  const refreshShopAvailability = useCallback(async (branchId?: string | null) => {
    let settingsQuery = supabase
      .from('pos_shop_settings')
      .select('status, is_open, status_expiry, opening_hours, branch_id')

    if (branchId) {
      settingsQuery = settingsQuery.eq('branch_id', branchId)
    } else {
      settingsQuery = settingsQuery.eq('id', '00000000-0000-0000-0000-000000000001')
    }

    const { data: settings } = await settingsQuery.maybeSingle()
    const { data: activeShifts } = branchId
      ? await supabase.from('pos_shifts').select('id').eq('status', 'open').eq('branch_id', branchId).limit(1)
      : await supabase.from('pos_shifts').select('id').eq('status', 'open').limit(1)

    const hasActiveShift = !!activeShifts?.length
    let nextOpen = hasActiveShift
    let nextMessage = 'ขณะนี้ร้านปิดให้บริการ'

    if (settings?.opening_hours) {
      setAllowQrPayment(settings.opening_hours.allow_qr_payment !== false)
    }

    if (settings?.is_open === false || settings?.status === 'closed') {
      nextOpen = false
      nextMessage = 'ขณะนี้ร้านปิดให้บริการ'
    } else if (settings?.status === 'paused') {
      nextOpen = false
      nextMessage = 'ขณะนี้ร้านหยุดรับออเดอร์ชั่วคราว'
    } else if (!hasActiveShift) {
      nextOpen = false
      nextMessage = 'ขณะนี้ร้านปิดให้บริการ'
    }

    setIsShopOpen(nextOpen)
    setShopClosedMessage(nextMessage)
    return nextOpen
  }, [])

  // Print Ref
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  })

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('zh')) setLang('zh');
      else if (browserLang.startsWith('en')) setLang('en');
      else setLang('th');
    }
    fetchData()
  }, [])

  const fetchOrderedItemCount = async (orderId: string) => {
    const { data } = await supabase.from('pos_order_items').select('quantity').eq('order_id', orderId)
    if (data) {
        setOrderedItemCount(data.reduce((acc, i) => acc + (i.quantity || 1), 0))
    }
  }

  const checkTableSession = async (tableData: any, options?: { animateOnRelease?: boolean }) => {
      const { data: openOrderData } = await supabase.from('pos_orders')
          .select('id, total_amount')
          .eq('table_id', tableData.id)
          .in('status', ['pending', 'accepted', 'preparing', 'served', 'payment_pending'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

      if (openOrderData) {
          setOpenOrder(openOrderData)
          fetchOrderedItemCount(openOrderData.id)
          // Check if fully paid
          const { data: payments } = await supabase.from('pos_order_payments').select('amount').eq('order_id', openOrderData.id)
          const gTotal = Number(openOrderData.total_amount)
          const tPaid = (payments || []).reduce((acc: number, p: any) => acc + Number(p.amount), 0)

          if (tPaid >= gTotal - 0.05 && gTotal > 0) {
              // It's fully paid but not marked completed yet.
              // We will let fetchTableBill handle the actual DB completion if they open the bill.
              // Or we can just complete it here.
              await supabase.from('pos_orders').update({ status: 'completed' }).eq('id', openOrderData.id)
              await supabase.from('pos_tables').update({ status: 'available' }).eq('id', tableData.id)
              
              if (options?.animateOnRelease) triggerTableClearedAnimation()
              else clearLocalTableSession()
          } else {
              if (!restoreLocalTableSession()) {
                  setNickname(null)
                  setTempName('')
              }
          }
      } else {
          // No active order!
          setOrderedItemCount(0)
          if (tableData.status === 'occupied') {
              // But table is occupied (someone just entered name but hasn't ordered yet)
              // Restore their name so they don't lose it on refresh!
              if (!restoreLocalTableSession()) {
                  setNickname(null)
                  setTempName('')
              }
          } else {
              // Table is available. Force new session.
              clearLocalTableSession()
          }
      }
  }

  const fetchData = async () => {
    setLoading(true)
    const [itemRes, catRes, tableRes, bannerRes] = await Promise.all([
        supabase.from('pos_menu_items').select('*, category:pos_menu_categories(name)').eq('is_active', true).order('name', { ascending: true }),
        supabase.from('pos_menu_categories').select('*').order('order_index'),
        supabase.from('pos_tables').select('*').eq('table_number', table_id).single(),
        supabase.from('pos_banners').select('*').eq('is_active', true).order('order_index')
    ])

    if (itemRes.data) setItems(sortMenuItemsByOrder(itemRes.data))
    if (catRes.data) setCategories(catRes.data)
    if (bannerRes.data) setBanners(bannerRes.data)
    if (tableRes.data) {
      if (tableRes.data.branch_id) {
        const bName = await getBranchName(tableRes.data.branch_id);
        tableRes.data.branch = { ...tableRes.data.branch, name: bName || 'XYL STUDIO' };
      }
      if (!tableRes.data.branch) {
        tableRes.data.branch = { name: 'XYL STUDIO' };
      }
      tableStatusRef.current = tableRes.data.status ?? null
      setTable(tableRes.data)
      
      await refreshShopAvailability(tableRes.data.branch_id)

      // Check session using the fetched table
      await checkTableSession(tableRes.data, { animateOnRelease: false })
    }
    setLoading(false)
  }

  const handleSetNickname = async () => {
      const open = await refreshShopAvailability(table?.branch_id)
      if (!open) {
          alert(shopClosedMessage || 'ขณะนี้ร้านปิดให้บริการ')
          return
      }

      if (tempName.trim()) {
          const name = tempName.trim()
          setNickname(name)
          if (typeof window !== 'undefined') {
              localStorage.setItem(`customer_nickname_${table_id}`, name)
          }
          if (table?.id) {
              setTable(prev => prev ? { ...prev, status: 'occupied' } : prev)
              await supabase.from('pos_tables').update({ status: 'occupied' }).eq('id', table.id)
          }
      }
  }

  const fetchTableBill = async () => {
      if (!table) return
      setTableBillLoading(true)
      setShowTableBill(true)
      
      const { data: openOrderData } = await supabase.from('pos_orders')
          .select('*')
          .eq('table_id', table.id)
          .in('status', ['pending', 'accepted', 'preparing', 'served', 'payment_pending'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

      if (openOrderData) {
          setOpenOrder(openOrderData)
          if (openOrderData.payment_split_mode) {
              setSplitMode(openOrderData.payment_split_mode)
          }
          
          const { data: orderItems } = await supabase.from('pos_order_items')
              .select('*, item:pos_menu_items!item_id(name)')
              .eq('order_id', openOrderData.id)
          
          setTableBillItems(orderItems || [])

          // Fetch payments history
          let query = supabase.from('pos_shop_settings').select('opening_hours')
          if (table.branch_id) {
              query = query.eq('branch_id', table.branch_id)
          } else {
              query = query.eq('id', '00000000-0000-0000-0000-000000000001')
          }
          const { data: shopSettings } = await query.maybeSingle()
          const { data: payments } = await supabase.from('pos_order_payments')
              .select('*')
              .eq('order_id', openOrderData.id)
          
          setPaymentsHistory(payments || [])
          
          const gTotal = Number(openOrderData.total_amount)
          const tPaid = (payments || []).reduce((acc: number, p: any) => acc + Number(p.amount), 0)
          
          // AUTO COMPLETE IF FULLY PAID (e.g. they refreshed without closing the bill)
          if (tPaid >= gTotal - 0.05 && gTotal > 0) {
              await supabase.from('pos_orders').update({ status: 'completed' }).eq('id', openOrderData.id)
              await supabase.from('pos_tables').update({ status: 'available' }).eq('id', table.id)
              
              triggerTableClearedAnimation()
              setOpenOrder(null)
              setTableBillItems([])
              setPaymentsHistory([])
          } else {
              if (!restoreLocalTableSession()) {
                  setNickname(null)
                  setTempName('')
              }
          }
      } else {
          setOpenOrder(null)
          setTableBillItems([])
          setPaymentsHistory([])
          setOrderedItemCount(0)
          // NO ACTIVE ORDER!
          if (table.status === 'occupied') {
              // But table is occupied (someone just entered name but hasn't ordered yet)
              // Restore their name so they don't lose it on refresh!
              if (!restoreLocalTableSession()) {
                  setNickname(null)
                  setTempName('')
              }
          } else {
              // Leave session active
          }
      }
      setTableBillLoading(false)
  }

  // Real-time listener for table order, items, and payments updates
  useEffect(() => {
    if (!table) return

    const channel = supabase
      .channel(`table-${table.id}-realtime`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_orders' }, (payload) => {
        const newOrder = payload.new as any;
        // If order is completed/paid from POS, clear the QR session
        if (payload.eventType === 'UPDATE' && newOrder?.table_id === table.id && (newOrder?.status === 'completed' || newOrder?.status === 'paid')) {
            triggerTableClearedAnimation()
        }
        if (showTableBillRef.current) fetchTableBill()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_order_items' }, () => {
        if (openOrderIdRef.current) fetchOrderedItemCount(openOrderIdRef.current)
        if (showTableBillRef.current) fetchTableBill()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_order_payments' }, () => {
        checkTableSession(table, { animateOnRelease: true })
        if (showTableBillRef.current) fetchTableBill()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pos_tables', filter: `id=eq.${table.id}` }, (payload) => {
        const newTable = payload.new as any;
        tableStatusRef.current = newTable.status ?? null
        setTable(prev => (prev ? { ...prev, ...newTable } : prev))
        if (newTable.status === 'available') {
            triggerTableClearedAnimation()
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_shop_settings' }, () => {
        refreshShopAvailability(table.branch_id)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_shifts' }, () => {
        refreshShopAvailability(table.branch_id)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_menu_items' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, clearLocalTableSession, triggerTableClearedAnimation, refreshShopAvailability]) // Removed showTableBill from dependencies so channel isn't recreated

  useEffect(() => {
    if (!table?.id || tableClearedAlert) return

    const interval = setInterval(async () => {
      const { data: latestTable } = await supabase
        .from('pos_tables')
        .select('*')
        .eq('id', table.id)
        .maybeSingle()

      if (!latestTable) return

      const previousStatus = tableStatusRef.current
      const latestStatus = latestTable.status ?? null

      if (previousStatus !== latestStatus) {
        tableStatusRef.current = latestStatus
        setTable(prev => (prev ? { ...prev, ...latestTable } : latestTable))
      }

      const hasActiveCustomerSession = !!nicknameRef.current
      const hasOpenOrderSession = !!openOrderIdRef.current || showTableBillRef.current

      if (latestStatus === 'available' && previousStatus && previousStatus !== 'available' && (hasActiveCustomerSession || hasOpenOrderSession)) {
        triggerTableClearedAnimation()
        return
      }

      if (hasOpenOrderSession) {
        await checkTableSession(latestTable, { animateOnRelease: true })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [table?.id, tableClearedAlert, triggerTableClearedAnimation])

  // Prevent background scrolling when modals are open
  useEffect(() => {
    const isModalOpen = showCart || showTableBill || showPaymentModal || !!modifierModalItem || tableClearedAlert || orderStatus === 'success'
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showCart, showTableBill, showPaymentModal, modifierModalItem, tableClearedAlert, orderStatus])

  // Split-Bill Calculations & Helpers
  const grandTotal = openOrder ? Number(openOrder.total_amount) : 0
  const totalPaid = paymentsHistory.reduce((acc, p) => acc + Number(p.amount), 0)
  const outstandingBalance = Math.max(0, grandTotal - totalPaid)
  const isSplitLocked = !!(openOrder?.payment_split_mode || paymentsHistory.length > 0)

  // Subtotal for selected items
  const selectedItemsTotal = tableBillItems.reduce((acc, item) => {
      const selectedQty = selectedBillItems[item.id] || 0
      return acc + (Number(item.unit_price) * selectedQty)
  }, 0)

  const handleToggleItemSelect = (itemId: string, maxQty: number) => {
      setSelectedBillItems(prev => {
          const current = prev[itemId] || 0
          if (current > 0) {
              const updated = { ...prev }
              delete updated[itemId]
              return updated
          } else {
              return { ...prev, [itemId]: maxQty }
          }
      })
  }

  const handleUpdateItemQty = (itemId: string, delta: number, maxQty: number) => {
      setSelectedBillItems(prev => {
          const current = prev[itemId] || 0
          const updated = current + delta
          if (updated <= 0) {
              const next = { ...prev }
              delete next[itemId]
              return next
          }
          if (updated > maxQty) return prev
          return { ...prev, [itemId]: updated }
      })
  }

  const handleInitiatePayment = (method: 'promptpay' | 'credit_card', amount: number) => {
      if (amount <= 0) return
      setPaymentMethod(method)
      setPaymentAmount(amount)
      setShowPaymentModal(true)
      setPaymentStatus('idle')
  }

  const handleConfirmMockPayment = async () => {
      if (!openOrder || !paymentMethod) return
      setPaymentStatus('processing')
      
      setTimeout(() => {
          setPaymentStatus('verifying')
          
          setTimeout(async () => {
              const transactionId = `TX-${Date.now().toString().slice(-6)}`
              
              // 1. Record payment in DB
              const { data: newPayment, error: payError } = await supabase.from('pos_order_payments').insert({
                  order_id: openOrder.id,
                  payment_method: paymentMethod,
                  amount: paymentAmount,
                  transaction_id: transactionId,
                  status: 'paid'
              }).select().single()

              if (payError) {
                  console.error('Payment insertion error:', payError)
              }

              // 2. Calculate updated payments
              const existingPayments = openOrder.pos_order_payments || []
              const previousTotal = existingPayments.reduce((acc: number, p: any) => acc + Number(p.amount), 0)
              const newTotalPaid = previousTotal + paymentAmount
              
              // NEW: Mark item status as paid for item splits
              if (splitMode === 'item' && Object.keys(selectedBillItems).length > 0) {
                  for (const [itemId, paidQty] of Object.entries(selectedBillItems)) {
                      const dbItem = tableBillItems.find(i => i.id === itemId)
                      if (!dbItem) continue
                      
                      if (paidQty === dbItem.quantity) {
                          await supabase.from('pos_order_items').update({ status: 'paid' }).eq('id', itemId)
                      } else if (paidQty > 0 && paidQty < dbItem.quantity) {
                          await supabase.from('pos_order_items').update({ quantity: dbItem.quantity - paidQty }).eq('id', itemId)
                          const { item, id, created_at, ...restRowData } = dbItem
                          await supabase.from('pos_order_items').insert({
                              ...restRowData,
                              quantity: paidQty,
                              status: 'paid'
                          })
                      }
                  }
              }
              
              // 3. Update order state if settled
              if (newTotalPaid >= grandTotal - 0.05) {
                  await supabase.from('pos_orders')
                      .update({ status: 'completed', paid_at: new Date().toISOString(), payment_method: paymentMethod })
                      .eq('id', openOrder.id)
                  
                  // Also mark ALL items as completed/paid
                  await supabase.from('pos_order_items').update({ status: 'paid' }).eq('order_id', openOrder.id)

                  // Free the table
                  if (table?.id) {
                      await supabase.from('pos_tables').update({ status: 'available' }).eq('id', table.id)
                  }
                  
                  // Clear the saved nickname so next session asks for a new one
                  clearLocalTableSession()
                  // We do not clear state here so they can see the success message
                  // It will be cleared when they click Close.
              }

              setPaymentStatus('success')
              if (newPayment) setPaymentsHistory(prev => [...prev, newPayment])
              setSelectedBillItems({})
              
              // Refetch table bill to show fresh numbers
              await fetchTableBill()
          }, 2000)
      }, 1500)
  }

  const handleItemClick = async (item: MenuItem) => {
    if (!isShopOpen) {
      alert(shopClosedMessage || 'ขณะนี้ร้านปิดให้บริการ')
      return
    }
    
    try {
      const { data: links } = await supabase
        .from('pos_item_modifier_links')
        .select('group_id')
        .eq('item_id', item.id)

      if (!links || links.length === 0) {
        addToCart(item)
        return
      }

      const groupIds = links.map(l => l.group_id)
      const { data: groups } = await supabase
        .from('pos_menu_modifier_groups')
        .select('*, options:pos_menu_modifiers(*)')
        .in('id', groupIds)
        .order('sort_order', { ascending: true })

      if (!groups || groups.length === 0) {
        addToCart(item)
        return
      }

      const sortedGroups = groups.map(g => ({
        ...g,
        options: (g.options || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      }))
      setModifierGroups(sortedGroups)
      setModifierModalItem(item)
      setTempSelectedModifiers([])
      setTempQuantity(1)
    } catch (err) {
      console.error('Error loading modifiers:', err)
      addToCart(item)
    }
  }

  const addToCart = (item: MenuItem, modifiers: any[] = [], qty: number = 1) => {
    if (!isShopOpen) {
      alert(shopClosedMessage || 'ขณะนี้ร้านปิดให้บริการ')
      return
    }

    setCart(prev => {
        const existingIdx = prev.findIndex(i => {
           return isSameCartLine(i, item.id, modifiers)
        })

        if (existingIdx >= 0) {
           const newCart = [...prev]
           newCart[existingIdx] = { ...newCart[existingIdx], quantity: newCart[existingIdx].quantity + qty }
           return newCart
        }
        
        return [...prev, { ...item, quantity: qty, selected_modifiers: modifiers }]
    })
    
    setAddedItemId(item.id)
    setTimeout(() => setAddedItemId(null), 700)
    setModifierModalItem(null)
  }

  const updateQty = (id: string, modifiers: any[] = [], delta: number) => {
    setCart(prev => {
      const result = prev
        .map(i => isSameCartLine(i, id, modifiers) ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
      if (result.length === 0) setShowCart(false)
      return result
    })
  }

  const updateCartItemNote = (id: string, modifiers: any[] = [], note: string) => {
    setCart(prev => prev.map(item => (isSameCartLine(item, id, modifiers) ? { ...item, note } : item)))
  }

  const cartTotal = cart.reduce((acc, i) => acc + (getCartItemUnitPrice(i) * i.quantity), 0)

  const handlePlaceOrder = async () => {
      const open = await refreshShopAvailability(table?.branch_id)
      if (!open) {
        setOrderError(shopClosedMessage || 'ขณะนี้ร้านปิดให้บริการ')
        setOrderStatus('error')
        return
      }

      if (!table?.id) {
        setOrderError('ไม่พบข้อมูลโต๊ะ กรุณาสแกน QR ใหม่')
        setOrderStatus('error')
        return
      }
      if (cart.length === 0) return

      setOrderStatus('submitting')
      setOrderError(null)

      try {
        let targetOrderId = ''

        // 1. หา pending order ของโต๊ะนี้ (ถ้ามี)
        const { data: existingOrder, error: fetchErr } = await supabase
          .from('pos_orders')
          .select('id, total_amount')
          .eq('table_id', table.id)
          .eq('status', 'pending')
          .maybeSingle()

        if (fetchErr) throw new Error('ดึงข้อมูลออเดอร์ไม่ได้: ' + fetchErr.message)

        if (existingOrder) {
          // มีออเดอร์อยู่แล้ว → อัปเดตยอดรวม
          targetOrderId = existingOrder.id
          const { error: updErr } = await supabase
            .from('pos_orders')
            .update({ total_amount: Number(existingOrder.total_amount) + cartTotal })
            .eq('id', existingOrder.id)
          if (updErr) throw new Error('อัปเดตยอดไม่ได้: ' + updErr.message)
        } else {
          // สร้างออเดอร์ใหม่
          const orderNumber = `QR-${Date.now().toString().slice(-6)}`
          const insertPayload = {
            order_number: orderNumber,
            table_id: table.id,
            table_number: String(table.table_number || table_id),
            total_amount: cartTotal,
            status: 'pending',
            source: 'qr',
            kds_status: 'pending',
            ...(table.branch_id ? { branch_id: table.branch_id } : {}),
          }
          const { data: newOrder, error: insertErr } = await supabase
            .from('pos_orders')
            .insert(insertPayload)
            .select('id')
            .single()

          if (insertErr) throw new Error('สร้างออเดอร์ไม่ได้: ' + insertErr.message)
          if (!newOrder?.id) throw new Error('ไม่ได้รับ order ID จาก DB')
          targetOrderId = newOrder.id
          
          // Update table status to occupied
          await supabase.from('pos_tables').update({ status: 'occupied' }).eq('id', table.id)
        }

        // 2. Insert รายการสินค้า
        const orderItems = cart.map(i => ({
          order_id: targetOrderId,
          item_id: i.id,
          quantity: i.quantity,
          unit_price: Number(i.sale_price || i.price || 0),
          cost_price: i.cost_price || 0,
          subtotal: getCartItemUnitPrice(i) * i.quantity,
          customer_name: nickname || null,
          selected_modifiers: buildOrderItemModifiers(i.selected_modifiers || [], i.note),
        }))

        const { data: insertedItems, error: itemsErr } = await supabase.from('pos_order_items').insert(orderItems).select('id')
        if (itemsErr) throw new Error('บันทึกรายการไม่ได้: ' + itemsErr.message)

        // 3. Update total_amount in pos_orders so POS gets the correct total
        const { data: allItems } = await supabase.from('pos_order_items').select('subtotal').eq('order_id', targetOrderId)
        if (allItems) {
            const newTotal = allItems.reduce((sum, item) => sum + (item.subtotal || 0), 0)
            await supabase.from('pos_orders').update({ total_amount: newTotal, updated_at: new Date().toISOString() }).eq('id', targetOrderId)
        }

        // 4. สำเร็จ
        setCart([])
        setShowCart(false)
        setOrderStatus('success')
        setTimeout(() => setOrderStatus('idle'), 3000)
        
        // 5. Update openOrder state so realtime listener knows the ID
        setOpenOrder({ id: targetOrderId })
        fetchOrderedItemCount(targetOrderId)

        // 6. Send broadcast to POS for auto-print and alert
        // IMPORTANT: sender channel name MUST match the receiver channel name
        if (insertedItems && insertedItems.length > 0) {
            const payload = { order_id: targetOrderId, new_item_ids: insertedItems.map(i => i.id) }
            
            // Small delay to ensure items are fully committed in DB before POS queries them
            await new Promise(resolve => setTimeout(resolve, 600))
            
            // Sender must subscribe to SAME channel name that iPad POS is listening on
            const printChannel = supabase.channel('pos_qr_broadcast_print')
            printChannel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await printChannel.send({ type: 'broadcast', event: 'qr_order_placed', payload })
                    setTimeout(() => supabase.removeChannel(printChannel), 3000)
                }
            })
            
            const alertChannel = supabase.channel('pos_qr_broadcast_alert')
            alertChannel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await alertChannel.send({ type: 'broadcast', event: 'qr_order_placed', payload })
                    setTimeout(() => supabase.removeChannel(alertChannel), 3000)
                }
            })
        }

      } catch (err: any) {
        console.error('[QR Order Error]', err)
        setOrderError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        setOrderStatus('error')
      }
  }

  const t = translations[lang] || translations.th

  if (loading) return (
     <div className="min-h-screen bg-white flex flex-col items-center justify-center text-black">
        <Loader2 className="animate-spin mb-4" size={24} />
        <h2 className="text-lg font-black uppercase tracking-widest">{t.loading}</h2>
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-2">{t.configuring}</p>
     </div>
  )

  if (tableClearedAlert) {
      return (
          <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
                  <Sparkles size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">
                  {locale === 'en' ? 'Thank you' : locale === 'zh' ? '谢谢惠顾' : 'ขอบคุณที่ใช้บริการ'}
              </h2>
              <p className="text-gray-400 text-sm max-w-[250px] leading-relaxed">
                  {locale === 'en'
                      ? 'Your table has been cleared successfully. We hope to see you again soon.'
                      : locale === 'zh'
                        ? 'โต๊ะนี้ถูกเคลียร์เรียบร้อยแล้ว ขอบคุณมาก แล้วพบกันใหม่ครับ'
                        : 'โต๊ะนี้ถูกเคลียร์เรียบร้อยแล้ว ขอบคุณมาก แล้วพบกันใหม่ครับ'}
              </p>
          </div>
      )
  }

  if (!isShopOpen) {
      return (
          <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center text-black">
              <div className="w-20 h-20 bg-gray-100 flex items-center justify-center mb-6">
                  <Clock size={34} className="text-gray-500" />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tighter mb-3">{table?.branch?.name || 'XYL STUDIO'}</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 mb-6">{t.table} {table?.table_number || table_id}</p>
              <div className="border border-red-100 bg-red-50 px-6 py-4 text-red-600 text-sm font-black">
                  {shopClosedMessage || 'ขณะนี้ร้านปิดให้บริการ'}
              </div>
          </div>
      )
  }

  // Nickname Prompt
  if (!nickname && orderStatus === 'idle') {
      return (
          <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-black">
              <div className="w-full max-w-sm flex flex-col items-center text-center">
                  <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">{table?.branch?.name || 'XYL STUDIO'}</h1>
                  <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-10 border border-gray-200 px-4 py-1">{t.welcomeTable} <span className="text-black">{table?.table_number || table_id}</span></p>
                  
                  <div className="w-full space-y-6">
                      <div className="space-y-3">
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{t.askNickname}</label>
                          <input 
                              type="text" 
                              value={tempName}
                              onChange={e => setTempName(e.target.value)}
                              placeholder={t.enterNickname}
                              className="w-full bg-gray-50 border border-gray-200 px-6 py-4 focus:outline-none focus:border-black transition-colors text-center font-black uppercase text-lg text-black placeholder:text-gray-300 rounded-none"
                              onKeyDown={e => e.key === 'Enter' && handleSetNickname()}
                          />
                      </div>
                      <button 
                          onClick={handleSetNickname}
                          disabled={!tempName.trim()}
                          className="w-full py-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.3em] transition-all hover:bg-gray-900 active:bg-black disabled:opacity-50 rounded-none"
                      >
                          {t.viewMenu}
                      </button>
                  </div>
              </div>
          </div>
      )
  }

  if (orderStatus === 'success') return (
    <div className="min-h-screen bg-white p-8 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-black text-white flex items-center justify-center mb-8 animate-bounce rounded-none">
            <Check size={32} strokeWidth={3} />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-black mb-3">{t.orderPlaced}</h1>
        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest max-w-xs leading-relaxed">{t.orderDesc}</p>
        <div className="mt-8 flex items-center gap-2">
            <Loader2 className="animate-spin text-black" size={12} />
            <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">{t.returning}</span>
        </div>
    </div>
  )

  // Keep the menu visible even if the online-availability flag was toggled
  // incorrectly. Stock should only affect whether an item can be added, not
  // whether the whole menu page goes blank.
  const activeItems = items.filter(i => i.is_active !== false)
  const onlineItems = activeItems.filter(i => i.is_online_available !== false)
  const displayItems = onlineItems.length > 0 ? onlineItems : activeItems
  const popularItems = displayItems.filter(i => i.is_popular || i.is_recommended)
  const menuSections = [
    ...categories,
    { id: 'uncategorized', name: 'อื่นๆ' }
  ]

  return (
    <div className="min-h-screen bg-white text-black pb-32 font-sans selection:bg-black selection:text-white">
        {/* Professional Header - Exactly like Mockup */}
        <div className="relative w-full h-64 sm:h-[320px] bg-black overflow-hidden shrink-0">
            {/* Banner Image */}
            {banners.length > 0 ? (
                <PromoBannerSlider banners={banners} />
            ) : table?.branch?.image_url ? (
                <img src={table.branch.image_url} className="w-full h-full object-cover" />
            ) : null}
            
            {/* Gradient Overlay for Text Readability - Dark at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none"></div>
            
            {/* Info Panel - Text floating on gradient */}
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-4 text-white">
                    <h1 className="text-sm sm:text-base font-bold tracking-wide leading-none">{table?.branch?.name || 'XYL STUDIO'}</h1>
                    <div className="w-1 h-1 bg-white/50 rounded-full hidden sm:block"></div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                        <span className="text-xs sm:text-sm text-white/80 tracking-wide font-medium">{t.table || 'TABLE'} {table?.table_number || table_id}</span>
                        {nickname && (
                            <span className="text-[10px] sm:text-xs text-white/60 tracking-widest font-black uppercase mt-1 sm:mt-0">
                                {t.orderedBy || 'AS'}: {nickname}
                            </span>
                        )}
                    </div>
                </div>
                <button onClick={fetchTableBill} className="relative flex-shrink-0 flex items-center gap-2 bg-transparent border border-white/50 text-white px-4 py-1.5 text-[10px] sm:text-xs font-bold tracking-widest uppercase hover:bg-white/10 transition-colors rounded-full backdrop-blur-sm">
                    <Banknote size={14} /> {t.tableBill}
                    {orderedItemCount > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-4 h-4 sm:w-5 sm:h-5 sm:text-[10px] flex items-center justify-center rounded-full shadow-md font-black">
                            {orderedItemCount}
                        </div>
                    )}
                </button>
            </div>
        </div>

        {/* Category Navigation - Mockup Style */}
        <div className="sticky top-0 z-40 bg-white shadow-sm flex flex-col w-full">
            <div className="flex overflow-x-auto scrollbar-hide px-4 sm:px-10 border-b border-gray-100 items-end min-h-[50px]">
                {popularItems.length > 0 && (
                    <button 
                        onClick={() => setActiveCategoryId('popular')}
                        className={`flex-shrink-0 px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap ${activeCategoryId === 'popular' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'} ${isSplitLocked ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                        {t.popular}
                    </button>
                )}
                <button 
                    onClick={() => setActiveCategoryId('all')}
                    className={`flex-shrink-0 px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap ${activeCategoryId === 'all' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
                >
                    {t.allMenu}
                </button>
                {categories.map(cat => (
                    <button 
                        key={cat.id}
                        onClick={() => setActiveCategoryId(cat.id)}
                        className={`flex-shrink-0 px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap ${activeCategoryId === cat.id ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>
            
            {/* Search Bar - Mockup Style */}
            <div className="px-5 py-3">
                <div className="bg-gray-100/80 flex items-center gap-2 px-4 py-2 rounded-xl text-gray-500">
                    <Search size={16} />
                    <input type="text" placeholder="Search" className="bg-transparent border-none focus:outline-none text-sm w-full font-medium" />
                </div>
            </div>
        </div>

        {/* 🏆 Tier 1: Signature Series (Recommended) */}
        {activeCategoryId === 'all' && (
          <section className="px-4 sm:px-6 mt-6 max-w-7xl mx-auto">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 mb-6 flex items-center gap-3">
              <Star size={12} fill="currentColor" /> {locale === 'en' ? 'Signature Series • Recommended menu' : locale === 'zh' ? '招牌系列 • 推荐菜单' : 'Signature Series • เมนูแนะนำ'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {displayItems.filter(i => i.is_recommended).slice(0, 4).map(item => (
                <div key={item.id} className={`bg-white border border-gray-100 flex flex-col group overflow-hidden shadow-sm relative ${item.in_stock === false ? 'opacity-60 grayscale' : ''}`}>
                   <div className={`relative aspect-square bg-gray-50 overflow-hidden ${item.in_stock !== false ? 'cursor-pointer' : 'cursor-not-allowed'}`} onClick={() => item.in_stock !== false && handleItemClick(item)}>
                     {item.image_url ? <img src={item.image_url} alt={getPrimaryMenuName(item)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="absolute inset-0 flex items-center justify-center text-gray-300"><Utensils size={24} strokeWidth={1} /></div>}
                     {item.in_stock === false && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-[2px] pointer-events-none">
                           <div className="flex flex-col items-center gap-2">
                             <span className="bg-red-600 text-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">สินค้าหมด</span>
                             <span className="bg-white/90 text-red-600 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] shadow-sm">Unavailable</span>
                           </div>
                        </div>
                     )}
                     <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-400 text-white text-[6px] font-black uppercase tracking-widest z-30">Signature</div>
                   </div>
                   <div className="p-3 relative z-10">
                      <h3 className="text-[11px] font-black text-black line-clamp-1 uppercase tracking-tighter">{getPrimaryMenuName(item)}</h3>
                      {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en') && (
                        <p className="mt-1 text-[9px] font-semibold text-gray-500 line-clamp-1">
                          {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en')}
                        </p>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[11px] font-black text-emerald-600">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{item.sale_price}</span>
                        <button disabled={item.in_stock === false} onClick={() => item.in_stock !== false && handleItemClick(item)} className={`w-8 h-8 flex items-center justify-center rounded-none shadow-lg transition-all ${item.in_stock === false ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white active:scale-90'}`}>
                          <Plus size={14} />
                        </button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ❤️ Tier 2: Most Loved (Best Sellers) */}
        {activeCategoryId === 'all' && (
          <section className="px-4 sm:px-6 mt-10 mb-6 max-w-7xl mx-auto">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-6 px-1">{locale === 'en' ? 'Most Loved • เมนูยอดนิยม' : locale === 'zh' ? 'Most Loved • เมนูยอดนิยม' : 'Most Loved • เมนูยอดนิยม'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {displayItems.filter(i => i.is_popular).slice(0, 4).map(item => (
                <div key={item.id} className={`bg-white border border-gray-100 flex flex-col group overflow-hidden relative ${item.in_stock === false ? 'opacity-60 grayscale' : ''}`}>
                   <div className={`relative aspect-[4/3] bg-gray-50 overflow-hidden ${item.in_stock !== false ? 'cursor-pointer' : 'cursor-not-allowed'}`} onClick={() => item.in_stock !== false && handleItemClick(item)}>
                     {item.image_url ? <img src={item.image_url} alt={getPrimaryMenuName(item)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="absolute inset-0 flex items-center justify-center text-gray-300"><Utensils size={24} strokeWidth={1} /></div>}
                     {item.in_stock === false && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-[2px] pointer-events-none">
                           <div className="flex flex-col items-center gap-2">
                             <span className="bg-red-600 text-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">สินค้าหมด</span>
                             <span className="bg-white/90 text-red-600 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] shadow-sm">Unavailable</span>
                           </div>
                        </div>
                     )}
                     <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/40 backdrop-blur-md text-white text-[6px] font-black uppercase tracking-widest z-30">Pop</div>
                   </div>
                   <div className="p-3 relative z-10">
                      <h3 className="text-[10px] font-bold text-gray-800 line-clamp-1">{getPrimaryMenuName(item)}</h3>
                      {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en') && (
                        <p className="mt-1 text-[8px] font-semibold text-gray-500 line-clamp-1">
                          {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en')}
                        </p>
                      )}
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] font-black">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{item.sale_price}</span>
                        <button disabled={item.in_stock === false} onClick={() => item.in_stock !== false && handleItemClick(item)} className={`w-7 h-7 border flex items-center justify-center rounded-none transition-all ${item.in_stock === false ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-100 text-gray-400 hover:bg-black hover:text-white'}`}>
                          <Plus size={12} />
                        </button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 📦 Full Collections: Categorized Browsing (Full-width Rows) - Matching LIFF Style */}
        <div className="p-4 sm:p-6 pb-40 space-y-12 max-w-7xl mx-auto bg-white">
          {menuSections.filter(c => activeCategoryId === 'all' || c.id === activeCategoryId).map(cat => {
            const catItems = displayItems.filter(i =>
              cat.id === 'uncategorized'
                ? !i.category_id || !categories.find(category => category.id === i.category_id)
                : i.category_id === cat.id
            );
            if (catItems.length === 0) return null;
            return (
              <div key={cat.id} className="space-y-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-black whitespace-nowrap">{cat.name}</h2>
                    <div className="h-px bg-gray-100 w-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catItems.map(item => (
                    <div key={item.id} className={`group bg-white border border-gray-100 p-4 transition-all hover:border-emerald-100 flex gap-5 ${item.in_stock === false ? 'opacity-60 grayscale' : ''}`}>
                       <div className={`relative w-24 h-24 flex-shrink-0 bg-gray-50 overflow-hidden ${item.in_stock !== false ? 'cursor-pointer' : 'cursor-not-allowed'}`} onClick={() => item.in_stock !== false && handleItemClick(item)}>
                         {item.image_url ? (
                             <img src={item.image_url} alt={getPrimaryMenuName(item)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                         ) : (
                             <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                <Utensils size={24} strokeWidth={1} />
                             </div>
                         )}
                         {item.in_stock === false && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                               <span className="bg-[#1A1A18] text-white px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] shadow-lg">สินค้าหมด</span>
                            </div>
                         )}
                         {(item.is_popular || item.is_recommended) && (
                            <div className="absolute top-0 left-0 bg-black text-white px-1.5 py-0.5 text-[6px] font-black uppercase tracking-widest rounded-none z-30">
                                HOT
                            </div>
                         )}
                       </div>
                       <div className="flex-1 flex flex-col justify-between py-1 relative z-10">
                          <div>
                            <h3 className="text-[12px] font-black uppercase tracking-tighter text-[#1A1A18] mb-1 leading-tight">{getPrimaryMenuName(item)}</h3>
                            {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en') && (
                              <p className="text-[9px] font-semibold text-gray-500 mb-1 line-clamp-1">
                                {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en')}
                              </p>
                            )}
                            {item.description?.trim() && (
                              <p className="text-[9px] font-medium text-gray-400 line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm font-black text-black">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{(item.sale_price || 0).toLocaleString()}</span>
                            <button disabled={item.in_stock === false} onClick={() => item.in_stock !== false && handleItemClick(item)} className={`px-5 py-2 text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${item.in_stock === false ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}>
                                ADD TO CART
                            </button>
                          </div>
                          
                          {/* Animated +1 badge when added */}
                          {addedItemId === item.id && (
                             <span className="absolute bottom-10 right-4 text-[10px] font-black text-white bg-black px-2 py-0.5 rounded-none shadow-[0_4px_10px_rgba(0,0,0,0.1)] animate-bounce whitespace-nowrap z-10">+1</span>
                          )}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {displayItems.length === 0 && (
            <div className="flex min-h-[240px] items-center justify-center border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">ยังไม่มีเมนูแสดงผล</div>
                <p className="mt-3 text-sm font-medium text-gray-400">เมนูอาจยังไม่ถูกผูกหมวดหรือยังไม่เปิดขายออนไลน์</p>
              </div>
            </div>
          )}
        </div>

        {/* Floating Mini Cart */}
        {cart.length > 0 && !showCart && (
             <div className="fixed bottom-0 left-0 right-0 z-50 bg-black text-white p-4 sm:p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom duration-300">
                <div className="max-w-screen-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 border border-white/20 flex items-center justify-center font-black text-lg">
                          {cart.reduce((a,c)=>a+c.quantity, 0)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50">{cart.reduce((a,c)=>a+c.quantity,0)} {t.itemsCount}</span>
                            <span className="text-xl font-black tracking-tighter leading-none mt-1">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{cartTotal.toLocaleString()}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowCart(true)}
                        className="bg-white text-black px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-colors hover:bg-gray-200 active:bg-gray-300"
                    >
                        <ShoppingCart size={14} /> {t.viewCart}
                    </button>
                </div>
             </div>
        )}

        {/* Full-screen / Sidebar Cart */}
        {showCart && (
            <div className="fixed inset-0 z-[100] flex justify-end">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowCart(false)}></div>
                <div className="relative w-full max-w-md bg-white h-screen flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300">
                    <header className="px-6 py-8 border-b border-gray-100 flex justify-between items-end bg-white">
                        <div>
                             <h2 className="text-2xl font-black uppercase tracking-tighter text-black">{t.yourOrder}</h2>
                             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mt-1 block">
                                 {nickname ? `${t.orderedBy || 'ORDERING AS'}: ${nickname} • ` : ''} 
                                 {t.table || 'TABLE'}: {table?.table_number || table_id}
                             </span>
                        </div>
                        <button onClick={() => setShowCart(false)} className="w-10 h-10 border border-gray-200 text-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"><X size={18} /></button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 overflow-x-hidden">
                        <AnimatePresence>
                            {cart.map(item => (
                                <motion.div 
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    className="relative flex gap-4 items-start border-b border-gray-50 pb-6 mb-6 last:border-0 last:mb-0"
                                >
                                    <div className="w-20 h-20 bg-gray-50 flex-shrink-0 relative">
                                        {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover mix-blend-multiply" /> : <div className="absolute inset-0 flex items-center justify-center text-gray-200"><Utensils size={16} /></div>}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="font-black text-sm uppercase tracking-tight text-black leading-tight line-clamp-2">{getPrimaryMenuName(item)}</h4>
                                            {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en') && (
                                              <p className="mt-1 text-[10px] font-semibold text-gray-500 leading-tight line-clamp-1">
                                                {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en')}
                                              </p>
                                            )}
                                            <button 
                                                onClick={() => setCart(cart.filter(c => c.id !== item.id))} 
                                                className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex-shrink-0"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="flex items-end justify-between mt-4">
                                            <div className="flex items-center gap-4 border border-gray-200 px-3 py-1.5 bg-white">
                                                <button onClick={() => updateQty(item.id, item.selected_modifiers || [], -1)} className="text-gray-400 hover:text-black transition-colors"><Minus size={14} /></button>
                                                <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQty(item.id, item.selected_modifiers || [], 1)} className="text-gray-400 hover:text-black transition-colors"><Plus size={14} /></button>
                                            </div>
                                            <span className="font-black text-sm tracking-tighter">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{(getCartItemUnitPrice(item) * item.quantity).toLocaleString()}</span>
                                        </div>
                                        <div className="mt-3">
                                            <textarea
                                                value={item.note || ''}
                                                onChange={(e) => updateCartItemNote(item.id, item.selected_modifiers || [], e.target.value)}
                                                placeholder="เพิ่มโน้ตถึงครัว (ตัวเลือกเพิ่มเติม, ไม่ใส่ผัก...)"
                                                className="min-h-[46px] w-full bg-gray-50 border border-gray-200 px-3 py-2.5 text-[11px] font-bold text-black outline-none placeholder:text-gray-400 focus:border-black focus:bg-white transition-all resize-none"
                                            />
                                        </div>
                                        {getItemModifierSummary(item) && (
                                            <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                                                {getItemModifierSummary(item)}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    <div className="p-6 bg-white border-t border-gray-100 space-y-6 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                         <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{t.total}</span>
                            <span className="text-3xl font-black tracking-tighter text-black">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{cartTotal.toLocaleString()}</span>
                         </div>
                         
                         {orderStatus === 'error' && orderError && (
                           <div className="bg-white border border-red-200 px-4 py-3 text-xs text-red-600 font-bold">
                             ! {orderError}
                           </div>
                         )}
                         
                         <button 
                            onClick={orderStatus === 'error' ? () => { setOrderStatus('idle'); setOrderError(null) } : handlePlaceOrder}
                            disabled={orderStatus === 'submitting'}
                            className={`w-full py-5 text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-colors active:scale-[0.98] disabled:opacity-50 ${
                              orderStatus === 'error' 
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-black text-white hover:bg-gray-900'
                            }`}
                         >
                            {orderStatus === 'submitting' 
                              ? <><Loader2 className="animate-spin" size={16} /> {t.sendingOrder}</> 
                              : orderStatus === 'error'
                              ? <><X size={16} /> {t.tryAgain}</>
                              : <><Check size={16} /> {t.placeOrder}</>
                            }
                         </button>
                         <p className="text-center text-[9px] font-bold uppercase tracking-widest text-gray-400">{t.paymentNote}</p>
                    </div>
                </div>
            </div>
        )}

        {/* Table Bill Shared Modal */}
        {showTableBill && (
            <div className="fixed inset-0 z-[100] flex justify-end">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowTableBill(false)}></div>
                <div className="relative w-full max-w-md bg-gray-50 h-screen flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                    <header className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                        <div>
                             <h2 className="text-[20px] font-bold text-black tracking-tight">{t.billTitle}</h2>
                             <span className="text-[13px] font-medium text-gray-500 mt-0.5 block">{t.tablePrefix} {table?.table_number || table_id}</span>
                        </div>
                        <button onClick={() => setShowTableBill(false)} className="w-9 h-9 bg-gray-100 rounded-full text-gray-500 flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95"><X size={18} /></button>
                    </header>

                    {/* Table Bill Loading */}
                    {tableBillLoading ? (
                        <div className="flex-1 flex justify-center items-center">
                            <Loader2 className="animate-spin text-black" size={32} />
                        </div>
                    ) : paymentStatus === 'success' ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white space-y-6">
                            <div className="w-20 h-20 bg-black text-white flex items-center justify-center animate-bounce rounded-none">
                                <Check size={36} strokeWidth={3} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black uppercase tracking-tight text-black">{t.fullyPaid}</h3>
                                <p className="text-xs text-gray-500 max-w-[240px] leading-relaxed uppercase tracking-widest">{t.fullyPaidDesc}</p>
                            </div>
                            <button 
                                onClick={async () => { 
                                    setPaymentStatus('idle'); 
                                    setShowTableBill(false);
                                    
                                    if (openOrder) {
                                        await supabase.from('pos_orders').update({ status: 'completed' }).eq('id', openOrder.id)
                                    }
                                    if (table?.id) {
                                        await supabase.from('pos_tables').update({ status: 'available' }).eq('id', table.id)
                                    }
                                    
                                    setNickname('')
                                    setTempName('')
                                    if (typeof window !== 'undefined') {
                                        localStorage.removeItem(`customer_nickname_${table_id}`)
                                    }
                                }}
                                className="px-8 py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gray-900 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : !openOrder ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                            <div className="w-16 h-16 border border-black flex items-center justify-center mb-6">
                                <Check size={28} />
                            </div>
                            <h3 className="font-black uppercase tracking-tight text-lg">{t.noBill}</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 max-w-[200px]">{t.noBillDesc}</p>
                        </div>
                    ) : (
                        <>
                            {/* Bill Header stats */}
                            <div className="p-6 bg-white grid grid-cols-3 gap-2">
                                <div className="flex flex-col items-center">
                                    <span className="text-[12px] font-medium text-gray-500 mb-1">{t.grandTotal}</span>
                                    <span className="text-[18px] font-bold text-black">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{grandTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col items-center border-x border-gray-100">
                                    <span className="text-[12px] font-medium text-gray-500 mb-1">{t.paid}</span>
                                    <span className="text-[18px] font-bold text-[#00B14F]">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{totalPaid.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[12px] font-medium text-gray-500 mb-1">{t.outstanding}</span>
                                    <span className="text-[18px] font-bold text-red-500">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{outstandingBalance.toLocaleString()}</span>
                                </div>
                            </div>

                            {outstandingBalance <= 0 ? (
                                /* Fully Settled Screen */
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white space-y-6">
                                    <div className="w-20 h-20 bg-green-50 text-green-600 border-2 border-green-600 rounded-full flex items-center justify-center animate-bounce">
                                        <Check size={36} strokeWidth={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black uppercase tracking-tight">{t.fullyPaid}</h3>
                                        <p className="text-xs text-gray-500 max-w-[240px] leading-relaxed">{t.fullyPaidDesc}</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                     {/* Split Mode Selector Tabs */}
                                     {allowQrPayment && (
                                         <div className="bg-white border-b border-gray-100">
                                             {isSplitLocked && (
                                                 <div className="bg-amber-50 px-4 py-2 text-center text-amber-700 text-[12px] font-medium">
                                                     {locale === 'en' ? 'Payment in progress, split mode locked' : locale === 'zh' ? 'Payment in progress, split mode locked' : 'มีผู้ชำระเงินแล้ว ระบบได้ล็อคการหารบิลรูปแบบนี้ไว้'}
                                                 </div>
                                             )}
                                             <div className="flex p-2 gap-1 bg-white">
                                                 <button 
                                                     disabled={isSplitLocked}
                                                     onClick={() => { setSplitMode('none'); setSelectedBillItems({}); }}
                                                     className={`flex-1 py-2.5 rounded-lg text-[14px] font-bold transition-all ${splitMode === 'none' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                                 >
                                                     {locale === 'en' ? 'Pay All' : locale === 'zh' ? 'Pay All' : 'จ่ายทั้งหมด'}
                                                 </button>
                                                 <button 
                                                     disabled={isSplitLocked}
                                                     onClick={() => { setSplitMode('equal'); setSelectedBillItems({}); }}
                                                     className={`flex-1 py-2.5 rounded-lg text-[14px] font-bold transition-all ${splitMode === 'equal' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                                 >
                                                     {locale === 'en' ? 'Split Equal' : locale === 'zh' ? 'Split Equal' : 'หารเท่ากัน'}
                                                 </button>
                                                 <button 
                                                     disabled={isSplitLocked}
                                                     onClick={() => { setSplitMode('item'); setSelectedBillItems({}); }}
                                                     className={`flex-1 py-2.5 rounded-lg text-[14px] font-bold transition-all ${splitMode === 'item' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                                 >
                                                     {locale === 'en' ? 'Split Items' : locale === 'zh' ? 'Split Items' : 'จ่ายแยกรายการ'}
                                                 </button>
                                             </div>
                                         </div>
                                     )}
                                     
                                     {/* Tab Scroll Content */}
                                     <div className="flex-1 overflow-y-auto pb-24">
                                         {splitMode === 'none' ? (
                                             <div className="space-y-4">
                                                 <div className="bg-white p-6 pb-2">
                                                     <h3 className="font-bold text-[16px] text-black tracking-tight mb-4">{t.allItems}</h3>
                                                     {tableBillItems.length === 0 && (
                                                       <p className="text-[14px] text-gray-500">{t.noItems}</p>
                                                     )}
                                                     <div className="space-y-4">
                                                         {tableBillItems.map((item, idx) => (
                                                             <div key={idx} className="flex justify-between items-start border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                                                 <div className="flex flex-col pr-4">
                                                                     <div className="flex items-center gap-2">
                                                                         <span className="font-bold text-[15px] text-black leading-tight">{item.item?.name || '{t.menuItem}'} <span className="text-gray-500 font-medium ml-0.5">x{item.quantity}</span></span>
                                                                         {item.status === 'paid' && <span className="text-[10px] font-bold bg-[#00B14F]/10 text-[#00B14F] px-2 py-0.5 rounded-full">{t.itemPaid}</span>}
                                                                     </div>
                                                                     <span className="text-[13px] text-gray-500 mt-1">{t.orderedBy}: {item.customer_name || t.customer}</span>
                                                                 </div>
                                                                 <span className="font-bold text-[15px] text-black">฿{(item.subtotal || (item.unit_price * item.quantity)).toLocaleString()}</span>
                                                             </div>
                                                         ))}
                                                     </div>
                                                 </div>
                                                 {!allowQrPayment ? (
                                                     <div className="mx-6 mt-4 mb-8 bg-white border border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
                                                         <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-600">
                                                             <Banknote size={24} />
                                                         </div>
                                                         <h3 className="font-bold text-[16px] text-black mb-2">{locale === 'en' ? 'Payment System Disabled' : locale === 'zh' ? 'Payment System Disabled' : 'ระบบจ่ายเงินถูกปิดใช้งาน'}</h3>
                                                         <p className="text-[14px] text-gray-500 leading-relaxed mb-6">
                                                             {locale === 'en' ? 'Please pay at the cashier' : locale === 'zh' ? 'Please pay at the cashier' : 'กรุณานำบิลนี้ไปชำระเงินที่แคชเชียร์'}
                                                         </p>
                                                         <div className="w-full pt-4 border-t border-gray-100 flex justify-between items-center">
                                                             <span className="font-bold text-[14px] text-gray-500">{locale === 'en' ? 'To Pay' : locale === 'zh' ? 'To Pay' : 'ยอดชำระที่แคชเชียร์'}</span>
                                                             <span className="font-bold text-[18px] text-red-500">฿{outstandingBalance.toLocaleString()}</span>
                                                         </div>
                                                     </div>
                                                 ) : (
                                                     <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 md:absolute z-20">
                                                         <button 
                                                             onClick={() => handleInitiatePayment('promptpay', outstandingBalance)}
                                                             className="w-full h-[52px] bg-black text-white text-[16px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                                         >
                                                             <CreditCard size={18} /> {t.payOutstanding} (฿{outstandingBalance.toLocaleString()})
                                                         </button>
                                                     </div>
                                                 )}
                                             </div>
                                        ) : splitMode === 'equal' ? (
                                            <div className="space-y-4">
                                                <div className="bg-white p-6 pb-2">
                                                    <div className="space-y-3">
                                                        <label className="text-[14px] font-bold text-gray-500 block">{t.guests}</label>
                                                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-2">
                                                            <button 
                                                                onClick={() => setEqualSplitCount(c => Math.max(2, c - 1))} 
                                                                className="w-12 h-12 flex items-center justify-center font-bold bg-white rounded-lg shadow-sm active:scale-95 transition-all text-black"
                                                            >
                                                                <Minus size={18} />
                                                            </button>
                                                            <span className="font-bold text-[22px] text-black">{equalSplitCount}</span>
                                                            <button 
                                                                onClick={() => setEqualSplitCount(c => Math.min(20, c + 1))} 
                                                                className="w-12 h-12 flex items-center justify-center font-bold bg-white rounded-lg shadow-sm active:scale-95 transition-all text-black"
                                                            >
                                                                <Plus size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex justify-between items-end pt-6 mt-6 border-t border-gray-100">
                                                        <span className="text-[14px] font-bold text-gray-500">{t.perPerson}</span>
                                                        <span className="text-[28px] font-bold text-black tracking-tight">
                                                            {locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{(outstandingBalance / equalSplitCount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 md:absolute z-20">
                                                    <button 
                                                        onClick={() => handleInitiatePayment('promptpay', outstandingBalance / equalSplitCount)}
                                                        className="w-full h-[52px] bg-black text-white text-[16px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                                    >
                                                        <CreditCard size={18} /> {locale === 'en' ? 'Pay My Share (฿' : locale === 'zh' ? 'Pay My Share (฿' : 'จ่ายส่วนของตัวเอง (฿'}{(outstandingBalance / equalSplitCount).toLocaleString(undefined, { maximumFractionDigits: 2 })})
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="bg-white p-6 pb-4">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h3 className="font-bold text-[16px] text-black tracking-tight">{locale === 'en' ? 'Select Items to Pay' : locale === 'zh' ? 'Select Items to Pay' : 'เลือกรายการที่ต้องการจ่าย'}</h3>
                                                        <button 
                                                            onClick={() => {
                                                                const unpaidItems = tableBillItems.filter(i => i.status !== 'paid')
                                                                if (Object.keys(selectedBillItems).length === unpaidItems.length) {
                                                                    setSelectedBillItems({})
                                                                } else {
                                                                    const all = unpaidItems.reduce((acc, curr) => ({...acc, [curr.id]: curr.quantity}), {})
                                                                    setSelectedBillItems(all)
                                                                }
                                                            }}
                                                            className="text-[13px] font-bold text-black hover:opacity-70 transition-opacity"
                                                        >
                                                            {Object.keys(selectedBillItems).length === tableBillItems.filter(i => i.status !== 'paid').length && tableBillItems.length > 0 ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                                                        </button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {tableBillItems.length === 0 && (
                                                            <p className="text-[14px] text-gray-500">{t.noItems}</p>
                                                        )}
                                                        {tableBillItems.map((item, idx) => {
                                                            const { locale } = useI18n();
                                                            const selectedQty = selectedBillItems[item.id] || 0
                                                            const isPaid = item.status === 'paid'
                                                            const isSelected = selectedQty > 0
                                                            
                                                            return (
                                                                <div 
                                                                    key={idx} 
                                                                    onClick={() => !isPaid && handleToggleItemSelect(item.id, item.quantity)}
                                                                    className={`p-4 rounded-xl border-2 transition-all flex gap-4 items-start ${isPaid ? 'border-gray-100 bg-gray-50 opacity-60' : isSelected ? 'border-black bg-gray-50 cursor-pointer shadow-sm' : 'border-gray-100 hover:border-gray-300 cursor-pointer'}`}
                                                                >
                                                                    <div className="pt-0.5">
                                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'border-black bg-black text-white' : 'border-gray-300 bg-white'}`}>
                                                                            {isSelected && <Check size={14} strokeWidth={3} className="animate-in zoom-in duration-200" />}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-start">
                                                                            <h4 className="font-bold text-[15px] text-black leading-tight truncate pr-2">
                                                                                {item.item?.name || '{t.menuItem}'}
                                                                                {isPaid && <span className="ml-2 text-[10px] font-bold text-[#00B14F] bg-[#00B14F]/10 px-2 py-0.5 rounded-full align-middle">{t.itemPaid}</span>}
                                                                            </h4>
                                                                            <span className="font-bold text-[15px] text-black">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{item.unit_price.toLocaleString()}</span>
                                                                        </div>
                                                                        <div className="flex items-center justify-between mt-2" onClick={e => e.stopPropagation()}>
                                                                            <span className="text-[13px] text-gray-500">
                                                                                {t.orderedBy}: {item.customer_name || t.customer}
                                                                            </span>
                                                                            {isSelected && (
                                                                                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                                                                                    <button onClick={() => handleUpdateItemQty(item.id, -1, item.quantity)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 active:scale-95 transition-all"><Minus size={14} /></button>
                                                                                    <span className="text-[14px] font-bold w-6 text-center">{selectedQty}</span>
                                                                                    <button onClick={() => handleUpdateItemQty(item.id, 1, item.quantity)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 active:scale-95 transition-all"><Plus size={14} /></button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 md:absolute z-20">
                                                    {selectedItemsTotal > 0 ? (
                                                        <div className="space-y-3 animate-in slide-in-from-bottom duration-300">
                                                            <div className="flex justify-between items-end px-2">
                                                                <span className="text-[14px] font-bold text-gray-500">{locale === 'en' ? 'Selected Share' : locale === 'zh' ? 'Selected Share' : 'ยอดที่เลือกจ่าย'}</span>
                                                                <span className="text-[24px] font-bold text-black tracking-tight">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{selectedItemsTotal.toLocaleString()}</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleInitiatePayment('promptpay', selectedItemsTotal)}
                                                                className="w-full h-[52px] bg-black text-white text-[16px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                                            >
                                                                <CreditCard size={18} /> {locale === 'en' ? 'Pay Selected' : locale === 'zh' ? 'Pay Selected' : 'ชำระเฉพาะที่เลือก'}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            disabled
                                                            className="w-full h-[52px] bg-gray-100 text-gray-400 text-[16px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-not-allowed"
                                                        >
                                                            <CreditCard size={18} /> {locale === 'en' ? 'Select items to pay' : locale === 'zh' ? 'Select items to pay' : 'กรุณาเลือกรายการชำระ'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        )}

        {/* Modifier Modal */}
        {modifierModalItem && (
          <div className="fixed inset-0 z-[1100] flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in touch-none" onClick={() => setModifierModalItem(null)}></div>
            <div className="relative flex h-[100dvh] w-full max-w-md flex-col bg-white border-l border-gray-200 animate-in slide-in-from-right duration-300">
              <header className="flex items-center gap-4 border-b border-gray-100 bg-white px-5 py-4 sticky top-0 z-10 touch-none">
                <button onClick={() => setModifierModalItem(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-black active:scale-90 transition-all">
                  <X size={18} />
                </button>
                <h2 className="text-[17px] font-bold text-black leading-tight truncate">
                  {getPrimaryMenuName(modifierModalItem)}
                </h2>
              </header>

              <div className="flex-1 overflow-y-auto overscroll-contain bg-gray-50 p-4 space-y-4">
                {modifierGroups.map((group, gIdx) => {
                  const minReq = group.min_selection || group.min_select || 0
                  const maxAllowed = group.max_selection || group.max_select || 99
                  const selectedInGroup = tempSelectedModifiers.filter(m => m.group_id === group.id)
                  const isComplete = selectedInGroup.length >= minReq
                  const isAtMax = selectedInGroup.length >= maxAllowed
                  const isError = errorGroupId === group.id

                  return (
                    <div key={group.id} id={`modifier-group-${group.id}`} className={`bg-white rounded-2xl p-5 shadow-sm transition-all duration-300 ${isError ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}>
                      <div className="mb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-[16px] font-bold text-black tracking-tight leading-tight">{group.name}</h3>
                            <p className={`text-[13px] mt-1 transition-colors ${isError ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                {isError ? 'กรุณาเลือกตัวเลือกในหมวดนี้' : 
                                    minReq > 0 && maxAllowed === 1 ? 'เลือก 1 ข้อ' : 
                                    minReq > 0 ? `เลือกอย่างน้อย ${minReq} ข้อ${maxAllowed < 99 ? ` (สูงสุด ${maxAllowed})` : ''}` : 
                                    maxAllowed < 99 ? `เลือกสูงสุด ${maxAllowed} ข้อ` : 'เลือกได้ตามต้องการ'}
                            </p>
                          </div>
                          {minReq > 0 ? (
                            isComplete ? (
                              <span className="bg-[#00B14F]/10 text-[#00B14F] px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shrink-0 animate-in zoom-in">
                                <Check size={12} strokeWidth={3} /> ครบแล้ว
                              </span>
                            ) : (
                              <span className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition-colors ${isError ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                จำเป็น
                              </span>
                            )
                          ) : (
                            <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded-full text-[11px] font-medium shrink-0">เลือกเสริม</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        {group.options?.map((opt: any, optIdx: number) => {
                          const isSelected = tempSelectedModifiers.some(m => m.id === opt.id)
                          const isDisabled = !isSelected && isAtMax && maxAllowed > 1
                          
                          return (
                            <button
                              key={opt.id}
                              disabled={isDisabled}
                              onClick={() => {
                                let nextSelected = [...tempSelectedModifiers]
                                if (isSelected) {
                                  nextSelected = nextSelected.filter(m => m.id !== opt.id)
                                } else {
                                  if (maxAllowed === 1) {
                                    nextSelected = [...nextSelected.filter(m => m.group_id !== group.id), opt]
                                  } else {
                                    nextSelected = [...nextSelected, opt]
                                  }
                                }
                                setTempSelectedModifiers(nextSelected)
                                if (errorGroupId === group.id) setErrorGroupId(null)
                              }}
                              className={`group relative flex items-center justify-between p-3 rounded-xl transition-all border-2 ${
                                isSelected ? 'border-black bg-gray-50 shadow-sm' : 'border-transparent hover:bg-gray-50'
                              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                                <div className={`flex items-center justify-center shrink-0 transition-all ${
                                  maxAllowed === 1 ? 'w-5 h-5 rounded-full border-2' : 'w-5 h-5 rounded border-2'
                                } ${isSelected ? 'border-black bg-black' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                                  {isSelected && (
                                    maxAllowed === 1 ? (
                                      <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in duration-200" />
                                    ) : (
                                      <Check size={14} className="text-white animate-in zoom-in duration-200" strokeWidth={3} />
                                    )
                                  )}
                                </div>
                                <span className={`text-[15px] truncate leading-tight pt-0.5 ${isSelected ? 'text-black font-bold' : 'text-gray-700 font-medium'}`}>{opt.name}</span>
                              </div>
                              {opt.price_adjustment !== 0 && (
                                  <div className={`text-[14px] font-medium shrink-0 pt-0.5 ${isSelected ? 'text-black' : 'text-gray-500'}`}>
                                    {opt.price_adjustment > 0 ? `+฿${opt.price_adjustment}` : `-฿${Math.abs(opt.price_adjustment)}`}
                                  </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <footer className="flex flex-col bg-white/90 backdrop-blur-md p-4 border-t border-gray-100 relative z-20" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                {(() => {
                  const incomplete = modifierGroups.filter(g => tempSelectedModifiers.filter(m => m.group_id === g.id).length < (g.min_selection || g.min_select || 0))
                  const canConfirm = incomplete.length === 0
                  const totalPrice = (modifierModalItem.sale_price || 0) + tempSelectedModifiers.reduce((acc, m) => acc + (m.price_adjustment || m.price || 0), 0)

                  return (
                    <div className="flex w-full items-center gap-3">
                      <div className="flex items-center h-[52px] bg-gray-100 rounded-xl px-1">
                        <button onClick={() => setTempQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"><Minus size={18}/></button>
                        <div className="w-8 text-center font-bold text-[16px] text-black">{tempQuantity}</div>
                        <button onClick={() => setTempQuantity(q => q + 1)} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"><Plus size={18}/></button>
                      </div>

                      <button
                        onClick={() => {
                           if (!canConfirm) {
                             const firstIncomplete = incomplete[0].id;
                             setErrorGroupId(firstIncomplete);
                             const el = document.getElementById('modifier-group-' + firstIncomplete);
                             if (el) {
                               el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                             }
                             setTimeout(() => setErrorGroupId(null), 2500);
                             return;
                           }
                           addToCart(modifierModalItem, tempSelectedModifiers, tempQuantity);
                           setModifierModalItem(null);
                           setModifierGroups([]);
                        }}
                        className={`flex-1 h-[52px] rounded-xl text-[16px] font-bold transition-all flex items-center justify-between px-5 ${
                          canConfirm ? 'bg-black text-white hover:bg-gray-900 active:scale-[0.98] shadow-md' : 'bg-black text-white hover:bg-gray-900 active:scale-[0.98] shadow-md'
                        }`}
                      >
                        <span>{locale === 'en' ? 'Add to Cart' : locale === 'zh' ? 'Add to Cart' : 'ใส่ตะกร้า'}</span>
                        <span>฿{(totalPrice * tempQuantity).toLocaleString()}</span>
                      </button>
                    </div>
                  )
                })()}
              </footer>
            </div>
          </div>
        )}

        {/* Checkout & PromptPay Payment Modal */}
        <StripePaymentModal 
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            amount={paymentAmount}
            orderId={openOrder?.id || ''}
            splitMode={splitMode}
            items={splitMode === 'item' ? Object.keys(selectedBillItems).map(id => {
                const item = tableBillItems.find(i => i.id === id);
                return { item_id: id, amount: item ? item.unit_price * selectedBillItems[id] : 0 }
            }) : []}
            onSuccess={() => {
                setShowPaymentModal(false);
                setPaymentStatus('success');
            }}
        />

        {/* Hidden Print Container for POSReceipt */}
        <div style={{ display: 'none' }}>
            <div ref={printRef}>
                {openOrder && (
                    <POSReceipt 
                        orderNumber={openOrder.order_number}
                        orderType={openOrder.order_type || 'dine_in'}
                        orderSource={openOrder.order_source || 'table'}
                        tableNumber={table?.table_number || String(table_id)}
                        customerName={nickname || undefined}
                        items={tableBillItems.map(item => ({
                            name: item.item?.name || 'Unknown Item',
                            quantity: item.quantity,
                            sale_price: Number(item.unit_price),
                            selected_modifiers: item.selected_modifiers
                        }))}
                        subtotal={grandTotal}
                        discount={Number(openOrder.discount_amount || 0)}
                        tax={Number(openOrder.tax_amount || 0)}
                        serviceCharge={Number(openOrder.service_charge_amount || 0)}
                        total={grandTotal}
                        paymentMethod={paymentMethod || openOrder.payment_method || 'promptpay'}
                        paidAmount={totalPaid || grandTotal}
                        change={0}
                        timestamp={openOrder.created_at || new Date().toISOString()}
                        cashierName="Dine-in Customer QR"
                        receiptPaymentQrImage={''}
                    />
                )}
            </div>
        </div>
    </div>
  )
}
