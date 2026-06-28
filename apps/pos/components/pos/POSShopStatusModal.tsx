'use client';
import React, { useState } from 'react'
import { Clock, Ban, Calendar, CheckCircle2, X, Loader2, ArrowRight, Info, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from "@/lib/I18nContext";

interface POSShopStatusModalProps {
  isOpen: boolean
  onClose: () => void
  currentStatus: string
  onUpdateStatus: (status: string, expiry?: Date | null) => Promise<void>
  hasActiveShift: boolean
}

export default function POSShopStatusModal({ isOpen, onClose, currentStatus, onUpdateStatus, hasActiveShift }: POSShopStatusModalProps) {
    const { locale } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleApplyStatus = async (status: string, minutes?: number, days?: number) => {
    setIsSubmitting(true)
    try {
      let expiry = null
      if (minutes) {
        expiry = new Date(Date.now() + minutes * 60000)
      } else if (days) {
        const d = new Date()
        d.setHours(23, 59, 59, 999)
        d.setDate(d.getDate() + (days - 1))
        expiry = d
      } else if (status === 'closed_today') {
        const d = new Date()
        d.setHours(23, 59, 59, 999)
        expiry = d
        status = 'closed'
      }

      await onUpdateStatus(status, expiry)
      onClose()
    } catch (err) {
      console.error('Update status failed:', err)
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะร้าน')
    } finally {
      setIsSubmitting(false)
    }
  }

  const options = [
    {
      id: 'open',
      label: 'เปิดรับออเดอร์ปกติ',
      sub: 'เปิดร้านและรับลูกค้าตามปกติ',
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      action: () => handleApplyStatus('open', 0)
    },
    {
      id: 'pause_30',
      label: 'หยุดรับ 30 นาที',
      sub: 'ระบบจะกลับมาเปิดร้านใหม่อัตโนมัติใน 30 นาที',
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      action: () => handleApplyStatus('paused', 30)
    },
    {
      id: 'paused',
      label: 'หยุดรับชั่วคราว (Manual)',
      sub: 'ปิดรับออเดอร์ชั่วคราว ต้องกดเปิดร้านเองเมื่อพร้อม',
      icon: Ban,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      action: () => handleApplyStatus('paused', 0)
    },
    {
      id: 'closed_today',
      label: 'ปิดร้านวันนี้',
      sub: 'แสดงสถานะปิดบริการจนถึงวันพรุ่งนี้',
      icon: Calendar,
      color: 'text-red-500',
      bg: 'bg-red-50',
      action: () => handleApplyStatus('closed_today', 0)
    }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#3a3a38]/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[#FBFBFA] shadow-2xl overflow-hidden border border-[#E5E5DF]"
          >
            {/* Header */}
            <div className="p-8 border-b border-[#F0F0E8] flex items-center justify-between bg-white">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#1A1A18] text-white flex items-center justify-center">
                    <Info size={20} />
                  </div>
                  <div>
                    <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-[#1A1A18]">{locale === 'en' ? 'จัดการสถานะการขาย (LIFF)' : locale === 'zh' ? 'จัดการสถานะการขาย (LIFF)' : 'จัดการสถานะการขาย (LIFF)'}</h2>
                    <p className="text-[9px] font-bold text-[#8C8A81] uppercase tracking-[0.1em] mt-1">Online Store Management Control</p>
                  </div>
               </div>
               <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-[#1A1A18] transition-colors">
                 <X size={20} />
               </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-4 relative">
               {/* Current Status Banner */}
               <div className={`p-6 mb-8 border-2 flex items-center justify-between shadow-sm transition-all ${
                   !hasActiveShift ? 'bg-red-50 border-red-200 text-red-600' :
                   currentStatus === 'open' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                   currentStatus === 'paused' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                   'bg-red-50 border-red-200 text-red-600'
               }`}>
                  <div className="flex items-center gap-5">
                     <div className={`w-3 h-3 rounded-full animate-pulse ${
                         !hasActiveShift || currentStatus === 'closed' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                         currentStatus === 'open' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                     }`} />
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">{locale === 'en' ? 'สถานะร้านค้าปัจจุบัน' : locale === 'zh' ? 'สถานะร้านค้าปัจจุบัน' : 'สถานะร้านค้าปัจจุบัน'}</span>
                        <span className="text-[18px] font-black tracking-tight leading-none">
                           {!hasActiveShift ? 'กะทำงานปิดอยู่ (ร้านออฟไลน์)' : 
                            currentStatus === 'open' ? 'เปิดร้าน & รับออเดอร์ปกติ' : 
                            currentStatus === 'paused' ? 'หยุดรับออเดอร์ชั่วคราว' : 
                            'ปิดร้านค้าชั่วคราว (Manual)'}
                        </span>
                     </div>
                  </div>
                  <div className="text-[9px] font-black uppercase opacity-30 italic leading-none text-right">
                     {locale === 'en' ? '                      ระบบซิงค์ข้อมูลแบบ' : locale === 'zh' ? '                      ระบบซิงค์ข้อมูลแบบ' : '                      ระบบซิงค์ข้อมูลแบบ'}<br/>REAL-TIME
                  </div>
               </div>

               {!hasActiveShift && (
                 <div className="absolute inset-0 z-20 bg-[#FBFBFA]/60 backdrop-blur-[4px] flex flex-col items-center justify-center p-8 text-center select-none">
                    <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-6 animate-pulse">
                      <Lock size={32} />
                    </div>
                    <h3 className="text-[14px] font-black uppercase tracking-[0.2em] text-[#1A1A18]">{locale === 'en' ? 'ต้องเปิดกะทำงานก่อน' : locale === 'zh' ? 'ต้องเปิดกะทำงานก่อน' : 'ต้องเปิดกะทำงานก่อน'}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2 max-w-[200px]">{locale === 'en' ? 'กรุณาเปิดกะ (Open Shift) ในคลังเงิน เพื่อจัดการสถานะร้านออนไลน์' : locale === 'zh' ? 'กรุณาเปิดกะ (Open Shift) ในคลังเงิน เพื่อจัดการสถานะร้านออนไลน์' : 'กรุณาเปิดกะ (Open Shift) ในคลังเงิน เพื่อจัดการสถานะร้านออนไลน์'}</p>
                 </div>
               )}

               {options.map((opt) => (
                 <button 
                   key={opt.id}
                   onClick={() => {
                     if (!hasActiveShift) return;
                     opt.action();
                   }}
                   disabled={isSubmitting || !hasActiveShift}
                   className={`w-full group p-6 flex items-center justify-between border border-transparent hover:border-[#1A1A18] transition-all bg-white relative overflow-hidden ${isSubmitting || !hasActiveShift ? 'opacity-50' : ''}`}
                 >
                    <div className="flex items-center gap-6 relative z-10">
                       <div className={`w-12 h-12 ${opt.bg} ${opt.color} flex items-center justify-center`}>
                          <opt.icon size={22} />
                       </div>
                       <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[13px] font-black uppercase tracking-tight text-[#1A1A18] font-sans">{opt.label}</h4>
                            {currentStatus === opt.id && (
                               <span className="text-[7px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 border border-emerald-100 uppercase tracking-widest">{locale === 'en' ? 'สถานะปัจจุบัน' : locale === 'zh' ? 'สถานะปัจจุบัน' : 'สถานะปัจจุบัน'}</span>
                            )}
                          </div>
                          <p className="text-[9px] font-bold text-[#8C8A81] uppercase tracking-widest mt-0.5">{opt.sub}</p>
                       </div>
                    </div>
                    <ArrowRight size={18} className="text-gray-200 group-hover:text-[#1A1A18] group-hover:translate-x-2 transition-all" />
                 </button>
               ))}
            </div>

            <div className="px-10 pb-10">
               <p className="text-[10px] font-medium text-amber-600 bg-amber-50/50 p-4 leading-relaxed border-l-2 border-amber-300 uppercase tracking-tighter">
                  {locale === 'en' ? '                   * การเปลี่ยนแปลงสถานะจะมีผลต่อหน้า LIFF ของลูกค้าแบบ Real-time และระบบจะทำการล็อคการชำระเงินทันทีที่สถานะไม่ใช่ "เปิดรับออเดอร์ปกติ"                ' : locale === 'zh' ? '                   * การเปลี่ยนแปลงสถานะจะมีผลต่อหน้า LIFF ของลูกค้าแบบ Real-time และระบบจะทำการล็อคการชำระเงินทันทีที่สถานะไม่ใช่ "เปิดรับออเดอร์ปกติ"                ' : '                   * การเปลี่ยนแปลงสถานะจะมีผลต่อหน้า LIFF ของลูกค้าแบบ Real-time และระบบจะทำการล็อคการชำระเงินทันทีที่สถานะไม่ใช่ "เปิดรับออเดอร์ปกติ"                '}</p>
            </div>

            <div className="bg-white p-6 border-t border-[#F0F0E8] text-center">
               <p className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-300 italic">Designed by XYL STUDIO • Smart OPS v2.2</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
