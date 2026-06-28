'use client';
import React, { useEffect, useState, useMemo } from 'react'
import { X, Calendar, Home, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useI18n } from "@/lib/I18nContext";

interface ServicePlanModalProps {
  isOpen: boolean
  onClose: () => void
  customerId: string
  houses: any[]
  onSuccess: () => void
  editOrderData?: any 
}

export default function ServicePlanModal({ isOpen, onClose, customerId, houses, onSuccess, editOrderData }: ServicePlanModalProps) {
    const { locale } = useI18n();
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [services, setServices] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])

  const [houseId, setHouseId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [priceTemplateId, setPriceTemplateId] = useState('')
  const [pricingPeriod, setPricingPeriod] = useState('one-time')
  const [totalSessions, setTotalSessions] = useState(1)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [manualTotalPrice, setManualTotalPrice] = useState<string>('')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (isOpen) {
      loadData()
      if (editOrderData) {
        setHouseId(editOrderData.house_id || '')
        setServiceId(editOrderData.service_id || '')
        setPricingPeriod(editOrderData.pricing_period || 'one-time')
        setTotalSessions(editOrderData.total_sessions || 1)
        setCompletedSessions(editOrderData.completed_sessions || 0)
        setManualTotalPrice(editOrderData.total_price ? editOrderData.total_price.toString() : '')
        if (editOrderData.scheduled_date) {
          try {
            setScheduledDate(new Date(editOrderData.scheduled_date).toISOString().slice(0, 10))
          } catch (e) {
            setScheduledDate(new Date().toISOString().slice(0, 10))
          }
        }
      } else if (houses.length > 0) {
        setHouseId(houses[0].id)
        setServiceId('')
        setPricingPeriod('one-time')
        setTotalSessions(1)
        setCompletedSessions(0)
        setManualTotalPrice('')
      }
    }
  }, [isOpen, houses, editOrderData])

  async function loadData() {
    setLoading(true)
    try {
      const { data: serviceData } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
      setServices(serviceData || [])

      const { data: templateData } = await supabase
        .from('price_templates')
        .select('*')
        .eq('is_active', true)
      setTemplates(templateData || [])
    } catch (err) {
      console.error('Error loading modal data:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectedHouse = useMemo(() => houses.find(h => h.id === houseId), [houses, houseId])
  const serviceTemplates = useMemo(() => templates.filter(t => t.service_id === serviceId), [templates, serviceId])
  
  const selectedTemplate = useMemo(() => {
    if (!serviceId) return null
    const area = selectedHouse?.area_size || 0
    return serviceTemplates.find(t => area >= (t.area_min || 0) && area <= (t.area_max || 999999)) || serviceTemplates[0]
  }, [serviceId, serviceTemplates, selectedHouse])

  useEffect(() => {
    if (selectedTemplate) setPriceTemplateId(selectedTemplate.id)
  }, [selectedTemplate])

  const calculatedTotal = useMemo(() => {
    if (manualTotalPrice.trim() !== '' && !Number.isNaN(Number(manualTotalPrice)) && Number(manualTotalPrice) >= 0) {
      return Number(manualTotalPrice)
    }
    if (!selectedTemplate) return 0
    const base = selectedTemplate.base_price || 0
    const unit = selectedTemplate.price_per_unit || 0
    const area = selectedHouse?.area_size || 0
    const perSession = base + (area * unit)
    return perSession * totalSessions
  }, [selectedTemplate, selectedHouse, totalSessions, manualTotalPrice])

  async function handleSubmit() {
    if (!houseId || !serviceId || !priceTemplateId) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const endpoint = editOrderData ? `/api/admin/orders/${editOrderData.id}/update` : '/api/admin/orders/create'
      const method = editOrderData ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          customerId,
          houseId,
          serviceId,
          priceTemplateId,
          pricingPeriod,
          sessionsPerPeriod: pricingPeriod === 'one-time' ? 1 : totalSessions,
          totalSessions: pricingPeriod === 'one-time' ? 1 : totalSessions,
          completedSessions,
          scheduledDate,
          priority: 'normal',
          paymentMethod: 'bank_transfer',
          manualTotalPrice: manualTotalPrice.trim() !== '' ? Number(manualTotalPrice) : undefined
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process request')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-2xl bg-white shadow-2xl overflow-hidden font-serif-thai">
        <div className="px-8 py-6 border-b border-[#F1F1EB] flex items-center justify-between bg-[#FAFAF8]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A3A3A3] mb-1 block">
              {editOrderData ? 'แก้ไขแผนบริการเดิม' : 'การมอบหมายงานใหม่'}
            </span>
            <h2 className="text-2xl font-light text-[#1A1A1A]">
              {editOrderData ? 'ปรับปรุงแผนบริการ' : 'กำหนดแผนบริการ (Service Plan)'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white transition-colors">
            <X className="h-5 w-5 text-[#A3A3A3]" />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'เลือกบ้าน/อาคาร' : locale === 'zh' ? 'เลือกบ้าน/อาคาร' : 'เลือกบ้าน/อาคาร'}</label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A3A3A3]" />
                  <select 
                    value={houseId}
                    onChange={(e) => setHouseId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#FAFAF8] border border-[#E5E5DF] text-sm focus:outline-none focus:border-[#1A1A1A] appearance-none rounded-none"
                  >
                    {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'เลือกประเภทบริการ' : locale === 'zh' ? 'เลือกประเภทบริการ' : 'เลือกประเภทบริการ'}</label>
                <select 
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FAFAF8] border border-[#E5E5DF] text-sm focus:outline-none focus:border-[#1A1A1A] appearance-none rounded-none"
                >
                  <option value="">{locale === 'en' ? '-- Select service --' : locale === 'zh' ? '-- 选择服务 --' : '-- เลือกบริการ --'}</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.service_name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'รอบการเก็บเงิน' : locale === 'zh' ? 'รอบการเก็บเงิน' : 'รอบการเก็บเงิน'}</label>
                <select 
                  value={pricingPeriod}
                  onChange={(e) => setPricingPeriod(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FAFAF8] border border-[#E5E5DF] text-sm focus:outline-none focus:border-[#1A1A1A] appearance-none rounded-none"
                >
                  <option value="one-time">{locale === 'en' ? 'One-time' : locale === 'zh' ? '一度' : 'รายครั้ง (One-time)'}</option>
                  <option value="monthly">{locale === 'en' ? 'Monthly (Monthly)' : locale === 'zh' ? '每月（每月）' : 'รายเดือน (Monthly)'}</option>
                  <option value="yearly">{locale === 'en' ? 'Yearly (Yearly)' : locale === 'zh' ? '每年（每年）' : 'รายปี (Yearly)'}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'รวมจำนวนครั้งทั้งหมด' : locale === 'zh' ? 'รวมจำนวนครั้งทั้งหมด' : 'รวมจำนวนครั้งทั้งหมด'}</label>
                <input 
                  type="number"
                  min="1"
                  value={totalSessions}
                  onChange={(e) => setTotalSessions(parseInt(e.target.value) || 1)}
                  disabled={pricingPeriod === 'one-time'}
                  className="w-full px-4 py-3 bg-[#FAFAF8] border border-[#E5E5DF] text-sm focus:outline-none focus:border-[#1A1A1A] rounded-none disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A]">{locale === 'en' ? 'ราคาสุทธิแบบเหมา (กำหนดเอง)' : locale === 'zh' ? 'ราคาสุทธิแบบเหมา (กำหนดเอง)' : 'ราคาสุทธิแบบเหมา (กำหนดเอง)'}</label>
                <input 
                  type="number"
                  min="0"
                  value={manualTotalPrice}
                  onChange={(e) => setManualTotalPrice(e.target.value)}
                  placeholder={locale === 'en' ? 'คำนวณอัตโนมัติ' : locale === 'zh' ? 'คำนวณอัตโนมัติ' : 'คำนวณอัตโนมัติ'}
                  className="w-full px-4 py-3 bg-[#FAFAF8] border border-[#1A1A1A] text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] rounded-none"
                />
              </div>
            </div>

            {editOrderData && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'จำนวนครั้งที่ดำเนินการแล้ว (แก้ไขมือ)' : locale === 'zh' ? 'จำนวนครั้งที่ดำเนินการแล้ว (แก้ไขมือ)' : 'จำนวนครั้งที่ดำเนินการแล้ว (แก้ไขมือ)'}</label>
                <input 
                  type="number"
                  min="0"
                  value={completedSessions}
                  onChange={(e) => setCompletedSessions(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-[#FAFAF8] border border-[#E5E5DF] text-sm focus:outline-none focus:border-[#1A1A1A] rounded-none"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#F1F1EB]">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'วันที่เริ่มให้บริการ' : locale === 'zh' ? 'วันที่เริ่มให้บริการ' : 'วันที่เริ่มให้บริการ'}</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A3A3A3]" />
                  <input 
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#FAFAF8] border border-[#E5E5DF] text-sm focus:outline-none focus:border-[#1A1A1A] rounded-none"
                  />
                </div>
              </div>

              <div className="bg-[#1A1A1A] p-6 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4D4D4] mb-2">{locale === 'en' ? 'ประมาณการรวมทั้งสัญญา' : locale === 'zh' ? 'ประมาณการรวมทั้งสัญญา' : 'ประมาณการรวมทั้งสัญญา'}</p>
                <p className="text-3xl font-light">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{calculatedTotal.toLocaleString()}</p>
                <p className="text-[10px] text-[#A3A3A3] mt-2 uppercase tracking-widest">{locale === 'en' ? 'คำนวณจากพื้นที่: ' : locale === 'zh' ? 'คำนวณจากพื้นที่: ' : 'คำนวณจากพื้นที่: '}{selectedHouse?.area_size || 0} {locale === 'en' ? 'sq m.' : locale === 'zh' ? '平方米。' : ' ตร.ม.'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 bg-[#FAFAF8] border-t border-[#F1F1EB] flex items-center justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] hover:text-[#1A1A1A] transition-colors"
          >
            {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '             ยกเลิก           '}</button>
          <button 
            onClick={handleSubmit}
            disabled={saving || !serviceId}
            className="flex items-center gap-2 bg-[#1A1A1A] text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {saving ? 'กำลังประมวลผล...' : <><CheckCircle2 className="h-4 w-4" /> {editOrderData ? 'อัปเดตแผนบริการ' : 'สร้างรายการมอบหมายงาน'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
