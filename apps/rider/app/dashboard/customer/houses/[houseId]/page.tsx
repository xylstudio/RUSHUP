'use client';
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { 
  Activity, 
  ArrowLeft, 
  ChevronRight, 
  Maximize2, 
  Leaf,
  TreeDeciduous,
  Grid3X3,
  MapPin,
  Info,
   AlertTriangle,
  ChevronLeft,
  Building2,
  Ruler,
  Calendar,
  Layers3,
  Share,
  Share2,
  Users,
  UserPlus,
  Shield,
  Trash2,
  X,
  Copy,
  CheckCircle2,
  LinkIcon,
  MoreVertical,
  Pencil,
  Bell,
  BellOff
} from 'lucide-react'
import XYLLoader from '@/components/loaders/XYLLoader'
import CustomerReportDetailPanel from '@/components/customer/CustomerReportDetailPanel'
import CustomerReportFeed from '@/components/customer/CustomerReportFeed'
import GardenCalendar from '@/components/customer/GardenCalendar'
import { useAuth } from '@/lib/AuthContext'
import { useI18n } from '@/lib/I18nContext'
import { buildCustomerReportSummary, type CustomerReportItem, type CustomerReportPlanItem } from '@/lib/customerReports'
import { formatDateByLocale, formatNumberByLocale } from '@/lib/localeFormat'
import { getCustomerHouses, supabase, getHouseCollaborators, inviteCollaboratorByEmail, removeCollaborator as apiRemoveCollaborator, updateCollaboratorRole, type HouseCollaborator, type HouseCollaboratorRole } from '@/lib/supabaseClient'
import { getHousePlanByHouseId, type HousePlan } from '@/lib/housePlans'
import type { HouseData } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'


type OrderInsightRow = {
  id: string
  house_id?: string | null
  house_code?: string | null
  status?: string | null
  scheduled_date?: string | null
  service_id?: string | null
  services?: { service_name: string } | null
  job_assignments?: Array<{
    status: string
    started_at?: string | null
    profiles?: { display_name: string } | null
  }> | null
}

type WorkReportInsightRow = {
  id: string
  order_id?: string | null
  work_done?: string | null
  recommendations?: string | null
  problems_found?: string | null
  next_visit_date?: string | null
  next_visit_time_start?: string | null
  next_visit_time_end?: string | null
  before_photos?: string[] | null
  after_photos?: string[] | null
  updated_at?: string | null
  created_at?: string | null
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
   })

   const payload = await response.json().catch(() => ({}))
   if (!response.ok) {
      throw new Error((payload as { error?: string }).error || 'Request failed')
   }

   return payload as T
}

const getReportPreviewText = (report: WorkReportInsightRow | null) => {
   if (!report) return '-'
   return report.problems_found || report.work_done || report.recommendations || '-'
}

