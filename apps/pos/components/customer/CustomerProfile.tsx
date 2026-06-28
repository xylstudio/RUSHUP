'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Mail, Phone, MapPin, Globe, ShieldCheck, 
  MessageCircle, Settings2, Lock, LogOut, CheckCircle2,
  ArrowRight, ArrowLeft, BellRing, Languages, Smartphone,
  Camera, Briefcase, Building2, Upload, Loader2, Info, Check,
  Home, Edit3, Trash2, Plus
} from 'lucide-react'
import Link from 'next/link'

interface CustomerProfileProps {
  profile: any
  copy: any
  supabase: any
  WebsiteLanguageSettings: React.ComponentType
}

type ActiveTab = 'menu' | 'personal' | 'houses' | 'line' | 'language' | 'security'

const CustomerProfile: React.FC<CustomerProfileProps> = ({ 
  profile, 
  copy, 
  supabase, 
  WebsiteLanguageSettings: LanguageSettings 
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('menu')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null)
  
  // Form States
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [address, setAddress] = useState(profile?.address || '')
  const [lineUserId, setLineUserId] = useState(profile?.line_user_id || null)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setPhone(profile.phone || '')
      setAddress(profile.address || '')
      setLineUserId(profile.line_user_id || null)

      // AUTO-SYNC LINE ID IF LOGGED IN VIA LINE
      const syncLineId = async () => {
        if (!profile.line_user_id) {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return
          const lineIdentity = user?.identities?.find((id: any) => id.provider === 'line')
          const metaLineId = user?.user_metadata?.line_user_id || user?.user_metadata?.lineUserId || user?.user_metadata?.provider_id
          
          const lineId = metaLineId || lineIdentity?.identity_data?.sub || lineIdentity?.id
          if (lineId) {
            console.log('Auto-syncing LINE ID:', lineId)
            await supabase
              .from('profiles')
              .update({ line_user_id: lineId })
              .eq('id', profile.id)
            
            setLineUserId(lineId)
          }
        }
      }
      syncLineId()
    }
  }, [profile, supabase])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        phone: phone,
        address: address,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (error) {
      setFeedback({ type: 'error', message: error.message })
    } else {
      setFeedback({ type: 'success', message: copy.savedSuccessfully || 'บันทึกข้อมูลเรียบร้อยแล้ว' })
      setTimeout(() => setActiveTab('menu'), 1500)
    }
    setIsSubmitting(false)
  }

  const menuItems = [
    { 
      id: 'personal', 
      label: copy.personalInfo || 'ข้อมูลส่วนตัว', 
      sub: copy.personalInfoDesc || 'จัดการชื่อ เบอร์โทร และที่อยู่ติดต่อ', 
      icon: <User size={24} />, 
      color: 'bg-[#1D2D24]/10 text-[#1D2D24]' 
    },
    { 
      id: 'houses', 
      label: copy.myEstates || 'สถานที่ของฉัน', 
      sub: copy.myEstatesDesc || 'จัดการบ้านและสถานที่รับบริการ', 
      icon: <Home size={24} />, 
      color: 'bg-blue-50 text-blue-600',
      isLink: true,
      href: '/dashboard/customer/houses'
    },
    { 
      id: 'line', 
      label: copy.lineNotificationTitle || 'LINE Official', 
      sub: lineUserId ? (copy.lineConnected || 'เชื่อมต่อแล้ว') : (copy.lineNotConnected || 'ยังไม่ได้เชื่อมต่อการแจ้งเตือน'), 
      icon: <MessageCircle size={24} />, 
      color: 'bg-[#06C755]/10 text-[#06C755]' 
    },
    { 
      id: 'language', 
      label: copy.languageSystem || 'ภาษาและระบบ', 
      sub: copy.languageDesc || 'ตั้งค่าการแสดงผลและภาษาที่ใช้', 
      icon: <Languages size={24} />, 
      color: 'bg-orange-50 text-orange-600' 
    },
    { 
      id: 'security', 
      label: copy.securityLabel || 'ความปลอดภัย', 
      sub: copy.securityDesc || 'จัดการรหัสผ่านและการเข้าถึง', 
      icon: <Lock size={24} />, 
      color: 'bg-gray-50 text-gray-600' 
    },
  ]

  return (
    <div className="screen-view h-full overflow-y-auto no-scrollbar pb-32 bg-white">
      
      {/* 1. COMPACT APP HEADER */}
      <section className="pt-16 pb-12 px-6 border-b border-black/5">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-[#1A1A18] text-[#E4BBAE] flex items-center justify-center text-3xl font-serif-thai rounded-none border border-black/10 shrink-0">
            {displayName ? displayName.charAt(0).toUpperCase() : <User size={32} strokeWidth={1} />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif-thai text-3xl text-[#111111] leading-tight uppercase truncate">
              {displayName || copy.memberLabel}
            </h1>
            <p className="sans-font text-[10px] font-bold text-black/30 uppercase tracking-widest mt-1 truncate">
              {profile?.email}
            </p>
          </div>
          <button 
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
            className="w-12 h-12 border border-black/5 flex items-center justify-center text-black/30 hover:text-red-500 transition-colors"
          >
            <LogOut size={18} strokeWidth={1.5} />
          </button>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {activeTab === 'menu' ? (
          /* 2. MOBILE APP LIST LAYOUT */
          <motion.div 
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-8 px-6 space-y-3"
          >
            <span className="sans-font text-[10px] font-black uppercase tracking-[0.3em] text-black/20 block mb-6 px-2">{copy.accountSettings || 'การตั้งค่าบัญชี'}</span>
            
            {/* Personal Info - Full Width List Item */}
            <button 
              onClick={() => setActiveTab('personal')}
              className="w-full flex items-center gap-5 p-6 bg-[#FAF9F6] border border-black/5 rounded-none text-left active:bg-black active:text-white transition-all group"
            >
              <div className="w-10 h-10 flex items-center justify-center border border-black/5 group-active:border-white/20 transition-colors">
                <User size={18} strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="font-serif-thai text-lg uppercase tracking-tight">{copy.personalInfo || 'ข้อมูลส่วนตัว'}</h3>
                <p className="sans-font text-[9px] font-bold text-black/30 group-active:text-white/40 uppercase tracking-widest mt-0.5">{copy.personalInfoDesc || 'แก้ไขชื่อ และข้อมูลติดต่อของคุณ'}</p>
              </div>
              <ArrowRight size={16} strokeWidth={1} className="text-black/20 group-active:text-white" />
            </button>

            {/* My Estates - Full Width List Item */}
            <Link 
              href="/dashboard/customer/houses"
              className="w-full flex items-center gap-5 p-6 bg-white border border-black rounded-none text-left active:invert transition-all group"
            >
              <div className="w-10 h-10 flex items-center justify-center border border-black/5">
                <Home size={18} strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="font-serif-thai text-lg uppercase tracking-tight">{copy.myEstates || 'สถานที่ของฉัน'}</h3>
                <p className="sans-font text-[9px] font-bold text-black/30 uppercase tracking-widest mt-0.5">{copy.myEstatesDesc || 'จัดการบ้าน และที่อยู่รับบริการ'}</p>
              </div>
              <ArrowRight size={16} strokeWidth={1} className="text-black/20" />
            </Link>

            <div className="pt-8 space-y-3">
              <span className="sans-font text-[10px] font-black uppercase tracking-[0.3em] text-black/20 block mb-4 px-2">{copy.generalSettings || 'การตั้งค่าทั่วไป'}</span>
              
              {menuItems.filter(m => !['personal', 'houses'].includes(m.id)).map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ActiveTab)}
                  className="w-full flex items-center gap-5 p-5 bg-white border border-black/5 rounded-none text-left active:bg-gray-50 transition-all group"
                >
                  <div className="w-10 h-10 flex items-center justify-center text-black/30 group-active:text-black transition-colors">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif-thai text-base uppercase tracking-tight">{item.label}</h3>
                    <p className="sans-font text-[9px] font-bold text-black/20 uppercase tracking-widest mt-0.5">
                      {item.sub}
                    </p>
                  </div>
                  <ArrowRight size={16} strokeWidth={1} className="text-black/10" />
                </button>
              ))}
            </div>
            
            <div className="pt-12">
              <button 
                onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
                className="w-full py-5 border border-red-100 text-red-500 sans-font text-[11px] font-black uppercase tracking-[0.4em] active:bg-red-50 transition-all"
              >
                {copy.logoutLabel || 'ออกจากระบบ (Logout)'}
              </button>
            </div>
          </motion.div>
        ) : (
          /* 3. MOBILE OPTIMIZED EDIT VIEWS */
          <motion.div 
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="mt-8 px-6"
          >
            {/* Sub Header */}
            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-black/5">
              <button onClick={() => setActiveTab('menu')} className="w-10 h-10 flex items-center justify-center border border-black/5 active:bg-black active:text-white transition-all">
                <ArrowLeft size={18} strokeWidth={1.5} />
              </button>
              <h2 className="font-serif-thai text-xl uppercase tracking-tight text-[#111111]">
                {activeTab === 'personal' ? (copy.editPersonalInfo || 'แก้ไขข้อมูลส่วนตัว') : activeTab === 'line' ? (copy.lineNotificationHeader || 'การแจ้งเตือน LINE') : activeTab === 'language' ? (copy.languageSettingsTitle || 'ตั้งค่าภาษา') : (copy.securityLabel || 'ความปลอดภัย')}
              </h2>
            </div>

            <div className="space-y-10">
              {activeTab === 'personal' && (
                <form onSubmit={handleUpdateProfile} className="space-y-8">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="sans-font text-[10px] font-black uppercase tracking-[0.3em] text-black/30 px-1">{copy.displayNameLabel || 'ชื่อที่แสดง'}</label>
                      <input 
                        type="text" 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)} 
                        className="w-full bg-[#FAF9F6] border border-black/5 focus:border-black rounded-none p-4 text-base transition-all outline-none" 
                        placeholder={copy.displayNamePlaceholder || 'ระบุชื่อ-นามสกุลของคุณ'}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="sans-font text-[10px] font-black uppercase tracking-[0.3em] text-black/30 px-1">{copy.phoneNumberLabel || 'เบอร์โทรศัพท์ติดต่อ'}</label>
                      <input 
                        type="tel" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        className="w-full bg-[#FAF9F6] border border-black/5 focus:border-black rounded-none p-4 text-base transition-all outline-none" 
                        placeholder={copy.phonePlaceholder || '08X XXX XXXX'}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="sans-font text-[10px] font-black uppercase tracking-[0.3em] text-black/30 px-1">{copy.contactAddressLabel || 'ที่อยู่ติดต่อ'}</label>
                      <textarea 
                        rows={3} 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        className="w-full bg-[#FAF9F6] border border-black/5 focus:border-black rounded-none p-4 text-base transition-all outline-none resize-none" 
                        placeholder={copy.addressPlaceholder || 'ระบุที่อยู่สำหรับการจัดส่งหรือติดต่อ...'}
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full py-5 bg-black text-white rounded-none sans-font text-[11px] font-black uppercase tracking-[0.5em] active:opacity-80 transition-all flex items-center justify-center gap-4"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {isSubmitting ? (copy.savingChanges || 'กำลังบันทึก...') : (copy.saveChanges || 'บันทึกการเปลี่ยนแปลง')}
                  </button>
                </form>
              )}

              {activeTab === 'line' && (
                <div className="space-y-8">
                  <div className="border border-black p-10 text-center space-y-8">
                    <div className="flex justify-center">
                      <div className={`w-16 h-16 flex items-center justify-center border border-black/5 ${lineUserId ? 'bg-[#06C755] text-white' : 'bg-[#FAF9F6] text-black/20'}`}>
                        <MessageCircle size={24} strokeWidth={1.5} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-serif-thai text-xl uppercase tracking-tight">LINE Official Connect</h4>
                      <p className="sans-font text-[9px] font-bold text-black/30 font-black uppercase tracking-widest">
                        {lineUserId ? (copy.serviceConnected || 'เชื่อมต่อบริการแล้ว') : (copy.notConnected || 'ยังไม่ได้เชื่อมต่อ')}
                      </p>
                    </div>
                    <p className="sans-font text-[11px] text-gray-400 leading-relaxed font-medium uppercase tracking-[0.1em]">
                      {copy.lineConnectDesc || 'เชื่อมต่อเพื่อรับการแจ้งเตือนสถานะงานดูแลสวนแบบเรียลไทม์ผ่าน LINE Official Account ของเรา'}
                    </p>
                    <a 
                      href="/api/auth/line/link" 
                      className={`w-full py-4 text-[11px] font-black uppercase tracking-[0.4em] text-center block transition-all ${lineUserId ? 'bg-white text-black border border-black' : 'bg-[#06C755] text-white'}`}
                    >
                      {lineUserId ? (copy.updateConnection || 'อัปเดตการเชื่อมต่อ') : (copy.connectLineNow || 'เชื่อมต่อ LINE ทันที')}
                    </a>
                  </div>
                </div>
              )}

              {activeTab === 'language' && (
                <div className="space-y-8">
                  <div className="border border-black p-10 text-center space-y-8">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 flex items-center justify-center border border-black/5 bg-[#FAF9F6] text-orange-500">
                        <Languages size={24} strokeWidth={1.5} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-serif-thai text-xl uppercase tracking-tight">{copy.languageSettingsTitle || 'การตั้งค่าภาษา'}</h4>
                      <p className="sans-font text-[9px] font-bold text-black/30 font-black uppercase tracking-widest">
                        {copy.selectLanguageDesc || 'เลือกภาษาที่ใช้ในระบบ'}
                      </p>
                    </div>
                    <div className="text-left mt-8">
                      <LanguageSettings />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div className="border border-black p-10 text-center space-y-8">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 flex items-center justify-center border border-black/5 bg-[#FAF9F6] text-black">
                        <Lock size={24} strokeWidth={1.5} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-serif-thai text-xl uppercase tracking-tight">{copy.securityLabel || 'ความปลอดภัย'}</h4>
                      <p className="sans-font text-[9px] font-bold text-black/30 font-black uppercase tracking-widest">
                        {copy.passwordManagement || 'การจัดการรหัสผ่าน'}
                      </p>
                    </div>
                    <p className="sans-font text-[11px] text-gray-400 leading-relaxed font-medium uppercase tracking-[0.1em]">
                      {copy.passwordDesc || 'การเปลี่ยนรหัสผ่านเป็นประจำช่วยเพิ่มความปลอดภัยให้กับบัญชีของคุณ'}
                    </p>
                    <button className="w-full py-4 border border-black text-black bg-white sans-font text-[11px] font-black uppercase tracking-[0.4em] active:bg-black active:text-white transition-all">
                      {copy.changePassword || 'เปลี่ยนรหัสผ่านใหม่'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. APP TOAST FEEDBACK */}
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }} 
            className="fixed bottom-10 left-6 right-6 z-[300]"
          >
            <div className={`p-5 border shadow-xl flex items-center gap-4 ${
              feedback.type === 'success' 
              ? 'bg-black text-[#E4BBAE] border-black' 
              : 'bg-red-700 text-white border-red-800'
            }`}>
              {feedback.type === 'success' ? <Check size={16} /> : <Info size={16} />}
              <span className="sans-font text-[11px] font-black uppercase tracking-widest">{feedback.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CustomerProfile
