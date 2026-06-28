'use client';
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Home,
  Building2,
  Store,
  Hotel,
  Map as MapIcon,
  Ruler,
  CheckCircle2,
  ChevronRight,
  Check,
  ArrowRight,
  Sparkles,
  X,
  MapPin,
  Loader2,
  Phone,
  User,
  CalendarDays,
  Clock,
  Info,
  Activity,
  Maximize2,
  TreeDeciduous,
  ImagePlus
} from 'lucide-react'
import XYLLoader from '@/components/loaders/XYLLoader'
import { useAuth } from '@/lib/AuthContext'
import { useI18n } from '@/lib/I18nContext'
import {
  createHouse,
  createMeasurementRequest,
  findBranchByZipCode,
  getHouseCount,
} from '@/lib/supabaseClient'
import { useToastContext } from '@/components/Toast'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'

const GoogleMapsLocationPicker = dynamic(
  () => import('@/components/GoogleMapsLocationPicker'),
  { ssr: false }
)

const MAPS_LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ['places']

/** * --- ส่วนของดีไซน์และสไตล์ (STYLES) --- */
const StyleTag = () => (
  <style>{`
    :root {
      --ios-spring: cubic-bezier(0.19, 1, 0.22, 1);
    }
    
    .btn-minimal {
      transition: all 0.4s var(--ios-spring);
      opacity: 0.4;
      cursor: pointer;
    }
    .btn-minimal:hover { opacity: 1; color: var(--customer-accent); }
    .btn-minimal:active { transform: scale(0.92); }

    .thai-vowel-fix {
      overflow: visible !important;
    }

    .architectural-input {
      border: 1px solid var(--customer-line) !important;
      background: #fff !important;
      color: var(--customer-ink) !important;
      padding: 1rem 1rem !important;
      transition: border-color 0.6s var(--ios-spring);
    }
    .architectural-input:focus {
      border-color: var(--customer-accent) !important;
    }

    html, body {
      overflow-x: hidden !important;
      min-height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100%;
    }

    .step-fade-enter { opacity: 0; transform: translateY(10px); }
    .step-fade-active { opacity: 1; transform: translateY(0); transition: all 0.5s var(--ios-spring); }
  `}</style>
)

const DesignerTypewriter = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('')
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    setDisplayedText('')
    let i = 0
    const timer = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1))
      i++
      if (i === text.length) {
        clearInterval(timer)
        setTimeout(() => onCompleteRef.current?.(), 300)
      }
    }, 20)
    return () => clearInterval(timer)
  }, [text])

  return (
    <div className="py-2 thai-vowel-fix min-h-[100px]">
      <h1
        className="font-serif-thai text-[26px] font-light leading-[1.35] text-[#111111] md:text-4xl text-balance"
        style={{
          whiteSpace: 'pre-wrap',
          paddingTop: '0.4em'
        }}
      >
        {displayedText}
        <span className="ml-2 inline-block h-[0.7em] w-[2px] animate-pulse align-middle bg-[#111111]" />
      </h1>
    </div>
  )
}

