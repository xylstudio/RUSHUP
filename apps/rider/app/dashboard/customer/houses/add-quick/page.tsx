'use client';
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Home,
  Building2,
  Store,
  Navigation,
  Phone,
  User,
  Ruler,
  Hotel,
  Check,
  MapPin,
  ChevronDown,
  X,
  Image as ImageIcon
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { createHouse, createMeasurementRequest, findBranchByZipCode } from '@/lib/supabaseClient'
import { useToastContext } from '@/components/Toast'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from "@/lib/I18nContext";

const GoogleMapsLocationPicker = dynamic(
  () => import('@/components/GoogleMapsLocationPicker'),
  { ssr: false }
)

// --- CONSTANTS OUTSIDE THE COMPONENT ---
type PropertyType = 'house' | 'resort' | 'cafe' | 'condo'
type ThaiLocationOption = { district: string; amphoe: string; province: string; zipcode: string }

const defaultFormData = {
  name: '', type: 'house' as PropertyType, postcode: '', subdistrict: '', district: '', province: '',
  address: '', areaSize: '', areaUnit: 'ตร.ว.', requestMeasurement: false, contactName: '',
  contactPhone: '', availableDays: [] as string[], serviceTime: '', customStartTime: '', customEndTime: '',
  imageFile: null as File | null, imagePreview: ''
}

const propertyTypes: Array<{ id: PropertyType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'house', label: 'บ้านเดี่ยว', icon: Home },
  { id: 'resort', label: 'รีสอร์ท', icon: Hotel },
  { id: 'cafe', label: 'พาณิชย์', icon: Store },
  { id: 'condo', label: 'คอนโดมิเนียม', icon: Building2 },
]

const daysOfWeek = [
  { id: 'mon', label: 'จ.' }, { id: 'tue', label: 'อ.' }, { id: 'wed', label: 'พ.' },
  { id: 'thu', label: 'พฤ.' }, { id: 'fri', label: 'ศ.' }, { id: 'sat', label: 'ส.' },
  { id: 'sun', label: 'อา.' },
]

const dayCodeToLabel: Record<string, string> = {
  mon: 'MON', tue: 'TUE', wed: 'WED', thu: 'THU', fri: 'FRI', sat: 'SAT', sun: 'SUN',
}

const houseTypeMap: Record<PropertyType, string> = {
  house: 'บ้านเดี่ยว', resort: 'โรงแรม/รีสอร์ท', cafe: 'คาเฟ่/ร้านอาหาร', condo: 'โครงการหมู่บ้าน/คอนโด',
}

const timeSlots = ['09:00 - 12:00', '13:00 - 16:00', '16:00 - 18:00', 'ระบุเวลาอื่น']

