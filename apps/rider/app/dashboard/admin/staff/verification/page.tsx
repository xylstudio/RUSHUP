'use client';
import React, { useEffect, useState } from 'react'
import { Shield, CheckCircle, XCircle, Loader2, Eye, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/AuthContext'
import { useI18n } from "@/lib/I18nContext";

interface PendingStaff {
  id: string
  profile_id: string
  id_card_number: string
  id_card_photo_url: string
  bank_name: string
  bank_account_number: string
  created_at: string
  profiles: {
    display_name: string
    email: string
    department: string
  }
}

export default function AdminStaffVerificationPage() {
    const { locale } = useI18n();
  const { profile: adminProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [pendingList, setPendingList] = useState<PendingStaff[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (adminProfile?.role === 'admin') {
      fetchPendingStaff()
    }
  }, [adminProfile])

  const fetchPendingStaff = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('staff_identity')
      .select('*, profiles(display_name, email, department)')
      .is('verified_at', null)
      .order('created_at', { ascending: true })

    if (data) {
      setPendingList(data as any)
    }
    setLoading(false)
  }

  const handleApprove = async (staff: PendingStaff) => {
    setProcessingId(staff.id)
    try {
      // 1. Mark identity as verified
      const { error: identityError } = await supabase
        .from('staff_identity')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', staff.id)

      if (identityError) throw identityError

      // 2. Update profile is_verified status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', staff.profile_id)

      if (profileError) throw profileError

      setMessage({ type: 'success', text: `อนุมัติพนักงาน ${staff.profiles.display_name} เรียบร้อยแล้ว` })
      fetchPendingStaff()
    } catch (err: any) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด: ' + err.message })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (staff: PendingStaff) => {
    if (!confirm(`คุณต้องการปฏิเสธการยืนยันตัวตนของ ${staff.profiles.display_name} ใช่หรือไม่? พนักงานจะต้องส่งข้อมูลใหม่ทั้งหมด`)) return
    
    setProcessingId(staff.id)
    try {
      const { error } = await supabase
        .from('staff_identity')
        .delete()
        .eq('id', staff.id)

      if (error) throw error

      setMessage({ type: 'success', text: `ปฏิเสธการยืนยันตัวตนของ ${staff.profiles.display_name} เรียบร้อยแล้ว` })
      fetchPendingStaff()
    } catch (err: any) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด: ' + err.message })
    } finally {
      setProcessingId(null)
    }
  }

  if (adminProfile?.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-[#F7F7F2] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Staff Management</div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900 mt-1">{locale === 'en' ? 'Approve new employees' : locale === 'zh' ? '批准新员工' : 'อนุมัติพนักงานใหม่'}</h1>
          </div>
          <div className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Shield size={16} className="text-sage-400" />
            {pendingList.length} {locale === 'en' ? 'Items waiting to be checked' : locale === 'zh' ? '等待检查的物品' : ' รายการที่รอตรวจ           '}</div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-2xl flex gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-gray-300 mb-4" size={40} />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">{locale === 'en' ? 'Loading data...' : locale === 'zh' ? '正在加载数据...' : 'กำลังโหลดข้อมูล...'}</p>
          </div>
        ) : pendingList.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 border border-gray-100 text-center">
            <CheckCircle className="text-gray-200 mx-auto mb-4" size={64} />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">{locale === 'en' ? 'There are no items pending approval.' : locale === 'zh' ? '没有待批准的项目。' : 'ไม่มีรายการที่รอการอนุมัติ'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {pendingList.map((staff) => (
              <div key={staff.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-8">
                {/* ID Photo Preview */}
                <div className="w-full lg:w-72 aspect-video lg:aspect-square bg-gray-50 rounded-2xl overflow-hidden relative group">
                  <img src={staff.id_card_photo_url} alt="ID Card" className="w-full h-full object-cover" />
                  <a 
                    href={staff.id_card_photo_url} 
                    target="_blank" 
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white text-xs font-bold uppercase tracking-widest gap-2"
                  >
                    <ExternalLink size={16} /> {locale === 'en' ? 'View full size picture' : locale === 'zh' ? '查看全尺寸图片' : ' ดูรูปขนาดเต็ม                   '}</a>
                </div>

                {/* Staff Details */}
                <div className="flex-1 flex flex-col justify-between py-2">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                        {staff.profiles.department || 'ไม่ระบุแผนก'}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {locale === 'en' ? 'Sent when:' : locale === 'zh' ? '发送时间：' : '                         ส่งเมื่อ: '}{new Date(staff.created_at).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-1">{staff.profiles.display_name}</h2>
                    <p className="text-gray-500 text-sm mb-6">{staff.profiles.email}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">{locale === 'en' ? 'ID card number' : locale === 'zh' ? '身份证号码' : 'เลขบัตรประชาชน'}</label>
                        <p className="font-mono text-lg font-black text-gray-800 tracking-wider font-bold uppercase tracking-widest">{staff.id_card_number}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">{locale === 'en' ? 'bank account' : locale === 'zh' ? '银行账户' : 'บัญชีธนาคาร'}</label>
                        <p className="text-sm font-bold text-gray-800">{staff.bank_name}</p>
                        <p className="font-mono text-sm font-black text-gray-600">{staff.bank_account_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      onClick={() => handleApprove(staff)}
                      disabled={processingId === staff.id}
                      className="flex-1 bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                    >
                      {processingId === staff.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      {locale === 'en' ? 'Approve identity verification' : locale === 'zh' ? '批准身份验证' : '                       อนุมัติการยืนยันตัวตน                     '}</button>
                    <button
                      onClick={() => handleReject(staff)}
                      disabled={processingId === staff.id}
                      className="px-6 border border-red-100 text-red-600 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-red-50 transition-all disabled:opacity-30"
                    >
                      {locale === 'en' ? 'refuse' : locale === 'zh' ? '拒绝' : '                       ปฏิเสธ                     '}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
