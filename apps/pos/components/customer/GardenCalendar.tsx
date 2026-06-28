'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, ArrowRight, X, Sparkles, Loader2, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { isSameMonth } from 'date-fns'
import { formatDateByLocale } from '@/lib/localeFormat'
import { useI18n } from "@/lib/I18nContext";

interface GardenCalendarProps {
  orders: any[]
  reports?: any[]
  locale: 'th' | 'en' | 'zh'
  autoOpenOrderId?: string | null
  autoFocusCalendar?: boolean
  autoStartReschedule?: boolean
  onRefresh?: () => Promise<void>
  onOpenReport?: (reportId: string) => void
  showHouseName?: boolean
}

type Slot = {
  id: string
  date: string
  start_time: string
  end_time: string
}

type CalendarDay = {
  day: number | null
  date?: Date
  dateKey?: string
  isToday?: boolean
  hasService?: boolean
  hasUpcoming?: boolean
  hasPast?: boolean
  isSelectableForReschedule?: boolean
  isCurrentAppointmentDate?: boolean
  isSuggestedForReschedule?: boolean
  isSelectedForReschedule?: boolean
  events?: any[]
}


const TRANSLATIONS: Record<string, any> = {
  th: {
    weekDays: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
    swipe: 'เลื่อน',
    upcoming: 'กำลังจะมาถึง',
    history: 'ประวัติ',
    summaryFor: 'ภาพรวมของเดือน',
    summaryTitle: 'แผนการดูแลเดือนนี้',
    noActivities: 'ไม่มีกิจกรรมในเดือนนี้',
    upcomingVisit: 'คิวงานถัดไป',
    pastService: 'งานที่เสร็จสิ้น',
    details: 'รายละเอียด',
    report: 'ดูรายงาน',
    reschedule: 'เลื่อนนัด',
    noAppointmentsDay: 'ยังไม่มีรายการนัดหมายในวันที่เลือก',
    supportCare: 'Support & Care',
    supportDesc: 'หากมีข้อสงสัยเกี่ยวกับงานบริการหรือต้องการแจ้งปัญหาหน้างานเพิ่มเติม สามารถติดต่อสถาปนิกผ่าน Line OA ของสตูดิโอได้ตลอดเวลาครับ',
    rescheduling: 'กำลังเลื่อนนัดหมาย',
    selectNewDate: 'เลือกวันที่ใหม่บนปฏิทิน',
    datePlaceholder: 'กรุณาแตะเลือกวันที่ต้องการบนปฏิทิน',
    reason: 'เหตุผลในการเลื่อน',
    notes: 'หมายเหตุเพิ่มเติม',
    notesPlaceholder: 'เช่น ฝากกุญแจไว้ที่นิติ...',
    confirmReschedule: 'ยืนยันการเลื่อนนัด',
    cancel: 'ยกเลิก',
    systemUpdated: 'อัปเดตระบบแล้ว',
    everythingSet: 'ทุกอย่างพร้อมสำหรับรอบถัดไป',
    rescheduleReasons: [
      'ไม่สะดวกอยู่บ้านตามเวลานัด',
      'ขอเปลี่ยนเป็นช่วงเวลาที่สะดวกกว่า',
      'มีธุระเร่งด่วน',
      'สภาพอากาศไม่เหมาะกับงาน',
    ]
  },
  en: {
    weekDays: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    swipe: 'SWIPE',
    upcoming: 'Upcoming',
    history: 'History',
    summaryFor: 'SUMMARY FOR',
    summaryTitle: 'Monthly Care Plan',
    noActivities: 'No activities recorded for this month',
    upcomingVisit: 'Upcoming Visit',
    pastService: 'Past Service',
    details: 'Details',
    report: 'Report',
    reschedule: 'Reschedule',
    noAppointmentsDay: 'No appointments on the selected date',
    supportCare: 'Support & Care',
    supportDesc: 'If you have any questions about our services or need to report any issues, you can contact our architects via Line OA at any time.',
    rescheduling: 'Rescheduling Appointment',
    selectNewDate: 'Select a new date on the calendar',
    datePlaceholder: 'Please tap a new date on the calendar',
    reason: 'Reason for rescheduling',
    notes: 'Additional Notes',
    notesPlaceholder: 'e.g. Leave keys at the office...',
    confirmReschedule: 'Confirm Reschedule',
    cancel: 'Cancel',
    systemUpdated: 'System Updated',
    everythingSet: 'Everything is set for your next visit',
    rescheduleReasons: [
      'Not available at home at the scheduled time',
      'Would like to change to a more convenient time',
      'Urgent matters',
      'Weather conditions are not suitable',
    ]
  },
  zh: {
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    swipe: '滑动',
    upcoming: '即将到来',
    history: '历史',
    summaryFor: '总结',
    summaryTitle: '本月护理计划',
    noActivities: '本月没有记录活动',
    upcomingVisit: '下次访问',
    pastService: '过往服务',
    details: '详情',
    report: '报告',
    reschedule: '重新安排',
    noAppointmentsDay: '所选日期没有预约',
    supportCare: '支持与护理',
    supportDesc: '如果您对我们的服务有任何疑问或需要报告任何问题，可以随时通过Line OA联系我们的建筑师。',
    rescheduling: '重新安排预约',
    selectNewDate: '在日历上选择一个新日期',
    datePlaceholder: '请点击日历上的新日期',
    reason: '重新安排的原因',
    notes: '附加说明',
    notesPlaceholder: '例如将钥匙留在办公室...',
    confirmReschedule: '确认重新安排',
    cancel: '取消',
    systemUpdated: '系统已更新',
    everythingSet: '下次访问的一切都准备好了',
    rescheduleReasons: [
      '在预定时间不方便在家',
      '想改一个更方便的时间',
      '有紧急事务',
      '天气条件不适合',
    ]
  }
}