export default function AddHouseQuickPage() {
    const { locale } = useI18n();
  // 1. ALL HOOKS AT THE TOP
  const router = useRouter()
  const { profile } = useAuth()
  const { success, error } = useToastContext()
  
  const [isMounted, setIsMounted] = useState(false)
  const [formData, setFormData] = useState(defaultFormData)
  const [postcodeLocations, setPostcodeLocations] = useState<ThaiLocationOption[]>([])
  const [postcodeLookupError, setPostcodeLookupError] = useState('')
  const [isPostcodeLoading, setIsPostcodeLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [googleSuggestions, setGoogleSuggestions] = useState<any[]>([])
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [branchCode, setBranchCode] = useState('')
  const [branchName, setBranchName] = useState('')

  // 2. STABILIZATION EFFECTS
  useEffect(() => { setIsMounted(true) }, [])

  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        router.push('/dashboard/customer?welcome=true')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [isSubmitted, router])

  // 3. NO CONDITIONAL RETURNS BEFORE THIS LINE
  const isFormValid = useMemo(() => {
    const hasCustomTime = formData.customStartTime !== '' && formData.customEndTime !== ''
    const hasTime = formData.serviceTime !== '' && (formData.serviceTime !== 'ระบุเวลาอื่น' || hasCustomTime)
    const hasArea = formData.requestMeasurement || formData.areaSize.trim() !== ''
    const hasAutoLocation = formData.subdistrict.trim() !== '' && formData.district.trim() !== '' && formData.province.trim() !== ''
    return (
      formData.name.trim() !== '' && formData.postcode.length === 5 && hasAutoLocation && branchCode !== '' &&
      formData.address.trim() !== '' && hasArea && formData.contactName.trim() !== '' &&
      formData.contactPhone.length >= 9 && formData.availableDays.length > 0 && hasTime
    )
  }, [formData, branchCode])

  if (!isMounted) return null

  // 4. HELPER FUNCTIONS
  const handlePostcodeChange = async (raw: string) => {
    const zipcode = raw.replace(/\D/g, '').slice(0, 5)
    setFormData((prev) => ({
      ...prev, postcode: zipcode, ...(zipcode.length < 5 ? { subdistrict: '', district: '', province: '' } : {}),
    }))

    if (zipcode.length < 5) {
      setPostcodeLocations([])
      setPostcodeLookupError('')
      setBranchCode('')
      setBranchName('')
      return
    }

    setIsPostcodeLoading(true)
    setPostcodeLookupError('')
    setBranchCode('')
    setBranchName('')
    
    try {
        const { data: branch, error: branchError } = await findBranchByZipCode(zipcode)
        if (branchError || !branch) {
          setPostcodeLookupError(`ขออภัย พื้นที่ ${zipcode} ยังไม่อยู่ในเขตพื้นที่ให้บริการของทีม XYLEM LANDSCAPE`)
          setPostcodeLocations([])
          setFormData((prev) => ({ ...prev, subdistrict: '', district: '', province: '' }))
          setIsPostcodeLoading(false)
          return
        }
        
        setBranchCode(branch.branch_code)
        setBranchName(branch.branch_name)

        const { searchAddressByZipcode } = await import('thai-address-database')
        const results = (searchAddressByZipcode(zipcode) || []) as ThaiLocationOption[]

      if (!results.length) {
        setPostcodeLocations([])
        setFormData((prev) => ({ ...prev, subdistrict: '', district: '', province: '' }))
        setPostcodeLookupError('ไม่พบข้อมูลตำบลสำหรับรหัสไปรษณีย์นี้')
        return
      }
      const unique = Array.from(new Map(results.map((item) => [`${item.district}|${item.amphoe}|${item.province}`, item])).values())
      const first = unique[0]
      setPostcodeLocations(unique)
      setFormData((prev) => ({
        ...prev, subdistrict: first?.district || '', district: first?.amphoe || '', province: first?.province || '',
      }))
    } catch {
      setPostcodeLocations([])
      setFormData((prev) => ({ ...prev, subdistrict: '', district: '', province: '' }))
      setPostcodeLookupError('ไม่สามารถค้นหาข้อมูลที่อยู่ได้')
    } finally {
      setIsPostcodeLoading(false)
    }
  }

  const searchGooglePlaces = (query: string) => {
    if (typeof window === 'undefined' || !window.google || !query || query.length < 3) {
      setGoogleSuggestions([])
      return
    }

    setIsSearchingGoogle(true)
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

    if (!window.google) return
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

  const toggleDay = (dayId: string) => {
    setFormData((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(dayId) ? prev.availableDays.filter((d) => d !== dayId) : [...prev.availableDays, dayId],
    }))
  }

  const parseServiceWindow = (value: string) => {
    const parts = value.split('-').map((segment) => segment.trim())
    if (parts.length === 2 && /^\d{2}:\d{2}$/.test(parts[0]) && /^\d{2}:\d{2}$/.test(parts[1])) {
      return { start: parts[0], end: parts[1] }
    }
    return { start: '09:00', end: '12:00' }
  }

  const handleSubmit = async () => {
    if (isSubmitting || !isFormValid) return
    if (!profile?.id) {
        error('ไม่พบข้อมูลผู้ใช้ โปรดเข้าสู่ระบบใหม่')
        return
    }

    setIsSubmitting(true)

    try {
        // We already checked branch validity during handlePostcodeChange and blocked submission if invalid
        // But we double check just in case
        const { data: branch, error: branchError } = await findBranchByZipCode(formData.postcode)
        if (branchError || !branch) {
          error('ไม่พบสาขาที่ให้บริการในรหัสไปรษณีย์นี้')
          setIsSubmitting(false)
          return
        }
    
        const areaValue = formData.areaSize === '' ? null : Number(formData.areaSize)
        const areaSqm = areaValue
          ? formData.areaUnit === 'ตร.ว.'
            ? Math.round(areaValue * 4)
            : Math.round(areaValue)
          : undefined
    
        const selectedTime = formData.serviceTime === 'ระบุเวลาอื่น'
          ? `${formData.customStartTime} - ${formData.customEndTime}`
          : formData.serviceTime
        const serviceWindow = parseServiceWindow(selectedTime)
    
        const locationSuffix = `ต.${formData.subdistrict} อ.${formData.district} จ.${formData.province}`
        const normalizedAddress = formData.address.includes(formData.subdistrict) 
            ? formData.address.trim() 
            : `${formData.address.trim()} ${locationSuffix}`.trim()
    
        const { data: house, error: houseError } = await createHouse({
          user_id: profile.id,
          customer_id: profile.id,
          name: formData.name.trim(),
          house_type: houseTypeMap[formData.type],
          zip_code: formData.postcode,
          address: normalizedAddress,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          area_size: areaSqm,
          branch_code: branch.branch_code,
          contact_person: formData.contactName.trim(),
          phone_number: formData.contactPhone,
          service_days: formData.availableDays.map((day) => dayCodeToLabel[day] || day.toUpperCase()),
          operating_hour_start: serviceWindow.start,
          operating_hour_end: serviceWindow.end,
        })
    
        if (houseError || !house) {
          error('บันทึกข้อมูลสถานที่ไม่สำเร็จ')
          setIsSubmitting(false)
          return
        }

        // Upload image if selected
        if (formData.imageFile && house.id) {
          try {
            const { supabase } = await import('@/lib/supabaseClient')
            const { data: sessionData } = await supabase.auth.getSession()
            const token = sessionData.session?.access_token
            
            if (token) {
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

              const uploadData = new FormData()
              uploadData.append('file', safeFile)
              uploadData.append('houseId', house.id)
              
              await fetch('/api/customer/houses/upload-image', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: uploadData,
              })
            }
          } catch (imgError) {
            console.error('Failed to upload image:', imgError)
          }
        }
    
        if (formData.requestMeasurement && house.house_code) {
          const { error: measurementError } = await createMeasurementRequest({
            house_code: house.house_code,
            customer_id: profile.id,
            branch_code: branch.branch_code,
            request_type: 'new_house_measurement',
            priority_level: 'normal',
            preferred_time_start: serviceWindow.start,
            preferred_time_end: serviceWindow.end,
            special_instructions: 'คำขอวัดพื้นที่จากหน้าฟอร์มเพิ่มบ้านแบบรวดเร็ว',
          })
    
          if (measurementError) {
             console.error('Failed to create measurement request', measurementError)
             error('บันทึกบ้านสำเร็จ แต่สร้างคำขอวัดพื้นที่ไม่สำเร็จ')
          }
        }
    
        success('บันทึกข้อมูลสถานที่เรียบร้อยแล้ว')
        setIsSubmitted(true)
    } catch (e) {
        console.error(e)
        error('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
        setIsSubmitting(false)
    }
  }

  // 5. RENDER LOGIC
  // Remove early return for isSubmitted to prevent flash

  return (
    <div className="customer-editorial-page selection:bg-[#111111] selection:text-white">
      <header className="fixed top-0 w-full z-40 bg-white/90 backdrop-blur-md border-b border-[#EAE5DA]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#111111] hover:text-[#A3A3A3] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>{locale === 'en' ? 'retrospective' : locale === 'zh' ? '回顾性的' : 'ย้อนกลับ'}</span>
          </button>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A3A3A3]">{locale === 'en' ? 'Add a new location' : locale === 'zh' ? '添加新位置' : 'เพิ่มสถานที่ใหม่'}</span>
          <div className="w-20" /> {/* Spacer to balance the header */}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-40 lg:grid lg:grid-cols-12 lg:gap-24">
        <div className="lg:col-span-4 hidden lg:block">
          <div className="sticky top-32 space-y-10">
            <h1 className="font-serif-thai text-7xl font-light tracking-tighter text-[#111111] leading-none uppercase">
              {locale === 'en' ? 'location' : locale === 'zh' ? '地点' : '               สถานที่'}<br/>{locale === 'en' ? 'new' : locale === 'zh' ? '新的' : 'ใหม่             '}</h1>
            <p className="text-sm font-light text-[#666666] leading-relaxed max-w-xs">
              {locale === 'en' ? 'Please provide details and spatial information for receiving our services.' : locale === 'zh' ? '请提供详细信息和空间信息以接受我们的服务。' : '               โปรดระบุรายละเอียดและข้อมูลเชิงพื้นที่สำหรับการเข้ารับบริการของเรา             '}</p>
            <div className="pt-12 space-y-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A3A3A3]">
              <div className="flex items-center gap-4 text-[#111111]">
                <span className="w-8 border-b border-[#111111]"></span>
                <span>{locale === 'en' ? '01. Basic information' : locale === 'zh' ? '01. 基本信息' : '01. ข้อมูลเบื้องต้น'}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-4 border-b border-transparent"></span>
                <span>{locale === 'en' ? '02. Location' : locale === 'zh' ? '02. 地点' : '02. ที่ตั้ง'}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-4 border-b border-transparent"></span>
                <span>{locale === 'en' ? '03. Area size' : locale === 'zh' ? '03. 面积大小' : '03. ขนาดพื้นที่'}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-4 border-b border-transparent"></span>
                <span>{locale === 'en' ? '04. Contact' : locale === 'zh' ? '04. 联系方式' : '04. การติดต่อ'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:hidden mb-16 space-y-6">
          <h1 className="font-serif-thai text-5xl font-light tracking-tighter text-[#111111] leading-none">{locale === 'en' ? 'new place' : locale === 'zh' ? '新地方' : 'สถานที่ใหม่'}</h1>
          <p className="text-sm font-light text-[#666666] leading-relaxed">{locale === 'en' ? 'Please provide details of your location.' : locale === 'zh' ? '请提供您所在位置的详细信息。' : 'โปรดระบุรายละเอียดสถานที่ของคุณ'}</p>
        </div>

        <main className="lg:col-span-8 space-y-32">
          <section className="space-y-12 relative">
            <div className="absolute -left-20 top-0 hidden xl:block text-[#F0F0F0] text-7xl font-serif-thai font-light select-none">01</div>
            <h2 className="text-[13px] font-bold tracking-[0.3em] uppercase border-b border-[#E5E5E5] pb-4 text-[#111111]">{locale === 'en' ? 'Basic information' : locale === 'zh' ? '基本信息' : 'ข้อมูลเบื้องต้น'}</h2>
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Place name *' : locale === 'zh' ? '地名 *' : 'ชื่อสถานที่ *'}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={locale === 'en' ? 'such as Baan Vibhavadi, Cafe Branch 2' : locale === 'zh' ? '例如 Baan Vibhavadi, Cafe Branch 2' : 'เช่น บ้านวิภาวดี, คาเฟ่สาขา 2'}
                className="w-full bg-transparent border-b border-[#E5E5E5] py-4 text-2xl font-light focus:outline-none focus:border-[#111111] transition-colors rounded-none placeholder:text-[#E5E5E5] text-[#111111]"
              />
            </div>
            <div className="space-y-6 pt-4">
              <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Location type' : locale === 'zh' ? '位置类型' : 'ประเภทสถานที่'}</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {propertyTypes.map((type) => {
                  const isSelected = formData.type === type.id
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.id })}
                      className={`flex flex-col items-center justify-center gap-4 py-8 px-4 border transition-all duration-300 rounded-none ${
                        isSelected 
                          ? 'border-[#111111] bg-[#111111] text-white shadow-[4px_4px_0px_0px_rgba(230,230,230,1)]' 
                          : 'border-[#E5E5E5] bg-transparent text-[#A3A3A3] hover:border-[#111111] hover:text-[#111111]'
                      }`}
                    >
                      <type.icon className={`w-8 h-8 stroke-[1] ${isSelected ? 'text-white' : ''}`} />
                      <span className="text-[11px] font-bold tracking-[0.1em]">{type.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Place pictures' : locale === 'zh' ? '放置图片' : 'รูปภาพสถานที่'}</label>
              </div>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E5E5E5] p-8 cursor-pointer hover:border-[#111111] transition-colors bg-[var(--customer-paper)]">
                {formData.imagePreview ? (
                  <div className="relative w-full h-48">
                    <img src={formData.imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setFormData(prev => ({ ...prev, imageFile: null, imagePreview: '' }))
                      }}
                      className="absolute top-2 right-2 bg-black/50 text-white p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-[#A3A3A3]">
                    <ImageIcon size={24} className="mb-2" />
                    <span className="text-[11px] font-bold tracking-widest uppercase">{locale === 'en' ? 'Tap to select a photo from your device.' : locale === 'zh' ? '点击以从您的设备中选择一张照片。' : 'แตะเพื่อเลือกรูปภาพจากอุปกรณ์'}</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setFormData(prev => ({
                        ...prev,
                        imageFile: file,
                        imagePreview: URL.createObjectURL(file)
                      }))
                    }
                  }} 
                />
              </label>
            </div>
          </section>

          <section className="space-y-12 relative">
            <div className="absolute -left-20 top-0 hidden xl:block text-[#F0F0F0] text-7xl font-serif-thai font-light select-none">02</div>
            <h2 className="text-[13px] font-bold tracking-[0.3em] uppercase border-b border-[#E5E5E5] pb-4 text-[#111111]">{locale === 'en' ? 'Location' : locale === 'zh' ? '地点' : 'ที่ตั้ง'}</h2>
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'zip code *' : locale === 'zh' ? '邮政编码 *' : 'รหัสไปรษณีย์ *'}</label>
              <div className="relative">
                <input
                  type="tel"
                  maxLength={5}
                  value={formData.postcode}
                  onChange={(e) => void handlePostcodeChange(e.target.value)}
                  placeholder="00000"
                  className="w-full bg-transparent border-b border-[#E5E5E5] py-4 text-2xl font-light focus:outline-none focus:border-[#111111] transition-colors rounded-none placeholder:text-[#E5E5E5] text-[#111111]"
                />
              </div>
              {isPostcodeLoading && <p className="text-[10px] font-bold uppercase tracking-widest text-[#666666]">{locale === 'en' ? 'Checking service area...' : locale === 'zh' ? '正在检查服务区域...' : 'กำลังตรวจสอบพื้นที่ให้บริการ...'}</p>}
              {postcodeLookupError && <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">{postcodeLookupError}</p>}
              {!isPostcodeLoading && !postcodeLookupError && branchName && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">{locale === 'en' ? '✓ Service branches:' : locale === 'zh' ? '✓ 服务网点：' : '✓ สาขาที่ให้บริการ: '}{branchName}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Subdistrict / Subdistrict' : locale === 'zh' ? '街道/街道' : 'ตำบล / แขวง'}</label>
                <div className="relative border-b border-[#E5E5E5] focus-within:border-[#111111] transition-colors">
                  <select
                    value={`${formData.subdistrict}|${formData.district}|${formData.province}`}
                    onChange={(e) => {
                      const [subdistrict, district, province] = e.target.value.split('|')
                      setFormData((prev) => ({ ...prev, subdistrict, district, province }))
                    }}
                    disabled={postcodeLocations.length === 0}
                    className="w-full bg-transparent py-4 text-lg font-light focus:outline-none appearance-none disabled:opacity-50 rounded-none cursor-pointer"
                  >
                    {postcodeLocations.length === 0 ? (
                      <option value="">-</option>
                    ) : (
                      postcodeLocations.map((item) => {
                        const value = `${item.district}|${item.amphoe}|${item.province}`
                        return <option key={value} value={value}>{item.district}</option>
                      })
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#111111] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'District / District' : locale === 'zh' ? '区/区' : 'อำเภอ / เขต'}</label>
                <input type="text" value={formData.district} readOnly className="w-full bg-transparent border-b border-[#E5E5E5] py-4 text-lg font-light text-[#A3A3A3] cursor-default focus:outline-none rounded-none placeholder:text-[#E5E5E5]" placeholder="-" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'province' : locale === 'zh' ? '省' : 'จังหวัด'}</label>
                <input type="text" value={formData.province} readOnly className="w-full bg-transparent border-b border-[#E5E5E5] py-4 text-lg font-light text-[#A3A3A3] cursor-default focus:outline-none rounded-none placeholder:text-[#E5E5E5]" placeholder="-" />
              </div>
            </div>
            <div className="space-y-4 pt-4 relative">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Address details *' : locale === 'zh' ? '地址详情 *' : 'รายละเอียดที่อยู่ *'}</label>
                <button 
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="flex items-center gap-2 border border-[#E5E5E5] px-3 py-1.5 text-[10px] font-bold tracking-[0.1em] uppercase text-[#111111] hover:border-[#111111] transition-colors rounded-none bg-[#FAFAFA]"
                >
                  <MapPin size={12} className={latitude ? "text-emerald-600" : ""} />
                  {latitude ? 'ปักหมุดแล้ว' : 'เลือกในแผนที่'}
                </button>
              </div>
              <textarea
                rows={2}
                value={formData.address}
                onBlur={() => setTimeout(() => setGoogleSuggestions([]), 200)}
                onChange={(e) => {
                  setFormData({ ...formData, address: e.target.value })
                  searchGooglePlaces(e.target.value)
                }}
                placeholder={locale === 'en' ? 'House number, building, floor, street...' : locale === 'zh' ? '门牌号、建筑物、楼层、街道...' : 'บ้านเลขที่, อาคาร, ชั้น, ถนน...'}
                className="w-full bg-transparent border-b border-[#E5E5E5] py-4 text-xl font-light focus:outline-none focus:border-[#111111] transition-colors rounded-none placeholder:text-[#E5E5E5] text-[#111111] resize-none"
              />
              {googleSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full bg-white shadow-2xl border border-[#E5E5E5] overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {googleSuggestions.map((s) => (
                    <button
                      key={s.place_id}
                      onClick={() => handleSelectGoogleSuggestion(s)}
                      className="w-full text-left px-6 py-4 hover:bg-[#FAFAFA] transition-colors border-b border-[#F5F5F5] last:border-0 flex items-center gap-3"
                    >
                      <MapPin size={14} className="text-[#111111] shrink-0 opacity-20" />
                      <span className="text-[13px] font-medium text-[#111111] truncate">{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-12 relative">
            <div className="absolute -left-20 top-0 hidden xl:block text-[#F0F0F0] text-7xl font-serif-thai font-light select-none">03</div>
            <h2 className="text-[13px] font-bold tracking-[0.3em] uppercase border-b border-[#E5E5E5] pb-4 text-[#111111]">{locale === 'en' ? 'Area size' : locale === 'zh' ? '面积大小' : 'ขนาดพื้นที่'}</h2>
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end w-full">
              <div className="w-full space-y-4">
                <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Total area size' : locale === 'zh' ? '总面积' : 'ขนาดพื้นที่รวม'}</label>
                <div className="flex w-full items-end gap-4 border-b border-[#E5E5E5] focus-within:border-[#111111] transition-colors pb-2">
                  <input
                    type="number"
                    value={formData.areaSize}
                    disabled={formData.requestMeasurement}
                    onChange={(e) => setFormData({ ...formData, areaSize: e.target.value })}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-3xl font-light disabled:opacity-30 placeholder:text-[#E5E5E5] focus:outline-none"
                  />
                  <div className="flex bg-[#FAFAFA] p-1 rounded-none shrink-0 border border-[#E5E5E5]">
                    {['ตร.ว.', 'ตร.ม.'].map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        disabled={formData.requestMeasurement}
                        onClick={() => setFormData({ ...formData, areaUnit: unit })}
                        className={`px-4 py-2 text-[10px] font-bold tracking-widest transition-colors duration-300 disabled:opacity-40 rounded-none ${
                          formData.areaUnit === unit ? 'bg-[#111111] text-white shadow-sm' : 'bg-transparent text-[#A3A3A3] hover:text-[#111111]'
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 py-2">
              <div className="flex-1 h-[1px] bg-[#E5E5E5]"></div>
              <span className="text-[9px] font-bold text-[#A3A3A3] uppercase tracking-[0.3em]">{locale === 'en' ? 'or' : locale === 'zh' ? '或者' : 'หรือ'}</span>
              <div className="flex-1 h-[1px] bg-[#E5E5E5]"></div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, requestMeasurement: !formData.requestMeasurement, areaSize: '' })}
              className={`w-full text-left p-6 md:p-8 border transition-all duration-300 flex items-center justify-between rounded-none group ${
                formData.requestMeasurement 
                  ? 'border-[#111111] bg-[#111111] text-white shadow-[4px_4px_0px_0px_rgba(230,230,230,1)]' 
                  : 'border-[#E5E5E5] bg-transparent hover:border-[#111111]'
              }`}
            >
              <div>
                <span className={`block text-[14px] font-bold tracking-[0.15em] uppercase ${formData.requestMeasurement ? 'text-white' : 'text-[#111111]'}`}>{locale === 'en' ? 'Request area assessment service' : locale === 'zh' ? '请求区域评估服务' : 'ขอบริการประเมินพื้นที่'}</span>
                <span className={`text-[12px] mt-2 block font-light ${formData.requestMeasurement ? 'text-[#A3A3A3]' : 'text-[#A3A3A3]'}`}>{locale === 'en' ? 'A team of experts will assess and measure the actual area.' : locale === 'zh' ? '专家团队将评估和测量实际面积。' : 'ทีมผู้เชี่ยวชาญจะเข้าประเมินและวัดพื้นที่จริง'}</span>
              </div>
              <div className={`w-10 h-10 border flex items-center justify-center transition-colors shrink-0 rounded-none ${
                formData.requestMeasurement ? 'border-white bg-white' : 'border-[#E5E5E5] group-hover:border-[#111111]'
              }`}>
                {formData.requestMeasurement && <Check className="w-5 h-5 text-[#111111] stroke-[2]" />}
              </div>
            </button>
          </section>

          <section className="space-y-12 relative">
            <div className="absolute -left-20 top-0 hidden xl:block text-[#F0F0F0] text-7xl font-serif-thai font-light select-none">04</div>
            <h2 className="text-[13px] font-bold tracking-[0.3em] uppercase border-b border-[#E5E5E5] pb-4 text-[#111111]">{locale === 'en' ? 'Contact' : locale === 'zh' ? '接触' : 'การติดต่อ'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Contact name *' : locale === 'zh' ? '联系人姓名 *' : 'ชื่อผู้ติดต่อ *'}</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder={locale === 'en' ? 'Name - Surname' : locale === 'zh' ? '姓名 - 姓氏' : 'ชื่อ - นามสกุล'}
                  className="w-full bg-transparent border-b border-[#E5E5E5] py-4 text-2xl font-light focus:outline-none focus:border-[#111111] transition-colors rounded-none placeholder:text-[#E5E5E5] text-[#111111]"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'telephone number *' : locale === 'zh' ? '电话号码 *' : 'เบอร์โทรศัพท์ *'}</label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value.replace(/\D/g, '') })}
                  placeholder="08X XXX XXXX"
                  className="w-full bg-transparent border-b border-[#E5E5E5] py-4 text-2xl font-light focus:outline-none focus:border-[#111111] transition-colors rounded-none placeholder:text-[#E5E5E5] text-[#111111]"
                />
              </div>
            </div>
            <div className="space-y-6 pt-4">
              <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Convenient date *' : locale === 'zh' ? '方便的日期*' : 'วันที่สะดวก *'}</label>
              <div className="flex flex-wrap gap-3">
                {daysOfWeek.map((day) => {
                  const isSelected = formData.availableDays.includes(day.id)
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center text-[11px] font-bold tracking-[0.1em] transition-all duration-300 border rounded-none ${
                        isSelected 
                          ? 'bg-[#111111] text-white border-[#111111] shadow-[2px_2px_0px_0px_rgba(230,230,230,1)]' 
                          : 'bg-transparent text-[#A3A3A3] border-[#E5E5E5] hover:border-[#111111] hover:text-[#111111]'
                      }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-6 pt-4">
              <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Convenient time *' : locale === 'zh' ? '方便的时间*' : 'ช่วงเวลาที่สะดวก *'}</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {timeSlots.map((slot) => {
                  const isSelected = formData.serviceTime === slot
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setFormData({ ...formData, serviceTime: slot })}
                      className={`py-5 text-[11px] font-bold tracking-[0.1em] transition-all duration-300 border rounded-none ${
                        isSelected 
                          ? 'bg-[#111111] text-white border-[#111111] shadow-[4px_4px_0px_0px_rgba(230,230,230,1)]' 
                          : 'bg-transparent text-[#A3A3A3] border-[#E5E5E5] hover:border-[#111111] hover:text-[#111111]'
                      }`}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
              {formData.serviceTime === 'ระบุเวลาอื่น' && (
                <div className="grid grid-cols-2 gap-8 pt-6 animate-in fade-in slide-in-from-top-4">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Start time' : locale === 'zh' ? '开始时间' : 'เวลาเริ่ม'}</label>
                    <input type="time" value={formData.customStartTime} onChange={(e) => setFormData({ ...formData, customStartTime: e.target.value })} className="w-full bg-transparent border-b border-[#E5E5E5] py-4 text-2xl font-light focus:outline-none focus:border-[#111111] transition-colors rounded-none placeholder:text-[#E5E5E5] text-[#111111]" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'end time' : locale === 'zh' ? '结束时间' : 'เวลาสิ้นสุด'}</label>
                    <input type="time" value={formData.customEndTime} onChange={(e) => setFormData({ ...formData, customEndTime: e.target.value })} className="w-full bg-transparent border-b border-[#E5E5E5] py-4 text-2xl font-light focus:outline-none focus:border-[#111111] transition-colors rounded-none placeholder:text-[#E5E5E5] text-[#111111]" />
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="pt-12 pb-32 border-t border-[#E5E5E5]">
            <button 
              type="button" 
              disabled={!isFormValid || isSubmitting} 
              onClick={handleSubmit} 
              className={`w-full bg-[#111111] text-white py-8 text-[12px] font-bold tracking-[0.2em] uppercase transition-all duration-300 hover:bg-black flex justify-center items-center ${!isFormValid || isSubmitting ? 'opacity-40 cursor-not-allowed' : 'shadow-[4px_4px_0px_0px_rgba(230,230,230,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]'}`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-4">
                  <span className="w-4 h-4 border-2 border-[#A3A3A3] border-t-white rounded-full animate-spin"></span>
                  {locale === 'en' ? 'in progress' : locale === 'zh' ? '进行中' : '                   กำลังดำเนินการ                 '}</span>
              ) : (
                <span>{locale === 'en' ? 'Save location information' : locale === 'zh' ? '保存位置信息' : 'บันทึกข้อมูลสถานที่'}</span>
              )}
            </button>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showMapPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white flex flex-col pt-20"
          >
            <div className="absolute top-0 left-0 w-full h-20 border-b flex items-center justify-between px-6 z-50">
              <h3 className="text-sm font-bold uppercase tracking-widest">{locale === 'en' ? 'Select a location on the map' : locale === 'zh' ? '在地图上选择一个位置' : 'เลือกตำแหน่งบนแผนที่'}</h3>
              <button 
                onClick={() => setShowMapPicker(false)}
                className="p-2 hover:bg-gray-100 transition-colors"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 relative">
              <GoogleMapsLocationPicker
                onSelect={(loc: any) => {
                  handleLocationSelect(loc)
                  setShowMapPicker(false)
                }}
                initialLocation={latitude && longitude ? { lat: latitude, lng: longitude } : undefined}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isSubmitted && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#111111] text-center p-8 animate-in fade-in duration-500">
          <div className="relative mb-12 animate-bounce">
             <Check size={80} strokeWidth={1} className="text-white" />
          </div>
          <div className="space-y-6 max-w-lg mx-auto">
            <h2 className="text-3xl md:text-5xl font-light tracking-widest text-white uppercase">Completed</h2>
            <div className="mx-auto h-[1px] w-12 bg-white/30" />
            <p className="text-sm md:text-lg text-white/60 font-light leading-relaxed px-4">
              {locale === 'en' ? 'project "' : locale === 'zh' ? '项目 ”' : '               โครงการ "'}{formData.name}{locale === 'en' ? '" has been sent into the system.' : locale === 'zh' ? '”已发送至系统。' : '" ถูกส่งเข้าสู่ระบบแล้ว'}<br />{locale === 'en' ? 'Taking you back to the dashboard...' : locale === 'zh' ? '带您回到仪表板...' : 'กำลังพากลับสู่หน้าแดชบอร์ด...             '}</p>
          </div>
        </div>
      )}
    </div>
  )
}

