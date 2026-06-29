'use client';
import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  Home, 
  User, 
  Plus, 
  Trash2, 
  ImagePlus, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft,
  UploadCloud,
  FileText,
  AlertCircle,
  Calendar,
  Zap,
  X
} from 'lucide-react'
import { useI18n } from "@/lib/I18nContext";

type CustomerRow = {
  id: string
  display_name?: string | null
  email?: string | null
}

type OrderRow = {
  id: string
  order_code?: string | null
  customer_id: string
  status?: string | null
  created_at?: string | null
  service_id?: string | null
  total_sessions?: number | null
  completed_sessions?: number | null
  services?: { service_name?: string | null; name?: string | null } | null
  houses?: { name?: string | null; image_url?: string | null } | null
}

type ZoneData = {
  id: string
  name: string
  work_done: string
  beforePhotos: string[]
  afterPhotos: string[]
}

type HouseReportData = {
  orderId: string
  workDoneItems: string[]
  problemItems: string[]
  recommendationItems: string[]
  problemsFound: string
  recommendations: string
  nextVisitDate: string
  individualWorkDone: string
  beforePhotos: string[]
  afterPhotos: string[]
  zones: ZoneData[]
  uploading: boolean
}

export default function AdminBatchReportPage() {
    const { locale } = useI18n();
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  
  const [searchQuery, setSearchQuery] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  
  // Per-house data
  const [reportsData, setReportsData] = useState<Record<string, HouseReportData>>({})
  const [nextVisitDate, setNextVisitDate] = useState('')

  const WORK_DONE_OPTIONS = [
    'ตัดแต่งกิ่งไม้',
    'ตัดหญ้าสนาม',
    'พ่นยากำจัดแมลง',
    'ใส่ปุ๋ย/บำรุงดิน',
    'รดน้ำต้นไม้',
    'กำจัดวัชพืช',
    'ซ่อมแซมระบบน้ำ',
    'ทำความสะอาดพื้นที่',
    'จัดรูปทรงต้นไม้',
    'ปลูกต้นไม้ใหม่',
    'เก็บและกำจัดขยะ',
    'โพงถู',
  ]

  const PROBLEMS_OPTIONS = [
    'มีปลวกขึ้นโคนต้นไม้',
    'ต้นไม้เจ็บป่วย/ใบเหลือง',
    'พื้นที่มีน้ำขัง/ระบบน้ำตัน',
    'ระบบสปรินเกอร์ชำรุด/สกปรก',
    'หญ้าขึ้นไวเกินไป',
    'ไม้ยืนต้นสูง/อาจล้ม',
    'กิ่งไม้กากรับสายไฟ/ทรัพย์สิน',
    'ดินแห้ง/ขาดน้ำ',
    'น้ำเสียท่วมขังอยู่',
    'ไม้เบียดติดสิ่งก่อสร้าง',
  ]

  const RECOMMENDATIONS_OPTIONS = [
    'ควรพ่นยารอบต่อไป',
    'ควรตัดบางต้นออก',
    'ควรเปลี่ยนดินใหม่',
    'ควรซ่อมระบบน้ำโดยด่วน',
    'ควรใส่ปุ๋ยเพิ่มเติม',
    'ควรตัดเพิ่มความถี่ของการตัดหญ้า',
    'ควรปลูกต้นไม้เพิ่มเติม',
    'ควรปรึกษาเรื่องการกำจัดศัตรูพืช',
    'ควรตรวจสอบปอเหยือเป็นประจำ',
    'ระวังต้นไม้บังสรวมแสงแดด',
  ]

  const [searchParamsChecked, setSearchParamsChecked] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch('/api/admin/manual-work-reports', {
          headers: { ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        })
        const result = await response.json()
        if (response.ok) {
          const fetchedCustomers = result.customers || []
          const fetchedOrders = result.orders || []
          setCustomers(fetchedCustomers)
          setOrders(fetchedOrders)

          // Handle Search Params after data is loaded
          if (!searchParamsChecked) {
            const params = new URLSearchParams(window.location.search)
            const cId = params.get('customerId')
            const oId = params.get('orderId')

            if (cId) {
              const customer = fetchedCustomers.find((c: any) => c.id === cId)
              if (customer) {
                setCustomerId(cId)
                setSearchQuery(customer.display_name || customer.email || '')
                
                if (oId) {
                  const order = fetchedOrders.find((o: any) => o.id === oId && o.customer_id === cId)
                  if (order) {
                    setSelectedOrderIds([oId])
                    // Only set if not already present to avoid overriding user input if they refresh
                    setReportsData(prev => ({
                      ...prev,
                      [oId]: prev[oId] || { orderId: oId, workDoneItems: [], problemItems: [], recommendationItems: [], problemsFound: '', recommendations: '', nextVisitDate: '', individualWorkDone: '', beforePhotos: [], afterPhotos: [], zones: [], uploading: false }
                    }))
                  }
                }
              }
            }
            setSearchParamsChecked(true)
          }
        }
      } catch (e) {
        setError('ไม่สามารถโหลดข้อมูลได้')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [searchParamsChecked])

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return []
    const q = searchQuery.toLowerCase()
    return customers.filter(c => 
      c.display_name?.toLowerCase().includes(q) || 
      c.email?.toLowerCase().includes(q)
    ).slice(0, 5)
  }, [customers, searchQuery])

  const customerOrders = useMemo(() => {
    if (!customerId) return []
    return orders.filter(o => o.customer_id === customerId && o.status !== 'cancelled')
  }, [orders, customerId])

  const handleSelectCustomer = (id: string, name: string) => {
    setCustomerId(id)
    setSearchQuery(name)
    setSelectedOrderIds([])
    setReportsData({})
  }

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const isSelected = prev.includes(orderId)
      if (isSelected) {
        const next = prev.filter(id => id !== orderId)
        const nextData = { ...reportsData }
        delete nextData[orderId]
        setReportsData(nextData)
        return next
      } else {
        setReportsData(d => ({
          ...d,
          [orderId]: { orderId, workDoneItems: [], problemItems: [], recommendationItems: [], problemsFound: '', recommendations: '', nextVisitDate: '', individualWorkDone: '', beforePhotos: [], afterPhotos: [], zones: [], uploading: false }
        }))
        return [...prev, orderId]
      }
    })
  }

  const handleAddZone = (orderId: string) => {
    setReportsData(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        zones: [...(prev[orderId].zones || []), { id: Math.random().toString(36).slice(2, 9), name: '', work_done: '', beforePhotos: [], afterPhotos: [] }]
      }
    }))
  }

  const handleUpdateZone = (orderId: string, zoneId: string, updates: Partial<ZoneData>) => {
    setReportsData(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        zones: (prev[orderId].zones || []).map(z => z.id === zoneId ? { ...z, ...updates } : z)
      }
    }))
  }

  const handleRemoveZone = (orderId: string, zoneId: string) => {
    setReportsData(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        zones: (prev[orderId].zones || []).filter(z => z.id !== zoneId)
      }
    }))
  }

  const handleUploadZonePhoto = async (orderId: string, zoneId: string, type: 'before' | 'after', files: FileList | null) => {
    if (!files || files.length === 0) return
    setReportsData(prev => ({ ...prev, [orderId]: { ...prev[orderId], uploading: true } }))
    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = file.name.split('.').pop()
        const path = `manual-reports/${customerId}/${orderId}/zones/${zoneId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('work-reports').upload(path, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('work-reports').getPublicUrl(path)
        newUrls.push(publicUrl)
      }
      setReportsData(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          uploading: false,
          zones: prev[orderId].zones.map(z => {
            if (z.id !== zoneId) return z
            const field = type === 'before' ? 'beforePhotos' : 'afterPhotos'
            return { ...z, [field]: [...(z[field] || []), ...newUrls] }
          })
        }
      }))
    } catch (e: any) {
      alert('Upload failed: ' + e.message)
      setReportsData(prev => ({ ...prev, [orderId]: { ...prev[orderId], uploading: false } }))
    }
  }

  const handleUploadPhoto = async (orderId: string, type: 'before' | 'after', files: FileList | null) => {
    if (!files || files.length === 0) return
    
    setReportsData(prev => ({ ...prev, [orderId]: { ...prev[orderId], uploading: true } }))
    
    const newPhotos: string[] = []
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = file.name.split('.').pop()
        const fileName = `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const path = `manual-reports/${customerId}/${orderId}/${fileName}`
        
        // 1. Get Signed Upload URL from our secure API
        const { data: { session } } = await supabase.auth.getSession()
        const signRes = await fetch('/api/admin/storage/sign-upload', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({ path, bucket: 'work-reports' })
        })
        
        const signResult = await signRes.json()
        if (!signRes.ok) throw new Error(signResult.error || 'Failed to get upload permission')
        
        // 2. Upload using the signed URL
        const uploadRes = await fetch(signResult.signedUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        })
        
        if (!uploadRes.ok) throw new Error('Failed to upload file to storage')
        
        // 3. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('work-reports')
          .getPublicUrl(path)
          
        newPhotos.push(publicUrl)
      }
      
      setReportsData(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          [type === 'before' ? 'beforePhotos' : 'afterPhotos']: [
            ...prev[orderId][type === 'before' ? 'beforePhotos' : 'afterPhotos'],
            ...newPhotos
          ],
          uploading: false
        }
      }))
    } catch (e: any) {
      alert(`อัปโหลดรูปภาพไม่สำเร็จ: ${e.message || 'Unknown error'}`)
      setReportsData(prev => ({ ...prev, [orderId]: { ...prev[orderId], uploading: false } }))
    }
  }

  const removePhoto = (orderId: string, type: 'before' | 'after', index: number) => {
    setReportsData(prev => {
      const field = type === 'before' ? 'beforePhotos' : 'afterPhotos'
      const nextPhotos = [...prev[orderId][field]]
      nextPhotos.splice(index, 1)
      return {
        ...prev,
        [orderId]: { ...prev[orderId], [field]: nextPhotos }
      }
    })
  }

  const handleSubmit = async () => {
    if (!customerId || selectedOrderIds.length === 0) {
      setError('กรุณาเลือกลูกค้าและบ้านอย่างน้อย 1 หลัง')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const payload = {
        customer_id: customerId,
        work_done: 'ดูแลสวน',
        next_visit_date: nextVisitDate,
        batch_reports_data: selectedOrderIds.map(id => ({
          order_id: id,
          individual_work_done: [
            ...(reportsData[id]?.workDoneItems || []),
            ...(reportsData[id]?.individualWorkDone ? [reportsData[id].individualWorkDone] : [])
          ].join(', '),
          problems_found: [
            ...(reportsData[id]?.problemItems || []),
            ...(reportsData[id]?.problemsFound ? [reportsData[id].problemsFound] : [])
          ].join(', '),
          recommendations: [
            ...(reportsData[id]?.recommendationItems || []),
            ...(reportsData[id]?.recommendations ? [reportsData[id].recommendations] : [])
          ].join(', '),
          next_visit_date: reportsData[id]?.nextVisitDate || '',
          before_photos: reportsData[id]?.beforePhotos || [],
          after_photos: reportsData[id]?.afterPhotos || [],
          zones: (reportsData[id]?.zones || []).map(z => ({
            id: z.id,
            name: z.name,
            work_done: z.work_done,
            before_photos: z.beforePhotos,
            after_photos: z.afterPhotos
          }))
        }))
      }

      const response = await fetch('/api/admin/manual-work-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const res = await response.json()
        throw new Error(res.error || 'ส่งรายงานไม่สำเร็จ')
      }

      alert('ส่งรายงานแบบกลุ่มเรียบร้อยแล้ว และแจ้งเตือน LINE ให้ลูกค้าแล้ว')
      router.push('/dashboard/admin/reports')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFB] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#F1F1EB] bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin/reports" className="p-2 hover:bg-[#F6F7F5] rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-[#70706B]" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[#1A1A1A]">Batch Reporting</h1>
              <p className="text-[10px] font-bold text-[#A3A39C] uppercase tracking-widest">{locale === 'en' ? 'Summary report for a single customer' : locale === 'zh' ? '单个客户的汇总报告' : 'สรุปรายงานรวมสำหรับลูกค้าคนเดียว'}</p>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedOrderIds.length === 0}
            className="rounded-full bg-[#1A1A1A] px-6 py-2 text-sm font-bold text-white shadow-lg shadow-black/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
          >
            {submitting ? 'กำลังส่ง...' : `ส่งรายงาน (${selectedOrderIds.length})`}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Customer & House Selection */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Step 1: Customer */}
            <section className="rounded-3xl border border-[#F1F1EB] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F6F7F5] text-[#1A1A1A] font-bold text-sm">1</div>
                <h2 className="font-bold text-[#1A1A1A]">{locale === 'en' ? 'Choose a customer' : locale === 'zh' ? '选择客户' : 'เลือกลูกค้า'}</h2>
              </div>
              
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A3A39C]" />
                <input
                  type="text"
                  placeholder={locale === 'en' ? 'Type the customer\'s name or email...' : locale === 'zh' ? '输入客户的姓名或电子邮件...' : 'พิมพ์ชื่อหรืออีเมลลูกค้า...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-[#F1F1EB] bg-[#FAFAF8] py-3 pl-10 pr-4 text-sm focus:border-[#1A1A1A] focus:outline-none transition-all"
                />
                
                {filteredCustomers.length > 0 && !customerId && (
                  <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-[#F1F1EB] bg-white shadow-xl animate-in fade-in zoom-in-95">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCustomer(c.id, c.display_name || c.email || '')}
                        className="flex w-full items-center gap-3 p-4 text-left hover:bg-[#F6F7F5] transition-colors border-b border-[#FDFDFB] last:border-0"
                      >
                        <div className="h-8 w-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-bold uppercase">
                          {c.display_name?.[0] || '?'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#1A1A1A]">{c.display_name || 'ไม่ระบุชื่อ'}</div>
                          <div className="text-[10px] text-[#A3A39C]">{c.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {customerId && (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#1A1A1A] p-4 text-white">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                    <div className="text-sm font-bold">{searchQuery}</div>
                  </div>
                  <button onClick={() => setCustomerId('')} className="text-xs text-[#A3A39C] underline">{locale === 'en' ? 'change people' : locale === 'zh' ? '改变人' : 'เปลี่ยนคน'}</button>
                </div>
              )}

              {/* Master Next Visit */}
              <div className={`mt-6 space-y-4 transition-opacity ${!customerId ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold italic">i</div>
                  <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-widest">{locale === 'en' ? 'Combined appointments' : locale === 'zh' ? '合并预约' : 'นัดหมายรวม'}</h3>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-[#F1F1EB] bg-[#FAFAF8] p-4">
                  <div className="flex-1">
                    <label className="block text-[8px] font-black text-[#A3A39C] uppercase tracking-[0.2em] mb-0.5">{locale === 'en' ? 'Appointment date' : locale === 'zh' ? '预约日期' : 'วันที่นัดหมาย'}</label>
                    <input 
                      type="date"
                      value={nextVisitDate}
                      onChange={(e) => setNextVisitDate(e.target.value)}
                      className="w-full text-xs font-bold text-[#1A1A1A] bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="h-10 w-px bg-[#F1F1EB] mx-2" />
                  <div className="flex-1">
                    <label className="block text-[8px] font-black text-[#A3A39C] uppercase tracking-[0.2em] mb-0.5">{locale === 'en' ? 'Use with every home' : locale === 'zh' ? '适合每个家庭使用' : 'ใช้กับทุกบ้าน'}</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!nextVisitDate) {
                          alert('กรุณาเลือกวันที่นัดครั้งถัดไปก่อน')
                          return
                        }
                        const nextData = { ...reportsData }
                        selectedOrderIds.forEach(id => {
                          if (nextData[id]) {
                            nextData[id] = { ...nextData[id], nextVisitDate }
                          }
                        })
                        setReportsData(nextData)
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800"
                    >
                      {locale === 'en' ? 'Press to connect every back.' : locale === 'zh' ? '按下即可连接每个背面。' : '                       กดเพื่อเชื่อมทุกหลัง                     '}</button>
                  </div>
                </div>
              </div>
            </section>

            {/* Step 2: Houses */}
            <section className={`rounded-3xl border border-[#F1F1EB] bg-white p-6 shadow-sm transition-opacity ${!customerId ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F6F7F5] text-[#1A1A1A] font-bold text-sm">2</div>
                  <h2 className="font-bold text-[#1A1A1A]">{locale === 'en' ? 'Choose a house (' : locale === 'zh' ? '选择房子（' : 'เลือกบ้าน ('}{selectedOrderIds.length})</h2>
                </div>
                {customerOrders.length > 0 && (
                  <button 
                    onClick={() => {
                      if (selectedOrderIds.length === customerOrders.length) setSelectedOrderIds([])
                      else {
                        const allIds = customerOrders.map(o => o.id)
                        setSelectedOrderIds(allIds)
                        const nextData: Record<string, HouseReportData> = {}
                        allIds.forEach(id => {
                          nextData[id] = reportsData[id] || { orderId: id, individualWorkDone: '', beforePhotos: [], afterPhotos: [], uploading: false }
                        })
                        setReportsData(nextData)
                      }
                    }}
                    className="text-[10px] font-bold text-[#70706B] uppercase hover:text-[#1A1A1A]"
                  >
                    {selectedOrderIds.length === customerOrders.length ? 'ล้างทั้งหมด' : 'เลือกทั้งหมด'}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {customerOrders.length === 0 ? (
                  <div className="py-10 text-center">
                    <Home className="mx-auto h-8 w-8 text-[#E5E5DF] mb-2" />
                    <p className="text-xs text-[#A3A39C]">{locale === 'en' ? 'No active home information found.' : locale === 'zh' ? '未找到有效的家庭信息。' : 'ไม่พบข้อมูลบ้านที่ใช้งานอยู่'}</p>
                  </div>
                ) : (
                  customerOrders.map(order => {
                    const isSelected = selectedOrderIds.includes(order.id)
                    return (
                      <button
                        key={order.id}
                        onClick={() => toggleOrder(order.id)}
                        className={`group relative flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                          isSelected ? 'border-[#1A1A1A] bg-[#FAFAF8] ring-1 ring-[#1A1A1A]' : 'border-[#F1F1EB] hover:border-[#E5E5DF]'
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${isSelected ? 'bg-[#1A1A1A] text-white' : 'bg-[#F6F7F5] text-[#70706B]'}`}>
                          <Home className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-bold text-[#1A1A1A] truncate">{order.houses?.name || 'บ้านพักอาศัย'}</div>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-2 ${
                              order.pricing_period === 'yearly' ? 'bg-[#FDF4FF] text-[#C026D3]' :
                              order.pricing_period === 'monthly' ? 'bg-[#EFF6FF] text-[#2563EB]' :
                              'bg-[#FFF7ED] text-[#EA580C]'
                            }`}>
                              {order.pricing_period === 'yearly' ? 'รายปี' : 
                               order.pricing_period === 'monthly' ? 'รายเดือน' : 
                               order.pricing_period === 'one-time' ? 'รายครั้ง' : 'บริการดูแลสวน'}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#A3A39C] flex items-center gap-2">
                            <span>#{order.order_code || order.id.slice(0, 8)}</span>
                            <span>•</span>
                            <span className="truncate">{order.services?.service_name || order.services?.name}</span>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-[#10B981]" />}
                      </button>
                    )
                  })
                )}
              </div>
            </section>
          </div>

      {/* Right Column: Shared Content & Photo Uploads */}
          <div className={`lg:col-span-7 space-y-8 transition-opacity ${selectedOrderIds.length === 0 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F6F7F5] text-[#1A1A1A] font-bold text-sm">3</div>
                <h2 className="font-bold text-[#1A1A1A]">{locale === 'en' ? 'Details and pictures separated by house' : locale === 'zh' ? '详细信息和图片以房屋分开' : 'รายละเอียดและรูปภาพแยกตามบ้าน'}</h2>
              </div>

              {selectedOrderIds.map((orderId, idx) => {
                  const { locale } = useI18n();
                const order = orders.find(o => o.id === orderId)
                const data = reportsData[orderId]
                if (!order || !data) return null

                return (
                  <div key={orderId} className="overflow-hidden rounded-3xl border border-[#F1F1EB] bg-white shadow-sm animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 0.1}s` }}>
                    <div className="bg-[#1A1A1A] p-4 text-white flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Home className="h-4 w-4 opacity-60 shrink-0" />
                        <span className="text-xs font-bold truncate">{order.houses?.name || 'บ้านพักอาศัย'}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-1 border ${
                          order.pricing_period === 'yearly' ? 'bg-[#C026D3]/20 text-[#E879F9] border-[#C026D3]/30' :
                          order.pricing_period === 'monthly' ? 'bg-[#2563EB]/20 text-[#60A5FA] border-[#2563EB]/30' :
                          'bg-[#EA580C]/20 text-[#FB923C] border-[#EA580C]/30'
                        }`}>
                          {order.pricing_period === 'yearly' ? 'รายปี' : 
                           order.pricing_period === 'monthly' ? 'รายเดือน' : 
                           order.pricing_period === 'one-time' ? 'รายครั้ง' : 'บริการดูแลสวน'}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold opacity-60 shrink-0 ml-2">#{order.order_code || order.id.slice(0, 8)}</div>
                    </div>

                    <div className="p-6 space-y-8">
                      {/* Photos Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'Overall picture (before)' : locale === 'zh' ? '整体图（之前）' : 'รูปภาพรวม (ก่อนทำ)'}</label>
                          <div className="flex flex-wrap gap-2">
                            {data.beforePhotos.map((url, i) => (
                              <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-gray-100 shadow-sm">
                                <img src={url} className="h-full w-full object-cover" />
                                <button onClick={() => removePhoto(orderId, 'before', i)} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-900 hover:text-gray-900 transition-all">
                              <Plus size={24} />
                              <input type="file" className="hidden" multiple onChange={(e) => handleUploadPhoto(orderId, 'before', e.target.files)} />
                            </label>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{locale === 'en' ? 'Overall picture (after)' : locale === 'zh' ? '整体图（后）' : 'รูปภาพรวม (หลังทำ)'}</label>
                          <div className="flex flex-wrap gap-2">
                            {data.afterPhotos.map((url, i) => (
                              <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-gray-100 shadow-sm">
                                <img src={url} className="h-full w-full object-cover" />
                                <button onClick={() => removePhoto(orderId, 'after', i)} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 transition-all">
                              <Plus size={24} />
                              <input type="file" className="hidden" multiple onChange={(e) => handleUploadPhoto(orderId, 'after', e.target.files)} />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Zones Section */}
                      <div className="pt-6 border-t border-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                            <Zap size={14} /> {locale === 'en' ? 'Information separated by zones (Zones)' : locale === 'zh' ? '按区域（Zone）分隔的信息' : ' ข้อมูลแยกตามโซน (Zones)                           '}</label>
                          <button 
                            onClick={() => handleAddZone(orderId)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                          >
                            <Plus size={12} /> {locale === 'en' ? 'Add a zone' : locale === 'zh' ? '添加区域' : ' เพิ่มโซน                           '}</button>
                        </div>
                        
                        <div className="space-y-4">
                          {data.zones?.map((zone) => (
                            <div key={zone.id} className="relative p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95">
                              <button 
                                onClick={() => handleRemoveZone(orderId, zone.id)}
                                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <X size={18} />
                              </button>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{locale === 'en' ? 'Zone name' : locale === 'zh' ? '区域名称' : 'ชื่อโซน'}</label>
                                  <input 
                                    type="text"
                                    value={zone.name}
                                    onChange={(e) => handleUpdateZone(orderId, zone.id, { name: e.target.value })}
                                    placeholder={locale === 'en' ? 'Such as in front of the house, around the pool...' : locale === 'zh' ? '比如屋前、泳池周围……' : 'เช่น หน้าบ้าน, รอบสระ...'}
                                    className="w-full bg-transparent border-b border-gray-200 py-1 font-bold text-gray-900 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{locale === 'en' ? 'Details of work in the zone' : locale === 'zh' ? '区内工作详情' : 'รายละเอียดงานในโซน'}</label>
                                  <input 
                                    type="text"
                                    value={zone.work_done}
                                    onChange={(e) => handleUpdateZone(orderId, zone.id, { work_done: e.target.value })}
                                    placeholder={locale === 'en' ? 'What do you do?' : locale === 'zh' ? '你做什么工作？' : 'ทำอะไรบ้าง...'}
                                    className="w-full bg-transparent border-b border-gray-200 py-1 text-sm text-gray-600 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-6 pt-1">
                                <div className="space-y-2">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-amber-600">{locale === 'en' ? 'Picture before making' : locale === 'zh' ? '制作前的图片' : 'รูปภาพก่อนทำ'}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {zone.beforePhotos?.map((url, pIdx) => (
                                      <div key={pIdx} className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 relative group shadow-sm">
                                        <img src={url} className="w-full h-full object-cover" />
                                        <button onClick={() => handleUpdateZone(orderId, zone.id, { beforePhotos: (zone.beforePhotos || []).filter((_, i) => i !== pIdx) })} className="absolute inset-0 bg-black/40 items-center justify-center hidden group-hover:flex text-white">
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ))}
                                    <label className="w-12 h-12 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-amber-500 hover:text-amber-500 cursor-pointer bg-white transition-all">
                                      <input type="file" multiple className="hidden" onChange={(e) => handleUploadZonePhoto(orderId, zone.id, 'before', e.target.files)} />
                                      <Plus size={16} />
                                    </label>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600">{locale === 'en' ? 'Picture after making' : locale === 'zh' ? '制作完成后的图片' : 'รูปภาพหลังทำ'}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {zone.afterPhotos?.map((url, pIdx) => (
                                      <div key={pIdx} className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 relative group shadow-sm">
                                        <img src={url} className="w-full h-full object-cover" />
                                        <button onClick={() => handleUpdateZone(orderId, zone.id, { afterPhotos: (zone.afterPhotos || []).filter((_, i) => i !== pIdx) })} className="absolute inset-0 bg-black/40 items-center justify-center hidden group-hover:flex text-white">
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ))}
                                    <label className="w-12 h-12 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-emerald-500 hover:text-emerald-500 cursor-pointer bg-white transition-all">
                                      <input type="file" multiple className="hidden" onChange={(e) => handleUploadZonePhoto(orderId, zone.id, 'after', e.target.files)} />
                                      <Plus size={16} />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!data.zones || data.zones.length === 0) && (
                            <div className="text-center py-6 border border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{locale === 'en' ? 'No zone information yet.' : locale === 'zh' ? '还没有区域信息。' : 'ยังไม่มีข้อมูลโซน'}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Work Done Checkboxes */}
                      <div className="pt-6 border-t border-gray-50">
                        <label className="mb-4 block text-[10px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'Work done (total)' : locale === 'zh' ? '已完成工作（总计）' : 'งานที่ทำ (รวม)'}</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                          {WORK_DONE_OPTIONS.map(option => {
                            const isChecked = data.workDoneItems?.includes(option) || false
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setReportsData(prev => ({
                                  ...prev,
                                  [orderId]: {
                                    ...prev[orderId],
                                    workDoneItems: isChecked
                                      ? prev[orderId].workDoneItems.filter(i => i !== option)
                                      : [...(prev[orderId].workDoneItems || []), option]
                                  }
                                }))}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[11px] font-bold transition-all ${
                                  isChecked
                                    ? 'border-gray-900 bg-gray-900 text-white shadow-lg shadow-gray-200'
                                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                                }`}
                              >
                                {isChecked ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded border border-gray-200" />}
                                <span className="truncate">{option}</span>
                              </button>
                            )
                          })}
                        </div>
                        <textarea
                          placeholder={locale === 'en' ? 'More details...' : locale === 'zh' ? '更多详情...' : 'รายละเอียดเพิ่มเติม...'}
                          value={data.individualWorkDone}
                          onChange={(e) => setReportsData(prev => ({
                            ...prev,
                            [orderId]: { ...prev[orderId], individualWorkDone: e.target.value }
                          }))}
                          className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-gray-100 focus:outline-none transition-all"
                        />
                      </div>

                      {/* Next Visit Date Per House */}
                      <div className="pt-4 border-t border-[#F1F1EB]">
                        <label className="mb-3 block text-[10px] font-bold text-[#A3A39C] uppercase tracking-widest">{locale === 'en' ? 'Next appointment (only after this)' : locale === 'zh' ? '下一次预约（仅在此之后）' : 'นัดหมายครั้งถัดไป (เฉพาะหลังนี้)'}</label>
                        <div className="flex items-center gap-3 rounded-xl border border-[#F1F1EB] bg-[#FAFAF8] px-4 py-2">
                          <Calendar className="h-4 w-4 text-[#A3A39C]" />
                          <input 
                            type="date"
                            value={data.nextVisitDate || ''}
                            onChange={(e) => setReportsData(prev => ({
                              ...prev,
                              [orderId]: { ...prev[orderId], nextVisitDate: e.target.value }
                            }))}
                            className="flex-1 bg-transparent text-xs font-semibold text-[#1A1A1A] focus:outline-none"
                          />
                          {data.nextVisitDate && (
                            <button 
                              type="button"
                              onClick={() => setReportsData(prev => ({
                                ...prev,
                                [orderId]: { ...prev[orderId], nextVisitDate: '' }
                              }))}
                              className="text-[10px] text-red-500 font-bold"
                            >
                              {locale === 'en' ? 'wash' : locale === 'zh' ? '洗' : '                               ล้าง                             '}</button>
                          )}
                        </div>
                        <p className="mt-1.5 text-[9px] text-[#A3A39C]">{locale === 'en' ? 'If not specified, "combined appointments" from above will be used.' : locale === 'zh' ? '如果未指定，将使用上面的“组合预约”。' : 'หากไม่ระบุ จะใช้ "นัดหมายรวม" จากด้านบน'}</p>
                      </div>

                      {/* Problems Checkboxes */}
                      <div>
                        <label className="mb-3 block text-[10px] font-bold text-[#A3A39C] uppercase tracking-widest">{locale === 'en' ? 'Problems encountered' : locale === 'zh' ? '遇到的问题' : 'ปัญหาที่พบ'}</label>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {PROBLEMS_OPTIONS.map(option => {
                            const isChecked = data.problemItems?.includes(option) || false
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setReportsData(prev => ({
                                  ...prev,
                                  [orderId]: {
                                    ...prev[orderId],
                                    problemItems: isChecked
                                      ? prev[orderId].problemItems.filter(i => i !== option)
                                      : [...(prev[orderId].problemItems || []), option]
                                  }
                                }))}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[11px] font-medium transition-all ${
                                  isChecked
                                    ? 'border-[#DC2626] bg-[#DC2626] text-white'
                                    : 'border-[#F1F1EB] bg-[#FAFAF8] text-[#5A5A55] hover:border-[#DC2626]'
                                }`}
                              >
                                <span className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                                  isChecked ? 'bg-white border-white' : 'border-[#D5D5CF]'
                                }`}>
                                  {isChecked && <CheckCircle2 className="h-3 w-3 text-[#DC2626]" />}
                                </span>
                                {option}
                              </button>
                            )
                          })}
                        </div>
                        <input
                          type="text"
                          placeholder={locale === 'en' ? 'Other problems (additional)...' : locale === 'zh' ? '其他问题（补充）...' : 'ปัญหาอื่นๆ (เพิ่มเติม)...'}
                          value={data.problemsFound}
                          onChange={(e) => setReportsData(prev => ({
                            ...prev,
                            [orderId]: { ...prev[orderId], problemsFound: e.target.value }
                          }))}
                          className="w-full rounded-2xl border border-[#F1F1EB] bg-[#FAFAF8] px-4 py-3 text-sm focus:border-[#DC2626] focus:outline-none transition-all"
                        />
                      </div>

                      {/* Recommendations Checkboxes */}
                      <div>
                        <label className="mb-3 block text-[10px] font-bold text-[#A3A39C] uppercase tracking-widest">{locale === 'en' ? 'advice' : locale === 'zh' ? '建议' : 'คำแนะนำ'}</label>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {RECOMMENDATIONS_OPTIONS.map(option => {
                            const isChecked = data.recommendationItems?.includes(option) || false
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setReportsData(prev => ({
                                  ...prev,
                                  [orderId]: {
                                    ...prev[orderId],
                                    recommendationItems: isChecked
                                      ? prev[orderId].recommendationItems.filter(i => i !== option)
                                      : [...(prev[orderId].recommendationItems || []), option]
                                  }
                                }))}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[11px] font-medium transition-all ${
                                  isChecked
                                    ? 'border-[#059669] bg-[#059669] text-white'
                                    : 'border-[#F1F1EB] bg-[#FAFAF8] text-[#5A5A55] hover:border-[#059669]'
                                }`}
                              >
                                <span className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                                  isChecked ? 'bg-white border-white' : 'border-[#D5D5CF]'
                                }`}>
                                  {isChecked && <CheckCircle2 className="h-3 w-3 text-[#059669]" />}
                                </span>
                                {option}
                              </button>
                            )
                          })}
                        </div>
                        <input
                          type="text"
                          placeholder={locale === 'en' ? 'Other (additional) advice...' : locale === 'zh' ? '其他（附加）建议...' : 'คำแนะนำอื่นๆ (เพิ่มเติม)...'}
                          value={data.recommendations}
                          onChange={(e) => setReportsData(prev => ({
                            ...prev,
                            [orderId]: { ...prev[orderId], recommendations: e.target.value }
                          }))}
                          className="w-full rounded-2xl border border-[#F1F1EB] bg-[#FAFAF8] px-4 py-3 text-sm focus:border-[#059669] focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {data.uploading && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <UploadCloud className="h-8 w-8 text-[#1A1A1A] animate-bounce" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{locale === 'en' ? 'Uploading...' : locale === 'zh' ? '正在上传...' : 'กำลังอัปโหลด...'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-600 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}

            {/* Submit Helper */}
            <div className="rounded-3xl bg-[#1A1A1A] p-8 text-white shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{locale === 'en' ? 'Ready to send report' : locale === 'zh' ? '准备发送报告' : 'พร้อมส่งรายงาน'}</h3>
                  <p className="text-xs text-[#A3A39C]">{locale === 'en' ? 'Customers will receive a LINE Carousel summarizing every job in one box.' : locale === 'zh' ? '客户将收到一个 LINE 轮播，其中总结了每项工作。' : 'ลูกค้าจะได้รับ LINE Carousel สรุปงานทุกหลังในกล่องเดียว'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-[#A3A39C] uppercase mb-1">{locale === 'en' ? 'Number of back' : locale === 'zh' ? '回数' : 'จำนวนหลัง'}</div>
                  <div className="text-2xl font-bold">{selectedOrderIds.length} {locale === 'en' ? 'behind' : locale === 'zh' ? '在后面' : ' หลัง'}</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-[#A3A39C] uppercase mb-1">{locale === 'en' ? 'Notification status' : locale === 'zh' ? '通知状态' : 'สถานะแจ้งเตือน'}</div>
                  <div className="text-2xl font-bold text-[#10B981]">{locale === 'en' ? 'Open (LINE)' : locale === 'zh' ? '打开（线路）' : 'เปิด (LINE)'}</div>
                </div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedOrderIds.length === 0}
                className="mt-6 w-full rounded-2xl bg-white py-4 text-sm font-black uppercase tracking-widest text-[#1A1A1A] transition-all hover:bg-[#F6F7F5] active:scale-95 disabled:opacity-30"
              >
                {submitting ? 'กำลังประมวลผลข้อมูล...' : 'ยืนยันการส่งรายงานทั้งหมด'}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
