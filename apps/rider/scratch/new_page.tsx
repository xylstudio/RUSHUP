"use client";
import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ArrowLeft, ArrowRight, Activity, Home, Plus, Leaf, Calendar, Star,
  AlertCircle, Clock, CheckCircle, Phone, MessageSquare, CloudSun, Sparkles
} from "lucide-react";
import { getCustomerServiceFlow } from '@/lib/serviceFlow'
import { 
  buildCustomerReportSummary, CustomerReportItem, CustomerReportPlanItem, 
  CustomerReportSummary, formatCustomerReportDate, getCustomerReportSummaryText,
} from '@/lib/customerReports'
import { formatDateTimeByLocale } from '@/lib/localeFormat'
import { useI18n } from '@/lib/I18nContext'
import { OrderWithDetails, supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import XYLLoader from '@/components/loaders/XYLLoader'

type FeedbackNotice = { type: 'success' | 'error'; message: string }
type OrderPaymentRecord = {
  id: string; provider?: string | null; provider_charge_id?: string | null;
  amount?: number | null; currency?: string | null; status?: string | null;
  created_at?: string | null; paid_at?: string | null;
}
type CustomerOrderFeedbackRecord = {
  id?: string | null; order_id?: string | null; report_id?: string | null;
  customer_id?: string | null; feedback_type?: 'rating' | 'issue' | string | null;
  rating?: number | null; comment_message?: string | null; issue_message?: string | null;
  source?: string | null; status?: string | null; created_at?: string | null;
  updated_at?: string | null; fallback_storage?: 'audit_logs' | null;
}

function OrderDetailContent({ orderId }: { orderId: string }) {
  const { locale } = useI18n()
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const actionMode = searchParams.get('action');

  const copy = useMemo(() => {
    const dict = {
      th: {
        trackingTitle: 'ติดตามสถานะ.',
        logKicker: 'Operation Log',
        back: 'กลับหน้าแรก',
        staffAssigned: 'พนักงานเข้ารับงานแล้ว',
        waitingStaff: 'กำลังนัดหมายพนักงาน',
        orderCode: 'รหัสงาน',
        date: 'วันที่ทำรายการ',
        status: 'สถานะล่าสุด',
        summary: 'ภาพรวมงานทั้งหมดของออเดอร์นี้',
        feedbackTitle: 'การตอบกลับของคุณ',
        feedbackSuccess: 'ส่งข้อมูลเรียบร้อยแล้ว',
        feedbackError: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
        feedbackLocked: 'คุณให้คะแนนออเดอร์นี้แล้ว ระบบบันทึกไว้เรียบร้อยและไม่สามารถแก้ไขได้',
        feedbackAlreadySubmitted: 'ออเดอร์นี้ถูกให้คะแนนไปแล้ว',
        rateTitle: 'คะแนนการบริการ',
        issueTitle: 'แจ้งปัญหาเพิ่มเติม',
        yourRating: 'คะแนนที่บันทึกแล้ว',
        ratingCommentTitle: 'คอมเมนต์ของคุณ',
        ratingCommentPlaceholder: 'พิมพ์สิ่งที่ประทับใจหรือข้อเสนอแนะสั้น ๆ สำหรับรอบนี้',
        recordedAt: 'บันทึกเมื่อ',
        ratingLockedNote: 'คะแนนนี้ถูกล็อกหลังบันทึก เพื่อให้เป็นหลักฐานการประเมินหลังจบงาน',
        feedbackSection: 'ให้คะแนน & ข้อเสนอแนะ',
        feedbackSectionDesc: 'ให้คะแนนเป็นรายรอบการดูแล เพื่อให้ทีมเห็นสาเหตุและปรับปรุงได้ตรงจุด',
        rateNow: 'กดให้ดาวรอบนี้',
        reportIssueNow: 'แจ้งปัญหารอบนี้',
        waitingFeedback: 'ส่วนให้คะแนนจะเปิดหลังงานเสร็จสมบูรณ์',
        activeVisit: 'รอบที่เลือก',
        annualPlan: 'แผนดูแลรายปี',
        visitProgress: 'ทำแล้ว',
        visitRemaining: 'คงเหลือ',
        visitNoContext: 'เลือกรายงานหนึ่งรายการก่อน แล้วค่อยให้คะแนนรายรอบ',
        visitRated: 'รอบนี้ถูกให้คะแนนแล้ว',
        reportFeedbackTitle: 'ให้คะแนนรายงาน',
        reportSnapshot: 'สรุปรายงานล่าสุด',
        reportSnapshotDesc: 'หน้านี้คงไว้เฉพาะภาพรวมของรอบล่าสุด สามารถเปิดศูนย์รายงานเพื่อดูฉบับเต็ม',
        openReportCenter: 'เปิดศูนย์รายงาน',
        openLatestReport: 'เปิดรายงานล่าสุด',
        updatedAt: 'อัปเดตล่าสุด',
        send: 'ส่งข้อมูล',
        emptyReports: 'ยังไม่มีรายงานการทำงานสำหรับชุดงานนี้',
        loading: 'กำลังเตรียมข้อมูล',
      },
      en: {
        trackingTitle: 'Tracking.',
        logKicker: 'Operation Log',
        back: 'Return Home',
        staffAssigned: 'Staff Assigned',
        waitingStaff: 'Scheduling Staff',
        orderCode: 'Order Code',
        date: 'Order Date',
        status: 'Current Status',
        summary: 'Full Operational Summary',
        feedbackTitle: 'Your Feedback',
        feedbackSuccess: 'Submitted successfully',
        feedbackError: 'Submission failed',
        feedbackLocked: 'You already rated this order. The score is recorded.',
        feedbackAlreadySubmitted: 'This order has already been rated',
        rateTitle: 'Service Rating',
        issueTitle: 'Report an Issue',
        yourRating: 'Saved rating',
        ratingCommentTitle: 'Your comment',
        ratingCommentPlaceholder: 'Add a short compliment or suggestion',
        recordedAt: 'Recorded at',
        ratingLockedNote: 'This rating is locked after submission.',
        feedbackSection: 'Feedback and Rating',
        feedbackSectionDesc: 'Capture feedback per visit so the team can improve.',
        rateNow: 'Rate this visit',
        reportIssueNow: 'Report issue',
        waitingFeedback: 'Rating opens after the service is fully completed',
        activeVisit: 'Selected visit',
        annualPlan: 'Annual plan',
        visitProgress: 'Completed',
        visitRemaining: 'Remaining',
        visitNoContext: 'Select a report first before sending feedback.',
        visitRated: 'This visit has already been rated',
        reportFeedbackTitle: 'Rate maintenance report',
        reportSnapshot: 'Latest report snapshot',
        reportSnapshotDesc: 'Open the report center for the full archive.',
        openReportCenter: 'Open report center',
        openLatestReport: 'Open latest report',
        updatedAt: 'Latest update',
        send: 'Submit',
        emptyReports: 'No operational logs available',
        loading: 'Curating Content',
      }
    }
    return dict[locale] || dict.th
  }, [locale]);
  
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<CustomerReportItem[]>([])
  const [reportSummary, setReportSummary] = useState<CustomerReportSummary>(buildCustomerReportSummary([]))
  const [planItems, setPlanItems] = useState<CustomerReportPlanItem[]>([])
  const [orderProgress, setOrderProgress] = useState<any>(null)
  
  const [rating, setRating] = useState(5)
  const [ratingComment, setRatingComment] = useState('')
  const [issueMessage, setIssueMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState<FeedbackNotice | null>(null)

  const existingRatingFeedback = useMemo(() => {
    const raw = (order as any)?.customer_rating
    if (raw && typeof raw.rating === 'number') return raw
    const feedbackRows = ((order as any)?.customer_feedback || []) as CustomerOrderFeedbackRecord[]
    return feedbackRows.find((item) => item.feedback_type === 'rating' && typeof item.rating === 'number') || null
  }, [order])

  const latestPayment = useMemo(() => {
    const payments = ((order as any)?.payments || []) as OrderPaymentRecord[]
    return payments[0] || null
  }, [order])

  const paymentStatusTone = latestPayment?.status === 'paid'
    ? 'bg-[#F9F8F4] text-emerald-800 border-[#111111]'
    : latestPayment?.status === 'failed'
      ? 'bg-red-50 text-red-800 border-[#111111]'
      : 'bg-amber-50 text-amber-800 border-[#111111]'

  const serviceFlow = useMemo(
    () => getCustomerServiceFlow(locale, order?.status, orderProgress),
    [locale, order?.status, orderProgress]
  )
  const canOpenFeedback = serviceFlow.stage === 'completed'
  const reportIdFromQuery = searchParams.get('reportId') || searchParams.get('id')
  const isReportFeedbackMode = actionMode === 'rate-report' || actionMode === 'issue-report'
  const activeFeedbackReport = useMemo(() => {
    if (reportIdFromQuery) return reports.find((item) => item.id === reportIdFromQuery) || null
    return reports[0] || null
  }, [reportIdFromQuery, reports])
  const activeReportRatingFeedback = activeFeedbackReport?.customerRating || null
  const latestOrderReport = reports[0] || null
  const latestReportCenterHref = latestOrderReport
    ? `/dashboard/customer/reports?reportId=${encodeURIComponent(latestOrderReport.id)}`
    : '/dashboard/customer/reports'
  const currentOrderPlanItems = useMemo(
    () => planItems.filter((item) => item.orderId === orderId),
    [orderId, planItems]
  )

  useEffect(() => {
    if (authLoading) return;
    if (actionMode === 'reschedule' && order?.house_id) {
       router.replace(`/dashboard/customer/houses/${order.house_id}?calendar=open&action=reschedule&orderId=${orderId}`)
       return
    }
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/dashboard/customer/orders/${orderId}`)}`)
      return;
    }
    void fetchData();
  }, [orderId, user, authLoading, actionMode, order?.house_id, router]);

  async function fetchData() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = { ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }
      const results = await Promise.allSettled([
        fetch(`/api/customer/orders/${orderId}`, { method: 'GET', headers, credentials: 'include' }).then(r => r.json()),
        fetch(`/api/customer/reports?orderId=${encodeURIComponent(orderId)}&limit=5`, { method: 'GET', headers, credentials: 'include' }).then(r => r.json()),
        fetch('/api/customer/orders/progress', { method: 'GET', headers, credentials: 'include' }).then(r => r.json())
      ])

      if (results[0].status === 'fulfilled' && results[0].value.order) setOrder(results[0].value.order)
      if (results[1].status === 'fulfilled' && results[1].value.reports) {
        setReports(results[1].value.reports)
        setReportSummary(results[1].value.summary || buildCustomerReportSummary(results[1].value.reports || []))
        setPlanItems(results[1].value.plans || [])
      }
      if (results[2].status === 'fulfilled' && results[2].value.progress && results[0].status === 'fulfilled' && results[0].value.order) {
        setOrderProgress(results[2].value.progress[results[0].value.order.id] || null)
      }
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitFeedback(kind: 'rating' | 'issue') {
    setIsSubmitting(true)
    setNotice(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const isReportMode = isReportFeedbackMode && !!activeFeedbackReport?.id
      const response = await fetch(isReportMode ? `/api/customer/reports/${activeFeedbackReport?.id}/feedback` : `/api/customer/orders/${orderId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify({
          action: kind, rating: kind === 'rating' ? rating : null,
          comment_message: kind === 'rating' ? ratingComment.trim() : null,
          issue_message: kind === 'issue' ? issueMessage.trim() : null,
        }),
      })

      if (response.ok) {
        const payload = await response.json().catch(() => ({}))
        setNotice({ type: 'success', message: copy.feedbackSuccess })
        if (kind === 'rating') setRatingComment('')
        if (kind === 'issue') setIssueMessage('')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        const payload = await response.json().catch(() => ({}))
        if (response.status === 409) setNotice({ type: 'error', message: copy.feedbackLocked })
        else setNotice({ type: 'error', message: copy.feedbackError })
      }
    } catch {
      setNotice({ type: 'error', message: copy.feedbackError })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || loading) return <XYLLoader tagline={copy.loading} />
  if (!order) return <div className="p-20 text-center sans-font text-xs uppercase font-bold text-[#A3A3A3]">Data context mismatch.</div>

  return (
    <div className="min-h-screen bg-[#F0EFEB] text-[#111111] overflow-x-hidden selection:bg-[#111111] selection:text-white pb-32">
      
      {/* Editorial App Header */}
      <header className="px-5 pt-10 pb-4 flex items-center justify-between sticky top-0 bg-[#F9F8F4] border-b border-[#111111] shadow-[0_4px_0_0_rgba(17,17,17,1)] z-50">
        <Link href="/dashboard/customer" className="w-10 h-10 flex items-center justify-center rounded-none bg-white border border-[#111111] shadow-[2px_2px_0_0_rgba(17,17,17,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
            <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div className="text-center">
          <span className="sans-font text-[10px] font-black uppercase tracking-[0.2em] text-[#111111] block mb-0.5">{copy.logKicker}</span>
          <span className="font-serif-thai text-sm text-[#111111]">#{order.order_code || order.id.slice(0,8)}</span>
        </div>
        <button onClick={() => window.location.reload()} className="w-10 h-10 flex items-center justify-center rounded-none bg-white border border-[#111111] shadow-[2px_2px_0_0_rgba(17,17,17,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
            <Activity size={18} strokeWidth={2} />
        </button>
      </header>

      <main className="max-w-[500px] mx-auto px-5 pt-8 space-y-6">
        
        {/* Title Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-4"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white border border-[#111111] shadow-[4px_4px_0_0_rgba(17,17,17,1)] mb-4">
            <Leaf className="text-[#111111]" size={20} strokeWidth={1.5} />
          </div>
          <h1 className="font-serif-thai text-4xl font-normal text-[#111111] leading-tight mb-2">
            {copy.trackingTitle}
          </h1>
          <p className="sans-font text-[11px] font-bold uppercase tracking-[0.1em] text-[#A45A2A]">{copy.summary}</p>
        </motion.div>

        {/* Info Grid */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#111111] p-4 flex flex-col justify-center">
            <span className="sans-font text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 mb-1 flex items-center gap-1.5">
              <Activity size={12} /> {copy.orderCode}
            </span>
            <p className="font-serif-thai text-lg text-[#111111]">#{order.order_code || 'N/A'}</p>
          </div>
          <div className="bg-white border border-[#111111] p-4 flex flex-col justify-center">
            <span className="sans-font text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 mb-1 flex items-center gap-1.5">
              <Calendar size={12} /> {copy.date}
            </span>
            <p className="font-serif-thai text-lg text-[#111111]">
              {order.created_at ? new Date(order.created_at).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US') : 'N/A'}
            </p>
          </div>
        </motion.div>

        {/* Status Card (Sharp Theme) */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-[#111111] text-white border border-[#111111] shadow-[6px_6px_0_0_rgba(175,144,122,1)] p-6 relative overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 blur-2xl rounded-full"></div>
          
          <span className="sans-font text-[10px] font-bold uppercase tracking-widest text-[#AF907A] mb-4 flex items-center gap-2">
            <Sparkles size={12} /> {copy.status}
          </span>
          
          <div className="relative z-10 mb-6">
            <span className="inline-block px-3 py-1 bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-widest mb-3 text-white">
              {order.status || 'unknown'}
            </span>
            <h2 className="font-serif-thai text-3xl font-normal leading-snug">
               {serviceFlow.headline}
            </h2>
            <p className="mt-2 text-sm text-white/70 leading-relaxed">
              {serviceFlow.detail}
            </p>
          </div>

          {serviceFlow.stage !== 'pending' && serviceFlow.stage !== 'cancelled' && (
            <div className="border-t border-white/20 pt-5 mb-5">
              <p className="sans-font text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">{serviceFlow.stage === 'scheduled' ? copy.staffAssigned : 'ผู้รับผิดชอบ'}</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#AF907A] flex items-center justify-center text-[#111111]">
                  <CheckCircle size={14} strokeWidth={2.5} />
                </div>
                <p className="font-serif-thai text-lg uppercase">{serviceFlow.staffLine}</p>
              </div>
            </div>
          )}

          {/* Progress Line */}
          <div className="flex gap-1.5 mt-2">
             {['verified', 'scheduled', 'in_progress', 'completed'].map((s) => {
               const stages = ['verified', 'scheduled', 'in_progress', 'completed']
               const currentIdx = stages.indexOf(serviceFlow.stage || 'verified')
               const thisIdx = stages.indexOf(s)
               const isPast = thisIdx <= currentIdx
               return (
                  <div key={s} className="flex-1">
                    <div className={`h-1.5 w-full ${isPast ? 'bg-[#AF907A]' : 'bg-white/10'}`}></div>
                  </div>
               )
             })}
          </div>
        </motion.div>

        {/* Plans */}
        {currentOrderPlanItems.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white border border-[#111111] p-5">
            <div className="flex justify-between items-center mb-4">
              <span className="sans-font text-[10px] font-bold uppercase tracking-widest text-[#111111] flex items-center gap-2">
                <CloudSun size={14} /> {copy.annualPlan}
              </span>
              <h2 className="font-serif-thai text-2xl text-[#111111]">
                {reportSummary.completedPlannedReports}/{reportSummary.plannedReports}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F9F8F4] border border-[#111111] p-3 text-center shadow-[2px_2px_0_0_rgba(17,17,17,1)]">
                <p className="sans-font text-[9px] font-bold uppercase tracking-widest text-[#111111]/60">{copy.visitProgress}</p>
                <p className="mt-1 text-xl font-serif-thai text-[#111111]">{reportSummary.completedPlannedReports}</p>
              </div>
              <div className="bg-[#111111] border border-[#111111] p-3 text-center shadow-[2px_2px_0_0_rgba(175,144,122,1)]">
                <p className="sans-font text-[9px] font-bold uppercase tracking-widest text-white/60">{copy.visitRemaining}</p>
                <p className="mt-1 text-xl font-serif-thai text-[#AF907A]">{reportSummary.pendingPlannedReports}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Feedback Section */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-white border border-[#111111] p-6 shadow-[4px_4px_0_0_rgba(17,17,17,1)]">
          <span className="sans-font text-[10px] font-bold uppercase tracking-widest text-[#A45A2A] mb-3 flex items-center gap-2">
            <Star size={14} /> {copy.feedbackSection}
          </span>
          <h2 className="font-serif-thai text-2xl text-[#111111] mb-2">
            {activeReportRatingFeedback ? copy.visitRated : copy.reportFeedbackTitle}
          </h2>
          <p className="text-sm text-[#111111]/70 leading-relaxed mb-5">
            {activeFeedbackReport ? canOpenFeedback ? copy.feedbackSectionDesc : copy.waitingFeedback : copy.visitNoContext}
          </p>

          {activeFeedbackReport && (
            <div className="bg-[#F9F8F4] border border-[#111111] p-3 mb-5 flex justify-between items-center">
              <div>
                <p className="sans-font text-[9px] font-bold uppercase tracking-widest text-[#111111]/50">{copy.activeVisit}</p>
                <p className="text-sm font-serif-thai text-[#111111]">
                  {activeFeedbackReport.serviceName || activeFeedbackReport.houseName || activeFeedbackReport.orderCode || '-'}
                </p>
              </div>
              {activeFeedbackReport.annualVisitSequence && (
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-[#A45A2A]">Round {activeFeedbackReport.annualVisitSequence}</p>
                </div>
              )}
            </div>
          )}

          {activeReportRatingFeedback && typeof activeReportRatingFeedback.rating === 'number' ? (
            <div className="bg-[#111111] border border-[#111111] p-5 text-white">
              <p className="sans-font text-[9px] font-bold uppercase tracking-widest text-white/50 mb-3">{copy.visitRated}</p>
              <div className="flex gap-2 mb-4">
                {[1,2,3,4,5].map(v => (
                  <Star key={v} size={18} fill={activeReportRatingFeedback.rating >= v ? '#AF907A' : 'none'} strokeWidth={activeReportRatingFeedback.rating >= v ? 0 : 1} className={activeReportRatingFeedback.rating >= v ? 'text-[#AF907A]' : 'text-white/30'} />
                ))}
              </div>
              {activeReportRatingFeedback.commentMessage && (
                <div className="border-t border-white/20 pt-3 mt-3">
                  <p className="text-sm italic text-white/80">"{activeReportRatingFeedback.commentMessage}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => canOpenFeedback && activeFeedbackReport && router.replace(`/dashboard/customer/orders/${orderId}?action=rate-report&reportId=${activeFeedbackReport.id}`)}
                disabled={!canOpenFeedback || !activeFeedbackReport}
                className={`w-full py-3 text-[10px] font-bold uppercase tracking-widest border transition-all ${canOpenFeedback ? 'bg-[#111111] text-white border-[#111111] hover:bg-[#1A3626]' : 'bg-[#F0EFEB] text-[#111111]/30 border-[#EBE9E0] cursor-not-allowed'}`}
              >
                {copy.rateNow}
              </button>
              <button
                type="button"
                onClick={() => canOpenFeedback && activeFeedbackReport && router.replace(`/dashboard/customer/orders/${orderId}?action=issue-report&reportId=${activeFeedbackReport.id}`)}
                disabled={!canOpenFeedback || !activeFeedbackReport}
                className={`w-full py-3 text-[10px] font-bold uppercase tracking-widest border transition-all ${canOpenFeedback ? 'bg-white text-[#111111] border-[#111111] shadow-[2px_2px_0_0_rgba(17,17,17,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none' : 'bg-transparent border-[#EBE9E0] text-[#111111]/30 cursor-not-allowed'}`}
              >
                {copy.reportIssueNow}
              </button>
            </div>
          )}
        </motion.div>

        {/* Report Snapshot */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="bg-white border border-[#111111] p-6 shadow-[4px_4px_0_0_rgba(17,17,17,1)]">
          <span className="sans-font text-[10px] font-bold uppercase tracking-widest text-[#A45A2A] mb-3 block flex items-center gap-2">
            <MessageSquare size={14} /> {copy.reportSnapshot}
          </span>
          <h3 className="font-serif-thai text-2xl text-[#111111] mb-2">
            {latestOrderReport?.serviceName || latestOrderReport?.houseName || (order?.services?.[0]?.service_name || copy.emptyReports)}
          </h3>
          <p className="text-sm text-[#111111]/70 mb-5 leading-relaxed">
            {latestOrderReport ? getCustomerReportSummaryText(latestOrderReport) || latestOrderReport.recommendations || copy.reportSnapshotDesc : copy.emptyReports}
          </p>
          
          <div className="flex flex-col gap-3">
            <Link href="/dashboard/customer/reports" className="w-full flex items-center justify-between bg-white text-[#111111] border border-[#111111] px-5 py-3 text-[10px] font-bold uppercase tracking-widest shadow-[2px_2px_0_0_rgba(17,17,17,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none">
              {copy.openReportCenter} <ArrowRight size={14} />
            </Link>
            {latestOrderReport && (
              <Link href={latestReportCenterHref} className="w-full flex items-center justify-between bg-[#111111] text-white border border-[#111111] px-5 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#1A3626] transition-colors">
                {copy.openLatestReport} <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </motion.div>
      </main>

      {/* Feedback Modal */}
      <AnimatePresence>
        {(actionMode === 'rate' || actionMode === 'issue' || actionMode === 'rate-report' || actionMode === 'issue-report') && (
           <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#111111]/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-[400px] bg-white border border-[#111111] shadow-[8px_8px_0_0_rgba(17,17,17,1)] flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <div className="w-10 h-10 bg-[#111111] flex items-center justify-center text-white">
                    {actionMode.includes('rate') ? <Star size={18} /> : <AlertCircle size={18} />}
                  </div>
                  <button onClick={() => router.replace(`/dashboard/customer/orders/${orderId}`)} className="w-10 h-10 bg-[#F9F8F4] border border-[#111111] hover:bg-[#EBE9E0] flex items-center justify-center text-[#111111]">
                    <X size={18} />
                  </button>
                </div>

                <h2 className="font-serif-thai text-3xl font-normal text-[#111111] mb-6">{copy.feedbackTitle}.</h2>

                {notice && (
                  <div className={`p-4 mb-6 border border-[#111111] flex items-start gap-3 ${notice.type === 'success' ? 'bg-[#AF907A] text-[#111111]' : 'bg-red-50 text-red-800'}`}>
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span className="sans-font text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                      {notice.message}
                    </span>
                  </div>
                )}

                {(actionMode === 'rate-report' || actionMode === 'rate') && !notice && ((isReportFeedbackMode ? activeReportRatingFeedback : existingRatingFeedback) && typeof (isReportFeedbackMode ? activeReportRatingFeedback?.rating : existingRatingFeedback?.rating) === 'number') && (
                  <div className="space-y-6">
                    <div>
                      <p className="sans-font text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 mb-1">{copy.yourRating}</p>
                      <h3 className="font-serif-thai text-2xl text-[#111111]">{isReportFeedbackMode ? copy.visitRated : copy.feedbackAlreadySubmitted}</h3>
                    </div>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(v => (
                        <div key={v} className={`flex-1 aspect-square border flex items-center justify-center ${((isReportFeedbackMode ? activeReportRatingFeedback?.rating : existingRatingFeedback?.rating) || 0) >= v ? 'bg-[#111111] text-[#AF907A] border-[#111111]' : 'bg-[#F9F8F4] border-[#EBE9E0] text-[#111111]/20'}`}>
                          <Star size={20} fill={(((isReportFeedbackMode ? activeReportRatingFeedback?.rating : existingRatingFeedback?.rating) || 0) >= v) ? 'currentColor' : 'none'} strokeWidth={0} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form Elements Here... */}
                {((!notice && actionMode.includes('rate') && !((isReportFeedbackMode ? activeReportRatingFeedback : existingRatingFeedback) && typeof (isReportFeedbackMode ? activeReportRatingFeedback?.rating : existingRatingFeedback?.rating) === 'number'))) && (
                  <form onSubmit={(e) => { e.preventDefault(); handleSubmitFeedback('rating'); }} className="space-y-6">
                    <div>
                      <p className="sans-font text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 mb-3">{copy.rateTitle}</p>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(v => (
                          <button type="button" key={v} onClick={() => setRating(v)} className={`flex-1 aspect-square border flex items-center justify-center transition-all ${rating >= v ? 'bg-[#111111] text-[#AF907A] border-[#111111] shadow-[2px_2px_0_0_rgba(175,144,122,1)]' : 'bg-white border-[#111111] text-[#111111]/20 hover:bg-[#F9F8F4]'}`}>
                            <Star size={20} fill={rating >= v ? 'currentColor' : 'none'} strokeWidth={rating >= v ? 0 : 1.5} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="sans-font text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 mb-2 block">{copy.ratingCommentTitle}</label>
                      <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder={copy.ratingCommentPlaceholder} rows={3} className="w-full bg-white border border-[#111111] p-4 text-sm font-serif-thai focus:outline-none focus:shadow-[2px_2px_0_0_rgba(17,17,17,1)] resize-none" />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-[#111111] text-white py-4 font-bold uppercase tracking-widest text-[11px] hover:bg-[#1A3626] transition-colors disabled:opacity-50">
                      {isSubmitting ? '...' : copy.send}
                    </button>
                  </form>
                )}

                {((!notice && actionMode.includes('issue'))) && (
                  <form onSubmit={(e) => { e.preventDefault(); handleSubmitFeedback('issue'); }} className="space-y-6">
                    <div>
                      <label className="sans-font text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 mb-2 block">{copy.issueTitle}</label>
                      <textarea value={issueMessage} onChange={e => setIssueMessage(e.target.value)} required placeholder="เล่าปัญหาที่คุณพบ..." rows={4} className="w-full bg-white border border-[#111111] p-4 text-sm font-serif-thai focus:outline-none focus:shadow-[2px_2px_0_0_rgba(17,17,17,1)] resize-none" />
                    </div>
                    <button type="submit" disabled={isSubmitting || !issueMessage.trim()} className="w-full bg-[#111111] text-white py-4 font-bold uppercase tracking-widest text-[11px] hover:bg-[#1A3626] transition-colors disabled:opacity-50">
                      {isSubmitting ? '...' : copy.send}
                    </button>
                  </form>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Page({ params }: { params: { orderId: string } }) {
  return (
    <Suspense fallback={<XYLLoader tagline="Loading..." />}>
      <OrderDetailContent orderId={params.orderId} />
    </Suspense>
  )
}