/** * --- คอมโพเนนต์หลัก (Page) --- */
export default function AddHousePage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { locale } = useI18n()
  const { success, error: showError } = useToastContext()

  const [step, setStep] = useState(1)
  const [isMounted, setIsMounted] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [showInput, setShowInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBranchChecking, setIsBranchChecking] = useState(false)
  const [branchCode, setBranchCode] = useState('')
  const [branchName, setBranchName] = useState('')
  const [branchLookupError, setBranchLookupError] = useState<string | null>(null)
  const [addressOptions, setAddressOptions] = useState<any[]>([])
  const [isAddressLookupLoading, setIsAddressLookupLoading] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [googleSuggestions, setGoogleSuggestions] = useState<any[]>([])
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '', type: '', postcode: '', address: '',
    subdistrict: '', district: '', province: '',
    areaSize: '', areaUnit: 'ตร.ว.', requestMeasurement: false,
    contactName: '', contactPhone: '', availableDays: [] as string[],
    serviceTime: '', customTime: '',
    imageFile: null as File | null, imagePreview: ''
  })

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  const copy = {
    th: {
      next: 'ดำเนินการต่อ',
      save: 'ยืนยันข้อมูลโครงการ',
      saving: 'กำลังส่งข้อมูลโครงการ...',
      done: 'กลับสู่หน้าหลัก',
      phase: 'STEP',
      branch: 'สตูดิโอที่ดูแล',
      sqm: 'ตร.ม.',
      sqwa: 'ตร.ว.'
    },
    en: {
      next: 'Continue',
      save: 'Confirm Project',
      saving: 'Submitting Project...',
      done: 'Return to Hub',
      phase: 'STEP',
      branch: 'Assigned Studio',
      sqm: 'sqm',
      sqwa: 'sq.wa.'
    }
  }[locale as 'th' | 'en'] || { next: 'Next' }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || !profile) return

    const checkExistingHouse = async () => {
      try {
        const { data: houseCount } = await getHouseCount(profile.id)
        if (houseCount && houseCount > 0) {
          router.replace('/dashboard/customer/houses/add-quick')
        } else {
          setIsCheckingStatus(false)
        }
      } catch (err) {
        console.error('House check failed', err)
        setIsCheckingStatus(false)
      }
    }
    checkExistingHouse()
  }, [isMounted, profile, router])

  useEffect(() => {
    if (showInput && inputRef.current) inputRef.current.focus()
  }, [showInput, step])

  useEffect(() => {
    if (step === 6) {
      const timer = setTimeout(() => {
        router.push('/dashboard/customer?welcome=true')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [step, router])

  if (!isMounted || isCheckingStatus) return (
    <div className="min-h-screen bg-white">
      <XYLLoader tagline="Verifying Identity" />
    </div>
  )

  // Helper functions
  const searchGooglePlaces = (query: string) => {
    if (typeof window === 'undefined' || !window.google || !query || query.length < 3) {
      setGoogleSuggestions([])
      return
    }

    setIsSearchingGoogle(true)
    if (!window.google?.maps?.places) {
      setIsSearchingGoogle(false)
      return
    }
    const service = new window.google.maps.places.AutocompleteService()
    service.getPlacePredictions({
      input: query,
      componentRestrictions: { country: 'th' },
      types: ['address', 'establishment']
    }, (predictions, status) => {
      setIsSearchingGoogle(false)
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        setGoogleSuggestions(predictions)
      } else {
        setGoogleSuggestions([])
      }
    })
  }

  const handleSelectGoogleSuggestion = (prediction: any) => {
    setFormData(prev => ({ ...prev, address: prediction.description }))
    setGoogleSuggestions([])

    if (!window.google?.maps?.Geocoder) return
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const addr = results[0].address_components
        const subdistrict = addr.find(c => c.types.includes('sublocality_level_1'))?.long_name ||
          addr.find(c => c.types.includes('locality'))?.long_name || ''
        const district = addr.find(c => c.types.includes('administrative_area_level_2'))?.long_name || ''
        const province = addr.find(c => c.types.includes('administrative_area_level_1'))?.long_name || ''

        setLatitude(results[0].geometry.location.lat())
        setLongitude(results[0].geometry.location.lng())

        if (subdistrict || district || province) {
          setFormData(prev => ({
            ...prev,
            subdistrict: subdistrict.replace('แขวง ', '').replace('ตำบล ', ''),
            district: district.replace('เขต ', '').replace('อำเภอ ', ''),
            province: province.replace('จังหวัด ', '')
          }))
        }
      }
    })
  }

  const handleLocationSelect = (location: any) => {
    setLatitude(location.lat)
    setLongitude(location.lng)
  }

  const lookupThaiAddressByPostcode = async (postcode: string) => {
    setIsAddressLookupLoading(true)
    try {
      const { searchAddressByZipcode } = await import('thai-address-database')
      const records = (searchAddressByZipcode(postcode) || [])

      const optionMap = new Map()
      for (const record of records) {
        const subdistrict = record.district?.trim() || ''
        const district = record.amphoe?.trim() || ''
        const province = record.province?.trim() || ''
        if (!subdistrict || !district || !province) continue
        const key = `${subdistrict}|${district}|${province}`
        if (!optionMap.has(key)) optionMap.set(key, { subdistrict, district, province })
      }

      const options = Array.from(optionMap.values())
      setAddressOptions(options)
      if (options.length > 0) {
        setFormData(prev => ({
          ...prev,
          subdistrict: options[0].subdistrict,
          district: options[0].district,
          province: options[0].province
        }))
      }
    } catch (e) {
      console.error('Address lookup error', e)
    } finally {
      setIsAddressLookupLoading(false)
    }
  }

  const lookupBranch = async (val?: string): Promise<{ ok: boolean }> => {
    const zip = val || formData.postcode
    if (zip.length !== 5) return { ok: false }

    setIsBranchChecking(true)
    setBranchLookupError(null)
    setBranchName('')
    setBranchCode('')

    try {
      const { data, error } = await findBranchByZipCode(zip)
      setIsBranchChecking(false)

      if (error || !data) {
        setBranchLookupError('ขออภัย พื้นที่ ' + zip + ' ยังไม่อยู่ในเขตพื้นที่ให้บริการของทีม XYLEM LANDSCAPE')
        return { ok: false }
      }

      await lookupThaiAddressByPostcode(zip)
      setBranchCode(data.branch_code)
      setBranchName(data.branch_name)
      return { ok: true }
    } catch (err) {
      setIsBranchChecking(false)
      return { ok: false }
    }
  }

  const canGoNext = () => {
    switch (step) {
      case 1: return formData.name.trim().length >= 2 && formData.type !== ''
      case 2: return formData.postcode.length === 5 && !!branchCode && !branchLookupError
      case 3: return formData.address.trim().length > 2 && formData.subdistrict !== ''
      case 4: return formData.requestMeasurement || formData.areaSize !== ''
      case 5: return formData.contactName.trim().length >= 2 && formData.contactPhone.length >= 9 && formData.availableDays.length > 0 && (formData.serviceTime !== '' || formData.customTime.trim() !== '')
      default: return true
    }
  }

  const goToNextStep = async () => {
    if (isExiting || isSubmitting) return
    if (!canGoNext()) return

    if (step === 2 && !branchCode) {
      const pass = await lookupBranch()
      if (!pass.ok) return
    }

    setIsExiting(true)
    setTimeout(() => {
      setStep(s => s + 1)
      setShowInput(false)
      setIsExiting(false)
    }, 450)
  }

  const handleSubmit = async () => {
    if (isSubmitting || !profile) return
    setIsSubmitting(true)

    const houseTypeMap: Record<string, string> = {
      house: 'บ้านพักอาศัย',
      resort: 'โรงแรม/รีสอร์ท',
      cafe: 'พาณิชย์/คาเฟ่',
      condo: 'โครงการอาคาร',
    }

    try {
      const areaValue = formData.areaSize === '' ? null : Number(formData.areaSize)
      const areaSqm = areaValue
        ? formData.areaUnit === 'ตร.ว.'
          ? Math.round(areaValue * 4)
          : Math.round(areaValue)
        : undefined

      const timeSlotMap: Record<string, { start: string; end: string }> = {
        '09:00 - 12:00': { start: '09:00', end: '12:00' },
        '13:00 - 16:00': { start: '13:00', end: '16:00' },
        '16:00 - 18:00': { start: '16:00', end: '18:00' },
      }

      const parsedWindow = timeSlotMap[formData.serviceTime] || { start: '09:00', end: '18:00' }

      const housePayload = {
        user_id: profile.id,
        customer_id: profile.id,
        name: formData.name.trim(),
        house_type: houseTypeMap[formData.type] || formData.type,
        zip_code: formData.postcode,
        address: formData.address.trim(),
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        area_size: areaSqm,
        branch_code: branchCode,
        contact_person: formData.contactName.trim(),
        phone_number: formData.contactPhone,
        service_days: formData.availableDays.map(day => day.toUpperCase()),
        operating_hour_start: parsedWindow.start,
        operating_hour_end: parsedWindow.end,
      }

      const { data: houseData, error: houseError } = await createHouse(housePayload)
      if (houseError) throw houseError

      if (formData.requestMeasurement && houseData?.house_code) {
        await createMeasurementRequest({
          house_code: houseData.house_code,
          customer_id: profile.id,
          request_type: 'new_house_measurement',
          priority_level: 'normal',
          preferred_time_start: parsedWindow.start,
          preferred_time_end: parsedWindow.end,
          branch_code: branchCode,
          special_instructions: formData.customTime || 'คำขอวัดพื้นที่จากหน้าฟอร์มเพิ่มบ้าน'
        })
      }

      if (formData.imageFile && houseData?.id) {
        // Compress image client-side to avoid Vercel 4.5MB limit
        let compressedFile = formData.imageFile
        try {
          const { compressImage } = await import('@/lib/utils/image')
          compressedFile = await compressImage(formData.imageFile)
        } catch (err) {
          console.error('Failed to compress image, using original', err)
        }

        // Safari Bug Fix: Rename file to ASCII only
        let extension = 'jpg'
        if (compressedFile.name.includes('.')) {
          extension = compressedFile.name.split('.').pop() || 'jpg'
        } else if (compressedFile.type) {
          extension = compressedFile.type.split('/').pop() || 'jpg'
        }
        if (!/^[a-zA-Z0-9]+$/.test(extension)) {
          extension = 'jpg'
        }
        const safeFile = new File([compressedFile], `image_upload_${Date.now()}.${extension}`, { type: compressedFile.type })

        const fileData = new FormData()
        fileData.append('file', safeFile)
        fileData.append('houseId', houseData.id)

        try {
          const { supabase } = await import('@/lib/supabaseClient')
          const { data: sessionData } = await supabase.auth.getSession()
          const token = sessionData.session?.access_token

          await fetch('/api/customer/houses/upload-image', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: fileData
          })
        } catch (e) {
          console.error("Image upload failed:", e)
        }
      }

      setStep(6)
    } catch (err: any) {
      console.error("Save House Error:", err)
      const errorMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : 'ไม่สามารถบันทึกข้อมูลได้')
      showError(`เกิดข้อผิดพลาด: ${errorMsg}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const propertyTypes = [
    { id: 'house', label: 'บ้านพักอาศัย', icon: Home },
    { id: 'resort', label: 'โรงแรม/รีสอร์ท', icon: Hotel },
    { id: 'cafe', label: 'พาณิชย์/คาเฟ่', icon: Store },
    { id: 'condo', label: 'โครงการอาคาร', icon: Building2 },
  ]

  const daysOfWeek = [
    { id: 'mon', label: 'จ.' }, { id: 'tue', label: 'อ.' }, { id: 'wed', label: 'พ.' },
    { id: 'thu', label: 'พฤ.' }, { id: 'fri', label: 'ศ.' }, { id: 'sat', label: 'ส.' },
    { id: 'sun', label: 'อา.' },
  ]

  const primaryActionClass = 'customer-editorial-button-primary w-full justify-center disabled:opacity-10 disabled:pointer-events-none'
  const secondaryActionClass = 'customer-editorial-button-secondary w-full justify-between !px-6 !py-5'

  return (
    <div className="customer-editorial-page flex min-h-[100dvh] flex-col">
      <StyleTag />

      <div className="fixed left-0 top-0 z-50 h-[3px] w-full bg-[var(--customer-line)]">
        <div
          className="h-full bg-[var(--customer-ink)] transition-all duration-700 ease-out"
          style={{ width: `${(step / 6) * 100}%` }}
        />
      </div>

      <header className="w-full !px-6 grid grid-cols-3 h-20 items-center border-b border-[var(--customer-line)] bg-white">
        <div className="flex justify-start">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className={`customer-editorial-icon-button ${step === 6 ? 'pointer-events-none opacity-0' : ''}`}
              type="button"
            >
              <ArrowLeft size={18} strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="flex justify-center items-center pointer-events-none">
          <span className="text-[10px] font-bold text-[#A3A3A3] tracking-[0.24em] uppercase">
            {step < 6 ? `${copy.phase} 0${step}` : ''}
          </span>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => router.back()}
            className={`customer-editorial-icon-button ${step === 6 ? 'pointer-events-none opacity-0' : ''}`}
            type="button"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="customer-editorial-container thai-vowel-fix flex flex-1 flex-col justify-start md:justify-center pt-8 md:pt-0 pb-32 md:pb-10 !px-6 md:!max-w-3xl">
        <AnimatePresence mode="wait">
          {!isExiting && step < 6 && (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
            >
              {step === 1 && (
                <div className="space-y-12">
                  <DesignerTypewriter text={`เริ่มต้นโครงการใหม่\nคุณอยากให้เราเรียกสถานที่นี้ว่าอะไรดีครับ?`} onComplete={() => setShowInput(true)} />
                  <div className={`space-y-10 transition-all duration-1000 delay-200 ${showInput ? 'opacity-100' : 'opacity-0'}`}>
                    <input
                      ref={el => { if (el) inputRef.current = (el as any) }}
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={locale === 'en' ? 'Waterfront villa, private garden...' : locale === 'zh' ? '海滨别墅、私家花园……' : 'วิลล่าริมน้ำ, สวนส่วนตัว...'}
                      className="architectural-input w-full text-3xl font-light placeholder:text-[var(--customer-muted)]"
                    />

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {propertyTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setFormData({ ...formData, type: type.id })}
                          style={formData.type === type.id ? { backgroundColor: '#111111', color: '#ffffff', borderColor: '#111111' } : {}}
                          className={`flex flex-col items-center justify-center gap-4 p-6 transition-all duration-300 border ${formData.type === type.id ? '' : 'bg-white border-[#E5E5DF] text-[#111111] hover:border-[#111111]'}`}
                          type="button"
                        >
                          <type.icon size={24} strokeWidth={1.2} />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-center">{type.label}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={goToNextStep}
                      disabled={!canGoNext()}
                      className={primaryActionClass}
                      type="button"
                    >
                      {copy.next}
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-12">
                  <DesignerTypewriter text={`ตรวจสอบพื้นที่ให้บริการ\nขอทราบรหัสไปรษณีย์ของโครงการหน่อยครับ`} onComplete={() => setShowInput(true)} />
                  <div className={`transition-all duration-1000 delay-200 ${showInput ? 'opacity-100' : 'opacity-0'}`}>
                    <input
                      ref={el => { if (el) inputRef.current = (el as any) }}
                      type="tel"
                      maxLength={5}
                      value={formData.postcode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                        setFormData({ ...formData, postcode: val });
                        if (val.length === 5) {
                          lookupBranch(val);
                        } else {
                          setBranchLookupError(null);
                          setBranchName('');
                          setBranchCode('');
                        }
                      }}
                      placeholder="00000"
                      className="architectural-input w-full text-7xl font-light tracking-tighter placeholder:text-[var(--customer-muted)]"
                    />

                    <AnimatePresence>
                      {isBranchChecking && (
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="mt-8 text-[9px] font-bold text-[#A3A3A3] uppercase tracking-[0.4em] animate-pulse flex items-center gap-2"
                        >
                          <Activity size={12} /> Syncing architectural service nodes...
                        </motion.div>
                      )}

                      {branchName && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          className="mt-8 p-6 text-white"
                          style={{ backgroundColor: '#1d2d24', border: '1px solid #1d2d24' }}
                        >
                          <div className="text-[8px] font-bold opacity-40 uppercase tracking-[0.4em] mb-3">{copy.branch}</div>
                          <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-[0.2em]">
                            <Sparkles size={16} className="text-white" /> {branchName}
                          </div>
                          <div className="mt-4 text-[9px] font-medium opacity-60 uppercase tracking-widest leading-loose">
                            {locale === 'en' ? 'Local architects are ready to take care of your project.' : locale === 'zh' ? '当地建筑师已准备好照顾您的项目。' : '                             สถาปนิกในพื้นที่พร้อมดูแลโครงการของคุณแล้ว                           '}</div>
                        </motion.div>
                      )}

                      {branchLookupError && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="mt-8 p-8 border-2 border-red-500 bg-red-50 text-red-900"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Info size={18} className="text-red-600" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{locale === 'en' ? 'This area may not yet support service.' : locale === 'zh' ? '该区域可能尚不支持服务。' : 'พื้นที่นี้อาจจะยังไม่รองรับการให้บริการครับ'}</span>
                          </div>
                          <div className="text-[11px] font-bold leading-relaxed">
                            {branchLookupError}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={goToNextStep}
                      disabled={!canGoNext() || isBranchChecking || !!branchLookupError || !branchCode}
                      className={`mt-12 ${primaryActionClass}`}
                      type="button"
                    >
                      {isBranchChecking ? 'กำลังตรวจสอบ...' : copy.next}
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-10">
                  <DesignerTypewriter text={`ตำแหน่งสถานที่ตั้งโครงการ\nเพื่อความแม่นยำในการส่งทีมงานเข้าไปดูแลครับ`} onComplete={() => setShowInput(true)} />
                  <div className={`space-y-8 transition-all duration-1000 delay-200 ${showInput ? 'opacity-100' : 'opacity-0'}`}>
                    <button onClick={() => setShowMapPicker(true)} className={secondaryActionClass} type="button">
                      <div className="flex items-center gap-4">
                        <MapIcon size={20} strokeWidth={1.5} className="text-[#111111]" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{latitude ? 'ปักหมุดสำเร็จ' : 'เลือกตำแหน่งจากแผนที่'}</span>
                      </div>
                      <Maximize2 size={16} strokeWidth={1.5} className="text-[#A3A3A3]" />
                    </button>

                    <textarea
                      rows={2}
                      value={formData.address}
                      onBlur={() => setTimeout(() => setGoogleSuggestions([]), 200)}
                      onChange={(e) => { setFormData({ ...formData, address: e.target.value }); searchGooglePlaces(e.target.value); }}
                      placeholder={locale === 'en' ? 'House numbers, streets and landmarks...' : locale === 'zh' ? '门牌号码、街道和地标......' : 'เลขที่บ้าน, ถนน และจุดสังเกต...'}
                      className="architectural-input w-full resize-none text-xl font-light placeholder:text-[var(--customer-muted)]"
                    />

                    <div>
                      {formData.imagePreview ? (
                        <div className="relative h-48 w-full overflow-hidden border border-[#E5E5DF]">
                          <img src={formData.imagePreview} alt="House Preview" className="h-full w-full object-cover" />
                          <button
                            onClick={() => setFormData({ ...formData, imageFile: null, imagePreview: '' })}
                            className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-black shadow-md"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-[#E5E5DF] bg-[#FAFAFA] py-8 transition-colors hover:bg-white">
                          <ImagePlus size={24} className="text-[#A3A3A3]" />
                          <div className="text-center">
                            <div className="text-[10px] font-bold tracking-[0.2em] text-[#111111] uppercase">{locale === 'en' ? 'Upload a picture of the house' : locale === 'zh' ? '上传房子的照片' : 'อัปโหลดรูปบ้าน'}</div>
                            <div className="mt-1 text-[11px] text-gray-500">{locale === 'en' ? 'To have beautiful pictures Let the team look at it as an idea.' : locale === 'zh' ? '要有漂亮的图片 让团队将其视为一个想法。' : 'เผื่อมีรูปสวยๆ ให้ทีมงานดูเป็นไอเดียครับ'}</div>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setFormData({
                                  ...formData,
                                  imageFile: file,
                                  imagePreview: URL.createObjectURL(file)
                                })
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {googleSuggestions.length > 0 && (
                      <div className="customer-editorial-list absolute left-0 right-0 z-50 mt-2 overflow-hidden shadow-2xl">
                        {googleSuggestions.map((s) => (
                          <button
                            key={s.place_id}
                            onClick={() => handleSelectGoogleSuggestion(s)}
                            className="customer-editorial-list-item w-full text-left hover:bg-[var(--customer-paper)]"
                            type="button"
                          >
                            <MapPin size={14} className="text-[#1D2D24] shrink-0" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#111111] truncate">{s.description}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {addressOptions.length > 0 && (
                      <div className="customer-editorial-panel p-6">
                        <div>
                          <label className="customer-editorial-label">{locale === 'en' ? 'Select zone/subdistrict (Zone Detection)' : locale === 'zh' ? '选择区域/分区（区域检测）' : 'เลือกเขต / แขวง (Zone Detection)'}</label>
                          <select
                            value={formData.subdistrict}
                            onChange={(e) => {
                              const opt = addressOptions.find(o => o.subdistrict === e.target.value)
                              if (opt) setFormData(prev => ({ ...prev, subdistrict: opt.subdistrict, district: opt.district, province: opt.province }))
                            }}
                            className="customer-editorial-select text-[10px] font-bold uppercase tracking-[0.1em]"
                          >
                            {addressOptions.map(opt => (
                              <option key={opt.subdistrict} value={opt.subdistrict}>{opt.subdistrict}, {opt.district}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <button onClick={goToNextStep} disabled={!canGoNext()} className={`mt-8 ${primaryActionClass}`} type="button">
                      {copy.next}
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-12">
                  <DesignerTypewriter text={`ขนาดพื้นที่โดยประมาณ\nสำหรับการประเมินและวางผังสเปซเบื้องต้นครับ`} onComplete={() => setShowInput(true)} />
                  <div className={`space-y-12 transition-all duration-1000 delay-200 ${showInput ? 'opacity-100' : 'opacity-0'}`}>
                    <div className={`${formData.requestMeasurement ? 'opacity-10 pointer-events-none blur-[2px]' : ''} transition-all duration-700`}>
                      <div className="flex items-center gap-4 pb-4 border-b border-[#E5E5DF] focus-within:border-[#111111] transition-colors">
                        <input type="number" value={formData.areaSize} onChange={(e) => setFormData({ ...formData, areaSize: e.target.value })} placeholder="0" className="w-full min-w-0 bg-transparent text-6xl md:text-8xl font-light tracking-tighter outline-none" />
                        <div className="flex shrink-0 border border-[#E5E5DF] bg-[#FAFAFA] p-1 rounded-sm">
                          {[copy.sqwa, copy.sqm].map(unit => (
                            <button
                              key={unit}
                              onClick={() => setFormData({ ...formData, areaUnit: unit })}
                              className={`px-3 py-2 text-[10px] font-bold tracking-widest transition-all rounded-sm ${formData.areaUnit === unit ? 'bg-[#111111] text-white shadow-sm' : 'text-[#A3A3A3]'}`}
                              type="button"
                            >
                              {unit}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setFormData({ ...formData, requestMeasurement: !formData.requestMeasurement, areaSize: '' })}
                      style={formData.requestMeasurement ? { backgroundColor: '#111111', color: '#ffffff', borderColor: '#111111' } : {}}
                      className={`w-full transition-all duration-500 flex items-center justify-between p-10 border ${formData.requestMeasurement ? '' : 'bg-white border-[#E5E5DF] text-[#111111]'}`}
                      type="button"
                    >
                      <div className="flex items-center gap-8 text-left">
                        <Ruler size={32} strokeWidth={1} className={formData.requestMeasurement ? 'text-white' : 'text-[#A3A3A3]'} />
                        <div>
                          <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2">{locale === 'en' ? 'Want a team to measure the area' : locale === 'zh' ? '想要一个团队来测量面积' : 'ต้องการให้ทีมงานเข้าวัดพื้นที่'}</div>
                          <div className="text-[11px] font-medium leading-relaxed opacity-60">{locale === 'en' ? 'XYL STUDIO will send a team to evaluate and measure the area at the work site.' : locale === 'zh' ? 'XYL STUDIO 将派出一个团队来评估和测量工作现场的面积。' : 'ทาง XYL STUDIO จะจัดส่งทีมงานเข้าไปประเมินและวัดพื้นที่หน้างานให้ครับ'}</div>
                        </div>
                      </div>
                      {formData.requestMeasurement && <Check size={20} className="text-white" />}
                    </button>
                    <button onClick={goToNextStep} disabled={!canGoNext()} className={primaryActionClass} type="button">
                      {copy.next}
                    </button>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-10">
                  <DesignerTypewriter text={`รายละเอียดการติดต่อ\nสะดวกให้ทีมงานติดต่อกลับช่วงไหนดีครับ?`} onComplete={() => setShowInput(true)} />
                  <div className={`space-y-10 transition-all duration-1000 delay-200 ${showInput ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="customer-editorial-grid two gap-4">
                      <div className="customer-editorial-panel p-6">
                        <label className="customer-editorial-label">{locale === 'en' ? 'Contact Name (Coordinator Name)' : locale === 'zh' ? '联系人姓名（协调员姓名）' : 'ชื่อผู้ติดต่อ (Coordinator Name)'}</label>
                        <input type="text" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} placeholder={locale === 'en' ? 'Type your name...' : locale === 'zh' ? '输入你的名字...' : 'พิมพ์ชื่อของคุณ...'} className="architectural-input w-full text-sm font-bold uppercase tracking-widest" />
                      </div>
                      <div className="customer-editorial-panel p-6">
                        <label className="customer-editorial-label">{locale === 'en' ? 'Telephone number (Line / Phone)' : locale === 'zh' ? '电话号码（线路/电话）' : 'เบอร์โทรศัพท์ (Line / Phone)'}</label>
                        <input type="tel" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value.replace(/\D/g, '') })} placeholder="0xx-xxx-xxxx" className="architectural-input w-full text-sm font-bold uppercase tracking-widest" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="customer-editorial-label">{locale === 'en' ? 'Convenient day to contact (Availability Window)' : locale === 'zh' ? '方便联系的日子（可用窗口）' : 'วันที่สะดวกให้ติดต่อ (Availability Window)'}</div>
                      <div className="grid grid-cols-7 gap-2">
                        {daysOfWeek.map(day => (
                          <button
                            key={day.id}
                            onClick={() => setFormData(prev => ({ ...prev, availableDays: prev.availableDays.includes(day.id) ? prev.availableDays.filter(d => d !== day.id) : [...prev.availableDays, day.id] }))}
                            style={formData.availableDays.includes(day.id) ? { backgroundColor: '#1d2d24', color: '#fff', borderColor: '#1d2d24' } : {}}
                            className={`border px-2 py-4 text-[9px] font-bold uppercase tracking-widest transition-all ${formData.availableDays.includes(day.id) ? '' : 'border-[#E5E5DF] bg-white text-[#70706b]'}`}
                            type="button"
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {['09:00 - 12:00', '13:00 - 16:00', '16:00 - 18:00'].map(range => (
                        <button
                          key={range}
                          onClick={() => setFormData({ ...formData, serviceTime: range, customTime: '' })}
                          style={formData.serviceTime === range ? { backgroundColor: '#111111', color: '#fff', borderColor: '#111111' } : {}}
                          className={`border p-6 text-center text-[8px] font-bold tracking-[0.1em] transition-all ${formData.serviceTime === range ? '' : 'border-[#E5E5DF] bg-white text-[#70706b]'}`}
                          type="button"
                        >
                          {range}
                        </button>
                      ))}
                    </div>

                    <div className="customer-editorial-panel p-6">
                      <div className="customer-editorial-label mb-4 flex items-center gap-2"><Info size={12} /> {locale === 'en' ? 'Special Request' : locale === 'zh' ? '特别要求' : ' ความต้องการพิเศษ (Special Request)'}</div>
                      <input type="text" value={formData.customTime} onChange={(e) => setFormData({ ...formData, customTime: e.target.value })} placeholder={locale === 'en' ? 'If there is anything more you can tell us...' : locale === 'zh' ? '如果还有什么可以告诉我们的...' : 'มีอะไรเพิ่มเติมบอกเราได้เลยครับ...'} className="customer-editorial-input !p-0 !border-0 !bg-transparent text-[11px] font-medium" />
                    </div>

                    <button onClick={handleSubmit} disabled={!canGoNext() || isSubmitting} className={primaryActionClass} type="button">
                      {isSubmitting ? copy.saving : copy.save}
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        {step === 6 && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#111111] text-center p-8 animate-in fade-in duration-500">
            <div className="relative mb-12 animate-bounce">
               <Check size={80} strokeWidth={1} className="text-white" />
            </div>
            <div className="space-y-6 max-w-lg mx-auto">
              <h2 className="text-3xl md:text-5xl font-light tracking-widest text-white uppercase">Completed</h2>
              <div className="mx-auto h-[1px] w-12 bg-white/30" />
              <p className="text-sm md:text-lg text-white/60 font-light leading-relaxed px-4">
                {locale === 'en' ? 'project "' : locale === 'zh' ? '项目 ”' : '                 โครงการ "'}{formData.name}{locale === 'en' ? '" has been sent into the system.' : locale === 'zh' ? '”已发送至系统。' : '" ถูกส่งเข้าสู่ระบบแล้ว'}<br />{locale === 'en' ? 'Taking you back to the dashboard...' : locale === 'zh' ? '带您回到仪表板...' : 'กำลังพากลับสู่หน้าแดชบอร์ด...               '}</p>
            </div>
          </div>
        )}
      </main>

      <GoogleMapsLocationPicker
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onLocationSelect={handleLocationSelect}
      />
    </div>
  )
}