const pad = (value: number) => String(value).padStart(2, '0')

const toLocalDateKey = (value: Date) => `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return new Date(value)
  return new Date(year, month - 1, day, 12, 0, 0)
}

const LuxurySuccessAnimation = ({ message, t }: { message: string, t: any }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] flex items-center justify-center bg-white/90 backdrop-blur-md"
  >
    <div className="flex flex-col items-center gap-8 text-center px-12">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="relative h-24 w-24 flex items-center justify-center"
      >
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-[var(--customer-accent)]/5"
        />
        <div className="h-16 w-16 rounded-full bg-[var(--customer-accent)] flex items-center justify-center text-white shadow-xl">
          <Check size={32} strokeWidth={3} />
        </div>
      </motion.div>
      <div className="space-y-3">
        <h3 className="text-3xl font-light italic tracking-tight text-[var(--customer-ink)]" style={{ fontFamily: 'var(--customer-font-serif)' }}>
          {message}
        </h3>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--customer-muted)]">
          {t.everythingSet}
        </p>
      </div>
    </div>
  </motion.div>
)

const GardenCalendar: React.FC<GardenCalendarProps> = ({ orders, reports = [], locale, autoOpenOrderId = null, autoFocusCalendar = false, autoStartReschedule = false, onRefresh, onOpenReport, showHouseName = false }) => {
      const router = useRouter()
  const t = TRANSLATIONS[locale] || TRANSLATIONS['en']
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const calendarRef = useRef<HTMLDivElement | null>(null)
  const [rescheduleOrderId, setRescheduleOrderId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState<string>('')
  const [reason, setReason] = useState(t.rescheduleReasons[0])
  const [notes, setNotes] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasAutoOpened, setHasAutoOpened] = useState(false)

  const eventsByDate = useMemo(() => {
    const events: Record<string, any[]> = {}
    
    reports.forEach(report => {
      const dateVal = report.orderScheduledDate || report.createdAt || report.created_at
      if (dateVal) {
        const dateKey = toLocalDateKey(new Date(dateVal))
        if (!events[dateKey]) events[dateKey] = []
        events[dateKey].push({ ...report, type: 'past' })
      }
    })

    orders.forEach(order => {
      if (order.scheduled_date && !['completed', 'cancelled', 'in_service'].includes(order.status)) {
        const dateKey = order.scheduled_date
        if (!events[dateKey]) events[dateKey] = []
        const exists = events[dateKey].some(e => e.type === 'past' && e.service_id === order.service_id)
        if (!exists) {
          events[dateKey].push({ ...order, type: 'upcoming' })
        }
      }
    })
    
    return events
  }, [orders, reports])

  const todayKey = toLocalDateKey(new Date())
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minimumRescheduleDateKey = toLocalDateKey(tomorrow)

  const activeRescheduleOrder = useMemo(
    () => orders.find((order) => order.id === rescheduleOrderId) || null,
    [orders, rescheduleOrderId],
  )
  const activeOrderDateKey = activeRescheduleOrder?.scheduled_date || null

  const daysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const days = new Date(year, month + 1, 0).getDate()
    
    const result = []
    for (let i = 0; i < firstDay; i++) result.push({ day: null })
    for (let i = 1; i <= days; i++) {
      const d = new Date(year, month, i)
      const dateKey = toLocalDateKey(d)
      const dayEvents = eventsByDate[dateKey] || []
      result.push({
        day: i,
        date: d,
        dateKey,
        isToday: todayKey === dateKey,
        hasService: dayEvents.length > 0,
        hasUpcoming: dayEvents.some(e => e.type === 'upcoming'),
        hasPast: dayEvents.some(e => e.type === 'past'),
        isSelectableForReschedule: Boolean(activeRescheduleOrder) && dateKey >= minimumRescheduleDateKey,
        isCurrentAppointmentDate: activeOrderDateKey === dateKey,
        isSuggestedForReschedule: Boolean(activeRescheduleOrder) && dateKey > (activeOrderDateKey || '') && dayEvents.length === 0,
        isSelectedForReschedule: rescheduleDate === dateKey,
        events: dayEvents
      })
    }
    return result
  }

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1))
    setSelectedDay(null)
  }

  const currentYear = currentMonth.getFullYear()
  const currentMonthIdx = currentMonth.getMonth()
  const calendarDays = daysInMonth(currentMonth)
  const monthName = useMemo(() => {
    try {
      return currentMonth.toLocaleDateString(
        locale === 'th' ? 'th-TH' : (locale === 'zh' ? 'zh-CN' : 'en-US'), 
        { month: 'long', year: 'numeric' }
      )
    } catch (e) {
      return 'Calendar'
    }
  }, [currentMonth, locale])

  const startReschedule = (event: any) => {
    setRescheduleOrderId(event.id)
    setRescheduleDate('')
    setReason(t.rescheduleReasons[0])
    setNotes('')
    setSaveError('')
    if (!saveSuccess) setSaveSuccess('')
    setSelectedDay(null)
  }

  const closeReschedule = (clearFeedback = true) => {
    setRescheduleOrderId(null)
    setRescheduleDate('')
    setSlots([])
    setSelectedSlotId('')
    setSaveError('')
    if (clearFeedback) {
      setSaveSuccess('')
    }
    setSaving(false)
  }

  const selectCalendarDay = (day: CalendarDay) => {
    if (!day.day) return
    if (activeRescheduleOrder && day.dateKey) {
      const d = day.date!
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const tomorrow = new Date(now)
      tomorrow.setDate(now.getDate() + 1)
      if (d < now) {
        setSaveError('ไม่สามารถเลือกวันย้อนหลังได้ครับ')
        return
      }
      if (d <= tomorrow) {
        setSaveError('กรุณาเลือกวันถัดไป (ต้องแจ้งล่วงหน้าอย่างน้อย 24 ชม.)')
        return
      }
      if (!day.isSelectableForReschedule) {
        setSaveError('ขออภัย ไม่สามารถเลือกวันดังกล่าวได้')
        return
      }
      setRescheduleDate(day.dateKey)
      setSaveError('')
      setSaveSuccess('')
      setSelectedDay(day)
      return
    }
    if (!activeRescheduleOrder && day.events?.length) {
      const upcomingEvent = day.events.find((event) => event.type === 'upcoming')
      if (upcomingEvent) {
        setSelectedDay(day)
        return
      }
    }
    setSelectedDay(day)
  }

  const formatWindow = (start?: string | null, end?: string | null) => {
    if (!start || !end) return 'ระบบจะจัดทีมตามคิวในวันดังกล่าว'
    return `${start.slice(0, 5)} - ${end.slice(0, 5)} น.`
  }

  useEffect(() => {
    if (!autoOpenOrderId || hasAutoOpened) return
    const targetOrder = orders.find((order) => order.id === autoOpenOrderId && order.scheduled_date)
    if (!targetOrder?.scheduled_date) return
    const targetDate = parseDateKey(targetOrder.scheduled_date)
    const targetDateKey = targetOrder.scheduled_date
    const targetEvents = eventsByDate[targetDateKey] || []
    if (!targetEvents.length) return
    setCurrentMonth(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1))
    setSelectedDay({
      day: targetDate.getDate(),
      date: targetDate,
      dateKey: targetDateKey,
      isToday: todayKey === targetDateKey,
      hasService: true,
      hasUpcoming: targetEvents.some((event) => event.type === 'upcoming'),
      hasPast: targetEvents.some((event) => event.type === 'past'),
      events: targetEvents,
    })
    if (autoFocusCalendar) {
      requestAnimationFrame(() => {
        calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
    if (autoStartReschedule) {
      const targetEvent = targetEvents.find((event) => event.id === autoOpenOrderId && event.type === 'upcoming')
      if (targetEvent) {
        startReschedule(targetEvent)
      }
    }
    setHasAutoOpened(true)
  }, [autoFocusCalendar, autoOpenOrderId, autoStartReschedule, eventsByDate, orders, todayKey, hasAutoOpened])

  const submitReschedule = async () => {
    if (!activeRescheduleOrder || !rescheduleDate) return
    setSaving(true)
    setSaveError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/customer/orders/${activeRescheduleOrder.id}/reschedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          scheduled_date: rescheduleDate,
          reason,
          notes,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'ไม่สามารถเลื่อนนัดได้ในขณะนี้')
      
      const dateText = formatDateByLocale(rescheduleDate, locale)
      setSaveSuccess(locale === 'th' 
        ? `เลื่อนนัดหมายเป็นวันที่ ${dateText} เรียบร้อยแล้ว` 
        : `Rescheduled to ${dateText} successfully`)
      
      setTimeout(async () => {
        if (onRefresh) await onRefresh()
      }, 500)

      setTimeout(() => {
        setSelectedDay(null)
        setRescheduleOrderId(null)
        setRescheduleDate('')
        setSlots([])
        setSelectedSlotId('')
        setSaving(false)
        setSaveSuccess('')
      }, 2500)
    } catch (error: any) {
      setSaveError(error?.message || 'ไม่สามารถเลื่อนนัดได้ในขณะนี้')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={calendarRef} className="mb-16 overflow-hidden border border-[var(--customer-line)] bg-white shadow-[0_30px_80px_-20px_rgba(26,54,38,0.1)] transition-all duration-700">
      <AnimatePresence>
        {saveSuccess && <LuxurySuccessAnimation message={saveSuccess} t={t} />}
      </AnimatePresence>
      <div className="relative">
        <div className="bg-[#FDFDFB] p-5 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-[1.5px] bg-[var(--customer-accent)]" />
              <h3 className="text-lg md:text-2xl font-light italic tracking-tight text-[var(--customer-ink)]" style={{ fontFamily: 'var(--customer-font-serif)' }}>
                {monthName}
              </h3>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.2em] text-[var(--customer-muted)] opacity-30 select-none">
                 <ChevronLeft size={10} />
                 {t.swipe}
                 <ChevronRight size={10} />
               </div>
               <div className="h-4 w-px bg-[var(--customer-line)] mx-1" />
               <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-black/5 rounded-full"><ChevronLeft size={16} /></button>
               <button onClick={() => changeMonth(1)} className="p-1 hover:bg-black/5 rounded-full"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-7 border-b border-[var(--customer-line)] pb-2">
            {t.weekDays.map(day => (
              <span key={day} className="text-center text-[9px] font-bold tracking-[0.2em] text-[var(--customer-muted)] opacity-40">{day}</span>
            ))}
          </div>
          
          <motion.div 
            key={`${currentYear}-${currentMonthIdx}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x > 50) changeMonth(-1)
              else if (info.offset.x < -50) changeMonth(1)
            }}
            className="grid grid-cols-7 gap-1 md:gap-2"
          >
            {calendarDays.map((d, idx) => (
              <div 
                key={idx} 
                onClick={() => selectCalendarDay(d)}
                className={`relative aspect-square border transition-all duration-300 ${
                  d.day ? 'cursor-pointer' : 'pointer-events-none opacity-0'
                } ${
                  activeRescheduleOrder && d.day && !d.isSelectableForReschedule ? 'opacity-20' : ''
                } ${
                  selectedDay?.dateKey === d.dateKey
                    ? 'border-[var(--customer-accent)] bg-[var(--customer-accent)] text-white z-10'
                    : d.isSelectedForReschedule
                      ? 'border-[var(--customer-accent)] bg-[var(--customer-accent)]/10'
                      : d.isCurrentAppointmentDate
                        ? 'border-amber-400 bg-amber-50'
                        : d.hasUpcoming
                          ? 'border-emerald-100 bg-emerald-50/30'
                          : d.hasPast
                            ? 'border-gray-200 bg-gray-50'
                            : 'border-[#F3F3EF]'
                }`}
              >
                {d.day && (
                  <div className="flex h-full flex-col items-center justify-center">
                    <span className={`text-[14px] md:text-[16px] ${
                      selectedDay?.dateKey === d.dateKey ? 'font-black' : d.isToday ? 'font-bold text-[var(--customer-accent)]' : 'font-light'
                    }`}>
                      {d.day}
                    </span>
                    {d.hasService && !selectedDay?.dateKey === d.dateKey && (
                      <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
                        {d.hasPast && <div className="h-1 w-1 rounded-full bg-gray-400" />}
                        {d.hasUpcoming && <div className="h-1 w-1 rounded-full bg-emerald-500 shadow-sm" />}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </motion.div>

          <div className="mt-8 flex flex-wrap gap-6 border-t border-[var(--customer-line)] pt-4 opacity-60">
             <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--customer-muted)]">{t.upcoming}</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--customer-muted)]">{t.history}</span>
             </div>
          </div>

          <AnimatePresence mode="wait">
            {!selectedDay && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-12 space-y-6"
              >
                <div className="flex items-center justify-between border-b border-[var(--customer-line)] pb-4">
                  <div>
                    <h4 className="font-serif-thai text-xl font-light italic text-[var(--customer-ink)]">{t.summaryTitle}</h4>
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[var(--customer-muted)] opacity-50">{t.summaryFor} {monthName}</p>
                  </div>
                  <div className="flex gap-8">
                    <div className="text-center">
                      <span className="block text-xl font-serif-thai text-emerald-600">
                        {Object.values(eventsByDate).flat().filter(e => e.type === 'upcoming' && isSameMonth(parseDateKey(e.scheduled_date || ''), currentMonth)).length}
                      </span>
                      <span className="text-[7px] font-bold uppercase tracking-widest text-[var(--customer-muted)]">{t.upcoming}</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-xl font-serif-thai text-gray-400">
                        {Object.values(eventsByDate).flat().filter(e => e.type === 'past' && isSameMonth(new Date(e.createdAt || e.created_at), currentMonth)).length}
                      </span>
                      <span className="text-[7px] font-bold uppercase tracking-widest text-[var(--customer-muted)]">Completed</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {(() => {
                    const monthUpcoming = Object.values(eventsByDate).flat()
                      .filter(e => e.type === 'upcoming' && isSameMonth(parseDateKey(e.scheduled_date || ''), currentMonth))
                      .sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || ''))

                    const monthPast = Object.values(eventsByDate).flat()
                      .filter(e => e.type === 'past' && isSameMonth(new Date(e.createdAt || e.created_at), currentMonth))
                      .sort((a, b) => (b.createdAt || b.created_at || '').localeCompare(a.createdAt || a.created_at || ''))

                    if (monthUpcoming.length === 0 && monthPast.length === 0) {
                      return (
                        <div className="py-12 text-center border border-dashed border-[var(--customer-line)]">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--customer-muted)] opacity-40">{t.noActivities}</p>
                        </div>
                      )
                    }

                    return (
                      <>
                        {monthUpcoming.map((event, i) => (
                          <div 
                            key={`up-${i}`}
                            onClick={() => {
                              const d = parseDateKey(event.scheduled_date)
                              setSelectedDay({
                                day: d.getDate(),
                                date: d,
                                dateKey: event.scheduled_date,
                                events: eventsByDate[event.scheduled_date] || []
                              })
                            }}
                            className="group relative flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm border border-transparent hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-400 scale-y-50 group-hover:scale-y-100 transition-transform origin-center" />
                            <div className="flex items-center gap-5">
                              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <CalendarIcon size={20} strokeWidth={1.5} />
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1.5">{t.upcomingVisit} • {formatDateByLocale(event.scheduled_date, locale)}</p>
                                <h5 className="text-[15px] font-bold text-[var(--customer-ink)]">
                                  {showHouseName && (event.houses?.name || event.house_name) ? `${event.houses?.name || event.house_name} - ` : ''}
                                  {event.service_name || 'Garden Maintenance'}
                                </h5>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{t.details}</span>
                              <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                <ChevronRight size={14} className="text-emerald-600" />
                              </div>
                            </div>
                          </div>
                        ))}

                        {monthPast.map((report, i) => (
                          <div 
                            key={`past-${i}`}
                            onClick={() => {
                              const d = new Date(report.createdAt || report.created_at)
                              const key = toLocalDateKey(d)
                              setSelectedDay({
                                day: d.getDate(),
                                date: d,
                                dateKey: key,
                                events: eventsByDate[key] || []
                              })
                            }}
                            className="group flex items-center justify-between bg-white p-5 border border-[var(--customer-line)] hover:border-[var(--customer-accent)] transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 bg-gray-50 flex items-center justify-center text-gray-300">
                                <CheckCircle2 size={16} strokeWidth={1.5} />
                              </div>
                                <div>
                                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{t.pastService} • {formatDateByLocale(report.createdAt || report.created_at, locale)}</p>
                                  <h5 className="text-[13px] font-bold text-[var(--customer-muted)]">
                                    {showHouseName && (report.houseName || report.houses?.name) ? `${report.houseName || report.houses?.name} - ` : ''}
                                    {report.serviceName || 'Garden Service'}
                                  </h5>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                              <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--customer-muted)]">Report</span>
                              <ChevronRight size={14} className="text-[var(--customer-muted)]" />
                            </div>
                          </div>
                        ))}
                      </>
                    )
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {selectedDay && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedDay(null)}
                className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm lg:hidden"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-[110] max-h-[85vh] bg-white shadow-[0_-20px_40px_rgba(0,0,0,0.1)] lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:left-auto lg:w-[400px] lg:translate-y-0 lg:border-l lg:border-[var(--customer-line)]"
              >
                <div className="flex h-1.5 w-full items-center justify-center pt-3 lg:hidden">
                   <div className="h-1 w-12 rounded-full bg-gray-200" />
                </div>
                <div className="flex h-full flex-col overflow-hidden">
                   <div className="flex items-center justify-between border-b border-[var(--customer-line)] p-6">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--customer-muted)]">
                          {selectedDay?.date?.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', { weekday: 'long' }) || '-'}
                        </p>
                        <h4 className="mt-1 text-2xl font-light tracking-tight text-[var(--customer-ink)]" style={{ fontFamily: 'var(--customer-font-serif)' }}>
                          {selectedDay?.date?.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'long' }) || '-'}
                        </h4>
                      </div>
                      <button onClick={() => setSelectedDay(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-black">
                        <X size={18} />
                      </button>
                   </div>
                   <div className="flex-1 overflow-y-auto p-6">
                      <AnimatePresence mode="wait">
                        {activeRescheduleOrder ? (
                          <motion.div key="reschedule-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                             <div className="bg-amber-50/50 border border-amber-100 p-6">
                                <div className="flex items-center gap-3 mb-3">
                                   <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800">{t.rescheduling}</span>
                                </div>
                                <h5 className="text-[15px] font-bold text-amber-900">{activeRescheduleOrder?.service_name || 'Garden Maintenance'}</h5>
                             </div>
                             <div className="space-y-6">
                                <div>
                                   <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--customer-muted)] mb-2 block">{t.selectNewDate}</label>
                                   <div className={`p-4 border ${rescheduleDate ? 'border-[var(--customer-accent)] bg-[var(--customer-accent)]/5' : 'border-dashed border-gray-300'} transition-all`}>
                                      <p className={`text-sm font-bold ${rescheduleDate ? 'text-[var(--customer-accent)]' : 'text-gray-400'}`}>
                                         {rescheduleDate ? formatDateByLocale(rescheduleDate, locale) : '{t.datePlaceholder}'}
                                      </p>
                                   </div>
                                </div>
                                {rescheduleDate && (
                                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                      <div>
                                         <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--customer-muted)] mb-2 block">{t.reason}</label>
                                         <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-gray-200 bg-white p-3 text-sm outline-none focus:border-[var(--customer-accent)]">
                                            {t.rescheduleReasons.map(r => <option key={r} value={r}>{r}</option>)}
                                         </select>
                                      </div>
                                      <div>
                                         <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--customer-muted)] mb-2 block">{t.notes}</label>
                                         <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="{t.notesPlaceholder}" className="w-full border border-gray-200 bg-white p-3 text-sm outline-none focus:border-[var(--customer-accent)] h-20 resize-none" />
                                      </div>
                                   </motion.div>
                                )}
                             </div>
                             <div className="pt-4">
                                {saveError && <p className="mb-4 text-xs font-bold text-red-600">{saveError}</p>}
                                <button onClick={submitReschedule} disabled={saving || !rescheduleDate} className="flex w-full items-center justify-center gap-3 bg-[var(--customer-accent)] py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white disabled:opacity-20 transition-all hover:brightness-110">
                                   {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                   {t.confirmReschedule}
                                </button>
                                <button onClick={() => closeReschedule()} className="mt-3 w-full py-3 text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">
                                   {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '                                    ยกเลิก                                 '}</button>
                             </div>
                          </motion.div>
                        ) : (
                          <motion.div key="events-step" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                             {selectedDay.events && selectedDay.events.length > 0 ? (
                               selectedDay.events.map((event: any, i: number) => (
                                 <div key={i} className="group border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-[var(--customer-accent)]/20">
                                    <div className="flex items-center justify-between mb-4">
                                       <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 ${event.type === 'upcoming' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'}`}>
                                          {event.type === 'upcoming' ? 'Upcoming Visit' : 'Past Service'}
                                       </span>
                                       {event.type === 'upcoming' && (
                                         <button onClick={() => startReschedule(event)} className="text-[10px] font-bold uppercase tracking-widest text-[var(--customer-accent)] opacity-40 hover:opacity-100 transition-opacity">
                                            Reschedule
                                         </button>
                                       )}
                                    </div>
                                    <h5 className="text-lg font-bold text-[var(--customer-ink)]">
                                      {showHouseName && (event.houseName || event.houses?.name || event.house_name) ? `${event.houseName || event.houses?.name || event.house_name} - ` : ''}
                                      {event.service_name || event.serviceName || 'Garden Maintenance'}
                                    </h5>
                                    <div className="mt-4 flex items-center gap-2 text-[12px] text-[var(--customer-muted)]">
                                       <Clock size={14} className="opacity-40" />
                                       <span>{formatWindow(event.preferred_time_start || event.start_time, event.preferred_time_end || event.end_time)}</span>
                                    </div>
                                    {event.type === 'past' && onOpenReport && (
                                       <button 
                                          onClick={(e) => {
                                             e.stopPropagation();
                                             onOpenReport(event.id || event.reportId);
                                          }} 
                                          className="mt-4 flex w-full items-center justify-center gap-2 bg-[var(--customer-ink)] py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-black transition-all"
                                       >
                                          {t.report}
                                       </button>
                                    )}
                                 </div>
                               ))
                             ) : (
                               <div className="flex flex-col items-center justify-center py-16 text-center">
                                  <div className="mb-4 h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-200">
                                     <CalendarIcon size={24} />
                                  </div>
                                  <p className="text-sm font-light text-gray-400">{t.noAppointmentsDay}</p>
                               </div>
                             )}
                             <div className="mt-12 rounded-2xl bg-[#111111] p-8 text-white shadow-2xl">
                                <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-white/30 mb-4">{t.supportCare}</p>
                                <p className="text-[12px] font-light leading-relaxed text-white/70">
                                   {t.supportDesc}
                                </p>
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {rescheduleOrderId && !rescheduleDate && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-10 left-6 right-6 z-[150] flex items-center justify-between bg-[var(--customer-ink)] p-5 text-white shadow-2xl md:left-1/2 md:right-auto md:w-96 md:-translate-x-1/2"
          >
             <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 animate-bounce items-center justify-center rounded-full bg-white/10">
                   <CalendarIcon size={16} />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest">{t.selectNewDate}</p>
             </div>
             <button 
               onClick={() => closeReschedule()}
               className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
             >
                {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '                 ยกเลิก              '}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Notification - Premium App Style */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="mx-6 w-full max-w-[280px] overflow-hidden rounded-[40px] bg-white p-10 text-center shadow-[0_40px_100px_rgba(0,0,0,0.3)]"
            >
               <motion.div 
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                 className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500"
               >
                  <CheckCircle2 size={40} strokeWidth={1.5} />
               </motion.div>
               <h6 className="text-[18px] font-bold text-[var(--customer-ink)]" style={{ fontFamily: 'var(--customer-font-serif)' }}>
                 {saveSuccess}
               </h6>
               <p className="mt-2 text-[11px] font-medium uppercase tracking-widest text-[var(--customer-muted)] opacity-60">
                 {t.systemUpdated}
               </p>
               
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: '100%' }}
                 transition={{ duration: 3 }}
                 className="absolute bottom-0 left-0 h-1 bg-emerald-500"
               />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GardenCalendar
