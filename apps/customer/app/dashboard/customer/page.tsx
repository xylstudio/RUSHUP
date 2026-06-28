'use client';
import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { format, isSameDay, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { timeZonesNames } from '@vvo/tzdb'
import WebsiteLanguageSettings from '@/components/settings/WebsiteLanguageSettings'
import CustomerSectionNav from '@/components/customer/CustomerSectionNav'
import CustomerReportDetailPanel from '@/components/customer/CustomerReportDetailPanel'
import CustomerOrderDetailPanel from '@/components/customer/CustomerOrderDetailPanel'
import {
  Activity,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Clock,
  CloudSun,
  FileText,
  Calendar,
  Heart,
  Home,
  Leaf,
  Loader2,
  MapPin,
  ShoppingBag,
  Sparkles,
  Sprout,
  Star,
  User,
  Wrench,
  X,
  Plus,
  Search,
  type LucideIcon,
} from 'lucide-react'
import XYLLoader from '@/components/loaders/XYLLoader'
import CustomerReportFeed from '@/components/customer/CustomerReportFeed'
import GardenCalendar from '@/components/customer/GardenCalendar'
import CustomerOverview from '@/components/customer/CustomerOverview'
import CustomerOnboardingTour from '@/components/customer/CustomerOnboardingTour'
import CustomerPremiumNav from '@/components/customer/CustomerPremiumNav'
import CustomerServices from '@/components/customer/CustomerServices'
import CustomerMarketplace from '@/components/customer/CustomerMarketplace'
import CustomerNotifications from '@/components/customer/CustomerNotifications'
import CustomerProfile from '@/components/customer/CustomerProfile'
import CustomerHouses from '@/components/customer/CustomerHouses'
import CustomerDocuments from '@/components/customer/CustomerDocuments'
import PropertyPortfolioTable from '@/components/customer/PropertyPortfolioTable'
import { useAuth } from '@/lib/AuthContext'
import { useI18n } from '@/lib/I18nContext'
import {
  buildCustomerReportSummary,
  extractCustomerReportTasks,
  type CustomerReportItem,
  type CustomerReportSummary,
  formatCustomerReportDate,
  formatCustomerReportDateTime,
  getCustomerReportStatusText,
  getCustomerReportSummaryText,
} from '@/lib/customerReports'
import { formatCurrencyByLocale, formatDateByLocale, formatDateTimeByLocale } from '@/lib/localeFormat'
import {
  calculatePricingSummary,
  getAvailablePricingPeriods,
  getRecommendedPriceTemplate,
  type PeriodAwarePriceTemplate,
} from '@/lib/servicePricing'
import {
  createHouse,
  getCustomerHouses,
  getDocuments,
  getMarketplacePlants,
  getOrdersWithDetails,
  getServices,
  supabase,
  type Document,
  type House,
  type MarketplacePlant,
  type OrderWithDetails,
  type Service,
} from '@/lib/supabaseClient'
import { getCustomerServiceFlow, isFollowUpOrder } from '@/lib/serviceFlow'
import { getSystemFeatures, DEFAULT_SYSTEM_FEATURES, type SystemFeatures } from '@/lib/supabaseClient'

type TabId = 'overview' | 'orders' | 'reports' | 'documents' | 'marketplace' | 'profile' | 'notifications' | 'houses'
type PriceTemplate = PeriodAwarePriceTemplate

type ProgressItem = {
  order_status?: string | null
  is_assigned?: boolean
  assignment_status?: string | null
  assigned_at?: string | null
  accepted_at?: string | null
  staff_name?: string | null
  staff_phone?: string | null
}

// --- Infographic Components ---

const InfographicMetric = ({ value, label, sublabel, trend }: { value: number, label: string | number, sublabel: string, trend?: string }) => {
  return (
    <div className="flex flex-col p-6 bg-white border border-[#F0EFEB] hover:border-[#AF907A] transition-all duration-500 group">
      <div className="flex items-end justify-between mb-4">
        <span className="font-serif-thai text-5xl md:text-6xl font-light tracking-tighter text-[#111111] group-hover:text-[#AF907A] transition-colors">{label}</span>
        {trend && <span className="text-[9px] font-bold text-[#214031] bg-[#214031]/5 px-2 py-1 uppercase tracking-widest">{trend}</span>}
      </div>
      <div className="h-px w-full bg-[#F0EFEB] mb-4" />
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A3A3A3]">{sublabel}</div>
    </div>
  )
}

const HorizontalDateScroller = ({ selectedDate, onDateSelect, reports, locale }: { selectedDate: Date, onDateSelect: (d: Date) => void, reports: CustomerReportItem[], locale: string }) => {
  const dfnsLocale = locale === 'th' ? th : enUS
  const days = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 14 }).map((_, i) => addDays(today, i - 7))
  }, [])

  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto pb-8 pt-2">
      {days.map((day) => {
        const active = isSameDay(day, selectedDate)
        const hasReports = reports.some(r => isSameDay(new Date(r.createdAt || r.updatedAt), day))

        return (
          <button
            key={day.toISOString()}
            onClick={() => onDateSelect(day)}
            className={`relative flex h-24 w-16 shrink-0 flex-col items-center justify-center transition-all duration-500 ${
              active 
                ? 'bg-[#111111] text-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] scale-110 z-10' 
                : 'bg-white text-[#111111] border border-[#F0EFEB] opacity-60 hover:opacity-100'
            }`}
          >
            <div className={`text-[8px] font-bold uppercase tracking-[0.2em] mb-1 ${active ? 'text-[#AF907A]' : 'text-[#A3A3A3]'}`}>
              {format(day, 'EEE', { locale: dfnsLocale })}
            </div>
            <div className="text-xl font-serif-thai font-light">{format(day, 'd')}</div>
            {hasReports && !active && (
              <div className="absolute bottom-3 w-1 h-1 rounded-full bg-[#AF907A]" />
            )}
          </button>
        )
      })}
    </div>
  )
}
const AdvancedPropertyAuditGrid = ({ houses, reports, viewDate, locale }: { houses: House[], reports: CustomerReportItem[], viewDate: Date, locale: string }) => {
  const isThai = locale === 'th'
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {houses.map(house => {
        const houseReports = reports.filter(r => r.houseId === house.id || r.houseCode === house.house_code)
        const currentMonthReports = houseReports.filter(r => isSameMonth(new Date(r.createdAt || r.updatedAt), viewDate))
        const latestReport = houseReports[0]
        const healthTrend = houseReports.length >= 2 
          ? (houseReports[0].rating || 0) - (houseReports[1].rating || 0)
          : 0
        
        return (
          <div key={house.id} className="bg-white border border-[#F0EFEB] p-8 flex flex-col justify-between group hover:border-[#111111] transition-all duration-500">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#AF907A]">{house.house_code || 'PROPERTY'}</span>
                <div className={`flex items-center gap-2 px-3 py-1 text-[8px] font-bold uppercase tracking-widest ${currentMonthReports.length > 0 ? 'bg-[#1A3626]/5 text-[#1A3626]' : 'bg-[#AF907A]/5 text-[#AF907A]'}`}>
                   {currentMonthReports.length > 0 ? (isThai ? 'ดูแลแล้ว' : 'SERVICED') : (isThai ? 'รอดำเนินการ' : 'PENDING')}
                </div>
              </div>
              <h4 className="font-serif-thai text-3xl font-light text-[#111111] leading-tight">{house.name}</h4>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#F9F8F4]">
                 <div className="space-y-1">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-[#A3A3A3]">{isThai ? 'ครั้งล่าสุด' : 'LATEST VISIT'}</span>
                    <p className="text-[11px] font-bold text-[#111111]">{latestReport ? formatCustomerReportDate(latestReport.createdAt || latestReport.updatedAt, locale) : '-'}</p>
                 </div>
                 <div className="space-y-1">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-[#A3A3A3]">{isThai ? 'สุขภาพสวน' : 'GARDEN HEALTH'}</span>
                    <div className="flex items-center gap-1.5">
                       <p className="text-[11px] font-bold text-[#111111]">{latestReport?.rating ? `${latestReport.rating}/5` : '-'}</p>
                       {healthTrend !== 0 && (
                         <div className={healthTrend > 0 ? 'text-[#1A3626]' : 'text-[#AF907A]'}>
                            {healthTrend > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                         </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between">
               <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`w-6 h-1 ${i < currentMonthReports.length ? 'bg-[#1A3626]' : 'bg-[#F0EFEB]'}`} />
                  ))}
               </div>
               <span className="text-[9px] font-bold text-[#A3A3A3] uppercase tracking-widest">{currentMonthReports.length} VISITS IN {format(viewDate, 'MMM', { locale: isThai ? th : enUS })}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const DesignerTypewriter = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1))
      i++
      if (i === text.length) {
        clearInterval(timer)
      }
    }, 30)
    return () => clearInterval(timer)
  }, [text])

  return (
    <div className="py-4 thai-vowel-fix">
      <h1 className="customer-editorial-title !mt-0 !text-5xl uppercase md:!text-7xl">
        {displayedText}
        <span className="ml-3 inline-block h-[0.7em] w-[2px] animate-pulse align-middle bg-[var(--customer-ink)]" />
      </h1>
    </div>
  )
}

const emptySummary: CustomerReportSummary = buildCustomerReportSummary([])

const queryData = async <T,>(promise: Promise<{ data: T; error: unknown }>) => {
  const result = await promise
  if (result.error) throw result.error
  return result.data
}

const fetchAuthorizedJson = async <T,>(path: string) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(path, {
    method: 'GET',
    headers: {
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    credentials: 'include',
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || 'Request failed')
  }

  return payload as T
}

const getOrderTone = (status?: string | null) => {
  switch (status) {
    case 'completed':
      return 'bg-[#edf6ef] text-[#24543a]'
    case 'in_progress':
      return 'bg-[#1f3b2f] text-white'
    case 'confirmed':
      return 'bg-[#f2efe8] text-[#4a433d]'
    case 'cancelled':
      return 'bg-[#f5e9e6] text-[#8d4d43]'
    case 'pending':
    default:
      return 'bg-[#f6f1e7] text-[#7c6754]'
  }
}

const getOrderStatusText = (status: string | null | undefined, locale: 'th' | 'en' | 'zh') => {
  const fallback = status || '-'
  const labels = {
    pending: { th: 'รอดำเนินการ', en: 'Pending', zh: '待处理' },
    confirmed: { th: 'ยืนยันแล้ว', en: 'Confirmed', zh: '已确认' },
    in_progress: { th: 'กำลังดำเนินการ', en: 'In progress', zh: '进行中' },
    completed: { th: 'เสร็จสิ้น', en: 'Completed', zh: '已完成' },
    cancelled: { th: 'ยกเลิก', en: 'Cancelled', zh: '已取消' },
  } as const

  if (!status || !(status in labels)) return fallback
  return labels[status as keyof typeof labels][locale]
}

const getDocumentTypeLabel = (type: string | null | undefined, locale: 'th' | 'en' | 'zh') => {
  const labels = {
    contract: { th: 'สัญญา', en: 'Contract', zh: '合同' },
    invoice: { th: 'ใบแจ้งหนี้', en: 'Invoice', zh: '发票' },
    receipt: { th: 'ใบเสร็จ', en: 'Receipt', zh: '收据' },
    report: { th: 'รายงาน', en: 'Report', zh: '报告' },
    photo: { th: 'ภาพถ่าย', en: 'Photo', zh: '照片' },
    quotation: { th: 'ใบเสนอราคา', en: 'Quotation', zh: '报价单' },
    plant_material: { th: 'Plant Material', en: 'Plant Material', zh: '植物材料' },
    other: { th: 'เอกสาร', en: 'Document', zh: '文件' },
  } as const

  return labels[(type || 'other') as keyof typeof labels]?.[locale] || labels.other[locale]
}

