'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react'

import { POSReceipt } from './POSReceipt'
import { POSKitchenTicket } from './POSKitchenTicket'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Search,
  LayoutGrid,
  Clock,
  Users,
  X,
  ChevronRight,
  Settings,
  ArrowLeft,
  History,
  ShieldCheck,
  Printer,
  QrCode,
  RefreshCcw,
  Image as ImageIcon,
  ShoppingCart,
  Loader2,
  Bell,
  FileText,
  Ticket,
  ArrowRight,
  Home,
  MoreHorizontal,
  User,
  LogOut,
  UserPlus,
  Gift,
  Receipt,
  Coins,
  Percent,
  DollarSign,
  Wallet,
  Menu as MenuIcon,
  Filter,
  ChevronDown,
  List,
  Layers,
  Grid,
  BellRing,
  MapPin,
  Tag,
  Check,
  Truck,
  AlertTriangle,
  Delete,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, type Profile } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { PrinterSocket } from 'custom-printer-plugin';
import { playAppSound } from '@/lib/audioUtils';
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder'
import { printCustomerReceipt, printKitchenTicket, printOpenDrawer, printPreReceipt } from '@/lib/printerUtils'
import POSCustomerSelect from './POSCustomerSelect'
import POSShopStatusModal from './POSShopStatusModal'
import PointGenerator from './PointGenerator'
import POSPinModal from './POSPinModal'
import POSSplitPaymentModal from './POSSplitPaymentModal'
import POSPromotionsModal from './POSPromotionsModal'
import DeliveryManager from '@/components/dashboard/delivery/DeliveryManager'
import { useI18n } from "@/lib/I18nContext";
import { getMenuSearchText, getPrimaryMenuName, getSecondaryMenuName } from '@/lib/posMenuLabels'
import { sortMenuItemsByOrder } from '@/lib/posMenuOrder'

interface MenuItem {
  id: string
  name: string
  name_th?: string | null
  name_en?: string | null
  name_zh?: string | null
  sale_price: number
  cost_price?: number
  image_url: string | null
  category_id: string
  category?: { name: string }
  modifiers?: any[]
  platform_prices?: any
}

interface CartItem extends MenuItem {
  quantity: number
  selected_modifiers?: any[]
  note?: string
  discount_amount?: number
  discount_reason?: string
}

interface POSTable {
  id: string
  table_number: string
  zone: string
  status: string
}

const formatDeliveryPlatformLabel = (platform?: string | null) => {
  if (!platform) return 'เลือกค่าย'
  switch (platform) {
    case 'grab':
      return 'Grab'
    case 'lineman':
      return 'LINE MAN'
    case 'shopee':
      return 'ShopeeFood'
    case 'foodpanda':
      return 'foodpanda'
    case 'robinhood':
      return 'Robinhood'
    default:
      return platform.toUpperCase()
  }
}

type POSOrderIdentity = {
  orderNumber: string
  queueNumber: number
}

const normalizeLineModifiers = (modifiers?: any[]) =>
  JSON.stringify((modifiers || []).map((mod: any) => ({
    id: mod?.id || null,
    name: mod?.name || '',
    value: mod?.value || '',
    price: Number(mod?.price || 0),
  })).sort((a: any, b: any) => `${a.id || ''}${a.name}${a.value}${a.price}`.localeCompare(`${b.id || ''}${b.name}${b.value}${b.price}`)))

const cartLineKey = (item: any) => `${item.id || item.item_id}|${normalizeLineModifiers(item.selected_modifiers)}`

const buildCartFingerprint = (items: any[]) => {
  const summary = new Map<string, number>()
  items.forEach((item) => {
    const key = cartLineKey(item)
    summary.set(key, (summary.get(key) || 0) + Number(item.quantity || 0))
  })
  return Array.from(summary.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, quantity]) => `${key}:${quantity}`)
    .join('||')
}

const computeNewCartItems = (cartItems: any[], existingItems: any[]) => {
  const remainingExisting = new Map<string, number>()
  existingItems.forEach((item) => {
    const key = cartLineKey(item)
    remainingExisting.set(key, (remainingExisting.get(key) || 0) + Number(item.quantity || 0))
  })

  const delta: any[] = []
  cartItems.forEach((item) => {
    const key = cartLineKey(item)
    const existingQty = remainingExisting.get(key) || 0
    const cartQty = Number(item.quantity || 0)
    const newQty = Math.max(0, cartQty - existingQty)
    remainingExisting.set(key, Math.max(0, existingQty - cartQty))
    if (newQty > 0) delta.push({ ...item, quantity: newQty })
  })
  return delta
}

interface POSTerminalProps {
  profile: any
  activeShift: any
  onShiftModalOpen: () => void
  shiftStats: any
  fetchShiftStats: (id: string) => void
  onCashActionModalOpen?: () => void
  onManageTables?: () => void
  activeView: string
  allowedNav: any[]
  onSetView: (view: any) => void
  onOpenShiftModal: () => void
  syncPulse?: number
  unlockAudio?: () => void
  isAudioEnabled?: boolean
  // Global States from Parent
  shopSettings: any
  setShopSettings: (s: any) => void
  pendingOrders: any[]
  setPendingOrders: (o: any[]) => void
  searchTerm: string
  setSearchTerm: (t: string) => void
  setIsStatusModalOpen: (o: boolean) => void
  isStatusModalOpen: boolean
  handleUpdateStatus: (status: string, expiry?: Date | null) => Promise<void>
  // New States
  cart: any[]
  setCart: React.Dispatch<React.SetStateAction<any[]>>
  selectedCustomer: any
  setSelectedCustomer: React.Dispatch<React.SetStateAction<any>>
  showCustomerModal: boolean
  setShowCustomerModal: (o: boolean) => void
  isCartExpanded: boolean
  setIsCartExpanded: (o: boolean) => void
  showPendingModal: boolean
  setShowPendingModal: (o: boolean) => void
  setViewExtraHeader: (node: React.ReactNode) => void
  // Lifted States
  selectedTable: any | null
  setSelectedTable: React.Dispatch<React.SetStateAction<any | null>>
  editingOrderId: string | null
  setEditingOrderId: React.Dispatch<React.SetStateAction<string | null>>
  editingOrderNumber: string | null
  setEditingOrderNumber: React.Dispatch<React.SetStateAction<string | null>>
  orderType: 'dine_in' | 'takeaway' | 'delivery'
  setOrderType: React.Dispatch<React.SetStateAction<'dine_in' | 'takeaway' | 'delivery'>>
  deliveryPlatform: string
  setDeliveryPlatform: React.Dispatch<React.SetStateAction<string>>
}

