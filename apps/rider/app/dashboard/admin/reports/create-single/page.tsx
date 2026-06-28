'use client';
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Search, 
  User, 
  Home, 
  ClipboardList, 
  Calendar, 
  FileText, 
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Plus,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { sendLinePushToSupabaseUser } from '@/lib/server/lineMessaging'
import { useI18n } from "@/lib/I18nContext";

export default function AdminCreateSingleReportPage() {
    const { locale } = useI18n();
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Step 1: Customer Selection
  const [customers, setCustomers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

  // Step 2: Order Selection
  const [orders, setOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  // Step 3: Report Data
  const [workDoneItems, setWorkDoneItems] = useState<string[]>([])
  const [workDoneExtra, setWorkDoneExtra] = useState('')
  const [problemsItems, setProblemsItems] = useState<string[]>([])
  const [problemsExtra, setProblemsExtra] = useState('')
  const [recommendItems, setRecommendItems] = useState<string[]>([])
  const [recommendExtra, setRecommendExtra] = useState('')
  const [nextVisitDate, setNextVisitDate] = useState('')
  const [zones, setZones] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  const WORK_DONE_PRESET = ['ตัดหญ้า', 'ตัดแต่งกิ่งไม้', 'ใส่ปุ๋ย', 'กำจัดวัชพืช', 'ล้างทำความสะอาดระบบน้ำ', 'ตรวจสอบระบบน้ำ', 'กำจัดแมลง/ศัตรูพืช', 'ทำความสะอาดพื้นที่', 'ปลูกต้นไม้เพิ่ม', 'ซ่อมแซมระบบน้ำ']
  const PROBLEMS_PRESET = ['ไม่มีปัญหา', 'พบโรคพืช', 'พบแมลงศัตรูพืช', 'ระบบน้ำรั่ว/อุดตัน', 'หญ้าและวัชพืชขึ้นหนา', 'ดินแน่น/ขาดการระบายน้ำ', 'ต้นไม้แห้งตาย', 'ขาดการบำรุงเป็นเวลานาน']
  const RECOMMEND_PRESET = ['รดน้ำช่วงเช้า', 'ลดปุ๋ยในช่วงนี้', 'เพิ่มความถี่การตัดหญ้า', 'ควรซ่อมระบบน้ำโดยเร็ว', 'พ่นยาป้องกันแมลงเพิ่มเติม', 'ปรับตั้งเวลารดน้ำใหม่', 'เพิ่มปุ๋ยบำรุงดิน', 'ตัดแต่งกิ่งเป็นประจำทุกเดือน']

  useEffect(() => {
    fetchInitialData()
  }, [])

  const handleAddZone = () => {
    setZones(prev => [...prev, { id: Math.random().toString(36).slice(2, 9), name: '', work_done: '', beforePhotos: [], afterPhotos: [] }])
  }

  const handleRemoveZone = (id: string) => {
    setZones(prev => prev.filter(z => z.id !== id))
  }

  const handleUpdateZone = (id: string, updates: any) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, ...updates } : z))
  }

  const handleUploadZonePhoto = async (zoneId: string, type: 'before' | 'after', files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = file.name.split('.').pop()
        const path = `reports/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('images').upload(path, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
        newUrls.push(publicUrl)
      }
      setZones(prev => prev.map(z => {
        if (z.id !== zoneId) return z
        const field = type === 'before' ? 'beforePhotos' : 'afterPhotos'
        return { ...z, [field]: [...(z[field] || []), ...newUrls] }
      }))
    } catch (e: any) {
      alert('Upload failed: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/admin/manual-work-reports', {
        headers: { ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      })
      const result = await response.json()
      if (response.ok) {
        setCustomers(result.customers || [])
        setOrders(result.orders || [])

        // Handle URL params if any
        const params = new URLSearchParams(window.location.search)
        const cId = params.get('customerId')
        const oId = params.get('orderId')
        if (cId) {
          const c = result.customers.find((c: any) => c.id === cId)
          if (c) {
            setSelectedCustomer(c)
            if (oId) {
              const o = result.orders.find((o: any) => o.id === oId && o.customer_id === cId)
              if (o) setSelectedOrder(o)
            }
          }
        }
      }
    } catch (e) {
      setError('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c => 
    (c.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const customerOrders = orders.filter(o => o.customer_id === selectedCustomer?.id)

  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedOrder) {
      alert('กรุณาเลือกลูกค้าและบ้านก่อน')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/admin/manual-work-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          batch_reports_data: [
            {
              order_id: selectedOrder.id,
              individual_work_done: [...workDoneItems, workDoneExtra].filter(Boolean).join('\n'),
              problems_found: [...problemsItems, problemsExtra].filter(Boolean).join('\n'),
              recommendations: [...recommendItems, recommendExtra].filter(Boolean).join('\n'),
              next_visit_date: nextVisitDate,
              zones: zones.map(z => ({
                id: z.id,
                name: z.name,
                work_done: z.work_done,
                before_photos: z.beforePhotos,
                after_photos: z.afterPhotos
              }))
            }
          ]
        }),
      })

      const result = await response.json()
      if (response.ok) {
        setSuccess(true)
        setTimeout(() => router.push('/dashboard/admin/reports'), 2000)
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการบันทึก')
      }
    } catch (e) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 font-serif-thai">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{locale === 'en' ? 'Report saved successfully' : locale === 'zh' ? '报告保存成功' : 'บันทึกรายงานสำเร็จ'}</h2>
        <p className="text-gray-500">{locale === 'en' ? 'The system is taking you back to the home page...' : locale === 'zh' ? '系统正在带您返回首页...' : 'ระบบกำลังนำคุณกลับหน้าหลัก...'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 font-serif-thai">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={16} /> {locale === 'en' ? 'retrospective' : locale === 'zh' ? '回顾性的' : ' ย้อนกลับ       '}</button>

      <div className="mb-8">
        <h1 className="text-3xl font-light text-gray-900 mb-2 uppercase tracking-wide">{locale === 'en' ? 'Make an individual report' : locale === 'zh' ? '制作个人报告' : 'ลงรายงานรายตัว'}</h1>
        <p className="text-sm text-gray-500">{locale === 'en' ? 'Create a garden maintenance report for 1 house.' : locale === 'zh' ? '创建 1 所房屋的花园维护报告。' : 'สร้างรายงานการเข้าดูแลสวนสำหรับบ้าน 1 หลัง'}</p>
      </div>

      <div className="space-y-8">
        {/* Step 1: Customer */}
        <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
              <User size={18} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{locale === 'en' ? '1. Select customers' : locale === 'zh' ? '1. 选择客户' : '1. เลือกลูกค้า'}</h2>
          </div>

          {selectedCustomer ? (
            <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div>
                <p className="font-bold text-indigo-900">{selectedCustomer.display_name}</p>
                <p className="text-xs text-indigo-600">{selectedCustomer.email}</p>
              </div>
              <button 
                onClick={() => { setSelectedCustomer(null); setSelectedOrder(null); }}
                className="p-1 hover:bg-indigo-100 rounded-full text-indigo-400"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder={locale === 'en' ? 'Search for a customer\'s name or email...' : locale === 'zh' ? '搜索客户的姓名或电子邮件...' : 'ค้นหาชื่อหรืออีเมลลูกค้า...'}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {searchQuery && (
                <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                  {filteredCustomers.map(c => (
                    <button 
                      key={c.id}
                      onClick={() => { setSelectedCustomer(c); setSearchQuery(''); }}
                      className="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between group"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{c.display_name}</p>
                        <p className="text-xs text-gray-500">{c.email}</p>
                      </div>
                      <Plus size={16} className="text-gray-300 group-hover:text-indigo-500" />
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">{locale === 'en' ? 'The searched customer was not found.' : locale === 'zh' ? '未找到所搜索的客户。' : 'ไม่พบลูกค้าที่ค้นหา'}</p>}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Step 2: Order */}
        {selectedCustomer && (
          <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <Home size={18} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{locale === 'en' ? '2. Select home / service plan' : locale === 'zh' ? '2. 选择主页/服务计划' : '2. เลือกบ้าน / แผนบริการ'}</h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {customerOrders.map(o => (
                <button 
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedOrder?.id === o.id 
                    ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-100' 
                    : 'bg-white border-gray-100 hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-900 uppercase tracking-tight">{o.houses?.name || 'บ้านไม่ระบุชื่อ'}</p>
                      <p className="text-xs text-gray-500">{o.services?.service_name} • {o.order_code}</p>
                      {o.scheduled_date && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-1">{locale === 'en' ? 'make an appointment:' : locale === 'zh' ? '预约：' : 'นัดหมาย: '}{new Date(o.scheduled_date).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })}</p>
                      )}
                    </div>
                    {selectedOrder?.id === o.id && <CheckCircle2 size={18} className="text-emerald-600" />}
                  </div>
                </button>
              ))}
              {customerOrders.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">{locale === 'en' ? 'No active service plan' : locale === 'zh' ? '没有主动服务计划' : 'ไม่มีแผนบริการที่ใช้งานอยู่'}</p>}
            </div>
          </section>
        )}

        {/* Step 3: Details */}
        {selectedOrder && (
          <div className="space-y-8 animate-in fade-in slide-in-from-top-4">
            {/* Checklist Section */}
            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                  <ClipboardList size={18} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{locale === 'en' ? '3. Job details' : locale === 'zh' ? '3. 职位详情' : '3. รายละเอียดงาน'}</h2>
              </div>

              {/* Work Done Checklist */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">{locale === 'en' ? 'Work performed' : locale === 'zh' ? '完成的工作' : 'งานที่ดำเนินการ'}</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  {WORK_DONE_PRESET.map(item => (
                    <button 
                      key={item}
                      onClick={() => workDoneItems.includes(item) ? setWorkDoneItems(prev => prev.filter(i => i !== item)) : setWorkDoneItems(prev => [...prev, item])}
                      className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                        workDoneItems.includes(item) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-600 hover:border-indigo-100'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <textarea 
                  rows={2}
                  placeholder={locale === 'en' ? 'Additional job details...' : locale === 'zh' ? '其他职位详细信息...' : 'รายละเอียดงานเพิ่มเติม...'}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                  value={workDoneExtra}
                  onChange={(e) => setWorkDoneExtra(e.target.value)}
                />
              </div>

              {/* Problems & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 text-red-500">{locale === 'en' ? 'Problems encountered' : locale === 'zh' ? '遇到的问题' : 'ปัญหาที่พบ'}</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PROBLEMS_PRESET.map(item => (
                      <button 
                        key={item}
                        onClick={() => problemsItems.includes(item) ? setProblemsItems(prev => prev.filter(i => i !== item)) : setProblemsItems(prev => [...prev, item])}
                        className={`px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all ${
                          problemsItems.includes(item) ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-100 text-gray-500'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <textarea 
                    rows={2}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-sm"
                    value={problemsExtra}
                    onChange={(e) => setProblemsExtra(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 text-emerald-600">{locale === 'en' ? 'advice' : locale === 'zh' ? '建议' : 'คำแนะนำ'}</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {RECOMMEND_PRESET.map(item => (
                      <button 
                        key={item}
                        onClick={() => recommendItems.includes(item) ? setRecommendItems(prev => prev.filter(i => i !== item)) : setRecommendItems(prev => [...prev, item])}
                        className={`px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all ${
                          recommendItems.includes(item) ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-100 text-gray-500'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <textarea 
                    rows={2}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                    value={recommendExtra}
                    onChange={(e) => setRecommendExtra(e.target.value)}
                  />
                </div>
              </div>

              {/* Next Visit Date */}
              <div className="pt-4 border-t border-gray-50">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{locale === 'en' ? 'next appointment date' : locale === 'zh' ? '下次预约日期' : 'วันนัดครั้งถัดไป'}</label>
                <div className="relative max-w-xs">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="date"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-bold text-indigo-900"
                    value={nextVisitDate}
                    onChange={(e) => setNextVisitDate(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Zones Section */}
            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                    <ImageIcon size={18} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{locale === 'en' ? '4. Supervised zones and pictures' : locale === 'zh' ? '4. 监管区域及图片' : '4. โซนที่ดูแลและรูปภาพ'}</h2>
                </div>
                <button 
                  onClick={handleAddZone}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
                >
                  <Plus size={14} /> {locale === 'en' ? 'Add a zone' : locale === 'zh' ? '添加区域' : ' เพิ่มโซน                 '}</button>
              </div>

              <div className="space-y-6">
                {zones.map((zone, zIdx) => (
                  <div key={zone.id} className="relative p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <button 
                      onClick={() => handleRemoveZone(zone.id)}
                      className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={18} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{locale === 'en' ? 'Zone name' : locale === 'zh' ? '区域名称' : 'ชื่อโซน'}</label>
                        <input 
                          type="text"
                          value={zone.name}
                          onChange={(e) => handleUpdateZone(zone.id, { name: e.target.value })}
                          placeholder={locale === 'en' ? 'Such as the front of the house, kitchen garden...' : locale === 'zh' ? '比如屋前、菜园……' : 'เช่น หน้าบ้าน, สวนครัว...'}
                          className="w-full bg-transparent border-b border-gray-200 py-1 font-bold text-gray-900 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{locale === 'en' ? 'Details of work in the zone' : locale === 'zh' ? '区内工作详情' : 'รายละเอียดงานในโซน'}</label>
                        <input 
                          type="text"
                          value={zone.work_done}
                          onChange={(e) => handleUpdateZone(zone.id, { work_done: e.target.value })}
                          placeholder={locale === 'en' ? 'What do you do in this zone?' : locale === 'zh' ? '你在这个区域做什么？' : 'ทำอะไรบ้างในโซนนี้...'}
                          className="w-full bg-transparent border-b border-gray-200 py-1 text-sm text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-2">
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">{locale === 'en' ? 'Picture before doing (' : locale === 'zh' ? '做之前的图（' : 'รูปภาพก่อนทำ ('}{zone.beforePhotos?.length || 0})</p>
                        <div className="flex flex-wrap gap-2">
                          {zone.beforePhotos?.map((url: string, pIdx: number) => (
                            <div key={pIdx} className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden relative group shadow-sm">
                              <img src={url} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => handleUpdateZone(zone.id, { beforePhotos: zone.beforePhotos.filter((_: any, i: number) => i !== pIdx) })}
                                className="absolute inset-0 bg-black/40 items-center justify-center hidden group-hover:flex text-white"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <label className="w-16 h-16 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-amber-400 hover:text-amber-400 cursor-pointer transition-all bg-white">
                            <input type="file" multiple className="hidden" onChange={(e) => handleUploadZonePhoto(zone.id, 'before', e.target.files)} />
                            <Plus size={20} />
                          </label>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{locale === 'en' ? 'Picture after making (' : locale === 'zh' ? '制作完成后的图（' : 'รูปภาพหลังทำ ('}{zone.afterPhotos?.length || 0})</p>
                        <div className="flex flex-wrap gap-2">
                          {zone.afterPhotos?.map((url: string, pIdx: number) => (
                            <div key={pIdx} className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden relative group shadow-sm">
                              <img src={url} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => handleUpdateZone(zone.id, { afterPhotos: zone.afterPhotos.filter((_: any, i: number) => i !== pIdx) })}
                                className="absolute inset-0 bg-black/40 items-center justify-center hidden group-hover:flex text-white"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <label className="w-16 h-16 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-400 cursor-pointer transition-all bg-white">
                            <input type="file" multiple className="hidden" onChange={(e) => handleUploadZonePhoto(zone.id, 'after', e.target.files)} />
                            <Plus size={20} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {zones.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed border-gray-50 rounded-3xl">
                    <p className="text-sm text-gray-400">{locale === 'en' ? 'There is no care zone information yet. (Can add pictures and details by zone)' : locale === 'zh' ? '目前还没有护理区信息。 （可以按区域添加图片和详细信息）' : 'ยังไม่มีข้อมูลโซนดูแล (สามารถเพิ่มรูปภาพและรายละเอียดแยกตามโซนได้)'}</p>
                  </div>
                )}
              </div>
            </section>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="pt-4">
              <button 
                onClick={handleSubmit}
                disabled={submitting || uploading}
                className="w-full py-5 bg-gray-900 text-white rounded-3xl font-bold uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
              >
                {submitting ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                {submitting ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันและส่งรายงาน'}
              </button>
              <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-bold">{locale === 'en' ? 'The system will send a LINE notification to the customer immediately when they press save.' : locale === 'zh' ? '当客户按下“保存”时，系统将立即向客户发送 LINE 通知。' : 'ระบบจะทำการส่ง LINE แจ้งเตือนไปยังลูกค้าทันทีเมื่อกดบันทึก'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