const getSafePlantImage = (plant: Partial<MarketplacePlant>) => {
  if (plant.image_url && plant.image_url.startsWith('http')) return plant.image_url

  // Deterministic high-end fallback gallery
  const fallbacks = [
    'https://images.unsplash.com/photo-1597055181300-e3633a207519?w=800&q=80',
    'https://images.unsplash.com/photo-1501004318641-729e4933a522?w=800&q=80',
    'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&q=80',
    'https://images.unsplash.com/photo-1463320726281-696a485928c7?w=800&q=80',
    'https://images.unsplash.com/photo-1416870230247-d0a997a3c96b?w=800&q=80'
  ]
  const idx = plant.id ? Math.abs(plant.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % fallbacks.length : 0
  return fallbacks[idx]
}

const getHouseSubtitle = (house: House, locale: 'th' | 'en' | 'zh') => {
  const area = house.area_size ? `${house.area_size} sqm` : locale === 'en' ? 'Area pending' : locale === 'zh' ? '面积待确认' : 'รอยืนยันขนาดพื้นที่'
  const type = house.house_type || (locale === 'en' ? 'Property' : locale === 'zh' ? '地点' : 'สถานที่')
  return `${type} • ${area}`
}

const getOrderHouseLabel = (order: OrderWithDetails, fallback: string) => {
  const looseOrder = order as OrderWithDetails & { house_name?: string | null }
  return order.houses?.name || looseOrder.house_name || order.house_code || fallback
}

const getOrderServiceLabel = (order: OrderWithDetails, fallback: string) => {
  const looseOrder = order as OrderWithDetails & { service_name?: string | null }
  return order.services?.service_name || looseOrder.service_name || fallback
}

const DASHBOARD_COPY = {
  th: {
    morning: 'สวัสดี',
    upcoming: 'งานถัดไป',
    aiDoctor: 'AI วินิจฉัยต้นไม้',
    catalog: 'บริการ',
    step01: 'ขั้นที่ 01',
    step02: 'ขั้นที่ 02',
    step03: 'ขั้นที่ 03',
    step04: 'ขั้นที่ 04',
    chooseService: 'เลือกบริการ',
    selectProperty: 'เลือกอสังหาริมทรัพย์',
    pricingPeriod: 'ราคาและระยะเวลา',
    paymentConfirm: 'ชำระเงิน & ยืนยัน',
    back: 'ย้อนกลับ',
    searchPlaceholder: 'ค้นหาบริการ...',
    startsAt: 'เริ่มต้นที่',
    addFirstHome: 'เพิ่มที่พักแรกของคุณ',
    billingMode: 'รูปแบบการชำระ',
    gardenArea: 'ขนาดสวน',
    matchedPackages: 'แพ็คเกจที่แนะนำ',
    personalizedQuote: 'ราคาเฉพาะคุณ',
    basedOnSqm: 'คำนวณจาก',
    continuePayment: 'ต่อไปยังการชำระเงิน',
    confirmingText: 'กำลังยืนยัน...',
    proceedPayment: 'ดำเนินการชำระเงิน',
    secureCheckout: 'ชำระเงินอย่างปลอดภัยโดย Xylem Landscape',
    propertyLabel: 'อสังหาริมทรัพย์',
    planLabel: 'แพ็คเกจ',
    billingLabel: 'รูปแบบ',
    totalLabel: 'ยอดรวม',
    methodLabel: 'วิธีชำระ',
    bankTransfer: 'โอนเงิน',
    promptPayQr: 'QR Code PromptPay',
    promptPayHint: 'สแกนจ่ายผ่าน QR Code บน Stripe Checkout',
    cardHint: 'ชำระด้วยบัตรบน Stripe Checkout',
    notesPlaceholder: 'หมายเหตุถึงทีมงาน...',
    trackingTitle: 'ติดตาม',
    gardenReport: 'รายงานสวน',
    shopTitle: 'สินค้า',
    boutiqueTitle: 'สินค้า',
    exclusiveItems: 'รายการพิเศษ',
    rareCollection: 'คอลเลกชันหายาก',
    browseAll: 'ดูทั้งหมด',
    allCat: 'ทั้งหมด',
    treesCat: 'ไม้ยืนต้น',
    shrubsCat: 'ไม้พุ่ม',
    potsCat: 'กระถาง',
    soilCat: 'ดินและปุ๋ย',
    indoorCat: 'ไม้ในร่ม',
    addToCart: 'สั่งซื้อสินค้า',
    stockAvailable: 'มีสินค้าพร้อมส่ง',
    stockOut: 'สินค้าหมดชั่วคราว',
    specSheet: 'ข้อมูลทางพฤกษศาสตร์',
    docsTitle: 'เอกสาร',
    gardenReports: 'วารสารพฤกษศาสตร์',
    history: 'ประวัติ',
    nextCareVisit: 'นัดดูแลถัดไป',
    recentActivity: 'กิจกรรมล่าสุด',
    scheduledSoon: 'กำหนดเร็วๆ นี้',
    theMarketplace: 'The Marketplace',
    viewAll2: 'ดูทั้งหมด',
    curatedPieces: 'รายการคัดสรร',
    selectedForYou: 'เลือกสรรมาเพื่อคุณ',
    shopCollection: 'Xylem Selection',
    storage: 'เอกสารทั้งหมด',
    totalDocsLabel: 'เล่ม',
    updatesTitle: 'อัปเดต',
    allCaughtUp: 'ไม่มีการแจ้งเตือนใหม่',
    notificationLabel: 'การแจ้งเตือน',
    estatesTitle: 'ที่พัก',
    homes: 'บ้านของคุณ',
    oneTime: 'ครั้งเดียว',
    monthly: 'รายเดือน',
    yearly: 'รายปี',
    maintenanceCat: 'ดูแลรักษา',
    priority: 'ความด่วน',
    normal: 'ปกติ',
    urgent: 'ด่วนมาก (+20%)',
    priceBreakdown: 'รายละเอียดราคา',
    monthlySubtotal: 'ราคาเฉลี่ยต่อเดือน',
    periodSavings: 'ประหยัดไป',
    yearlyOffer: 'โปรโมชั่นรายปี จ่ายเพียง 10 เดือน!',
    greeting: 'สวัสดี',
    title: 'Customer Dashboard',
    subtitle: 'ภาพรวมงานดูแลสวน บ้าน เอกสาร และสินค้าในที่เดียว',
    refreshError: 'โหลดข้อมูลบางส่วนไม่สำเร็จ',
    overview: 'ภาพรวม',
    orders: 'งาน',
    reports: 'รายงาน',
    documents: 'เอกสาร',
    marketplace: 'ร้านต้นไม้',
    profile: 'โปรไฟล์',
    yourHomes: 'บ้านของคุณ',
    activeOrders: 'งานที่กำลังเดินอยู่',
    completedOrders: 'งานที่เสร็จแล้ว',
    nextVisit: 'นัดถัดไป',
    recentOrders: 'งานล่าสุด',
    latestReports: 'รายงานล่าสุด',
    reportOverview: 'ดูรายงานล่าสุดก่อน แล้วค่อยเปิดรายละเอียดเต็มในครั้งเดียว',
    previousReports: 'รายงานก่อนหน้า',
    openLatestReport: 'เปิดรายงานล่าสุด',
    fullReport: 'ข้อมูลรายงานทั้งหมด',
    reportLog: 'บันทึกการดูแล',
    reportVisuals: 'ภาพหน้างาน',
    reportSummaryLabel: 'สรุปการดูแล',
    reportWorkDoneLabel: 'งานที่ทำ',
    reportIssuesLabel: 'สิ่งที่พบ',
    reportAdviceLabel: 'คำแนะนำจากทีม',
    reportTimestamp: 'วันเวลารายงาน',
    reportStaff: 'ผู้ดูแล',
    reportBeforeLabel: 'ก่อนดูแล',
    reportAfterLabel: 'หลังดูแล',
    reportNoBefore: 'ไม่มีภาพก่อนดูแล',
    reportNoAfter: 'ไม่มีภาพหลังดูแล',
    reportNoData: 'ไม่พบข้อมูลรายงาน',
    reportScheduledNote: 'หมายเหตุนัดถัดไป',
    reportNextVisitLabel: 'นัดดูแลครั้งถัดไป',
    docCenter: 'เอกสารล่าสุด',
    featuredPlants: 'แนะนำจาก marketplace',
    featuredServices: 'บริการที่พร้อมจอง',
    viewAll: 'ดูทั้งหมด',
    openDetails: 'เปิดรายละเอียด',
    openMarketplace: 'เปิดร้านต้นไม้',
    goServices: 'ไปหน้าจองบริการ',
    goReports: 'ดูรายงานทั้งหมด',
    goDocs: 'ดูเอกสารทั้งหมด',
    loading: 'กำลังโหลดแดชบอร์ด...',
    noHomes: 'ยังไม่มีบ้านในระบบ',
    noOrders: 'ยังไม่มีคำสั่งซื้อ',
    noReports: 'ยังไม่มีรายงาน',
    noDocuments: 'ยังไม่มีเอกสาร',
    noPlants: 'ยังไม่มีสินค้าพร้อมแสดง',
    noServices: 'ยังไม่มีบริการที่เปิดใช้งาน',
    assigned: 'พนักงานดูแล',
    waitingAssign: 'กำลังรอมอบหมายทีมงาน',
    latestUpdate: 'อัปเดตล่าสุด',
    uploaded: 'อัปโหลดเมื่อ',
    serviceArea: 'พื้นที่บริการ',
    from: 'เริ่มต้น',
    browseHomes: 'จัดการบ้าน',
    addHome: 'เพิ่มบ้าน',
    addHomeHint: 'สร้างโปรไฟล์บ้านใหม่เพื่อจองงาน วัดพื้นที่ และติดตามเอกสารได้ครบในที่เดียว',
    schedule: 'นัดหมาย',
    totalDocs: 'เอกสารทั้งหมด',
    summaryHealthy: 'สถานะล่าสุด',
    latestWork: 'สรุปงานล่าสุด',
    total: 'ทั้งหมด',
    properties: 'หลัง',
    reportsCount: 'รายงาน',
    docsCount: 'เอกสาร',
    items: 'รายการ',
    servicesCount: 'บริการ',
    introduction: 'บทนำ',
    estates: 'สถานที่',
    archive: 'คลังข้อมูล',
    summary: 'สรุปข้อมูล',
    homePriority: 'สิ่งสำคัญตอนนี้',
    homePriorityDetail: 'เปิดหน้าแล้วควรเห็นงานที่กำลังเดินอยู่ นัดถัดไป และรายงานล่าสุดได้ทันที',
    activePropertyLabel: 'บ้านที่กำลังโฟกัส',
    noUpcomingVisit: 'ยังไม่มีนัดถัดไป',
    nextStep: 'สิ่งที่ควรทำต่อ',
    openCurrentOrder: 'เปิดงานปัจจุบัน',
    reviewLatestUpdate: 'ดูอัปเดตล่าสุด',
    startFromProperty: 'เริ่มจากเพิ่มบ้าน',
    secondaryBrowse: 'ดูต่อ',
    activeWorkSnapshot: 'งานที่ต้องดูต่อ',
    primaryFocus: 'โครงการหลัก',
    collection: 'คอลเลกชัน',
    footprint: 'ขนาดพื้นที่',
    identity: 'ข้อมูลหลัก',
    memberLabel: 'สมาชิก',
    managedAccount: 'บัญชีผู้ใช้',
    updatesAlerts: 'ข่าวสารและอัปเดต',
    uiConfig: 'การแสดงผล',
    terminateSession: 'ออกจากระบบ',
    latestVisit: 'นัดหมายล่าสุด',
    processing: 'กำลังดำเนินการ',
    billingPeriod: 'รอบการชำระเงิน',
    sqmSpace: 'ตร.ม.',
    estimate: 'ราคาประเมิน',
    subtotal: 'ยอดรวม',
    specialNotes: 'หมายเหตุเพิ่มเติม',
    totalDue: 'ยอดที่ต้องชำระ',
    creditCard: 'บัตรเครดิต/เดบิต',
    step: 'ขั้นตอน',
    confirmAndPay: 'ยืนยันและชำระเงิน',
    billing: 'รอบบิล',
    architectural: 'ภูมิทัศน์และสถาปัตยกรรม',
    selectPlan: 'เลือกแพ็กเกจ',
    serviceMaintenanceTitle: 'ระบบจองปิดปรับปรุงชั่วคราว',
    serviceMaintenanceDesc: 'เรากำลังพัฒนาระบบเพื่อเพิ่มประสิทธิภาพการจอง คาดว่าจะเปิดให้บริการอีกครั้งเร็วๆ นี้ ขออภัยในความไม่สะดวกค่ะ',
    marketplaceMaintenanceTitle: 'ร้านค้ากำลังเตรียมเปิดตัว',
    marketplaceMaintenanceDesc: 'สินค้าใหม่กำลังเดินทางมาถึงร้านค้าของเรา เร็วๆ นี้คุณจะสามารถสั่งซื้อได้ตามปกติค่ะ',
    unnamedHouse: 'บ้านที่ยังไม่ได้ตั้งชื่อ',
    noAddressData: 'ไม่มีข้อมูลที่อยู่',
    noHouseData: 'ไม่มีข้อมูลบ้าน',
    pleaseAddHouseData: 'กรุณาเพิ่มข้อมูลบ้าน',
    recently: 'เมื่อเร็วๆ นี้',
    managedProjects: 'โครงการที่ดูแล',
    operation: 'การปฏิบัติงาน',
    sessions: 'ครั้ง',
    awaitingAppointment: 'รอนัดหมาย',
    activityLog: 'บันทึกกิจกรรม',
    historicalRecords: 'ประวัติย้อนหลัง',
    noRecentActivity: 'ไม่มีกิจกรรมล่าสุด',
    selectProject: 'เลือกโครงการ',
    projectStatus: 'สถานะโครงการ',
    activeOperation: 'ดำเนินการอยู่',
    nextScheduledDate: 'หมายกำหนดการถัดไป',
    serviceCatalog: 'สารบัญ / บริการ',
    serviceDescPlaceholder: 'บริการดูแลและจัดสวนโดยทีมงานมืออาชีพ',
    siteAssessment: 'ประเมินหน้างาน',
    serviceInfo: 'ข้อมูลบริการ',
    bookAppointment: 'จองวันนัดหมาย',
    newsUpdates: 'ข่าวสารและการแจ้งเตือน',
    stockAvailable: 'พร้อมจัดส่ง',
    specSheet: 'ข้อมูลทางพฤกษศาสตร์',
    addToCart: 'เพิ่มในรายการคัดสรร',
    plantDetailDescription: 'คัดสรรพรรณไม้เกรดพรีเมียมเพื่อความสมบูรณ์แบบของสถาปัตยกรรมภูมิสถาปัตย์ มีความแข็งแรงทนทานและต้องการการดูแลในระดับที่เหมาะสม',
    unitLabel: 'หน่วย',
    careLevelLabel: 'ระดับการดูแล',
    singleRootPack: 'ต้นเดี่ยว',
    curatedRoutine: 'ดูแลตามปกติ',
    inquiryToast: 'เพิ่มในรายการคัดสรรแล้ว',
    stepLabel: 'ขั้นตอน',
    urgentPriority: 'เร่งด่วนพิเศษ',
    searchPlaceholder: 'ค้นหาบริการ...',
    confirmingText: 'กำลังยืนยัน...',
    selectService: 'เลือกบริการ',
    selectProperty: 'เลือกบ้าน',
    matchedPackages: 'แพ็กเกจที่แนะนำ',
    priority: 'ระดับความสำคัญ',
    continuePayment: 'ดำเนินการต่อ',
    methodLabel: 'ช่องทางการชำระเงิน',
    promptPayQr: 'พร้อมเพย์ QR Code',
    promptPayHint: 'ชำระผ่านแอปธนาคารทุกแห่ง',
    cardHint: 'ชำระผ่านบัตรเครดิตหรือเดบิต',
    notesPlaceholder: 'ระบุข้อมูลเพิ่มเติมถึงทีมงาน...',
    oneTime: 'ครั้งเดียว',
    monthly: 'รายเดือน',
    yearly: 'รายปี',
    gardenArea: 'ขนาดพื้นที่สวน',
    normal: 'ปกติ',
    urgent: 'ด่วน',
    completed: 'เสร็จสมบูรณ์',
    accountSettings: 'การตั้งค่าบัญชี',
    personalInfo: 'ข้อมูลส่วนตัว',
    personalInfoDesc: 'แก้ไขชื่อ และข้อมูลติดต่อของคุณ',
    myEstates: 'สถานที่ของฉัน',
    myEstatesDesc: 'จัดการบ้าน และที่อยู่รับบริการ',
    generalSettings: 'การตั้งค่าทั่วไป',
    lineNotificationTitle: 'การแจ้งเตือนผ่าน LINE',
    lineConnected: 'เชื่อมต่อแล้ว',
    lineNotConnected: 'ยังไม่ได้เชื่อมต่อการแจ้งเตือน',
    languageSystem: 'ภาษาและระบบ',
    changeLanguage: 'เปลี่ยนภาษา',
    languageDesc: 'ตั้งค่าการแสดงผลและภาษาที่ใช้',
    securityLabel: 'ความปลอดภัย',
    securityDesc: 'จัดการรหัสผ่านและการเข้าถึง',
    logoutLabel: 'ออกจากระบบ (Logout)',
    editPersonalInfo: 'แก้ไขข้อมูลส่วนตัว',
    lineNotificationHeader: 'การแจ้งเตือน LINE',
    languageSettingsTitle: 'ตั้งค่าภาษา',
    displayNameLabel: 'ชื่อที่แสดง',
    displayNamePlaceholder: 'ระบุชื่อ-นามสกุลของคุณ',
    phoneNumberLabel: 'เบอร์โทรศัพท์ติดต่อ',
    phonePlaceholder: '08X XXX XXXX',
    contactAddressLabel: 'ที่อยู่ติดต่อ',
    addressPlaceholder: 'ระบุที่อยู่สำหรับการจัดส่งหรือติดต่อ...',
    saveChanges: 'บันทึกการเปลี่ยนแปลง',
    savingChanges: 'กำลังบันทึก...',
    serviceConnected: 'เชื่อมต่อบริการแล้ว',
    notConnected: 'ยังไม่ได้เชื่อมต่อ',
    lineConnectDesc: 'เชื่อมต่อเพื่อรับการแจ้งเตือนสถานะงานดูแลสวนแบบเรียลไทม์ผ่าน LINE Official Account ของเรา',
    updateConnection: 'อัปเดตการเชื่อมต่อ',
    connectLineNow: 'เชื่อมต่อ LINE ทันที',
    selectLanguageDesc: 'เลือกภาษาที่ใช้ในระบบ',
    passwordManagement: 'การจัดการรหัสผ่าน',
    passwordDesc: 'การเปลี่ยนรหัสผ่านเป็นประจำช่วยเพิ่มความปลอดภัยให้กับบัญชีของคุณ',
    changePassword: 'เปลี่ยนรหัสผ่านใหม่',
    savedSuccessfully: 'บันทึกข้อมูลเรียบร้อยแล้ว',
    pendingOrder: 'รอดำเนินการ',
    inProgressOrder: 'กำลังดำเนินการ',
    confirmedOrder: 'ยืนยันแล้ว',
    completedOrder: 'เสร็จสมบูรณ์',
    newUpdate: 'อัปเดตใหม่',
    noNewNotifications: 'ไม่มีการแจ้งเตือนใหม่',
    serviceBullet1: '• ประเมินพื้นที่และให้คำปรึกษาฟรี',
    serviceBullet2: '• เลือกใช้วัสดุออร์แกนิก ปลอดภัยต่อผู้อยู่อาศัย',
    serviceBullet3: '• มีระบบติดตามผลหลังการให้บริการ',
  },
  en: {
    activityLog: 'Activity Log',
    historicalRecords: 'Historical Records',
    noRecentActivity: 'No recent activity',
    awaitingAppointment: 'Awaiting Appointment',
    selectProject: 'Select Project',
    projectStatus: 'Project Status',
    activeOperation: 'Active Operation',
    nextScheduledDate: 'Next Scheduled Date',
    serviceCatalog: 'Service Catalog',
    serviceDescPlaceholder: 'Professional landscaping and gardening services',
    siteAssessment: 'Site Assessment',
    serviceInfo: 'Service Information',
    bookAppointment: 'Book Appointment',
    newsUpdates: 'News & Updates',
    stockAvailable: 'In Stock',
    specSheet: 'Botanical Specification',
    addToCart: 'Add to Collection',
    plantDetailDescription: 'Premium selected plants for perfect landscaping architecture. Durable and requires appropriate care.',
    unitLabel: 'Unit',
    careLevelLabel: 'Care Level',
    singleRootPack: 'Single Root',
    curatedRoutine: 'Curated Routine',
    inquiryToast: 'Added to collection',
    stepLabel: 'Step',
    urgentPriority: 'Urgent Priority',
    morning: 'Good morning',
    upcoming: 'Upcoming',
    aiDoctor: 'AI Plant Doctor',
    catalog: 'Catalog',
    step01: 'Step 01',
    step02: 'Step 02',
    step03: 'Step 03',
    step04: 'Step 04',
    chooseService: 'What shall we nurture?',
    selectProperty: 'Select Property',
    pricingPeriod: 'Pricing & Period',
    paymentConfirm: 'Payment & Confirm',
    back: 'Back',
    searchPlaceholder: 'Find a service...',
    startsAt: 'Starts at',
    addFirstHome: 'Add your first home',
    billingMode: 'Billing Mode',
    gardenArea: 'Garden Area',
    matchedPackages: 'Matched Packages',
    personalizedQuote: 'Personalized Quote',
    basedOnSqm: 'Based on',
    continuePayment: 'Continue to Payment',
    confirmingText: 'Confirming...',
    proceedPayment: 'Proceed to Payment',
    secureCheckout: 'Secure Checkout by Xylem Landscape',
    propertyLabel: 'Property',
    planLabel: 'Plan',
    billingLabel: 'Billing',
    totalLabel: 'Total',
    methodLabel: 'Method',
    bankTransfer: 'Bank Transfer',
    promptPayQr: 'PromptPay QR',
    promptPayHint: 'Pay by scanning a QR code in Stripe Checkout',
    cardHint: 'Pay by card in Stripe Checkout',
    notesPlaceholder: 'Notes for our team...',
    trackingTitle: 'Tracking',
    gardenReport: 'Garden Report',
    shopTitle: 'Shop',
    boutiqueTitle: 'Shop',
    exclusiveItems: 'Exclusive Items',
    rareCollection: 'The Rare Collection',
    browseAll: 'Browse All',
    allCat: 'All',
    treesCat: 'Trees',
    shrubsCat: 'Shrubs',
    potsCat: 'Pots',
    soilCat: 'Soil & Feed',
    indoorCat: 'Indoor',
    addToCart: 'Add to Cart',
    stockAvailable: 'In Stock',
    stockOut: 'Out of Stock',
    specSheet: 'Botanical Specification',
    docsTitle: 'Docs',
    gardenReports: 'Garden Reports',
    history: 'History',
    nextCareVisit: 'Next Care Visit',
    recentActivity: 'Recent Activity',
    scheduledSoon: 'Scheduled Soon',
    theMarketplace: 'The Marketplace',
    viewAll2: 'View All',
    curatedPieces: 'Curated Pieces',
    selectedForYou: 'Selected for you',
    shopCollection: 'Xylem Selection',
    storage: 'Storage',
    totalDocsLabel: 'docs',
    updatesTitle: 'Updates',
    allCaughtUp: "You're all caught up",
    notificationLabel: 'Notification',
    estatesTitle: 'Estates',
    homes: 'Homes',
    oneTime: 'One-time',
    monthly: 'Monthly',
    yearly: 'Yearly',
    maintenanceCat: 'Maintenance',
    greeting: 'Hello',
    title: 'Customer Dashboard',
    subtitle: 'A single place for garden jobs, properties, documents, and plants.',
    refreshError: 'Some dashboard data could not be loaded',
    overview: 'Overview',
    orders: 'Orders',
    reports: 'Reports',
    documents: 'Documents',
    marketplace: 'Marketplace',
    profile: 'Profile',
    yourHomes: 'Your Properties',
    activeOrders: 'Active jobs',
    completedOrders: 'Completed jobs',
    nextVisit: 'Next visit',
    recentOrders: 'Recent orders',
    latestReports: 'Latest reports',
    reportOverview: 'Review the latest update first, then open the full report in one step.',
    previousReports: 'Previous reports',
    openLatestReport: 'Open latest report',
    fullReport: 'Full report details',
    reportLog: 'Care log',
    reportVisuals: 'Site photos',
    reportSummaryLabel: 'Care summary',
    reportWorkDoneLabel: 'Work completed',
    reportIssuesLabel: 'Observations',
    reportAdviceLabel: 'Team recommendation',
    reportTimestamp: 'Reported at',
    reportStaff: 'Handled by',
    reportBeforeLabel: 'Before service',
    reportAfterLabel: 'After service',
    reportNoBefore: 'No before photos',
    reportNoAfter: 'No after photos',
    reportNoData: 'Report data missing.',
    reportScheduledNote: 'Next visit note',
    reportNextVisitLabel: 'Next care visit',
    docCenter: 'Latest documents',
    featuredPlants: 'Marketplace picks',
    featuredServices: 'Services ready to book',
    viewAll: 'View all',
    openDetails: 'Open details',
    openMarketplace: 'Open marketplace',
    goServices: 'Open booking',
    goReports: 'View all reports',
    goDocs: 'View all documents',
    loading: 'Loading dashboard...',
    noHomes: 'No properties yet',
    noOrders: 'No orders yet',
    noReports: 'No reports yet',
    noDocuments: 'No documents yet',
    noPlants: 'No items available yet',
    noServices: 'No active services yet',
    assigned: 'Assigned staff',
    waitingAssign: 'Waiting for staff assignment',
    latestUpdate: 'Latest update',
    uploaded: 'Uploaded',
    serviceArea: 'Service area',
    from: 'From',
    browseHomes: 'Manage properties',
    addHome: 'Add property',
    addHomeHint: 'Create a new property profile for bookings, measurements, and document tracking in one place.',
    schedule: 'Schedule',
    totalDocs: 'Total docs',
    summaryHealthy: 'Latest status',
    latestWork: 'Latest work summary',
    total: 'total',
    properties: 'properties',
    reportsCount: 'reports',
    docsCount: 'docs',
    items: 'items',
    servicesCount: 'services',
    priority: 'Priority',
    normal: 'Normal',
    urgent: 'Urgent (+20%)',
    priceBreakdown: 'Price Breakdown',
    monthlySubtotal: 'Monthly Subtotal',
    periodSavings: 'Savings',
    yearlyOffer: 'Yearly Deal: Pay for 10 Months!',
    introduction: 'Introduction',
    estates: 'Estates',
    archive: 'Archive',
    summary: 'Summary',
    homePriority: 'Current priorities',
    homePriorityDetail: 'Open the dashboard and understand active work, the next visit, and the latest update at a glance.',
    activePropertyLabel: 'Focused property',
    noUpcomingVisit: 'No upcoming visit yet',
    nextStep: 'Next step',
    openCurrentOrder: 'Open current order',
    reviewLatestUpdate: 'Review latest update',
    startFromProperty: 'Start by adding a property',
    secondaryBrowse: 'Browse next',
    activeWorkSnapshot: 'Work to keep moving',
    primaryFocus: 'Primary Focus',
    collection: 'Collection',
    footprint: 'Footprint',
    identity: 'Identity',
    memberLabel: 'Member',
    managedAccount: 'Managed Account',
    updatesAlerts: 'Updates & Alerts',
    uiConfig: 'UI Configuration',
    terminateSession: 'Terminate Session',
    latestVisit: 'Latest Visit',
    processing: 'Processing',
    billingPeriod: 'Billing Period',
    sqmSpace: 'SQM Space',
    estimate: 'Estimate',
    subtotal: 'Subtotal',
    specialNotes: 'Special Notes',
    totalDue: 'Total due',
    creditCard: 'Credit Card',
    step: 'Step',
    confirmAndPay: 'Confirm & Pay',
    billing: 'Billing',
    architectural: 'Architectural',
    selectPlan: 'Select Plan',
    serviceMaintenanceTitle: 'Booking System Under Maintenance',
    serviceMaintenanceDesc: 'We are currently upgrading our booking system to serve you better. Please check back soon.',
    marketplaceMaintenanceTitle: 'Marketplace Coming Soon',
    marketplaceMaintenanceDesc: 'Our boutique shop is currently being restocked. Check back later for our new collection.',
    accountSettings: 'Account Settings',
    personalInfo: 'Personal Information',
    personalInfoDesc: 'Edit your name and contact details',
    myEstates: 'My Estates',
    myEstatesDesc: 'Manage properties and service addresses',
    generalSettings: 'General Settings',
    lineNotificationTitle: 'LINE Notifications',
    lineConnected: 'Connected',
    lineNotConnected: 'Not connected',
    languageSystem: 'Language & System',
    changeLanguage: 'Change Language',
    languageDesc: 'Display and language preferences',
    securityLabel: 'Security',
    securityDesc: 'Manage password and access',
    logoutLabel: 'Logout',
    editPersonalInfo: 'Edit Personal Info',
    lineNotificationHeader: 'LINE Notifications',
    languageSettingsTitle: 'Language Settings',
    displayNameLabel: 'Display Name',
    displayNamePlaceholder: 'Enter your full name',
    phoneNumberLabel: 'Phone Number',
    phonePlaceholder: 'e.g. +66 8X XXX XXXX',
    contactAddressLabel: 'Contact Address',
    addressPlaceholder: 'Enter your delivery or contact address...',
    saveChanges: 'Save Changes',
    savingChanges: 'Saving...',
    serviceConnected: 'Service Connected',
    notConnected: 'Not Connected',
    lineConnectDesc: 'Connect your LINE account to receive real-time updates on your garden maintenance.',
    updateConnection: 'Update Connection',
    connectLineNow: 'Connect LINE Now',
    selectLanguageDesc: 'Select system language',
    passwordManagement: 'Password Management',
    passwordDesc: 'Regularly updating your password helps keep your account secure.',
    changePassword: 'Change Password',
    savedSuccessfully: 'Saved successfully',
    pendingOrder: 'Pending',
    inProgressOrder: 'In Progress',
    confirmedOrder: 'Confirmed',
    completedOrder: 'Completed',
    newUpdate: 'New Update',
    noNewNotifications: 'No new notifications',
    serviceBullet1: '• Free site assessment & consultation',
    serviceBullet2: '• Organic and safe materials used',
    serviceBullet3: '• Post-service tracking system',
  },
  zh: {
    activityLog: '活动日志',
    historicalRecords: '历史记录',
    noRecentActivity: '没有最近活动',
    awaitingAppointment: '等待预约',
    selectProject: '选择项目',
    projectStatus: '项目状态',
    activeOperation: '进行中',
    nextScheduledDate: '下一次安排日期',
    serviceCatalog: '服务目录',
    serviceDescPlaceholder: '专业的园林绿化和园艺服务',
    siteAssessment: '现场评估',
    serviceInfo: '服务信息',
    bookAppointment: '预约时间',
    newsUpdates: '新闻与更新',
    stockAvailable: '有现货',
    specSheet: '植物规格',
    addToCart: '加入收藏',
    plantDetailDescription: '精选优质植物，打造完美的景观建筑。耐用且需要适当护理。',
    unitLabel: '单位',
    careLevelLabel: '护理级别',
    singleRootPack: '单根',
    curatedRoutine: '日常护理',
    inquiryToast: '已加入收藏',
    stepLabel: '步骤',
    urgentPriority: '特急处理',
    morning: '您好',
    upcoming: '即将到来',
    aiDoctor: 'AI植物医生',
    catalog: '服务目录',
    step01: '第 01 步',
    step02: '第 02 步',
    step03: '第 03 步',
    step04: '第 04 步',
    chooseService: '选择服务',
    selectProperty: '选择地点',
    pricingPeriod: '价格与周期',
    paymentConfirm: '付款确认',
    back: '返回',
    searchPlaceholder: '搜索服务...',
    startsAt: '起价',
    addFirstHome: '添加您的第一个地点',
    billingMode: '付款方式',
    gardenArea: '园区面积',
    matchedPackages: '匹配套餐',
    personalizedQuote: '个性化报价',
    basedOnSqm: '基于',
    continuePayment: '继续付款',
    confirmingText: '确认中...',
    proceedPayment: '去付款',
    secureCheckout: 'Xylem Landscape 安全结账',
    propertyLabel: '地点',
    planLabel: '套餐',
    billingLabel: '账单',
    totalLabel: '合计',
    methodLabel: '方式',
    bankTransfer: '银行转账',
    promptPayQr: 'PromptPay 二维码',
    promptPayHint: '通过 Stripe Checkout 扫码支付',
    cardHint: '通过 Stripe Checkout 使用银行卡支付',
    notesPlaceholder: '填写给团队的备注...',
    trackingTitle: '追踪',
    gardenReport: '园艺报告',
    boutiqueTitle: '精品',
    shopTitle: '精品',
    exclusiveItems: '独家商品',
    rareCollection: '稀有系列',
    browseAll: '查看全部',
    allCat: '全部',
    treesCat: '乔木',
    shrubsCat: '灌木',
    potsCat: '花盆',
    soilCat: '土壤与肥料',
    indoorCat: '室内植物',
    addToCart: '加入购物车',
    stockAvailable: '有现货',
    stockOut: '暂时缺货',
    specSheet: '植物规格',
    docsTitle: '文件',
    gardenReports: '园艺报告',
    history: '历史',
    nextCareVisit: '下次养护',
    recentActivity: '近期动态',
    scheduledSoon: '即将安排',
    theMarketplace: '商城',
    viewAll2: '查看全部',
    curatedPieces: '精选商品',
    selectedForYou: '为您精选',
    boutiqueCollection: '精品系列',
    shopCollection: 'Xylem 精选',
    storage: '文件库',
    totalDocsLabel: '份',
    updatesTitle: '通知',
    allCaughtUp: '没有新通知',
    notificationLabel: '通知',
    estatesTitle: '地点',
    homes: '地点',
    oneTime: '单次',
    monthly: '每月',
    yearly: '每年',
    maintenanceCat: '养护',
    priority: '优先级',
    normal: '普通',
    urgent: '加急 (+20%)',
    priceBreakdown: '价格明细',
    monthlySubtotal: '每月平均价格',
    periodSavings: '节省',
    yearlyOffer: '年度优惠：只需支付10个月！',
    greeting: '您好',
    title: '客户仪表板',
    subtitle: '在一个页面中查看养护工单、地点、文档和植物商品。',
    refreshError: '部分仪表板数据加载失败',
    overview: '总览',
    orders: '工单',
    reports: '报告',
    documents: '文件',
    marketplace: '商城',
    profile: '个人资料',
    yourHomes: '您的地点',
    activeOrders: '进行中的工单',
    completedOrders: '已完成工单',
    nextVisit: '下次到访',
    recentOrders: '最近工单',
    latestReports: '最新报告',
    reportOverview: '先看最新更新，再一键打开完整报告。',
    previousReports: '历史报告',
    openLatestReport: '打开最新报告',
    fullReport: '完整报告详情',
    reportLog: '养护记录',
    reportVisuals: '现场照片',
    reportSummaryLabel: '养护摘要',
    reportWorkDoneLabel: '已完成工作',
    reportIssuesLabel: '现场发现',
    reportAdviceLabel: '团队建议',
    reportTimestamp: '报告时间',
    reportStaff: '负责人员',
    reportBeforeLabel: '养护前',
    reportAfterLabel: '养护后',
    reportNoBefore: '暂无养护前照片',
    reportNoAfter: '暂无养护后照片',
    reportNoData: '缺少报告数据。',
    reportScheduledNote: '下次到访备注',
    reportNextVisitLabel: '下次养护时间',
    docCenter: '最新文件',
    featuredPlants: '商城推荐',
    featuredServices: '可预约服务',
    viewAll: '查看全部',
    openDetails: '打开详情',
    openMarketplace: '打开商城',
    goServices: '打开预约',
    goReports: '查看全部报告',
    goDocs: '查看全部文档',
    loading: '正在加载仪表板...',
    noHomes: '暂无地点',
    noOrders: '暂无工单',
    noReports: '暂无报告',
    noDocuments: '暂无文件',
    noPlants: '暂无可展示商品',
    noServices: '暂无启用服务',
    assigned: '负责员工',
    waitingAssign: '等待分配员工',
    latestUpdate: '最近更新',
    uploaded: '上传时间',
    serviceArea: '服务面积',
    from: '起价',
    browseHomes: '管理地点',
    addHome: '新增地点',
    addHomeHint: '新增地点档案后即可在同一处预约服务、提交测量与追踪文件。',
    schedule: '预约',
    totalDocs: '文件总数',
    summaryHealthy: '最新状态',
    latestWork: '最近工作摘要',
    total: '总计',
    properties: '个地点',
    reportsCount: '份报告',
    docsCount: '份文件',
    items: '件商品',
    servicesCount: '项服务',
    introduction: '引言',
    estates: '地点资产',
    archive: '档案',
    summary: '摘要',
    homePriority: '当前重点',
    homePriorityDetail: '打开首页后，应立即看清当前工单、下次到访和最近更新。',
    activePropertyLabel: '当前关注地点',
    noUpcomingVisit: '暂无下次到访',
    nextStep: '下一步',
    openCurrentOrder: '打开当前工单',
    reviewLatestUpdate: '查看最新更新',
    startFromProperty: '先添加地点',
    secondaryBrowse: '继续浏览',
    activeWorkSnapshot: '需要继续跟进的工作',
    primaryFocus: '主要项目',
    collection: '系列',
    footprint: '占地面积',
    identity: '身份信息',
    memberLabel: '会员',
    managedAccount: '受管理账户',
    updatesAlerts: '更新与提醒',
    uiConfig: '界面设置',
    terminateSession: '退出登录',
    latestVisit: '最近到访',
    processing: '处理中',
    billingPeriod: '账期',
    sqmSpace: '平方米',
    estimate: '估价',
    subtotal: '小计',
    specialNotes: '备注',
    totalDue: '应付总额',
    creditCard: '信用卡',
    step: '步骤',
    confirmAndPay: '确认并付款',
    billing: '账单',
    architectural: '景观设计',
    selectPlan: '选择方案',
    accountSettings: '账户设置',
    personalInfo: '个人信息',
    personalInfoDesc: '编辑您的姓名和联系方式',
    myEstates: '我的地点',
    myEstatesDesc: '管理房产和服务地址',
    generalSettings: '通用设置',
    lineNotificationTitle: 'LINE 通知',
    lineConnected: '已连接',
    lineNotConnected: '未连接',
    languageSystem: '语言与系统',
    changeLanguage: '更改语言',
    languageDesc: '显示与语言偏好',
    securityLabel: '安全',
    securityDesc: '管理密码和访问权限',
    logoutLabel: '退出登录',
    editPersonalInfo: '编辑个人信息',
    lineNotificationHeader: 'LINE 通知',
    languageSettingsTitle: '语言设置',
    displayNameLabel: '显示名称',
    displayNamePlaceholder: '输入您的全名',
    phoneNumberLabel: '电话号码',
    phonePlaceholder: '例如 +66 8X XXX XXXX',
    contactAddressLabel: '联系地址',
    addressPlaceholder: '输入您的送货或联系地址...',
    saveChanges: '保存更改',
    savingChanges: '保存中...',
    serviceConnected: '服务已连接',
    notConnected: '未连接',
    lineConnectDesc: '连接您的 LINE 账户以接收园林养护的实时更新。',
    updateConnection: '更新连接',
    connectLineNow: '立即连接 LINE',
    selectLanguageDesc: '选择系统语言',
    passwordManagement: '密码管理',
    passwordDesc: '定期更新密码有助于保护您的账户安全。',
    changePassword: '修改密码',
    savedSuccessfully: '保存成功',
    pendingOrder: '待处理',
    inProgressOrder: '进行中',
    confirmedOrder: '已确认',
    completedOrder: '已完成',
    newUpdate: '新更新',
    noNewNotifications: '没有新通知',
    serviceBullet1: '• 免费现场评估与咨询',
    serviceBullet2: '• 使用有机和安全材料',
    serviceBullet3: '• 服务后跟踪系统',
  },
}

const getShortName = (name?: string | null) => {
  if (!name) return ''
  return name.trim().split(/\s+/)[0] || ''
}

export default function CustomerDashboardPage() {
  const { profile, loading: authLoading } = useAuth()
  const { locale: contextLocale } = useI18n()
  const locale = contextLocale || 'th'
  const copy = DASHBOARD_COPY[locale] || DASHBOARD_COPY.th
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const searchParams = useSearchParams()
  const router = useRouter()

  const houseHeroTintByIndex = [
    'from-[#E4BBAE] via-[#F8F3ED] to-[#FDFBF9]',
    'from-[#D89885] via-[#E4BBAE] to-[#F8F3ED]',
    'from-[#84A59D] via-[#FAF3F0] to-[#FFFFFF]',
    'from-[#596A5A] via-[#84A59D] to-[#FAF3F0]',
  ]

  const getMobilePageClass = (tabId: TabId) => {
    const pageIdx = mobileTabs.findIndex((item) => item.id === tabId)
    const activeIdx = mobileTabs.findIndex((item) => item.id === activeTab)

    if (pageIdx === activeIdx) return 'active-page'
    if (pageIdx < activeIdx) return 'pushed-back'
    return 'waiting-right'
  }

  const handleTabChange = useCallback((tabId: TabId) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tabId === 'overview') {
      params.delete('tab')
      router.push('/dashboard/customer', { scroll: false })
    } else {
      params.set('tab', tabId)
      router.push(`/dashboard/customer?${params.toString()}`, { scroll: false })
    }
  }, [router, searchParams])

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as TabId
    if (!tabFromUrl) {
      setActiveTab('overview')
      return
    }
    const validTabs: TabId[] = ['overview', 'orders', 'reports', 'notifications', 'documents', 'marketplace', 'profile', 'houses']
    if (validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
      
      // If we are switching to reports, check for houseId filter
      if (tabFromUrl === 'reports') {
        const houseIdFromUrl = searchParams.get('houseId')
        if (houseIdFromUrl) {
          setActiveFilterHouseId(houseIdFromUrl)
        }
      }
    }
  }, [searchParams])

  const [showOnboardingTour, setShowOnboardingTour] = useState(false)

  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      setShowOnboardingTour(true)
      // Clean up the URL parameter
      const params = new URLSearchParams(searchParams.toString())
      params.delete('welcome')
      router.replace(`/dashboard/customer?${params.toString()}`, { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    const paymentStatus = searchParams.get('payment_status')
    if (!paymentStatus) return

    setActiveTab('orders')

    if (paymentStatus === 'success') {
      triggerToast('Stripe payment completed. Refreshing your orders.', 'fa-circle-check')
      void fetchAuthorizedJson<{ success?: boolean; data?: OrderWithDetails[] }>(`/api/customer/orders?_t=${Date.now()}`)
        .then((res) => setOrders((res as any)?.data || []))
        .catch(() => { })
    } else if (paymentStatus === 'cancel') {
      triggerToast('Stripe checkout was cancelled.', 'fa-circle-xmark')
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'orders')
    params.delete('payment_status')
    params.delete('session_id')
    params.delete('order_id')

    const nextUrl = params.toString()
      ? `/dashboard/customer?${params.toString()}`
      : '/dashboard/customer'

    router.replace(nextUrl, { scroll: false })
  }, [router, searchParams])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [houses, setHouses] = useState<House[]>([])
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [reports, setReports] = useState<CustomerReportItem[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewDate, setViewDate] = useState(new Date())
  const [reportSummary, setReportSummary] = useState<CustomerReportSummary>(emptySummary)
  const [documents, setDocuments] = useState<Document[]>([])
  const [plants, setPlants] = useState<MarketplacePlant[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [priceTemplates, setPriceTemplates] = useState<PriceTemplate[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, ProgressItem>>({})
  const [notifications, setNotifications] = useState<any[]>([])
  const [features, setFeatures] = useState<SystemFeatures>(DEFAULT_SYSTEM_FEATURES)

  // Booking Flow State
  const [bookingStep, setBookingStep] = useState(1)
  const [selectedHouseForBooking, setSelectedHouseForBooking] = useState<House | null>(null)
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<Service | null>(null)
  const [selectedTemplateForBooking, setSelectedTemplateForBooking] = useState<PriceTemplate | null>(null)
  const [bookingArea, setBookingArea] = useState(0)
  const [bookingNotes, setBookingNotes] = useState('')
  const [bookingPeriod, setBookingPeriod] = useState<'monthly' | 'yearly' | 'one-time'>('monthly')
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
  const [bookingSearch, setBookingSearch] = useState('')
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState<'stripe' | 'promptpay'>('promptpay')
  const [bookingPriority, setBookingPriority] = useState<'normal' | 'urgent'>('normal')
  const [showInlineHouseComposer, setShowInlineHouseComposer] = useState(false)
  const [isCreatingBookingHouse, setIsCreatingBookingHouse] = useState(false)
  const [bookingHouseError, setBookingHouseError] = useState('')
  const [bookingHouseDraft, setBookingHouseDraft] = useState({ name: '', address: '', areaSize: '' })
  const [isEstatesOpen, setIsEstatesOpen] = useState(false)
  const [activeHouseId, setActiveHouseId] = useState<string | null>(null)
  const [activeSheet, setActiveSheet] = useState<'reports' | 'marketplace' | 'documents' | 'houses' | 'orders' | 'order-detail' | null>(null)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [selectedPlant, setSelectedPlant] = useState<MarketplacePlant | null>(null)
  const [selectedReport, setSelectedReport] = useState<CustomerReportItem | null>(null)
  const [activeFilterHouseId, setActiveFilterHouseId] = useState<string | null>(null)
  const [shopCategory, setShopCategory] = useState<string>('all')

  const categories = useMemo(() => [
    { id: 'all', label: copy.allCat },
    { id: 'trees', label: copy.treesCat },
    { id: 'shrubs', label: copy.shrubsCat },
    { id: 'indoor', label: copy.indoorCat },
    { id: 'soil', label: copy.soilCat },
    { id: 'pots', label: copy.potsCat },
  ], [copy])

  const filteredPlants = useMemo(() => {
    if (shopCategory === 'all') return plants
    return plants.filter(p => p.category?.toLowerCase() === shopCategory.toLowerCase())
  }, [plants, shopCategory])

  const [rotatingVisitIndex, setRotatingVisitIndex] = useState(0)
  const [isNextVisitVisible, setIsNextVisitVisible] = useState(true)
  const [toast, setToast] = useState<{ message: string; icon: string; visible: boolean }>({
    message: '',
    icon: 'fa-circle-check',
    visible: false
  })

  const bookingServiceTemplates = useMemo(() => {
    if (!selectedServiceForBooking) return []
    return priceTemplates.filter((template) => String(template.service_id) === String(selectedServiceForBooking.id))
  }, [priceTemplates, selectedServiceForBooking])

  const availableBookingPeriods = useMemo(
    () => getAvailablePricingPeriods(selectedServiceForBooking, bookingServiceTemplates),
    [bookingServiceTemplates, selectedServiceForBooking]
  )

  const bookingPricingSummary = useMemo(
    () =>
      calculatePricingSummary({
        service: selectedServiceForBooking,
        templates: bookingServiceTemplates,
        selectedTemplate: selectedTemplateForBooking,
        area: bookingArea,
        period: bookingPeriod,
        priority: bookingPriority,
      }),
    [bookingArea, bookingPeriod, bookingPriority, bookingServiceTemplates, selectedServiceForBooking, selectedTemplateForBooking]
  )

  const triggerToast = (message: string, icon: string) => {
    setToast({ message, icon, visible: true })
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40)
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }))
    }, 2500)
  }

  useEffect(() => {
    const bookingHouseParam = searchParams.get('booking_house')
    if (!bookingHouseParam || houses.length === 0) return

    const targetHouse = houses.find((item) => item.id === bookingHouseParam || item.house_code === bookingHouseParam)
    if (!targetHouse) return

    const nextStepRaw = Number(searchParams.get('booking_step') || '1')
    const nextStep = Number.isFinite(nextStepRaw) && nextStepRaw >= 1 && nextStepRaw <= 4 ? nextStepRaw : 1

    setActiveTab('orders')
    setSelectedHouseForBooking(targetHouse)
    setBookingArea(typeof targetHouse.area_size === 'number' ? targetHouse.area_size : 100)
    setActiveHouseId(targetHouse.id)
    setBookingStep(nextStep)

    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'orders')
    params.delete('booking_house')
    params.delete('booking_step')

    const nextUrl = params.toString()
      ? `/dashboard/customer?${params.toString()}`
      : '/dashboard/customer'

    router.replace(nextUrl, { scroll: false })
  }, [houses, router, searchParams])

  const bookingHouseCopy = useMemo(() => {
    if (locale === 'en') {
      return {
        title: 'Add property inline',
        subtitle: 'Create a property here and continue booking without leaving this flow.',
        name: 'Property name',
        address: 'Address',
        area: 'Area (sq m)',
        create: 'Create property and continue',
        cancel: 'Cancel',
        open: 'Add new property here',
        success: 'Property created and selected for this booking.',
        nameRequired: 'Please enter a property name.',
        addressRequired: 'Please enter the service address.',
        areaRequired: 'Please enter a valid area size.',
      }
    }

    if (locale === 'zh') {
      return {
        title: '直接新增房产',
        subtitle: '无需离开当前流程，先创建房产再继续预约。',
        name: '房产名称',
        address: '地址',
        area: '面积（平方米）',
        create: '创建房产并继续',
        cancel: '取消',
        open: '在此新增房产',
        success: '房产已创建并用于本次预约。',
        nameRequired: '请输入房产名称。',
        addressRequired: '请输入服务地址。',
        areaRequired: '请输入有效面积。',
      }
    }

    return {
      title: 'เพิ่มที่พักในขั้นตอนนี้',
      subtitle: 'สร้างบ้านหรือสถานที่ใหม่ได้ทันที แล้วจองงานต่อโดยไม่ต้องออกจาก flow นี้',
      name: 'ชื่อสถานที่',
      address: 'ที่อยู่',
      area: 'ขนาดพื้นที่ (ตร.ม.)',
      create: 'สร้างสถานที่และไปต่อ',
      cancel: 'ยกเลิก',
      open: 'เพิ่มสถานที่ใหม่ที่นี่',
      success: 'สร้างสถานที่เรียบร้อยและเลือกให้กับการจองนี้แล้ว',
      nameRequired: 'กรุณาระบุชื่อสถานที่',
      addressRequired: 'กรุณาระบุที่อยู่สำหรับเข้าบริการ',
      areaRequired: 'กรุณาระบุขนาดพื้นที่ให้ถูกต้อง',
    }
  }, [locale])

  // Deep-linking & History Management for Reports
  useEffect(() => {
    if (loading) return
    const reportId = searchParams.get('reportId') || searchParams.get('id')
    const orderId = searchParams.get('orderId')

    // Handle Closing
    if (!reportId && !orderId && activeSheet === 'reports') {
      setActiveSheet(null)
      setSelectedReport(null)
      return
    }
    
    if (!orderId && activeSheet === 'order-detail') {
      setActiveSheet(null)
      return
    }

    let match: CustomerReportItem | undefined

    if (reportId) {
      match = reports.find(r => r.id === reportId)
    } else if (orderId) {
      // Find latest report for this order
      const orderReports = reports.filter(r => r.orderId === orderId || r.orderCode === orderId)
      if (orderReports.length > 0) {
        match = orderReports.sort((a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
        )[0]
      }
    }

    if (match) {
      // Only set if different to avoid infinite loops or unnecessary re-renders
      if (selectedReport?.id !== match.id) {
        setSelectedReport(match)
        setActiveSheet('reports')
        
        if (match.houseId) {
          setActiveHouseId(match.houseId)
        }
        setActiveTab('reports')
      }
    } else if (reportId) {
      // Admin testing or deep link for a specific report not in the active house's list
      // Admin testing or deep link for a specific report not in the active house's list
      const fetchSpecificReport = async () => {
        try {
          const { data, error } = await supabase
            .from('work_reports')
            .select(`
              id, order_id, job_assignment_id, customer_id, work_done, problems_found, recommendations, next_visit_date, next_visit_time_start, next_visit_time_end, next_visit_notes, before_photos, after_photos, zones, created_at, updated_at
            `)
            .eq('id', reportId)
            .single()

          if (!error && data) {
            let orderData = null
            let houseData = null
            let serviceData = null

            if (data.order_id) {
              const { data: oData } = await supabase
                .from('orders')
                .select('order_code, total_sessions, completed_sessions, houses(id, name, house_code, address), services(id, name, service_name)')
                .eq('id', data.order_id)
                .single()
              
              if (oData) {
                orderData = oData
                houseData = oData.houses ? (Array.isArray(oData.houses) ? oData.houses[0] : oData.houses) : null
                serviceData = oData.services ? (Array.isArray(oData.services) ? oData.services[0] : oData.services) : null
              }
            }

            const mappedReport = {
              id: data.id,
              orderId: data.order_id,
              orderCode: orderData?.order_code || null,
              houseId: houseData?.id || null,
              houseCode: houseData?.house_code || null,
              houseName: houseData?.name || 'ไม่ระบุชื่อบ้าน',
              houseAddress: houseData?.address || null,
              serviceName: serviceData?.service_name || serviceData?.name || 'บริการดูแลสวน',
              jobAssignmentId: data.job_assignment_id || null,
              workDone: data.work_done || null,
              problemsFound: data.problems_found || null,
              recommendations: data.recommendations || null,
              nextVisitDate: data.next_visit_date || null,
              nextVisitTimeStart: data.next_visit_time_start || null,
              nextVisitTimeEnd: data.next_visit_time_end || null,
              nextVisitNotes: data.next_visit_notes || null,
              beforePhotos: data.before_photos || [],
              afterPhotos: data.after_photos || [],
              zones: Array.isArray(data.zones) ? data.zones.map((z: any) => ({
                id: String(z.id || ''),
                name: String(z.name || ''),
                workDone: String(z.workDone || z.work_done || ''),
                photos: Array.isArray(z.photos) ? z.photos : [],
                beforePhotos: Array.isArray(z.before_photos) ? z.before_photos : (Array.isArray(z.beforePhotos) ? z.beforePhotos : []),
                afterPhotos: Array.isArray(z.after_photos) ? z.after_photos : (Array.isArray(z.afterPhotos) ? z.afterPhotos : []),
              })) : [],
              createdAt: data.created_at || null,
              updatedAt: data.updated_at || null,
              visitCountText: (orderData?.total_sessions) ? `${orderData?.completed_sessions || 0}/${orderData?.total_sessions}` : null
            } as CustomerReportItem

            if (selectedReport?.id !== mappedReport.id) {
              setSelectedReport(mappedReport)
              setActiveSheet('reports')
              if (mappedReport.houseId && activeHouseId !== mappedReport.houseId) {
                // Try to switch house if it exists
                setActiveHouseId(mappedReport.houseId)
              }
              setActiveTab('reports')
            }
          }
        } catch (err) {
          console.error(err)
        }
      }
      fetchSpecificReport()
    } else if (orderId) {
      if (activeSheet !== 'order-detail') {
        setActiveSheet('order-detail')
      }
    }
  }, [loading, reports, searchParams, selectedReport?.id, activeSheet, router, activeHouseId])

  useEffect(() => {
    if (authLoading) return
    if (!profile?.id) {
      setLoading(false)
      return
    }

    let ignore = false

    const loadDashboard = async () => {
      setLoading(true)
      setError('')

      const results = await Promise.allSettled([
        queryData(getCustomerHouses(profile.id)),
        queryData(getDocuments({ user_id: profile.id })),
        queryData(getMarketplacePlants()),
        queryData(getServices()),
        fetchAuthorizedJson<{ success?: boolean; data?: OrderWithDetails[] }>(`/api/customer/orders?_t=${Date.now()}`),
        // We will fetch reports separately to be house-specific
        fetchAuthorizedJson<{ progress?: Record<string, ProgressItem> }>(`/api/customer/orders/progress?_t=${Date.now()}`),
        fetchAuthorizedJson<{ data?: PriceTemplate[] }>(`/api/customer/price-templates?_t=${Date.now()}`),
        fetchAuthorizedJson<{ notifications?: any[] }>(`/api/notifications?limit=20&_t=${Date.now()}`),
        getSystemFeatures(),
      ])

      if (ignore) return

      const messages: string[] = []

      const housesResult = results[0]
      if (housesResult.status === 'fulfilled') {
        const fetchedHouses = housesResult.value || []
        setHouses(fetchedHouses)
        if (fetchedHouses.length === 0) {
            router.push('/dashboard/customer/houses/add-quick')
            return
        }
      } else {
        setHouses([])
        messages.push(`โหลดข้อมูลบางส่วนไม่สำเร็จ: ${housesResult.reason?.message || JSON.stringify(housesResult.reason)}`)
      }

      const docsResult = results[1]
      if (docsResult.status === 'fulfilled') {
        setDocuments(docsResult.value || [])
      } else {
        setDocuments([])
      }

      const plantsResult = results[2]
      if (plantsResult.status === 'fulfilled') {
        setPlants((plantsResult.value || []).filter((item) => item.is_active !== false))
      } else {
        setPlants([])
      }

      const servicesResult = results[3]
      if (servicesResult.status === 'fulfilled') {
        setServices(servicesResult.value || [])
      } else {
        setServices([])
      }

      const ordersResult = results[4]
      if (ordersResult.status === 'fulfilled') {
        setOrders((ordersResult.value as any)?.data || ordersResult.value || [])
      } else {
        setOrders([])
      }

      // Fix: results[5] was reports, now it's progress
      const progressResult = results[5]
      if (progressResult.status === 'fulfilled') {
        setProgressMap(progressResult.value?.progress || {})
      } else {
        setProgressMap({})
      }

      const templatesResult = results[6]
      if (templatesResult.status === 'fulfilled') {
        setPriceTemplates(templatesResult.value?.data || [])
      } else {
        setPriceTemplates([])
      }

      const notifsResult = results[7]
      if (notifsResult.status === 'fulfilled') {
        setNotifications(notifsResult.value?.notifications || [])
      } else {
        setNotifications([])
      }

      const featuresResult = results[8]
      if (featuresResult.status === 'fulfilled') {
        setFeatures(featuresResult.value?.data || DEFAULT_SYSTEM_FEATURES)
      }

      const failedIndexes = results
        .map((r, i) => r.status === 'rejected' ? i : null)
        .filter(n => n !== null)

      if (failedIndexes.length > 0) {
        console.error('Dashboard Sync Failures at indexes:', failedIndexes, results.filter(r => r.status === 'rejected'))
      }

      setError(messages[0] || '')
      setLoading(false)
    }

    void loadDashboard()

    return () => {
      ignore = true
    }
  }, [authLoading, copy.refreshError, profile?.id])

  // 🛡️ PROFESSIONAL LOGIC: Fetch house-specific reports when house changes
  useEffect(() => {
    if (!profile?.id || !activeHouseId) return
    let ignore = false

    const loadHouseReports = async () => {
      try {
        const data = await fetchAuthorizedJson<{ reports?: CustomerReportItem[]; summary?: CustomerReportSummary }>(
          `/api/customer/reports?houseId=${activeHouseId}&limit=120&_t=${Date.now()}`
        )
        if (ignore) return
        setReports(data.reports || [])
      } catch (err) {
        console.warn('Failed to load house-specific reports:', err)
        if (!ignore) setReports([])
      }
    }

    loadHouseReports()
    return () => { ignore = true }
  }, [activeHouseId, profile?.id])

  const tabs: { id: TabId; label: string; icon: LucideIcon }[] = useMemo(
    () => [
      { id: 'overview', label: copy.overview, icon: Home },
      { id: 'orders', label: copy.orders, icon: Wrench },
      { id: 'notifications', label: copy.notificationLabel, icon: Bell },
      { id: 'documents', label: copy.documents, icon: FileText },
      { id: 'marketplace', label: copy.marketplace, icon: ShoppingBag },
    ],
    [copy.documents, copy.marketplace, copy.orders, copy.overview, copy.notificationLabel]
  )

  const displayName = profile?.display_name || profile?.email || copy.title
  const shortName = getShortName(displayName)
  const activeHouse = useMemo(() => houses.find((item) => item.id === activeHouseId) || houses[0] || null, [activeHouseId, houses])
  const isThaiLocale = locale === 'th'
  const dfnsLocale = isThaiLocale ? th : enUS
  const localeCapsClass = isThaiLocale ? '' : 'uppercase'
  const localeLabelClass = isThaiLocale ? 'tracking-[0.08em]' : 'uppercase tracking-[0.22em]'
  const localeMicroLabelClass = isThaiLocale ? 'tracking-[0.04em]' : 'uppercase tracking-[0.18em]'
  const localeButtonClass = isThaiLocale ? 'tracking-[0.06em]' : 'uppercase tracking-[0.28em]'

  useEffect(() => {
    if (houses.length === 0) {
      setActiveHouseId(null)
      return
    }

    setActiveHouseId((current) => {
      if (current && houses.some((house) => house.id === current)) return current
      return houses[0]?.id || null
    })
  }, [houses])

  const houseScopedOrders = useMemo(() => {
    if (!activeHouse) return orders
    return orders.filter((item) => {
      return [item.house_id, item.house_code, item.houses?.id, item.houses?.house_code]
        .filter(Boolean)
        .some((value) => value === activeHouse.id || value === activeHouse.house_code)
    })
  }, [activeHouse, orders])

  const houseScopedReports = useMemo(() => {
    if (!activeHouse) return reports
    return reports.filter((item) => {
      return [item.houseId, item.houseCode]
        .filter(Boolean)
        .some((value) => value === activeHouse.id || value === activeHouse.house_code)
    })
  }, [activeHouse, reports])

  const houseScopedOrderIds = useMemo(() => new Set(houseScopedOrders.map((item) => item.id)), [houseScopedOrders])

  const houseScopedDocuments = useMemo(() => {
    if (!activeHouse || houseScopedOrderIds.size === 0) return documents
    return documents.filter((doc) => !doc.order_id || houseScopedOrderIds.has(doc.order_id))
  }, [activeHouse, documents, houseScopedOrderIds])

  const activeOrders = useMemo(
    () => houseScopedOrders
      .filter((item) => ['pending', 'confirmed', 'in_progress'].includes(item.status || ''))
      .sort((a, b) => (a.scheduled_date || '9999').localeCompare(b.scheduled_date || '9999'))
      .slice(0, 4),
    [houseScopedOrders]
  )
  const overviewActiveOrders = useMemo(
    () => houseScopedOrders
      .filter((item) => ['pending', 'confirmed', 'in_progress'].includes(item.status || ''))
      .sort((a, b) => (a.scheduled_date || '9999').localeCompare(b.scheduled_date || '9999'))
      .slice(0, 10),
    [houseScopedOrders]
  )
  const completedOrders = useMemo(() => houseScopedOrders.filter((item) => item.status === 'completed').length, [houseScopedOrders])
  const latestReports = useMemo(() => houseScopedReports.slice(0, 4), [houseScopedReports])
  const featuredReport = latestReports[0] || null
  const archivedReports = latestReports.slice(1)
  const overviewReports = useMemo(() => houseScopedReports.slice(0, 8), [houseScopedReports])
  const latestDocuments = useMemo(() => houseScopedDocuments.slice(0, 4), [houseScopedDocuments])
  const featuredPlants = useMemo(() => plants.slice(0, 4), [plants])
  const featuredServices = useMemo(() => services.slice(0, 3), [services])
  const latestOrder = overviewActiveOrders[0] || activeOrders[0] || houseScopedOrders[0] || orders[0] || null
  const latestDocument = latestDocuments[0] || null

  const portfolioAlerts = useMemo(() => {
    const alerts: { houseName: string; message: string; date: string; type: 'issue' | 'rating' }[] = []
    
    houses.forEach(house => {
      const houseReports = reports.filter(r => r.houseId === house.id || r.houseCode === house.house_code)
      const latest = houseReports[0]
      if (latest) {
        if (latest.rating && latest.rating <= 2) {
          alerts.push({
            houseName: house.name,
            message: isThaiLocale ? 'พบปัญหาความสมบูรณ์ของสวน' : 'Garden health issues detected',
            date: latest.createdAt || latest.updatedAt,
            type: 'rating'
          })
        } else if (latest.issuesFound && latest.issuesFound.length > 0) {
          alerts.push({
            houseName: house.name,
            message: latest.issuesFound[0],
            date: latest.createdAt || latest.updatedAt,
            type: 'issue'
          })
        }
      }
    })
    return alerts.slice(0, 3)
  }, [houses, reports, isThaiLocale])

  const nextVisitItems = useMemo(() => {
    // 1. Collect all potential next visits from both reports and orders (Scoped to active house)
    const allVisits: { key: string; houseName: string; serviceName: string; date: string; note: string; priority: number }[] = []

    houseScopedReports.forEach((report) => {
      if (!report.nextVisitDate) return
      const key = report.houseId || report.houseCode || report.houseName || report.id
      allVisits.push({
        key,
        houseName: report.houseName || report.houseCode || copy.activePropertyLabel,
        serviceName: report.serviceName || copy.activeOrders,
        date: report.nextVisitDate,
        note: report.nextVisitNotes || '',
        priority: 2 // Staff recommendation priority
      })
    })

    overviewActiveOrders.forEach((order) => {
      if (!order.scheduled_date) return
      const key = order.house_id || order.house_code || order.houses?.id || order.houses?.house_code || order.id
      allVisits.push({
        key,
        houseName: getOrderHouseLabel(order, copy.activePropertyLabel),
        serviceName: getOrderServiceLabel(order, copy.activeOrders),
        date: order.scheduled_date,
        note: '',
        priority: 1 // Confirmed schedule priority (higher)
      })
    })

    // 2. For each house, pick the "best" next visit (earliest date, with priority as tie-breaker)
    const bestVisits = new Map<string, typeof allVisits[0]>()
    
    allVisits.forEach(visit => {
      const existing = bestVisits.get(visit.key)
      if (!existing) {
        bestVisits.set(visit.key, visit)
      } else {
        const visitTime = new Date(visit.date).getTime()
        const existingTime = new Date(existing.date).getTime()
        
        // Priority 1 (Orders) ALWAYS beats Priority 2 (Reports)
        if (visit.priority < existing.priority) {
          bestVisits.set(visit.key, visit)
        } else if (visit.priority === existing.priority) {
          // If same priority, pick the earliest date
          if (visitTime < existingTime) {
            bestVisits.set(visit.key, visit)
          }
        }
      }
    })

    // 3. Return sorted by date
    return Array.from(bestVisits.values()).sort((left, right) => {
      return new Date(left.date).getTime() - new Date(right.date).getTime()
    })
  }, [copy.activeOrders, copy.activePropertyLabel, overviewActiveOrders, houseScopedReports])

  const activeMaintenancePlans = useMemo(() => {
    return orders.filter(o => (o.pricing_period === 'yearly' || o.pricing_period === 'monthly') && o.status !== 'cancelled')
      .map(o => {
        // Fallback to linked reports count if completed_sessions is 0 or null
        const linkedReports = reports.filter(r => r.orderId === o.id)
        const completedCount = o.completed_sessions || linkedReports.length
        
        // Use total_sessions from DB, or fallback to sensible defaults
        const totalCount = o.total_sessions || (o.pricing_period === 'yearly' ? 24 : 2)

        return {
          ...o,
          completedCount,
          totalCount,
        }
      })
  }, [orders, reports])

  const currentNextVisit = nextVisitItems[rotatingVisitIndex] || null

  const currentOrderFlow = latestOrder ? getCustomerServiceFlow(locale, latestOrder.status, progressMap[latestOrder.id]) : null
  const primaryAction = useMemo(() => {
    if (latestOrder) {
      return {
        label: copy.nextStep,
        title: getOrderServiceLabel(latestOrder, copy.activeOrders),
        detail: currentOrderFlow?.detail || copy.openDetails,
        cta: copy.openCurrentOrder,
        onClick: () => router.push(`/dashboard/customer/orders/${latestOrder.id}`),
      }
    }

    if (houses.length === 0) {
      return {
        label: copy.nextStep,
        title: copy.addHome,
        detail: copy.addHomeHint,
        cta: copy.startFromProperty,
        onClick: () => router.push('/dashboard/customer/houses/add-quick'),
      }
    }

    return {
      label: copy.nextStep,
      title: copy.featuredServices,
      detail: copy.goServices,
      cta: copy.goServices,
      onClick: () => setActiveTab('orders'),
    }
  }, [copy.activeOrders, copy.addHome, copy.addHomeHint, copy.featuredServices, copy.goServices, copy.nextStep, copy.openCurrentOrder, copy.openDetails, copy.startFromProperty, currentOrderFlow?.detail, houses.length, latestOrder, router])

  useEffect(() => {
    if (nextVisitItems.length <= 1) {
      setRotatingVisitIndex(0)
      setIsNextVisitVisible(true)
      return
    }

    const fadeOutTimer = window.setTimeout(() => {
      setIsNextVisitVisible(false)
    }, 3000)

    const swapTimer = window.setTimeout(() => {
      setRotatingVisitIndex((current) => (current + 1) % nextVisitItems.length)
      setIsNextVisitVisible(true)
    }, 3320)

    return () => {
      window.clearTimeout(fadeOutTimer)
      window.clearTimeout(swapTimer)
    }
  }, [nextVisitItems.length, rotatingVisitIndex])


  const mobileTabs: { id: TabId; label: string; icon: LucideIcon }[] = useMemo(
    () => [
      { id: 'overview', label: copy.overview, icon: Home },
      { id: 'orders', label: copy.orders, icon: Leaf },
      { id: 'marketplace', label: copy.boutiqueTitle, icon: ShoppingBag },
      { id: 'notifications', label: copy.notificationLabel, icon: Bell },
      { id: 'profile', label: copy.profile, icon: User },
    ],
    [copy]
  )

  const handleServiceSelectForBooking = (s: Service) => {
    setSelectedServiceForBooking(s)
    setBookingStep(selectedHouseForBooking ? 3 : 2)
    handleTabChange('orders')
  }

  const handleHouseSelectForBooking = (h: House) => {
    setSelectedHouseForBooking(h)
    const area = typeof h.area_size === 'number' ? h.area_size : 100
    setBookingArea(area)
    if (selectedServiceForBooking && priceTemplates) {
      const tpls = priceTemplates.filter(t => t.service_id === selectedServiceForBooking.id)
      const found = getRecommendedPriceTemplate(tpls, area, bookingPeriod)
      setSelectedTemplateForBooking(found)
    }
    setBookingStep(3)
  }

  const handleCreateHouseForBooking = async () => {
    if (!profile?.id) return

    const name = bookingHouseDraft.name.trim()
    const address = bookingHouseDraft.address.trim()
    const areaValue = Number(bookingHouseDraft.areaSize)

    if (!name) {
      setBookingHouseError(bookingHouseCopy.nameRequired)
      return
    }

    if (!address) {
      setBookingHouseError(bookingHouseCopy.addressRequired)
      return
    }

    if (!Number.isFinite(areaValue) || areaValue <= 0) {
      setBookingHouseError(bookingHouseCopy.areaRequired)
      return
    }

    setIsCreatingBookingHouse(true)
    setBookingHouseError('')

    try {
      const { data, error: createError } = await createHouse({
        user_id: profile.id,
        customer_id: profile.id,
        name,
        address,
        area_size: areaValue,
      })

      if (createError || !data) {
        throw new Error(createError?.message || 'Unable to create property')
      }

      setHouses((prev) => [data, ...prev])
      setShowInlineHouseComposer(false)
      setBookingHouseDraft({ name: '', address: '', areaSize: '' })
      setActiveHouseId((prev) => prev || data.id)
      triggerToast(bookingHouseCopy.success, 'fa-circle-check')
      handleHouseSelectForBooking(data)
    } catch (err: any) {
      setBookingHouseError(err?.message || 'Unable to create property')
    } finally {
      setIsCreatingBookingHouse(false)
    }
  }

  const handleConfirmBooking = async () => {
    if (!selectedHouseForBooking || !selectedServiceForBooking) return
    setIsSubmittingBooking(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({
          houseId: selectedHouseForBooking.id,
          serviceId: selectedServiceForBooking.id,
          priceTemplateId: selectedTemplateForBooking?.id || null,
          pricingPeriod: bookingPeriod,
          scheduledDate: new Date().toISOString().split('T')[0],
          notes: bookingNotes.trim() || undefined,
          paymentMethod: bookingPaymentMethod,
          priority: bookingPriority
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.error || 'Booking failed')

      if (bookingPaymentMethod === 'stripe' || bookingPaymentMethod === 'promptpay') {
        const stripeRes = await fetch('/api/orders/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
          credentials: 'include',
          body: JSON.stringify({ orderId: result.orderId, paymentMethod: bookingPaymentMethod }),
        })
        const stripeData = await stripeRes.json()
        if (stripeData.url) {
          window.location.href = stripeData.url
          return
        }

        throw new Error(stripeData?.error || 'Unable to start Stripe checkout')
      }
    } catch (err: any) {
      setError(err?.message || 'Error')
    } finally {
      setIsSubmittingBooking(false)
    }
  }

  const renderPlantDetailSheet = (plant: MarketplacePlant) => (
    <div className="flex flex-col h-full bg-white">
      <div className="aspect-square w-full relative bg-[#FAFAFA] overflow-hidden border-b border-[#EFEFEF]">
        <img src={getSafePlantImage(plant)} className="w-full h-full object-cover" />
        <div className="absolute top-8 right-8 bg-[#111111] text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em]">
          {copy.stockAvailable}
        </div>
      </div>

      <div className="p-10 space-y-12 pb-40">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-px bg-[#1A3626]" />
            <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#A3A3A3]">{plant.category || 'ARCHITECTURAL'}</span>
          </div>
          <h2 className="font-serif-thai text-5xl font-light text-[#111111] leading-none uppercase tracking-tighter">{plant.name}</h2>
          <div className="text-3xl font-serif-thai text-[#111111] border-b border-[#EFEFEF] pb-8">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{plant.price?.toLocaleString()}</div>
        </div>

        <div className="space-y-6">
          <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#A3A3A3] border-b border-[#F0F0F0] pb-4">{copy.specSheet}</h4>
          <p className="text-[14px] leading-relaxed text-[#444444] font-serif-thai italic">
            {plant.description || copy.plantDetailDescription}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px bg-[#EFEFEF] border border-[#EFEFEF]">
          <div className="bg-white p-6">
            <div className="text-[8px] font-bold uppercase tracking-widest text-[#A3A3A3] mb-2">{copy.unitLabel}</div>
            <div className="text-xs font-bold uppercase tracking-widest">{copy.singleRootPack}</div>
          </div>
          <div className="bg-white p-6">
            <div className="text-[8px] font-bold uppercase tracking-widest text-[#A3A3A3] mb-2">{copy.careLevelLabel}</div>
            <div className="text-xs font-bold uppercase tracking-widest">{copy.curatedRoutine}</div>
          </div>
        </div>

        <button
          onClick={() => triggerToast(copy.inquiryToast, 'fa-shopping-bag')}
          className="w-full py-6 bg-[#111111] text-white text-[11px] font-bold uppercase tracking-[0.5em] shadow-2xl active:scale-[0.98] transition-all"
        >
          {copy.addToCart}
        </button>
      </div>
    </div>
  )

  const renderReportDetailSheet = () => {
    if (!selectedReport) return null

    const handleClose = () => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('reportId')
      params.delete('id')
      router.push(`/dashboard/customer?${params.toString()}`, { scroll: false })
      // The useEffect will handle the state closing (setActiveSheet(null), etc)
    }

    return (
      <div className="fixed inset-0 z-[500] flex flex-col bg-[#F7F5EF] selection:bg-[#111111] selection:text-white">
        <header className="flex h-20 items-center justify-between border-b border-[#111111]/10 bg-white/80 px-8 backdrop-blur-2xl">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111]/5 text-[#111111] transition-all hover:bg-[#111111] hover:text-white active:scale-90"
            >
              <ArrowLeft size={18} strokeWidth={1.5} />
            </button>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#AF907A]">{isThaiLocale ? 'วารสารพฤกษศาสตร์' : 'BOTANICAL JOURNAL'}</p>
              <h2 className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#111111]">{selectedReport.houseName || 'Report Detail'}</h2>
            </div>
          </div>
          
          <button 
            onClick={handleClose}
            className="text-[10px] font-bold uppercase tracking-widest text-[#111111] opacity-40 hover:opacity-100 transition-opacity"
          >
            {isThaiLocale ? 'ปิด' : 'Close'}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <CustomerReportDetailPanel 
            report={selectedReport}
            onBack={handleClose}
            actions={selectedReport.orderId ? {
              rateHref: `/dashboard/customer/orders/${selectedReport.orderId}?action=rate-report&reportId=${selectedReport.id}`,
              issueHref: `/dashboard/customer/orders/${selectedReport.orderId}?action=issue-report&reportId=${selectedReport.id}`,
            } : undefined}
          />
        </div>
      </div>
    )
  }

  // Reactive Plan Selection
  useEffect(() => {
    if (!availableBookingPeriods.includes(bookingPeriod)) {
      setBookingPeriod(availableBookingPeriods[0] || 'one-time')
    }
  }, [availableBookingPeriods, bookingPeriod])

  useEffect(() => {
    if (!selectedServiceForBooking || bookingStep !== 3) return
    if (bookingServiceTemplates.length === 0) {
      setSelectedTemplateForBooking(null)
      return
    }

    const found = getRecommendedPriceTemplate(
      bookingServiceTemplates,
      bookingArea,
      bookingPeriod,
      selectedTemplateForBooking
    )
    if (found && found.id !== selectedTemplateForBooking?.id) {
      setSelectedTemplateForBooking(found)
    }
    if (!found) {
      setSelectedTemplateForBooking(null)
    }
  }, [bookingArea, bookingPeriod, bookingServiceTemplates, bookingStep, selectedServiceForBooking, selectedTemplateForBooking])

  const overviewStats = useMemo(
    () => [
      {
        id: 'houses',
        label: copy.properties,
        value: houses.length.toString(),
        sub: activeHouse?.name || copy.activePropertyLabel,
        onClick: () => setActiveSheet('houses'),
      },
      ...(features.service_booking_enabled ? [
        {
          id: 'orders',
          label: copy.completedOrders,
          value: completedOrders.toString(),
          sub: `${reportSummary.totalReports} ${copy.reportsCount}`,
          onClick: () => setActiveSheet('orders'),
        },
      ] : [
        {
          id: 'orders',
          label: copy.completedOrders,
          value: '-',
          sub: 'SYSTEM CLOSED',
          onClick: () => { },
          locked: true
        }
      ]),
      {
        id: 'reports',
        label: copy.latestReports,
        value: reportSummary.totalReports.toString(),
        sub: `${overviewReports.length} ${copy.viewAll}`,
        onClick: () => setActiveSheet('reports'),
      },
      {
        id: 'documents',
        label: copy.totalDocs,
        value: documents.length.toString(),
        sub: `${houses.length} ${copy.properties}`,
        onClick: () => setActiveSheet('documents'),
      },
    ].filter(Boolean),
    [activeHouse?.name, completedOrders, copy.activePropertyLabel, copy.completedOrders, copy.latestReports, copy.properties, copy.reportsCount, copy.totalDocs, copy.viewAll, documents.length, features.service_booking_enabled, houses.length, overviewReports.length, reportSummary.totalReports]
  )

  const renderDetailSheets = () => {
      const { locale } = useI18n();
    const isFullScreenSheet = (activeSheet === 'reports' && selectedReport) || activeSheet === 'order-detail';
    return (
    <AnimatePresence>
      {activeSheet !== null && (
        <div className={`fixed inset-0 z-[500] flex items-center justify-center ${isFullScreenSheet ? 'p-0' : 'p-6 md:p-12'}`}>
          {/* Backdrop with higher blur */}
          <motion.div
            key="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[510] bg-black/60 backdrop-blur-xl"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.delete('reportId')
              params.delete('id')
              if (activeSheet === 'order-detail') {
                 params.delete('orderId')
                 params.delete('action')
              }
              router.push(`/dashboard/customer?${params.toString()}`, { scroll: false })
            }}
          />

          {/* Floating Popup Container - Enlarge for better visibility */}
          <motion.div
            key="detail-popup"
            className={`relative z-[520] bg-white overflow-hidden flex flex-col ${isFullScreenSheet
                ? 'w-full h-full rounded-none bg-[#F9F8F4]'
                : 'w-[95%] max-w-[1200px] h-[88vh] shadow-[0_60px_120px_-20px_rgba(0,0,0,0.6)] rounded-[48px] border border-white/20'
              }`}
            initial={isFullScreenSheet ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
            animate={isFullScreenSheet ? { y: 0 } : { scale: 1, opacity: 1 }}
            exit={isFullScreenSheet ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
            transition={{
              layout: { duration: 0.7, ease: [0.23, 1, 0.32, 1] },
              opacity: { duration: 0.4 },
              y: { duration: 0.6, ease: [0.23, 1, 0.32, 1] },
              scale: { duration: 0.7, ease: [0.23, 1, 0.32, 1] }
            }}
          >
            <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-20">
              <div className={`px-8 py-6 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-[530] border-b border-[#F0EFEB] ${isFullScreenSheet ? 'md:px-12 md:py-8' : ''}`}>
                <div className="space-y-1">
                  {activeSheet === 'reports' && selectedReport ? (
                    <>
                      <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#A3A3A3]">{locale === 'en' ? 'รายงานล่าสุด' : locale === 'zh' ? 'รายงานล่าสุด' : 'รายงานล่าสุด'}</p>
                      <h4 className="font-serif-thai text-2xl font-light uppercase tracking-tight text-[#111111]">{locale === 'en' ? 'ข้อมูลรายงานทั้งหมด' : locale === 'zh' ? 'ข้อมูลรายงานทั้งหมด' : 'ข้อมูลรายงานทั้งหมด'}</h4>
                    </>
                  ) : activeSheet === 'order-detail' ? (
                    <>
                      <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#A3A3A3]">{locale === 'en' ? 'รายละเอียดงาน' : locale === 'zh' ? 'รายละเอียดงาน' : 'รายละเอียดงาน'}</p>
                      <h4 className="font-serif-thai text-2xl font-light uppercase tracking-tight text-[#111111]">{locale === 'en' ? 'ข้อมูลออเดอร์' : locale === 'zh' ? 'ข้อมูลออเดอร์' : 'ข้อมูลออเดอร์'}</h4>
                    </>
                  ) : (
                    <>
                      <p className="font-sans text-[10px] font-bold text-[#AF907A] uppercase tracking-widest">
                        {activeSheet === 'reports' && !selectedReport ? 'Garden Intelligence' : activeSheet === 'marketplace' ? 'Boutique' : activeSheet === 'houses' ? 'Properties' : activeSheet === 'orders' ? 'Order History' : 'Archive'}
                      </p>
                      <h2 className="font-sans text-2xl font-semibold tracking-tight text-[#111111]">
                        {activeSheet === 'reports' && !selectedReport ? 'Updates' : activeSheet === 'marketplace' ? 'Selection' : activeSheet === 'houses' ? 'Estates' : activeSheet === 'orders' ? 'Transactions' : 'Documents'}
                      </h2>
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString())
                    params.delete('reportId')
                    params.delete('id')
                    if (activeSheet === 'order-detail') {
                       params.delete('orderId')
                       params.delete('action')
                    }
                    router.push(`/dashboard/customer?${params.toString()}`, { scroll: false })
                  }}
                  className={`flex items-center justify-center transition-all duration-300 ${isFullScreenSheet
                      ? 'w-12 h-12 rounded-full bg-[#1A3626]/[0.05] text-[#1A3626] hover:bg-[#1A3626] hover:text-white'
                      : 'w-10 h-10 rounded-full bg-[#FAF9F6] text-[#111111] hover:bg-[#EFEFEF]'
                    }`}
                >
                  <X size={isFullScreenSheet ? 18 : 20} strokeWidth={isFullScreenSheet ? 2 : 2} />
                </button>
              </div>

              <div className="p-0">
                {activeSheet === 'order-detail' && (
                  <CustomerOrderDetailPanel orderId={searchParams.get('orderId') as string} />
                )}
                {activeSheet === 'reports' && selectedReport && renderReportDetailSheet()}
                {activeSheet === 'reports' && !selectedReport && (
                  <div className="px-10 py-12">
                    <div className="mb-16 flex items-start gap-12">
                      <div className="w-32 h-32 rounded-[40px] overflow-hidden grayscale shadow-2xl border-4 border-white">
                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80" className="w-full h-full object-cover" alt="Manager" />
                      </div>
                      <div className="pt-4 flex-1">
                        <h4 className="font-serif-thai text-4xl font-light text-[#111111] mb-2 uppercase tracking-tighter">Boutique Management.</h4>
                        <p className="text-sm text-[#666666] leading-relaxed italic font-serif-thai max-w-lg">
                          "Our system is constantly monitoring your garden's health. Below are the latest updates from our field team."
                        </p>
                      </div>
                    </div>
                    <CustomerNotifications notifications={notifications} copy={copy} />
                  </div>
                )}
                {activeSheet === 'marketplace' && selectedPlant && renderPlantDetailSheet(selectedPlant)}
                {activeSheet === 'marketplace' && !selectedPlant && (
                  <CustomerMarketplace
                    {...{
                      categories, shopCategory, setShopCategory, filteredPlants,
                      setSelectedPlant, setActiveSheet, copy, getSafePlantImage
                    }}
                  />
                )}
                {activeSheet === 'houses' && (
                  <div className="pt-8">
                    <CustomerHouses
                      houses={houses}
                      copy={copy}
                      activeHouse={activeHouse}
                      setActiveHouseId={(id) => {
                        setActiveHouseId(id)
                        setActiveSheet(null)
                      }}
                    />
                  </div>
                )}
                {activeSheet === 'documents' && (
                  <div className="pt-8">
                    <CustomerDocuments documents={documents} copy={copy} />
                  </div>
                )}
                {activeSheet === 'orders' && (
                  <div className="px-10 pt-10 pb-20">
                    <div className="space-y-6">
                      {orders.length > 0 ? orders.map((order: any) => (
                        <div key={order.id} className="bg-[#FAF9F6] p-8 border border-black flex items-center justify-between group">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 border border-black flex items-center justify-center shadow-sm">
                              <ShoppingBag size={24} strokeWidth={1} className="text-[#AF907A]" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{formatDateByLocale(order.createdAt, locale)}</p>
                              <h4 className="font-serif-thai text-2xl font-light text-[#111111]">Order #{order.id.slice(0, 8)}</h4>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-[#111111]">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{order.totalAmount?.toLocaleString()}</p>
                            <span className="text-[10px] font-bold text-[#214031] uppercase tracking-widest bg-[#214031]/5 px-3 py-1 rounded-full">{order.status}</span>
                          </div>
                        </div>
                      )) : (
                        <div className="py-24 text-center opacity-30">
                          <p className="font-serif-thai text-xl lowercase">no orders found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    )
  }


  if (authLoading || loading) return <XYLLoader tagline={copy.loading} />

  if (error) {
    return (
      <div className="fixed inset-0 z-[500] bg-white flex items-center justify-center p-10 text-center">
        <div className="max-w-md space-y-6">
          <AlertTriangle size={48} className="mx-auto text-amber-600" strokeWidth={1} />
          <h2 className="text-2xl font-serif-thai text-[#111111]">Service Interruption</h2>
          <p className="text-sm text-[#666666] leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-widest rounded-full"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div id="customer-mobile-root" className="fixed inset-0 z-0 bg-black flex justify-center overflow-hidden">

      <motion.section
        className={`h-full w-full relative overflow-x-hidden no-scrollbar scroll-smooth bg-[var(--customer-bg)] ${activeTab === 'orders' ? 'overflow-y-hidden' : 'overflow-y-auto'}`}
        animate={{
          scale: activeSheet !== null ? 0.93 : 1,
          y: activeSheet !== null ? -10 : 0,
          borderRadius: activeSheet !== null ? '40px' : '0px',
          opacity: activeSheet !== null ? 0.6 : 1,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.8 }}
      >
        <div
          className="dashboard-content-root relative min-h-full w-full flex flex-col mx-auto max-w-[1600px] overflow-hidden"
        >
          <div className="flex-1 relative pb-40">
            <AnimatePresence initial={true} mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="w-full min-h-full"
              >
                {activeTab === 'overview' && (
                  <CustomerOverview
                    {...{
                      displayName, shortName, activeHouse, activeTab, setActiveTab, primaryAction,
                      overviewActiveOrders, nextVisitItems, rotatingVisitIndex, isNextVisitVisible,
                      currentNextVisit, progressMap, getCustomerServiceFlow, locale, copy,
                      overviewReports, 
                      onReportClick: (report: any) => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('reportId', report.id)
                        router.push(`/dashboard/customer?${params.toString()}`, { scroll: false })
                      },
                      setActiveSheet, overviewStats,
                      featuredServices, services, handleServiceSelectForBooking, featuredPlants,
                      setSelectedPlant, isThaiLocale, localeLabelClass, localeCapsClass,
                      localeMicroLabelClass, localeButtonClass, latestOrder,
                      notifications,
                      features,
                      houses,
                      documents, activeMaintenancePlans, setActiveHouseId
                    }}
                  />
                )}

                {activeTab === 'orders' && (
                  <div className="h-full w-full pb-20">
                    {features.service_booking_enabled ? (
                      <CustomerServices
                        {...{
                          bookingStep, setBookingStep, bookingSearch, setBookingSearch, services,
                          handleServiceSelectForBooking, copy, houses, handleHouseSelectForBooking,
                          bookingHouseDraft, setBookingHouseDraft, bookingHouseError, isCreatingBookingHouse,
                          handleCreateHouseForBooking, showInlineHouseComposer, setShowInlineHouseComposer,
                          availableBookingPeriods, bookingPeriod, setBookingPeriod, bookingArea,
                          setBookingArea, bookingPriority, setBookingPriority, bookingPricingSummary,
                          selectedTemplateForBooking, setSelectedTemplateForBooking, calculatePricingSummary,
                          selectedServiceForBooking, bookingPaymentMethod, setBookingPaymentMethod,
                          bookingNotes, setBookingNotes, handleConfirmBooking, isSubmittingBooking,
                          error, locale, isThaiLocale, localeLabelClass, localeMicroLabelClass,
                          localeButtonClass, bookingHouseCopy
                        }}
                      />
                    ) : (
                      <div className="pt-20 px-6 flex flex-col items-center justify-center min-h-[60vh] text-center max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="w-24 h-24 bg-white border border-[#F0F0F0] flex items-center justify-center mb-10">
                          <Wrench size={32} className="text-[#111111] opacity-20" />
                        </div>
                        <h3 className="text-4xl font-serif-thai font-light text-[#111111] mb-6 uppercase tracking-tighter">{copy.serviceMaintenanceTitle}</h3>
                        <p className="text-xs font-bold text-[#A3A3A3] leading-relaxed uppercase tracking-widest mb-12">"{copy.serviceMaintenanceDesc}"</p>
                        <button
                          onClick={() => setActiveTab('overview')}
                          className="px-12 py-5 bg-[#111111] text-white text-[9px] font-bold uppercase tracking-[0.5em] hover:bg-black transition-all"
                        >
                          Back to Overview
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'reports' && (
                  <div className="w-full min-h-screen pb-24 bg-[#FAFAFA]">
                    {/* HEADER */}
                    <header className="border-b border-[#E5E5E5] px-6 py-12 md:py-16 bg-[#FAFAFA]">
                      <div className="max-w-[1400px] mx-auto">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full" />
                           <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#737373]">INTELLIGENCE HUB</p>
                        </div>
                        <h1 className="text-[28px] md:text-[32px] font-light text-[#1A1A1A] leading-tight tracking-tight mb-4">
                          {isThaiLocale ? 'รายงานประจำเดือน.' : 'Monthly Reports.'}
                        </h1>
                        <p className="text-[12px] text-[#737373] max-w-xl leading-relaxed">
                          {isThaiLocale 
                            ? 'ติดตามสถานะการดูแลสวน ประวัติการเข้าบริการ และข้อเสนอแนะจากผู้เชี่ยวชาญ'
                            : 'Track your garden maintenance status, service history, and expert recommendations.'}
                        </p>
                      </div>
                    </header>

                    <div className="max-w-[1400px] mx-auto px-6 py-12">
                      
                      {/* STATS + FILTER */}
                      <div className="mb-12">
                        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-4 mb-8">
                           <div className="bg-white text-[#1A1A1A] p-6 border border-[#E5E5E5] flex-1 min-w-[150px]">
                              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#737373] mb-2">{isThaiLocale ? 'สถานที่' : 'PROPERTIES'}</div>
                              <div className="text-3xl font-light tracking-tight">{houses.length}</div>
                           </div>
                           <div className="bg-[#FAFAFA] text-[#1A1A1A] p-6 border border-[#E5E5E5] flex-1 min-w-[150px]">
                              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#737373] mb-2">{isThaiLocale ? 'รายงานรวม' : 'TOTAL REPORTS'}</div>
                              <div className="text-3xl font-light tracking-tight">{reports.length}</div>
                           </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E5E5E5]">
                           <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#1A1A1A] shrink-0">{isThaiLocale ? 'กรองตามสถานที่' : 'FILTER BY PROPERTY'}</h3>
                           <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 md:pb-0 w-full md:w-auto">
                              <button 
                                onClick={() => setActiveFilterHouseId(null)}
                                className={`shrink-0 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${!activeFilterHouseId ? 'border-[#1A1A1A] bg-white text-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]' : 'border-[#E5E5E5] bg-white text-[#737373] hover:border-[#1A1A1A] hover:text-[#1A1A1A] hover:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]'}`}
                              >
                                 {isThaiLocale ? 'ทั้งหมด' : 'ALL'}
                              </button>
                              {houses.map(house => (
                                <button 
                                  key={house.id}
                                  onClick={() => setActiveFilterHouseId(house.id)}
                                  className={`shrink-0 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${activeFilterHouseId === house.id ? 'border-[#1A1A1A] bg-white text-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]' : 'border-[#E5E5E5] bg-white text-[#737373] hover:border-[#1A1A1A] hover:text-[#1A1A1A] hover:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]'}`}
                                >
                                  {house.name}
                                </button>
                              ))}
                           </div>
                        </div>
                      </div>

                      {/* CALENDAR */}
                      <section className="mb-12">
                        <GardenCalendar 
                          orders={orders.filter(o => {
                            if (!o.scheduled_date || !['pending', 'confirmed', 'in_progress'].includes(o.status || '')) return false
                            if (activeFilterHouseId && o.house_id !== activeFilterHouseId && o.houses?.house_code !== activeFilterHouseId) return false
                            return true
                          })}
                          reports={reports.filter(r => {
                            if (activeFilterHouseId && r.houseId !== activeFilterHouseId && r.houseCode !== activeFilterHouseId) return false
                            return true
                          })}
                          locale={locale as any}
                          showHouseName={true}
                          onOpenReport={(reportId) => {
                            const params = new URLSearchParams(searchParams.toString())
                            params.set('reportId', reportId)
                            router.push(`/dashboard/customer?${params.toString()}`, { scroll: false })
                          }}
                        />
                      </section>

                      {/* ALERTS */}
                      {portfolioAlerts.length > 0 && (
                        <div className="mb-12 border border-[#E5E5E5] bg-white p-6 relative">
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1A1A1A]">NEEDS ATTENTION</span>
                          </div>
                          <div className="grid gap-4">
                            {portfolioAlerts.map((alert, idx) => (
                              <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-[#E5E5E5] last:border-0 last:pb-0">
                                <div className="flex items-start gap-4">
                                  <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" strokeWidth={1.5} />
                                  <div>
                                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A] mb-1">{alert.houseName}</h4>
                                    <p className="text-[13px] text-[#737373]">{alert.message}</p>
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-[#737373] whitespace-nowrap">
                                  {(() => {
                                    const d = new Date(alert.date)
                                    return !isNaN(d.getTime()) ? format(d, 'd MMM yyyy', { locale: dfnsLocale }) : '-'
                                  })()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}



                    {/* Historical Archive Feed */}
                    <section className="pb-24 border-t border-[#F0EFEB] pt-8">
                      <CustomerReportFeed
                        reports={reports.slice(0, 20)}
                        emptyMessage={copy.noReports}
                        showHouseContext={true}
                        showOrderContext={true}
                        minimal={true}
                        onClick={(report) => {
                          const params = new URLSearchParams(searchParams.toString())
                          params.set('reportId', report.id)
                          router.push(`/dashboard/customer?${params.toString()}`, { scroll: false })
                        }}
                      />
                    </section>
                  </div>
                </div>
                )}

                {activeTab === 'marketplace' && (
                  <div className="pt-20 px-6 md:px-12">
                    {features.marketplace_enabled ? (
                      <CustomerMarketplace
                        {...{
                          categories, shopCategory, setShopCategory, filteredPlants,
                          setSelectedPlant, setActiveSheet, copy, getSafePlantImage
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="w-24 h-24 bg-white border border-[#F0F0F0] flex items-center justify-center mb-10">
                          <ShoppingBag size={32} className="text-[#111111] opacity-20" />
                        </div>
                        <h3 className="text-4xl font-serif-thai font-light text-[#111111] mb-6 uppercase tracking-tighter">{copy.marketplaceMaintenanceTitle || 'Marketplace'}</h3>
                        <p className="text-xs font-bold text-[#A3A3A3] leading-relaxed uppercase tracking-widest mb-12">"{copy.marketplaceMaintenanceDesc || 'Our boutique selection is currently being updated.'}"</p>
                        <button
                          onClick={() => setActiveTab('overview')}
                          className="px-12 py-5 bg-[#111111] text-white text-[9px] font-bold uppercase tracking-[0.5em] hover:bg-black transition-all"
                        >
                          Back to Overview
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'profile' && (
                  <div className="pt-20 px-6 md:px-12">
                    <CustomerProfile
                      profile={profile}
                      copy={copy}
                      supabase={supabase}
                      WebsiteLanguageSettings={WebsiteLanguageSettings}
                    />
                  </div>
                )}
                {activeTab === 'houses' && (
                  <div className="pt-20 px-6 md:px-12">
                    <CustomerHouses
                      houses={houses}
                      copy={copy}
                      activeHouse={activeHouse}
                      setActiveHouseId={setActiveHouseId}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      <CustomerPremiumNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        copy={copy}
        features={features}
      />

      {/* Render popups OUTSIDE the scaling container */}
      {renderDetailSheets()}

      {showOnboardingTour && (
        <CustomerOnboardingTour onComplete={() => setShowOnboardingTour(false)} />
      )}
    </div>
  )
}
