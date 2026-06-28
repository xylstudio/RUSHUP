'use client';
import React, { useState } from 'react'
import { Wallet, X, ArrowRight, AlertTriangle, Printer } from 'lucide-react'
import XYLLoader from '@/components/loaders/XYLLoader'
import { motion, AnimatePresence } from 'framer-motion'
import { printOpenDrawer } from '@/lib/printerUtils'
import { useI18n } from "@/lib/I18nContext";

interface POSShiftModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenShift: (cash: number) => Promise<void>
  shopSettings?: any
}

export default function POSShiftModal({ isOpen, onClose, onOpenShift, shopSettings }: POSShiftModalProps) {
    const { locale } = useI18n();
  const [openingCash, setOpeningCash] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isOpeningDrawer, setIsOpeningDrawer] = useState(false)

  const openDrawerBeforeCounting = async () => {
    if (isOpeningDrawer) return
    setIsOpeningDrawer(true)
    try {
      let printers = shopSettings?.printers || []
      let receiptPrinters = printers.filter((p: any) => p.type === 'receipt' || p.type === 'both')

      if (receiptPrinters.length === 0 && typeof window !== 'undefined') {
        const ip = localStorage.getItem('xylem_printer_ip')
        if (ip) {
          receiptPrinters = [{ ip, type: 'receipt', model: 'xprinter-xp-n160ii' }]
        }
      }

      if (receiptPrinters.length === 0) {
        alert('ยังไม่พบเครื่องปริ้นสำหรับเปิดลิ้นชัก')
        return
      }

      for (const rp of receiptPrinters) {
        if (!rp.ip) continue
        await printOpenDrawer(rp.ip, rp.model)
      }
    } catch (err) {
      console.error('Open drawer failed:', err)
      alert('เปิดลิ้นชักไม่สำเร็จ กรุณาตรวจสอบเครื่องปริ้น')
    } finally {
      setIsOpeningDrawer(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirm(true)
  }

  const handleConfirmedOpen = async () => {
    setIsSubmitting(true)
    try {
      await onOpenShift(openingCash)
      onClose()
    } catch (err) {
      console.error('Open Shift failed:', err)
      alert('เกิดข้อผิดพลาดในการเปิดกะ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsSubmitting(false)
      setShowConfirm(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#3a3a38]/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#FBFBFA] shadow-2xl overflow-hidden border border-[#E5E5DF]"
          >
            {/* Confirmation Overlay */}
            <AnimatePresence>
              {showConfirm && (
                <motion.div 
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center p-10 text-center space-y-8"
                >
                  <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center animate-bounce">
                    <AlertTriangle size={40} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#1A1A18] mb-2 uppercase">{locale === 'en' ? 'ยืนยันการเปิดลิ้นชัก?' : locale === 'zh' ? 'ยืนยันการเปิดลิ้นชัก?' : 'ยืนยันการเปิดลิ้นชัก?'}</h3>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{locale === 'en' ? 'เงินเริ่มต้น: ฿' : locale === 'zh' ? 'เงินเริ่มต้น: ฿' : 'เงินเริ่มต้น: ฿'}{openingCash.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col w-full gap-3">
                    <button 
                      onClick={handleConfirmedOpen}
                      disabled={isSubmitting}
                      className="w-full h-16 bg-[#1A1A18] text-white font-black uppercase tracking-[0.3em] text-[11px] hover:bg-black transition-all flex items-center justify-center gap-4"
                    >
                      {isSubmitting ? <XYLLoader mini /> : 'ยืนยันและเปิดลิ้นชัก'}
                    </button>
                    <button 
                      onClick={() => setShowConfirm(false)}
                      className="w-full h-14 bg-gray-50 text-[#8C8A81] font-black uppercase tracking-[0.2em] text-[9px] hover:bg-gray-100 transition-all border border-gray-100"
                    >
                      {locale === 'en' ? '                       ยกเลิกเพื่อแก้ไข                     ' : locale === 'zh' ? '                       ยกเลิกเพื่อแก้ไข                     ' : '                       ยกเลิกเพื่อแก้ไข                     '}</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header Area */}
            <div className="p-8 border-b border-[#F0F0E8] flex items-center justify-between bg-white">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#1A1A18] text-white flex items-center justify-center">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-[#1A1A18]">{locale === 'en' ? 'เปิดกะทำงานใหม่' : locale === 'zh' ? 'เปิดกะทำงานใหม่' : 'เปิดกะทำงานใหม่'}</h2>
                    <p className="text-[9px] font-bold text-[#8C8A81] uppercase tracking-[0.1em] mt-1">{locale === 'en' ? 'ยืนยันการเริ่มกะทำงาน' : locale === 'zh' ? 'ยืนยันการเริ่มกะทำงาน' : 'ยืนยันการเริ่มกะทำงาน'}</p>
                  </div>
               </div>
               <button 
                 onClick={onClose}
                 className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-[#1A1A18] transition-colors"
               >
                 <X size={20} />
               </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-10 space-y-10">
               <div className="space-y-3">
                  <button
                    type="button"
                    onClick={openDrawerBeforeCounting}
                    disabled={isOpeningDrawer}
                    className="w-full h-14 bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center gap-3 font-black uppercase tracking-[0.25em] text-[10px] hover:bg-emerald-100 transition-all disabled:opacity-50"
                  >
                    {isOpeningDrawer ? <XYLLoader mini /> : <Printer size={16} />}
                    <span>{locale === 'en' ? 'เปิดลิ้นชักก่อนนับเงิน' : locale === 'zh' ? 'เปิดลิ้นชักก่อนนับเงิน' : 'เปิดลิ้นชักก่อนนับเงิน'}</span>
                  </button>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">
                    {locale === 'en' ? 'กดปุ่มนี้ก่อนกรอกเงินเปิดกะ เพื่อให้พนักงานนับเงินได้จริง' : locale === 'zh' ? 'กดปุ่มนี้ก่อนกรอกเงินเปิดกะ เพื่อให้พนักงานนับเงินได้จริง' : 'กดปุ่มนี้ก่อนกรอกเงินเปิดกะ เพื่อให้พนักงานนับเงินได้จริง'}
                  </p>
               </div>
               <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-[#8C8A81] block">
                    {locale === 'en' ? '                     ระบุเงินสดเริ่มต้นในลิ้นชัก (Opening Cash)                   ' : locale === 'zh' ? '                     ระบุเงินสดเริ่มต้นในลิ้นชัก (Opening Cash)                   ' : '                     ระบุเงินสดเริ่มต้นในลิ้นชัก (Opening Cash)                   '}</label>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-light text-gray-300 group-focus-within:text-[#1A1A18]">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}</span>
                    <input 
                      autoFocus
                      type="number" 
                      value={openingCash || ''} 
                      onChange={e => setOpeningCash(Number(e.target.value))}
                      className="w-full bg-white border border-[#E5E5DF] py-10 pl-14 pr-8 text-5xl font-black outline-none focus:ring-1 focus:ring-[#1A1A18] transition-all text-[#1A1A18]"
                      placeholder="0"
                      required
                    />
                  </div>
                  <p className="text-[10px] font-medium text-amber-600 bg-amber-50/50 p-4 leading-relaxed border-l-2 border-amber-300 uppercase tracking-tighter">
                    {locale === 'en' ? '                     * กรุณาตรวจสอบเงินในลิ้นชักให้ถูกต้องก่อนเริ่มกะทำงาน เพื่อความแม่นยำของใบสรุปยอดปิดกะท้ายวัน                   ' : locale === 'zh' ? '                     * กรุณาตรวจสอบเงินในลิ้นชักให้ถูกต้องก่อนเริ่มกะทำงาน เพื่อความแม่นยำของใบสรุปยอดปิดกะท้ายวัน                   ' : '                     * กรุณาตรวจสอบเงินในลิ้นชักให้ถูกต้องก่อนเริ่มกะทำงาน เพื่อความแม่นยำของใบสรุปยอดปิดกะท้ายวัน                   '}</p>
               </div>

               <button 
                 type="submit"
                 disabled={isSubmitting}
                 className="w-full h-20 bg-[#1A1A18] text-white flex items-center justify-center gap-6 group hover:bg-[#2B2B28] transition-all disabled:opacity-50"
               >
                 {isSubmitting ? (
                   <XYLLoader mini />
                 ) : (
                   <>
                    <span className="text-[11px] font-black uppercase tracking-[0.4em]">{locale === 'en' ? 'ยืนยันและเปิดลิ้นชัก' : locale === 'zh' ? 'ยืนยันและเปิดลิ้นชัก' : 'ยืนยันและเปิดลิ้นชัก'}</span>
                    <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                   </>
                 )}
               </button>
            </form>

            <div className="px-10 pb-8 text-center">
               <p className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-300">{locale === 'en' ? 'ระบบปฏิบัติการ XYL STUDIO • v1.0.32' : locale === 'zh' ? 'ระบบปฏิบัติการ XYL STUDIO • v1.0.32' : 'ระบบปฏิบัติการ XYL STUDIO • v1.0.32'}</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
