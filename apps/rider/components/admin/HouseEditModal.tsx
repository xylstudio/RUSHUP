'use client';
import React, { useState } from 'react'
import { X, CheckCircle2, AlertCircle, Home, Maximize2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useI18n } from "@/lib/I18nContext";

interface HouseEditModalProps {
  isOpen: boolean
  onClose: () => void
  house: any
  onSuccess: () => void
}

export default function HouseEditModal({ isOpen, onClose, house, onSuccess }: HouseEditModalProps) {
    const { locale } = useI18n();
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [name, setName] = useState(house?.name || '')
  const [address, setAddress] = useState(house?.address || '')
  const [areaSize, setAreaSize] = useState(house?.area_size || 0)

  if (!isOpen) return null

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('houses')
        .update({
          name,
          address,
          area_size: areaSize,
          total_area: areaSize // Syncing both just in case
        })
        .eq('id', house.id)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-hidden font-serif-thai">
        <div className="px-8 py-6 border-b border-[#F1F1EB] flex items-center justify-between bg-[#FAFAF8]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A3A3A3] mb-1 block">{locale === 'en' ? 'ข้อมูลอสังหาริมทรัพย์' : locale === 'zh' ? 'ข้อมูลอสังหาริมทรัพย์' : 'ข้อมูลอสังหาริมทรัพย์'}</span>
            <h2 className="text-xl font-light text-[#1A1A1A]">{locale === 'en' ? 'แก้ไขข้อมูลบ้าน / พื้นที่' : locale === 'zh' ? 'แก้ไขข้อมูลบ้าน / พื้นที่' : 'แก้ไขข้อมูลบ้าน / พื้นที่'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white transition-colors">
            <X className="h-5 w-5 text-[#A3A3A3]" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'ชื่อบ้าน / โครงการ' : locale === 'zh' ? 'ชื่อบ้าน / โครงการ' : 'ชื่อบ้าน / โครงการ'}</label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A3A3A3]" />
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#FAFAF8] border border-[#E5E5DF] text-sm focus:outline-none focus:border-[#1A1A1A] rounded-none"
                  placeholder={locale === 'en' ? 'เช่น บ้านพักหัวหิน, โครงการแสนสิริ' : locale === 'zh' ? 'เช่น บ้านพักหัวหิน, โครงการแสนสิริ' : 'เช่น บ้านพักหัวหิน, โครงการแสนสิริ'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'ขนาดพื้นที่รวม (ตร.ม.)' : locale === 'zh' ? 'ขนาดพื้นที่รวม (ตร.ม.)' : 'ขนาดพื้นที่รวม (ตร.ม.)'}</label>
              <div className="relative">
                <Maximize2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A3A3A3]" />
                <input 
                  type="number"
                  value={areaSize}
                  onChange={(e) => setAreaSize(parseFloat(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 bg-[#FAFAF8] border border-[#E5E5DF] text-sm focus:outline-none focus:border-[#1A1A1A] rounded-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'ที่อยู่ / พิกัด' : locale === 'zh' ? 'ที่อยู่ / พิกัด' : 'ที่อยู่ / พิกัด'}</label>
              <textarea 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-[#FAFAF8] border border-[#E5E5DF] text-sm focus:outline-none focus:border-[#1A1A1A] rounded-none"
                placeholder={locale === 'en' ? 'ระบุที่อยู่โดยละเอียด' : locale === 'zh' ? 'ระบุที่อยู่โดยละเอียด' : 'ระบุที่อยู่โดยละเอียด'}
              />
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
            disabled={saving}
            className="flex items-center gap-2 bg-[#1A1A1A] text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : <><CheckCircle2 className="h-4 w-4" /> {locale === 'en' ? ' บันทึกข้อมูล' : locale === 'zh' ? ' บันทึกข้อมูล' : ' บันทึกข้อมูล'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