export default function POSTerminal({
  profile,
  activeShift,
  onShiftModalOpen,
  shiftStats,
  fetchShiftStats,
  onCashActionModalOpen,
  onManageTables,
  activeView,
  allowedNav,
  onSetView,
  onOpenShiftModal,
  syncPulse,
  unlockAudio,
  isAudioEnabled,
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
  setViewExtraHeader,
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
}: POSTerminalProps) {
  // --- INTERNAL STATES ---
  const router = useRouter()
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [tables, setTables] = useState<POSTable[]>([])
  const [successAudio, setSuccessAudio] = useState<HTMLAudioElement | null>(null)

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)

  const { locale } = useI18n();
  const [showPointModal, setShowPointModal] = useState(false)
  const [showTableModal, setShowTableModal] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [showDeliveryHub, setShowDeliveryHub] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const [paymentSplits, setPaymentSplits] = useState<any[]>([])
  const [discountValue, setDiscountValue] = useState(0) // Fixed amount or percentage
  const [discountRate, setDiscountRate] = useState(0) // For UI input
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('percent')
  const [discountName, setDiscountName] = useState('')

  // --- BILL DISCOUNT MODAL STATE ---
  const [showBillDiscountModal, setShowBillDiscountModal] = useState(false)
  const [billDiscountInput, setBillDiscountInput] = useState<string>('')
  const [billDiscountModalType, setBillDiscountModalType] = useState<'fixed' | 'percent'>('fixed')
  const [billDiscountReason, setBillDiscountReason] = useState<string>('โปรโมชั่น/ส่วนลด')
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false)
  const [vatRate, setVatRate] = useState(7) // Default to 7%

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  const editingOrderIdRef = useRef(editingOrderId)
  useEffect(() => { editingOrderIdRef.current = editingOrderId }, [editingOrderId])

  // MODIFIER STATES
  const [modifierModalItem, setModifierModalItem] = useState<MenuItem | null>(null)
  const [modifierGroups, setModifierGroups] = useState<any[]>([])
  const [tempSelectedModifiers, setTempSelectedModifiers] = useState<any[]>([])
  const [tempQuantity, setTempQuantity] = useState(1)

  // --- ITEM DISCOUNT MODAL STATE ---
  const [itemDiscountModalItem, setItemDiscountModalItem] = useState<CartItem | null>(null)
  const [itemDiscountValue, setItemDiscountValue] = useState<string>('')
  const [itemDiscountType, setItemDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [itemDiscountReason, setItemDiscountReason] = useState<string>('ใช้แต้มแลก (Points)')
  const [activePromotions, setActivePromotions] = useState<any[]>([])
  const [showPromotionsModal, setShowPromotionsModal] = useState(false)


  const [hasVat, setHasVat] = useState(false) // Default to false as requested
  const [hasServiceCharge, setHasServiceCharge] = useState(false)

const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [mergeTableTarget, setMergeTableTarget] = useState<{table: any, pendingOrder: any} | null>(null)
  const [pendingOrderTypeSwitch, setPendingOrderTypeSwitch] = useState<'dine_in' | 'takeaway' | 'delivery' | null>(null)
  const [pinCallback, setPinCallback] = useState<(() => void) | null>(null)
  const [pinTitle, setPinTitle] = useState('')
  const [pinDesc, setPinDesc] = useState('')

  // Cash Payment Modal States
const [showCashPaymentModal, setShowCashPaymentModal] = useState(false)
  const [totalPaid, setTotalPaid] = useState<number>(0)
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false)
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState<number>(0)
  const [cashReceived, setCashReceived] = useState('')
  const [paymentSuccessData, setPaymentSuccessData] = useState<{ received: number, change: number, orderId: string, orderNumber: string, queueNumber?: string, items: any[], subtotal: number, discount: number, tax: number, serviceCharge: number, total: number, paymentMethod: string, timestamp: string, deliveryPlatform?: string, referenceName?: string, tableNumber?: string, customerName?: string, orderType?: string, orderSource?: string, comment?: string, notes?: string, pickupTime?: string } | null>(null)
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number>(-1)

  const [printMode, setPrintMode] = useState<'none' | 'receipt' | 'kitchen'>('none');

  const [flyingItems, setFlyingItems] = useState<{id: string, x: number, y: number, imageUrl?: string}[]>([])
  const [isCartBumping, setIsCartBumping] = useState(false)
  const [platformOrderId, setPlatformOrderId] = useState('')
  const [isDeliveryPlatformModalOpen, setIsDeliveryPlatformModalOpen] = useState(false)
  const [draftDeliveryPlatform, setDraftDeliveryPlatform] = useState('')
  const [draftPlatformOrderId, setDraftPlatformOrderId] = useState('')
  const [heldCartFingerprint, setHeldCartFingerprint] = useState('')

  const activeDeliveryPlatforms = shopSettings?.opening_hours?.active_delivery_platforms || ['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood']

  const [showDeliveryCheckoutModal, setShowDeliveryCheckoutModal] = useState(false)

  const openDeliveryPlatformModal = (platformOverride?: string) => {
    // ผู้ใช้ต้องการให้ "กดคือต้องเลือกค่ายใหม่ทุกครั้ง" จึงบังคับเคลียร์ค่า draft เสมอ
    setDraftDeliveryPlatform('')
    setDraftPlatformOrderId(platformOrderId || '')
    setIsDeliveryPlatformModalOpen(true)
  }

  const saveDeliveryPlatformDetails = () => {
    const trimmedOrderId = draftPlatformOrderId.trim()
    if (!draftDeliveryPlatform) {
      alert('กรุณาเลือกค่ายเดลิเวอรี่ก่อน')
      return
    }
    if (!trimmedOrderId) {
      alert('กรุณากรอกเลขบิลของออเดอร์เดลิเวอรี่')
      return
    }
    setDeliveryPlatform(draftDeliveryPlatform)
    setPlatformOrderId(trimmedOrderId)
    setIsDeliveryPlatformModalOpen(false)
  }

  const resetDeliveryDraft = () => {
    setDeliveryPlatform('')
    setPlatformOrderId('')
    setDraftDeliveryPlatform('')
    setDraftPlatformOrderId('')
    setIsDeliveryPlatformModalOpen(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos_saved_delivery_platform')
      localStorage.removeItem('pos_saved_platform_order_id')
    }
  }

  const resetOrderComposer = () => {
    setCart([])
    setHeldCartFingerprint('')
    setEditingOrderId(null)
    setEditingOrderNumber(null)
    setSelectedTable(null)
    setSelectedCustomer(null)
    setIsCartExpanded(false)
    setOrderType('dine_in')
    resetDeliveryDraft()
    setDiscountValue(0)
    setDiscountRate(0)
    setDiscountType('percent')
    setDiscountName('')
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos_saved_cart')
      localStorage.removeItem('pos_saved_order_type')
      localStorage.removeItem('pos_saved_editing_order_id')
      localStorage.removeItem('pos_saved_editing_order_number')
      localStorage.removeItem('pos_saved_selected_table')
    }
  }

  const ensureDeliveryDetailsReady = () => {
    if (orderType !== 'delivery') return true
    if (!deliveryPlatform || !platformOrderId.trim()) {
      openDeliveryPlatformModal(deliveryPlatform || activeDeliveryPlatforms[0] || 'grab')
      return false
    }
    return true
  }

  const handleProductClick = (e: React.MouseEvent, item: MenuItem) => {
    if (!item.modifiers || item.modifiers.length === 0) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const startX = rect.left + rect.width / 2
      const startY = rect.top + rect.height / 2
      
      const id = Date.now().toString() + Math.random()
      setFlyingItems(prev => [...prev, { id, x: startX, y: startY, imageUrl: item.image_url || undefined }])
      
      setTimeout(() => {
        setFlyingItems(prev => prev.filter(fi => fi.id !== id))
      }, 500)
    }
    addToCart(item)
  }

  useEffect(() => {
    if (printMode !== 'none') {
      let raf2 = 0
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          window.print();
          setPrintMode('none');
        });
      });
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    }
  }, [printMode]);

  const buildNativePreReceipt = (
    model: string = 'xprinter-xp-n160ii',
    encoding: string = 'cp874',
    orderTypeForPrint: string = orderType,
    deliveryPlatformForPrint: string = deliveryPlatform,
    platformOrderIdForPrint: string = platformOrderId
  ) => {
    const encoder = new ReceiptPrinterEncoder({
      printerModel: model as any,
      columns: 48, codepageMapping: { 'cp874': 0xff, 'tis620': 0xff }
    });
    
    let result = encoder.initialize().codepage(encoding as any).align('center');
    
    result = result.bold(true).size(2, 2).line(shopSettings?.shop_name || 'XYLEM LANDSCAPE').size(1, 1).bold(false);
    result = result.newline();
    result = result.bold(true).line('BILL / ใบแจ้งยอด').bold(false).newline();
    
    result = result.align('left').line(`Date       : ${new Date().toLocaleString()}`);
    result = result.line(`Type       : ${orderTypeForPrint === 'delivery' ? 'DELIVERY' : orderTypeForPrint === 'takeaway' ? 'TAKEAWAY' : 'DINE-IN'}`);
    if (orderTypeForPrint === 'delivery') {
      result = result.line(`Platform   : ${deliveryPlatformForPrint ? deliveryPlatformForPrint.toUpperCase() : '-'}`);
      result = result.line(`Bill No.   : ${platformOrderIdForPrint || '-'}`);
    }
    if (selectedTable) result = result.line(`Table      : ${selectedTable.table_number}`);
    
    result = result.line('-'.repeat(48));
    
    const isLarge = shopSettings?.receipt_font_size === 'large';
    
    cart.forEach(item => {
      const quantity = item.quantity || 1;
      const title = `${quantity}x ${item.name}`;
      const itemSubtotal = getEffectiveItemUnitPrice(item) * quantity;
      const priceStr = itemSubtotal.toLocaleString();
      
      const space = Math.max(0, 48 - title.length - priceStr.length);
      const lineStr = title + ' '.repeat(space) + priceStr;
      
      if (isLarge) {
          result = result.size(1, 2).line(lineStr).size(1, 1);
      } else {
          result = result.line(lineStr);
      }
      
      if (item.selected_modifiers && item.selected_modifiers.length > 0) {
        item.selected_modifiers.forEach((m: any) => {
          if (isLarge) {
              result = result.size(1, 2).line(`   - ${m.name}`).size(1, 1);
          } else {
              result = result.line(`   - ${m.name}`);
          }
        });
      }
    });
    
    result = result.line('-'.repeat(48)).align('right');
    
    if (isLarge) result = result.size(1, 2);
    result = result.line(`Subtotal: ${cartSubTotal.toLocaleString()}`);
    if (discountTotalValue > 0) result = result.line(`Discount: -${discountTotalValue.toLocaleString()}`);
    if (vatAmount > 0) result = result.line(`VAT: ${vatAmount.toLocaleString()}`);
    result = result.bold(true).line(`Total: ${cartTotal.toLocaleString()}`).bold(false);
    if (isLarge) result = result.size(1, 1);
    
    result = result.newline();
    result = result.align('center');
    
    if (shopSettings?.receipt_footer) {
      const footerLines = shopSettings.receipt_footer.split('\n');
      footerLines.forEach((line: string) => result = result.line(line));
      result = result.newline();
    } else {
      result = result.line('Please review your order').newline();
    }
    
    return result.newline().newline().newline().cut().encode();
  };

  const executeNativePrint = async (type: 'receipt' | 'kitchen', openDrawer: boolean = false) => {
    if (!paymentSuccessData) return;
    const printers = shopSettings?.printers || [];
    let targetPrinters = printers.filter((p: any) => p.type === type || p.type === 'both');
    if (type === 'receipt' && targetPrinters.length === 0) {
        targetPrinters = printers.filter((p: any) => p.type === 'kitchen' || p.type === 'both');
    }
    
    // Fallback if no printers configured in DB
    if (targetPrinters.length === 0) {
        let ip = localStorage.getItem('xylem_printer_ip');
        if (!ip) {
            ip = prompt('กรุณาระบุ IP Address ของเครื่องปริ้น (เช่น 192.168.1.100):', '192.168.1.100');
            if (ip) localStorage.setItem('xylem_printer_ip', ip);
            else return;
        }
        targetPrinters = [{ ip, type, model: 'xprinter-xp-n160ii', categories: ['all'] }];
    }

    try {
        const printOrderData = {
          orderNumber: paymentSuccessData.orderNumber,
          date: new Date(paymentSuccessData.timestamp).toLocaleString(),
          orderSource: paymentSuccessData.orderSource || 'pos',
          tableNumber: paymentSuccessData.tableNumber,
          orderType: paymentSuccessData.orderType || orderType,
          staffName: profile?.full_name || 'Staff',
          customerName: paymentSuccessData.customerName,
          deliveryPlatform: paymentSuccessData.deliveryPlatform,
          referenceName: paymentSuccessData.referenceName,
          comment: paymentSuccessData.comment || paymentSuccessData.notes || '',
          pickupTime: paymentSuccessData.pickupTime || '',
          subtotal: paymentSuccessData.subtotal,
          discount: paymentSuccessData.discount,
          serviceCharge: paymentSuccessData.serviceCharge,
          tax: paymentSuccessData.tax,
          total: paymentSuccessData.total,
          paymentMethod: paymentSuccessData.paymentMethod,
          receivedAmount: paymentSuccessData.received,
          changeAmount: paymentSuccessData.change,
          items: paymentSuccessData.items
        };
        
        const storyMode = shopSettings?.receipt_story_mode || shopSettings?.opening_hours?.receipt_story_mode;
        const availableStories = shopSettings?.receipt_stories || shopSettings?.opening_hours?.receipt_stories || [];
        
        let passStories = availableStories;
        if (selectedStoryIndex !== -1 && passStories.length > selectedStoryIndex) {
            passStories = [passStories[selectedStoryIndex]];
        }

        const printShopData = {
          name: shopSettings?.name || shopSettings?.shop_name || 'XYL STUDIO',
          branch: shopSettings?.branch_name,
          taxId: shopSettings?.tax_id,
          address: shopSettings?.address,
          phone: shopSettings?.phone,
          receiptHeader: shopSettings?.receipt_header,
          receiptFooter: shopSettings?.receipt_footer,
          receiptShowLogo: shopSettings?.receipt_show_logo,
          receiptFontSize: shopSettings?.receipt_font_size,
          kitchenFontSize: shopSettings?.kitchen_font_size,
          kitchenShowType: shopSettings?.kitchen_show_type,
          receiptPaymentQrImage: shopSettings?.opening_hours?.receipt_payment_qr_image
            || shopSettings?.receipt_payment_qr_image
            || (shopSettings as any)?.receipt_payment_qr_image,
          receipt_story_mode: storyMode,
          receipt_stories: passStories
        };

        for (const printer of targetPrinters) {
            if (!printer.ip) continue;
            
            if (type === 'receipt') {
               if (printer.encoding === 'graphic') {
                   const { printGraphicModeCustomerReceipt } = await import('@/lib/graphicPrinter');
                   await printGraphicModeCustomerReceipt(printer.ip, printOrderData, printShopData, printer.model, printer.encoding, openDrawer);
               } else {
                   await printCustomerReceipt(printer.ip, printOrderData, printShopData, printer.model, printer.encoding, openDrawer);
               }
            } else {
               let itemsToPrint = printOrderData.items;
               const printerCats = printer.categories || [];
               
               if (!printerCats.includes('all') && printerCats.length > 0) {
                  itemsToPrint = printOrderData.items.filter((i: any) => printerCats.includes(i.category_id));
               }
               
               if (itemsToPrint.length > 0) {
                  const routedOrderData = { ...printOrderData, items: itemsToPrint };
                  if (printer.encoding === 'graphic') {
                      const { printGraphicModeKitchenTicket } = await import('@/lib/graphicPrinter');
                      await printGraphicModeKitchenTicket(printer.ip, routedOrderData, printShopData, printer.model, printer.encoding);
                  } else {
                      await printKitchenTicket(printer.ip, routedOrderData, printShopData, printer.model, printer.encoding);
                  }
               }
            }
        }
    } catch (e: any) {
        console.error(e);
        alert('Native print error: ' + (e?.message || JSON.stringify(e)));
        setPrintMode(type);
    }
  };

  const handlePrintReceipt = () => {
    executeNativePrint('receipt', false); // never open drawer on manual print
    setPrintMode('receipt');
  };

  const handlePrintKitchen = () => {
    executeNativePrint('kitchen');
    setPrintMode('kitchen');
  };

  const checkManagerPin = (
    onSuccessCallback: () => void,
    actionTitle: string = 'MANAGER AUTHORIZATION',
    actionDesc: string = 'กรุณาใส่รหัสผ่านผู้จัดการเพื่อทำรายการนี้'
  ) => {
    const correctPin = shopSettings?.role_permissions?.manager_pin
    if (correctPin) {
      setPinCallback(() => onSuccessCallback)
      setPinTitle(actionTitle)
      setPinDesc(actionDesc)
      setIsPinModalOpen(true)
    } else {
      // Fallback if no PIN is set, just allow it
      onSuccessCallback()
    }
  }

  const categoryScrollRef = useRef<HTMLDivElement>(null)
  // --- DERIVED STATES ---
  const getEffectiveItemUnitPrice = (item: any) => {
    if (item?.unit_price !== undefined && item?.unit_price !== null) {
      return Number(item.unit_price)
    }
    const platformPrice =
      orderType === 'delivery' && deliveryPlatform && item?.platform_prices?.[deliveryPlatform]
        ? Number(item.platform_prices[deliveryPlatform])
        : null
    return Number(platformPrice ?? item?.sale_price ?? item?.price ?? 0)
  }

  const cartItemCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart])
  const cartFingerprint = useMemo(() => buildCartFingerprint(cart), [cart])
  const isHeldOrderBaselineLoading = !!editingOrderId && !heldCartFingerprint
  const hasUnsavedOrderChanges = !editingOrderId || cartFingerprint !== heldCartFingerprint
  const rawCartSubTotal = useMemo(
    () =>
      cart.reduce((acc, item) => {
        const modsPrice =
          item.selected_modifiers?.reduce(
            (ma: number, m: any) => ma + (m.price_adjustment || 0),
            0
          ) || 0

        const basePrice = getEffectiveItemUnitPrice(item)
        const rowPrice = (basePrice + modsPrice) * item.quantity
        return acc + rowPrice
      }, 0),
    [cart, orderType, deliveryPlatform]
  )

  const itemDiscountTotal = useMemo(
    () => cart.reduce((acc, item) => acc + (item.discount_amount || 0), 0),
    [cart]
  )

  const cartSubTotal = useMemo(
    () => rawCartSubTotal - itemDiscountTotal,
    [rawCartSubTotal, itemDiscountTotal]
  )

  const discountTotalValue = useMemo(() => {
    return discountType === 'percent' ? cartSubTotal * (discountRate / 100) : discountValue
  }, [cartSubTotal, discountType, discountRate, discountValue])

  const vatAmount = useMemo(() => {
    return hasVat ? (cartSubTotal - discountTotalValue) * (vatRate / 100) : 0
  }, [hasVat, cartSubTotal, discountTotalValue, vatRate])

  const serviceChargeAmount = useMemo(() => {
    return hasServiceCharge ? (cartSubTotal - discountTotalValue) * 0.1 : 0
  }, [hasServiceCharge, cartSubTotal, discountTotalValue])

  const cartTotal = Math.max(
    0,
    Math.round(cartSubTotal - discountTotalValue + vatAmount + serviceChargeAmount)
  )
  const remainingTotal = Math.max(0, cartTotal - totalPaid)
  const isQrSourceOrder = (order: any) => order?.source === 'qr'
  const isLiffSourceOrder = (order: any) => order?.order_source === 'liff' || order?.source === 'liff'
  const isArchivedPendingOrder = (order: any) => {
    const status = String(order?.status || '').toLowerCase()
    return ['completed', 'cancelled', 'void', 'refunded'].includes(status)
  }
  const qrIncomingOrders = useMemo(
    () => pendingOrders.filter((order: any) => isQrSourceOrder(order) && String(order?.status || '').toLowerCase() === 'pending'),
    [pendingOrders]
  )
  const liffIncomingOrders = useMemo(
    () => pendingOrders.filter((order: any) => isLiffSourceOrder(order) && !isArchivedPendingOrder(order)),
    [pendingOrders]
  )
  const deliveryHubOrders = useMemo(
    () =>
      pendingOrders.filter((order: any) => {
        if (isArchivedPendingOrder(order)) return false
        return order?.order_type === 'delivery' || isLiffSourceOrder(order)
      }),
    [pendingOrders]
  )
  const suspendedOrders = useMemo(
    () => pendingOrders.filter((order: any) => !isLiffSourceOrder(order)),
    [pendingOrders]
  )

  // --- HEADER PORTAL ---
  useEffect(() => {
    setViewExtraHeader(
      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4 lg:gap-8">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsStatusModalOpen(true)}
            className={`relative hidden h-9 md:min-w-[40px] lg:min-w-[180px] items-center justify-center border px-3 lg:px-6 text-[9px] font-black uppercase tracking-[0.2em] shadow-sm transition-all md:flex rounded-full lg:rounded-none ${
              !activeShift
                ? 'border-red-200 bg-red-50 text-red-600'
                : shopSettings?.status === 'open' || (shopSettings as any)?.is_open
                  ? 'border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  : shopSettings?.status === 'paused'
                    ? 'animate-pulse border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                    : 'animate-pulse border-red-200 bg-red-50 text-red-500 hover:bg-red-100'
            }`}
          >
            <span className="flex items-center gap-2 whitespace-nowrap font-bold">
              {/* Dot only on MD, full text on LG */}
              <span className="lg:hidden text-lg leading-none">●</span>
              <span className="hidden lg:inline">
              {!activeShift
                ? '● ปิดกะ (OFFLINE)'
                : shopSettings?.status === 'open' || (shopSettings as any)?.is_open
                  ? `● ร้านเปิด (${new Date(activeShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                  : shopSettings?.status === 'paused'
                    ? '● หยุดรับออเดอร์ชั่วคราว'
                    : '● ร้านปิด (CLOSED)'}
              </span>
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 border-l border-gray-100 pl-2 sm:pl-3">
            {/* MEMBER & PENDING CLUSTER */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => setShowPromotionsModal(true)}
                className={`relative flex h-9 w-9 sm:h-10 sm:w-10 rounded-full items-center justify-center border font-bold transition-all border-[#F0F0E8] bg-white text-[#1A1A18] hover:border-black`}
                title="จัดการโปรโมชั่น"
              >
                <Tag size={16} />
              </button>
              
              <button
                onClick={() => setShowPointModal(true)}
                className={`relative flex h-9 w-9 sm:h-10 sm:w-10 rounded-full items-center justify-center border font-bold transition-all ${selectedCustomer ? 'border-black bg-[#1A1A18] text-white shadow-lg' : 'border-[#F0F0E8] bg-white text-[#1A1A18] hover:border-black'}`}
                title={locale === 'en' ? 'สะสมแต้ม' : locale === 'zh' ? 'สะสมแต้ม' : 'สะสมแต้ม'}
              >
                <QrCode size={16} />
                {selectedCustomer && (
                  <span className="absolute -right-0 -top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[7px] font-black text-white ring-1 ring-white">
                    ✓
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowPendingModal(true)}
                className={`relative flex h-9 w-9 sm:h-10 sm:w-10 rounded-full flex-col items-center justify-center border font-bold transition-all ${
                  qrIncomingOrders.length > 0 
                    ? 'border-orange-400 bg-orange-500 text-white shadow-lg animate-pulse hover:bg-orange-600' 
                    : suspendedOrders.length > 0 
                      ? 'border-orange-200 bg-orange-50 text-orange-600 shadow-sm hover:bg-orange-100' 
                      : 'border-[#F0F0E8] bg-white text-gray-300 hover:bg-gray-50'
                }`}
                title={locale === 'en' ? 'ออเดอร์รอดำเนินการ' : locale === 'zh' ? 'ออเดอร์รอดำเนินการ' : 'ออเดอร์รอดำเนินการ'}
              >
                {qrIncomingOrders.length > 0 
                  ? <BellRing size={16} /> 
                  : <History size={16} />
                }
                {suspendedOrders.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF5F1F] text-[8px] font-black text-white ring-1 ring-white">
                    {suspendedOrders.length}
                  </span>
                )}
              </button>

              <button
                onClick={e => {
                  e.stopPropagation()
                  setIsCartExpanded(false)
                  setShowDeliveryHub(true)
                }}
                className={`relative z-[10] flex h-9 w-9 sm:h-10 sm:w-10 rounded-full cursor-pointer items-center justify-center border bg-white font-bold shadow-sm transition-all hover:border-black hover:text-black ${
                  liffIncomingOrders.length > 0
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-600 shadow-lg'
                    : deliveryHubOrders.length > 0
                      ? 'border-emerald-200 text-emerald-600'
                      : 'border-[#F0F0E8] text-gray-400'
                }`}
                title="Delivery"
              >
                <Truck size={16} />
                {deliveryHubOrders.length > 0 && (
                  <span className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black text-white ring-1 ring-white ${
                    liffIncomingOrders.length > 0 ? 'bg-emerald-500' : 'bg-emerald-400'
                  }`}>
                    {deliveryHubOrders.length}
                  </span>
                )}
              </button>
            </div>

            <motion.button
              id="mobile-cart-button"
              onClick={() => {
                setShowDeliveryHub(false)
                setIsCartExpanded(true)
              }}
              animate={isCartBumping ? { scale: [1, 1.15, 0.95, 1.05, 1], rotate: [0, -5, 5, -2, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="group relative lg:hidden flex h-9 sm:h-10 items-center gap-1.5 bg-[#1A1A18] px-3 sm:px-4 font-bold text-white shadow-md transition-all hover:shadow-xl rounded-full"
            >
              <ShoppingBag size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden xs:inline">
                {locale === 'en' ? '                 ฿ ' : locale === 'zh' ? '                 ฿ ' : '                 ฿ '}{cartTotal.toLocaleString()}
              </span>
              {cartItemCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[8px] font-black text-[#1A1A18]">
                  {cartItemCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    )
    return () => setViewExtraHeader(null)
  }, [
    setViewExtraHeader,
    searchTerm,
    shopSettings,
    activeShift,
    selectedCustomer,
    pendingOrders,
    qrIncomingOrders,
    suspendedOrders,
    liffIncomingOrders,
    deliveryHubOrders,
    cartTotal,
    cartItemCount,
  ])

  // --- RE-FETCH HELPERS ---
  const refreshPendingOrders = async () => {
    let query = supabase
      .from('pos_orders')
      .select(`*, pos_order_items (*, item:pos_menu_items!item_id(name, image_url))`)
      .in('status', ['open', 'pending', 'payment_pending', 'accepted', 'preparing', 'shipping'])
      .order('created_at', { ascending: false })

    if (shopSettings?.branch_id) {
      query = query.eq('branch_id', shopSettings.branch_id)
    }

    const { data } = await query

    if (data) {
      setPendingOrders(data)
    }
  }

  const activeQueueStatuses = new Set(['open', 'pending', 'payment_pending', 'accepted', 'preparing', 'shipping'])
  const getQueueNumberForOrder = (currentOrderId?: string | null) => {
    const activeOrders = [...pendingOrders]
      .filter((order: any) => activeQueueStatuses.has(String(order.status || '').toLowerCase()))
      .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())

    if (currentOrderId) {
      const existingOrder = activeOrders.find((order: any) => order.id === currentOrderId)
      if (existingOrder?.queue_number !== undefined && existingOrder?.queue_number !== null) {
        const storedQueue = Number(existingOrder.queue_number)
        if (Number.isFinite(storedQueue) && storedQueue > 0) return storedQueue
      }

      const existingIndex = activeOrders.findIndex((order: any) => order.id === currentOrderId)
      if (existingIndex >= 0) return existingIndex + 1
    }

    const storedQueues = activeOrders
      .map((order: any) => Number(order.queue_number))
      .filter((queue: number) => Number.isFinite(queue) && queue > 0)

    if (storedQueues.length > 0) {
      return Math.max(...storedQueues) + 1
    }

    return activeOrders.length + 1
  }

  const isMissingQueueColumnError = (error: any) => {
    const message = String(error?.message || error || '')
    return /queue_number/i.test(message) && /(does not exist|column)/i.test(message)
  }

  const requestOrderIdentity = async (existingOrderId?: string | null): Promise<POSOrderIdentity> => {
    const fallbackQueue = getQueueNumberForOrder(existingOrderId)
    const response = await fetch('/api/pos/order-identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderType,
        branchId: shopSettings?.branch_id || activeShift?.branch_id || null,
        shiftId: activeShift?.id || null,
        existingOrderId: existingOrderId || null,
      }),
    })
    const result = await response.json()

    if (!response.ok || !result?.orderNumber || !result?.queueNumber) {
      if (existingOrderId && editingOrderNumber) {
        return { orderNumber: editingOrderNumber, queueNumber: fallbackQueue }
      }
      throw new Error(result?.error || 'ไม่สามารถสร้างเลขบิลและเลขคิวได้')
    }

    return {
      orderNumber: result.orderNumber,
      queueNumber: Number(result.queueNumber),
    }
  }

  const handleDeleteOrder = async (id: string) => {
    if (
      !confirm(
        profile?.role === 'admin'
          ? 'คุณแน่ใจว่าต้องการยกเลิกบิลนี้อย่างถาวร? (รายการจะถูกเปลี่ยนสถานะเป็นยกเลิก)'
          : 'คุณต้องการขอยกเลิกรายการนี้ใช่หรือไม่?'
      )
    )
      return

    checkManagerPin(async () => {
      try {
        const { error } = await supabase
          .from('pos_orders')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', id)
        if (error) throw error
        
        const orderToCancel = pendingOrders.find(o => o.id === id)
        if (orderToCancel?.table_id) {
          await supabase.from('pos_tables').update({ status: 'available' }).eq('id', orderToCancel.table_id)
        }
        
        refreshPendingOrders()
      } catch (e: any) {
        alert('ไม่สามารถยกเลิกบิลได้: ' + e.message)
      }
    }, 'ยกเลิกบิล (VOID ORDER)', 'จำเป็นต้องใช้รหัสผ่านผู้จัดการในการยกเลิกบิล')
  }

  const handleResumeOrder = async (order: any, mergeWithCurrentCart: boolean = false) => {
    try {
      const { data: directItems, error: itemsError } = await supabase
        .from('pos_order_items')
        .select(`*, item:pos_menu_items!item_id(*)`)
        .eq('order_id', order.id)

      if (itemsError) throw itemsError

	      if (directItems && directItems.length > 0) {
	        const fetchedItems = directItems.map((i: any) => ({
            id: i.item_id,
            name: i.item?.name || 'Unknown Item',
            image_url: i.item?.image_url || '',
            sale_price: i.unit_price,
            cost_price: i.cost_price || 0,
            quantity: i.quantity,
            selected_modifiers: i.selected_modifiers || [],
            category_id: i.item?.category_id || 'uncategorized',
            customer_name: i.customer_name || null,
            discount_amount: i.discount_amount || 0,
            discount_reason: i.discount_reason || null,
	        }));
	        const existingFingerprint = buildCartFingerprint(fetchedItems)
	        
	        if (mergeWithCurrentCart) {
	            const combinedCart = [...fetchedItems, ...cart];
	            setCart(combinedCart);
	            setHeldCartFingerprint(existingFingerprint)
	        } else {
	            setCart(fetchedItems);
	            setHeldCartFingerprint(existingFingerprint)
	        }

        setEditingOrderId(order.id)
        setEditingOrderNumber(order.order_number)
        
        // Fetch existing payments
        const { data: payments } = await supabase
          .from('pos_order_payments')
          .select('amount')
          .eq('order_id', order.id)
          .eq('status', 'paid')
        
        if (payments && payments.length > 0) {
          const sumPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
          setTotalPaid(sumPaid)
        } else {
          setTotalPaid(0)
        }
        const fetchedItemDiscountTotal = fetchedItems.reduce((acc: number, item: any) => acc + (item.discount_amount || 0), 0)
        const orderDiscountAmount = Number(order.discount_amount || 0)
        const billDiscount = orderDiscountAmount - fetchedItemDiscountTotal

        if (billDiscount > 0) {
          setDiscountType('fixed')
          setDiscountValue(billDiscount)
          setDiscountName('ส่วนลด/โปรโมชั่นเดิม')
        } else {
          setDiscountType('percent')
          setDiscountValue(0)
          setDiscountName('')
        }

        setOrderType(order.order_type)
        setDeliveryPlatform(order.delivery_platform || '')
        setPlatformOrderId(order.reference_name || '')
        setSelectedTable(tables.find(t => t.id === order.table_id) || (order.table_id ? ({ id: order.table_id, table_number: order.table_number } as any) : null))
        setShowPendingModal(false)
        setShowTableModal(false)
        setIsCartExpanded(true)
      } else {
        alert('ไม่พบรายการสินค้าในบิลนี้ในระบบ')
      }
    } catch (e: any) {
      console.error('Resume Order Error:', e)
      alert(`การกู้คืนออเดอร์ขัดข้อง: ${e.message}`)
    }
  }

  // --- LOCAL STORAGE PERSISTENCE ---
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('pos_saved_cart');
      const parsedSavedCart = savedCart ? JSON.parse(savedCart) : [];
      if (parsedSavedCart.length > 0) setCart(parsedSavedCart);

      const savedOrderType = localStorage.getItem('pos_saved_order_type');
      const savedEditingOrderId = localStorage.getItem('pos_saved_editing_order_id');
      const shouldRestoreOrderType = parsedSavedCart.length > 0 || !!savedEditingOrderId;
      if (savedOrderType && shouldRestoreOrderType) setOrderType(savedOrderType as any);
      else setOrderType('dine_in');

      if (savedOrderType === 'delivery' && shouldRestoreOrderType) {
        const savedDeliveryPlatform = localStorage.getItem('pos_saved_delivery_platform');
        if (savedDeliveryPlatform) setDeliveryPlatform(savedDeliveryPlatform);

        const savedPlatformOrderId = localStorage.getItem('pos_saved_platform_order_id');
        if (savedPlatformOrderId) setPlatformOrderId(savedPlatformOrderId);
      }

      if (savedEditingOrderId) setEditingOrderId(savedEditingOrderId);
      
      const savedEditingOrderNumber = localStorage.getItem('pos_saved_editing_order_number');
      if (savedEditingOrderNumber) setEditingOrderNumber(savedEditingOrderNumber);

      const savedSelectedTable = localStorage.getItem('pos_saved_selected_table');
      if (savedSelectedTable) {
        // Table needs to be verified against the loaded tables to ensure it still exists, 
        // but since tables might not be loaded yet, we can set it and wait.
        setSelectedTable(JSON.parse(savedSelectedTable));
      }
    } catch (e) {
      console.error('Failed to load POS state from localStorage', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pos_saved_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!editingOrderId || heldCartFingerprint) return
    let cancelled = false
    const loadHeldFingerprint = async () => {
      const { data } = await supabase
        .from('pos_order_items')
        .select(`*, item:pos_menu_items!item_id(*)`)
        .eq('order_id', editingOrderId)
      if (cancelled || !data) return
      const existingItems = data.map((row: any) => ({
        id: row.item_id,
        item_id: row.item_id,
        quantity: row.quantity,
        selected_modifiers: row.selected_modifiers || [],
      }))
      setHeldCartFingerprint(buildCartFingerprint(existingItems))
    }
    loadHeldFingerprint()
    return () => {
      cancelled = true
    }
  }, [editingOrderId, heldCartFingerprint])

  useEffect(() => {
    localStorage.setItem('pos_saved_order_type', orderType);
  }, [orderType]);

  useEffect(() => {
    if (orderType === 'delivery' && deliveryPlatform) localStorage.setItem('pos_saved_delivery_platform', deliveryPlatform);
    else localStorage.removeItem('pos_saved_delivery_platform');
  }, [deliveryPlatform, orderType]);

  useEffect(() => {
    if (orderType === 'delivery' && platformOrderId) localStorage.setItem('pos_saved_platform_order_id', platformOrderId);
    else localStorage.removeItem('pos_saved_platform_order_id');
  }, [platformOrderId, orderType]);

  useEffect(() => {
    if (orderType !== 'delivery') {
      setDeliveryPlatform('')
      setPlatformOrderId('')
    }
  }, [orderType]);

  useEffect(() => {
    if (editingOrderId) localStorage.setItem('pos_saved_editing_order_id', editingOrderId);
    else localStorage.removeItem('pos_saved_editing_order_id');
  }, [editingOrderId]);

  useEffect(() => {
    if (editingOrderNumber) localStorage.setItem('pos_saved_editing_order_number', editingOrderNumber);
    else localStorage.removeItem('pos_saved_editing_order_number');
  }, [editingOrderNumber]);

  useEffect(() => {
    if (selectedTable) localStorage.setItem('pos_saved_selected_table', JSON.stringify(selectedTable));
    else localStorage.removeItem('pos_saved_selected_table');
  }, [selectedTable]);

  // --- INITIALIZATION ---
  useEffect(() => {
    initData()
  }, [profile?.id, activeShift?.id])

  // Re-fetch menu items & tables when branch becomes known (shopSettings loads async after profile)
  useEffect(() => {
    if (shopSettings?.branch_id !== undefined) {
      fetchItems()
      fetchTables()
      fetchPromotions()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopSettings?.branch_id])

  useEffect(() => {
    if (syncPulse && syncPulse > 0) {
      refreshPendingOrders()
      fetchTables()
    }
  }, [syncPulse])

  const initData = async () => {
    await Promise.all([fetchItems(), fetchTables(), refreshPendingOrders()])
  }

  // Sync totalPaid when editingOrderId changes
  useEffect(() => {
    if (!editingOrderId) {
      setTotalPaid(0)
      return
    }
    const fetchTotalPaid = async () => {
      const { data: payments } = await supabase
        .from('pos_order_payments')
        .select('amount')
        .eq('order_id', editingOrderId)
        .eq('status', 'paid')
      if (payments && payments.length > 0) {
        const sumPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
        setTotalPaid(sumPaid)
      } else {
        setTotalPaid(0)
      }
    }
    fetchTotalPaid()
  }, [editingOrderId])

  // --- Realtime Tables Listener ---
  useEffect(() => {
    const channel = supabase
      .channel('pos_terminal_tables_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_tables' }, () => {
        fetchTables()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_menu_items' }, () => {
        fetchItems()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_promotions' }, () => {
        fetchPromotions()
      })
      .subscribe()

    // Removing initial fetchPromotions here since it is now called when shopSettings loads

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])


  const fetchItems = async () => {
    try {
      const branchId = shopSettings?.branch_id
      let catQuery = supabase.from('pos_menu_categories').select('*').order('order_index')
      if (branchId) {
        catQuery = catQuery.eq('branch_id', branchId)
      } else {
        catQuery = catQuery.is('branch_id', null)
      }
      const { data: catData, error: catError } = await catQuery
      if (catError) throw catError
      if (catData) setCategories(catData)

      let itemQuery = supabase
        .from('pos_menu_items')
        .select(`*, platform_prices, category:pos_menu_categories(name), modifiers:pos_item_modifier_links(group_id)`)
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (branchId) {
        itemQuery = itemQuery.eq('branch_id', branchId)
      } else {
        itemQuery = itemQuery.is('branch_id', null)
      }
      const { data, error } = await itemQuery
      if (error) throw error
      if (data) setItems(sortMenuItemsByOrder(data as any[]))
    } catch (e) {
      console.error('XYL STUDIO POS Data Error:', e)
    }
  }

  const fetchPromotions = async () => {
    try {
      const branchId = shopSettings?.branch_id
      let query = supabase.from('pos_promotions').select('*').eq('is_active', true)
      if (branchId) {
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
      } else {
        query = query.is('branch_id', null)
      }
      const { data } = await query
      if (data) {
        // filter by date
        const now = new Date()
        const validPromos = data.filter(p => {
          if (p.start_date && new Date(p.start_date) > now) return false
          if (p.end_date && new Date(p.end_date) < now) return false
          return true
        })
        setActivePromotions(validPromos)
      }
    } catch (e) {
      console.error('Error fetching promotions:', e)
    }
  }

  // Auto-print delivery receipt
  useEffect(() => {
    if (paymentSuccessData && paymentSuccessData.paymentMethod === 'delivery') {
      const timer = setTimeout(() => {
        handlePrintReceipt()
        // Wait 2.5s before auto-closing to let user see the success screen
        setTimeout(() => setPaymentSuccessData(null), 2500)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [paymentSuccessData])

  const fetchTables = async () => {
    const branchId = shopSettings?.branch_id
    let query = supabase.from('pos_tables').select('*').order('table_number')
    if (branchId) {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
    } else {
      query = query.is('branch_id', null)
    }
    const { data } = await query
    if (data) setTables(data)
  }

  const handleClearIdleTable = async (table: POSTable) => {
    const shouldClear = confirm(`เคลียร์สถานะโต๊ะ ${table.table_number} ใช่ไหม?`)
    if (!shouldClear) return

    await supabase.from('pos_tables').update({ status: 'available' }).eq('id', table.id)

    if (selectedTable?.id === table.id) {
      setSelectedTable(null)
    }

    await fetchTables()
  }

  const addToCart = async (item: MenuItem, modifiers: any[] = [], qty: number = 1) => {
    if (!activeShift) {
      onOpenShiftModal()
      return
    }

    if (item.modifiers && item.modifiers.length > 0 && modifiers.length === 0) {
      const groupIds = item.modifiers.map((m: any) => m.group_id)
      const { data: groups } = await supabase
        .from('pos_menu_modifier_groups')
        .select('*, options:pos_menu_modifiers(*)')
        .in('id', groupIds)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (groups) {
        // Sort options within each group
        const sortedGroups = groups.map(g => ({
          ...g,
          options: (g.options || []).sort(
            (a: any, b: any) =>
              (a.sort_order || 0) - (b.sort_order || 0) ||
              (a.name || '').localeCompare(b.name || '')
          ),
        }))
        setModifierGroups(sortedGroups)
      }
      setModifierModalItem(item)
      setTempSelectedModifiers([])
      setTempQuantity(1)
      return
    }

    setIsCartBumping(true)
    setTimeout(() => setIsCartBumping(false), 400)

    setCart(prev => {
      const existingIdx = prev.findIndex(
        i => i.id === item.id && JSON.stringify(i.selected_modifiers) === JSON.stringify(modifiers)
      )
      if (existingIdx > -1) {
        const copy = [...prev]
        copy[existingIdx].quantity += qty
        return copy
      }
      return [...prev, { ...item, quantity: qty, selected_modifiers: modifiers }]
    })
    setModifierModalItem(null)
  }

  const updateQuantity = (id: string, change: number, modifiers: any[] = []) => {
    setCart(prev =>
      prev.map(i => {
        if (i.id === id && JSON.stringify(i.selected_modifiers) === JSON.stringify(modifiers)) {
          return { ...i, quantity: Math.max(1, i.quantity + change) }
        }
        return i
      })
    )
  }

  const removeFromCart = (id: string, modifiers: any[] = []) => {
    setCart(prev =>
      prev.filter(
        i => !(i.id === id && JSON.stringify(i.selected_modifiers) === JSON.stringify(modifiers))
      )
    )
  }

  const applyItemDiscount = () => {
    if (!itemDiscountModalItem) return

    setCart(prev =>
      prev.map(i => {
        if (i.id === itemDiscountModalItem.id && JSON.stringify(i.selected_modifiers) === JSON.stringify(itemDiscountModalItem.selected_modifiers)) {
          let calcDiscount = 0
          const val = Number(itemDiscountValue)
          if (!isNaN(val) && val > 0) {
            if (itemDiscountType === 'percent') {
              const basePrice = getEffectiveItemUnitPrice(i)
              const modsPrice = i.selected_modifiers?.reduce((a: number, m: any) => a + (m.price_adjustment || 0), 0) || 0
              calcDiscount = ((basePrice + modsPrice) * i.quantity) * (val / 100)
            } else {
              calcDiscount = val
            }
          }
          return { ...i, discount_amount: calcDiscount, discount_reason: calcDiscount > 0 ? itemDiscountReason : undefined }
        }
        return i
      })
    )
    setItemDiscountModalItem(null)
    setItemDiscountValue('')
  }

  const applyBillDiscount = () => {
    const val = Number(billDiscountInput)
    if (val > 0) {
      setDiscountType(billDiscountModalType)
      if (billDiscountModalType === 'percent') {
        setDiscountRate(val)
        setDiscountValue(0)
      } else {
        setDiscountValue(val)
        setDiscountRate(0)
      }
      setDiscountName(billDiscountReason)
    } else {
      setDiscountRate(0)
      setDiscountValue(0)
      setDiscountName('')
    }
    setShowBillDiscountModal(false)
  }

  const handleSendOrder = async () => {
    if (cart.length === 0) return;
    if (isHeldOrderBaselineLoading) {
      alert('กำลังตรวจสอบบิลที่พักไว้ กรุณารอสักครู่ครับ')
      return
    }
    if (editingOrderId && !hasUnsavedOrderChanges) {
      alert('บิลนี้พักไว้แล้วครับ ถ้าต้องการส่งออเดอร์เพิ่ม กรุณาเพิ่มรายการใหม่ก่อน')
      return
    }
	    
    if (orderType === 'dine_in' && !selectedTable) {
      alert('กรุณาเลือกโต๊ะก่อนส่งออเดอร์สำหรับ Dine-in ครับ')
      setShowTableModal(true)
      return
    }

    const targetPrinters = shopSettings?.printers || [];
    const kitchenPrinters = targetPrinters.filter((p: any) => p.type === 'kitchen' || p.type === 'both');

    const shopData = {
        name: shopSettings?.name || shopSettings?.shop_name || 'XYLEM LANDSCAPE',
        branch: shopSettings?.branch_name,
        kitchenFontSize: shopSettings?.kitchen_font_size || 'normal',
        kitchenShowType: shopSettings?.kitchen_show_type
    };

    setIsProcessing(true);
    try {
        const savedOrder = await handleHoldOrder({ suppressProcessingState: true, suppressAlert: true }) as any
        if (!savedOrder) return

        const printOrderData = {
            orderNumber: savedOrder.orderNumber,
            queueNumber: String(savedOrder.queueNumber || ''),
            date: new Date().toLocaleString(),
            orderSource: savedOrder.orderSource || 'pos',
            tableNumber: savedOrder.tableNumber || 'Unknown',
            deliveryPlatform: savedOrder.orderType === 'delivery' ? savedOrder.deliveryPlatform : '',
            referenceName: savedOrder.orderType === 'delivery' ? savedOrder.referenceName : '',
            comment: savedOrder.comment || savedOrder.notes || '',
            pickupTime: savedOrder.pickupTime || '',
            items: savedOrder.newItems.map((i: any) => ({
                name: i.name,
                quantity: i.quantity,
                modifiers: i.selected_modifiers?.map((m: any) => m.name) || [],
                selected_modifiers: i.selected_modifiers || [],
                category_id: i.category_id
            })),
            orderType: savedOrder.orderType
        };

        if (kitchenPrinters.length === 0) {
            alert('พักบิลแล้ว แต่ไม่พบการตั้งค่าเครื่องปริ้นเข้าครัว (Kitchen Printer) ในระบบครับ')
            return
        }

        // Execute printing in background to avoid blocking the UI
        void (async () => {
            try {
                if (kitchenPrinters.length > 0) {
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
                              await printKitchenTicket(printer.ip, routedOrderData, shopData, printer.model, printer.encoding);
                          }
                        }
                    }
                }
            } catch (err) {
                console.error('Background print error:', err);
            }
        })();
    } catch (error) {
        console.error('Error sending order to kitchen:', error);
        alert('เกิดข้อผิดพลาดในการส่งบิลเข้าครัว: ' + (error as any).message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleHoldOrder = async (options?: { suppressProcessingState?: boolean; suppressAlert?: boolean }) => {
    if (cart.length === 0) return
    if (!activeShift) {
      alert('กรุณาเปิดกะ (Shift) ก่อนทำรายการครับ')
      onShiftModalOpen()
      return
    }
    if (!ensureDeliveryDetailsReady()) return

    if (orderType === 'dine_in' && !selectedTable) {
      alert('กรุณาเลือกโต๊ะก่อนพักบิลสำหรับ Dine-in ครับ')
      setShowTableModal(true)
      return
    }

    if (editingOrderId && !hasUnsavedOrderChanges) {
      throw new Error('บิลนี้พักไว้แล้ว กรุณาเพิ่มรายการใหม่ก่อนส่งออเดอร์เพิ่ม')
    }

	    if (!options?.suppressProcessingState) setIsProcessing(true)
	    try {
	      let finalOrderId = editingOrderId
	      let finalOrderNumber = editingOrderNumber || ''
	      let finalQueueNumber = getQueueNumberForOrder(editingOrderId)
	      let existingComparableItems: any[] = []

	      if (editingOrderId) {
	        const { data: existingRows, error: existingRowsError } = await supabase
	          .from('pos_order_items')
	          .select(`*, item:pos_menu_items!item_id(*)`)
	          .eq('order_id', editingOrderId)
	        if (existingRowsError) throw existingRowsError
	        existingComparableItems = (existingRows || []).map((row: any) => ({
	          id: row.item_id,
	          item_id: row.item_id,
	          name: row.item?.name || 'Unknown Item',
	          quantity: row.quantity,
	          selected_modifiers: row.selected_modifiers || [],
	          category_id: row.item?.category_id || 'uncategorized',
	        }))

	        const newItems = computeNewCartItems(cart, existingComparableItems)
	        if (newItems.length === 0) {
	          throw new Error('บิลนี้พักไว้แล้ว กรุณาเพิ่มรายการใหม่ก่อนส่งออเดอร์เพิ่ม')
	        }

	        const identity = await requestOrderIdentity(editingOrderId)
	        finalOrderNumber = identity.orderNumber
	        finalQueueNumber = identity.queueNumber
	        const orderUpdatePayload: any = {
	          total_amount: rawCartSubTotal,
          net_total: cartTotal,
          tax_amount: vatAmount,
          service_charge_amount: serviceChargeAmount,
          discount_amount: discountTotalValue + itemDiscountTotal,
          customer_id: selectedCustomer?.id,
          order_type: orderType,
          table_id: selectedTable?.id,
          table_number: selectedTable?.table_number,
	          queue_number: identity.queueNumber,
          delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
          reference_name: orderType === 'delivery' && platformOrderId ? platformOrderId.trim() : null,
          updated_at: new Date().toISOString(),
        }
        const { error: updateError } = await supabase
          .from('pos_orders')
          .update(orderUpdatePayload)
          .eq('id', editingOrderId)
        if (updateError) {
          if (isMissingQueueColumnError(updateError)) {
            const fallbackUpdatePayload = { ...orderUpdatePayload }
            delete fallbackUpdatePayload.queue_number
            const { error: fallbackUpdateError } = await supabase
              .from('pos_orders')
              .update(fallbackUpdatePayload)
              .eq('id', editingOrderId)
            if (fallbackUpdateError) throw fallbackUpdateError
          } else {
            throw updateError
          }
        }
        await supabase.from('pos_order_items').delete().eq('order_id', editingOrderId)
		      } else {
		        const identity = await requestOrderIdentity()
		        finalOrderNumber = identity.orderNumber
		        finalQueueNumber = identity.queueNumber
		        const orderInsertPayload: any = {
		          order_number: identity.orderNumber,
          staff_id: profile?.id,
          shift_id: activeShift?.id,
          branch_id: shopSettings?.branch_id || activeShift?.branch_id || null,
          status: 'pending',
          total_amount: rawCartSubTotal,
          net_total: cartTotal,
          tax_amount: vatAmount,
          service_charge_amount: serviceChargeAmount,
          discount_amount: discountTotalValue + itemDiscountTotal,
          customer_id: selectedCustomer?.id,
          order_type: orderType,
          table_id: selectedTable?.id,
          table_number: selectedTable?.table_number,
	          queue_number: identity.queueNumber,
          order_source: 'pos',
          delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
          delivery_gp_amount: 0,
          reference_name: orderType === 'delivery' && platformOrderId ? platformOrderId.trim() : null,
        }

        const { data: newOrder, error: insertError } = await supabase
          .from('pos_orders')
          .insert(orderInsertPayload)
          .select()
          .single()

        if (insertError) {
          if (isMissingQueueColumnError(insertError)) {
            const fallbackInsertPayload = { ...orderInsertPayload }
            delete fallbackInsertPayload.queue_number
            const { data: fallbackNewOrder, error: fallbackInsertError } = await supabase
              .from('pos_orders')
              .insert(fallbackInsertPayload)
              .select()
              .single()
            if (fallbackInsertError) throw fallbackInsertError
            finalOrderId = fallbackNewOrder.id
          } else {
            throw insertError
          }
	        } else {
	          finalOrderId = newOrder.id
	        }
		      }

	      const newItemsForPrint = editingOrderId
	        ? computeNewCartItems(cart, existingComparableItems)
	        : [...cart]

	      const orderItems = cart.map(item => {
          const modsPrice = item.selected_modifiers?.reduce((a: number, m: any) => a + (m.price_adjustment || 0), 0) || 0;
          return {
	          order_id: finalOrderId,
            item_id: item.id,
            quantity: item.quantity,
            unit_price: getEffectiveItemUnitPrice(item),
            cost_price: item.cost_price || 0,
            subtotal: ((getEffectiveItemUnitPrice(item) + modsPrice) * item.quantity) - (item.discount_amount || 0),
            selected_modifiers: item.selected_modifiers,
            discount_amount: item.discount_amount || 0,
            discount_reason: item.discount_reason || null,
          }
        })

	      const { error: itemsError } = await supabase.from('pos_order_items').insert(orderItems)
	      if (itemsError) throw itemsError

	      setHeldCartFingerprint(buildCartFingerprint(cart))
	      const savedPayload = {
	        orderId: finalOrderId,
	        orderNumber: finalOrderNumber,
	        queueNumber: finalQueueNumber,
	        tableNumber: selectedTable?.table_number,
	        orderType,
	        deliveryPlatform: orderType === 'delivery' ? deliveryPlatform : '',
	        referenceName: orderType === 'delivery' ? platformOrderId.trim() : '',
	        newItems: newItemsForPrint,
	      }

	      resetOrderComposer()
	      refreshPendingOrders()
	      return savedPayload
	    } catch (e) {
	      console.error('Hold Error:', e)
	      if (!options?.suppressAlert) alert('ไม่สามารถพักบิลได้: ' + (e as any).message)
	      throw e
	    } finally {
	      if (!options?.suppressProcessingState) setIsProcessing(false)
	    }
	  }

  const handleProcessPayment = async (method: string, amount?: number) => {
    if (cart.length === 0 || isProcessing) return
    if (!activeShift) {
      alert('กรุณาเปิดกะ (Shift) ก่อนชำระเงินครับ')
      onShiftModalOpen()
      return
    }
    if (!ensureDeliveryDetailsReady()) return

    setIsProcessing(true)
	    try {
	      playAppSound('pay');
	      let finalOrderId = editingOrderId
	      let finalOrderNumber = editingOrderNumber || ''
	      let finalQueueNumber = getQueueNumberForOrder(editingOrderId)
	      const amountToPay = amount !== undefined ? amount : remainingTotal
      const newTotalPaid = totalPaid + amountToPay
      const newStatus = newTotalPaid >= cartTotal ? 'completed' : 'payment_pending'
      
      // Fetch fresh GP settings from DB to ensure we always have latest values
      let gpPercent = 0;
      if (orderType === 'delivery' && deliveryPlatform) {
        // First try from loaded shopSettings
        const gpFromSettings = shopSettings?.delivery_gp?.[deliveryPlatform]
          ?? shopSettings?.opening_hours?.delivery_gp?.[deliveryPlatform];
        if (gpFromSettings !== undefined && gpFromSettings !== null) {
          gpPercent = Number(gpFromSettings) || 0;
        } else {
          // Fallback: fetch fresh from DB
          try {
            const settingsId = shopSettings?.id;
            if (settingsId) {
              const { data: freshSettings } = await supabase
                .from('pos_shop_settings')
                .select('delivery_gp, opening_hours')
                .eq('id', settingsId)
                .maybeSingle();
              gpPercent = Number(
                freshSettings?.delivery_gp?.[deliveryPlatform]
                  ?? freshSettings?.opening_hours?.delivery_gp?.[deliveryPlatform]
              ) || 0;
            } else if (shopSettings?.branch_id) {
              const { data: freshSettings } = await supabase
                .from('pos_shop_settings')
                .select('delivery_gp, opening_hours')
                .eq('branch_id', shopSettings.branch_id)
                .maybeSingle();
              gpPercent = Number(
                freshSettings?.delivery_gp?.[deliveryPlatform]
                  ?? freshSettings?.opening_hours?.delivery_gp?.[deliveryPlatform]
              ) || 0;
            }
          } catch (e) {
            console.warn('Could not fetch GP settings:', e);
          }
        }
        console.log(`[GP] platform=${deliveryPlatform}, gpPercent=${gpPercent}%, cartTotal=${cartTotal}`);
      }
      const deliveryGpAmount = (cartTotal * gpPercent) / 100;
	      const identity = await requestOrderIdentity(editingOrderId)
	      finalOrderNumber = identity.orderNumber
	      finalQueueNumber = identity.queueNumber

	      if (editingOrderId) {
	        const orderUpdatePayload: any = {
          status: newStatus,
          total_amount: rawCartSubTotal,
          net_total: cartTotal,
          tax_amount: vatAmount,
          service_charge_amount: serviceChargeAmount,
          discount_amount: discountTotalValue + itemDiscountTotal,
          customer_id: selectedCustomer?.id,
          order_type: orderType,
          table_id: selectedTable?.id,
          table_number: selectedTable?.table_number,
	          queue_number: identity.queueNumber,
          payment_method: method,
          paid_at: new Date().toISOString(),
          delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
          delivery_gp_amount: deliveryGpAmount,
          reference_name: orderType === 'delivery' && platformOrderId ? platformOrderId.trim() : null,
        }
        const { error: updateError } = await supabase
          .from('pos_orders')
          .update(orderUpdatePayload)
          .eq('id', editingOrderId)

        if (updateError) {
          if (isMissingQueueColumnError(updateError)) {
            const fallbackUpdatePayload = { ...orderUpdatePayload }
            delete fallbackUpdatePayload.queue_number
            const { error: fallbackUpdateError } = await supabase
              .from('pos_orders')
              .update(fallbackUpdatePayload)
              .eq('id', editingOrderId)
            if (fallbackUpdateError) throw fallbackUpdateError
          } else {
            throw updateError
          }
        }
	        await supabase.from('pos_order_items').delete().eq('order_id', editingOrderId)
	      } else {
	        finalOrderNumber = identity.orderNumber
	        finalQueueNumber = identity.queueNumber
	        const orderInsertPayload: any = {
	          order_number: identity.orderNumber,
          staff_id: profile?.id,
          shift_id: activeShift?.id,
          branch_id: activeShift?.branch_id || shopSettings?.branch_id || null,
          status: newStatus,
          total_amount: rawCartSubTotal,
          net_total: cartTotal,
          tax_amount: vatAmount,
          service_charge_amount: serviceChargeAmount,
          discount_amount: discountTotalValue + itemDiscountTotal,
          customer_id: selectedCustomer?.id,
          order_type: orderType,
          table_id: selectedTable?.id,
          table_number: selectedTable?.table_number,
	          queue_number: identity.queueNumber,
          payment_method: method,
          order_source: 'pos',
          paid_at: new Date().toISOString(),
          delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
          delivery_gp_amount: deliveryGpAmount,
          reference_name: orderType === 'delivery' && platformOrderId ? platformOrderId.trim() : null,
        }
        const { data: order, error: orderError } = await supabase
          .from('pos_orders')
          .insert(orderInsertPayload)
          .select()
          .single()

        if (orderError) {
          if (isMissingQueueColumnError(orderError)) {
            const fallbackInsertPayload = { ...orderInsertPayload }
            delete fallbackInsertPayload.queue_number
            const { data: fallbackOrder, error: fallbackOrderError } = await supabase
              .from('pos_orders')
              .insert(fallbackInsertPayload)
              .select()
              .single()
            if (fallbackOrderError) throw fallbackOrderError
            finalOrderId = fallbackOrder.id
          } else {
            throw orderError
          }
        } else {
          finalOrderId = order.id
        }
      }

      const orderItems = cart.map(item => {
        const modsPrice = item.selected_modifiers?.reduce((a: number, m: any) => a + (m.price_adjustment || 0), 0) || 0;
        return {
          order_id: finalOrderId,
          item_id: item.id,
          quantity: item.quantity,
          unit_price: getEffectiveItemUnitPrice(item),
          cost_price: item.cost_price || 0,
          subtotal: ((getEffectiveItemUnitPrice(item) + modsPrice) * item.quantity) - (item.discount_amount || 0),
          selected_modifiers: item.selected_modifiers,
          discount_amount: item.discount_amount || 0,
          discount_reason: item.discount_reason || null,
        }
      })
      const { error: itemsError } = await supabase.from('pos_order_items').insert(orderItems)
      if (itemsError) throw itemsError

      // Log inventory movements for recipes
      try {
        const movementsToInsert: any[] = []
        for (const item of cart) {
          // 1. Menu Item Recipes
          if (item.recipe_data && Array.isArray(item.recipe_data)) {
            for (const ing of item.recipe_data) {
              if (ing.order_types && Array.isArray(ing.order_types) && !ing.order_types.includes(orderType)) {
                continue;
              }
              const usage = Number(ing.quantity || 0) * Number(ing.factor || 1) * Number(item.quantity)
              if (ing.ingredient_id && usage > 0) {
                const { data: invItem } = await supabase
                  .from('inventory_items')
                  .select('stock_quantity')
                  .eq('id', ing.ingredient_id)
                  .maybeSingle()
                
                movementsToInsert.push({
                  item_id: ing.ingredient_id,
                  change_amount: -usage,
                  new_quantity: invItem ? Number(invItem.stock_quantity) : 0,
                  reason: 'sale',
                  reference_id: finalOrderId
                })
              }
            }
          }

          // 2. Modifier Recipes
          if (item.selected_modifiers && Array.isArray(item.selected_modifiers)) {
            for (const mod of item.selected_modifiers) {
              if (mod.recipe_data && Array.isArray(mod.recipe_data)) {
                for (const ing of mod.recipe_data) {
                  if (ing.order_types && Array.isArray(ing.order_types) && !ing.order_types.includes(orderType)) {
                    continue;
                  }
                  const usage = Number(ing.quantity || 0) * Number(ing.factor || 1) * Number(item.quantity)
                  if (ing.ingredient_id && usage > 0) {
                    const { data: invItem } = await supabase
                      .from('inventory_items')
                      .select('stock_quantity')
                      .eq('id', ing.ingredient_id)
                      .maybeSingle()
                      
                    movementsToInsert.push({
                      item_id: ing.ingredient_id,
                      change_amount: -usage,
                      new_quantity: invItem ? Number(invItem.stock_quantity) : 0,
                      reason: 'sale',
                      reference_id: finalOrderId
                    })
                  }
                }
              }
            }
          }
        }

        if (movementsToInsert.length > 0) {
          await supabase.from('inventory_movements').insert(movementsToInsert)
        }
      } catch (movErr) {
        console.error('Failed to log inventory movements:', movErr)
      }

      await supabase.from('pos_order_payments').insert({
        order_id: finalOrderId,
        payment_method: method,
        amount: amountToPay,
      })

      if (selectedCustomer?.id) {
        const earnRate = shopSettings?.loyalty_earn_rate || 100
        const pointsToEarn = Math.floor(cartTotal / earnRate)
        if (pointsToEarn > 0) {
          try {
            await supabase.rpc('increment_member_points', {
              user_id: selectedCustomer.id,
              points_to_add: pointsToEarn,
            })
            const historyObj: any = {
              member_id: selectedCustomer.id,
              order_id: finalOrderId,
              points: pointsToEarn,
              type: 'earn',
            }

            const { error: histErr } = await supabase.from('pos_points_history').insert({
              ...historyObj,
              description: `Earned from POS Order #${editingOrderNumber || (finalOrderId ? (finalOrderId as string).slice(0, 8) : 'NEW')}`,
            })

            if (
              histErr &&
              histErr.message.includes(
                'column "description" of relation "pos_points_history" does not exist'
              )
            ) {
              await supabase.from('pos_points_history').insert(historyObj)
            }
          } catch (pErr) {
            console.error('Point Award Error:', pErr)
          }
        }
      }

      if (newStatus === 'completed' && selectedTable?.id) {
        try {
          await supabase.from('pos_tables').update({ status: 'available' }).eq('id', selectedTable.id)
          fetchTables()
        } catch (tableErr) {
          console.error('Failed to update table status:', tableErr)
        }
      }

      // --- Hardware Printing Logic ---
      const printers = shopSettings?.printers || []
	      if (printers.length > 0) {
	        try {
	          const orderNumToPrint = finalOrderNumber || (finalOrderId ? (finalOrderId as string).slice(0, 8) : 'NEW')
	          const queueNumToPrint = finalQueueNumber
          
          // Original Full Item List
          const allItems = cart.map(item => ({
              id: item.id, // keep id to lookup category
              category_id: item.category_id,
              name: item.name,
              quantity: item.quantity,
              subtotal: getEffectiveItemUnitPrice(item) * item.quantity,
              modifiers: item.selected_modifiers?.map((m: any) => m.name) || [],
              selected_modifiers: item.selected_modifiers || []
          }))

          const printOrderData = {
            orderNumber: orderNumToPrint,
            queueNumber: String(queueNumToPrint),
            date: new Date().toLocaleString(),
            orderSource: 'pos',
            tableNumber: selectedTable?.table_number,
            orderType: orderType,
            staffName: profile?.full_name || 'Staff',
            customerName: selectedCustomer?.full_name,
            deliveryPlatform: orderType === 'delivery' ? deliveryPlatform : '',
            referenceName: orderType === 'delivery' ? platformOrderId.trim() : '',
            comment: cart.some((item: any) => item.note) ? cart.map((item: any) => item.note).filter(Boolean).join('\n') : '',
            pickupTime: '',
            subtotal: cartSubTotal,
            discount: discountTotalValue,
            serviceCharge: serviceChargeAmount,
            tax: vatAmount,
            netTotal: cartTotal,
            paymentMethod: method,
            items: allItems
          }
          
          const printShopData = {
            name: shopSettings?.name || 'XYL STUDIO',
            branch: shopSettings?.branch_name,
            taxId: shopSettings?.tax_id,
            address: shopSettings?.address,
            phone: shopSettings?.phone,
            receiptHeader: shopSettings?.receipt_header,
            receiptFooter: shopSettings?.receipt_footer,
            receiptShowLogo: shopSettings?.receipt_show_logo,
            receiptFontSize: shopSettings?.receipt_font_size,
            kitchenFontSize: shopSettings?.kitchen_font_size,
            kitchenShowType: shopSettings?.kitchen_show_type,
            receiptPaymentQrImage: shopSettings?.opening_hours?.receipt_payment_qr_image || shopSettings?.receipt_payment_qr_image
          }

          // Only open drawer for cash payments - NO auto printing on payment confirm
          if (method === 'cash') {
            const receiptPrinters = printers.filter((p: any) => p.type === 'receipt' || p.type === 'both')
            for (const rp of receiptPrinters) {
               if (!rp.ip) continue;
               await printOpenDrawer(rp.ip)
            }
            // Fallback: if no printers in settings, try localStorage IP
            if (receiptPrinters.length === 0) {
              const fallbackIp = typeof window !== 'undefined' ? localStorage.getItem('xylem_printer_ip') : null
              if (fallbackIp) await printOpenDrawer(fallbackIp)
            }
          }

        } catch (printErr) {
          console.error('Printing failed during checkout:', printErr)
        }
      }

	      const receivedNum = method === 'cash' ? (cashReceived ? Number(cashReceived) : amountToPay) : amountToPay;
	      const changeNum = receivedNum - amountToPay;
	      const orderNumToPrint = finalOrderNumber || (finalOrderId ? (finalOrderId as string).slice(0, 8) : 'NEW');
	      const queueNumToPrint = finalQueueNumber

      setPaymentSuccessData({
        received: receivedNum,
        change: changeNum > 0 ? changeNum : 0,
        orderId: finalOrderId || 'NEW',
        orderNumber: orderNumToPrint,
        queueNumber: String(queueNumToPrint),
        deliveryPlatform: orderType === 'delivery' ? deliveryPlatform : '',
        referenceName: orderType === 'delivery' ? platformOrderId.trim() : '',
        tableNumber: selectedTable?.table_number,
        customerName: selectedCustomer?.full_name || selectedCustomer?.name,
        orderType,
            items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            subtotal: getEffectiveItemUnitPrice(item) * item.quantity,
            modifiers: item.selected_modifiers?.map((m: any) => m.name) || [],
            selected_modifiers: item.selected_modifiers || []
        })),
        subtotal: rawCartSubTotal,
        discount: discountTotalValue + itemDiscountTotal,
        tax: vatAmount,
        serviceCharge: serviceChargeAmount,
        total: cartTotal,
        paymentMethod: method,
        timestamp: new Date().toISOString()
      });

      resetOrderComposer()
      setShowPaymentModal(false)
      setShowCashPaymentModal(false)
      setShowSplitPaymentModal(false)
      if (activeShift?.id) {
        refreshPendingOrders()
        fetchShiftStats(activeShift.id)
      }
    } catch (e: any) {
      console.error('Payment Error:', e)
      alert(`การชำระเงินขัดข้อง: ${e.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = getMenuSearchText(item).includes(searchTerm.toLowerCase())
    const matchesCategory =
      !activeCategoryId || activeCategoryId === 'all' ? true : item.category_id === activeCategoryId
    return matchesSearch && matchesCategory
  })

  // --- RENDER ---
  return (
    <div className="relative flex flex-1 flex-col lg:flex-row bg-white font-bold overflow-hidden h-full min-h-0">
      {/* LEFT CONTENT: Categories & Grid */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white relative">
      {/* 2. ORDER TYPE & CATEGORIES */}
      {!(
        editingOrderId && pendingOrders.find(o => o.id === editingOrderId)?.order_source === 'liff'
      ) && (
        <div className="flex flex-shrink-0 flex-col bg-white font-bold shadow-sm z-10 relative">
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#FDFDFB] px-4 sm:px-6 xl:px-8 py-3 sm:py-4 border-b border-[#F0F0E8]">
            <div className="flex items-center gap-2 w-full sm:w-auto font-bold shrink-0">
              <button
                onClick={() => {
                   fetchTables()
                   refreshPendingOrders()
                   setShowTableModal(true)
                }}
                className={`flex flex-1 sm:flex-none h-10 sm:h-11 items-center justify-center sm:justify-start gap-2 sm:gap-3 border px-4 sm:px-6 transition-all rounded-xl shadow-sm ${selectedTable || orderType === 'takeaway' ? 'border-[#1A1A18] bg-[#1A1A18] text-white shadow-md' : 'border-[#E5E5DF] bg-white text-gray-500 hover:border-black hover:text-black'}`}
              >
                <Users size={16} />
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest truncate max-w-[120px] sm:max-w-none">
                  {orderType === 'takeaway'
                    ? 'Takeaway'
                    : selectedTable
                      ? `T-${selectedTable.table_number}`
                      : 'เลือกโต๊ะ'}
                </span>
                <ChevronDown size={14} className="ml-1 sm:ml-2 opacity-50" />
              </button>
            </div>

            <div className="relative group w-full flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1A1A18] transition-colors"
              />
              <input
                type="text"
                placeholder={locale === 'en' ? 'ค้นหาเมนู...' : locale === 'zh' ? 'ค้นหาเมนู...' : 'ค้นหาเมนู...'}
                className="w-full bg-white border border-[#E5E5DF] h-10 sm:h-11 rounded-xl pl-12 pr-4 text-[13px] font-bold text-black outline-none transition-all placeholder:text-gray-300 focus:border-black focus:ring-2 focus:ring-black/5 shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="hidden sm:flex items-center gap-2 font-bold shrink-0">
              <div className="flex items-center border border-[#E5E5DF] bg-white p-1 rounded-xl shadow-sm font-bold">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#1A1A18] text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-black'}`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#1A1A18] text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-black'}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="relative flex items-center h-[60px] sm:h-[70px] border-b border-[#F0F0E8] bg-[#FDFDFB] font-bold">
            <div
              ref={categoryScrollRef}
              className="no-scrollbar flex flex-1 items-center gap-2 sm:gap-3 overflow-x-auto px-4 sm:px-6 xl:px-8 font-bold"
            >
              <button
                onClick={() => setActiveCategoryId(null)}
                className={`flex-shrink-0 h-9 sm:h-10 px-5 sm:px-6 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all rounded-full shadow-sm border ${!activeCategoryId || activeCategoryId === 'all' ? 'bg-[#1A1A18] text-white border-black shadow-md' : 'bg-white text-gray-500 border-[#E5E5DF] hover:border-gray-300 hover:text-black hover:bg-gray-50'}`}
              >
                {locale === 'en' ? '                 ทั้งหมด               ' : locale === 'zh' ? '                 ทั้งหมด               ' : '                 ทั้งหมด               '}</button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`flex-shrink-0 h-9 sm:h-10 px-5 sm:px-6 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all rounded-full shadow-sm border ${activeCategoryId === cat.id ? 'bg-[#1A1A18] text-white border-black shadow-md' : 'bg-white text-gray-500 border-[#E5E5DF] hover:border-gray-300 hover:text-black hover:bg-gray-50'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN TERMINAL GRID */}
      <main className="custom-scrollbar flex-1 overflow-y-auto bg-[#FDFDFB] p-4 sm:p-6 xl:p-8 font-bold min-h-0">
        <div className="mx-auto font-bold min-h-full pb-32">
          {filteredItems.length > 0 ? (
            <div
              className={`grid gap-3 sm:gap-4 xl:gap-6 font-bold ${viewMode === 'list' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'}`}
            >
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={(e) => item.in_stock !== false && handleProductClick(e, item)}
                  disabled={item.in_stock === false}
                  className={`relative group flex border border-[#E5E5DF] bg-white rounded-2xl p-3 sm:p-4 text-left font-bold transition-all duration-300 ${item.in_stock === false ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:border-black/30 hover:shadow-xl hover:-translate-y-1'} ${viewMode === 'list' ? 'flex-row gap-4 items-center' : 'flex-col'}`}
                >
                  {item.in_stock === false && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-[2px] rounded-2xl pointer-events-none">
                       <div className="flex flex-col items-center gap-2">
                         <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">สินค้าหมด</span>
                         <span className="bg-white/90 text-red-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.18em] shadow-sm">Unavailable</span>
                       </div>
                    </div>
                  )}
                  {(() => {
                    const primaryName = getPrimaryMenuName(item)
                    const secondaryName = getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en')

                    return (
                      <>
                        <div
                          className={`relative overflow-hidden rounded-xl bg-gray-50 font-bold transition-all duration-500 shrink-0 ${viewMode === 'list' ? 'h-20 w-20' : 'mb-3 sm:mb-4 w-full aspect-[1/1] sm:aspect-[4/5]'}`}
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-300">
                              <ImageIcon size={32} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
                        </div>
                        <div className={`flex-1 flex flex-col font-bold ${viewMode === 'list' ? 'justify-center' : 'w-full'}`}>
                          <div className={`${viewMode === 'list' ? 'min-h-[3.25rem]' : 'min-h-[4rem] sm:min-h-[4.5rem]'}`}>
                            <h4 className="line-clamp-2 text-[13px] sm:text-[14px] font-black uppercase leading-snug tracking-tight text-[#1A1A18]">
                              {primaryName}
                            </h4>
                            {secondaryName && (
                              <p className="mt-1 line-clamp-2 text-[10px] sm:text-[11px] font-semibold leading-snug text-[#7B7A74]">
                                {secondaryName}
                              </p>
                            )}
                          </div>
                          <div className={`flex items-end justify-between border-t border-gray-100 ${viewMode === 'list' ? 'pt-2 mt-2' : 'pt-3 mt-auto'}`}>
                            <span className="text-[14px] sm:text-[15px] font-black text-emerald-600">
                              {locale === 'en' ? '                         ฿ ' : locale === 'zh' ? '                         ฿ ' : '                         ฿ '}{getEffectiveItemUnitPrice(item).toLocaleString()}
                            </span>
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-50 text-gray-400 transition-colors group-hover:bg-black group-hover:text-white">
                              <Plus size={16} />
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50 py-20">
              <Search size={48} className="mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">{locale === 'en' ? 'ไม่พบรายการที่ค้นหา' : locale === 'zh' ? 'ไม่พบรายการที่ค้นหา' : 'ไม่พบรายการที่ค้นหา'}</p>
            </div>
          )}
        </div>
      </main>
      </div>

      {/* RIGHT CONTENT: CART DRAWER / SPLIT VIEW */}
      <div id="desktop-cart-panel" className={`fixed inset-0 z-[1100] lg:relative lg:inset-auto lg:z-auto flex justify-end font-bold transition-all duration-300 ${isCartExpanded ? 'visible' : 'invisible lg:visible'} lg:w-[380px] xl:w-[450px] lg:flex-shrink-0 lg:border-l lg:border-[#F0F0E8]`}>
        <div
          className={`absolute inset-0 bg-[#3a3a38]/40 backdrop-blur-md lg:hidden transition-opacity duration-300 ${isCartExpanded ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsCartExpanded(false)}
        ></div>
        <div className={`relative flex h-full w-full flex-col bg-white font-bold shadow-2xl lg:shadow-none transition-transform duration-500 sm:max-w-xl lg:max-w-none ${isCartExpanded ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
          <header className="flex flex-col gap-6 border-b border-gray-50 bg-[#FDFDFB] p-6 sm:p-8 xl:p-10">
            <div className="flex w-full items-center justify-between">
              <motion.h3 
                animate={isCartBumping ? { x: [-3, 3, -3, 3, 0], scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-4 text-xl sm:text-2xl font-black uppercase tracking-tighter text-black"
              >
                <span>{locale === 'en' ? 'Order list' : locale === 'zh' ? '订单清单' : 'รายการสั่งซื้อ'}</span>
                {editingOrderNumber && (
                  <span className="bg-[#1A1A18] px-3 py-1 font-mono text-[10px] text-white">
                    {editingOrderNumber}
                  </span>
                )}
              </motion.h3>
              <button
                onClick={() => setIsCartExpanded(false)}
                className="p-2 transition-all hover:bg-gray-100 lg:hidden"
              >
                <X size={24} />
              </button>
            </div>

              <div className="flex w-full bg-gray-100 p-1 font-bold">
                <button
                  onClick={() => {
                    if (editingOrderId) {
                        setPendingOrderTypeSwitch('dine_in');
                    } else {
                        setOrderType('dine_in');
                        if (!selectedTable) {
                            fetchTables()
                            setShowTableModal(true)
                        }
                    }
                  }}
                  className={`flex h-12 flex-1 items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${orderType === 'dine_in' ? 'bg-[#1A1A18] text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}
                >
                  <Users size={14} /> {locale === 'en' ? ' กินที่ร้าน / Dine-in                   ' : locale === 'zh' ? ' กินที่ร้าน / Dine-in                   ' : ' กินที่ร้าน / Dine-in                   '}{selectedTable && (
                    <span className="ml-2 bg-emerald-500 px-1.5 py-0.5 text-[8px] text-white">
                      T-{selectedTable.table_number}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (editingOrderId) {
                        setPendingOrderTypeSwitch('takeaway');
                    } else {
                        setSelectedTable(null);
                        setOrderType('takeaway');
                    }
                  }}
                  className={`flex h-12 flex-1 items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${orderType === 'takeaway' ? 'bg-[#1A1A18] text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}
                >
                  <ShoppingBag size={14} /> {locale === 'en' ? ' กลับบ้าน / Takeaway ' : locale === 'zh' ? ' 外带 / Takeaway ' : ' กลับบ้าน / Takeaway '}</button>
                <button
                  onClick={() => {
                    if (editingOrderId) {
                        setPendingOrderTypeSwitch('delivery');
                    } else {
                        setOrderType('delivery');
                        setSelectedTable(null);
                        openDeliveryPlatformModal();
                    }
                  }}
                  className={`flex h-12 flex-1 items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${orderType === 'delivery' ? 'bg-[#1A1A18] text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}
                >
                  <Truck size={14} /> {locale === 'en' ? ' เดลิเวอรี่ / Delivery ' : locale === 'zh' ? ' 外卖 / Delivery ' : ' เดลิเวอรี่ / Delivery '}
                </button>
              </div>
              {orderType === 'delivery' && (
                  <button
                    type="button"
                    onClick={() => openDeliveryPlatformModal()}
                    className="mt-2 flex w-full items-center justify-between rounded-2xl border border-orange-200 bg-orange-50/70 px-4 py-3 text-left transition-all hover:border-orange-400 hover:bg-orange-50"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">
                        ค่ายเดลิเวอรี่
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-[#1A1A18]">
                          {formatDeliveryPlatformLabel(deliveryPlatform)}
                        </span>
                        <span className="text-xs font-bold text-gray-500">
                          {platformOrderId ? `เลขบิล ${platformOrderId}` : 'แตะเพื่อเลือกค่ายและกรอกเลขบิล'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-orange-500" />
                  </button>
              )}
            </header>

            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-white p-6 transition-all sm:p-10">
              {cart.length > 0 ? (
                cart.map((item, idx) => (
                  <div
                    key={idx}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setItemDiscountModalItem(item);
                    }}
                    className="animate-in slide-in-from-right group flex gap-6 duration-300"
                  >
                    <div className="relative h-24 w-20 overflow-hidden border border-gray-100 bg-gray-50 transition-all group-hover:shadow-lg">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-200">
                          <ImageIcon size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between py-1">
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="mb-1 text-[13px] font-black uppercase leading-tight text-black">
                              {getPrimaryMenuName(item)}
                            </h4>
                            {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en') && (
                              <p className="mb-1 text-[10px] font-semibold leading-snug text-gray-500">
                                {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en')}
                              </p>
                            )}
                            {item.customer_name && (
                              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">
                                👤 {item.customer_name}
                              </div>
                            )}
                           </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setItemDiscountModalItem(item)}
                              className="p-1 text-emerald-400 transition-all hover:text-emerald-600 active:scale-95"
                              title="เพิ่มส่วนลด / โปรโมชั่น"
                            >
                              <Tag size={16} />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.id, item.selected_modifiers)}
                              className="p-1 text-red-400 transition-all hover:text-red-600 active:scale-95"
                              title={locale === 'en' ? 'ลบรายการ' : locale === 'zh' ? 'ลบรายการ' : 'ลบรายการ'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400">
                            {locale === 'en' ? '                             ฿ ' : locale === 'zh' ? '                             ฿ ' : '                             ฿ '}{getEffectiveItemUnitPrice(item).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center overflow-hidden border border-gray-100 bg-gray-50 font-bold">
                          <button
                            onClick={() => updateQuantity(item.id, -1, item.selected_modifiers)}
                            className="flex h-8 w-8 items-center justify-center border-r transition-all hover:bg-black hover:text-white"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-10 text-center text-xs font-black">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1, item.selected_modifiers)}
                            className="flex h-8 w-8 items-center justify-center border-l transition-all hover:bg-black hover:text-white"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-2">
                            {item.discount_amount && item.discount_amount > 0 ? (
                              <span className="text-xs font-bold text-gray-400 line-through">
                                ฿ {((getEffectiveItemUnitPrice(item) + (item.selected_modifiers?.reduce((a: number, m: any) => a + (m.price_adjustment || 0), 0) || 0)) * item.quantity).toLocaleString()}
                              </span>
                            ) : null}
                            <span className="text-lg font-black text-black">
                              {locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{' '}
                              {(
                                ((getEffectiveItemUnitPrice(item) +
                                  (item.selected_modifiers?.reduce(
                                    (a: number, m: any) => a + (m.price_adjustment || 0),
                                    0
                                  ) || 0)) *
                                item.quantity) - (item.discount_amount || 0)
                              ).toLocaleString()}
                            </span>
                          </div>
                          
                          {item.discount_amount && item.discount_amount > 0 ? (
                            <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1 border border-red-100">
                              <Tag size={10} className="text-red-500" />
                              <span className="text-[10px] font-black uppercase text-red-600">
                                ส่วนลด: ฿{item.discount_amount.toLocaleString()}
                              </span>
                              {item.discount_reason && (
                                <span className="text-[9px] font-bold text-red-400">
                                  ({item.discount_reason})
                                </span>
                              )}
                            </div>
                          ) : null}

                          {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                            <div className="mt-2 flex flex-wrap justify-end gap-1.5 text-right">
                              {item.selected_modifiers.map((m: any) => (
                                <span
                                  key={m.id}
                                  className="flex items-center gap-1.5 border border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-gray-600"
                                >
                                  <div className="h-1 w-1 bg-emerald-400"></div>
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="pointer-events-none flex h-full flex-col items-center justify-center opacity-10">
                  <ShoppingBag size={80} className="mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]">
                    Empty Order Bag
                  </p>
                </div>
              )}
            </div>

            <footer className="space-y-6 border-t border-gray-100 bg-[#FDFDFB] p-8 sm:p-10">
              <div className="overflow-hidden border-t border-gray-100 pt-4 transition-all duration-300">
                {/* COLLAPSIBLE TOGGLE */}
                <div
                  onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                  className="group mb-4 flex cursor-pointer items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`border border-gray-100 bg-gray-50 p-1 transition-all group-hover:bg-black group-hover:text-white ${isSummaryExpanded ? 'rotate-180' : ''}`}
                    >
                      <ChevronDown size={10} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8C8A81]">
                      {locale === 'en' ? '                       จัดการส่วนลดและภาษี                     ' : locale === 'zh' ? '                       จัดการส่วนลดและภาษี                     ' : '                       จัดการส่วนลดและภาษี                     '}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#8C8A81]">
                      {locale === 'en' ? '                       ภาษี (7%)                     ' : locale === 'zh' ? '                       ภาษี (7%)                     ' : '                       ภาษี (7%)                     '}</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        setHasVat(!hasVat)
                      }}
                      className={`relative h-3.5 w-7 rounded-none transition-all duration-300 ${hasVat ? 'bg-emerald-500' : 'bg-gray-200'}`}
                    >
                      <div
                        className={`absolute left-0.5 top-0.5 h-2.5 w-2.5 bg-white shadow-sm transition-transform duration-300 ${hasVat ? 'translate-x-3' : 'translate-x-0'}`}
                      ></div>
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE SECTION */}
                <div
                  className={`space-y-6 transition-all duration-500 ease-in-out ${isSummaryExpanded ? 'mb-6 max-h-[500px] opacity-100' : 'pointer-events-none max-h-0 opacity-0'}`}
                >
                  {/* DISCOUNT SELECTOR */}
                  <div className="flex items-center justify-between border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black uppercase tracking-widest text-black">
                        {locale === 'en' ? 'discount' : locale === 'zh' ? '折扣' : '                         ส่วนลด                       '}</label>
                      <span className="text-[8px] font-bold uppercase tracking-tighter text-gray-400">
                        Discount
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setBillDiscountInput(discountType === 'percent' ? String(discountRate) : String(discountValue))
                          setBillDiscountModalType(discountType)
                          setBillDiscountReason(discountName || 'โปรโมชั่น/ส่วนลด')
                          setShowBillDiscountModal(true)
                        }}
                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#1A1A18] transition-all hover:bg-gray-50"
                      >
                        <Tag size={12} className={discountTotalValue > 0 ? "text-emerald-500" : "text-gray-400"} />
                        {discountTotalValue > 0 ? (
                           <span className="text-emerald-600">แก้ไขส่วนลดทั้งบิล</span>
                        ) : (
                           <span>เพิ่มส่วนลดทั้งบิล</span>
                        )}
                      </button>
                      
                      {discountTotalValue > 0 && (
                        <button
                          onClick={() => {
                            setDiscountRate(0)
                            setDiscountValue(0)
                            setDiscountName('')
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-all hover:bg-red-500 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* BREAKDOWN */}
                  <div className="flex flex-col items-end gap-3 border-t border-black/[0.03] pt-4">
                    <div className="flex w-full justify-between text-xs">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        {locale === 'en' ? '                         ยอดรวมสินค้า (Subtotal)                       ' : locale === 'zh' ? '                         ยอดรวมสินค้า (Subtotal)                       ' : '                         ยอดรวมสินค้า (Subtotal)                       '}</span>
                      <span className="font-black text-black">
                        {locale === 'en' ? '                         ฿ ' : locale === 'zh' ? '                         ฿ ' : '                         ฿ '}{cartSubTotal.toLocaleString()}
                      </span>
                    </div>

                    {discountTotalValue > 0 && (
                      <div className="flex w-full justify-between text-xs text-red-500">
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest">
                          {locale === 'en' ? '                           ส่วนลด (' : locale === 'zh' ? '                           ส่วนลด (' : '                           ส่วนลด ('}{discountRate}%)
                        </span>
                        <span className="font-black">
                          {locale === 'en' ? '                           - ฿ ' : locale === 'zh' ? '                           - ฿ ' : '                           - ฿ '}{discountTotalValue.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {hasVat && (
                      <div className="flex w-full justify-between text-xs">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                          {locale === 'en' ? '                           ภาษีมูลค่าเพิ่ม (VAT 7%)                         ' : locale === 'zh' ? '                           ภาษีมูลค่าเพิ่ม (VAT 7%)                         ' : '                           ภาษีมูลค่าเพิ่ม (VAT 7%)                         '}</span>
                        <span className="font-black text-black">
                          {locale === 'en' ? '                           ฿ ' : locale === 'zh' ? '                           ฿ ' : '                           ฿ '}{Math.round(vatAmount).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* FINAL TOTAL (ALWAYS VISIBLE) */}
                <div className="flex items-end justify-between border-t border-black/[0.05] pt-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                      {locale === 'en' ? '                       ยอดรวมสุทธิ                     ' : locale === 'zh' ? '                       ยอดรวมสุทธิ                     ' : '                       ยอดรวมสุทธิ                     '}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
                      {hasVat ? 'รวมภาษีมูลค่าเพิ่มแล้ว' : 'ยังไม่รวมภาษี'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 text-right">
                    <span className="text-[10px] font-black text-black">THB</span>
                    <span className="text-4xl font-black leading-none tracking-tighter text-black">
                      {cartTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={handleSendOrder}
                  disabled={isProcessing || cart.length === 0 || isHeldOrderBaselineLoading || (!!editingOrderId && !hasUnsavedOrderChanges)}
                  className="flex h-16 flex-1 items-center justify-center gap-3 border border-[#1A1A18] text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <Printer size={16} /> {isHeldOrderBaselineLoading ? 'กำลังเช็กบิลพัก' : !!editingOrderId && !hasUnsavedOrderChanges ? 'พักแล้ว เพิ่มรายการใหม่' : locale === 'en' ? ' พักบิล / ส่งออเดอร์                 ' : locale === 'zh' ? ' พักบิล / ส่งออเดอร์                 ' : ' พักบิล / ส่งออเดอร์                 '}</button>
                <button
                  onClick={() => {
                    if (orderType === 'dine_in' && !selectedTable) {
                      fetchTables()
                      refreshPendingOrders()
                      setShowTableModal(true)
                      return
                    }
                    if (orderType === 'delivery') {
                      setShowDeliveryCheckoutModal(true)
                      return
                    }
                    setShowPaymentModal(true)
                  }}
                  className={`flex h-16 flex-[2] items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.4em] text-white shadow-xl transition-all ${
                    orderType === 'delivery' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#1A1A18] hover:bg-black'
                  }`}
                >
                  <span>{orderType === 'delivery' ? 'ยืนยันส่งออเดอร์' : locale === 'en' ? 'Checkout' : locale === 'zh' ? '结账' : 'ชำระเงิน'}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </footer>
        </div>
      </div>

      <div className={`fixed inset-0 z-[1150] flex justify-end font-bold transition-all duration-300 ${showDeliveryHub ? 'visible' : 'invisible'}`}>
        <div
          className={`absolute inset-0 bg-[#3a3a38]/40 backdrop-blur-md transition-opacity duration-300 ${showDeliveryHub ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setShowDeliveryHub(false)}
        ></div>
        <div className={`relative flex h-full w-full max-w-[min(100vw,560px)] flex-col bg-white font-bold shadow-2xl transition-transform duration-500 ${showDeliveryHub ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="min-h-0 flex-1">
            <DeliveryManager
              unlockAudio={unlockAudio}
              isAudioEnabled={isAudioEnabled}
              variant="drawer"
              syncPulse={syncPulse}
              onClose={() => setShowDeliveryHub(false)}
            />
          </div>
        </div>
      </div>

      {/* 6. CUSTOMER SELECTION MODAL */}
      {showCustomerModal && (
        <POSCustomerSelect
          onSelect={c => {
            setSelectedCustomer(c)
            setShowCustomerModal(false)
          }}
          selectedCustomer={selectedCustomer}
          onClose={() => setShowCustomerModal(false)}
          onManage={() => onSetView('members')}
          shopSettings={shopSettings}
        />
      )}

      {/* 7. POINT GENERATOR MODAL */}
      {showPointModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPointModal(false)}
          ></div>
          <div className="animate-in zoom-in-95 relative w-full max-w-xl duration-200">
            <PointGenerator onClose={() => setShowPointModal(false)} />
          </div>
        </div>
      )}

      {/* 7. TABLE SELECTION MODAL */}
      {showTableModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTableModal(false)}
          ></div>
          <div className="animate-in zoom-in-95 relative flex max-h-[90vh] w-full max-w-4xl flex-col bg-[#FDFDFB] font-bold shadow-2xl duration-200">
            <header className="flex items-center justify-between border-b border-gray-100 bg-white p-6 sm:p-8 font-bold">
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-black">
                  {locale === 'en' ? '                   เลือกโต๊ะ                 ' : locale === 'zh' ? '                   เลือกโต๊ะ                 ' : '                   เลือกโต๊ะ                 '}</h2>
              </div>
              <button onClick={() => setShowTableModal(false)} className="p-2">
                <X size={20} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 sm:p-10">
              <div className="grid grid-cols-4 gap-2 sm:gap-4 sm:grid-cols-6 lg:grid-cols-8">
                {tables.map(table => {
                  const pendingForThisTable = pendingOrders.filter(
                    o => o.table_id === table.id && o.status === 'pending'
                  )
                  // Consider table occupied if there's a pending order OR if table status is occupied (customer scanned & entered name)
                  const isOccupied = pendingForThisTable.length > 0 || table.status === 'occupied'
                  const isIdleOccupied = table.status === 'occupied' && pendingForThisTable.length === 0

                  return (
                    <div key={table.id} className="relative aspect-square flex flex-col">
                      <button
                        onClick={() => {
                          if (selectedTable?.id === table.id) {
                            resetOrderComposer()
                            setTotalPaid(0)
                            setShowTableModal(false)
                          } else {
                            if (pendingForThisTable.length > 0 && cart.length > 0 && !editingOrderId) {
                                setMergeTableTarget({ table, pendingOrder: pendingForThisTable[0] })
                            } else {
                                setSelectedTable(table)
                                setOrderType('dine_in')
                                resetDeliveryDraft()
                                setShowTableModal(false)
                                if (pendingForThisTable.length > 0) {
                                    handleResumeOrder(pendingForThisTable[0])
                                } else {
                                    if (editingOrderId) {
                                        setCart([])
                                        setEditingOrderId(null)
                                        setEditingOrderNumber('')
                                        setTotalPaid(0)
                                    }
                                }
                            }
                          }
                        }}
                        className={`flex-1 relative flex flex-col items-center justify-center overflow-hidden border-2 transition-all ${selectedTable?.id === table.id ? 'border-[#1A1A18] bg-[#1A1A18] text-white' : isOccupied ? 'group border-red-600 bg-red-500 text-white' : 'border-gray-100 bg-white text-black hover:border-black'}`}
                      >
                        <span className="text-xl font-black">{table.table_number}</span>
                        <span className="mt-1 text-[7px] uppercase tracking-widest opacity-80">
                          {table.zone || 'Main'}
                        </span>
                        {isOccupied && (
                          <div className="absolute right-0 top-0 bg-red-700 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-tighter text-white">
                            Occupied
                          </div>
                        )}
                      </button>
                      {isIdleOccupied && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleClearIdleTable(table)
                          }}
                          className="mt-2 border border-amber-300 bg-amber-50 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-amber-700 transition-all hover:border-amber-500 hover:bg-amber-100"
                        >
                          เคลียร์โต๊ะ
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* 8. PENDING ORDERS MODAL */}
      {showPendingModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPendingModal(false)}
          ></div>
          <div className="animate-in slide-in-from-bottom relative flex max-h-[90vh] w-full max-w-4xl flex-col bg-[#FDFDFB] font-bold shadow-2xl duration-300">
            <header className="flex items-center justify-between border-b border-gray-100 bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-black">
                  {locale === 'en' ? '                   รายการออเดอร์                 ' : locale === 'zh' ? '                   รายการออเดอร์                 ' : '                   รายการออเดอร์                 '}</h2>
                {qrIncomingOrders.length > 0 && (
                  <span className="bg-orange-500 text-white px-2 py-1 text-[9px] font-black uppercase tracking-widest animate-pulse">
                    {qrIncomingOrders.length} {locale === 'en' ? ' QR ใหม่!                   ' : locale === 'zh' ? ' QR ใหม่!                   ' : ' QR ใหม่!                   '}</span>
                )}
              </div>
              <button onClick={() => setShowPendingModal(false)} className="p-2">
                <X size={20} />
              </button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-10">
              {suspendedOrders
                .sort((a, b) => {
                  // QR orders (source='qr', status='pending') appear first
                  if (a.source === 'qr' && b.source !== 'qr') return -1
                  if (b.source === 'qr' && a.source !== 'qr') return 1
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                })
                .map(order => (
                  <div
                    key={order.id}
                    onClick={() => handleResumeOrder(order)}
                    className="group flex cursor-pointer flex-col items-center justify-between border bg-white p-6 transition-all hover:border-[#1A1A18] sm:flex-row"
                  >
                    <div className="flex items-center gap-8 font-bold">
                      {order.source === 'qr' ? (
                        <BellRing size={32} className="text-orange-400 animate-pulse group-hover:text-orange-500" />
                      ) : (
                        <History size={32} className="text-gray-200 group-hover:text-[#1A1A18]" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-black uppercase tracking-widest text-[#1A1A18]">
                            {order.order_number}
                          </div>
                          {order.source === 'qr' && (
                            <span className="bg-orange-500 text-white px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter animate-pulse">
                              QR ORDER
                            </span>
                          )}
                          {order.table_number && (
                            <span className="bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-amber-700">
                              Table {order.table_number}
                            </span>
                          )}
                          {!order.source || order.source !== 'qr' ? (
                            <span className="bg-gray-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-gray-500">
                              {order.order_type === 'dine_in'
                                ? 'Dine In'
                                : order.order_type === 'takeaway'
                                  ? 'Take Away'
                                  : 'Delivery'}
                            </span>
                          ) : null}
                          {order.order_type === 'delivery' && order.delivery_platform && (
                            <span className="bg-emerald-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-emerald-700">
                              {formatDeliveryPlatformLabel(order.delivery_platform)}
                            </span>
                          )}
                          {order.order_type === 'delivery' && order.reference_name && (
                            <span className="bg-[#1A1A18] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-white">
                              {order.reference_name}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[10px] text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString()}
                          {order.source === 'qr' && <span className="ml-2 text-orange-400 font-black">{locale === 'en' ? '• รายการใหม่จากลูกค้า' : locale === 'zh' ? '• รายการใหม่จากลูกค้า' : '• รายการใหม่จากลูกค้า'}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-10">
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-black text-[#1A1A18]">
                          {locale === 'en' ? '                           ฿ ' : locale === 'zh' ? '                           ฿ ' : '                           ฿ '}{order.total_amount.toLocaleString()}
                        </span>
                        {(order.pos_order_payments?.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0) > 0 && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-1.5 py-0.5">
                            {locale === 'en' ? '                             จ่ายแล้ว ฿ ' : locale === 'zh' ? '                             จ่ายแล้ว ฿ ' : '                             จ่ายแล้ว ฿ '}{(order.pos_order_payments?.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + Number(p.amount), 0)).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleDeleteOrder(order.id)
                        }}
                        className="p-2 text-red-200 hover:text-red-500"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 9. PAYMENT MODAL - PREMIUM REDESIGN */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#1A1A18]/60 backdrop-blur-md"
            onClick={() => setShowPaymentModal(false)}
          ></div>
          <div className="animate-in zoom-in-95 relative flex w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-[0_30px_100px_-20px_rgba(0,0,0,0.4)] border border-white/20 duration-300">
            <header className="relative flex items-center justify-between border-b border-gray-100/50 bg-white/50 p-6 sm:p-8 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white shadow-lg">
                  <Banknote size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase leading-none tracking-tighter text-[#1A1A18]">
                    {locale === 'en' ? 'Checkout' : locale === 'zh' ? '结账' : 'ชำระเงิน'}
                  </h2>
                  <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">
                    Select Payment Method
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all hover:bg-gray-100 hover:text-black active:scale-95"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </header>

            <div className="p-6 sm:p-10 text-center font-bold bg-[#FDFDFB]">
              <div className="relative mb-10 overflow-hidden rounded-[2rem] bg-gradient-to-br from-black to-gray-800 p-8 shadow-2xl">
                {/* Decorative background elements */}
                <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl"></div>
                
                <div className="relative z-10">
                  <span className="mb-3 block text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">
                    Total Amount Due
                  </span>
                  <div className="text-5xl sm:text-7xl font-black text-white tracking-tighter drop-shadow-lg">
                    <span className="text-3xl sm:text-4xl text-gray-400 mr-2 font-black">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}</span>
                    {remainingTotal.toLocaleString()}
                  </div>
                  
                  {totalPaid > 0 && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black tracking-widest text-emerald-400 border border-white/5">
                      <Check size={14} />
                      <span>PAID: ฿{totalPaid.toLocaleString()} / TOTAL: ฿{cartTotal.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <button
                  disabled={isProcessing || remainingTotal <= 0}
                  onClick={() => {
                    fetchTables()
                    refreshPendingOrders()
                    setShowPaymentModal(false)
                    setShowSplitPaymentModal(true)
                  }}
                  className="w-full h-16 rounded-2xl bg-white border-2 border-gray-100 text-[#1A1A18] text-[12px] font-black uppercase tracking-[0.2em] hover:border-black hover:bg-gray-50 hover:shadow-md transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2z"/></svg>
                  {locale === 'en' ? 'Split Bill / Partial Payment' : locale === 'zh' ? '分摊付款' : 'หารจ่าย / แยกจ่าย (SPLIT BILL)'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-5">
                <button
                  disabled={isProcessing}
                  onClick={() => {
                    setShowPaymentModal(false);
                    setCashReceived('');
                    setPaymentSuccessData(null);
                    setCurrentPaymentAmount(remainingTotal);
                    setShowCashPaymentModal(true);
                  }}
                  className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-transparent bg-gray-50 py-8 sm:py-10 font-bold text-black transition-all hover:border-black hover:bg-white hover:shadow-xl active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Banknote className="mb-3 sm:mb-4 h-10 w-10 sm:h-14 sm:w-14 text-gray-400 transition-transform duration-300 group-hover:scale-110 group-hover:text-black relative z-10" strokeWidth={1.5} />
                  <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-widest relative z-10">Cash</span>
                </button>
                <button
                  disabled={isProcessing}
                  onClick={() => handleProcessPayment('promptpay')}
                  className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-transparent bg-gray-50 py-8 sm:py-10 font-bold text-black transition-all hover:border-blue-600 hover:bg-white hover:shadow-xl active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <QrCode className="mb-3 sm:mb-4 h-10 w-10 sm:h-14 sm:w-14 text-gray-400 transition-transform duration-300 group-hover:scale-110 group-hover:text-blue-600 relative z-10" strokeWidth={1.5} />
                  <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-widest relative z-10">QR Pay</span>
                </button>
                <button
                  disabled={isProcessing}
                  onClick={() => handleProcessPayment('credit_card')}
                  className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-transparent bg-gray-50 py-8 sm:py-10 font-bold text-black transition-all hover:border-orange-500 hover:bg-white hover:shadow-xl active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CreditCard className="mb-3 sm:mb-4 h-10 w-10 sm:h-14 sm:w-14 text-gray-400 transition-transform duration-300 group-hover:scale-110 group-hover:text-orange-500 relative z-10" strokeWidth={1.5} />
                  <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-widest relative z-10">Card</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSplitPaymentModal && (
        <POSSplitPaymentModal
          cart={cart}
          cartTotal={cartTotal}
          remainingTotal={remainingTotal}
          isProcessing={isProcessing}
          onClose={() => setShowSplitPaymentModal(false)}
          handleProcessPayment={(method, amount) => {
             setShowSplitPaymentModal(false);
             if (method === 'cash') {
                setCurrentPaymentAmount(amount);
                setCashReceived('');
                setPaymentSuccessData(null);
                setShowCashPaymentModal(true);
             } else {
                handleProcessPayment(method, amount);
             }
          }}
        />
      )}
      
      {/* 10. MODIFIER SELECTION MODAL - PREMIUM REDESIGN */}
      {modifierModalItem && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 font-bold sm:p-8">
          <div
            className="absolute inset-0 bg-[#1A1A18]/40 backdrop-blur-md"
            onClick={() => setModifierModalItem(null)}
          ></div>
          <div className="animate-in zoom-in-95 relative flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] duration-300 border border-white/20">
            <header className="relative flex items-center justify-between border-b border-gray-100 bg-white p-6 sm:p-8">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gray-50 shadow-sm border border-gray-100">
                  {modifierModalItem.image_url ? (
                    <img src={modifierModalItem.image_url} className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingCart size={28} className="text-gray-300" />
                  )}
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-3">
                    <span className="bg-gray-100 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                      Customize
                    </span>
                  </div>
                  <h2 className="text-2xl font-black uppercase leading-none tracking-tight text-[#1A1A18]">
                    {getPrimaryMenuName(modifierModalItem)}
                  </h2>
                  {getSecondaryMenuName(modifierModalItem, locale === 'zh' ? 'zh' : 'en') && (
                    <p className="text-xs font-bold text-gray-400 mt-1">
                      {getSecondaryMenuName(modifierModalItem, locale === 'zh' ? 'zh' : 'en')}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setModifierModalItem(null)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all hover:bg-gray-100 hover:text-black active:scale-95"
              >
                <X size={20} />
              </button>
            </header>

            <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto bg-[#FDFDFB] p-6 sm:p-8">
              {modifierGroups.map((group, gIdx) => {
                const minReq = group.min_selection || group.min_select || 0
                const maxAllowed = group.max_selection || group.max_select || 99
                const selectedInGroup = tempSelectedModifiers.filter(m => m.group_id === group.id)
                const isComplete = selectedInGroup.length >= minReq
                const isAtMax = selectedInGroup.length >= maxAllowed

                return (
                  <div
                    key={group.id}
                    className="space-y-4"
                  >
                    <div className="flex items-end justify-between pb-2">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-black text-[#1A1A18] tracking-tight">
                            {group.name}
                          </h3>
                          {minReq > 0 ? (
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors ${isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'}`}>
                              {isComplete ? '✔ เลือกครบแล้ว' : `* บังคับเลือก ${minReq} อย่าง`}
                            </span>
                          ) : (
                            <span className="bg-gray-100 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest text-gray-500">
                              เลือกหรือไม่ก็ได้
                            </span>
                          )}
                          {maxAllowed > 1 && maxAllowed < 99 && (
                            <span className="bg-[#1A1A18] px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest text-white">
                              สูงสุด {maxAllowed}
                            </span>
                          )}
                        </div>
                        {minReq > 0 && !isComplete && (
                          <p className="text-[11px] font-bold text-orange-400">กรุณาเลือกตัวเลือกในหมวดนี้ให้ครบ</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {group.options?.map((opt: any) => {
                        const isSelected = tempSelectedModifiers.some(m => m.id === opt.id)
                        return (
                          <button
                            key={opt.id}
                            disabled={!isSelected && isAtMax && maxAllowed > 1}
                            onClick={() => {
                              let nextSelected = [...tempSelectedModifiers]
                              if (isSelected) {
                                nextSelected = nextSelected.filter(m => m.id !== opt.id)
                              } else {
                                if (maxAllowed === 1) {
                                  nextSelected = [
                                    ...nextSelected.filter(m => m.group_id !== group.id),
                                    opt,
                                  ]
                                } else {
                                  nextSelected = [...nextSelected, opt]
                                }
                              }
                              setTempSelectedModifiers(nextSelected)
                            }}
                            className={`group relative flex h-28 flex-col justify-between rounded-2xl p-4 text-left transition-all outline-none ${
                              isSelected 
                                ? 'bg-emerald-50/70 border-2 border-emerald-500 shadow-sm' 
                                : isAtMax && maxAllowed > 1 
                                  ? 'cursor-not-allowed bg-gray-50 border-2 border-transparent text-gray-400 opacity-60' 
                                  : 'bg-white border-2 border-gray-100 hover:border-emerald-200 hover:shadow-sm active:scale-95'
                            }`}
                          >
                            <div className="flex w-full items-start justify-between gap-2">
                              <div className={`text-sm font-black leading-tight ${isSelected ? 'text-emerald-900' : 'text-[#1A1A18]'}`}>
                                {opt.name}
                              </div>
                              <div className={`flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full transition-all ${isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-transparent group-hover:bg-gray-200'}`}>
                                <Check size={14} strokeWidth={3} />
                              </div>
                            </div>
                            <div className="flex w-full items-end justify-between mt-2">
                              <div
                                className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  isSelected 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : opt.price_adjustment > 0 ? 'bg-gray-100 text-gray-600' : 'text-gray-400'
                                }`}
                              >
                                {opt.price_adjustment > 0
                                  ? `+ ฿${opt.price_adjustment}`
                                  : opt.price_adjustment < 0
                                    ? `- ฿${Math.abs(opt.price_adjustment)}`
                                    : 'FREE'}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <footer className="flex flex-col items-center justify-between border-t border-gray-100 bg-white p-6 sm:flex-row sm:p-8">
              <div className="flex flex-1 flex-col mb-4 sm:mb-0">
                <span className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  รายการที่เลือกแล้ว (Selected Items)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tempSelectedModifiers.length > 0 ? (
                    tempSelectedModifiers.map(m => (
                      <span
                        key={m.id}
                        className="bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-md text-[10px] font-black text-gray-600 shadow-sm"
                      >
                        {m.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] font-bold italic text-gray-300">
                      ยังไม่ได้เลือกตัวเลือกเพิ่มเติม
                    </span>
                  )}
                </div>
              </div>
              {/* VALIDATION MESSAGE */}
              {(() => {
                const incomplete = modifierGroups.filter(
                  g =>
                    tempSelectedModifiers.filter(m => m.group_id === g.id).length <
                    (g.min_selection || g.min_select || 0)
                )
                const canConfirm = incomplete.length === 0

                return (
                  <div className="flex w-full flex-col sm:flex-row items-center justify-end gap-3 sm:w-auto mt-4 sm:mt-0">
                    {/* QUANTITY SELECTOR */}
                    <div className={`flex items-center h-[60px] bg-gray-50/80 rounded-[1.25rem] border border-gray-200/60 p-1.5 w-full sm:w-auto shrink-0 transition-opacity ${canConfirm ? '' : 'opacity-50 pointer-events-none'}`}>
                        <button 
                            onClick={() => setTempQuantity(q => Math.max(1, q - 1))}
                            className="flex-1 sm:w-[46px] sm:flex-none h-full rounded-xl bg-white text-gray-400 shadow-sm hover:text-[#1A1A18] hover:shadow active:scale-95 transition-all flex items-center justify-center border border-gray-100"
                        >
                            <Minus size={18} strokeWidth={3} />
                        </button>
                        <div className="w-16 text-center font-black text-2xl text-[#1A1A18] leading-none">
                            {tempQuantity}
                        </div>
                        <button 
                            onClick={() => setTempQuantity(q => q + 1)}
                            className="flex-1 sm:w-[46px] sm:flex-none h-full rounded-xl bg-white text-gray-400 shadow-sm hover:text-[#1A1A18] hover:shadow active:scale-95 transition-all flex items-center justify-center border border-gray-100"
                        >
                            <Plus size={18} strokeWidth={3} />
                        </button>
                    </div>

                    <button
                      disabled={!canConfirm}
                      onClick={() => {
                        addToCart(modifierModalItem, tempSelectedModifiers, tempQuantity)
                      }}
                      className={`relative flex h-[60px] w-full sm:w-auto sm:min-w-[200px] flex-1 items-center justify-center gap-3 rounded-[1.25rem] px-6 text-[14px] font-black uppercase tracking-widest transition-all overflow-hidden ${
                        canConfirm 
                          ? 'bg-[#1A1A18] text-white hover:bg-black hover:shadow-xl active:scale-95' 
                          : 'cursor-not-allowed bg-gray-100 text-gray-400'
                      }`}
                    >
                      {canConfirm && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                      )}
                      <span>{canConfirm ? (locale === 'en' ? 'Add to Cart' : locale === 'zh' ? 'Add to Cart' : 'ยืนยัน') : `ขาดอีก ${incomplete.length} หมวด`}</span>
                      {canConfirm && <ArrowRight size={18} />}
                    </button>
                  </div>
                )
              })()}
            </footer>
          </div>
        </div>
      )}
      {/* MANAGER PIN AUTHORIZATION MODAL */}
      {/* CASH PAYMENT MODAL */}
      {showCashPaymentModal && !paymentSuccessData && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#3a3a38]/40 backdrop-blur-md" onClick={() => !isProcessing && setShowCashPaymentModal(false)}></div>
          <div className="relative w-full max-w-md bg-white shadow-2xl animate-in fade-in zoom-in-95 p-8 flex flex-col font-bold">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-tighter text-[#1A1A18]">{locale === 'en' ? 'ชำระเงินสด (CASH)' : locale === 'zh' ? 'ชำระเงินสด (CASH)' : 'ชำระเงินสด (CASH)'}</h3>
              {!isProcessing && (
                <button onClick={() => setShowCashPaymentModal(false)} className="text-gray-400 hover:text-black">
                  <X size={24} />
                </button>
              )}
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 mb-6">
              <span className="text-sm font-black text-gray-500 uppercase tracking-widest">{locale === 'en' ? 'ยอดที่ต้องชำระ' : locale === 'zh' ? 'ยอดที่ต้องชำระ' : 'ยอดที่ต้องชำระ'}</span>
              <span className="text-3xl font-black text-emerald-600 tracking-tighter">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{cartTotal.toLocaleString()}</span>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">{locale === 'en' ? 'รับเงินมา (Received)' : locale === 'zh' ? 'รับเงินมา (Received)' : 'รับเงินมา (Received)'}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}</span>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full h-14 pl-10 pr-4 text-2xl font-black border-2 border-gray-200 outline-none focus:border-black transition-all"
                  placeholder="0"
                  autoFocus
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-8">
              <button onClick={() => setCashReceived(cartTotal.toString())} className="h-12 bg-gray-100 hover:bg-gray-200 text-black font-black transition-all border border-gray-200">{locale === 'en' ? 'พอดี' : locale === 'zh' ? 'พอดี' : 'พอดี'}</button>
              <button onClick={() => setCashReceived('100')} className="h-12 bg-gray-100 hover:bg-gray-200 text-black font-black transition-all border border-gray-200">100</button>
              <button onClick={() => setCashReceived('500')} className="h-12 bg-gray-100 hover:bg-gray-200 text-black font-black transition-all border border-gray-200">500</button>
              <button onClick={() => setCashReceived('1000')} className="h-12 bg-gray-100 hover:bg-gray-200 text-black font-black transition-all border border-gray-200">1000</button>
            </div>

            <button
              disabled={isProcessing || !cashReceived || Number(cashReceived) < cartTotal}
              onClick={async () => {
                const received = Number(cashReceived);
                if (received < cartTotal) {
                  alert('รับเงินมาไม่ครบยอดชำระ');
                  return;
                }
                await handleProcessPayment('cash', currentPaymentAmount);
              }}
              className="w-full h-14 bg-[#1A1A18] text-white font-black tracking-widest uppercase hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'ยืนยันชำระเงิน'
              )}
            </button>
          </div>
        </div>
      )}

      {isDeliveryPlatformModalOpen && (
        <div className="fixed inset-0 z-[2600] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDeliveryPlatformModalOpen(false)}
          />
          <div className="relative z-[1] w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Delivery Platform</div>
                <h3 className="mt-2 text-2xl font-black text-[#1A1A18]">เลือกค่ายและกรอกเลขบิล</h3>
                <p className="mt-2 text-sm font-bold text-gray-500">ข้อมูลนี้จะแสดงชัดเจนบนใบเสร็จและใบออเดอร์</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeliveryPlatformModalOpen(false)}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-black"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 min-h-[360px] flex flex-col justify-center">
              {!draftDeliveryPlatform ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="text-center mb-8">
                    <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4">
                      Delivery Platform
                    </div>
                    <h4 className="text-2xl font-black text-[#1A1A18] tracking-tight">เลือกค่ายเดลิเวอรี่</h4>
                    <p className="text-xs font-bold text-gray-400 mt-2">กรุณาเลือกค่ายเพื่อกรอกรหัสบิล</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {activeDeliveryPlatforms.map((platform: string) => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => setDraftDeliveryPlatform(platform)}
                        className="group rounded-[2rem] border-2 border-gray-100 bg-white px-4 py-8 text-center transition-all hover:border-[#1A1A18] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] active:scale-95 flex flex-col items-center justify-center gap-2"
                      >
                        <div className="h-12 w-12 rounded-full bg-gray-50 group-hover:bg-[#1A1A18] flex items-center justify-center transition-colors">
                          <Truck className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                        </div>
                        <div className="mt-2 text-xl font-black text-[#1A1A18]">{formatDeliveryPlatformLabel(platform)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300 w-full px-2">
                  {/* Selected Platform Header (Sleek Pill) */}
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-full mb-8 shadow-sm">
                    <Truck size={14} className="text-gray-400" />
                    <span className="text-[13px] font-black uppercase tracking-widest text-[#1A1A18]">
                      {formatDeliveryPlatformLabel(draftDeliveryPlatform)}
                    </span>
                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftDeliveryPlatform('')
                        setDraftPlatformOrderId('')
                      }}
                      className="text-[11px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-600 transition-all active:scale-95"
                    >
                      เปลี่ยนค่าย
                    </button>
                  </div>

                  {/* Display screen (Floating glass effect) */}
                  <div className="relative w-full max-w-[280px] h-20 flex flex-col items-center justify-center rounded-3xl mb-8 transition-all">
                    <span className="absolute -top-3 bg-white px-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 z-10">
                      Order ID
                    </span>
                    <div className={`w-full h-full flex items-center justify-center rounded-3xl border-2 transition-all ${draftPlatformOrderId ? 'border-[#1A1A18] bg-[#1A1A18] text-white shadow-xl scale-105' : 'border-gray-200 bg-gray-50 text-gray-300 border-dashed'}`}>
                      <span className="text-4xl font-black tracking-widest font-mono">
                        {draftPlatformOrderId || '---'}
                      </span>
                    </div>
                  </div>

                  {/* Ultra-sleek Numpad */}
                  <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full max-w-[260px]">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setDraftPlatformOrderId(prev => (prev.length < 15 ? prev + num : prev))}
                        className="h-16 w-16 mx-auto rounded-full bg-gray-50/50 hover:bg-gray-100 text-2xl font-black text-[#1A1A18] hover:shadow-md active:scale-90 active:bg-gray-200 transition-all flex items-center justify-center"
                      >
                        {num}
                      </button>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => setDraftPlatformOrderId('')}
                      className="h-16 w-16 mx-auto rounded-full text-red-400 font-black text-[12px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:shadow-sm active:scale-90 transition-all flex items-center justify-center"
                    >
                      Clear
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setDraftPlatformOrderId(prev => (prev.length < 15 ? prev + '0' : prev))}
                      className="h-16 w-16 mx-auto rounded-full bg-gray-50/50 hover:bg-gray-100 text-2xl font-black text-[#1A1A18] hover:shadow-md active:scale-90 active:bg-gray-200 transition-all flex items-center justify-center"
                    >
                      0
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setDraftPlatformOrderId(prev => prev.slice(0, -1))}
                      className="h-16 w-16 mx-auto rounded-full text-gray-400 hover:bg-gray-100 hover:text-[#1A1A18] hover:shadow-sm active:scale-90 transition-all flex items-center justify-center"
                    >
                      <Delete size={24} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeliveryPlatformModalOpen(false)}
                className={`${draftDeliveryPlatform ? 'flex-1' : 'w-full'} rounded-[1.5rem] bg-gray-50 py-5 text-[12px] font-black uppercase tracking-[0.2em] text-gray-500 transition-all hover:bg-gray-200 hover:text-black`}
              >
                ยกเลิก (Cancel)
              </button>
              {draftDeliveryPlatform && (
                <button
                  type="button"
                  disabled={!draftPlatformOrderId}
                  onClick={saveDeliveryPlatformDetails}
                  className={`flex-1 rounded-[1.5rem] py-5 text-[12px] font-black uppercase tracking-[0.2em] transition-all ${draftPlatformOrderId ? 'bg-[#1A1A18] text-white hover:bg-black hover:shadow-xl hover:scale-[1.02]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  ยืนยัน (Confirm)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* DELIVERY CHECKOUT MODAL */}
      <AnimatePresence>
        {showDeliveryCheckoutModal && (
          <div className="fixed inset-0 z-[2550] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDeliveryCheckoutModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-[1] w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Delivery Flow</div>
                    <h3 className="mt-1 text-2xl font-black text-[#1A1A18]">ยืนยันออเดอร์เดลิเวอรี่</h3>
                  </div>
                  <button
                    onClick={() => setShowDeliveryCheckoutModal(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:bg-gray-200 hover:text-black active:scale-95"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Delivery Platform & Order ID (optional preview, click to edit) */}
                  <div className="rounded-2xl border-2 border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">แพลตฟอร์ม & รหัสออเดอร์</label>
                      <button
                        onClick={() => openDeliveryPlatformModal(deliveryPlatform || activeDeliveryPlatforms[0] || 'grab')}
                        className="text-[10px] font-black text-orange-500 hover:text-orange-600"
                      >
                        แก้ไข
                      </button>
                    </div>
                    {deliveryPlatform && platformOrderId ? (
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                          <Truck size={16} className="text-[#1A1A18]" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-[#1A1A18] uppercase">{formatDeliveryPlatformLabel(deliveryPlatform)}</div>
                          <div className="text-[11px] font-bold text-gray-500 font-mono tracking-widest">#{platformOrderId}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                          <AlertCircle size={16} />
                        </div>
                        <button
                          onClick={() => openDeliveryPlatformModal(activeDeliveryPlatforms[0] || 'grab')}
                          className="text-sm font-black text-orange-500 hover:text-orange-600 text-left"
                        >
                          ยังไม่ได้ระบุข้อมูล<br/>
                          <span className="text-[10px] text-orange-400">คลิกเพื่อระบุค่ายและรหัส</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Story Mode Selection */}
                  {(shopSettings?.receipt_story_mode || shopSettings?.opening_hours?.receipt_story_mode) && (shopSettings?.receipt_stories?.length > 0 || shopSettings?.opening_hours?.receipt_stories?.length > 0) && (
                    <div>
                      <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-400">เลือกตอนของนิยายท้ายบิล</label>
                      <div className="relative group">
                        <select
                          value={selectedStoryIndex}
                          onChange={(e) => setSelectedStoryIndex(Number(e.target.value))}
                          className="w-full h-14 pl-5 pr-12 rounded-2xl border-2 border-gray-100 bg-gray-50 text-sm font-bold text-[#1A1A18] outline-none hover:border-gray-200 focus:border-[#1A1A18] focus:bg-white transition-all appearance-none cursor-pointer"
                        >
                          <option value={-1}>🎲 สุ่มตอน (Random Chapter)</option>
                          {(shopSettings?.receipt_stories || shopSettings?.opening_hours?.receipt_stories || []).map((story: any, idx: number) => (
                            <option key={idx} value={idx}>📖 {story.title}</option>
                          ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-black transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-6 sm:p-8">
                <button
                  onClick={async () => {
                    if (!deliveryPlatform || !platformOrderId.trim()) {
                      alert('กรุณาระบุแพลตฟอร์มและรหัสออเดอร์ก่อนยืนยันครับ')
                      return
                    }
                    await handleProcessPayment('delivery')
                    setShowDeliveryCheckoutModal(false)
                  }}
                  disabled={isProcessing}
                  className="relative flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-[13px] font-black uppercase tracking-widest text-white shadow-[0_8px_20px_-8px_rgba(249,115,22,0.5)] transition-all hover:bg-orange-600 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  {isProcessing ? 'กำลังดำเนินการ...' : 'ยืนยัน และ ปริ้นใบเสร็จ'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ORDER TYPE SWITCH MODAL */}
      {pendingOrderTypeSwitch && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center font-bold">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPendingOrderTypeSwitch(null)}></div>
          <div className="animate-in zoom-in-95 relative w-[90%] max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500">
              <ShoppingBag size={32} />
            </div>
            <h3 className="mb-2 text-2xl font-black uppercase tracking-tight text-gray-900">
              {locale === 'en' ? 'Change Order Type?' : locale === 'zh' ? 'Change Order Type?' : 'เปลี่ยนประเภทการสั่ง?'}
            </h3>
            <p className="mb-8 text-sm font-bold text-gray-500">
              {locale === 'en' ? 'You have items in the cart or an active order. Are you sure you want to switch to ' : locale === 'zh' ? 'You have items in the cart or an active order. Are you sure you want to switch to ' : 'คุณมีรายการสินค้าในตะกร้าหรือกำลังแก้ไขบิลอยู่ คุณแน่ใจหรือไม่ที่จะเปลี่ยนประเภทเป็น '}
              {pendingOrderTypeSwitch === 'dine_in' ? 'Dine-In' : pendingOrderTypeSwitch === 'takeaway' ? 'Takeaway' : 'Delivery'}?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  const newType = pendingOrderTypeSwitch;
                  setOrderType(newType);
                  if (newType !== 'dine_in') {
                      setSelectedTable(null);
                  }
                  if (newType === 'delivery') {
                      openDeliveryPlatformModal(deliveryPlatform || activeDeliveryPlatforms[0] || 'grab');
                  }
                  setPendingOrderTypeSwitch(null);
                  
                  // Auto-update db if editing
                  if (editingOrderId) {
                      await supabase.from('pos_orders').update({ order_type: newType, table_id: newType !== 'dine_in' ? null : undefined }).eq('id', editingOrderId);
                  }
                }}
                className="w-full rounded-2xl bg-red-500 py-4 text-[13px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {locale === 'en' ? 'Yes, change type' : locale === 'zh' ? 'Yes, change type' : 'ยืนยันการเปลี่ยนประเภท'}
              </button>
              <button
                onClick={() => setPendingOrderTypeSwitch(null)}
                className="w-full py-2 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600"
              >
                {locale === 'en' ? 'Cancel' : locale === 'zh' ? 'Cancel' : 'ยกเลิก'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* MERGE MODAL */}
      {mergeTableTarget && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center font-bold">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMergeTableTarget(null)}></div>
          <div className="animate-in zoom-in-95 relative w-[90%] max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-500">
              <ShoppingBag size={32} />
            </div>
            <h3 className="mb-2 text-2xl font-black uppercase tracking-tight text-gray-900">
              {locale === 'en' ? 'Merge with Table?' : locale === 'zh' ? 'Merge with Table?' : 'รวมรายการเข้าโต๊ะ?'}
            </h3>
            <p className="mb-8 text-sm font-bold text-gray-500">
              {locale === 'en' ? 'Table ' : locale === 'zh' ? 'Table ' : 'โต๊ะ '}{mergeTableTarget.table.name} {locale === 'en' ? ' already has an open order. Do you want to add your ' : locale === 'zh' ? ' already has an open order. Do you want to add your ' : ' มีออเดอร์ค้างอยู่แล้ว คุณต้องการนำรายการที่เลือกไว้ '}{cart.length} {locale === 'en' ? ' items to it?' : locale === 'zh' ? ' items to it?' : ' รายการ ไปรวมในบิลนี้เลยหรือไม่?'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setSelectedTable(mergeTableTarget.table)
                  setShowTableModal(false)
                  handleResumeOrder(mergeTableTarget.pendingOrder, true)
                  setMergeTableTarget(null)
                }}
                className="w-full rounded-2xl bg-[#1A1A18] py-4 text-[13px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {locale === 'en' ? 'Merge items' : locale === 'zh' ? 'Merge items' : 'ยืนยันการรวมบิล (Merge)'}
              </button>
              <button
                onClick={() => {
                  setSelectedTable(mergeTableTarget.table)
                  setShowTableModal(false)
                  handleResumeOrder(mergeTableTarget.pendingOrder, false)
                  setMergeTableTarget(null)
                }}
                className="w-full rounded-2xl bg-gray-100 py-4 text-[13px] font-black uppercase tracking-widest text-gray-600 transition-all hover:bg-gray-200"
              >
                {locale === 'en' ? 'Discard new items & view table' : locale === 'zh' ? 'Discard new items & view table' : 'ทิ้งรายการใหม่ & ดูบิลเดิม'}
              </button>
              <button
                onClick={() => setMergeTableTarget(null)}
                className="w-full py-2 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600"
              >
                {locale === 'en' ? 'Cancel' : locale === 'zh' ? 'Cancel' : 'ยกเลิก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL PAYMENT SUCCESS MODAL - PREMIUM REDESIGN */}
      {paymentSuccessData && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1A1A18]/80 backdrop-blur-md" onClick={() => setPaymentSuccessData(null)}></div>
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 flex flex-col overflow-hidden border border-white/20">
            {/* Top Pattern Header */}
            <div className="relative bg-gradient-to-br from-emerald-500 to-teal-700 px-8 pt-12 pb-8 text-center overflow-hidden">
              <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-white/20 blur-3xl"></div>
              <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-black/20 blur-3xl"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 bg-white text-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-xl">
                  <Check size={40} strokeWidth={3} />
                </div>
                <h2 className="text-[11px] font-black text-white/80 uppercase tracking-[0.3em] mb-2">{locale === 'en' ? 'Payment Successful' : locale === 'zh' ? '支付成功' : 'ชำระเงินสำเร็จ'}</h2>
                
                {paymentSuccessData.paymentMethod === 'cash' ? (
                   <>
                     <div className="text-5xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-md">
                       <span className="text-3xl text-white/80 mr-1">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}</span>{paymentSuccessData.change.toLocaleString()}
                     </div>
                     <div className="mt-3 inline-flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full text-[10px] font-black text-white tracking-widest uppercase backdrop-blur-sm border border-white/10">
                       {locale === 'en' ? 'เงินทอน (Change)' : locale === 'zh' ? '找零 (Change)' : 'เงินทอน (Change)'}
                     </div>
                   </>
                ) : (
                   <>
                     <div className="text-5xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-md">
                       <span className="text-3xl text-white/80 mr-1">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}</span>{paymentSuccessData.total.toLocaleString()}
                     </div>
                     <div className="mt-3 inline-flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full text-[10px] font-black text-white tracking-widest uppercase backdrop-blur-sm border border-white/10">
                       {paymentSuccessData.paymentMethod}
                     </div>
                   </>
                )}
              </div>
              
              <button onClick={() => setPaymentSuccessData(null)} className="absolute top-6 right-6 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors backdrop-blur-sm">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-8 bg-[#FDFDFB]">
              {/* Story Selection */}
              {(shopSettings?.receipt_story_mode || shopSettings?.opening_hours?.receipt_story_mode) && (shopSettings?.receipt_stories?.length > 0 || shopSettings?.opening_hours?.receipt_stories?.length > 0) && (
                <div className="mb-8 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 text-center">{locale === 'en' ? 'Story Mode Options' : locale === 'zh' ? '故事模式选项' : 'ตัวเลือกเรื่องเล่าท้ายบิล'}</label>
                  <div className="relative group">
                    <select
                      value={selectedStoryIndex}
                      onChange={(e) => setSelectedStoryIndex(Number(e.target.value))}
                      className="w-full h-14 pl-5 pr-12 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-bold text-[#1A1A18] outline-none hover:border-gray-200 focus:border-black focus:ring-0 transition-all appearance-none cursor-pointer"
                    >
                      <option value={-1}>{locale === 'en' ? '🎲 Random Chapter' : locale === 'zh' ? '🎲 随机章节' : '🎲 สุ่มตอน (Random Chapter)'}</option>
                      {(shopSettings?.receipt_stories || shopSettings?.opening_hours?.receipt_stories || []).map((story: any, idx: number) => (
                        <option key={idx} value={idx}>📖 {story.title}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-black transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 w-full">
                <div className="flex gap-4">
                  <button
                    onClick={() => handlePrintKitchen()}
                    className="flex-1 h-16 bg-white border-2 border-gray-100 rounded-2xl text-gray-600 font-black tracking-widest hover:border-[#1A1A18] hover:text-[#1A1A18] hover:bg-gray-50 hover:shadow-md transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
                  >
                    <Printer size={20} />
                    <span className="text-[10px] uppercase">{locale === 'en' ? 'Kitchen' : locale === 'zh' ? '厨房' : 'ครัว (Kitchen)'}</span>
                  </button>
                  <button
                    onClick={() => handlePrintReceipt()}
                    className="flex-1 h-16 bg-[#1A1A18] border-2 border-[#1A1A18] rounded-2xl text-white font-black tracking-widest hover:bg-black hover:shadow-lg hover:shadow-black/20 transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
                  >
                    <Printer size={20} />
                    <span className="text-[10px] uppercase">{locale === 'en' ? 'Receipt' : locale === 'zh' ? '收据' : 'ใบเสร็จ (Receipt)'}</span>
                  </button>
                </div>
                <button
                  onClick={() => setPaymentSuccessData(null)}
                  className="w-full h-16 bg-gray-100 border-2 border-transparent rounded-2xl text-gray-500 font-black tracking-[0.2em] uppercase hover:bg-gray-200 hover:text-[#1A1A18] transition-all mt-2 active:scale-95"
                >
                  {locale === 'en' ? 'Next Order' : locale === 'zh' ? '下一个订单' : 'ออเดอร์ถัดไป (Next Order)'}
                </button>
              </div>
            </div>
            {/* Global Print Area */}
            <div id="print-area" className={printMode !== 'none' ? 'fixed left-[-9999px] top-[-9999px] print:static print:left-auto print:top-auto' : 'hidden'}>
              {printMode === 'receipt' && (
                <POSReceipt
                  orderNumber={paymentSuccessData.orderNumber}
                  orderType={paymentSuccessData.orderType || orderType}
                  orderSource={paymentSuccessData.orderSource}
                  deliveryPlatform={paymentSuccessData.deliveryPlatform}
                  referenceName={paymentSuccessData.referenceName}
                  receiptStoryMode={shopSettings?.receipt_story_mode || shopSettings?.opening_hours?.receipt_story_mode}
                  receiptStories={shopSettings?.receipt_stories || shopSettings?.opening_hours?.receipt_stories || []}
                  receiptFooter={shopSettings?.receipt_footer}
                  receiptPaymentQrImage={shopSettings?.opening_hours?.receipt_payment_qr_image || shopSettings?.receipt_payment_qr_image}
                  tableNumber={paymentSuccessData.tableNumber}
                  customerName={paymentSuccessData.customerName}
                  items={paymentSuccessData.items}
                  subtotal={paymentSuccessData.subtotal}
                  discount={paymentSuccessData.discount}
                  tax={paymentSuccessData.tax}
                  serviceCharge={paymentSuccessData.serviceCharge}
                  total={paymentSuccessData.total}
                  paymentMethod={paymentSuccessData.paymentMethod}
                  paidAmount={paymentSuccessData.received}
                  change={paymentSuccessData.change}
                  timestamp={paymentSuccessData.timestamp}
                  cashierName={profile?.display_name || profile?.first_name || 'Staff'}
                />
              )}
              {printMode === 'kitchen' && (
                <POSKitchenTicket
                  orderNumber={paymentSuccessData.orderNumber}
                  queueNumber={paymentSuccessData.queueNumber}
                  orderType={paymentSuccessData.orderType || orderType}
                  deliveryPlatform={paymentSuccessData.deliveryPlatform}
                  referenceName={paymentSuccessData.referenceName}
                  comment={paymentSuccessData.comment || paymentSuccessData.notes || ''}
                  pickupTime={paymentSuccessData.pickupTime || ''}
                  tableNumber={paymentSuccessData.tableNumber}
                  items={paymentSuccessData.items}
                  timestamp={paymentSuccessData.timestamp}
                />
              )}
            </div>
          </div>
        </div>
      )}

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

      <POSPromotionsModal 
        isOpen={showPromotionsModal}
        onClose={() => setShowPromotionsModal(false)}
        onPromotionsChanged={fetchPromotions}
        shopSettings={shopSettings}
      />

      {/* ITEM DISCOUNT MODAL */}
      <AnimatePresence>
        {itemDiscountModalItem && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-[#1A1A18]">
                      ส่วนลดเฉพาะรายการ
                    </h3>
                    <p className="mt-1 text-sm font-bold text-gray-400">
                      {getPrimaryMenuName(itemDiscountModalItem)} x {itemDiscountModalItem.quantity}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setItemDiscountModalItem(null)
                      setItemDiscountValue('')
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:bg-gray-200 hover:text-black active:scale-95"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-400">
                      ประเภทส่วนลด
                    </label>
                    <div className="flex rounded-xl bg-gray-100 p-1">
                      <button
                        onClick={() => setItemDiscountType('fixed')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                          itemDiscountType === 'fixed'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-500 hover:text-black'
                        }`}
                      >
                        ลดเป็นบาท (฿)
                      </button>
                      <button
                        onClick={() => setItemDiscountType('percent')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                          itemDiscountType === 'percent'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-500 hover:text-black'
                        }`}
                      >
                        ลดเปอร์เซ็นต์ (%)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-400">
                      มูลค่าส่วนลด
                    </label>
                    <div className="relative">
                      <div className="absolute bottom-0 left-6 top-0 flex items-center text-2xl font-black text-gray-300 pointer-events-none">
                        {itemDiscountType === 'fixed' ? '฿' : '%'}
                      </div>
                      <input
                        type="number"
                        value={itemDiscountValue}
                        onChange={e => setItemDiscountValue(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 text-center text-3xl font-black text-[#1A1A18] transition-all focus:border-[#1A1A18] focus:bg-white focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-400">
                      โปรโมชั่นที่เปิดใช้งาน (Auto-fill)
                    </label>
                    {activePromotions.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {activePromotions.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setItemDiscountType(p.discount_type)
                              setItemDiscountValue(String(p.discount_value))
                              setItemDiscountReason(`โปรโมชั่น: ${p.name}`)
                            }}
                            className="flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 hover:scale-[0.98] active:scale-95"
                          >
                            <Tag size={12} className="fill-emerald-500 text-emerald-600" />
                            {p.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mb-4 text-[11px] font-bold text-gray-400 italic bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">ไม่มีโปรโมชั่นที่เปิดใช้งาน</div>
                    )}

                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-400">
                      เหตุผล (หมายเหตุ)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {['ใช้แต้มแลก (Points)', 'ส่วนลดพนักงาน (Staff)', 'ลูกค้าประจำ'].map(reason => (
                        <button
                          key={reason}
                          onClick={() => setItemDiscountReason(reason)}
                          className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${
                            itemDiscountReason === reason
                              ? 'bg-[#1A1A18] text-white shadow-sm'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black'
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                    <input
                        type="text"
                        value={itemDiscountReason}
                        onChange={e => setItemDiscountReason(e.target.value)}
                        placeholder="ระบุเหตุผลอื่นๆ..."
                        className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 p-3 text-sm font-bold text-[#1A1A18] transition-all focus:border-[#1A1A18] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 sm:p-8">
                <button
                  onClick={applyItemDiscount}
                  disabled={!itemDiscountValue || Number(itemDiscountValue) <= 0}
                  className={`relative flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all ${
                    !itemDiscountValue || Number(itemDiscountValue) <= 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-500 text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,0.5)] hover:bg-emerald-600 hover:shadow-lg active:scale-95'
                  }`}
                >
                  <Tag size={18} />
                  ยืนยันส่วนลดรายการ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BILL DISCOUNT MODAL */}
      <AnimatePresence>
        {showBillDiscountModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-[#1A1A18]">
                      ส่วนลดทั้งบิล
                    </h3>
                    <p className="mt-1 text-sm font-bold text-gray-400">
                      จัดการโปรโมชั่นหรือส่วนลดท้ายบิล
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBillDiscountModal(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:bg-gray-200 hover:text-black active:scale-95"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-400">
                      ประเภทส่วนลด
                    </label>
                    <div className="flex rounded-xl bg-gray-100 p-1">
                      <button
                        onClick={() => setBillDiscountModalType('fixed')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                          billDiscountModalType === 'fixed'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-500 hover:text-black'
                        }`}
                      >
                        ลดเป็นบาท (฿)
                      </button>
                      <button
                        onClick={() => setBillDiscountModalType('percent')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                          billDiscountModalType === 'percent'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-500 hover:text-black'
                        }`}
                      >
                        ลดเปอร์เซ็นต์ (%)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-400">
                      มูลค่าส่วนลด
                    </label>
                    <div className="relative">
                      <div className="absolute bottom-0 left-6 top-0 flex items-center text-2xl font-black text-gray-300 pointer-events-none">
                        {billDiscountModalType === 'fixed' ? '฿' : '%'}
                      </div>
                      <input
                        type="number"
                        value={billDiscountInput}
                        onChange={e => setBillDiscountInput(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 text-center text-3xl font-black text-[#1A1A18] transition-all focus:border-[#1A1A18] focus:bg-white focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-400">
                      โปรโมชั่นที่เปิดใช้งาน (Auto-fill)
                    </label>
                    {activePromotions.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {activePromotions.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setBillDiscountModalType(p.discount_type)
                              setBillDiscountInput(String(p.discount_value))
                              setBillDiscountReason(`โปรโมชั่น: ${p.name}`)
                            }}
                            className="flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 hover:scale-[0.98] active:scale-95"
                          >
                            <Tag size={12} className="fill-emerald-500 text-emerald-600" />
                            {p.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mb-4 text-[11px] font-bold text-gray-400 italic bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">ไม่มีโปรโมชั่นที่เปิดใช้งาน</div>
                    )}

                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-400">
                      เหตุผล (หมายเหตุ)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {['โปรโมชั่น/ส่วนลด', 'ใช้แต้มแลก (Points)', 'ส่วนลดพนักงาน (Staff)', 'ลูกค้าประจำ'].map(reason => (
                        <button
                          key={reason}
                          onClick={() => setBillDiscountReason(reason)}
                          className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${
                            billDiscountReason === reason
                              ? 'bg-[#1A1A18] text-white shadow-sm'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black'
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                    <input
                        type="text"
                        value={billDiscountReason}
                        onChange={e => setBillDiscountReason(e.target.value)}
                        placeholder="ระบุเหตุผลอื่นๆ..."
                        className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 p-3 text-sm font-bold text-[#1A1A18] transition-all focus:border-[#1A1A18] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 sm:p-8">
                <button
                  onClick={applyBillDiscount}
                  disabled={!billDiscountInput || Number(billDiscountInput) <= 0}
                  className={`relative flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all ${
                    !billDiscountInput || Number(billDiscountInput) <= 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-500 text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,0.5)] hover:bg-emerald-600 hover:shadow-lg active:scale-95'
                  }`}
                >
                  <Tag size={18} />
                  ยืนยันส่วนลดทั้งบิล
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GLOBAL PRINT STYLES */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-area, #print-area * {
            visibility: visible !important;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0;
            padding: 0;
          }
          @page { size: 80mm auto; margin: 0; }
          html, body {
            background: transparent !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* FLYING ANIMATIONS */}
      <AnimatePresence>
        {flyingItems.map((fi) => {
          let targetX = window.innerWidth / 2;
          let targetY = window.innerHeight;

          const desktopPanel = document.getElementById('desktop-cart-panel');
          const mobileBtn = document.getElementById('mobile-cart-button');

          if (window.innerWidth >= 1024 && desktopPanel) { // lg breakpoint
            const rect = desktopPanel.getBoundingClientRect();
            targetX = rect.left + 40; 
            targetY = rect.top + 80;
          } else if (mobileBtn && mobileBtn.offsetParent !== null) {
            const rect = mobileBtn.getBoundingClientRect();
            targetX = rect.left + rect.width / 2;
            targetY = rect.top + rect.height / 2;
          }

          return (
            <motion.div
              key={fi.id}
              initial={{ x: fi.x, y: fi.y, scale: 1, opacity: 1 }}
              animate={{ x: targetX, y: targetY, scale: 0.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed z-[9999] pointer-events-none rounded-full shadow-2xl overflow-hidden"
              style={{ 
                width: '60px', 
                height: '60px', 
                marginTop: '-30px', 
                marginLeft: '-30px',
                backgroundColor: fi.imageUrl ? 'transparent' : '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {fi.imageUrl ? (
                <img src={fi.imageUrl} className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-4 h-4 bg-black rounded-full" />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
