'use client';
import React, { useState, useEffect } from 'react'
import { X, Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useI18n } from "@/lib/I18nContext";

interface AdminRescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  plan: any
  onSuccess: () => void
}

export default function AdminRescheduleModal({ isOpen, onClose, plan, onSuccess }: AdminRescheduleModalProps) {
    const { locale } = useI18n();
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newDate, setNewDate] = useState('')

  useEffect(() => {
    if (isOpen && plan?.scheduled_date) {
      setNewDate(new Date(plan.scheduled_date).toISOString().slice(0, 10))
    }
  }, [isOpen, plan])

  async function handleSubmit() {
    if (!newDate) {
      setError('โปรดระบุวันที่นัดหมายใหม่')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/admin/orders/${plan.id}/reschedule`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          newDate,
          reason: 'แอดมินเลื่อนนัดหมาย'
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'ไม่สามารถเลื่อนนัดหมายได้')
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-hidden font-serif-thai">
        <div className="px-6 py-5 border-b border-[#F1F1EB] flex items-center justify-between bg-[#FAFAF8]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A3A3A3] mb-1 block">
              Admin Tool
            </span>
            <h2 className="text-xl font-light text-[#1A1A1A]">{locale === 'en' ? 'เลื่อนนัดหมายบริการ' : locale === 'zh' ? 'เลื่อนนัดหมายบริการ' : 'เลื่อนนัดหมายบริการ'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white transition-colors">
            <X className="h-5 w-5 text-[#A3A3A3]" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-[#FAFAF8] p-4 border border-[#F1F1EB]">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-4 w-4 text-[#A3A3A3]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'Service details' : locale === 'zh' ? '服务详情' : 'รายละเอียดบริการ'}</span>
              </div>
              <p className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide">{plan?.service_name}</p>
              <p className="text-[10px] text-[#70706B] uppercase tracking-widest mt-1">{locale === 'en' ? 'house:' : locale === 'zh' ? '房子：' : 'บ้าน: '}{plan?.house_name || 'ไม่ระบุ'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'เลือกวันนัดหมายใหม่' : locale === 'zh' ? 'เลือกวันนัดหมายใหม่' : 'เลือกวันนัดหมายใหม่'}</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A3A3A3]" />
                <input 
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#FAFAF8] border border-[#E5E5DF] text-sm focus:outline-none focus:border-[#1A1A1A] rounded-none"
                />
              </div>
              <p className="text-[10px] text-[#A3A3A3] italic">{locale === 'en' ? '* ระบบจะส่ง LINE แจ้งเตือนลูกค้าทันทีที่กดยืนยัน' : locale === 'zh' ? '* ระบบจะส่ง LINE แจ้งเตือนลูกค้าทันทีที่กดยืนยัน' : '* ระบบจะส่ง LINE แจ้งเตือนลูกค้าทันทีที่กดยืนยัน'}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 bg-[#FAFAF8] border-t border-[#F1F1EB] flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] hover:text-[#1A1A1A]"
          >
            {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '             ยกเลิก           '}</button>
          <button 
            onClick={handleSubmit}
            disabled={saving || !newDate}
            className="flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {saving ? 'กำลังประมวลผล...' : <><CheckCircle2 className="h-4 w-4" /> {locale === 'en' ? ' ยืนยันการเลื่อนนัด' : locale === 'zh' ? ' ยืนยันการเลื่อนนัด' : ' ยืนยันการเลื่อนนัด'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
