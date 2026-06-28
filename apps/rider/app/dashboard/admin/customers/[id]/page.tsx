'use client';
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { 
  ArrowLeft, 
  Home, 
  Plus, 
  Calendar, 
  MapPin, 
  Phone,
  Settings,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Edit3,
  ClipboardList,
  Bell as BellIcon
} from 'lucide-react'
import ServicePlanModal from '@/components/admin/ServicePlanModal'
import HouseEditModal from '@/components/admin/HouseEditModal'
import AdminRescheduleModal from '@/components/admin/AdminRescheduleModal'
import { useI18n } from "@/lib/I18nContext";

interface Customer {
  id: string
  display_name: string
  email: string
  customer_base_code: string
  phone?: string
  created_at: string
}

interface House {
  id: string
  name: string
  house_code: string
  address: string
  area_size?: number
}

interface ServicePlan {
  id: string
  service_id: string
  house_id: string
  status: string
  pricing_period: string
  total: number
  sessions_per_period: number
  total_sessions: number
  completed_sessions: number
  scheduled_date?: string
  created_at: string
  service_name?: string
}

export default function AdminCustomerDetailPage() {
    const { locale } = useI18n();
  const { id } = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [houses, setHouses] = useState<House[]>([])
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'houses' | 'plans' | 'settings'>('houses')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [isHouseModalOpen, setIsHouseModalOpen] = useState(false)
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<any>(null)
  const [selectedPlanForReschedule, setSelectedPlanForReschedule] = useState<any>(null)
  const [selectedHouseForEdit, setSelectedHouseForEdit] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [sendingNotify, setSendingNotify] = useState<string | null>(null)
  const [creatingReport, setCreatingReport] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    if (id) fetchCustomerData()
  }, [id])

  async function fetchCustomerData() {
    setLoading(true)
    try {
      const targetId = Array.isArray(id) ? id[0] : id
      
      const res = await fetch(`/api/admin/customers/${targetId}`)
      if (!res.ok) throw new Error('Failed to fetch customer data')
      const json = await res.json()
      
      setCustomer(json.profile)
      setHouses(json.houses || [])
      
      const formattedPlans = (json.orders || [])
        .filter((o: any) => o.status !== 'completed' && o.status !== 'cancelled')
        .map((o: any) => {
          const h = json.houses?.find((house: any) => house.id === o.house_id)
          return {
            ...o,
            service_name: o.services?.service_name || 'General Service',
            house_name: h?.name || 'บ้าน'
          }
        })
      
      setPlans(formattedPlans)

      const reportData = json.reports || []
      if (reportData.length > 0) {
        // Fetch staff names separately to avoid join issues
        const staffIds = [...new Set(reportData.map((r: any) => r.staff_id).filter(Boolean))] as string[]
        if (staffIds.length > 0) {
          const { data: staffData } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', staffIds)
          
          const staffMap = Object.fromEntries((staffData || []).map(s => [s.id, s.display_name]))
          const enrichedReports = reportData.map((r: any) => ({
            ...r,
            staff: { display_name: staffMap[r.staff_id] || 'ทีมงาน' }
          }))
          setReports(enrichedReports)
        } else {
          setReports(reportData.map((r: any) => ({ ...r, staff: { display_name: 'ทีมงาน' } })))
        }
      } else {
        setReports([])
      }

    } catch (error) {
      console.error('Error fetching customer detail:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleNotifyCustomer(orderId: string) {
    setSendingNotify(orderId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/admin/notifications/send-single`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({ orderId })
      })
      const result = await response.json()
      if (result.success) {
        alert('ส่งการแจ้งเตือนสำเร็จ!')
      } else {
        alert('Error: ' + result.error)
      }
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSendingNotify(null)
    }
  }

  async function handleQuickReport(orderId: string) {
    if (!customer) return
    router.push(`/dashboard/admin/reports/create?customerId=${customer.id}&orderId=${orderId}`)
  }

  useEffect(() => {
    if (id) {
      setLoading(true)
      fetchCustomerData().finally(() => setLoading(false))
    }
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#FAFAF8] font-serif-thai z-[200]">
      <div className="flex flex-col items-center gap-6">
        <div className="animate-spin h-8 w-8 border-4 border-[#1A1A1A] border-t-transparent"></div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] mb-4">{locale === 'en' ? 'Loading data...' : locale === 'zh' ? '正在加载数据...' : 'กำลังโหลดข้อมูล...'}</p>
          <button 
            onClick={() => router.push('/dashboard/admin/customers')}
            className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] border border-[#E5E5DF] px-4 py-2 hover:bg-white"
          >
            {locale === 'en' ? 'Cancel and return' : locale === 'zh' ? '取消并返回' : '             ยกเลิกและย้อนกลับ           '}</button>
        </div>
      </div>
    </div>
  )

  if (!customer) return (
    <div className="p-20 text-center font-serif-thai">
      <p className="mb-4">{locale === 'en' ? 'No customer information found.' : locale === 'zh' ? '没有找到客户信息。' : 'ไม่พบข้อมูลลูกค้า'}</p>
      <button onClick={() => router.push('/dashboard/admin/customers')} className="text-sm underline">{locale === 'en' ? 'Return to the list page' : locale === 'zh' ? '返回列表页面' : 'กลับสู่หน้ารายชื่อ'}</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-20 font-serif-thai">
      <div className="bg-white border-b border-[#E5E5DF] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#1A1A1A] hover:opacity-60 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" /> {locale === 'en' ? 'Return to the list page' : locale === 'zh' ? '返回列表页面' : ' กลับสู่หน้ารายชื่อ           '}</button>
          <div className="flex items-center gap-4">
            <button className="text-[#A3A3A3] hover:text-[#1A1A1A] transition-colors">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-10">
          
          <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-center gap-8 border-b border-[#E5E5DF] pb-10">
              <div className="h-24 w-24 bg-[#1A1A1A] text-white flex items-center justify-center text-3xl font-light">
                {customer.display_name?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A3A3A3]">{locale === 'en' ? 'Customer profile information' : locale === 'zh' ? '客户资料信息' : 'ข้อมูลโปรไฟล์ลูกค้า'}</span>
                  <span className="h-[1px] w-4 bg-[#D4D4D4]"></span>
                  <span className="text-[10px] font-mono text-[#D4D4D4] uppercase">{customer.customer_base_code}</span>
                </div>
                <h1 className="text-4xl font-light text-[#1A1A1A] mb-2">{customer.display_name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#70706B] font-medium">
                  <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {customer.phone || 'ไม่มีเบอร์โทรศัพท์'}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {customer.email}</span>
                  <span className="flex items-center gap-1.5 text-[#D4D4D4]">
                    {locale === 'en' ? 'Join when' : locale === 'zh' ? '加入时间' : '                     เข้าร่วมเมื่อ '}{mounted && customer.created_at ? new Date(customer.created_at).toLocaleDateString('th-TH') : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 border-b border-[#F1F1EB]">
              {[
                { id: 'houses', label: 'บ้านและโครงการ', count: houses.length },
                { id: 'plans', label: 'แผนบริการที่ใช้งาน', count: plans.length },
                { id: 'settings', label: 'ตั้งค่า CRM', count: 0 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                    activeTab === tab.id ? 'text-[#1A1A1A]' : 'text-[#A3A3A3] hover:text-[#666]'
                  }`}
                >
                  {tab.label} ({tab.count})
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#1A1A1A]"></div>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'houses' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-light text-[#1A1A1A]">{locale === 'en' ? 'Real estate in possession' : locale === 'zh' ? '拥有的房地产' : 'อสังหาริมทรัพย์ในครอบครอง'}</h3>
                  <button className="flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-[#333] transition-colors">
                    <Plus className="h-3 w-3" /> {locale === 'en' ? 'Add a new house' : locale === 'zh' ? '添加新房子' : ' เพิ่มบ้านใหม่                   '}</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {houses.map((house) => (
                    <div key={house.id} className="bg-white border border-[#E5E5DF] p-6 hover:border-[#1A1A1A] transition-all group">
                      <div className="flex items-start justify-between mb-6">
                        <div className="h-12 w-12 bg-[#FAFAF8] flex items-center justify-center text-[#1A1A1A] border border-[#F1F1EB]">
                          <Home className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-mono text-[#D4D4D4] border border-[#F1F1EB] px-2 py-1 uppercase">{house.house_code}</span>
                      </div>
                      <h4 className="text-lg font-bold text-[#1A1A1A] mb-2 uppercase tracking-wide">{house.name}</h4>
                      <p className="text-sm text-[#70706B] mb-6 line-clamp-2 min-h-[40px]">{house.address}</p>
                      
                      <div className="flex items-center justify-between pt-6 border-t border-[#F1F1EB]">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">
                          {locale === 'en' ? 'have' : locale === 'zh' ? '有' : '                           มี '}{plans.filter(p => p.house_id === house.id).length} {locale === 'en' ? 'Active service plan' : locale === 'zh' ? '主动服务计划' : ' แผนบริการที่ใช้งาน                         '}</div>
                        <button 
                          onClick={() => {
                            setSelectedHouseForEdit(house)
                            setIsHouseModalOpen(true)
                          }}
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] group-hover:underline"
                        >
                          <Edit3 className="h-3 w-3" /> {locale === 'en' ? 'Manage home information' : locale === 'zh' ? '管理家庭信息' : ' จัดการข้อมูลบ้าน                         '}</button>
                      </div>
                    </div>
                  ))}
                  {houses.length === 0 && (
                    <div className="col-span-2 py-20 text-center border-2 border-dashed border-[#E5E5DF]">
                      <p className="text-sm text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'There is no registered house information yet.' : locale === 'zh' ? '目前还没有登记的房屋信息。' : 'ยังไม่มีข้อมูลบ้านที่ลงทะเบียน'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'plans' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-light text-[#1A1A1A]">{locale === 'en' ? 'Service plan and garden care work' : locale === 'zh' ? '服务计划和花园护理工作' : 'แผนบริการและงานดูแลสวน'}</h3>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-[#333] transition-colors"
                  >
                    <Plus className="h-3 w-3" /> {locale === 'en' ? 'Set a new plan' : locale === 'zh' ? '制定新计划' : ' กำหนดแผนใหม่                   '}</button>
                </div>

                <div className="space-y-4">
                  {plans.map((plan) => (
                    <div key={plan.id} className="bg-white border border-[#E5E5DF] p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-4">
                          <div className={`h-2 w-2 rounded-full ${plan.status === 'confirmed' ? 'bg-green-500' : 'bg-[#D4D4D4]'}`}></div>
                          <div>
                            <h4 className="text-lg font-bold text-[#1A1A1A] uppercase tracking-wider">{plan.service_name}</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">
                              {plan.pricing_period} • {plan.sessions_per_period} sessions/period
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] mb-1">Contract Total</p>
                          <p className="text-xl font-light text-[#1A1A1A]">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{plan.total?.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-[#1A1A1A]">{locale === 'en' ? 'Garden care progress' : locale === 'zh' ? '园林养护进展' : 'ความคืบหน้าการดูแลสวน'}</span>
                          <span className="text-[#70706B]">{plan.completed_sessions} / {plan.total_sessions} {locale === 'en' ? 'time' : locale === 'zh' ? '时间' : ' ครั้ง'}</span>
                        </div>
                        <div className="h-1 w-full bg-[#FAFAF8] border border-[#F1F1EB]">
                          <div 
                            className="h-full bg-[#1A1A1A] transition-all duration-1000"
                            style={{ width: `${(plan.completed_sessions / (plan.total_sessions || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-[#F1F1EB]">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-[#A3A3A3]" />
                            <span className="text-[10px] font-bold text-[#666] uppercase tracking-widest">
                              {locale === 'en' ? 'Started when' : locale === 'zh' ? '开始时间' : '                               เริ่มเมื่อ '}{mounted && (plan.scheduled_date || plan.created_at) ? new Date(plan.scheduled_date || plan.created_at).toLocaleDateString('th-TH') : '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Home className="h-3 w-3 text-[#A3A3A3]" />
                            <span className="text-[10px] font-bold text-[#666] uppercase tracking-widest">{houses.find(h => h.id === plan.house_id)?.name || 'บ้าน'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleNotifyCustomer(plan.id)}
                            disabled={sendingNotify === plan.id}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#70706B] hover:text-[#1A1A1A] disabled:opacity-50"
                          >
                            <BellIcon className="h-3.5 w-3.5" /> {sendingNotify === plan.id ? 'กำลังส่ง...' : 'แจ้งเตือนนัดหมาย'}
                          </button>
                          <button 
                            onClick={() => handleQuickReport(plan.id)}
                            disabled={creatingReport === plan.id}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#70706B] hover:text-[#1A1A1A] disabled:opacity-50"
                          >
                            <ClipboardList className="h-3.5 w-3.5" /> {creatingReport === plan.id ? 'กำลังเริ่ม...' : 'สร้างรายงาน'}
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedPlanForReschedule(plan)
                              setIsRescheduleModalOpen(true)
                            }}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] hover:underline"
                          >
                            <Calendar className="h-3 w-3" /> {locale === 'en' ? 'Postpone the appointment' : locale === 'zh' ? '推迟预约' : ' เลื่อนนัด                           '}</button>
                          <button 
                            onClick={() => {
                              setSelectedPlanForEdit(plan)
                              setIsModalOpen(true)
                            }}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] hover:underline"
                          >
                            <Edit3 className="h-3 w-3" /> {locale === 'en' ? 'Change plans' : locale === 'zh' ? '改变计划' : ' ปรับเปลี่ยนแผน                           '}</button>
                        </div>
                      </div>

                      {/* Service History Section */}
                      <div className="mt-4 border-t border-[#F1F1EB] pt-4">
                        <button 
                          onClick={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] hover:text-[#1A1A1A]"
                        >
                          {expandedPlanId === plan.id ? 'ซ่อนประวัติการบริการ' : 'ดูประวัติการบริการ'}
                          <ChevronRight className={`h-3 w-3 transition-transform ${expandedPlanId === plan.id ? 'rotate-90' : ''}`} />
                        </button>

                        {expandedPlanId === plan.id && (
                          <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                            {reports.filter(r => String(r.order_id) === String(plan.id)).length === 0 ? (
                              <p className="text-[10px] text-[#A3A3A3] uppercase">{locale === 'en' ? 'There is no reporting history yet.' : locale === 'zh' ? '目前还没有报告历史。' : 'ยังไม่มีประวัติการรายงาน'}</p>
                            ) : (
                              reports.filter(r => String(r.order_id) === String(plan.id)).map((report, idx) => (
                                <div key={report.id} className="flex items-start gap-4 p-3 bg-[#FAFAF8] border border-[#F1F1EB]">
                                  <div className="text-[10px] font-black text-[#1A1A1A] shrink-0 w-8">#{reports.filter(r => String(r.order_id) === String(plan.id)).length - idx}</div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <span className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                                        {new Date(report.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </span>
                                      <span className="text-[9px] text-[#70706B] font-medium truncate">{locale === 'en' ? 'by' : locale === 'zh' ? '经过' : 'โดย '}{report.staff?.display_name || 'ทีมงาน'}</span>
                                    </div>
                                    <p className="text-[10px] text-[#70706B] line-clamp-2 leading-relaxed">
                                      {report.work_done || 'ไม่มีรายละเอียด'}
                                    </p>
                                  </div>
                                  <Link 
                                    href={`/dashboard/admin/reports/edit/${report.job_assignment_id || report.id}`}
                                    className="text-[9px] font-black uppercase tracking-widest text-[#1A1A1A] hover:underline shrink-0"
                                  >
                                    {locale === 'en' ? 'Open and view →' : locale === 'zh' ? '打开并查看 →' : '                                     เปิดดู →                                   '}</Link>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {plans.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-[#E5E5DF]">
                      <p className="text-sm text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'There is no active service plan yet.' : locale === 'zh' ? '目前还没有主动的服务计划。' : 'ยังไม่มีแผนบริการที่ใช้งานอยู่'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-[#E5E5DF] p-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A] mb-6">{locale === 'en' ? 'Summary of latest activities' : locale === 'zh' ? '最新活动总结' : 'สรุปกิจกรรมล่าสุด'}</h4>
              <div className="space-y-6">
                {[
                  { label: 'รายได้รวมทั้งหมด', value: `฿${plans.reduce((acc, p) => acc + (p.total || 0), 0).toLocaleString()}`, icon: CheckCircle2 },
                  { label: 'จำนวนครั้งที่เสร็จสิ้น', value: plans.reduce((acc, p) => acc + (p.completed_sessions || 0), 0), icon: Clock },
                  { label: 'รายการรอตรวจสอบ', value: 0, icon: AlertCircle },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 text-[#A3A3A3]" />
                      <span className="text-xs text-[#70706B] font-medium uppercase tracking-wider">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold text-[#1A1A1A]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1A1A1A] p-6 text-white">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4D4D4] mb-4">{locale === 'en' ? 'Quick action menu' : locale === 'zh' ? '快速操作菜单' : 'เมนูดำเนินการด่วน'}</h4>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push(`/dashboard/admin/orders/create?customerId=${id}`)}
                  className="w-full text-left py-2 text-xs font-bold uppercase tracking-widest hover:pl-2 transition-all flex items-center justify-between border-b border-[#333]"
                >
                  {locale === 'en' ? 'Create a quote' : locale === 'zh' ? '创建报价' : '                   สร้างใบเสนอราคา '}<Plus className="h-3 w-3" />
                </button>
                <button 
                  onClick={() => router.push(`/dashboard/admin/job-assignment`)}
                  className="w-full text-left py-2 text-xs font-bold uppercase tracking-widest hover:pl-2 transition-all flex items-center justify-between border-b border-[#333]"
                >
                  {locale === 'en' ? 'Make an appointment to work' : locale === 'zh' ? '预约上班' : '                   นัดหมายการเข้างาน '}<Calendar className="h-3 w-3" />
                </button>
                <button 
                  onClick={() => router.push(`/dashboard/admin/settings`)}
                  className="w-full text-left py-2 text-xs font-bold uppercase tracking-widest hover:pl-2 transition-all flex items-center justify-between"
                >
                  {locale === 'en' ? 'Set up customer accounts' : locale === 'zh' ? '设置客户帐户' : '                   ตั้งค่าบัญชีลูกค้า '}<Settings className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <ServicePlanModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedPlanForEdit(null)
        }}
        customerId={id as string}
        houses={houses}
        onSuccess={fetchCustomerData}
        editOrderData={selectedPlanForEdit}
      />

      <AdminRescheduleModal 
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false)
          setSelectedPlanForReschedule(null)
        }}
        plan={selectedPlanForReschedule}
        onSuccess={fetchCustomerData}
      />

      <HouseEditModal 
        isOpen={isHouseModalOpen}
        onClose={() => {
          setIsHouseModalOpen(false)
          setSelectedHouseForEdit(null)
        }}
        house={selectedHouseForEdit}
        onSuccess={fetchCustomerData}
      />
    </div>
  )
}