export default function HouseDetailPage() {
  const { houseId } = useParams()
  const router = useRouter()
   const searchParams = useSearchParams()
  const { profile, loading: authLoading, user } = useAuth()
  const { locale } = useI18n()
  const [house, setHouse] = useState<HouseData | null>(null)
  const [housePlan, setHousePlan] = useState<HousePlan | null>(null)
  const [orders, setOrders] = useState<OrderInsightRow[]>([])
   const [reports, setReports] = useState<CustomerReportItem[]>([])
   const [reportSummary, setReportSummary] = useState(buildCustomerReportSummary([]))
   const [planItems, setPlanItems] = useState<CustomerReportPlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
   const [isReportDetailOpen, setIsReportDetailOpen] = useState(false)

  // Sharing State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [collaborators, setCollaborators] = useState<HouseCollaborator[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<HouseCollaboratorRole>('viewer')
  const [isInviting, setIsInviting] = useState(false)
  const [myRole, setMyRole] = useState<HouseCollaboratorRole | 'owner'>('viewer')
   const autoCalendarOrderId = searchParams.get('orderId') || null
   const autoOpenCalendar = searchParams.get('calendar') === 'open' && searchParams.get('action') === 'reschedule'

  const [isCopied, setIsCopied] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)

  const copy = {
    th: {
      back: 'กลับ',
      details: 'ข้อมูลจำเพาะโครงการ',
      reports: 'วารสารพฤกษศาสตร์',
      latest: 'ฉบับล่าสุด',
      archiveReports: 'รายงานก่อนหน้า',
      reportOverview: 'รวมรายงานทั้งหมดของบ้านหลังนี้ กดแต่ละรายการเพื่อเปิดรายงานเต็ม',
      fullReport: 'ข้อมูลรายงานทั้งหมด',
      openLatestReport: 'เปิดรายงานล่าสุด',
      reportLog: 'บันทึกการดูแล',
      reportTimestamp: 'วันเวลารายงาน',
      reportNextVisit: 'นัดดูแลครั้งถัดไป',
      reportVisuals: 'ภาพหน้างาน',
      reportBeforeLabel: 'ก่อนดูแล',
      reportAfterLabel: 'หลังดูแล',
      reportNoBefore: 'ไม่มีภาพก่อนดูแล',
      reportNoAfter: 'ไม่มีภาพหลังดูแล',
      reportSummaryLabel: 'สรุปการดูแล',
      reportWorkDoneLabel: 'งานที่ทำ',
      reportIssuesLabel: 'สิ่งที่พบ',
      reportAdviceLabel: 'คำแนะนำจากทีม',
      noReports: 'ยังไม่มีรายงานในขณะนี้',
      status: 'สุขภาพโครงการ',
      healthy: 'สมบูรณ์ดี',
      needsCare: 'ต้องการการดูแล',
      area: 'ข้อมูลพื้นที่',
      branch: 'สาขาที่ดูแล',
      address: 'สถานที่ตั้ง',
      loading: 'กำลังเชื่อมต่อข้อมูล...',
      openReport: 'ดูรายงานฉบับเต็ม',
      visitDate: 'วันที่เข้างาน',
      viewAll: 'ดูทั้งหมด',
      before: 'ก่อนทำ',
      after: 'หลังทำ',
      zonesTitle: 'โซนพื้นที่โครงการ',
      zonesSubtitle: 'รายละเอียดการจัดวางสเปซและงานภูมิสถาปัตยกรรม',
      inventoryTitle: 'รายชื่อพันธุ์ไม้',
      noZones: 'ยังไม่มีข้อมูลโซนจากสถาปนิก',
      totalArea: 'พื้นที่ทั้งหมด',
      sqm: 'ตร.ม.',
      items: 'รายการ',
      editHouse: 'แก้ไขข้อมูลโครงการ',
      shareHouse: 'จัดการสิทธิ์การเข้าถึง',
      chooseService: 'เลือกบริการสำหรับบ้านนี้',
      linkCopied: 'คัดลอกลิงก์โครงการแล้ว',
      accessControl: 'ควบคุมการเข้าถึงพิเศษ',
      archLink: 'ลิงก์สากลสำหรับการเข้าถึง',
      copyLink: 'คัดลอกลิงก์',
      manageAccess: 'จัดการผู้มีสิทธิ์เข้าถึง',
      inviteBtn: 'ส่งคำเชิญ',
      noCollaborators: 'ยังไม่มีผู้ได้รับสิทธิ์ร่วม',
      roles: {
        owner: 'เจ้าของบ้าน',
        manager: 'ผู้จัดการ',
        editor: 'ผู้ร่วมแก้ไข',
        viewer: 'ผู้เข้าชม'
      },
      activeServices: 'บริการที่กำลังดำเนินการ',
      liveStatus: 'กำลังปฏิบัติงาน',
      upcomingVisit: 'นัดหมายถัดไป',
      activePlan: 'แผนบริการที่ใช้งานอยู่',
      onSiteNow: 'ทีมงานอยู่หน้างานขณะนี้'
    },
    en: {
      back: 'Back',
      details: 'PROPERTY SPECIFICATION',
      reports: 'Botanical Journal',
      latest: 'LATEST EDITION',
      archiveReports: 'PREVIOUS REPORTS',
      reportOverview: 'All reports for this property are listed here. Tap any item to open the full report.',
      fullReport: 'FULL REPORT DETAILS',
      openLatestReport: 'OPEN LATEST REPORT',
      reportLog: 'CARE LOG',
      reportTimestamp: 'REPORTED AT',
      reportNextVisit: 'NEXT CARE VISIT',
      reportVisuals: 'SITE PHOTOS',
      reportBeforeLabel: 'BEFORE SERVICE',
      reportAfterLabel: 'AFTER SERVICE',
      reportNoBefore: 'No before photos',
      reportNoAfter: 'No after photos',
      reportSummaryLabel: 'CARE SUMMARY',
      reportWorkDoneLabel: 'WORK COMPLETED',
      reportIssuesLabel: 'OBSERVATIONS',
      reportAdviceLabel: 'TEAM RECOMMENDATION',
      noReports: 'No reports yet',
      status: 'HEALTH STATUS',
      healthy: 'Healthy',
      needsCare: 'Needs Care',
      area: 'DIMENSIONS',
      branch: 'SERVICE STUDIO',
      address: 'ADDRESS',
      loading: 'Syncing Data...',
      openReport: 'View Full Report',
      visitDate: 'VISIT DATE',
      viewAll: 'View All',
      before: 'BEFORE',
      after: 'AFTER',
      zonesTitle: 'ARCHITECTURAL ZONES',
      zonesSubtitle: 'Project structural and botanical layout',
      inventoryTitle: 'BOTANICAL INVENTORY',
      noZones: 'No zones defined by architect yet',
      totalArea: 'TOTAL AREA',
      sqm: 'sqm',
      items: 'items',
      share: 'Share Property',
      collaborators: 'Property Collaborators',
      invite: 'Invite User',
      emailPlacaholder: 'Enter user email...',
      add: 'Add',
      remove: 'Remove',
      noCollaborators: 'No collaborators yet',
      copyLink: 'Copy Architectural Link',
      linkCopied: 'Link Copied to Clipboard',
      manageAccess: 'Access Control',
      inviteUser: 'Direct Invite (Email)',
      editHouse: 'Edit House Info',
         shareHouse: 'Share House Access',
         chooseService: 'Choose service for this property',
      roles: {
        owner: 'Owner',
        manager: 'Manager',
        editor: 'Editor',
        viewer: 'Viewer'
      },
      activeServices: 'ACTIVE SERVICES',
      liveStatus: 'LIVE ON SITE',
      upcomingVisit: 'UPCOMING VISIT',
      activePlan: 'ACTIVE PLAN',
      onSiteNow: 'Team is currently on site'
    },
    zh: {
      back: '返回',
      details: '项目详情',
      reports: '维护报告',
      latest: '最新报告',
      archiveReports: '历史报告',
      reportOverview: '此地点的所有报告。点击查看详情。',
      fullReport: '完整报告',
      openLatestReport: '打开最新报告',
      reportLog: '养护记录',
      reportTimestamp: '报告时间',
      reportNextVisit: '下次养护',
      reportVisuals: '现场照片',
      reportBeforeLabel: '养护前',
      reportAfterLabel: '养护后',
      reportNoBefore: '暂无照片',
      reportNoAfter: '暂无照片',
      reportSummaryLabel: '养护摘要',
      reportWorkDoneLabel: '已完成工作',
      reportIssuesLabel: '现场发现',
      reportAdviceLabel: '团队建议',
      noReports: '暂无报告',
      status: '健康状态',
      healthy: '健康',
      needsCare: '需要养护',
      area: '面积信息',
      branch: '服务中心',
      address: '详细地址',
      loading: '正在同步数据...',
      openReport: '查看完整报告',
      visitDate: '到访日期',
      viewAll: '查看全部',
      before: '之前',
      after: '之后',
      zonesTitle: '建筑区域',
      zonesSubtitle: '项目结构与植物布局',
      inventoryTitle: '植物清单',
      noZones: '暂无区域信息',
      totalArea: '总面积',
      sqm: '平方米',
      items: '项',
      editHouse: '编辑项目信息',
      shareHouse: '管理访问权限',
      chooseService: '为此地点选择服务',
      linkCopied: '链接已复制',
      accessControl: '访问控制',
      archLink: '通用访问链接',
      copyLink: '复制链接',
      manageAccess: '管理权限',
      inviteBtn: '发送邀请',
      noCollaborators: '暂无协作者',
      roles: {
        owner: '业主',
        manager: '经理',
        editor: '编辑',
        viewer: '访客'
      }
    }
  }[(locale as 'th' | 'en' | 'zh') || 'th'] || { back: 'Back', details: 'Details', roles: {} }

  const refreshCollaborators = async (hId: string, ownerId?: string, customerId?: string, preloadedRole?: string) => {
    const { data } = await getHouseCollaborators(hId)
    setCollaborators(data || [])
    
    const isOwner = ownerId === profile?.id || customerId === profile?.id
    
    if (isOwner) {
       setMyRole('owner')
    } else if (preloadedRole && preloadedRole !== 'viewer') {
       // If the parent API (dashboard) already knows the role, trust it
       setMyRole(preloadedRole as any)
    } else {
       const me = data?.find(c => c.user_id === profile?.id)
       setMyRole(me?.role || 'viewer')
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail || !house) return
    setIsInviting(true)
    const { error } = await inviteCollaboratorByEmail(house.id, inviteEmail, inviteRole)
    if (error) {
      alert(error.message)
    } else {
      setInviteEmail('')
      await refreshCollaborators(house.id, house.user_id, house.customer_id)
    }
    setIsInviting(false)
  }

  const handleRemoveCollaborator = async (userId: string) => {
    if (!house) return
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้ออกจากโครงการ?')) return
    
    // Optimistic update
    setCollaborators(prev => prev.filter(c => c.user_id !== userId))
    
    const { error } = await apiRemoveCollaborator(house.id, userId)
    if (error) {
      alert('เกิดข้อผิดพลาดในการลบผู้ใช้: ' + error.message)
      await refreshCollaborators(house.id, house.user_id, house.customer_id) // Revert on error
    }
  }

  const handleUpdateRole = async (userId: string, newRole: HouseCollaboratorRole) => {
    if (!house) return
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนสิทธิ์ของผู้ใช้นี้?')) return
    
    // Optimistic update
    setCollaborators(prev => prev.map(c => c.user_id === userId ? { ...c, role: newRole } : c))
    
    const { error } = await updateCollaboratorRole(house.id, userId, newRole)
    if (error) {
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์: ' + error.message)
      await refreshCollaborators(house.id, house.user_id, house.customer_id) // Revert on error
    }
  }

  const handleToggleNotifications = async (userId: string, currentStatus: boolean) => {
    if (!house) return
    // Optimistic UI update
    setCollaborators(prev => prev.map(c => c.user_id === userId ? { ...c, receive_notifications: !currentStatus } : c))
    // Call API (will create this in lib)
    const { error } = await supabase
       .from('house_collaborators')
       .update({ receive_notifications: !currentStatus })
       .eq('house_id', house.id)
       .eq('user_id', userId)
       
    if (error) {
       // Revert if failed
       setCollaborators(prev => prev.map(c => c.user_id === userId ? { ...c, receive_notifications: currentStatus } : c))
       alert('Failed to update notifications preference')
    }
  }

  const handleCopyLink = async () => {
    if (!house) return
    setIsCopied(true)
    
    const generateUrlPromise = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const res = await fetch(`/api/houses/${house.id}/invites`, {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ role: inviteRole })
      })
      
      const text = await res.text()
      let data
      try {
         data = JSON.parse(text)
      } catch (e) {
         throw new Error(`API returned invalid JSON: ${text.substring(0, 50)}...`)
      }
      
      if (res.ok && data.token) {
        return window.location.origin + `/invite/house/${house.id}?token=${data.token}`
      } else {
        throw new Error(data.error || 'Failed to generate invite link')
      }
    }

    try {
      const urlPromise = generateUrlPromise()
      
      try {
        const ClipboardItemClass = (window as any).ClipboardItem
        // Only use ClipboardItem with promise if it's Safari or fully supported
        // Wait, Chrome supports it too. Firefox might not.
        if (ClipboardItemClass) {
          const blobPromise = urlPromise.then(url => new Blob([url], { type: 'text/plain' }))
          await navigator.clipboard.write([
            new ClipboardItemClass({ 'text/plain': blobPromise })
          ])
        } else {
          const url = await urlPromise
          await navigator.clipboard.writeText(url)
        }
        
        setShowToast(true)
        setTimeout(() => {
          setIsCopied(false)
          setShowToast(false)
        }, 3000)
      } catch (clipboardErr) {
        // Fallback
        const url = await urlPromise
        const textArea = document.createElement("textarea")
        textArea.value = url
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (!successful) {
           throw new Error("เบราว์เซอร์ของคุณไม่อนุญาตให้คัดลอก กรุณาลองใช้วิธีอื่น")
        }
        
        setShowToast(true)
        setTimeout(() => {
          setIsCopied(false)
          setShowToast(false)
        }, 3000)
      }
    } catch (err: any) {
      console.error(err)
      alert(`Error: ${err?.message || 'Failed to generate invite link'}`)
      setIsCopied(false)
    }
  }

  const loadData = async (showLoading = true) => {
    if (!profile || !houseId) {
       // If we're here and loading is still true, we should stop it if we know we can't load
       if (!authLoading && !profile) setLoading(false)
       return
    }
    if (showLoading) setLoading(true)
    try {
      const hId = Array.isArray(houseId) ? houseId[0] : houseId
      const isInvite = window.location.search.includes('invite=true')
      
      const { data: houses } = await getCustomerHouses(profile.id)
      let targetHouse = houses?.find(h => h.id === hId || h.house_code === hId)
      
      // Fallback: If not found in the list, try a direct lookup (handles cases where collaborator sync might be slow)
      if (!targetHouse) {
         const { data: directHouse } = await supabase.from('houses').select('*').eq('id', hId).maybeSingle()
         if (directHouse) {
            // Check if user has access via collaborator table even if not in the cached list
            const { data: coll } = await supabase.from('house_collaborators').select('*').eq('house_id', hId).eq('user_id', profile.id).maybeSingle()
            if (coll || directHouse.user_id === profile.id || directHouse.customer_id === profile.id) {
               targetHouse = directHouse as HouseData
               if (coll) {
                  (targetHouse as any).role = coll.role
               }
            }
         }
      }

      if (targetHouse) {
        setHouse(targetHouse)
        await refreshCollaborators(targetHouse.id, targetHouse.user_id, targetHouse.customer_id, (targetHouse as any).role)
        const { data: plan } = await getHousePlanByHouseId(targetHouse.id)
        setHousePlan(plan)

        const result = await fetchAuthorizedJson<{ success?: boolean; data?: any[] }>('/api/customer/orders')
        let safeOrders: OrderInsightRow[] = []
        if (result && result.success && result.data) {
          safeOrders = result.data.filter((o: any) => o.house_id === targetHouse.id && o.status !== 'cancelled')
        }
        
        safeOrders.sort((a: any, b: any) => {
          if (!a.scheduled_date) return 1;
          if (!b.scheduled_date) return -1;
          return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
        })
        setOrders(safeOrders)
        const orderIds = safeOrders.map(o => o.id)
             if (orderIds.length > 0) {
                const reportPayload = await fetchAuthorizedJson<{ reports?: CustomerReportItem[]; summary?: ReturnType<typeof buildCustomerReportSummary>; plans?: CustomerReportPlanItem[] }>(`/api/customer/reports?houseId=${encodeURIComponent(targetHouse.id)}&limit=120`)
                const safeReports = reportPayload.reports || []
                setReports(safeReports)
                setReportSummary(reportPayload.summary || buildCustomerReportSummary(safeReports))
                setPlanItems(reportPayload.plans || [])
                setSelectedReportId(safeReports[0]?.id || null)
             }
      }
    } catch (err) {
      console.error(err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    if (!profile && !authLoading) {
      // If auth is loaded but profile is missing, we need to log in
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }
    if (profile && houseId) {
       loadData()
    }
  }, [profile, houseId, authLoading])

  // Deep-linking & History Management for Reports
  useEffect(() => {
    if (loading || reports.length === 0) return
    const reportId = searchParams.get('reportId') || searchParams.get('id')

    if (!reportId) {
      setIsReportDetailOpen(false)
      setSelectedReportId(null)
      return
    }

    if (reportId) {
      const match = reports.find(r => r.id === reportId)
      if (match) {
        setSelectedReportId(reportId)
        setIsReportDetailOpen(true)
      }
    }
  }, [loading, reports, searchParams])

  const selectedReport = useMemo(() => reports.find(r => r.id === selectedReportId) || reports[0] || null, [reports, selectedReportId])
  const zones = useMemo(() => {
    const elements = housePlan?.plan_data?.elements
    if (!Array.isArray(elements)) return []
    return elements.filter((el: any) => el && (el.type === 'space' || el.shape === 'polygon' || el.shape === 'rectangle'))
  }, [housePlan])

   const handleOpenReport = (reportId?: string | null) => {
      if (!reportId) return
      const params = new URLSearchParams(searchParams.toString())
      params.set('reportId', reportId)
      router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
   }

   const handleCloseReport = () => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('reportId')
      params.delete('id')
      router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
   }

  if (loading) return (
      <XYLLoader tagline={copy?.loading || 'กำลังซิงค์ข้อมูล...'} />
  )

  if (!house) return (
    <div className="customer-editorial-page flex min-h-screen items-center justify-center px-6">
       <div className="customer-editorial-empty w-full max-w-xl text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
             <AlertTriangle size={32} strokeWidth={1.5} />
          </div>
          <p className="customer-editorial-kicker text-red-500 uppercase tracking-[0.3em] font-bold text-[10px]">Access Denied or Not Found</p>
          <h2 className="customer-editorial-empty-title mt-6 text-3xl font-light leading-tight">{locale === 'en' ? 'Sorry, no information for this house was found. Or you don\'t have access rights?' : locale === 'zh' ? '抱歉，没有找到该房子的信息。或者你没有访问权限？' : 'ขออภัย ไม่พบข้อมูลบ้านหลังนี้ หรือคุณไม่มีสิทธิ์เข้าถึงครับ'}</h2>
          <p className="mt-6 text-[14px] text-gray-500 leading-relaxed">{locale === 'en' ? 'Please check the link again. Or try logging in again with the correct account.' : locale === 'zh' ? '请再次检查链接。或者尝试使用正确的帐户重新登录。' : 'กรุณาตรวจสอบลิงก์อีกครั้ง หรือลองเข้าสู่ระบบใหม่ด้วยบัญชีที่ถูกต้อง'}</p>
          <div className="customer-editorial-button-row mt-12 justify-center gap-4">
            <Link href="/dashboard/customer" className="customer-editorial-button-secondary py-4 px-8 border border-[#111111] text-[10px] font-bold uppercase tracking-widest">
               {copy.back}
            </Link>
            <button onClick={() => window.location.reload()} className="customer-editorial-button-primary bg-[#111111] text-white py-4 px-8 text-[10px] font-bold uppercase tracking-widest">
               {locale === 'en' ? 'try again' : locale === 'zh' ? '再试一次' : '                ลองอีกครั้ง             '}</button>
          </div>
       </div>
    </div>
  )

  return (
    <div className="customer-editorial-page relative flex min-h-screen max-w-full flex-col overflow-x-hidden pb-40 selection:bg-[#111111] selection:text-white">
      
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-24 z-[110] flex -translate-x-1/2 items-center gap-3 bg-[var(--customer-ink)] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-2xl"
          >
             <CheckCircle2 size={14} className="text-[#4ADE80]" />
             {copy?.linkCopied || 'คัดลอกสำเร็จ'}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="fixed left-0 top-0 z-40 flex h-20 w-full items-center justify-between border-b border-[var(--customer-line)] bg-white/90 px-6 backdrop-blur-xl">
         <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (searchParams.get('from') === 'invite') {
                  router.push('/dashboard/customer')
                } else {
                  router.back()
                }
              }} 
              className="customer-editorial-icon-button" 
              type="button"
            >
               <ChevronLeft size={18} strokeWidth={1.5} />
            </button>
            {myRole !== 'owner' && (
                <div className="role-badge">
                   <Shield size={10} strokeWidth={2.5} />
                  <span>{copy.roles?.[myRole as keyof typeof copy.roles] || myRole}</span>
                </div>
            )}
         </div>
         
         <div className="customer-editorial-kicker pointer-events-none absolute left-1/2 hidden max-w-[50%] -translate-x-1/2 overflow-hidden text-ellipsis whitespace-nowrap text-center md:block">
            {house?.name || 'PROJECT JOURNAL'} / {house?.id?.substring(0, 4).toUpperCase() || '-'}
         </div>

         {myRole !== 'viewer' && (
           <div className="relative">
              <button 
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                className={`customer-editorial-icon-button ${isActionMenuOpen ? 'bg-[var(--customer-paper)]' : ''}`}
                type="button"
              >
                 <MoreVertical size={18} strokeWidth={1.5} />
              </button>

            <AnimatePresence>
               {isActionMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-[45]" onClick={() => setIsActionMenuOpen(false)} />
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.9, y: 10 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.9, y: 5 }}
                               className="absolute right-0 z-[50] mt-4 w-52 overflow-hidden border border-[var(--customer-line)] bg-white/90 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-2xl"
                   >
                       {(myRole === 'owner' || myRole === 'editor') && (
                         <button 
                           onClick={() => {
                              setIsActionMenuOpen(false)
                              router.push(`/dashboard/customer/houses/edit/${house.id}`)
                           }}
                           className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#1A3626] hover:text-white transition-all text-left"
                         >
                            <Pencil size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{copy.editHouse}</span>
                         </button>
                       )}
                       {myRole === 'owner' && (
                         <button 
                           onClick={() => {
                              setIsActionMenuOpen(false)
                              setIsShareModalOpen(true)
                           }}
                           className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#1A3626] hover:text-white transition-all text-left"
                         >
                            <Share size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{copy.shareHouse}</span>
                         </button>
                       )}
                   </motion.div>
                 </>
               )}
            </AnimatePresence>
         </div>
       )}
      </header>

      <main className="flex-1 w-full pb-0 thai-vowel-fix">
        <section className="relative w-full h-[80vh] md:h-[85vh] mb-24 overflow-hidden">
           <motion.div 
             initial={{ scale: 1.1, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1] }}
             className="absolute inset-0 bg-[#FAFAFA]"
           >
              <img 
                        src={house.image_url || "/assets/default-house.png"}
                className="w-full h-full object-cover grayscale-[0.2] brightness-90"
                alt="House Hero"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white/90" />
           </motion.div>

           <div className="absolute inset-0 flex flex-col justify-end px-6 pb-20 max-w-2xl mx-auto w-full">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
                className="customer-editorial-panel bg-white/85 p-6 backdrop-blur-xl md:p-14"
              >
                 <div className="flex items-center gap-3 mb-8">
                    <div className="h-px w-8 bg-[var(--customer-accent)]" />
                    <span className="customer-editorial-kicker">{copy.details}</span>
                 </div>
                 <h1 className="customer-editorial-title !mt-0 uppercase !text-4xl md:!text-[4.5rem]">
                    {house.name}
                 </h1>
                 <div className="mt-8 flex items-start gap-4 opacity-70">
                    <MapPin size={18} className="mt-0.5" strokeWidth={1} />
                    <p className="customer-editorial-body max-w-sm !text-[14px] tracking-tight text-[var(--customer-ink)]">
                       {house.address || 'Architectural Site Exploration'}
                    </p>
                 </div>
                 {myRole !== 'viewer' && (
                 <div className="mt-10">
                    <Link
                      href={`/dashboard/customer?tab=orders&booking_house=${encodeURIComponent(house.id)}&booking_step=1`}
                      className="customer-editorial-button-primary inline-flex w-full justify-between md:w-auto"
                    >
                      <span>{copy.chooseService}</span>
                      <ChevronRight size={16} className="ml-4 shrink-0" />
                    </Link>
                 </div>
                 )}
              </motion.div>
           </div>
        </section>

        <div className="mx-auto w-full max-w-7xl px-6">
           <section className="grid grid-cols-2 mb-12 gap-3 md:gap-4">
              <div className="customer-editorial-stat flex min-h-[140px] md:min-h-[220px] flex-col justify-between gap-4 md:gap-8 p-4 md:p-10">
                 <div className="flex items-center gap-2">
                    <Ruler size={12} className="text-[var(--customer-muted)]" />
                    <span className="customer-editorial-meta">{copy.area}</span>
                 </div>
                 <div className="space-y-2 md:space-y-4">
                    <div className="flex flex-wrap items-end gap-x-2 md:gap-x-3 gap-y-1 md:gap-y-2 text-2xl font-light leading-[0.88] tracking-tighter text-[var(--customer-ink)] md:text-5xl" style={{ fontFamily: 'var(--customer-font-serif)' }}>
                       <span>{house.area_size ? formatNumberByLocale(house.area_size, locale) : '-'}</span>
                       <span className="text-[9px] md:text-[11px] uppercase font-bold tracking-widest mb-0.5 md:mb-1">{copy.sqm}</span>
                    </div>
                    <div className="h-px w-12 bg-[var(--customer-line)]" />
                 </div>
              </div>
              <div className="customer-editorial-stat flex min-h-[140px] md:min-h-[220px] flex-col justify-between gap-4 md:gap-8 p-4 md:p-10" style={{ backgroundColor: 'var(--customer-accent)', color: 'white', borderColor: 'var(--customer-accent)' }}>
                 <div className="flex items-center gap-2">
                    <Activity size={12} className="text-white/40" />
                    <span className="customer-editorial-meta text-white/50">{copy.status}</span>
                 </div>
                 <div className="space-y-2 md:space-y-4">
                    <div className="text-2xl font-light leading-[0.88] tracking-tighter text-white md:text-5xl" style={{ fontFamily: 'var(--customer-font-serif)' }}>
                       {reports.length > 0 ? copy.healthy : '-'}
                    </div>
                    <div className="h-px w-12 bg-white/15" />
                 </div>
              </div>
              <div className="customer-editorial-panel flex flex-col gap-4 md:gap-6 p-4 md:flex-row md:items-end md:justify-between md:p-10">
                 <div className="space-y-2 md:space-y-4">
                   <div className="flex items-center gap-2">
                    <Layers3 size={12} className="text-[var(--customer-muted)]" />
                    <span className="customer-editorial-meta">{copy.branch}</span>
                   </div>
                   <div className="text-xs md:text-base font-bold uppercase tracking-[0.22em] text-[#111111] leading-relaxed break-words">
                      {house.branch_name || house.branch_code || 'สำนักงานใหญ่'}
                   </div>
                 </div>
                 <div className="h-px w-12 bg-[#EAEAEA] md:h-12 md:w-px shrink-0 hidden md:block" />
              </div>
              <div className="customer-editorial-panel flex flex-col gap-4 md:gap-6 p-4 md:p-10">
                 <div className="flex items-center gap-2">
                    <Activity size={12} className="text-[var(--customer-muted)]" />
                    <span className="customer-editorial-meta">{copy.activeServices}</span>
                 </div>
                 <div className="flex flex-col gap-4 mt-auto">
                    {orders && orders.length > 0 ? Array.from(new Set(orders.filter(o => o.service_id).map(o => o.service_id))).map(serviceId => {
                                                const serviceOrders = orders.filter(o => o.service_id === serviceId)
                        const serviceName = serviceOrders[0]?.services?.service_name || 'Service Plan'
                        const nextOrder = serviceOrders.find(o => o.status === 'confirmed' || o.status === 'pending')
                        return (
                           <div key={serviceId as string} className="flex flex-col">
                              <p className="text-xs md:text-base font-bold uppercase tracking-[0.22em] text-[#111111] leading-relaxed break-words">{serviceName}</p>
                              {nextOrder ? (
                                 <p className="text-[9px] md:text-[10px] text-[var(--customer-muted)] mt-1">{locale === 'en' ? 'Next appointment:' : locale === 'zh' ? '下次预约：' : 'นัดหมายถัดไป: '}{formatDateByLocale(nextOrder.scheduled_date, locale)}</p>
                              ) : (
                                 <p className="text-[9px] md:text-[10px] text-emerald-600 mt-1">Active</p>
                              )}
                           </div>
                        )
                    }) : (
                        <div className="text-2xl font-light leading-[0.88] tracking-tighter text-[var(--customer-ink)] md:text-5xl" style={{ fontFamily: 'var(--customer-font-serif)' }}>
                           -
                        </div>
                    )}
                 </div>
              </div>
           </section>

           <section className="mb-24">
              <GardenCalendar 
                key={house.id}
                orders={orders || []} 
                reports={reports || []} 
                locale={locale as any}
                autoOpenOrderId={autoCalendarOrderId}
                autoFocusCalendar={autoOpenCalendar}
                autoStartReschedule={autoOpenCalendar}
                onRefresh={() => loadData(false)}
                onOpenReport={(reportId) => handleOpenReport(reportId)}
              />
           </section>

           <section className="mb-28">
                      <div className="customer-editorial-toolbar mb-12 border-b border-[var(--customer-line)] pb-8">
                  <div>
                              <h3 className="customer-editorial-kicker">{copy.zonesTitle}</h3>
                              <p className="customer-editorial-body mt-3">{copy.zonesSubtitle}</p>
                  </div>
                           <div className="customer-editorial-meta">
                    {zones.length} {copy.items}
                  </div>
               </div>

               {zones.length > 0 ? (
                  <div className="space-y-16">
                     {zones.map((zone: any, idx: number) => (
                       <div key={idx} className="group pb-16 border-b border-[#F5F5F5] last:border-0">
                          <div className="flex flex-col gap-10">
                             <div className="flex items-baseline justify-between mb-2">
                                <div className="flex items-baseline gap-6">
                                   <span className="text-[11px] font-bold opacity-20 font-sans tracking-widest">0{idx + 1}</span>
                                   <h4 className="font-serif-thai text-4xl font-light uppercase tracking-tight group-hover:tracking-widest transition-all duration-1000 ease-in-out">
                                      {zone.name || `ZONE ${idx + 1}`}
                                   </h4>
                                </div>
                                <div className="text-right">
                                   <div className="text-[10px] font-light font-serif-thai uppercase text-[#A3A3A3]">
                                      {zone.areaSqm ? `${formatNumberByLocale(zone.areaSqm, locale)} ${copy.sqm}` : '-'}
                                   </div>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-4 pt-4">
                                {Array.isArray(zone.inventory) && zone.inventory.map((item: any, i: number) => (
                                   <div key={i} className="botanical-row flex items-center justify-between py-3">
                                      <div className="flex items-center gap-4">
                                         {item.type === 'tree' ? <TreeDeciduous size={14} className="text-[#1A3626] opacity-60" /> : <Leaf size={14} className="text-[#A3A3A3] opacity-40" />}
                                         <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#111111] opacity-70">{item.name}</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-[#A3A3A3] font-sans">{item.qty}</span>
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
               ) : (
                  <div className="customer-editorial-empty py-24">
                     <p className="customer-editorial-body text-xl italic">{copy.noZones}</p>
                  </div>
               )}
           </section>

                <section className="mb-28 space-y-8">
                      <div className="customer-editorial-toolbar border-b border-[var(--customer-line)] pb-8 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                         <div>
                            <h3 className="customer-editorial-kicker">{copy.reports}</h3>
                            <p className="customer-editorial-body mt-3">{copy.reportOverview}</p>
                         </div>
                         {reports.length > 0 ? (
                            <div className="text-right">
                               <p className="customer-editorial-meta">{copy.latest}</p>
                               <p className="mt-2 text-sm font-bold uppercase tracking-[0.12em] text-[#111111]">{formatDateByLocale(reports[0]?.updatedAt || reports[0]?.createdAt, locale)}</p>
                            </div>
                         ) : null}
                      </div>

                      {planItems.length > 0 ? (
                         <div className="customer-editorial-grid three gap-4">
                            <div className="customer-editorial-stat">
                               <p className="customer-editorial-meta">Annual Plan</p>
                               <p className="customer-editorial-stat-value">{reportSummary.completedPlannedReports}/{reportSummary.plannedReports}</p>
                            </div>
                            <div className="customer-editorial-stat">
                               <p className="customer-editorial-meta">Completed</p>
                               <p className="customer-editorial-stat-value !text-[var(--customer-success)]">{reportSummary.completedPlannedReports}</p>
                            </div>
                            <div className="customer-editorial-stat">
                               <p className="customer-editorial-meta">Remaining</p>
                               <p className="customer-editorial-stat-value !text-[var(--customer-amber)]">{reportSummary.pendingPlannedReports}</p>
                            </div>
                         </div>
                      ) : null}

                      <CustomerReportFeed
                         reports={reports}
                         emptyMessage={copy.noReports}
                         showHouseContext={false}
                         showOrderContext={true}
                         onClick={(report) => handleOpenReport(report.id)}
                      />
                </section>

           <footer className="mt-20 border-t border-[#EAEAEA] py-8 text-center">
               <p className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A3]">
                  POWERED BY AND COPYRIGHT &copy; XYL STUDIO
               </p>
           </footer>
        </div>
      </main>

      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        collaborators={collaborators}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        inviteRole={inviteRole}
        setInviteRole={setInviteRole}
        onInvite={handleInvite}
        onCopyLink={handleCopyLink}
        isCopied={isCopied}
        isInviting={isInviting}
        onRemove={handleRemoveCollaborator}
        onUpdateRole={handleUpdateRole}
        onToggleNotifications={handleToggleNotifications}
        myRole={myRole}
        locale={locale}
        copy={copy}
        house={house}
        currentUserProfile={profile}
      />

         <AnimatePresence>
            {isReportDetailOpen && selectedReport && (
               <>
                  <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="fixed inset-0 z-[120] bg-white/60 backdrop-blur-md"
                     onClick={() => setIsReportDetailOpen(false)}
                  />
                  <motion.div
                     initial={{ opacity: 0, y: '100%' }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: '100%' }}
                     className="fixed inset-0 z-[130] overflow-hidden bg-white"
                  >
                      <div className="flex items-center justify-between border-b border-[#F0EFEB] px-8 py-6 bg-white/80 backdrop-blur-md sticky top-0 z-[140]">
                        <div>
                           <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#A3A3A3]">{copy.latest}</p>
                           <h4 className="mt-2 font-serif-thai text-2xl font-light uppercase tracking-tight text-[#111111]">{copy.fullReport}</h4>
                        </div>
                        <button
                           type="button"
                           onClick={() => setIsReportDetailOpen(false)}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A3626]/[0.05] text-[#1A3626] hover:bg-[#1A3626] hover:text-white transition-all duration-300"
                        >
                           <X size={18} />
                        </button>
                     </div>

                     <div className="h-[calc(100%-76px)] overflow-y-auto bg-[#F7F5EF]">
                        <CustomerReportDetailPanel
                          report={selectedReport}
                          onBack={handleCloseReport}
                          actions={selectedReport.orderId ? {
                            rateHref: `/dashboard/customer/orders/${selectedReport.orderId}?action=rate-report&reportId=${selectedReport.id}`,
                            issueHref: `/dashboard/customer/orders/${selectedReport.orderId}?action=issue-report&reportId=${selectedReport.id}`,
                          } : undefined}
                        />
                     </div>
                  </motion.div>
               </>
            )}
         </AnimatePresence>
    </div>
  )
}

// --- Sub-components ---

const ShareModal = ({ 
  isOpen, 
  onClose, 
  collaborators, 
  inviteEmail, 
  setInviteEmail, 
  inviteRole, 
  setInviteRole, 
  onInvite, 
  onCopyLink, 
  isCopied, 
  isInviting,
  onRemove,
  onUpdateRole,
  onToggleNotifications,
  myRole,
  locale,
  copy,
  house,
  currentUserProfile
}: any) => {
      if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-white/60 backdrop-blur-xl" 
        onClick={onClose} 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full h-full md:h-auto md:max-h-[90vh] max-w-2xl flex flex-col overflow-hidden border-0 md:border md:border-[#F0EFEB] bg-white shadow-none md:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] rounded-none"
      >
        <div className="flex-none flex items-center justify-between border-b border-[#F0EFEB] px-6 md:px-8 py-6">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#A3A3A3]">{copy.manageAccess}</p>
            <h4 className="mt-2 font-serif-thai text-xl md:text-2xl font-light uppercase tracking-tight text-[#111111]">{copy.shareHouse}</h4>
          </div>
          <button 
            onClick={onClose}
            className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-none bg-[#1A3626]/[0.05] text-[#1A3626] hover:bg-[#1A3626] hover:text-white transition-all duration-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto overflow-x-hidden">
           {/* Universal Link */}
           <div className="mb-10 bg-[#F7F5EF] p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                 <LinkIcon size={14} className="text-[#1A3626]" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A3626]">{copy.archLink}</span>
              </div>
              <p className="text-[12px] text-[#A3A3A3] mb-6 leading-relaxed">
                 {locale === 'en' ? 'Those who receive this universal link will be able to access project information and garden maintenance records without logging in.' : locale === 'zh' ? '收到此通用链接的人无需登录即可访问项目信息和花园维护记录。' : '                  ผู้ที่ได้รับลิงก์สากลนี้จะสามารถเข้าถึงข้อมูลโครงการและบันทึกการดูแลสวนได้โดยไม่ต้องเข้าสู่ระบบ               '}</p>
              
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full sm:w-auto bg-white border border-[#EAEAEA] rounded-none px-4 py-3 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-[#1A3626] transition-all"
                >
                   <option value="viewer">{copy.roles?.viewer || 'Viewer'}</option>
                   <option value="editor">{copy.roles?.editor || 'Editor'}</option>
                </select>
                <button 
                  onClick={onCopyLink}
                  className="flex-1 flex items-center justify-center gap-3 bg-white px-6 py-3 border border-[#EAEAEA] hover:border-[#1A3626] transition-all"
                >
                  {isCopied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span className="text-[10px] font-bold uppercase tracking-widest">{isCopied ? copy.linkCopied : copy.copyLink}</span>
                </button>
              </div>
           </div>

           {/* Direct Invite */}
           {myRole === 'owner' && (
             <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                   <UserPlus size={14} className="text-[#1A3626]" />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A3626]">{copy.inviteUser}</span>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                   <input 
                     type="email"
                     value={inviteEmail}
                     onChange={(e) => setInviteEmail(e.target.value)}
                     placeholder="email@example.com"
                     className="flex-1 w-full bg-[#FAFAFA] border border-[#EAEAEA] rounded-none px-4 py-3 text-[13px] focus:border-[#1A3626] outline-none transition-all"
                   />
                   <div className="flex gap-3 w-full md:w-auto">
                      <select 
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as any)}
                        className="flex-1 md:w-32 bg-white border border-[#EAEAEA] rounded-none px-3 py-3 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-[#1A3626] transition-all"
                      >
                         <option value="viewer">{copy.roles.viewer}</option>
                         <option value="editor">{copy.roles.editor}</option>
                      </select>
                      <button 
                        onClick={onInvite}
                        disabled={isInviting || !inviteEmail}
                        className="bg-[#1A3626] text-white rounded-none px-6 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 hover:bg-[#2A4A38] transition-all"
                      >
                         {isInviting ? '...' : copy.inviteBtn}
                      </button>
                   </div>
                </div>
             </div>
           )}

           {/* Collaborators List */}
           <div>
              <div className="flex items-center gap-3 mb-4">
                 <Users size={14} className="text-[#1A3626]" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A3626]">{copy.noCollaborators}</span>
              </div>
              <div className="space-y-3">
                 {/* Owner */}
                 <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-none gap-4 hover:shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-4">
                       {(myRole === 'owner' && (currentUserProfile as any)?.avatar_url) ? (
                          <img src={(currentUserProfile as any).avatar_url} alt="avatar" className="h-10 w-10 shrink-0 rounded-none object-cover" />
                       ) : (
                          <div className="h-10 w-10 shrink-0 rounded-none bg-[#1A3626] flex items-center justify-center text-white text-[12px] font-bold">
                             {(house?.customer_name || (myRole === 'owner' ? currentUserProfile?.display_name : '') || 'Owner').substring(0, 1).toUpperCase()}
                          </div>
                       )}
                       <div>
                          <p className="text-[13px] font-bold text-[#111111]">{house?.customer_name || (myRole === 'owner' ? currentUserProfile?.display_name : null) || 'Owner'}</p>
                       </div>
                    </div>
                    <div className="flex items-center justify-start md:justify-end w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-[#EAEAEA] md:border-t-0">
                       <div className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-none bg-[#1A3626]/[0.05] text-[#1A3626]">
                          {copy.roles.owner}
                       </div>
                    </div>
                 </div>

                 {collaborators.length > 0 ? collaborators.map((c: any) => {
                                         const displayName = c.profiles?.display_name || c.profiles?.email?.split('@')[0] || 'User';
                    return (
                    <div key={c.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-[#EAEAEA] rounded-none gap-4 hover:shadow-sm transition-all duration-300">
                       <div className="flex items-center gap-4">
                          {c.profiles?.avatar_url ? (
                             <img src={c.profiles.avatar_url} alt="avatar" className="h-10 w-10 shrink-0 rounded-none object-cover" />
                          ) : (
                             <div className="h-10 w-10 shrink-0 rounded-none bg-[#F5F5F5] flex items-center justify-center text-[#A3A3A3] text-[12px] font-bold uppercase">
                                {displayName.substring(0, 1).toUpperCase()}
                             </div>
                          )}
                           <div className="overflow-hidden">
                              <p className="text-[13px] font-bold text-[#111111] truncate">
                                {c.profiles?.display_name || c.profiles?.email?.split('@')[0] || `User (${c.user_id?.substring(0,8)}...)`}
                              </p>
                           </div>
                       </div>
                       <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-[#EAEAEA] md:border-t-0">
                          {/* Notifications Toggle */}
                          {c.user_id === currentUserProfile?.id && (
                             <button
                               onClick={() => onToggleNotifications(c.user_id, c.receive_notifications !== false)}
                               className={`flex items-center justify-center h-8 w-8 md:w-auto md:px-3 rounded-none border text-[9px] font-bold uppercase tracking-widest transition-all ${
                                 c.receive_notifications !== false 
                                   ? 'border-[#1A3626] text-[#1A3626] bg-[#1A3626]/5' 
                                   : 'border-[#EAEAEA] text-[#A3A3A3] hover:border-[#1A3626] hover:text-[#1A3626]'
                               }`}
                               title={locale === 'en' ? 'Receive notifications' : locale === 'zh' ? '接收通知' : 'รับการแจ้งเตือน'}
                             >
                               {c.receive_notifications !== false ? <Bell size={13} /> : <BellOff size={13} />}
                               <span className="hidden md:inline md:ml-1.5">{c.receive_notifications !== false ? 'Notifications On' : 'Notifications Off'}</span>
                             </button>
                          )}

                          {/* Role Management */}
                          {myRole === 'owner' && c.user_id !== currentUserProfile?.id ? (
                             <select
                               value={c.role}
                               onChange={(e) => onUpdateRole(c.user_id, e.target.value)}
                               className="text-[9px] font-bold uppercase tracking-widest px-2 py-1.5 h-8 rounded-none border border-[#EAEAEA] outline-none bg-white focus:border-[#1A3626] transition-all"
                             >
                                <option value="viewer">{copy.roles?.viewer || 'Viewer'}</option>
                                <option value="editor">{copy.roles?.editor || 'Editor'}</option>
                             </select>
                          ) : (
                             <div className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-none border border-[#EAEAEA]">
                                {copy.roles?.[c.role as keyof typeof copy.roles] || c.role}
                             </div>
                          )}

                          {myRole === 'owner' && c.user_id !== currentUserProfile?.id && (
                            <button 
                              onClick={() => onRemove(c.user_id)}
                              className="flex items-center justify-center h-8 w-8 rounded-none text-[#A3A3A3] hover:text-red-600 transition-colors border border-transparent hover:border-red-100 hover:bg-red-50"
                              title={locale === 'en' ? 'Delete this user' : locale === 'zh' ? '删除该用户' : 'ลบผู้ใช้นี้'}
                            >
                               <Trash2 size={14} />
                            </button>
                          )}
                       </div>
                    </div>
                    );
                 }) : null}
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  )
}

