'use client';
import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  X,
  CheckCircle2,
  MapPin,
  Info
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { getCustomerHouses, supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useToastContext } from '@/components/Toast'
import XYLLoader from '@/components/loaders/XYLLoader'
import { useI18n } from "@/lib/I18nContext";

const GoogleMapsLocationPicker = dynamic(
  () => import('@/components/GoogleMapsLocationPicker'),
  { ssr: false }
)

export default function EditHousePage() {
    const { locale } = useI18n();
  const { houseId } = useParams() as { houseId: string }
  const router = useRouter()
  const { profile } = useAuth()
  const { success, error: toastError } = useToastContext()
  
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    area_size: '',
    branch_code: '',
    image_url: '',
    latitude: null as number | null,
    longitude: null as number | null
  })
  
  const [showMapPicker, setShowMapPicker] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  useEffect(() => {
    async function fetchHouse() {
      if (!profile) return
      const { data } = await getCustomerHouses(profile.id)
      const house = data?.find(h => h.id === houseId)
      
      if (!house) {
        router.push('/dashboard/customer/houses')
        return
      }

      setFormData({
        name: house.name || '',
        address: house.address || '',
        area_size: house.area_size ? house.area_size.toString() : '',
        branch_code: house.branch_code || '',
        image_url: house.image_url || '',
        latitude: house.latitude || null,
        longitude: house.longitude || null
      })
      setLoading(false)
    }
    fetchHouse()
  }, [houseId, profile, router])

  const isFormValid = useMemo(() => {
    return formData.name.trim() !== '' && formData.address.trim() !== ''
  }, [formData])

  async function handleUpdate() {
    if (!isFormValid || saving) return
    setSaving(true)
    
    try {
      const areaValue = formData.area_size.trim() === '' ? null : Number(formData.area_size)
      const branchCodeValue = formData.branch_code.trim() === '' ? null : formData.branch_code.trim()
      
      const response = await fetch('/api/customer/houses', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: houseId,
          name: formData.name.trim(),
          address: formData.address.trim(),
          area_size: isNaN(areaValue as any) ? null : areaValue,
          branch_code: branchCodeValue,
          image_url: formData.image_url,
          latitude: formData.latitude,
          longitude: formData.longitude
        })
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'อัปเดตไม่สำเร็จ')
      }

      success('อัปเดตข้อมูลสถานที่เรียบร้อยแล้ว')
      setIsSubmitted(true)
    } catch (err: any) {
      console.error(err)
      toastError('ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setSaving(false)
    }
  }

  async function handleImagePicked(originalFile: File | null) {
    if (!originalFile || !houseId || !profile) return

    setUploadingImage(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        throw new Error('กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง')
      }

      // Compress image client-side to avoid Vercel 4.5MB limit (which causes HTML 413 Payload Too Large and Safari DOMException)
      let compressedFile = originalFile
      try {
        const { compressImage } = await import('@/lib/utils/image')
        compressedFile = await compressImage(originalFile)
      } catch (err) {
        console.error('Failed to compress image, using original', err)
      }

      // Safari Bug Fix: Rename file to ASCII only to prevent DOMException: "The string did not match the expected pattern."
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
      uploadData.append('houseId', houseId)

      const response = await fetch('/api/customer/houses/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadData,
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'อัปโหลดรูปไม่สำเร็จ')
      }

      setFormData((prev) => ({ ...prev, image_url: payload.imageUrl || '' }))
      success('อัปโหลดรูปภาพหน้าปกสำเร็จแล้ว')
    } catch (err: any) {
      toastError(err?.message || 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setUploadingImage(false)
    }
  }

  if (!isMounted) return null
  if (loading) return <XYLLoader tagline={locale === 'en' ? 'Retrieving location information...' : locale === 'zh' ? '正在检索位置信息...' : 'กำลังดึงข้อมูลสถานที่...'} />

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex flex-col items-center justify-center p-6 selection:bg-[#111111] selection:text-white">
        <div className="max-w-xl w-full text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="space-y-4">
            <h2 className="font-serif-thai text-5xl font-light tracking-tighter text-[#111111] uppercase">{locale === 'en' ? 'Updated successfully' : locale === 'zh' ? '更新成功' : 'อัปเดตสำเร็จ'}</h2>
            <div className="h-[1px] w-24 bg-[#111111] mx-auto mt-8"></div>
          </div>
          <p className="text-sm font-light text-[#666666] leading-relaxed text-lg">
            {locale === 'en' ? 'location' : locale === 'zh' ? '地点' : '             สถานที่ '}<span className="font-medium text-[#111111] uppercase tracking-wide">"{formData.name}"</span><br/>
            {locale === 'en' ? 'Information has been updated successfully.' : locale === 'zh' ? '信息已更新成功。' : '             ได้รับการอัปเดตข้อมูลเรียบร้อยแล้ว           '}</p>
          <button
            onClick={() => router.push(`/dashboard/customer/houses/${houseId}`)}
            className="group relative inline-flex items-center justify-center bg-[#111111] text-white py-5 px-12 transition-transform active:scale-95"
          >
            <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-white rounded-full group-hover:w-80 group-hover:h-80 opacity-10"></span>
            <span className="relative text-[11px] font-bold tracking-[0.2em] uppercase">{locale === 'en' ? 'Return to the location information page.' : locale === 'zh' ? '返回位置信息页面。' : 'กลับไปยังหน้าข้อมูลสถานที่'}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] selection:bg-[#111111] selection:text-white pb-32">
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
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A3A3A3]">{locale === 'en' ? 'Edit location information' : locale === 'zh' ? '编辑位置信息' : 'แก้ไขข้อมูลสถานที่'}</span>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-32 lg:grid lg:grid-cols-12 lg:gap-24">
        <div className="lg:col-span-4 hidden lg:block">
          <div className="sticky top-32 space-y-10">
            <h1 className="font-serif-thai text-7xl font-light tracking-tighter text-[#111111] leading-none uppercase">
              {locale === 'en' ? 'correct' : locale === 'zh' ? '正确的' : '               แก้ไข'}<br/>{locale === 'en' ? 'information' : locale === 'zh' ? '信息' : 'ข้อมูล             '}</h1>
            <p className="text-sm font-light text-[#666666] leading-relaxed max-w-xs">
              {locale === 'en' ? 'Improved architectural and spatial specification details.' : locale === 'zh' ? '改进了建筑和空间规范细节。' : '               ปรับปรุงรายละเอียดข้อมูลจำเพาะทางสถาปัตยกรรมและพื้นที่             '}</p>
            <div className="pt-12 space-y-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A3A3A3]">
              <div className="flex items-center gap-4 text-[#111111]">
                <span className="w-8 border-b border-[#111111]"></span>
                <span>{locale === 'en' ? '01. Location information' : locale === 'zh' ? '01.位置信息' : '01. ข้อมูลสถานที่'}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-4 border-b border-transparent"></span>
                <span>{locale === 'en' ? '02. Cover photo' : locale === 'zh' ? '02.封面照片' : '02. รูปภาพหน้าปก'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:hidden mb-16 space-y-6">
          <h1 className="font-serif-thai text-5xl font-light tracking-tighter text-[#111111] leading-none">{locale === 'en' ? 'Edit information' : locale === 'zh' ? '编辑信息' : 'แก้ไขข้อมูล'}</h1>
          <p className="text-sm font-light text-[#666666] leading-relaxed">{locale === 'en' ? 'Improved details and spatial information' : locale === 'zh' ? '改进的细节和空间信息' : 'ปรับปรุงรายละเอียดและข้อมูลเชิงพื้นที่'}</p>
        </div>

        <main className="lg:col-span-8 space-y-24">
          <section className="space-y-12 relative">
            <div className="absolute -left-20 top-0 hidden xl:block text-[#F0F0F0] text-7xl font-serif-thai font-light select-none">01</div>
            <h2 className="text-[13px] font-bold tracking-[0.3em] uppercase border-b border-[#E5E5E5] pb-4 text-[#111111]">{locale === 'en' ? 'Location information' : locale === 'zh' ? '位置信息' : 'ข้อมูลสถานที่'}</h2>
            
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Place name *' : locale === 'zh' ? '地名 *' : 'ชื่อสถานที่ *'}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-transparent border-b border-[#E5E5E5] py-4 text-2xl font-light focus:outline-none focus:border-[#111111] transition-colors rounded-none placeholder:text-[#E5E5E5] text-[#111111]"
              />
            </div>

            <div className="space-y-4 pt-4">
              <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Total area size (SQ.M.)' : locale === 'zh' ? '总面积（平方米）' : 'ขนาดพื้นที่รวม (SQ.M.)'}</label>
              <input
                type="number"
                value={formData.area_size}
                onChange={(e) => setFormData({ ...formData, area_size: e.target.value })}
                placeholder="0.00"
                className="w-full bg-transparent border-b border-[#E5E5E5] py-4 text-2xl font-light focus:outline-none focus:border-[#111111] transition-colors rounded-none placeholder:text-[#E5E5E5] text-[#111111]"
              />
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Administrator branch code' : locale === 'zh' ? '管理员分支代码' : 'รหัสสาขาผู้ดูแล'}</label>
                <Info size={14} className="text-[#A3A3A3]" />
              </div>
              <input
                type="text"
                value={formData.branch_code}
                onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                placeholder="STUDIO_ID_00"
                className="w-full bg-transparent border-b border-[#E5E5E5] py-4 text-2xl font-light uppercase focus:outline-none focus:border-[#111111] transition-colors rounded-none placeholder:text-[#E5E5E5] text-[#111111]"
              />
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-[0.2em]">{locale === 'en' ? 'Project location *' : locale === 'zh' ? '项目地点 *' : 'สถานที่ตั้งโครงการ *'}</label>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-[#111111] border border-[#111111] px-3 py-1 hover:bg-[#111111] hover:text-white transition-colors"
                >
                  <MapPin size={12} />
                  <span>{formData.latitude ? 'แก้ไขพิกัด' : 'ระบุตำแหน่งแผนที่'}</span>
                </button>
              </div>
              {formData.latitude && formData.longitude && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">{locale === 'en' ? '✓ Coordinates available (' : locale === 'zh' ? '✓ 可用坐标（' : '✓ พิกัดพร้อมใช้งาน ('}{formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)})</p>
              )}
              <textarea
                rows={4}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-[#F5F5F5] border-none p-6 text-sm font-light focus:outline-none focus:ring-1 focus:ring-[#111111] transition-all resize-none text-[#111111]"
                placeholder={locale === 'en' ? 'Briefly specify the location...' : locale === 'zh' ? '简单说明一下地点...' : 'ระบุที่ตั้งโดยสังเขป...'}
              />
            </div>
          </section>

          <section className="space-y-12 relative">
            <div className="absolute -left-20 top-0 hidden xl:block text-[#F0F0F0] text-7xl font-serif-thai font-light select-none">02</div>
            <h2 className="text-[13px] font-bold tracking-[0.3em] uppercase border-b border-[#E5E5E5] pb-4 text-[#111111]">{locale === 'en' ? 'Cover photo' : locale === 'zh' ? '封面照片' : 'รูปภาพหน้าปก'}</h2>
            
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#E5E5E5] p-8 cursor-pointer hover:border-[#111111] transition-colors bg-white">
                {formData.image_url ? (
                  <div className="relative w-full h-64 group">
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover transition-opacity group-hover:opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black text-white text-[10px] font-bold tracking-[0.2em] uppercase px-4 py-2 flex items-center gap-2">
                        {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                        {uploadingImage ? 'กำลังอัปโหลด...' : 'แตะเพื่อเปลี่ยนรูป'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-[#A3A3A3]">
                    {uploadingImage ? (
                      <Loader2 size={24} className="mb-2 animate-spin text-[#111111]" />
                    ) : (
                      <ImageIcon size={24} className="mb-2 text-[#111111]" />
                    )}
                    <span className="text-[11px] font-bold tracking-widest uppercase text-[#111111]">
                      {uploadingImage ? 'กำลังอัปโหลด...' : 'แตะเพื่อเลือกรูปภาพจากอุปกรณ์'}
                    </span>
                    <span className="text-[10px] font-light mt-2 text-[#666666]">{locale === 'en' ? 'The system will upload the picture immediately.' : locale === 'zh' ? '系统会立即上传图片。' : 'ระบบจะทำการอัปโหลดรูปให้ทันที'}</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  disabled={uploadingImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    void handleImagePicked(file)
                    e.currentTarget.value = ''
                  }} 
                />
              </label>
            </div>
          </section>

          <div className="pt-12 border-t border-[#E5E5E5]">
            <button
              onClick={handleUpdate}
              disabled={saving || !isFormValid}
              className="w-full bg-[#111111] text-white py-6 flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-[#222222] transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase">
                {saving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกการเปลี่ยนแปลง'}
              </span>
            </button>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showMapPicker && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 z-[100] bg-white flex flex-col pt-20"
          >
            <div className="absolute top-0 left-0 w-full h-20 border-b flex items-center justify-between px-6 z-50 bg-white">
              <h3 className="text-sm font-bold uppercase tracking-widest">{locale === 'en' ? 'Select a location on the map' : locale === 'zh' ? '在地图上选择一个位置' : 'เลือกตำแหน่งบนแผนที่'}</h3>
              <button 
                onClick={() => setShowMapPicker(false)}
                className="p-2 hover:bg-gray-100 transition-colors rounded-full"
                type="button"
              >
                <X className="w-6 h-6 text-[#111111]" />
              </button>
            </div>

            <div className="flex-1 relative">
              <GoogleMapsLocationPicker
                onSelect={(loc: any) => {
                  setFormData(prev => ({
                    ...prev,
                    latitude: loc.lat,
                    longitude: loc.lng
                  }))
                  setShowMapPicker(false)
                }}
                initialLocation={formData.latitude && formData.longitude ? { lat: formData.latitude, lng: formData.longitude } : undefined}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
