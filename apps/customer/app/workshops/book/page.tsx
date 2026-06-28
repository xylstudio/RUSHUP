'use client';
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/I18nContext'
import Link from 'next/link'
import { validateBooking, type BookingValidationErrors } from '@/lib/bookingValidation'
import { useToastContext } from '@/components/Toast'

// (Removed dynamic slot fetching in favor of two fixed time slots)

// Internal topic keys; labels are localized via i18n
type TopicKey = 'tray' | 'terrarium'
const serverTopicLabel: Record<TopicKey, string> = {
  tray: 'Tray Garden',
  terrarium: 'Terrarium Garden',
}

// Branded pricing (can be moved to DB later)
const priceMap: Record<string, number> = {
  'Tray Garden': 890,
  'Terrarium Garden': 990
}

export default function WorkshopBookingPage() {
  const { t, locale, setLocale } = useI18n()
  const router = useRouter()
  const toast = useToastContext()
  const initialSearchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const workshopParam = (initialSearchParams?.get('workshop') as TopicKey | null) || null
  const qDate = initialSearchParams?.get('date') || ''
  const qTime = initialSearchParams?.get('time') || ''
  
  // Initialize state with draft data or URL params
  const [date, setDate] = useState<string>(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      return draft.date || qDate
    } catch {
      return qDate
    }
  })
  // Removed separate validation spinner state for simplified single-page flow
  const nameInputRef = useRef<HTMLInputElement | null>(null)

  const [fullName, setFullName] = useState(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      return draft.fullName || ''
    } catch {
      return ''
    }
  })
  const [email, setEmail] = useState(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      return draft.email || ''
    } catch {
      return ''
    }
  })
  const [phone, setPhone] = useState(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      return draft.phone || ''
    } catch {
      return ''
    }
  })
  const [topic, setTopic] = useState<TopicKey>(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      return draft.topicKey || workshopParam || 'tray'
    } catch {
      return workshopParam || 'tray'
    }
  })
  const [attendees, setAttendees] = useState<number>(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      return typeof draft.attendees === 'number' ? Math.max(1, Math.min(8, draft.attendees)) : 1
    } catch {
      return 1
    }
  })
  const [notes, setNotes] = useState(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      return draft.notes || ''
    } catch {
      return ''
    }
  })
  const [timeChoice, setTimeChoice] = useState<'morning'|'afternoon'|''>(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      if (draft.timeChoice === 'morning' || draft.timeChoice === 'afternoon' || draft.timeChoice === '') {
        return draft.timeChoice
      }
    } catch {}
    // Fallback to URL param parsing
    const norm = (qTime || '').replace('–','-').trim()
    const [qs] = norm.split('-').map(s => s?.trim())
    if (qs?.startsWith('09')) return 'morning'
    if (qs?.startsWith('14')) return 'afternoon'
    return ''
  })
  const [honeypot, setHoneypot] = useState(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      return draft.honeypot || ''
    } catch {
      return ''
    }
  })
  const [workshopLanguage, setWorkshopLanguage] = useState<'th' | 'en'>(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      return draft.workshopLanguage || (locale === 'th' ? 'th' : 'en')
    } catch {
      return locale === 'th' ? 'th' : 'en'
    }
  })
  const [errors, setErrors] = useState<BookingValidationErrors>({})
  const [acceptedPolicies, setAcceptedPolicies] = useState<boolean>(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      return draft.acceptedPolicies === true
    } catch {
      return false
    }
  })
  const [marketingConsent, setMarketingConsent] = useState<boolean>(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      return draft.marketingConsent === true
    } catch {
      return false
    }
  })
  const [clientToken] = useState<string>(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('workshopBookingDraft') || '{}')
      return draft.client_token || `bk_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
    } catch {
      return `bk_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
    }
  })

  // No toasts on this page; we navigate once valid

  // Single-page flow: payment section appears when form is complete
  const topics = useMemo(() => ([
    { key: 'tray' as TopicKey, label: t('form.topic.tray') || serverTopicLabel.tray },
    { key: 'terrarium' as TopicKey, label: t('form.topic.terrarium') || serverTopicLabel.terrarium },
  ]), [t])

  const topicDescriptions = useMemo(() => ({
    tray: {
      th: 'สวนถาดสำหรับผู้เริ่มต้น จัดองค์ประกอบสมดุล ดูแลง่าย',
      en: 'Tray Garden: beginner-friendly composition practice, easy care',
      zh: '托盘花园：新手友好，布局练习，易养护'
    },
    terrarium: {
      th: 'สวนในโหลแก้ว มินิมอล สวยทน มือใหม่ก็ทำได้',
      en: 'Glass Terrarium: minimal, durable, beginner-friendly design',
      zh: '玻璃生态瓶：极简耐久，新手可轻松制作'
    }
  } as const), [])

  // No dynamic slot fetching; time is a simple choice between two sessions

  // Only update from URL params on initial load - allow user to edit freely after that
  useEffect(() => {
    const hasExistingDraft = sessionStorage.getItem('workshopBookingDraft')
    if (!hasExistingDraft) {
      const params = new URLSearchParams(window.location.search)
      const initialWorkshop = params.get('workshop') as TopicKey | null
      const initialDate = params.get('date') || ''
      const initialTime = params.get('time') || ''

      if (initialWorkshop) {
        setTopic(prev => (prev === initialWorkshop ? prev : initialWorkshop))
      }

      if (initialDate) {
        setDate(prev => (prev === initialDate ? prev : initialDate))
      }

      const norm = initialTime.replace('–','-').trim()
      const [qs] = norm.split('-').map(s => s?.trim())
      const newTimeChoice = qs?.startsWith('09') ? 'morning' : qs?.startsWith('14') ? 'afternoon' : ''
      if (newTimeChoice) {
        setTimeChoice(prev => (prev === newTimeChoice ? prev : newTimeChoice))
      }
    }
  }, []) // Run only once on mount

  // Persist draft whenever fields change
  useEffect(() => {
    const draft = {
      fullName,
      email,
      phone,
      topicKey: topic,
      attendees,
      notes,
      timeChoice,
      date,
      workshopLanguage,
      honeypot,
      client_token: clientToken,
      acceptedPolicies,
      marketingConsent,
    }
    try {
      sessionStorage.setItem('workshopBookingDraft', JSON.stringify(draft))
    } catch {}
  }, [fullName, email, phone, topic, attendees, notes, timeChoice, date, workshopLanguage, honeypot, clientToken])

  const requirements = useMemo(() => ({
    name: !!fullName && fullName.trim().length >= 2,
    email: !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    phone: !!phone && /^(\+66|0)[1-9][0-9\-\s]{8,14}$/.test(phone), // Phone is now required
    date: !!date,
    time: !!timeChoice,
    attendees: attendees >= 1,
  }), [fullName, email, phone, date, timeChoice, attendees])

  const canSubmit = Object.values(requirements).every(req => req === true)
  const totalAmount = (priceMap[serverTopicLabel[topic]] || 890) * Math.max(1, attendees)

  // Manual pay button handler
  const goToPayment = () => {
    const { valid, errors: vErrors } = validateBooking({
      full_name: fullName,
      email,
      phone,
      topic: serverTopicLabel[topic],
      attendees_count: attendees,
      date,
      start_time: timeChoice==='morning' ? '09:00' : '14:00',
      end_time: timeChoice==='morning' ? '11:30' : '16:00',
      notes,
      workshop_language: workshopLanguage
    })
    setErrors(vErrors)
    
    if (!valid) {
      // Show specific error messages
      const errorMessages = Object.values(vErrors).filter(Boolean)
      if (errorMessages.length > 0) {
        toast.error(
          locale==='th' ? 'กรุณากรอกข้อมูลให้ครบถ้วน' : locale==='en' ? 'Please complete all required fields' : '请完整填写所有必填项',
          errorMessages[0], // Show first error as detail
          6000
        )
      }
      
      // Focus on first error field
      if (vErrors.full_name) {
        nameInputRef.current?.focus()
      } else if (vErrors.email) {
        document.getElementById('email-input')?.focus()
      } else if (vErrors.phone) {
        document.getElementById('phone-input')?.focus()
      }
      
      return
    }
    if (!acceptedPolicies) {
      toast.error(
        locale==='th' ? 'ต้องยอมรับนโยบายก่อนดำเนินการต่อ' : locale==='en' ? 'Please accept the policies before continuing' : '继续前请先接受相关政策',
        locale==='th' ? 'กรุณายอมรับนโยบายความเป็นส่วนตัวและเงื่อนไขการใช้บริการ' : locale==='en' ? 'Please accept the Privacy Policy and Terms of Service.' : '请接受隐私政策和服务条款。',
        6000
      )
      return
    }
    const booking = {
      full_name: fullName,
      email,
      phone,
      topic: serverTopicLabel[topic],
      attendees_count: attendees,
      date,
      start_time: timeChoice==='morning' ? '09:00' : '14:00',
      end_time: timeChoice==='morning' ? '11:30' : '16:00',
      notes,
      honeypot,
      workshop_language: workshopLanguage,
      amount: (priceMap[serverTopicLabel[topic]] || 890) * attendees,
      client_token: clientToken,
      consents: {
        privacyPolicy: acceptedPolicies,
        termsOfService: acceptedPolicies,
        marketing: marketingConsent,
      }
    }
    try {
      sessionStorage.setItem('workshopBooking', JSON.stringify(booking))
    } catch {}
    router.push('/workshops/payment')
  }

  // Payment handled on /workshops/payment

  return (
  <div className="min-h-screen bg-white text-gray-900">
      {/* Minimal Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          {
            <Link href="/workshops" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              {locale==='th'?'กลับไปเลือกเวิร์กช็อป':locale==='en'?'Back to workshops':'返回列表'}
            </Link>
          }
          <div className="flex items-center gap-1">
            {(['th','en','zh'] as const).map(code => (
              <button key={code} onClick={()=>setLocale(code)} className={`px-2.5 py-1.5 rounded-md text-xs ring-1 transition ${locale===code?'bg-slate-900 text-white ring-slate-900':'bg-white text-slate-900 ring-slate-200 hover:bg-slate-100'}`}>{code==='th'?'ไทย':code==='en'?'EN':'中文'}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Simplified spacing after header */}
      <div className="h-2" />

      <div className="animate-fade-in-scale">
    <form id="booking-form" onSubmit={(e)=>e.preventDefault()} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-4">
              {/* Left: Form Fields */}
              <div className="md:col-span-3 lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">{t('form.topic.label')}</label>
                <div className="flex flex-wrap gap-3">
                  {topics.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setTopic(opt.key)
                        // Don't clear date/time - allow user to keep their selections
                      }}
                      className={`px-4 py-2.5 md:px-5 md:py-3 rounded-xl text-sm md:text-base font-medium ring-1 transition ${topic===opt.key ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-900 ring-slate-200 hover:bg-slate-100'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {locale==='th' ? topicDescriptions[topic].th : locale==='en' ? topicDescriptions[topic].en : topicDescriptions[topic].zh}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('form.fullName.label')}
                  <span className="text-red-500 ml-1">*</span>
                  {requirements.name && (
                    <span className="ml-2 inline-flex items-center text-emerald-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A7 7 0 0112 15a7 7 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </span>
                  <input
                    value={fullName}
                    onChange={e=>{
                      setFullName(e.target.value)
                      // Clear error when user starts typing
                      if (errors.full_name && e.target.value.trim().length >= 2) {
                        setErrors(prev => ({ ...prev, full_name: undefined }))
                      }
                    }}
                    aria-invalid={!!errors.full_name}
                    className={`w-full rounded-xl bg-white border shadow-sm pl-9 pr-3 py-2 text-sm focus:outline-none focus-visible:ring-2 ring-offset-2 ${errors.full_name ? 'border-red-300 focus-visible:ring-red-500 focus:border-red-500' : requirements.name ? 'border-emerald-300 focus-visible:ring-emerald-500 focus:border-emerald-500' : 'border-slate-200 focus-visible:ring-xylem-dark/30 focus:border-xylem-dark'} transition`}
                    placeholder={t('form.fullName.placeholder')}
                    autoComplete="name"
                    inputMode="text"
                    ref={nameInputRef}
                  />
                </div>
                {errors.full_name && <p className="text-xs text-red-600 mt-1" id="name-error">{errors.full_name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('form.email.label')}
                  <span className="text-red-500 ml-1">*</span>
                  {requirements.email && (
                    <span className="ml-2 inline-flex items-center text-emerald-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  </span>
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={e=>{
                      setEmail(e.target.value)
                      // Clear error when email becomes valid
                      if (errors.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                        setErrors(prev => ({ ...prev, email: undefined }))
                      }
                    }}
                    aria-invalid={!!errors.email}
                    className={`w-full rounded-xl bg-white border shadow-sm pl-9 pr-3 py-2 text-sm focus:outline-none focus-visible:ring-2 ring-offset-2 ${errors.email ? 'border-red-300 focus-visible:ring-red-500 focus:border-red-500' : requirements.email ? 'border-emerald-300 focus-visible:ring-emerald-500 focus:border-emerald-500' : 'border-slate-200 focus-visible:ring-xylem-dark/30 focus:border-xylem-dark'} transition`}
                    placeholder={t('form.email.placeholder')}
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-600 mt-1" id="email-error">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('form.phone.label')}
                  <span className="text-red-500 ml-1">*</span>
                  {requirements.phone && (
                    <span className="ml-2 inline-flex items-center text-emerald-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3l2 4-2 1a11 11 0 006 6l1-2 4 2v3a2 2 0 01-2 2h-1C8.82 19 5 15.18 5 10V9a2 2 0 00-2-2z"/></svg>
                  </span>
                  <input
                    id="phone-input"
                    value={phone}
                    onChange={e=>{
                      setPhone(e.target.value)
                      // Clear error when phone becomes valid
                      if (errors.phone && e.target.value && /^(\+66|0)[1-9][0-9\-\s]{8,14}$/.test(e.target.value)) {
                        setErrors(prev => ({ ...prev, phone: undefined }))
                      }
                    }}
                    aria-invalid={!!errors.phone}
                    className={`w-full rounded-xl bg-white border shadow-sm pl-9 pr-3 py-2 text-sm focus:outline-none focus-visible:ring-2 ring-offset-2 ${errors.phone ? 'border-red-300 focus-visible:ring-red-500 focus:border-red-500' : requirements.phone ? 'border-emerald-300 focus-visible:ring-emerald-500 focus:border-emerald-500' : 'border-slate-200 focus-visible:ring-xylem-dark/30 focus:border-xylem-dark'} transition`}
                    placeholder={t('form.phone.placeholder')}
                    autoComplete="tel"
                    inputMode="tel"
                    pattern="^(\\+66|0)[1-9][0-9\\-\\s]{8,14}$"
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-600 mt-1" id="phone-error">{errors.phone}</p>}
              </div>
              {/* Editable Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('schedule.date.label')}
                  <span className="text-red-500 ml-1">*</span>
                  {requirements.date && (
                    <span className="ml-2 inline-flex items-center text-emerald-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </span>
                  <input
                    type="date"
                    value={date}
                    onChange={e=>setDate(e.target.value)}
                    aria-invalid={!!errors.date}
                    className={`w-full max-w-full min-w-0 overflow-hidden rounded-xl bg-white border shadow-sm pl-9 pr-3 py-2 text-sm focus:outline-none focus-visible:ring-2 ring-offset-2 ${errors.date ? 'border-red-300 focus-visible:ring-red-500 focus:border-red-500' : 'border-slate-200 focus-visible:ring-xylem-dark/30 focus:border-xylem-dark'} transition`}
                    style={{ WebkitAppearance: 'none' }}
                  />
                </div>
                {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date}</p>}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {t('schedule.time.label')}
                    <span className="text-red-500 ml-1">*</span>
                    {requirements.time && (
                      <span className="ml-2 inline-flex items-center text-emerald-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3" role="group" aria-label={locale==='th' ? 'เลือกช่วงเวลา' : locale==='en' ? 'Select time slot' : '选择时间段'}>
                    <button
                      type="button"
                      onClick={()=>setTimeChoice('morning')}
                      aria-pressed={timeChoice==='morning'}
                      className={`h-12 md:h-14 rounded-2xl border text-sm md:text-base font-semibold transition-all duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 ring-offset-2 ${timeChoice==='morning' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-100 focus-visible:ring-xylem-dark/30'}`}
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[10px] uppercase tracking-wide opacity-70">{locale==='th'?'เช้า':locale==='en'?'Morning':'上午'}</span>
                        <span>09:00 - 11:30</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={()=>setTimeChoice('afternoon')}
                      aria-pressed={timeChoice==='afternoon'}
                      className={`h-12 md:h-14 rounded-2xl border text-sm md:text-base font-semibold transition-all duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 ring-offset-2 ${timeChoice==='afternoon' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-100 focus-visible:ring-xylem-dark/30'}`}
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[10px] uppercase tracking-wide opacity-70">{locale==='th'?'บ่าย':locale==='en'?'Afternoon':'下午'}</span>
                        <span>14:00 - 16:00</span>
                      </div>
                    </button>
                  </div>
                  {errors.time && <div className="text-xs text-red-600 mt-2">{errors.time}</div>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">{t('form.attendees.label')}</label>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3" role="group" aria-label={locale==='th'?'เลือกจำนวนผู้เข้าร่วม':locale==='en'?'Select attendees':'选择人数'}>
                  {Array.from({length:8}, (_,i)=>i+1).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={()=>setAttendees(n)}
                      aria-pressed={attendees===n}
                      className={`h-10 md:h-12 rounded-xl border text-sm md:text-base font-semibold transition transform focus:outline-none focus-visible:ring-2 ring-offset-2 ${attendees===n ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-100 hover:scale-[1.02] focus-visible:ring-xylem-dark/30'}`}
                    >{n}</button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">{locale==='th' ? 'เลือกได้สูงสุด 8 คนต่อกลุ่ม' : locale==='en' ? 'Up to 8 people per group' : '每组最多 8 人'}</p>
                {errors.attendees_count && <p className="text-xs text-red-600 mt-1">{errors.attendees_count}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {locale==='th' ? 'ภาษาเวิร์กช็อป' : locale==='en' ? 'Workshop Language' : '课程语言'}
                </label>
                <div className="flex gap-3" role="group" aria-label={locale==='th'?'เลือกภาษาเวิร์กช็อป':locale==='en'?'Select workshop language':'选择课程语言'}>
                  <button
                    type="button"
                    onClick={()=>setWorkshopLanguage('th')}
                    aria-pressed={workshopLanguage==='th'}
                    className={`px-4 py-2 rounded-xl text-sm font-medium ring-1 transition focus:outline-none focus-visible:ring-2 ring-offset-2 ${workshopLanguage==='th' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-900 ring-slate-200 hover:bg-slate-100 focus-visible:ring-xylem-dark/30'}`}
                  >{locale === 'en' ? 'ไทย' : locale === 'zh' ? 'ไทย' : 'ไทย'}</button>
                  <button
                    type="button"
                    onClick={()=>setWorkshopLanguage('en')}
                    aria-pressed={workshopLanguage==='en'}
                    className={`px-4 py-2 rounded-xl text-sm font-medium ring-1 transition focus:outline-none focus-visible:ring-2 ring-offset-2 ${workshopLanguage==='en' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-900 ring-slate-200 hover:bg-slate-100 focus-visible:ring-xylem-dark/30'}`}
                  >English</button>
                </div>
                {errors.workshop_language && <p className="text-xs text-red-600 mt-2">{errors.workshop_language}</p>}
              </div>
              {/* Honeypot for bots */}
              <input type="text" value={honeypot} onChange={e=>setHoneypot(e.target.value)} className="hidden" aria-hidden="true" />

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">{t('form.notes.label')}</label>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} className="w-full rounded-xl bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-xylem-dark/30 focus:border-xylem-dark transition px-3 py-2 text-sm" rows={3} placeholder={t('form.notes.label')} />
              </div>
            </div>

            {/* Right: Summary only */}
            <div className="md:col-span-2 lg:col-span-1 rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm p-5 sm:p-6 lg:sticky lg:top-4 h-fit">
              <div>
                <div className="font-semibold text-slate-900 mb-3">{t('summary.title')}</div>
                
                {/* Missing Requirements */}
                {!canSubmit && (
                  <div className="mb-4 p-3 rounded-lg border bg-amber-50 border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm font-medium text-amber-800">
                        {locale==='th' ? 'กรอกข้อมูลให้ครบ' : locale==='en' ? 'Complete required fields' : '完成必填项'}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-amber-700">
                      {!requirements.name && <div>• {locale==='th' ? 'ชื่อ-นามสกุล' : locale==='en' ? 'Full name' : '姓名'}</div>}
                      {!requirements.email && <div>• {locale==='th' ? 'อีเมล' : locale==='en' ? 'Email' : '邮箱'}</div>}
                      {!requirements.phone && <div>• {locale==='th' ? 'เบอร์โทรศัพท์' : locale==='en' ? 'Phone number' : '手机号码'}</div>}
                      {!requirements.date && <div>• {locale==='th' ? 'วันที่' : locale==='en' ? 'Date' : '日期'}</div>}
                      {!requirements.time && <div>• {locale==='th' ? 'เวลา' : locale==='en' ? 'Time' : '时间'}</div>}
                    </div>
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-3">
                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={acceptedPolicies}
                    onChange={(e)=>setAcceptedPolicies(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    {locale==='th' ? 'ฉันยอมรับ ' : locale==='en' ? 'I accept the ' : '我接受'}
                    <Link href="/privacy" className="font-semibold text-slate-900 underline underline-offset-4">{locale==='th' ? 'นโยบายความเป็นส่วนตัว' : locale==='en' ? 'Privacy Policy' : '隐私政策'}</Link>
                    {' '}
                    {locale==='th' ? 'และ' : locale==='en' ? 'and' : '与'}
                    {' '}
                    <Link href="/terms" className="font-semibold text-slate-900 underline underline-offset-4">{locale==='th' ? 'เงื่อนไขการใช้บริการ' : locale==='en' ? 'Terms of Service' : '服务条款'}</Link>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e)=>setMarketingConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    {locale==='th' ? 'ฉันยินยอมรับข่าวสารหรือโปรโมชันเกี่ยวกับเวิร์กช็อปและบริการ' : locale==='en' ? 'I agree to receive workshop and service updates or promotions' : '我同意接收课程与服务更新或促销信息'}
                  </span>
                </label>
              </div>
                    <span className="text-slate-600">{t('summary.topic')}</span>
                    <span className="font-semibold text-slate-900">{topics.find(o=>o.key===topic)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">{locale==='th' ? 'ภาษา' : locale==='en' ? 'Language' : '语言'}</span>
                    <span className="font-semibold text-slate-900">{workshopLanguage==='th' ? (locale==='zh' ? '泰语' : 'ไทย') : (locale==='zh' ? '英语' : 'English')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t('summary.date')}</span>
                    <span className="font-semibold text-slate-900">{date || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t('summary.time')}</span>
                    <span className="font-semibold text-slate-900">{timeChoice ? (timeChoice==='morning' ? '09:00 - 11:30' : '14:00 - 16:00') : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t('summary.attendees')}</span>
                    <span className="font-semibold text-slate-900">{attendees}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t('summary.pricePer')}</span>
                    <span className="font-semibold text-slate-900">{priceMap[serverTopicLabel[topic]] || 890} THB</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-900">{t('summary.total')}</span>
                      <span className="text-xl font-extrabold text-slate-900">{totalAmount.toLocaleString()} THB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop/tablet pay button */}
          <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 mt-2 sm:mt-0">
            <button 
              type="button"
              onClick={goToPayment}
              disabled={!canSubmit}
              className={`w-full rounded-xl py-4 px-6 font-medium transition-all duration-200 ${canSubmit ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              title={!canSubmit ? (locale==='th' ? 'กรุณากรอกข้อมูลให้ครบถ้วน' : locale==='en' ? 'Please complete all required fields' : '请完整填写所有必填项') : ''}
            >
              {locale==='th' ? 'ชำระเงิน' : locale==='en' ? 'ชำระเงิน' : '支付'}
            </button>
          </div>
        </form>

        {/* Payment section moved to /workshops/payment */}
      </div>

      {/* Mobile bottom button */}
      <div className="sm:hidden px-4 pb-8">
        <button
          type="button"
          onClick={goToPayment}
          disabled={!canSubmit}
          className={`w-full rounded-xl py-4 px-6 font-medium transition-colors ${canSubmit ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          title={!canSubmit ? (locale==='th' ? 'กรุณากรอกข้อมูลให้ครบถ้วน' : locale==='en' ? 'Complete required fields' : '完成必填项') : ''}
        >
          {locale==='th' ? 'ชำระเงิน' : locale==='en' ? 'ชำระเงิน' : '支付'}
        </button>
      </div>
    </div>
  )
}