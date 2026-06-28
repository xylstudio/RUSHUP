"use client"

import { useI18n } from '@/lib/I18nContext'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function WorkshopsPage() {
  const { locale, setLocale } = useI18n()
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDateIdx, setSelectedDateIdx] = useState<number | null>(null)
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)


  const [calendarOpen, setCalendarOpen] = useState(false)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [bookingModalWorkshop, setBookingModalWorkshop] = useState<any>(null)
  const [calMonth, setCalMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  })
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Helper function to get display price
  const getDisplayPrice = (workshop: any) => {
    if ((workshop as any).comingSoon) {
      return '---' // Coming soon workshops
    }
    return workshop.priceBaht ? `${workshop.priceBaht} ฿` : '---'
  }

  // Lightweight shimmer placeholder for images to improve perceived loading
  const shimmer = (w: number, h: number) => `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#e5e7eb" offset="20%"/>
          <stop stop-color="#f3f4f6" offset="50%"/>
          <stop stop-color="#e5e7eb" offset="70%"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="#e5e7eb"/>
      <rect id="r" width="${w}" height="${h}" fill="url(#g)"/>
      <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1.2s" repeatCount="indefinite"  />
    </svg>`
  const blurDataURL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(shimmer(700, 475))}`

  const workshops = [
    {
      id: 'tray',
      title: locale === 'th' ? 'สวนถาด' : locale === 'en' ? 'Tray Garden' : '托盘花园',
      desc: locale === 'th' 
        ? 'เรียนรู้การจัดดอกไม้สดใหม่ในถาดเฉพาะ เหมาะสำหรับผู้ที่ชอบการออกแบบสมัยใหม่'
        : locale === 'en'
        ? 'Arrange fresh flowers in specialty trays with modern design techniques'
        : '用专业托盘中的新鲜花朵学习现代花艺',
      duration: locale === 'th' ? '2 ชั่วโมง' : locale === 'en' ? '2 hours' : '2小时',
      priceBaht: 890,
      param: 'tray',
  image: '/traygarden.PNG',
    objectPosition: 'center 30%',
    width: 3,
    height: 4,
      category: 'indoor',
      features: locale === 'th' 
        ? ['เทคนิคการจัดดอกไม้สมัยใหม่', 'ใช้วัสดุคุณภาพสูง', 'เหมาะสำหรับมือใหม่']
        : locale === 'en'
        ? ['Modern flower arrangement techniques', 'High-quality materials', 'Beginner-friendly']
        : ['现代花艺技巧', '高品质材料', '适合初学者']
    },
    {
      id: 'terrarium',
      title: locale === 'th' ? 'สวนในโหลแก้ว' : locale === 'en' ? 'Terrarium Garden' : '玻璃花园',
      desc: locale === 'th' 
        ? 'สร้างระบบนิเวศขนาดเล็กภายในภาชนะแก้ว สวยงามและง่ายต่อการดูแลในระยะยาว'
        : locale === 'en'
        ? 'Create a miniature ecosystem in a glass container. Beautiful and easy to maintain long-term'
        : '在玻璃容器中创建微型生态系统',
      duration: locale === 'th' ? '2.5 ชั่วโมง' : locale === 'en' ? '2.5 hours' : '2.5小时',
      priceBaht: 990,
      param: 'terrarium',
  image: '/terrarium.PNG',
    objectPosition: 'center 30%',
    width: 2,
    height: 3,
      category: 'outdoor',
      features: locale === 'th' 
        ? ['ระบบนิเวศในขวดแก้ว', 'ดูแลง่าย ใช้น้ำน้อย', 'เหมาะตกแต่งออฟฟิศ']
        : locale === 'en'
        ? ['Glass bottle ecosystem', 'Low maintenance, minimal water', 'Perfect for office decoration']
        : ['玻璃瓶生态系统', '低维护，少浇水', '适合办公室装饰']
    }
  ]

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Smoothly bring the opened card into view when expanding
  useEffect(() => {
    if (selectedId) {
      const el = document.getElementById(`card-${selectedId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
    // Close calendar modal whenever switching cards
    setCalendarOpen(false)
  }, [selectedId])

  // Click outside to collapse selected card (but NOT while calendar modal is open)
  // Disabled for desktop/tablet to prevent popup from closing when clicking interactive elements
  useEffect(() => {
    if (!selectedId) return
    
    // Check if we're on mobile phone (not tablet or desktop)
    const isMobilePhone = window.innerWidth < 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    if (!isMobilePhone) return // Skip for desktop and tablet
    
    const onOutside = (e: MouseEvent | TouchEvent) => {
      // If fullscreen calendar is open, ignore outside clicks (user is selecting a date)
      if (calendarOpen) return
      const cardEl = document.getElementById(`card-${selectedId}`)
      if (cardEl && !cardEl.contains(e.target as Node)) {
        setSelectedId(null)
      }
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('touchstart', onOutside)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [selectedId, calendarOpen])

  // no-op effect removed: we now jump-scroll without animation on calendar select

  // Helper to format local date as YYYY-MM-DD (avoid UTC shift)
  const toLocalIso = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // Parse YYYY-MM-DD as a local date (no timezone shift)
  const parseLocalIso = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, (m as number) - 1, d as number)
  }

  const getNextDays = (count: number) => {
    const loc = locale === 'th' ? 'th-TH' : locale === 'zh' ? 'zh-CN' : 'en-US'
    return Array.from({ length: count }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i + 1)
      return {
        key: i,
        dayNum: d.getDate(),
        dow: d.toLocaleDateString(loc, { weekday: 'short' }),
        iso: toLocalIso(d),
      }
    })
  }
  // Increase selectable future dates (e.g. next 10 days)
  const defaultDates = getNextDays(10)
  // Given an ISO date, get the week (Sun-Sat) containing that date
  const getWeekForIso = (iso: string) => {
    const loc = locale === 'th' ? 'th-TH' : locale === 'zh' ? 'zh-CN' : 'en-US'
    const base = parseLocalIso(iso)
    // Monday-first: compute start of week as Monday
    const day = base.getDay() // 0..6 Sun..Sat
    const offset = day === 0 ? 6 : day - 1
    const start = new Date(base)
    start.setDate(base.getDate() - offset)
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return {
        key: i,
        dayNum: d.getDate(),
        dow: d.toLocaleDateString(loc, { weekday: 'short' }),
        iso: toLocalIso(d),
      }
    })
  }
  const visibleDates = selectedDateIso ? getWeekForIso(selectedDateIso) : defaultDates
  // Calendar bounds: from tomorrow to +90 days (use local ISO to avoid time-of-day issues)
  const tomorrow = (() => { const d=new Date(); d.setDate(d.getDate()+1); d.setHours(0,0,0,0); return d })()
  const maxFuture = (() => { const d=new Date(); d.setDate(d.getDate()+90); d.setHours(23,59,59,999); return d })()
  const minIso = toLocalIso(tomorrow)
  const maxIso = toLocalIso(maxFuture)
  const slots = ['09:00–11:30', '14:00–16:30']

  const [product, setProduct] = useState<'all'|'tray'|'candle'|'soap'>('all')
  
  // Add coming soon workshops
  const comingSoonWorkshops = [
    {
      id: 'candle',
      title: locale === 'th' ? 'เทียนหอม' : locale === 'en' ? 'Scented Candle' : '香薰蜡烛',
      desc: locale === 'th' 
        ? 'เรียนรู้การทำเทียนหอมจากธรรมชาติ ด้วยเทคนิคสมัยใหม่'
        : locale === 'en'
        ? 'Learn to make natural scented candles with modern techniques'
        : '学习用现代技术制作天然香薰蜡烛',
      duration: locale === 'th' ? '3 ชั่วโมง' : locale === 'en' ? '3 hours' : '3小时',
      priceBaht: null,
      param: 'candle',
      image: '/workshopwelcome.jpg',
      objectPosition: 'center 40%',
      width: 3,
      height: 4,
      category: 'craft',
      comingSoon: true
    },
    {
      id: 'soap',
      title: locale === 'th' ? 'สบู่สมุนไพร' : locale === 'en' ? 'Herbal Soap' : '草本香皂',
      desc: locale === 'th' 
        ? 'สร้างสรรค์สบู่จากสมุนไพรธรรมชาติ เพื่อผิวสุขภาพดี'
        : locale === 'en'
        ? 'Create herbal soaps from natural ingredients for healthy skin'
        : '用天然草本成分制作对肌肤健康的香皂',
      duration: locale === 'th' ? '2.5 ชั่วโมง' : locale === 'en' ? '2.5 hours' : '2.5小时',
      priceBaht: null,
      param: 'soap',
      image: '/workshopwelcome.jpg',
      objectPosition: 'center 30%',
      width: 3,
      height: 4,
      category: 'craft',
      comingSoon: true
    }
  ]

  const getFilteredWorkshops = () => {
    const available = (product === 'tray' || product === 'all') ? workshops : []
    const coming = (product === 'candle' || product === 'soap' || product === 'all') ? 
      comingSoonWorkshops.filter(w => product === 'all' || w.id === product) : []
    return [...available, ...coming]
  }

  const filtered = getFilteredWorkshops()

  // Restore previous selection (topic/date/time) from booking draft so user can edit from what they had
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('workshopBookingDraft')
      if (!raw) return
      const draft = JSON.parse(raw)
      // topicKey in draft: 'tray' | 'terrarium'
      if (draft?.topicKey === 'tray' || draft?.topicKey === 'terrarium') {
        setSelectedId(draft.topicKey)
      }
      // date in ISO (YYYY-MM-DD)
      if (typeof draft?.date === 'string' && draft.date) {
        setSelectedDateIso(draft.date)
        setSelectedDateIdx(null)
      }
      // timeChoice in draft: 'morning' | 'afternoon' | ''
      if (draft?.timeChoice === 'morning') {
        setSelectedSlot('09:00–11:30')
      } else if (draft?.timeChoice === 'afternoon') {
        setSelectedSlot('14:00–16:30')
      }
    } catch {}
  }, [])

  // Persist current selection back to draft so navigating back and forth keeps choices
  useEffect(() => {
    try {
      const prev = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      const topicKey = selectedId && (selectedId === 'tray' || selectedId === 'terrarium') ? selectedId : prev.topicKey
      const date = selectedDateIso ?? (selectedDateIdx != null ? visibleDates[selectedDateIdx].iso : prev.date)
      const timeChoice = selectedSlot ? (selectedSlot.startsWith('09') ? 'morning' : selectedSlot.startsWith('14') ? 'afternoon' : prev.timeChoice) : prev.timeChoice
      const next = { ...prev, ...(topicKey ? { topicKey } : {}), ...(date ? { date } : {}), ...(timeChoice ? { timeChoice } : {}) }
      sessionStorage.setItem('workshopBookingDraft', JSON.stringify(next))
    } catch {}
  }, [selectedId, selectedDateIso, selectedDateIdx, selectedSlot, visibleDates])

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Global Fixed Top Bar Language Switcher */}
      <div className="fixed top-0 left-0 right-0 z-[200] h-14 flex items-center justify-end px-4 sm:px-6 bg-white/70 backdrop-blur-md border-b border-gray-200/60">
        <div className="flex items-center gap-2">
          {([
            { code:'th', label:'ไทย' },
            { code:'en', label:'EN' },
            { code:'zh', label:'中文' }
          ] as const).map(l => (
            <button
              key={l.code}
              onClick={() => setLocale(l.code as any)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ring-1 ${locale===l.code ? 'bg-gray-900 text-white ring-gray-900' : 'bg-white/80 text-gray-900 ring-gray-300 hover:bg-gray-100'}`}
              aria-label={`switch-language-${l.code}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Removed hero: start directly with selection like the reference */}

      {/* Workshop Selection - Premium image cards with mobile carousel */}
  <div 
        className="pt-24 pb-20 px-6 bg-white"
        onClick={(e) => {
          const target = e.target as HTMLElement
          if (!target.closest('.workshop-card') && selectedId) {
            setSelectedId(null)
          }
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="block text-xs uppercase tracking-[0.2em] text-slate-500 mb-3">
              {locale === 'th' ? 'เวิร์กช็อป' : locale === 'en' ? 'Workshops' : '工作坊'}
            </span>
            <h2 className="text-3xl md:text-5xl font-light mb-3 text-gray-900 tracking-wide" style={{ fontFamily: 'Literature, ui-serif, Georgia, Cambria, "Times New Roman", serif' }}>
              XYL STUDIO
            </h2>
            <p className="text-base md:text-lg text-gray-600 mx-auto mb-6 whitespace-nowrap overflow-hidden text-ellipsis">
              {locale === 'th' 
                ? 'เรียนรู้จากผู้เชี่ยวชาญ สำหรับทุกระดับความสามารถ'
                : locale === 'en'
                ? 'Learn from experts, suitable for all skill levels'
                : '向专家学习，适合各种技能水平'}
            </p>
            <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          </div>

          {/* Category filter chips */}
          <div className="mb-8 flex items-center gap-2 justify-center">
            {([
              {key:'all', label: locale==='th'?'ทั้งหมด':locale==='en'?'All':'全部'},
              {key:'tray', label: locale==='th'?'สวนถาด':locale==='en'?'Tray Garden':'托盘花园'},
              {key:'candle', label: locale==='th'?'เทียนหอม':locale==='en'?'Candle':'香薰蜡烛'},
              {key:'soap', label: locale==='th'?'สบู่':locale==='en'?'Soap':'香皂'}
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={()=>setProduct(tab.key as any)}
                className={`px-4 py-2 rounded-full transition ring-1 ${product===tab.key ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-900 ring-slate-200 hover:bg-slate-100'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* no top panel; show a single glass card below for candle/soap */}
          {/* Mobile: horizontal carousel */}
          <div className="md:hidden -mx-6 px-6 overflow-x-auto smooth-scroll scrollbar-hide snap-x snap-mandatory">
            <LayoutGroup>
            <div className="flex gap-4 min-w-max pb-2 pr-8">
              {filtered.map((workshop, idx) => (
                <motion.div
                  layout
                  layoutId={`workshop-card-${workshop.id}`}
                  key={workshop.id}
                  id={`card-${workshop.id}`}
                  onClick={() => {
                    // Allow clicking on coming soon cards to show preview
                    setSelectedId(prev => (prev === workshop.id ? null : workshop.id))
                  }}
                  className={`group shrink-0 snap-center cursor-pointer workshop-card`}
                  animate={{ width: selectedId===workshop.id ? 300 : 260 }}
                  transition={{ layout: { duration: 0.24, ease: [0.2,0.8,0.2,1] }, type: 'spring', stiffness: 140, damping: 22 }}
                >
                  <motion.div
                    layout
                    className={"rounded-3xl overflow-hidden bg-white text-slate-900 ring-1 ring-slate-200/70 transition-shadow"}
                    animate={{ boxShadow: selectedId===workshop.id ? '0 12px 30px rgba(15,23,42,0.18)' : '0 2px 8px rgba(15,23,42,0.06)' }}
                    transition={{ duration: 0.24, ease: [0.2,0.8,0.2,1] }}
                  >
                    <motion.div
                      layout
                      className="relative transform-gpu"
                      style={{ aspectRatio: '4 / 5' }}
                      animate={{ scale: selectedId===workshop.id ? 1.02 : 1, opacity: selectedId===workshop.id ? 1 : 0.98 }}
                      transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                    >
                      <Image
                        src={workshop.image}
                        alt={workshop.title}
                        fill
                        sizes="(max-width: 1024px) 300px, 50vw"
                        className="object-cover"
                        style={{ objectPosition: workshop.objectPosition as any }}
                        quality={85}
                        placeholder="blur"
                        blurDataURL={blurDataURL}
                        priority={idx === 0}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/15 to-transparent z-10" />
                      <div className="absolute top-4 left-4 flex items-center gap-2 text-white z-20">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/85 text-slate-900">{workshop.duration}</span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/75 text-slate-900">{locale==='th'?'มือใหม่':'Beginner'}</span>
                      </div>
                      <div className="absolute top-4 right-4 z-20">
                        <div className="px-3 py-1 rounded-full text-sm font-semibold bg-white/85 text-slate-900 shadow-sm">
                          {getDisplayPrice(workshop)}
                        </div>
                      </div>
                      {/* Coming Soon overlay */}
                      {(workshop as any).comingSoon && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
                          <div className="px-6 py-3 rounded-2xl bg-white/90 backdrop-blur-sm text-slate-900 font-medium text-lg">
                            {locale === 'th' ? 'เร็วๆ นี้' : locale === 'en' ? 'Coming Soon' : '即将推出'}
                          </div>
                        </div>
                      )}
                      {/* Liquid glass overlay on image (mobile) */}
                      <AnimatePresence>
                        {selectedId === workshop.id && (
                          <motion.div
                            key="panel-on-image"
                            initial={{ y: 16, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 16, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="absolute left-3 right-3 bottom-3 z-30 rounded-2xl ring-1 ring-white/30 bg-white/20 backdrop-blur-xl shadow-lg"
                            onClick={(e)=>e.stopPropagation()}
                          >
                            <div className="relative p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-sm text-slate-800/80 font-medium">
                                  {(workshop as any).comingSoon 
                                    ? (locale==='th'?'เร็วๆ นี้':'Coming Soon') 
                                    : (locale==='th'?'เลือกวันจอง':'Select date')
                                  }
                                </div>
                                <button 
                                  type="button"
                                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 transition-all" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedId(null);
                                  }} 
                                  aria-label="close"
                                >
                                  <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                              </div>
                              {!(workshop as any).comingSoon && (
                              <div className="mb-3 -mx-1">
                                <div className="flex gap-2 px-1 overflow-x-auto scrollbar-hide">
                                  {visibleDates.map((d, i) => (
                                    <button id={`chip-${d.iso}`} key={`${d.iso}-${i}`} onClick={() => {
                                      if (selectedDateIso) { setSelectedDateIso(d.iso); setSelectedDateIdx(null) }
                                      else { setSelectedDateIdx(i); setSelectedDateIso(null) }
                                    }} className={`min-w-[58px] flex flex-col items-center px-3 py-2 rounded-xl ring-1 text-sm transition
                                      ${ (selectedDateIso ? (d.iso===selectedDateIso) : (selectedDateIdx===i)) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white/80 text-slate-900 ring-white/60'}`}>
                                      <div className="text-xs opacity-70 whitespace-nowrap">{d.dow}</div>
                                      <div className="font-medium">{d.dayNum}</div>
                                    </button>
                                  ))}
                                  {/* Calendar chip -> open fullscreen modal */}
                                  <button
                                    onClick={(e)=>{ 
                                      e.preventDefault(); 
                                      const base = selectedDateIso ? parseLocalIso(selectedDateIso) : tomorrow;
                                      const m = new Date(base.getFullYear(), base.getMonth(), 1);
                                      setCalMonth(m);
                                      setCalendarOpen(true);
                                    }}
                                    className={`min-w-[110px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl ring-1 text-sm bg-white/80 text-slate-900 ring-white/60`}
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3M3 11h18M5 19h14a2 2 0 002-2v-8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                    {locale==='th'?'ปฏิทิน':'Calendar'}
                                  </button>
                                </div>
                              </div>
                              )}
                              {!(workshop as any).comingSoon && selectedDateIso && (
                                <div className="mb-3 text-xs text-slate-800/80">
                                  {locale==='th'?'วันที่เลือก:':'Selected date:'} {parseLocalIso(selectedDateIso).toLocaleDateString(locale==='th'?'th-TH':locale==='zh'?'zh-CN':'en-US', { day:'numeric', month:'short', year:'numeric' })}
                                </div>
                              )}
                              {!(workshop as any).comingSoon && (
                              <div className="text-sm text-slate-800/80 mb-2">{locale==='th'?'เลือกเวลา':'Select time'}</div>
                              )}
                              {!(workshop as any).comingSoon && (
                              <div className="grid grid-cols-2 gap-2 mb-4 relative z-40">
                                {slots.map(slot => (
                                  <button
                                    key={slot}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedSlot(slot);
                                    }}
                                    className={`px-3 rounded-xl ring-1 text-sm text-center whitespace-nowrap w-full flex items-center justify-center h-10 sm:h-11 cursor-pointer hover:scale-[1.02] active:scale-95 transition transform-gpu relative z-[60] ${selectedSlot===slot? 'bg-slate-900 text-white ring-slate-900' : 'bg-white/90 text-slate-900 ring-white/70 hover:bg-white hover:ring-white'}`}
                                  >
                                    <span className="pointer-events-none">{slot}</span>
                                  </button>
                                ))}
                              </div>
                              )}
                              <div className="text-sm text-slate-800/80">
                                {locale==='th'?'ราคา':'Price'} <span className="font-semibold text-slate-900">
                                  {getDisplayPrice(workshop)}
                                </span>
                              </div>
                              {(workshop as any).comingSoon && (
                                <div className="text-center py-4">
                                  <div className="text-slate-600 text-sm">
                                    {locale==='th' 
                                      ? 'Workshop นี้จะเปิดให้บริการในเร็วๆ นี้' 
                                      : locale==='en'
                                      ? 'This workshop will be available soon'
                                      : '此工作坊即将开放'
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    <div className="p-4 min-h-[108px]">
                      <h3 className="text-xl font-semibold">{workshop.title}</h3>
                      <p className="mt-2 text-xs text-slate-600 line-clamp-2 max-w-[228px]">{workshop.desc}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-slate-600 text-sm flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span>{workshop.duration}</span>
                        </div>
                        {(() => {
                          const isOpen = selectedId === workshop.id
                          const hasDate = (selectedDateIso || selectedDateIdx !== null)
                          const hasTime = !!selectedSlot
                          const canBook = isOpen && hasDate && hasTime
                          const isComingSoon = (workshop as any).comingSoon
                          const label = isComingSoon 
                            ? (locale==='th'?'เร็วๆ นี้':locale==='en'?'Coming Soon':'即将推出')
                            : (locale==='th'?'จองเลย':locale==='en'?'Book Now':'立即预订')
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('📱 Workshop button clicked:', { workshop: workshop.param, isComingSoon, canBook });
                                
                                if (isComingSoon) {
                                  // Open modal even for coming soon workshops to show info
                                  setBookingModalWorkshop(workshop);
                                  setBookingModalOpen(true);
                                  return
                                }
                                
                                // Check if mobile
                                const isMobile = window.innerWidth < 768;
                                
                                if (isMobile) {
                                  // Direct booking on mobile - no modal
                                  if (canBook) {
                                    const dateParam = (selectedDateIso ?? (selectedDateIdx != null ? visibleDates[selectedDateIdx].iso : '')) as string;
                                    const timeParam = selectedSlot as string;
                                    console.log('Mobile booking:', { dateParam, timeParam });
                                    router.push(`/workshops/book?workshop=${workshop.param}&date=${encodeURIComponent(dateParam)}&time=${encodeURIComponent(timeParam)}`);
                                  } else {
                                    console.log('Mobile: Cannot book - missing date/time');
                                  }
                                } else {
                                  // Open desktop modal for booking
                                  setBookingModalWorkshop(workshop);
                                  setBookingModalOpen(true);
                                }
                              }}
                              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium shadow-lg transition transform-gpu relative z-50 touch-manipulation
                                ${canBook ? 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-xl cursor-pointer hover:scale-105 active:scale-95' : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer hover:scale-105 active:scale-95'}`}
                              style={{ 
                                WebkitTapHighlightColor: 'transparent',
                                userSelect: 'none'
                              }}
                            >
                              <span className="pointer-events-none">{label}</span>
                              <svg className="w-4 h-4 ml-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                          )
                        })()}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
            </LayoutGroup>
          </div>

          {(product === 'candle' || product === 'soap') && (
            <div className="md:hidden px-6">
              <div className="w-[300px] mx-auto">
                <motion.div
                  className="relative rounded-3xl overflow-hidden ring-1 ring-white/30 bg-white/10 backdrop-blur-xl shadow-lg"
                  style={{ aspectRatio: '3 / 4' }}
                  whileHover={{ y: -2, scale: 1.005 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                >
                  {/* liquid glass blobs */}
                  <div className="absolute -top-10 -right-8 w-40 h-40 bg-lime-300/30 rounded-full blur-3xl" />
                  <div className="absolute -bottom-12 -left-10 w-44 h-44 bg-sky-300/25 rounded-full blur-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5" />
                  <div className="relative h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/50 text-slate-900 text-xs font-medium ring-1 ring-white/40 mb-3">
                      {product==='candle' ? (locale==='th'?'เทียนหอม':'Candle') : (locale==='th'?'สบู่':'Soap')}
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                      {locale==='th'?'เร็วๆ นี้':'Coming soon'}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {locale==='th'?'ยังไม่เปิดให้จองในขณะนี้':'Not open for booking yet'}
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {/* Desktop & Tablet: 4 column grid */}
          <LayoutGroup>
          <div className="hidden md:grid md:grid-cols-4 gap-4 max-w-7xl mx-auto px-6 lg:px-8 py-8">
            {filtered.map((workshop, idx) => (
              <motion.div
                layout
                layoutId={`desktop-workshop-${workshop.id}`}
                key={workshop.id}
                id={`card-${workshop.id}`}
                className={`group`}
                transition={{ layout: { duration: 0.3, ease: [0.2,0.8,0.2,1] }}}
              >
                <motion.div
                  layout
                  className={"rounded-2xl overflow-hidden bg-white text-slate-900 ring-1 ring-slate-200/70 transition-shadow shadow-lg"}
                  animate={{ boxShadow: selectedId===workshop.id ? '0 12px 32px rgba(15,23,42,0.18)' : '0 4px 12px rgba(15,23,42,0.08)' }}
                  transition={{ duration: 0.24, ease: [0.2,0.8,0.2,1] }}
                  whileHover={{ 
                    scale: selectedId ? 1 : 1.02,
                    y: selectedId ? 0 : -3,
                    transition: { duration: 0.2 }
                  }}
                >
                  <motion.div
                    layout
                    className={`relative transform-gpu cursor-pointer workshop-card`}
                    style={{ aspectRatio: '4 / 5' }}
                    animate={{ scale: selectedId===workshop.id ? 1.01 : 1, opacity: selectedId===workshop.id ? 1 : 0.98 }}
                    transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // On desktop, open booking modal
                      setBookingModalWorkshop(workshop);
                      setBookingModalOpen(true);
                    }}
                  >
                    <Image
                      src={workshop.image}
                      alt={workshop.title}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover"
                      style={{ objectPosition: workshop.objectPosition as any }}
                      quality={85}
                      placeholder="blur"
                      blurDataURL={blurDataURL}
                      priority={idx === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/15 to-transparent z-10" />
                    <div className="absolute top-2 left-2 flex items-center gap-1 text-white z-20">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/85 text-slate-900">{workshop.duration}</span>
                    </div>
                    <div className="absolute top-2 right-2 z-20">
                      <div className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/85 text-slate-900 shadow-sm">
                        {(() => {
                          const isComingSoon = (workshop as any).comingSoon;
                          if (isComingSoon) return '---';
                          const priceBaht = workshop.priceBaht;
                          if (typeof priceBaht === 'number') return `฿${priceBaht.toLocaleString()}`;
                          return '฿---';
                        })()}
                      </div>
                    </div>
                    {/* Coming Soon overlay */}
                    {(workshop as any).comingSoon && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
                        <div className="px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-slate-900 font-medium text-sm">
                          {locale === 'th' ? 'เร็วๆ นี้' : locale === 'en' ? 'Coming Soon' : '即将推出'}
                        </div>
                      </div>
                    )}
                    {/* Liquid glass overlay on image (mobile only) */}
                    <AnimatePresence>
                      {selectedId === workshop.id && (
                        <motion.div
                          key="panel-on-image-desktop"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 20, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="absolute left-2 right-2 bottom-2 z-[100] rounded-xl ring-1 ring-white/40 bg-white/30 backdrop-blur-xl shadow-xl md:hidden"
                          onClick={(e)=>e.stopPropagation()}
                        >
                          <div className="relative p-3 z-[110]">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs text-slate-800/80 font-medium">
                                {(workshop as any).comingSoon 
                                  ? (locale==='th'?'เร็วๆ นี้':'Coming Soon') 
                                  : (locale==='th'?'เลือกวันจอง':'Select date')
                                }
                              </div>
                              <button 
                                type="button"
                                className="flex items-center justify-center w-6 h-6 rounded-full bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 transition-all z-[70] relative" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedId(null);
                                }} 
                                aria-label="close"
                              >
                                <svg className="w-3 h-3 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                              </button>
                            </div>
                            {!(workshop as any).comingSoon && (
                            <div className="mb-2 -mx-1 relative z-50">
                              <div className="flex gap-1 px-1 overflow-x-auto scrollbar-hide pb-1">
                                {visibleDates.map((d, i) => (
                                  <button id={`chip-${d.iso}`} key={`${d.iso}-${i}`} onClick={(e) => { 
                                    e.preventDefault(); 
                                    e.stopPropagation(); 

                                    if (selectedDateIso) { setSelectedDateIso(d.iso); setSelectedDateIdx(null) } else { setSelectedDateIdx(i); setSelectedDateIso(null) } 
                                  }} className={`min-w-[48px] flex flex-col items-center px-2 py-1 rounded-lg ring-1 text-xs transition cursor-pointer hover:scale-[1.02] active:scale-95 transform-gpu
                                    ${ (selectedDateIso ? (d.iso===selectedDateIso) : (selectedDateIdx===i)) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white/90 text-slate-900 ring-white/70 hover:bg-white hover:ring-white'}`}>
                                    <div className="text-xs opacity-70 whitespace-nowrap pointer-events-none">{d.dow}</div>
                                    <div className="font-medium pointer-events-none">{d.dayNum}</div>
                                  </button>
                                ))}
                                {/* Calendar chip -> open fullscreen modal */}
                                <button
                                  onClick={(e)=>{ 
                                    e.preventDefault(); 
                                    e.stopPropagation();
                                    const base = selectedDateIso ? parseLocalIso(selectedDateIso) : tomorrow;
                                    const m = new Date(base.getFullYear(), base.getMonth(), 1);
                                    setCalMonth(m);
                                    setCalendarOpen(true);
                                  }}
                                  className={`min-w-[120px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl ring-1 text-sm bg-white/90 text-slate-900 ring-white/70 hover:bg-white hover:ring-white cursor-pointer hover:scale-[1.02] active:scale-95 transform-gpu`}
                                >
                                  <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3M3 11h18M5 19h14a2 2 0 002-2v-8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                  <span className="pointer-events-none">{locale==='th'?'ปฏิทิน':'Calendar'}</span>
                                </button>
                              </div>
                            </div>
                            )}
                            {!(workshop as any).comingSoon && selectedDateIso && (
                              <div className="mb-2 text-xs text-slate-800/80">
                                {locale==='th'?'วันที่เลือก:':'Selected date:'} {parseLocalIso(selectedDateIso).toLocaleDateString(locale==='th'?'th-TH':locale==='zh'?'zh-CN':'en-US', { day:'numeric', month:'short', year:'numeric' })}
                              </div>
                            )}
                            {!(workshop as any).comingSoon && (
                            <div className="text-xs text-slate-800/80 mb-1">{locale==='th'?'เลือกเวลา':'Select time'}</div>
                            )}
                            {!(workshop as any).comingSoon && (
                            <div className="grid grid-cols-2 gap-1 mb-3 relative z-50">
                              {slots.map(slot => (
                                <button
                                  key={slot}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    setSelectedSlot(slot);
                                  }}
                                  className={`px-2 rounded-lg ring-1 text-xs text-center whitespace-nowrap w-full flex items-center justify-center h-7 cursor-pointer hover:scale-105 active:scale-95 transition ${selectedSlot===slot? 'bg-slate-900 text-white ring-slate-900' : 'bg-white/80 text-slate-900 ring-white/60 hover:bg-white'}`}
                                >
                                  <span className="pointer-events-none">{slot}</span>
                                </button>
                              ))}
                            </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-slate-800/80">
                                {locale==='th'?'ราคา':'Price'} <span className="font-semibold text-slate-900">
                                  {getDisplayPrice(workshop)}
                                </span>
                              </div>
                              {(() => {
                                const hasDate = (selectedDateIso || selectedDateIdx !== null)
                                const hasTime = !!selectedSlot
                                const canBook = hasDate && hasTime
                                if (!hasDate) {
                                  return <div className="text-xs text-slate-500">{locale==='th'?'เลือกวันที่':'Select date'}</div>
                                }
                                if (!hasTime) {
                                  return <div className="text-xs text-slate-500">{locale==='th'?'เลือกเวลา':'Select time'}</div>
                                }
                                return <div className="text-xs text-slate-700 font-medium">{locale==='th'?'พร้อมจอง':'Ready to book'}</div>
                              })()}
                            </div>
                            {(workshop as any).comingSoon && (
                              <div className="text-center py-1">
                                <div className="text-xs text-slate-600">
                                  {locale==='th' 
                                    ? 'Workshop นี้จะเปิดให้บริการในเร็วๆ นี้' 
                                    : locale==='en'
                                    ? 'This workshop will be available soon'
                                    : '此工作坊即将开放'
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <div className="p-3 min-h-[80px] relative z-10">
                    <div 
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // On desktop, open booking modal instead of expanded panel
                        setBookingModalWorkshop(workshop);
                        setBookingModalOpen(true);
                      }}
                    >
                      <h3 className="text-sm font-semibold line-clamp-1">{workshop.title}</h3>
                      <p className="mt-1 text-xs text-slate-600 line-clamp-2">{workshop.desc}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-slate-600 text-xs flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>{workshop.duration}</span>
                      </div>
                      {(() => {
                        const isOpen = selectedId === workshop.id
                        const hasDate = (selectedDateIso || selectedDateIdx !== null)
                        const hasTime = !!selectedSlot
                        const canBook = isOpen && hasDate && hasTime
                        const isComingSoon = (workshop as any).comingSoon
                        const label = isComingSoon 
                          ? (locale==='th'?'เร็วๆ นี้':locale==='en'?'Coming Soon':'即将推出')
                          : (locale==='th'?'จองเลย':locale==='en'?'Book Now':'立即预订')
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (isComingSoon) {
                                // Open modal even for coming soon workshops to show info
                                setBookingModalWorkshop(workshop);
                                setBookingModalOpen(true);
                                return
                              }
                              // Open desktop modal for booking  
                              setBookingModalWorkshop(workshop);
                              setBookingModalOpen(true);
                            }}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm transition transform-gpu relative z-[60]
                              ${canBook ? 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-lg cursor-pointer hover:scale-[1.02] active:scale-95' : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer hover:scale-[1.02] active:scale-95'}
                              ${isOpen && !canBook ? '' : ''}`}
                          >
                            <span className="pointer-events-none">{label}</span>
                            <svg className="w-3 h-3 ml-1 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        )
                      })()}
                    </div>

                    
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
          </LayoutGroup>

          {(product === 'candle' || product === 'soap') && (
            <div className="hidden lg:block">
              <div className="max-w-md mx-auto">
                <motion.div
                  className="relative rounded-3xl overflow-hidden ring-1 ring-white/30 bg-white/10 backdrop-blur-xl shadow-xl"
                  style={{ aspectRatio: '3 / 4' }}
                >
                  <div className="absolute -top-14 -right-12 w-60 h-60 bg-lime-300/30 rounded-full blur-3xl" />
                  <div className="absolute -bottom-16 -left-14 w-64 h-64 bg-sky-300/25 rounded-full blur-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5" />
                  <div className="relative h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/50 text-slate-900 text-xs font-medium ring-1 ring-white/40 mb-4">
                      {product==='candle' ? (locale==='th'?'เทียนหอม':'Candle') : (locale==='th'?'สบู่':'Soap')}
                    </div>
                    <h3 className="text-3xl font-semibold text-slate-900 mb-2">
                      {locale==='th'?'เร็วๆ นี้':'Coming soon'}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {locale==='th'?'ยังไม่เปิดให้จองในขณะนี้':'Not open for booking yet'}
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
          
          {/* What You'll Get Section - minimal */}
          <div className="mt-20">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-light mb-2 text-gray-900">
                {locale === 'th' ? 'สิ่งที่คุณจะได้รับ' : locale === 'en' ? 'What You\'ll Get' : '您将获得的收益'}
              </h3>
              <div className="h-px w-20 mx-auto bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[0,1,2,3].map((i) => (
                <div key={i} className="text-center rounded-2xl ring-1 ring-slate-200 p-6 hover:shadow-sm transition">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-50 flex items-center justify-center ring-1 ring-slate-200">
                    {i===0 && (
                      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    )}
                    {i===1 && (
                      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    )}
                    {i===2 && (
                      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    )}
                    {i===3 && (
                      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {i===0 ? (locale==='th'?'ความรู้จากผู้เชี่ยวชาญ':locale==='en'?'Expert Knowledge':'专家知识')
                      : i===1 ? (locale==='th'?'วัสดุครบชุด':locale==='en'?'Complete Materials':'完整材料')
                      : i===2 ? (locale==='th'?'กลับบ้านพร้อมผลงาน':locale==='en'?'Take Home Creation':'带回家的作品')
                      : (locale==='th'?'กลุ่มเล็ก เรียนสนุก':locale==='en'?'Small Group Learning':'小组学习')}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {i===0 ? (locale==='th'?'เทคนิคจากนักพฤกษศาสตร์มืออาชีพ':locale==='en'?'Techniques from professional botanists':'来自专业植物学家的技术')
                      : i===1 ? (locale==='th'?'วัสดุคุณภาพสูงและเครื่องมือครบชุด':locale==='en'?'High-quality materials and complete tools':'高品质材料和完整工具')
                      : i===2 ? (locale==='th'?'ชิ้นงานสวยงามที่คุณสร้างเอง':locale==='en'?'Beautiful piece you created yourself':'您亲手制作的美丽作品')
                      : (locale==='th'?'จำกัดผู้เรียนเพื่อการเรียนรู้ที่มีคุณภาพ':locale==='en'?'Limited participants for quality learning':'限制参与者以确保学习质量')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Booking Modal */}
      <AnimatePresence>
        {bookingModalOpen && bookingModalWorkshop && (
          <motion.div
            key="booking-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] hidden md:block"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setBookingModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative z-[130] h-full w-full flex items-center justify-center p-8"
            >
              <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{bookingModalWorkshop.title}</h2>
                      <p className="text-sm text-slate-600 mt-1">{bookingModalWorkshop.duration}</p>
                    </div>
                    <button
                      onClick={() => setBookingModalOpen(false)}
                      className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {(() => {
                    const isComingSoon = (bookingModalWorkshop as any).comingSoon;
                    
                    if (isComingSoon) {
                      return (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            {locale === 'th' ? 'เร็วๆ นี้' : locale === 'en' ? 'Coming Soon' : '即将推出'}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {locale === 'th' 
                              ? 'Workshop นี้จะเปิดให้บริการในเร็วๆ นี้' 
                              : locale === 'en'
                              ? 'This workshop will be available soon'
                              : '该工作坊即将开放'}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        {/* Date Selection */}
                        <div className="space-y-3">
                          <h3 className="font-medium text-slate-900">
                            {locale === 'th' ? 'เลือกวันที่' : locale === 'en' ? 'Select Date' : '选择日期'}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const base = selectedDateIso ? parseLocalIso(selectedDateIso) : tomorrow;
                              const m = new Date(base.getFullYear(), base.getMonth(), 1);
                              setCalMonth(m);
                              setCalendarOpen(true);
                            }}
                            className="w-full p-3 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors text-left cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-slate-600">
                                  {(selectedDateIso || selectedDateIdx !== null) 
                                    ? (selectedDateIso 
                                        ? parseLocalIso(selectedDateIso).toLocaleDateString(locale==='th'?'th-TH':locale==='zh'?'zh-CN':'en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                        : parseLocalIso(visibleDates[selectedDateIdx!].iso).toLocaleDateString(locale==='th'?'th-TH':locale==='zh'?'zh-CN':'en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                      )
                                    : (locale === 'th' ? 'เลือกวันที่' : locale === 'en' ? 'Choose date' : '选择日期')
                                  }
                                </span>
                              </div>
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>
                        </div>

                        {/* Time Selection */}
                        {(selectedDateIso || selectedDateIdx !== null) && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-3"
                          >
                            <h3 className="font-medium text-slate-900">
                              {locale === 'th' ? 'เลือกเวลา' : locale === 'en' ? 'Select Time' : '选择时间'}
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                              {slots.map(slot => (
                                <button
                                  key={slot}
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`p-3 rounded-lg border font-medium transition-colors ${
                                    selectedSlot === slot
                                      ? 'border-slate-900 bg-slate-900 text-white'
                                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {slot}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {/* Price */}
                        <div className="pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">
                              {locale === 'th' ? 'ราคา' : locale === 'en' ? 'Price' : '价格'}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {(() => {
                                const isComingSoon = (bookingModalWorkshop as any).comingSoon;
                                if (isComingSoon) return '---';
                                const priceBaht = bookingModalWorkshop.priceBaht;
                                if (typeof priceBaht === 'number') return `฿${priceBaht.toLocaleString()}`;
                                return '฿---';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Footer */}
                {!((bookingModalWorkshop as any).comingSoon) && (
                  <div className="p-6 border-t border-slate-200">
                    {(() => {
                      const hasDate = (selectedDateIso || selectedDateIdx !== null);
                      const hasTime = !!selectedSlot;
                      const canBook = hasDate && hasTime;
                      
                      return (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('📱 Book button clicked!', { canBook, hasDate, hasTime, selectedDateIso, selectedSlot });
                            
                            if (canBook) {
                              const dateParam = (selectedDateIso ?? (selectedDateIdx != null ? visibleDates[selectedDateIdx].iso : '')) as string;
                              const timeParam = selectedSlot as string;
                              console.log('Navigating to booking page...');
                              router.push(`/workshops/book?workshop=${bookingModalWorkshop.param}&date=${encodeURIComponent(dateParam)}&time=${encodeURIComponent(timeParam)}`);
                            }
                          }}
                          disabled={!canBook}
                          className={`w-full py-4 rounded-lg font-medium transition-colors touch-manipulation active:scale-95 relative z-[150] ${
                            canBook
                              ? 'bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white shadow-lg'
                              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          }`}
                          style={{ 
                            WebkitTapHighlightColor: 'transparent',
                            userSelect: 'none',
                            minHeight: '48px'
                          }}
                        >
                          {canBook 
                            ? (locale === 'th' ? 'จองเลย' : locale === 'en' ? 'Book Now' : '立即预订')
                            : (locale === 'th' ? 'เลือกวันและเวลา' : locale === 'en' ? 'Select Date & Time' : '选择日期和时间')
                          }
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Calendar Modal */}
      <AnimatePresence>
        {calendarOpen && (
          <motion.div
            key="calendar-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999]"

          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCalendarOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300,
                duration: 0.4
              }}
              className="relative z-[10000] h-full w-full flex items-center justify-center p-6"
            >
              <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden max-h-[85vh] flex flex-col backdrop-blur-xl bg-white/95">
                {/* Header */}
                <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/50 flex items-center justify-between">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-xl ring-1 ring-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-sm hover:shadow-md transition-all"
                    onClick={() => { const d = new Date(calMonth); d.setMonth(d.getMonth()-1); setCalMonth(d); }}
                    disabled={(() => { const calIdx = calMonth.getFullYear()*12 + calMonth.getMonth(); const minDate = parseLocalIso(minIso); const minIdx = minDate.getFullYear()*12 + minDate.getMonth(); return calIdx <= minIdx; })()}
                    aria-label="prev month"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                  </motion.button>
                  <div className="text-center">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {calMonth.toLocaleDateString(locale==='th'?'th-TH':locale==='zh'?'zh-CN':'en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {locale === 'th' ? 'เลือกวันที่ต้องการ' : locale === 'en' ? 'Choose your preferred date' : '选择您的首选日期'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-3 rounded-xl ring-1 ring-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-sm hover:shadow-md transition-all"
                      onClick={() => { const d = new Date(calMonth); d.setMonth(d.getMonth()+1); setCalMonth(d); }}
                      disabled={(() => { const calIdx = calMonth.getFullYear()*12 + calMonth.getMonth(); const maxDate = parseLocalIso(maxIso); const maxIdx = maxDate.getFullYear()*12 + maxDate.getMonth(); return calIdx >= maxIdx; })()}
                      aria-label="next month"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-3 rounded-xl ring-1 ring-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-sm hover:shadow-md transition-all"
                      onClick={() => setCalendarOpen(false)}
                      aria-label="close"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </motion.button>
                  </div>
                </div>
                {/* Calendar Body */}
                <div className="px-3 sm:px-6 pb-5 overflow-auto">
                  <div className="grid grid-cols-7 gap-1 text-center text-xs sm:text-sm text-slate-500 mb-2">
                    {['Mo','Tu','We','Th','Fr','Sa','Su'].map(w => <div key={w}>{w}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                    {(() => {
                      const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1)
                      let startOffset = first.getDay() // 0 Sun .. 6 Sat
                      startOffset = startOffset === 0 ? 6 : startOffset - 1 // Monday-first
                      const gridStart = new Date(first)
                      gridStart.setDate(first.getDate() - startOffset)
                      const cells: JSX.Element[] = []
                      for (let i=0;i<42;i++) {
                        const d = new Date(gridStart)
                        d.setDate(gridStart.getDate()+i)
                        const iso = toLocalIso(d)
                        const inMonth = d.getMonth() === calMonth.getMonth()
                        const disabled = (iso < minIso) || (iso > maxIso)
                        const selected = selectedDateIso===iso
                        cells.push(
                          <button
                            key={iso}
                            disabled={disabled}
                            onClick={() => { 
                              setSelectedDateIso(iso); 
                              setSelectedDateIdx(null); 
                              setCalendarOpen(false); 
                              setTimeout(() => {
                                const chip = document.getElementById(`chip-${iso}`)
                                chip?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' })
                              }, 50)
                            }}
                            className={`h-10 sm:h-12 rounded-md text-sm font-medium transition w-full
                              ${disabled? 'text-slate-300 cursor-not-allowed' : inMonth? 'text-slate-900 hover:bg-slate-900/10' : 'text-slate-400 hover:bg-slate-900/10'}
                              ${selected? 'bg-slate-900 text-white hover:bg-slate-900' : ''}
                            `}
                          >
                            {d.getDate()}
                          </button>
                        )
                      }
                      return cells
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer - Simple */}
      <footer className="py-12 px-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-gray-500 text-sm">
            © 2024 XYL STUDIO. {locale === 'th' ? 'สงวนลิขสิทธิ์' : locale === 'en' ? 'All rights reserved' : '版权所有'}
          </p>
        </div>
      </footer>
    </div>
  )
}
