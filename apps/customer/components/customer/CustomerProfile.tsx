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
    <div className="screen-view h-full overflow-y-auto no-scrollbar pb-32 bg-[#FAFAFA]">
      
      {/* 1. INSTAGRAM STYLE HEADER */}
      <section className="pt-16 pb-8 px-6 bg-white border-b border-gray-100">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1" />
          <button 
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded-full"
          >
            <LogOut size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-gray-100 text-gray-500 flex items-center justify-center text-4xl rounded-full mb-4 shadow-sm">
            {displayName ? displayName.charAt(0).toUpperCase() : <User size={40} strokeWidth={1.5} />}
          </div>
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">
            {displayName || copy.memberLabel}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {profile?.email}
          </p>
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
            className="mt-6"
          >
            {/* Group 1: Personal & Estates */}
            <div className="px-4 mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">{copy.accountSettings || 'Account Settings'}</h3>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <button 
                  onClick={() => setActiveTab('personal')}
                  className="w-full flex items-center gap-4 p-4 text-left active:bg-gray-50 transition-colors border-b border-gray-50 group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                    <User size={20} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-gray-800">{copy.personalInfo || 'Personal Information'}</h4>
                  </div>
                  <ArrowRight size={18} strokeWidth={1.5} className="text-gray-300 group-hover:text-gray-500" />
                </button>

                <Link 
                  href="/dashboard/customer/houses"
                  className="w-full flex items-center gap-4 p-4 text-left active:bg-gray-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                    <Home size={20} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-gray-800">{copy.myEstates || 'My Estates'}</h4>
                  </div>
                  <ArrowRight size={18} strokeWidth={1.5} className="text-gray-300 group-hover:text-gray-500" />
                </Link>
              </div>
            </div>

            {/* Group 2: General Settings */}
            <div className="px-4 mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">{copy.generalSettings || 'General Settings'}</h3>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {menuItems.filter(m => !['personal', 'houses'].includes(m.id)).map((item, index, arr) => (
                  <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id as ActiveTab)}
                    className={`w-full flex items-center gap-4 p-4 text-left active:bg-gray-50 transition-colors group ${index < arr.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.id === 'line' ? 'bg-[#06C755]/10 text-[#06C755]' :
                      item.id === 'language' ? 'bg-orange-50 text-orange-500' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-medium text-gray-800">{item.label}</h4>
                      {item.id === 'line' && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
                      )}
                    </div>
                    <ArrowRight size={18} strokeWidth={1.5} className="text-gray-300 group-hover:text-gray-500" />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="px-4 pb-8">
              <button 
                onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
                className="w-full py-4 text-red-500 text-sm font-medium rounded-2xl active:bg-red-50 transition-colors text-center bg-white border border-gray-100 shadow-sm"
              >
                {copy.logoutLabel || 'Log Out'}
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
            className="mt-6 px-4"
          >
            {/* Sub Header */}
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setActiveTab('menu')} className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-200 transition-colors">
                <ArrowLeft size={24} strokeWidth={1.5} className="text-gray-900" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {activeTab === 'personal' ? (copy.editPersonalInfo || 'Edit Profile') : activeTab === 'line' ? (copy.lineNotificationHeader || 'LINE Notifications') : activeTab === 'language' ? (copy.languageSettingsTitle || 'Language Settings') : (copy.securityLabel || 'Security')}
              </h2>
            </div>

            <div className="space-y-6">
              {activeTab === 'personal' && (
                <form onSubmit={handleUpdateProfile} className="space-y-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600 px-1">{copy.displayNameLabel || 'Display Name'}</label>
                      <input 
                        type="text" 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)} 
                        className="w-full bg-gray-50 border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-2xl p-4 text-base transition-all outline-none" 
                        placeholder={copy.displayNamePlaceholder || 'Your Name'}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600 px-1">{copy.phoneNumberLabel || 'Phone Number'}</label>
                      <input 
                        type="tel" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        className="w-full bg-gray-50 border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-2xl p-4 text-base transition-all outline-none" 
                        placeholder={copy.phonePlaceholder || '08X XXX XXXX'}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600 px-1">{copy.contactAddressLabel || 'Address'}</label>
                      <textarea 
                        rows={3} 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        className="w-full bg-gray-50 border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 rounded-2xl p-4 text-base transition-all outline-none resize-none" 
                        placeholder={copy.addressPlaceholder || 'Your Address...'}
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full py-4 mt-2 bg-gray-900 text-white rounded-2xl text-base font-medium active:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                    {isSubmitting ? (copy.savingChanges || 'Saving...') : (copy.saveChanges || 'Save Changes')}
                  </button>
                </form>
              )}

              {activeTab === 'line' && (
                <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-sm">
                  <div className="flex justify-center mb-6">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${lineUserId ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <MessageCircle size={32} strokeWidth={1.5} />
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">LINE Official Connect</h4>
                  <p className={`text-sm font-medium mb-4 ${lineUserId ? 'text-[#06C755]' : 'text-gray-500'}`}>
                    {lineUserId ? (copy.serviceConnected || 'Connected') : (copy.notConnected || 'Not Connected')}
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed mb-8">
                    {copy.lineConnectDesc || 'Connect with LINE to receive real-time notifications for your garden care services.'}
                  </p>
                  <a 
                    href="/api/auth/line/link" 
                    className={`w-full py-4 text-sm font-semibold rounded-2xl text-center block transition-colors ${lineUserId ? 'bg-gray-100 text-gray-800 active:bg-gray-200' : 'bg-[#06C755] text-white active:bg-[#05b34c]'}`}
                  >
                    {lineUserId ? (copy.updateConnection || 'Update Connection') : (copy.connectLineNow || 'Connect LINE')}
                  </a>
                </div>
              )}

              {activeTab === 'language' && (
                <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-sm">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                      <Languages size={32} strokeWidth={1.5} />
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{copy.languageSettingsTitle || 'Language Settings'}</h4>
                  <p className="text-sm text-gray-500 mb-8">
                    {copy.selectLanguageDesc || 'Select your preferred language.'}
                  </p>
                  <div className="text-left bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <LanguageSettings />
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-sm">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                      <Lock size={32} strokeWidth={1.5} />
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{copy.securityLabel || 'Security'}</h4>
                  <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                    {copy.passwordDesc || 'Manage your password to keep your account secure.'}
                  </p>
                  <button className="w-full py-4 bg-gray-100 text-gray-800 rounded-2xl text-sm font-semibold active:bg-gray-200 transition-colors">
                    {copy.changePassword || 'Change Password'}
                  </button>
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
            className="fixed bottom-24 left-6 right-6 z-[300] flex justify-center"
          >
            <div className={`px-6 py-3 rounded-full shadow-lg flex items-center gap-3 ${
              feedback.type === 'success' 
              ? 'bg-gray-900 text-white' 
              : 'bg-red-600 text-white'
            }`}>
              {feedback.type === 'success' ? <Check size={18} /> : <Info size={18} />}
              <span className="text-sm font-medium">{feedback.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CustomerProfile
