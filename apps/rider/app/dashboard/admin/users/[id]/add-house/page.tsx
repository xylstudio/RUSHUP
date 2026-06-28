'use client';
import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, MapPin, Search } from 'lucide-react'
import { createHouse, findBranchByZipCode, getProfileByUserId } from '@/lib/supabaseClient'
import { useToastContext } from '@/components/Toast'
import dynamic from 'next/dynamic'
import { useI18n } from "@/lib/I18nContext";

const GoogleMapsLocationPicker = dynamic(
  () => import('@/components/GoogleMapsLocationPicker'),
  { ssr: false }
)

export default function AdminAddHousePage() {
    const { locale } = useI18n();
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string
  const { success, error: showError } = useToastContext()

  const [isLoading, setIsLoading] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'บ้านพักอาศัย',
    postcode: '',
    address: '',
    areaSize: '',
    contactName: '',
    contactPhone: '',
    serviceTime: '09:00 - 18:00',
    availableDays: [] as string[],
  })

  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [branchCode, setBranchCode] = useState('')
  const [branchName, setBranchName] = useState('')
  const [branchError, setBranchError] = useState('')

  useEffect(() => {
    if (!userId) return
    const fetchUser = async () => {
      const { data, error } = await getProfileByUserId(userId)
      if (data) {
        setCustomerName(data.display_name || data.email || 'ไม่ทราบชื่อ')
      }
    }
    fetchUser()
  }, [userId])

  const handleZipCodeChange = async (zip: string) => {
    setFormData(prev => ({ ...prev, postcode: zip }))
    if (zip.length === 5) {
      const { data, error } = await findBranchByZipCode(zip)
      if (error || !data) {
        setBranchError('ไม่อยู่ในพื้นที่ให้บริการ')
        setBranchCode('')
        setBranchName('')
      } else {
        setBranchError('')
        setBranchCode(data.branch_code)
        setBranchName(data.branch_name)
      }
    } else {
      setBranchError('')
      setBranchCode('')
      setBranchName('')
    }
  }

  const handleLocationSelect = (location: any) => {
    setLatitude(location.lat)
    setLongitude(location.lng)
    if (location.address) {
      setFormData(prev => ({ ...prev, address: location.address }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!branchCode) {
      showError('กรุณาระบุรหัสไปรษณีย์ในเขตพื้นที่ให้บริการ')
      return
    }

    setIsLoading(true)
    try {
      const timeSlotMap: Record<string, { start: string; end: string }> = {
        '09:00 - 12:00': { start: '09:00', end: '12:00' },
        '13:00 - 16:00': { start: '13:00', end: '16:00' },
        '16:00 - 18:00': { start: '16:00', end: '18:00' },
        '09:00 - 18:00': { start: '09:00', end: '18:00' },
      }
      const parsedWindow = timeSlotMap[formData.serviceTime] || { start: '09:00', end: '18:00' }
      const areaValue = formData.areaSize === '' ? null : Number(formData.areaSize)

      let uploadedImageUrl = undefined
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${userId}/new/${fileName}`
        
        const { supabase } = await import('@/lib/supabaseClient')
        const { error: uploadError } = await supabase.storage
          .from('house-images')
          .upload(filePath, imageFile)
          
        if (!uploadError) {
          const { data: publicData } = supabase.storage.from('house-images').getPublicUrl(filePath)
          uploadedImageUrl = publicData.publicUrl
        } else {
          console.error("Image upload failed:", uploadError)
        }
      }

      const payload = {
        user_id: userId,
        customer_id: userId,
        name: formData.name,
        house_type: formData.type,
        zip_code: formData.postcode,
        address: formData.address,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        area_size: areaValue,
        branch_code: branchCode,
        contact_person: formData.contactName,
        phone_number: formData.contactPhone,
        service_days: formData.availableDays.length > 0 ? formData.availableDays : ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        operating_hour_start: parsedWindow.start,
        operating_hour_end: parsedWindow.end,
        image_url: uploadedImageUrl,
      }

      const { error } = await createHouse(payload)
      if (error) throw error

      // Notify customer
      try {
        const { supabase } = await import('@/lib/supabaseClient')
        const { data: { session } } = await supabase.auth.getSession()
        
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
          },
          body: JSON.stringify({
             user_id: userId,
             title: 'เพิ่มบ้านใหม่สำเร็จ',
             message: `แอดมินได้ทำการเพิ่มบ้าน "${formData.name}" เข้าสู่ระบบของคุณเรียบร้อยแล้ว`,
             type: 'system',
             notification_category: 'system'
          })
        })
      } catch (notifyErr) {
        console.error("Failed to notify customer:", notifyErr)
      }

      success('เพิ่มบ้านเรียบร้อยแล้ว')
      router.push(`/dashboard/admin/users`)
    } catch (err: any) {
      showError(err.message || 'เกิดข้อผิดพลาด')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto pb-32">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{locale === 'en' ? 'Add new homes for customers' : locale === 'zh' ? '为客户增添新家' : 'เพิ่มบ้านใหม่ให้ลูกค้า'}</h1>
          <p className="text-gray-500">{locale === 'en' ? 'For accounts:' : locale === 'zh' ? '对于帐户：' : 'สำหรับบัญชี: '}{customerName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">{locale === 'en' ? 'Name of house/project *' : locale === 'zh' ? '房屋/项目名称 *' : 'ชื่อบ้าน/โครงการ *'}</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none" 
              placeholder={locale === 'en' ? 'Such as corner detached house, Pattaya villa...' : locale === 'zh' ? '比如转角独立屋、芭堤雅别墅……' : 'เช่น บ้านเดี่ยวหลังมุม, วิลล่าพัทยา...'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{locale === 'en' ? 'Location type' : locale === 'zh' ? '位置类型' : 'ประเภทสถานที่'}</label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
              className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value={locale === 'en' ? 'Residential house' : locale === 'zh' ? '住宅' : 'บ้านพักอาศัย'}>{locale === 'en' ? 'Residential house' : locale === 'zh' ? '住宅' : 'บ้านพักอาศัย'}</option>
              <option value={locale === 'en' ? 'Hotel/Resort' : locale === 'zh' ? '酒店/度假村' : 'โรงแรม/รีสอร์ท'}>{locale === 'en' ? 'Hotel/Resort' : locale === 'zh' ? '酒店/度假村' : 'โรงแรม/รีสอร์ท'}</option>
              <option value={locale === 'en' ? 'Commercial/Cafe' : locale === 'zh' ? '商业/咖啡厅' : 'พาณิชย์/คาเฟ่'}>{locale === 'en' ? 'Commercial/Cafe' : locale === 'zh' ? '商业/咖啡厅' : 'พาณิชย์/คาเฟ่'}</option>
              <option value={locale === 'en' ? 'Building project' : locale === 'zh' ? '建设工程' : 'โครงการอาคาร'}>{locale === 'en' ? 'Building project' : locale === 'zh' ? '建设工程' : 'โครงการอาคาร'}</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">{locale === 'en' ? 'house picture' : locale === 'zh' ? '房子图片' : 'รูปภาพบ้าน'}</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setImageFile(e.target.files[0])
                }
              }}
              className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" 
            />
            {imageFile && (
              <div className="mt-2 text-sm text-gray-500">
                {locale === 'en' ? 'Selected files:' : locale === 'zh' ? '选定的文件：' : '                 ไฟล์ที่เลือก: '}{imageFile.name}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">{locale === 'en' ? 'Contact name' : locale === 'zh' ? '联系人姓名' : 'ชื่อผู้ติดต่อ'}</label>
            <input 
              type="text" 
              value={formData.contactName}
              onChange={e => setFormData({...formData, contactName: e.target.value})}
              className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{locale === 'en' ? 'Contact phone number' : locale === 'zh' ? '联系电话' : 'เบอร์โทรติดต่อ'}</label>
            <input 
              type="tel" 
              value={formData.contactPhone}
              onChange={e => setFormData({...formData, contactPhone: e.target.value.replace(/\D/g, '')})}
              className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none" 
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><MapPin size={18}/> {locale === 'en' ? 'Location information' : locale === 'zh' ? '位置信息' : ' ข้อมูลที่ตั้ง'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">{locale === 'en' ? 'zip code *' : locale === 'zh' ? '邮政编码 *' : 'รหัสไปรษณีย์ *'}</label>
              <input 
                required
                maxLength={5}
                type="text" 
                value={formData.postcode}
                onChange={e => handleZipCodeChange(e.target.value.replace(/\D/g, ''))}
                className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none" 
              />
              {branchName && <p className="text-sm text-emerald-600 mt-2">{locale === 'en' ? 'Area of ​​responsibility:' : locale === 'zh' ? '职责范围：' : 'พื้นที่รับผิดชอบ: '}{branchName}</p>}
              {branchError && <p className="text-sm text-red-500 mt-2">{branchError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{locale === 'en' ? 'Area size (sq m)' : locale === 'zh' ? '面积（平方米）' : 'ขนาดพื้นที่ (ตร.ม.)'}</label>
              <input 
                type="number" 
                value={formData.areaSize}
                onChange={e => setFormData({...formData, areaSize: e.target.value})}
                className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{locale === 'en' ? 'Full address' : locale === 'zh' ? '完整地址' : 'ที่อยู่แบบเต็ม'}</label>
            <textarea 
              rows={2}
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              className="w-full p-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none mb-4" 
            />
            
            <label className="block text-sm font-medium mb-2">{locale === 'en' ? 'Map pin' : locale === 'zh' ? '地图别针' : 'ปักหมุดแผนที่'}</label>
            <div className="h-[400px] w-full rounded-xl overflow-hidden border relative z-0">
              <GoogleMapsLocationPicker
                onSelect={handleLocationSelect}
                initialLocation={{ lat: latitude || 13.7563, lng: longitude || 100.5018 }}
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-bold mb-4">{locale === 'en' ? 'Service time' : locale === 'zh' ? '服务时间' : 'เวลาให้บริการ'}</h3>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">{locale === 'en' ? 'Convenient date' : locale === 'zh' ? '方便的约会' : 'วันที่สะดวก'}</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'MON', label: 'จันทร์' }, { id: 'TUE', label: 'อังคาร' }, 
                { id: 'WED', label: 'พุธ' }, { id: 'THU', label: 'พฤหัสบดี' }, 
                { id: 'FRI', label: 'ศุกร์' }, { id: 'SAT', label: 'เสาร์' }, { id: 'SUN', label: 'อาทิตย์' }
              ].map(day => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${formData.availableDays.includes(day.id) ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{locale === 'en' ? 'period' : locale === 'zh' ? '时期' : 'ช่วงเวลา'}</label>
            <select 
              value={formData.serviceTime}
              onChange={e => setFormData({...formData, serviceTime: e.target.value})}
              className="w-full md:w-1/2 p-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="09:00 - 18:00">{locale === 'en' ? '09:00 - 18:00 (all day)' : locale === 'zh' ? '09:00 - 18:00（全天）' : '09:00 - 18:00 (ทั้งวัน)'}</option>
              <option value="09:00 - 12:00">{locale === 'en' ? '09:00 - 12:00 (morning)' : locale === 'zh' ? '09:00 - 12:00（上午）' : '09:00 - 12:00 (เช้า)'}</option>
              <option value="13:00 - 16:00">{locale === 'en' ? '13:00 - 16:00 (afternoon)' : locale === 'zh' ? '13:00 - 16:00（下午）' : '13:00 - 16:00 (บ่าย)'}</option>
              <option value="16:00 - 18:00">{locale === 'en' ? '16:00 - 18:00 (evening)' : locale === 'zh' ? '16:00 - 18:00（晚上）' : '16:00 - 18:00 (เย็น)'}</option>
            </select>
          </div>
        </div>

        <div className="pt-6 flex justify-end gap-4">
          <button 
            type="button" 
            onClick={() => router.back()}
            className="px-6 py-3 rounded-lg font-bold text-gray-600 hover:bg-gray-100"
          >
            {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '             ยกเลิก           '}</button>
          <button 
            type="submit" 
            disabled={isLoading || !branchCode}
            className="px-8 py-3 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? 'กำลังบันทึก...' : <><Save size={18}/> {locale === 'en' ? 'Record home information' : locale === 'zh' ? '记录家庭信息' : ' บันทึกข้อมูลบ้าน'}</>}
          </button>
        </div>
      </form>
    </div>
  )
}
