'use client';
import React, { useEffect, useState, useRef, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Calculator,
  ChefHat,
  Layers,
  Package,
  BarChart3,
  Menu as MenuIcon,
  X,
  LogOut,
  Settings,
  User,
  Wallet,
  ChevronRight,
  ArrowLeft,
  Users,
  Home,
  CookingPot,
  Search,
  Flame,
  ShoppingBag,
  UserPlus,
  History as HistoryIcon,
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import POSShopStatusModal from '@/components/pos/POSShopStatusModal'
import { printKitchenTicket } from '@/lib/printerUtils'

// XYL POS Components
import POSLayout from '@/components/pos/POSLayout'
import POSTerminal from '@/components/pos/POSTerminal'
import POSMenuManager from '@/components/pos/POSMenuManager'
import POSInventoryManager from '@/components/pos/POSInventoryManager'
import POSReports from '@/components/pos/POSReports'
import POSDrawerManager from '@/components/pos/POSDrawerManager'
import POSStaffManager from '@/components/pos/POSStaffManager'
import POSTableManager from '@/components/pos/POSTableManager'
import POSRecipeManager from '@/components/pos/POSRecipeManager'
import POSKitchen from '@/components/pos/POSKitchen'
import POSModifierManager from '@/components/pos/POSModifierManager'
import POSShopSettings from '@/components/pos/POSShopSettings'
import POSShiftModal from '@/components/pos/POSShiftModal'
import POSMemberManager from '@/components/pos/POSMemberManager'
import POSHistory from '@/components/pos/POSHistory'
import POSManagementUnified from '@/components/pos/POSManagementUnified'
import XYLLoader from '@/components/loaders/XYLLoader'
import POSBranchSelectModal from '@/components/pos/POSBranchSelectModal'
import { useI18n } from "@/lib/I18nContext";

type POSView =
  | 'terminal'
  | 'menu'
  | 'inventory'
  | 'reports'
  | 'drawer'
  | 'staff'
  | 'tables'
  | 'recipes'
  | 'kitchen'
  | 'settings'
  | 'members'
  | 'modifiers'
  | 'management'
  | 'history'

function RestaurantOSPageContent() {
    const { locale } = useI18n();
  const { profile } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlBranchId = searchParams.get('branch_id')

  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<POSView | null>(null)
  const [showAdminBranchSelect, setShowAdminBranchSelect] = useState(false)

  const [activeShift, setActiveShift] = useState<any>(null)
  const [shiftStats, setShiftStats] = useState<any>(null)

  const [syncPulse, setSyncPulse] = useState(0)
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasInitialized = useRef(false)

  const [shopSettings, setShopSettings] = useState<{
    id: string
    status: string
    status_expiry: any
    branch_id?: string
    branch_name?: string
    name?: string
    tax_id?: string
    address?: string
    phone?: string
    receipt_header?: string
    receipt_footer?: string
    receipt_show_logo?: boolean
    receipt_font_size?: 'normal' | 'large'
    kitchen_font_size?: 'normal' | 'large' | 'huge'
    kitchen_show_type?: boolean
    printers?: any[]
    opening_hours?: any
    receipt_payment_qr_image?: string
  } | null>(null)
  const [inventoryCategories, setInventoryCategories] = useState<any[]>([])
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [cart, setCart] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [isCartExpanded, setIsCartExpanded] = useState(false)
  const [showPendingModal, setShowPendingModal] = useState(false)

  // LIFTED STATES for POSTerminal persistence
  const [selectedTable, setSelectedTable] = useState<any | null>(null)
  const selectedTableRef = useRef<any | null>(null)
  useEffect(() => { selectedTableRef.current = selectedTable }, [selectedTable])

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const editingOrderIdRef = useRef<string | null>(null)
  useEffect(() => { editingOrderIdRef.current = editingOrderId }, [editingOrderId])

  const [editingOrderNumber, setEditingOrderNumber] = useState<string | null>(null)
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in')
  const [deliveryPlatform, setDeliveryPlatform] = useState<string>('')

  const cartTotal = useMemo(
    () =>
      cart.reduce((acc, item) => {
        const modsPrice =
          item.selected_modifiers?.reduce((ma: number, m: any) => ma + (m.price || 0), 0) || 0
        return acc + (item.sale_price + modsPrice) * item.quantity
      }, 0),
    [cart]
  )

  const cartItemCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart])

  const getCurrentBranchId = useCallback(async () => {
    if (shopSettings?.branch_id) return shopSettings.branch_id
    if (profile?.role === 'admin' && urlBranchId) return urlBranchId

    if (profile?.branch_code) {
      const { data } = await supabase
        .from('branches')
        .select('id')
        .eq('branch_code', profile.branch_code)
        .maybeSingle()
      return data?.id || null
    }

    return null
  }, [profile?.branch_code, profile?.role, shopSettings?.branch_id, urlBranchId])

  const getLocalDayBounds = useCallback(() => {
    const now = new Date()
    // Business day starts at 4:00 AM. If it's before 4 AM, it counts as the previous day.
    const businessDay = now.getHours() < 4 ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now
    const start = new Date(businessDay.getFullYear(), businessDay.getMonth(), businessDay.getDate(), 4, 0, 0, 0)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    return { start, end }
  }, [])

  const checkActiveShift = useCallback(async (options?: { promptIfMissing?: boolean }) => {
    if (!profile?.id) return false
    const branchId = await getCurrentBranchId()
    let query = supabase
      .from('pos_shifts')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)

    if (branchId) {
      query = query.eq('branch_id', branchId)
    } else {
      query = query.eq('staff_id', profile.id)
    }

    const { data, error } = await query.maybeSingle()
    if (error && branchId) {
      const { data: fallbackData } = await supabase
        .from('pos_shifts')
        .select('*')
        .eq('status', 'open')
        .eq('staff_id', profile.id)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fallbackData) {
        setActiveShift(fallbackData)
        fetchShiftStats(fallbackData.id)
        return true
      }
    }

    if (data) {
      setActiveShift(data)
      fetchShiftStats(data.id)
      return true
    } else {
      setActiveShift(null)
      if (options?.promptIfMissing) {
        setIsShiftModalOpen(true)
      }
      return false
    }
  }, [getCurrentBranchId, profile?.id])

  useEffect(() => {
    if (profile) {
      if (profile.role === 'staff' && profile.staff_type !== 'cafe' && !profile.is_pos_account) {
        window.location.href = '/dashboard/staff'
        return
      }
      initData()
      fetchShopSettings()
      fetchInventoryCategories()
      fetchPendingOrders()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  useEffect(() => {
    if (!profile?.id) return

    const refreshShiftState = () => {
      void checkActiveShift({ promptIfMissing: true })
    }

    refreshShiftState()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshShiftState()
      }
    }

    window.addEventListener('focus', refreshShiftState)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', refreshShiftState)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkActiveShift, profile?.id])

  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel('pos-shift-state-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_shifts' }, () => {
        void checkActiveShift({ promptIfMissing: true })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_shop_settings' }, () => {
        fetchShopSettings()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_shift_transactions' }, (payload) => {
        const row = (payload.new || payload.old) as any
        if (row?.shift_id && row.shift_id === activeShift?.id) {
          fetchShiftStats(row.shift_id)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeShift?.id, checkActiveShift, profile?.id])

  const initData = async () => {
    // Only show full-screen loader if we don't have a shift or settings yet (Initial Load)
    const isInitialLoad = !activeShift && !shopSettings;
    if (isInitialLoad) setLoading(true);

    await checkActiveShift({ promptIfMissing: true });

    if (profile?.role === 'admin') {
      if (!urlBranchId) {
        setShowAdminBranchSelect(true)
      }
    }

    const savedView = localStorage.getItem('xyl_pos_active_view') as POSView;
    if (savedView && navItems.some(i => i.id === savedView)) {
      setActiveView(savedView);
    } else if (!activeView) {
      setActiveView('terminal');
    }

    if (isInitialLoad) setLoading(false);
  };

  const fetchShopSettings = async (forceBranchId?: string) => {
    if (!profile) return
    let branchId = forceBranchId || null
    let branchName = null
    
    if (!branchId && profile.role === 'admin' && urlBranchId) {
      branchId = urlBranchId
    }

    if (!branchId && profile.branch_code) {
      const { data: b } = await supabase
        .from('branches')
        .select('id, branch_name')
        .eq('branch_code', profile.branch_code)
        .maybeSingle()
      if (b) {
        branchId = b.id
        branchName = b.branch_name
      }
    }
    let query = supabase.from('pos_shop_settings').select('*')
    if (branchId) {
      query = query.eq('branch_id', branchId)
    } else {
      query = query.eq('id', '00000000-0000-0000-0000-000000000001')
    }
    const { data } = await query.maybeSingle()
    if (data) {
      const activeBranchId = data.branch_id || branchId
      if (activeBranchId && !branchName) {
        const { data: b } = await supabase
          .from('branches')
          .select('branch_name')
          .eq('id', activeBranchId)
          .maybeSingle()
        if (b) branchName = b.branch_name
      }
      
      if (!branchName && data.id === '00000000-0000-0000-0000-000000000001') {
        branchName = 'สันกำแพง'
      }

      setShopSettings({
        ...data,
        branch_name: branchName,
        delivery_gp: data.opening_hours?.delivery_gp || data.delivery_gp || { grab: 32.1, lineman: 32.1, shopee: 32.1, foodpanda: 32.1, robinhood: 0 },
        active_delivery_platforms: data.opening_hours?.active_delivery_platforms || data.active_delivery_platforms || ['grab', 'shopee', 'lineman', 'foodpanda', 'robinhood']
      })
    } else if (branchId) {
      const defaultSettings = {
        branch_id: branchId,
        is_open: false,
        status: 'closed'
      }
      const { data: newSettings } = await supabase.from('pos_shop_settings').insert(defaultSettings).select().single()
      if (newSettings) {
        if (!branchName) {
          const { data: b } = await supabase.from('branches').select('branch_name').eq('id', branchId).maybeSingle()
          if (b) branchName = b.branch_name
        }
        setShopSettings({
          ...newSettings,
          branch_name: branchName || 'POS',
          delivery_gp: newSettings.opening_hours?.delivery_gp || newSettings.delivery_gp || { grab: 32.1, lineman: 32.1, shopee: 32.1, foodpanda: 32.1, robinhood: 0 },
          active_delivery_platforms: newSettings.opening_hours?.active_delivery_platforms || newSettings.active_delivery_platforms || ['grab', 'shopee', 'lineman', 'foodpanda', 'robinhood']
        })
      }
    }
  }


  const fetchInventoryCategories = async () => {
    console.log('📡 Fetching global inventory categories...')
    const { data, error } = await supabase.from('inventory_categories').select('*').order('order_index')
    if (error) console.error('❌ Error fetching global inventory categories:', error)
    if (data) {
      console.log('✅ Global categories fetched:', data.length)
      setInventoryCategories(data)
    }
  }

  const fetchPendingOrders = async () => {
    let query = supabase
      .from('pos_orders')
      .select('*, pos_order_payments(amount, status)')
      .in('status', ['open', 'pending', 'payment_pending', 'paid', 'preparing', 'accepted', 'shipping'])
      .order('created_at', { ascending: false })

    if (shopSettings?.branch_id) {
      query = query.eq('branch_id', shopSettings.branch_id)
    }

    const { data } = await query
    if (data) setPendingOrders(data)
  }

  const fetchShiftStats = async (_shiftId: string) => {
    const branchId = await getCurrentBranchId()
    const { start, end } = getLocalDayBounds()

    let ordersQuery = supabase
      .from('pos_orders')
      .select('status, net_total, total_amount, payment_method, discount_amount, paid_at, branch_id, pos_order_payments(amount, payment_method)')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())

    if (branchId) {
      ordersQuery = ordersQuery.or(`branch_id.eq.${branchId},branch_id.is.null`)
    }

    const { data: ordersRows } = await ordersQuery
    const validOrders = ordersRows || []

    const soldOrders = validOrders.filter((order: any) => {
      const status = String(order.status || '').toLowerCase()
      if (['cancelled', 'void', 'refunded'].includes(status)) return false
      const hasPaymentRows = Array.isArray(order.pos_order_payments) && order.pos_order_payments.length > 0
      return ['paid', 'completed', 'delivered'].includes(status) || Boolean(order.paid_at) || hasPaymentRows
    })
    const normalizedSoldOrders = soldOrders.filter((order: any) => Number(order.net_total || order.total_amount || 0) > 0)
    const normalizePaymentBucket = (method?: string | null) => {
      const normalized = String(method || '').toLowerCase()
      if (normalized === 'cash' || normalized === 'cod') return 'cash'
      if (normalized === 'card' || normalized === 'credit_card') return 'card'
      if (normalized === 'bank_transfer' || normalized === 'transfer' || normalized === 'promptpay' || normalized === 'qr') return 'transfer'
      return 'other'
    }

    let cashSales = 0
    let totalSales = 0

    normalizedSoldOrders.forEach((order: any) => {
      const orderAmount = Number(order.net_total || order.total_amount || 0)
      const payments = Array.isArray(order.pos_order_payments)
        ? order.pos_order_payments.filter((payment: any) => String(payment?.status || '').toLowerCase() === 'paid')
        : []

      if (payments.length > 0) {
        payments.forEach((p: any) => {
          const amt = Number(p.amount || 0)
          totalSales += amt
          if (normalizePaymentBucket(p.payment_method) === 'cash') {
            cashSales += amt
          }
        })
      } else {
        totalSales += orderAmount
        if (normalizePaymentBucket(order.payment_method) === 'cash') {
          cashSales += orderAmount
        }
      }
    })

    const discountTotal = normalizedSoldOrders.reduce((acc: number, curr: any) => acc + Number(curr.discount_amount || 0), 0)

    const { data: trans } = await supabase
      .from('pos_shift_transactions')
      .select('*')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())

    const payIns =
      trans?.filter(t => t.type === 'pay_in').reduce((acc, curr) => acc + curr.amount, 0) || 0
    const payOuts =
      trans?.filter(t => t.type === 'pay_out').reduce((acc, curr) => acc + curr.amount, 0) || 0

    const { data: shiftObj } = await supabase.from('pos_shifts').select('start_cash').eq('id', _shiftId).single()
    const startCash = shiftObj?.start_cash || 0

    setShiftStats({
      cashSales,
      totalSales,
      payIns,
      payOuts,
      discountTotal,
      expected: startCash + cashSales + payIns - payOuts,
    })
  }

  useEffect(() => {
    if (!profile) return
    if (!audioRef.current) {
      const audio = new Audio('/assets/sounds/orderline.m4a')
      audio.volume = 0.8
      audioRef.current = audio
    }

    const channel = supabase
      .channel('pos-master-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_orders' }, payload => {
        const newOrder = payload.new as any
        const oldOrder = payload.old as any

        if (
          payload.eventType === 'INSERT' ||
          payload.eventType === 'UPDATE' ||
          payload.eventType === 'DELETE'
        ) {
          setSyncPulse(prev => prev + 1)
          if (activeShift) fetchShiftStats(activeShift.id)
          fetchPendingOrders()
        }

        const isLiffSource = newOrder?.order_source === 'liff' || oldOrder?.order_source === 'liff' || newOrder?.source === 'liff' || oldOrder?.source === 'liff'
        const isQrOrderInsert = newOrder?.source === 'qr' && payload.eventType === 'INSERT'
        const isLiffOrderInsert = isLiffSource && payload.eventType === 'INSERT' && newOrder?.status !== 'payment_pending'
        const isLiffOrderPaid = isLiffSource && payload.eventType === 'UPDATE' && newOrder?.status === 'paid' && oldOrder?.status === 'payment_pending'
        
        const shouldAlert = isQrOrderInsert || isLiffOrderInsert || isLiffOrderPaid

        if (shouldAlert && audioRef.current) {
          audioRef.current.play().catch(() => {})
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_order_payments' }, (payload) => {
        const paymentRow = (payload.new || payload.old) as any
        const orderId = paymentRow?.order_id
        if (!orderId || !activeShift?.id) return
        void fetchShiftStats(activeShift.id)
      })
      .subscribe()

    const broadcastChannel = supabase.channel('pos_qr_broadcast_alert')
      .on('broadcast', { event: 'qr_order_placed' }, () => {
         setSyncPulse(prev => prev + 1)
         fetchPendingOrders()
         if (audioRef.current) {
            audioRef.current.play().catch(() => {})
         }
      })
      .subscribe()

    const handleShiftRefresh = (event: Event) => {
      const customEvent = event as CustomEvent<{ shiftId?: string }>
      const shiftId = customEvent.detail?.shiftId
      if (activeShift?.id && shiftId && shiftId !== activeShift.id) return
      if (activeShift?.id) fetchShiftStats(activeShift.id)
      fetchPendingOrders()
      setSyncPulse(prev => prev + 1)
    }

    window.addEventListener('xyl-pos-shift-refresh', handleShiftRefresh as EventListener)

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(broadcastChannel)
      window.removeEventListener('xyl-pos-shift-refresh', handleShiftRefresh as EventListener)
    }
  }, [profile, activeShift, shopSettings])

  // --- GLOBAL QR AUTO PRINT LISTENER ---
  // Watches for incoming QR/LIFF orders and auto-prints them. 
  // Moved to page.tsx so it remains active even when POSTerminal unmounts (e.g. user goes to 'Kitchen' tab)
  useEffect(() => {
    if (!profile) return
    const printedOrders = new Set<string>()

    const triggerPrintForOrder = async (orderId: string, newItemIds?: string[]) => {
      // If we are filtering by newItemIds, don't block based on orderId (since they might add more items later)
      if (!newItemIds && printedOrders.has(orderId)) return
      if (!newItemIds) printedOrders.add(orderId)

      console.log('[Global QR Auto-Print] Triggering print for order:', orderId, 'New Items:', newItemIds)

      const { data: order } = await supabase.from('pos_orders').select('*').eq('id', orderId).single()
      if (!order) return

      // Update cart UI if this order is currently being viewed/edited in POSTerminal
      // OR if the user is looking at the table but the order hasn't been loaded yet
      if (editingOrderIdRef.current === orderId || selectedTableRef.current?.id === order.table_id) {
        // If it's a new order for this table, update the editing order IDs
        if (editingOrderIdRef.current !== orderId) {
          setEditingOrderId(orderId)
          setEditingOrderNumber(order.order_number)
          setOrderType(order.order_type || 'dine_in')
        }

        const { data: fullItems } = await supabase.from('pos_order_items').select('*, item:pos_menu_items!item_id(*)').eq('order_id', orderId)
        if (fullItems) {
          setCart(fullItems.map((i: any) => ({
            id: i.item_id,
            name: i.item?.name || 'Unknown Item',
            image_url: i.item?.image_url || '',
            sale_price: i.unit_price,
            cost_price: i.cost_price || 0,
            quantity: i.quantity,
            selected_modifiers: i.selected_modifiers || [],
            category_id: i.item?.category_id || 'uncategorized',
            customer_name: i.customer_name || null,
          })))
        }
      }

      let itemsQuery = supabase
        .from('pos_order_items')
        .select('*, item:pos_menu_items!item_id(name, category_id)')
        .eq('order_id', orderId)

      if (newItemIds && newItemIds.length > 0) {
        itemsQuery = itemsQuery.in('id', newItemIds)
      }

      const { data: items } = await itemsQuery

      if (!items || items.length === 0) return

      const tableNum = order.table_number || order.table_id || 'Unknown'
      const paymentMethod = String(order.payment_method || '').toLowerCase()
      const deliveryFee = Number(order.delivery_fee || 0)
      const isLiffCodDelivery = String(order.order_source || '').toLowerCase() === 'liff'
        && String(order.order_type || '').toLowerCase() === 'delivery'
        && ['cod', 'cash_on_delivery', 'cash-on-delivery'].includes(paymentMethod)

      let settingsQuery = supabase.from('pos_shop_settings').select('printers, name, branch_name, tax_id, address, phone, receipt_header, receipt_footer, receipt_show_logo, receipt_font_size, kitchen_font_size, kitchen_show_type, opening_hours')
      if (order.branch_id) {
        settingsQuery = settingsQuery.eq('branch_id', order.branch_id)
      } else {
        settingsQuery = settingsQuery.eq('id', '00000000-0000-0000-0000-000000000001')
      }
      const { data: freshSettings } = await settingsQuery.maybeSingle()
      const freshPrinters: any[] = freshSettings?.printers || shopSettings?.printers || []
      const isLiffSourceOrder = String(order.order_source || '').toLowerCase() === 'liff'

      const kitchenPrinters = freshPrinters.filter((p: any) => p.type === 'kitchen' || p.type === 'both')
      const receiptPrintersBase = freshPrinters.filter((p: any) => p.type === 'receipt' || p.type === 'both')
      const receiptPrinters = receiptPrintersBase.length > 0
        ? receiptPrintersBase
        : kitchenPrinters.length > 0
          ? kitchenPrinters
          : freshPrinters
      if (kitchenPrinters.length === 0 && (!isLiffCodDelivery || receiptPrinters.length === 0)) return

      const printOrderData = {
        orderNumber: order.order_number,
        date: new Date().toLocaleString(),
        orderSource: order.order_source || 'pos',
        tableNumber: tableNum,
        orderType: order.order_type || 'dine_in',
        customerName: order.customer_name || undefined,
        comment: order.comment || order.notes || '',
        pickupTime: order.pickup_time || '',
        paymentMethod: order.payment_method || 'cod',
        subtotal: items.reduce((sum: number, i: any) => sum + (Number(i.unit_price || 0) * Number(i.quantity || 0)), 0),
        deliveryFee,
        total: Number(order.net_total ?? order.total_amount ?? 0),
        items: items.map((i: any) => ({
          name: i.item?.name || 'Item',
          quantity: i.quantity,
          subtotal: (i.unit_price || 0) * i.quantity,
          modifiers: i.selected_modifiers?.map((m: any) => m.name) || [],
          selected_modifiers: i.selected_modifiers || [],
          category_id: i.item?.category_id
        }))
      }
      const shopData = {
        name: freshSettings?.name || shopSettings?.name || 'XYL STUDIO',
        branch: freshSettings?.branch_name || shopSettings?.branch_name,
        taxId: freshSettings?.tax_id || shopSettings?.tax_id,
        address: freshSettings?.address || shopSettings?.address,
        phone: freshSettings?.phone || shopSettings?.phone,
        receiptHeader: freshSettings?.receipt_header || shopSettings?.receipt_header,
        receiptFooter: freshSettings?.receipt_footer || shopSettings?.receipt_footer,
        receiptShowLogo: freshSettings?.receipt_show_logo || shopSettings?.receipt_show_logo,
        receiptFontSize: freshSettings?.receipt_font_size || shopSettings?.receipt_font_size,
        kitchenFontSize: freshSettings?.kitchen_font_size || shopSettings?.kitchen_font_size,
        kitchenShowType: freshSettings?.kitchen_show_type ?? shopSettings?.kitchen_show_type,
        receiptPaymentQrImage: freshSettings?.opening_hours?.receipt_payment_qr_image
          || (freshSettings as any)?.receipt_payment_qr_image
          || shopSettings?.opening_hours?.receipt_payment_qr_image
          || (shopSettings as any)?.receipt_payment_qr_image
      }

      const receiptOrderData = {
        ...printOrderData,
        paymentMethod: order.payment_method || printOrderData.paymentMethod,
        orderSource: order.order_source || printOrderData.orderSource,
        subtotal: printOrderData.subtotal,
        deliveryFee,
        total: Number(order.net_total ?? order.total_amount ?? printOrderData.total ?? 0),
      }

      // Execute printing in background to avoid blocking the UI
      void (async () => {
        try {
          if (!isLiffSourceOrder) {
            for (const printer of kitchenPrinters) {
              if (!printer.ip) continue;

              let itemsToPrint = printOrderData.items;
              const printerCats = printer.categories || ['all'];
              if (!printerCats.includes('all') && printerCats.length > 0) {
                itemsToPrint = printOrderData.items.filter((i: any) => printerCats.includes(i.category_id));
              }

              if (itemsToPrint.length > 0) {
                const routedOrderData = { ...printOrderData, items: itemsToPrint };
                if (printer.encoding === 'graphic') {
                  const { printGraphicModeKitchenTicket } = await import('@/lib/graphicPrinter');
                  await printGraphicModeKitchenTicket(printer.ip, routedOrderData, shopData, printer.model, printer.encoding);
                } else {
                  const { printKitchenTicket } = await import('@/lib/printerUtils');
                  await printKitchenTicket(printer.ip, routedOrderData, shopData, printer.model, printer.encoding);
                }
              }
            }
          }

          if (isLiffSourceOrder && receiptPrinters.length > 0) {
            for (const printer of receiptPrinters) {
              if (!printer.ip) continue

              if (printer.encoding === 'graphic') {
                const { printGraphicModeCustomerReceipt } = await import('@/lib/graphicPrinter')
                await printGraphicModeCustomerReceipt(printer.ip, receiptOrderData, shopData, printer.model, printer.encoding)
              } else {
                const { printCustomerReceipt } = await import('@/lib/printerUtils')
                await printCustomerReceipt(printer.ip, receiptOrderData, shopData, printer.model, printer.encoding)
              }
            }
          }
        } catch (err) {
          console.error('Background QR print error:', err);
        }
      })();

      fetchPendingOrders()
      setSyncPulse(prev => prev + 1)
    }

    const channel = supabase
      .channel('pos_qr_broadcast_print')
      .on('broadcast', { event: 'qr_order_placed' }, async (payload) => {
        const p = payload.payload as any
        if (!p?.order_id) return

        console.log('[Global QR Auto-Print] Received broadcast for order:', p.order_id)

        triggerPrintForOrder(p.order_id, p.new_item_ids)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, shopSettings])

  const handleUpdateStatus = async (status: string, expiry?: Date | null) => {
    const targetId = shopSettings?.id || '00000000-0000-0000-0000-000000000001'
    const { error } = await supabase
      .from('pos_shop_settings')
      .update({
        status,
        status_expiry: expiry ? expiry.toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId)
    if (!error) fetchShopSettings()
  }

  const unlockAudio = () => {
    if (audioRef.current) {
      const originalVolume = audioRef.current.volume || 0.8
      audioRef.current.volume = 0
      audioRef.current
        .play()
        .then(() => {
          audioRef.current?.pause()
          if (audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.volume = originalVolume
          }
          setIsAudioEnabled(true)
        })
        .catch(() => {})
    }
  }

  const handleOpenShift = async (startCash: number) => {
    const branchId = await getCurrentBranchId()
    const response = await fetch('/api/pos/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'open',
        staffId: profile?.id,
        branchId,
        shopSettingsId: shopSettings?.id,
        startCash,
      }),
    })
    const result = await response.json()

    if (!response.ok || !result?.shift) {
      console.error('Open shift failed:', result)
      alert('เปิดกะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      return
    }

    setActiveShift(result.shift)
    setIsShiftModalOpen(false)
    setActiveView('terminal')
    localStorage.setItem('xyl_pos_active_view', 'terminal')
    fetchShopSettings()
    fetchShiftStats(result.shift.id)
  }

  const handleCloseShift = async (actualCash: number) => {
    if (!activeShift || !profile) return
    try {
      const branchId = await getCurrentBranchId()
      const response = await fetch('/api/pos/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          staffId: profile.id,
          shiftId: activeShift.id,
          branchId: branchId || activeShift.branch_id || null,
          shopSettingsId: shopSettings?.id,
          actualCash,
        }),
      })
      const result = await response.json()

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || 'Close shift request failed')
      }

      setActiveShift(null)
      setShiftStats(null)
      setCart([])
      setSelectedTable(null)
      setEditingOrderId(null)
      setEditingOrderNumber(null)
      setOrderType('takeaway')
      setDeliveryPlatform('')
      setActiveView('drawer')
      localStorage.setItem('xyl_pos_active_view', 'drawer')
      localStorage.removeItem('pos_saved_editing_order_id')
      localStorage.removeItem('pos_saved_editing_order_number')
      localStorage.removeItem('pos_saved_selected_table')
      fetchShopSettings()
      setIsShiftModalOpen(true)
    } catch (e) {
      console.error('Close shift failed:', e)
      const message = e instanceof Error ? e.message : 'กรุณาลองใหม่อีกครั้ง'
      alert(`ปิดกะไม่สำเร็จ: ${message}`)
    }
  }

  const navItems: { id: POSView; label: string; icon: any; roles: string[]; group: 'operations' | 'management' }[] = [
    { id: 'terminal', label: 'หน้าขาย', icon: Calculator, roles: ['admin', 'staff'], group: 'operations' },
    { id: 'tables', label: 'โต๊ะ', icon: Home, roles: ['admin', 'manager', 'staff'], group: 'operations' },
    { id: 'drawer', label: 'ลิ้นชักเงิน', icon: Wallet, roles: ['admin', 'manager', 'staff'], group: 'operations' },
    { id: 'history', label: 'ประวัติขาย', icon: HistoryIcon, roles: ['admin', 'manager', 'staff'], group: 'operations' },
    { id: 'members', label: 'สมาชิก', icon: Users, roles: ['admin', 'manager', 'staff'], group: 'operations' },
    { id: 'inventory', label: 'สต็อก', icon: Package, roles: ['admin', 'manager', 'staff'], group: 'management' },
    { id: 'reports', label: 'รายงาน', icon: BarChart3, roles: ['admin'], group: 'management' },
    { id: 'staff', label: 'พนักงาน', icon: Users, roles: ['admin'], group: 'management' },
    { id: 'management', label: 'จัดการระบบ', icon: Settings, roles: ['admin', 'manager'], group: 'management' },
    { id: 'settings', label: 'ตั้งค่าร้าน', icon: Settings, roles: ['admin', 'manager'], group: 'management' },
  ]

  const allowedNav = navItems.filter(item => {
    const level = (profile as any)?.staff_level || 'staff'
    const role = profile?.role === 'admin' ? 'admin' : level === 'manager' ? 'manager' : 'staff'
    if (profile?.role === 'admin') return true
    
    // Check dynamic permissions from shopSettings
    const dynamicPerms = (shopSettings as any)?.role_permissions
    if (dynamicPerms && dynamicPerms[role]) {
      return dynamicPerms[role].includes(item.id)
    }
    
    return item.roles.includes(role)
  })

  const handleSetView = (view: POSView) => {
    setActiveView(view)
    localStorage.setItem('xyl_pos_active_view', view)
  }

  const getActiveViewTitle = () => {
    const item = navItems.find(i => i.id === activeView)
    return item ? item.label : 'POS TERMINAL'
  }

  const [viewExtraHeader, setViewExtraHeader] = useState<React.ReactNode>(null)

  const commonProps = {
    profile,
    activeShift,
    shiftStats,
    activeView: activeView || 'terminal',
    allowedNav,
    onSetView: handleSetView,
    fetchShiftStats,
    onShiftModalOpen: () => handleSetView('drawer'),
    syncPulse,
    unlockAudio,
    isAudioEnabled,
    onOpenShiftModal: () => setIsShiftModalOpen(true),
    shopSettings,
    setShopSettings,
    pendingOrders,
    setPendingOrders,
    searchTerm,
    setSearchTerm,
    setIsStatusModalOpen,
    isStatusModalOpen,
    handleUpdateStatus,
    cart,
    setCart,
    selectedCustomer,
    setSelectedCustomer,
    showCustomerModal,
    setShowCustomerModal,
    isCartExpanded,
    setIsCartExpanded,
    showPendingModal,
    setShowPendingModal,
    cartTotal,
    cartItemCount,
    setViewExtraHeader,
    categories: inventoryCategories,
    selectedTable,
    setSelectedTable,
    editingOrderId,
    setEditingOrderId,
    editingOrderNumber,
    setEditingOrderNumber,
    orderType,
    setOrderType,
    deliveryPlatform,
    setDeliveryPlatform,
  }

  const renderView = () => {
    if (!activeView) return null
    switch (activeView) {
      case 'terminal':
        return <POSTerminal {...commonProps} />
      case 'drawer':
        return (
          <POSDrawerManager
            {...commonProps}
            onOpenShift={handleOpenShift}
            onCloseShift={handleCloseShift}
          />
        )
      case 'menu':
        return <POSMenuManager {...commonProps} />
      case 'tables':
        return <POSTableManager {...commonProps} />
      case 'inventory':
        return <POSInventoryManager {...commonProps} />
      case 'recipes':
        return <POSRecipeManager {...commonProps} />
      case 'staff':
        return <POSStaffManager {...commonProps} />
      case 'reports':
        return <POSReports {...commonProps} />
      case 'kitchen':
        return <POSKitchen {...commonProps} />
      case 'settings':
        return <POSShopSettings {...commonProps} />
      case 'modifiers':
        return <POSModifierManager {...commonProps} />
      case 'members':
        return <POSMemberManager {...commonProps} />
      case 'management':
        return <POSManagementUnified {...commonProps} />
      case 'history':
        return <POSHistory {...commonProps} />
      default:
        return <POSTerminal {...commonProps} />
    }
  }

  if (loading) return <XYLLoader tagline={locale === 'en' ? 'กำลังเข้าสู่ระบบจัดการ...' : locale === 'zh' ? 'กำลังเข้าสู่ระบบจัดการ...' : 'กำลังเข้าสู่ระบบจัดการ...'} />

  const isKitchen = activeView === 'kitchen'

  return (
    <div
      className="italic-selection h-screen bg-white"
      onClick={!isAudioEnabled ? unlockAudio : undefined}
    >
      <POSLayout
        profile={profile}
        activeView={activeView || 'terminal'}
        allowedNav={allowedNav}
        onSetView={handleSetView}
        title={getActiveViewTitle()}
        isDark={isKitchen}
        headerExtra={viewExtraHeader}
        branchName={shopSettings?.branch_name}
        onBranchClick={profile?.role === 'admin' ? () => setShowAdminBranchSelect(true) : undefined}
      >
        {renderView()}

        {/* ADMIN BRANCH SELECTION MODAL */}
        <POSBranchSelectModal
          isOpen={showAdminBranchSelect}
          onClose={() => {
            if (shopSettings?.branch_id) setShowAdminBranchSelect(false)
          }}
          currentBranchId={shopSettings?.branch_id}
          onSelect={(branchId) => {
            setShowAdminBranchSelect(false)
            window.location.href = `/dashboard/pos?branch_id=${branchId}`
          }}
        />

        {/* GLOBAL MODALS */}
        <POSShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
          onOpenShift={handleOpenShift}
          shopSettings={shopSettings}
        />

        <POSShopStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          currentStatus={shopSettings?.status || 'open'}
          onUpdateStatus={handleUpdateStatus}
          hasActiveShift={!!activeShift}
        />
      </POSLayout>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Outfit:wght@200;300;400;500;900&family=Prompt:wght@200;300;400&display=swap');
        body {
          font-family: 'Outfit', 'Prompt', sans-serif;
          background-color: #f5f4f0;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        .font-serif-luxury {
          font-family: 'Cormorant Garamond', serif;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(26, 26, 24, 0.1);
          border-radius: 0;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(26, 26, 24, 0.2);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .italic-selection::selection {
          background: #1a1a18;
          color: #fff;
        }
      `}</style>
    </div>
  )
}

export default function RestaurantOSPage() {
    const { locale } = useI18n();
  return (
    <Suspense fallback={<XYLLoader tagline={locale === 'en' ? 'กำลังโหลดระบบ POS...' : locale === 'zh' ? 'กำลังโหลดระบบ POS...' : 'กำลังโหลดระบบ POS...'} />}>
      <RestaurantOSPageContent />
    </Suspense>
  )
}
