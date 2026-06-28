'use client';
import Link from 'next/link'
import { 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  ClipboardList, 
  ChevronRight, 
  ShieldCheck, 
  Activity, 
  Droplets, 
  Sprout, 
  BugOff, 
  Settings,
  Star,
  ArrowLeft,
  X
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/I18nContext'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  extractCustomerReportTasks,
  type CustomerReportItem,
  formatCustomerReportDate,
} from '@/lib/customerReports'
import { formatDateTimeByLocale } from '@/lib/localeFormat'

type CustomerReportDetailActionLinks = {
  rateHref?: string | null
  issueHref?: string | null
}

type CustomerReportDetailPanelProps = {
  report: CustomerReportItem
  actions?: CustomerReportDetailActionLinks
  onRate?: (() => void) | null
  onIssue?: (() => void) | null
  onBack?: (() => void) | null
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
}

export default function CustomerReportDetailPanel({ report, actions, onRate, onIssue, onBack }: CustomerReportDetailPanelProps) {
  const router = useRouter()
  const { locale, copy } = useI18n() as any
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const getSafeImageUrl = (url: string) => {
    if (!url) return '';
    return url.replace('/render/image/public/', '/object/public/');
  }

  const workItems = extractCustomerReportTasks(report.workDone, 12)
  const issueItems = extractCustomerReportTasks(report.problemsFound, 12)
  const canOpenFeedback = report.orderId && report.orderStatus === 'completed'
  const ratingFeedback = report.customerRating || null
  const hasIssues = issueItems.length > 0
  const healthScore = hasIssues ? 88 : 100

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col bg-[#F9F8F6] min-h-screen text-[#111111] font-sans selection:bg-[#AF907A] selection:text-white pb-32"
    >
      {/* 1. COMPACT APP HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#EAEAEA] px-5 py-4 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <button 
              onClick={() => onBack ? onBack() : router.back()} 
              className="p-1 -ml-1 text-[#111111] hover:text-[#AF907A] transition-colors"
            >
               <ArrowLeft size={20} />
            </button>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#111111]">{copy.reportLog} #{report.annualVisitSequence || 1}</span>
         </div>
         <div className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">
            {formatDateTimeByLocale(report.updatedAt || report.createdAt, locale)}
         </div>
      </header>

      <div className="max-w-2xl mx-auto w-full">
         
         {/* 2. HEALTH DASHBOARD (APP CARD) */}
         <section className="px-5 py-8">
            <motion.div variants={itemVariants} className="bg-white border border-[#EAEAEA] p-6 rounded-none shadow-sm space-y-8">
               <div className="flex justify-between items-start">
                  <div className="space-y-1">
                     <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#AF907A]">{copy.healthStatus}</p>
                     <h1 className="font-serif-thai text-4xl text-[#111111] leading-none tracking-tighter">
                        {healthScore}{locale === 'en' ? '% สมบูรณ์                      ' : locale === 'zh' ? '% สมบูรณ์                      ' : '% สมบูรณ์                      '}</h1>
                  </div>
                  <div className="w-10 h-10 bg-[#111111] flex items-center justify-center text-white rounded-none">
                     <ShieldCheck size={20} />
                  </div>
               </div>

               <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: copy.metrics.soil, icon: Droplets, val: 'ปกติ' },
                    { label: copy.metrics.nutrients, icon: Sprout, val: 'สูง' },
                    { label: copy.metrics.pests, icon: BugOff, val: hasIssues ? 'ระวัง' : 'ไม่มี' },
                    { label: copy.metrics.irrigation, icon: Settings, val: 'ทำงาน' }
                  ].map((m, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 text-center py-2 bg-[#F9F8F6] border border-[#F0F0F0] rounded-none">
                       <m.icon size={14} className={m.val === 'ระวัง' ? 'text-[#9D4A40]' : 'text-[#AF907A]'} />
                       <span className="text-[7px] font-bold uppercase tracking-widest text-[#A3A3A3]">{m.label}</span>
                       <span className={`text-[9px] font-black ${m.val === 'ระวัง' ? 'text-[#9D4A40]' : 'text-[#111111]'}`}>{m.val}</span>
                    </div>
                  ))}
               </div>
            </motion.div>
         </section>

         {/* 3. EVIDENCE GALLERY (COMPACT GRID) */}
         <section className="px-5 space-y-8 pb-8">
            {report.zones && report.zones.length > 0 ? (
               report.zones.map((zone, idx) => (
                  <motion.div key={zone.id} variants={itemVariants} className="space-y-4">
                     <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2">
                        <h3 className="text-[12px] font-black uppercase tracking-tighter text-[#111111]">0{idx+1} {zone.name}</h3>
                        <span className="text-[9px] font-bold text-[#AF907A] uppercase tracking-widest">Zone Report</span>
                     </div>
                     <div className="grid grid-cols-3 gap-2">
                        {(zone as any).beforePhotos?.map((p: string, i: number) => (
                           <div key={i} onClick={() => setSelectedImage(getSafeImageUrl(p))} className="relative aspect-square bg-white border border-[#F0F0F0] p-1 rounded-none cursor-pointer">
                              <img src={getSafeImageUrl(p)} alt="B" className="w-full h-full object-cover grayscale-[0.2]" />
                              <div className="absolute top-2 left-2 bg-black/40 text-white text-[5px] font-black uppercase px-1 py-0.5 pointer-events-none">{locale === 'en' ? 'ก่อนทำ' : locale === 'zh' ? 'ก่อนทำ' : 'ก่อนทำ'}</div>
                           </div>
                        ))}
                        {(zone as any).afterPhotos?.map((p: string, i: number) => (
                           <div key={i} onClick={() => setSelectedImage(getSafeImageUrl(p))} className="relative aspect-square bg-white border border-[#EAEAEA] p-1 rounded-none shadow-sm cursor-pointer">
                              <img src={getSafeImageUrl(p)} alt="A" className="w-full h-full object-cover" />
                              <div className="absolute top-2 left-2 bg-[#AF907A] text-white text-[5px] font-black uppercase px-1 py-0.5 pointer-events-none">{locale === 'en' ? 'หลังทำ' : locale === 'zh' ? 'หลังทำ' : 'หลังทำ'}</div>
                           </div>
                        ))}
                     </div>
                  </motion.div>
               ))
            ) : (
               <motion.div variants={itemVariants} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2">
                     <h3 className="text-[12px] font-black uppercase tracking-tighter text-[#111111]">{copy.reportVisuals}</h3>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                     {report.beforePhotos.map((p, i) => (
                        <div key={i} onClick={() => setSelectedImage(getSafeImageUrl(p))} className="relative aspect-square bg-white border border-[#F0F0F0] p-1 rounded-none opacity-80 cursor-pointer">
                           <img src={getSafeImageUrl(p)} alt="B" className="w-full h-full object-cover" />
                        </div>
                     ))}
                     {report.afterPhotos.map((p, i) => (
                        <div key={i} onClick={() => setSelectedImage(getSafeImageUrl(p))} className="relative aspect-square bg-white border border-[#EAEAEA] p-1 rounded-none shadow-sm cursor-pointer">
                           <img src={getSafeImageUrl(p)} alt="A" className="w-full h-full object-cover" />
                        </div>
                     ))}
                  </div>
               </motion.div>
            )}
         </section>

         {/* 4. MANAGEMENT SUMMARY (CLEAN TEXT LIST) */}
         <section className="px-5 py-10 space-y-12">
            <motion.div variants={itemVariants} className="space-y-8">
               <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#111111]/10 pb-4">
                     <Activity size={14} className="text-[#AF907A]" />
                     <h3 className="text-[12px] font-black uppercase tracking-widest text-[#111111]">{copy.reportWorkDoneLabel}</h3>
                  </div>
                  <div className="space-y-5 px-1">
                     {workItems.map((item, i) => (
                        <div key={i} className="flex gap-4 items-start">
                           <span className="text-[10px] font-bold text-[#AF907A] mt-1.5 tracking-tighter w-4 shrink-0">{i+1}.</span>
                           <span className="text-[16px] font-serif-thai text-[#111111] leading-relaxed">{item}</span>
                        </div>
                     ))}
                  </div>

                  {issueItems.length > 0 && (
                     <div className="pt-10 space-y-6">
                        <div className="flex items-center gap-2 border-b border-[#9D4A40]/10 pb-4">
                           <AlertTriangle size={14} className="text-[#9D4A40]" />
                           <span className="text-[10px] font-bold uppercase tracking-widest text-[#9D4A40]">{copy.reportIssuesLabel}</span>
                        </div>
                        <div className="space-y-4 px-1">
                           {issueItems.map((item, i) => (
                              <div key={i} className="flex gap-4 items-start text-[#9D4A40]">
                                 <span className="text-[10px] font-bold mt-1.5 w-4 shrink-0">{i+1}.</span>
                                 <span className="text-[15px] font-serif-thai italic leading-relaxed">
                                    {item}
                                 </span>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>

               <div className="pt-12 border-t border-[#111111]/5 space-y-8">
                  <div className="flex items-center gap-3">
                     <ClipboardList size={14} className="text-[#AF907A]" />
                     <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#A3A3A3]">{copy.reportAdviceLabel}</span>
                  </div>
                  <p className="font-serif-thai text-2xl font-light italic leading-snug text-[#111111] px-1">
                     {report.recommendations ? `${report.recommendations}` : 'ระบบนิเวศน์ในสวนของคุณกำลังพัฒนาไปในทางที่ดีเยี่ยมครับ โปรดรักษาความชื้นตามที่เราแนะนำอย่างต่อเนื่องนะครับ'}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-8 pt-8 border-t border-[#111111]/5">
                     <div className="space-y-1">
                        <p className="text-[8px] font-bold uppercase text-[#A3A3A3] tracking-widest">{copy.reportStaff}</p>
                        <p className="text-[14px] font-serif-thai text-[#AF907A] italic leading-none">{report.staff_name || copy.assigned}</p>
                     </div>
                     <div className="text-right space-y-1">
                        <p className="text-[8px] font-bold uppercase text-[#A3A3A3] tracking-widest">{copy.reportNextVisitLabel}</p>
                        <p className="text-[14px] font-serif-thai text-[#111111] leading-none">{formatCustomerReportDate(report.nextVisitDate, locale)}</p>
                     </div>
                  </div>
               </div>
            </motion.div>

            {/* AUDIT STATUS */}
            {ratingFeedback && (
               <motion.div variants={itemVariants} className="bg-white border border-[#EAEAEA] p-6 space-y-4">
                  <div className="flex justify-between items-center">
                     <h3 className="text-[11px] font-black uppercase tracking-widest text-[#111111]">{copy.ratingLocked}</h3>
                     <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(v => (
                           <Star key={v} size={14} className={ratingFeedback.rating! >= v ? 'text-[#AF907A]' : 'text-[#EAEAEA]'} fill={ratingFeedback.rating! >= v ? 'currentColor' : 'none'} strokeWidth={1} />
                        ))}
                     </div>
                  </div>
                  <p className="text-[15px] font-serif-thai italic text-[#111111] leading-relaxed">"{ratingFeedback.commentMessage}"</p>
               </motion.div>
            )}
         </section>
      </div>

      {/* 5. FIXED BOTTOM ACTION BAR (APP STYLE) */}
      <AnimatePresence>
         {!ratingFeedback && canOpenFeedback && (
            <motion.footer 
               initial={{ y: 100 }}
               animate={{ y: 0 }}
               className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-[#EAEAEA] px-5 py-5 flex gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"
            >
               <button 
                  onClick={onRate || (() => {})}
                  className="flex-1 bg-[#111111] text-white py-4 px-4 text-[11px] font-black uppercase tracking-[0.2em] transition-transform active:scale-95"
               >
                  {copy.rateNow}
               </button>
               <button 
                  onClick={onIssue || (() => {})}
                  className="px-6 border border-[#EAEAEA] text-[#111111] py-4 text-[11px] font-bold uppercase tracking-[0.1em] transition-transform active:scale-95"
               >
                  {locale === 'en' ? '                   แจ้งปัญหา                ' : locale === 'zh' ? '                   แจ้งปัญหา                ' : '                   แจ้งปัญหา                '}</button>
            </motion.footer>
         )}
      </AnimatePresence>

      {/* FULLSCREEN IMAGE OVERLAY */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={selectedImage}
              alt="Enlarged evidence"
              className="max-w-full max-h-[85vh] object-contain rounded-md"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
