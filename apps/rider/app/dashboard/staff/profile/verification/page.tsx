'use client';
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Upload, CheckCircle, AlertCircle, Loader2, ArrowLeft, Landmark } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { useI18n } from "@/lib/I18nContext";

export default function StaffVerificationPage() {
    const { locale } = useI18n();
  const { profile, refreshProfile } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    id_card_number: '',
    bank_name: '',
    bank_account_number: '',
  })
  const [idCardPhotoUrl, setIdCardPhotoUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile?.id}/id_card_${Math.random()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('staff-documents')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('staff-documents')
        .getPublicUrl(fileName)

      setIdCardPhotoUrl(publicUrl)
    } catch (err: any) {
      console.error('Upload error:', err)
      setStatus({ type: 'error', message: 'อัปโหลดรูปภาพไม่สำเร็จ: ' + err.message })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return

    if (!idCardPhotoUrl) {
      setStatus({ type: 'error', message: 'กรุณาอัปโหลดรูปถ่ายบัตรประชาชน' })
      return
    }

    setLoading(true)
    try {
      // 1. Update Staff Identity (Sensitive info)
      const { error: identityError } = await supabase.from('staff_identity').upsert({
        profile_id: profile.id,
        id_card_number: formData.id_card_number, // In a real app, encrypt this or use PGCrypto
        id_card_photo_url: idCardPhotoUrl,
        bank_name: formData.bank_name,
        bank_account_number: formData.bank_account_number,
      })

      if (identityError) throw identityError

      // 2. Set profile status to pending verification if needed
      // (Currently we just wait for admin to check the staff_identity table)

      setStatus({ type: 'success', message: 'ส่งข้อมูลยืนยันตัวตนเรียบร้อยแล้ว กรุณารอการตรวจสอบจากผู้ดูแลระบบ' })
      await refreshProfile()
    } catch (err: any) {
      console.error('Submission error:', err)
      setStatus({ type: 'error', message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  if (profile?.is_verified) {
    return (
      <div className="min-h-screen bg-[#F7F7F2] p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-12 rounded-3xl shadow-sm border border-[#E5E5DF] text-center max-w-md">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={40} />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-2">{locale === 'en' ? 'The account is verified.' : locale === 'zh' ? '该帐户已验证。' : 'บัญชีได้รับการยืนยันแล้ว'}</h1>
          <p className="text-gray-500 mb-8">{locale === 'en' ? 'You can start using the POS system and check in as normal.' : locale === 'zh' ? '您可以开始使用 POS 系统并正常办理登机手续。' : 'คุณสามารถเริ่มใช้งานระบบ POS และเช็คอินเข้างานได้ตามปกติ'}</p>
          <button onClick={() => router.push('/dashboard/staff')} className="w-full py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-sm">
            {locale === 'en' ? 'Return to home page' : locale === 'zh' ? '返回首页' : '             กลับสู่หน้าหลัก           '}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F7F2] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-black mb-8 transition-colors">
          <ArrowLeft size={20} />
          <span className="text-sm font-bold uppercase tracking-widest">{locale === 'en' ? 'retrospective' : locale === 'zh' ? '回顾性的' : 'ย้อนกลับ'}</span>
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5DF] overflow-hidden">
          <div className="bg-black p-8 text-white">
            <Shield className="mb-4 text-sage-400" size={32} />
            <h1 className="text-2xl font-black uppercase tracking-tight">{locale === 'en' ? 'Verify employee identity' : locale === 'zh' ? '验证员工身份' : 'ยืนยันตัวตนพนักงาน'}</h1>
            <p className="text-gray-400 text-sm mt-1">{locale === 'en' ? 'Please fill in real information for use in verifying your identity and transferring compensation.' : locale === 'zh' ? '请填写真实信息，用于验证您的身份和转移报酬。' : 'กรุณากรอกข้อมูลจริงเพื่อใช้ในการยืนยันตัวตนและโอนเงินจ่ายค่าตอบแทน'}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {status && (
              <div className={`p-4 rounded-xl flex gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                <span className="text-sm font-medium">{status.message}</span>
              </div>
            )}

            {/* ID Card Upload */}
            <div className="space-y-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">{locale === 'en' ? 'ID card photo (Hold a pair of faces for speed)' : locale === 'zh' ? '身份证照片（抓拍两张脸速度）' : 'รูปถ่ายบัตรประชาชน (ถือคู่ใบหน้าเพื่อความรวดเร็ว)'}</label>
              <div className="relative aspect-video rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center overflow-hidden group hover:border-black transition-all">
                {idCardPhotoUrl ? (
                  <>
                    <img src={idCardPhotoUrl} alt="ID Card" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                       <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">{locale === 'en' ? 'change shape' : locale === 'zh' ? '改变形状' : 'เปลี่ยนรูป'}</label>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="text-gray-300 mb-2" size={32} />
                    <span className="text-xs text-gray-400">{locale === 'en' ? 'Click to upload photo.' : locale === 'zh' ? '点击上传照片。' : 'คลิกเพื่ออัปโหลดรูปภาพ'}</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                {uploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <Loader2 className="animate-spin text-black" size={24} />
                  </div>
                )}
              </div>
            </div>

            {/* Identity Info */}
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">{locale === 'en' ? '13 digit ID card number' : locale === 'zh' ? '13位身份证号码' : 'เลขบัตรประชาชน 13 หลัก'}</label>
                <input
                  required
                  type="text"
                  maxLength={13}
                  value={formData.id_card_number}
                  onChange={(e) => setFormData({ ...formData, id_card_number: e.target.value })}
                  placeholder="0-0000-00000-00-0"
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-black transition-all"
                />
              </div>
            </div>

            {/* Bank Info */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Landmark className="text-gray-400" size={20} />
                <h3 className="text-sm font-bold uppercase tracking-widest">{locale === 'en' ? 'Bank account information' : locale === 'zh' ? '银行账户信息' : 'ข้อมูลบัญชีธนาคาร'}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">{locale === 'en' ? 'bank' : locale === 'zh' ? '银行' : 'ธนาคาร'}</label>
                  <select
                    required
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-black transition-all"
                  >
                    <option value="">{locale === 'en' ? 'Choose a bank' : locale === 'zh' ? '选择银行' : 'เลือกธนาคาร'}</option>
                    <option value={locale === 'en' ? 'Kasikorn Thai' : locale === 'zh' ? '泰泰华泰' : 'กสิกรไทย'}>{locale === 'en' ? 'Kasikorn Thai' : locale === 'zh' ? '泰泰华泰' : 'กสิกรไทย'}</option>
                    <option value={locale === 'en' ? 'Siam Commercial Bank' : locale === 'zh' ? '暹罗商业银行' : 'ไทยพาณิชย์'}>{locale === 'en' ? 'Siam Commercial Bank' : locale === 'zh' ? '暹罗商业银行' : 'ไทยพาณิชย์'}</option>
                    <option value={locale === 'en' ? 'Bangkok' : locale === 'zh' ? '曼谷' : 'กรุงเทพ'}>{locale === 'en' ? 'Bangkok' : locale === 'zh' ? '曼谷' : 'กรุงเทพ'}</option>
                    <option value={locale === 'en' ? 'Ayutthaya' : locale === 'zh' ? '大城府' : 'กรุงศรีอยุธยา'}>{locale === 'en' ? 'Ayutthaya' : locale === 'zh' ? '大城府' : 'กรุงศรีอยุธยา'}</option>
                    <option value={locale === 'en' ? 'Krungthai' : locale === 'zh' ? '恭泰' : 'กรุงไทย'}>{locale === 'en' ? 'Krungthai' : locale === 'zh' ? '恭泰' : 'กรุงไทย'}</option>
                    <option value={locale === 'en' ? 'saving' : locale === 'zh' ? '保存' : 'ออมสิน'}>{locale === 'en' ? 'saving' : locale === 'zh' ? '保存' : 'ออมสิน'}</option>
                    <option value={locale === 'en' ? 'Thanachart Thai soldiers' : locale === 'zh' ? '塔那查泰国士兵' : 'ทหารไทยธนชาต'}>{locale === 'en' ? 'Thanachart Thai soldiers' : locale === 'zh' ? '塔那查泰国士兵' : 'ทหารไทยธนชาต'}</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">{locale === 'en' ? 'bank account number' : locale === 'zh' ? '银行帐号' : 'เลขบัญชีธนาคาร'}</label>
                  <input
                    required
                    type="text"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                    placeholder="000-0-00000-0"
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              disabled={loading || uploading}
              className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'บันทึกและส่งข้อมูลตรวจสอบ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
