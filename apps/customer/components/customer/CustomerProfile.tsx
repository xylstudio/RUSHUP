'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Mail, Phone, MapPin, Globe, ShieldCheck, 
  MessageCircle, Settings2, Lock, LogOut, CheckCircle2,
  ArrowRight, ArrowLeft, BellRing, Languages, Smartphone,
  Camera, Briefcase, Building2, Upload, Loader2, Info, Check,
  Home, Edit3, Trash2, Plus, ShoppingBag, Heart
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
  // Instagram Grid Items (Dummy data for now, could be replaced with real orders/items)
  const gridItems = [
    { id: 1, type: 'order', label: 'Order #1234', icon: <ShoppingBag size={24} /> },
    { id: 2, type: 'house', label: 'My House', icon: <Home size={24} /> },
    { id: 3, type: 'report', label: 'Service Report', icon: <Info size={24} /> },
    { id: 4, type: 'order', label: 'Order #1235', icon: <ShoppingBag size={24} /> },
    { id: 5, type: 'order', label: 'Order #1236', icon: <ShoppingBag size={24} /> },
    { id: 6, type: 'house', label: 'Office', icon: <Building2 size={24} /> },
  ]

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-32 bg-white text-gray-900">
      
      {/* HEADER (Username and Settings) */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock size={16} strokeWidth={2} />
          <h1 className="text-base font-semibold">{displayName || profile?.email?.split('@')[0] || 'Member'}</h1>
        </div>
        <button 
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
          className="w-8 h-8 flex items-center justify-center text-gray-900 hover:text-red-500 transition-colors rounded-full"
        >
          <LogOut size={20} strokeWidth={1.5} />
        </button>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'menu' ? (
          <motion.div 
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 1. INSTAGRAM PROFILE TOP SECTION */}
            <section className="pt-6 px-4">
              <div className="flex items-center justify-between mb-4">
                {/* Avatar */}
                <div className="w-20 h-20 bg-gradient-to-tr from-yellow-400 via-orange-500 to-purple-500 rounded-full p-[2px] flex-shrink-0 cursor-pointer">
                  <div className="w-full h-full bg-white rounded-full p-[2px]">
                    <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-2xl text-gray-400 overflow-hidden">
                       {profile?.avatar_url ? (
                         <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                       ) : (
                         displayName ? displayName.charAt(0).toUpperCase() : <User size={32} strokeWidth={1.5} />
                       )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex-1 flex items-center justify-around ml-6">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-semibold leading-tight">12</span>
                    <span className="text-xs text-gray-500">Orders</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-semibold leading-tight">2</span>
                    <span className="text-xs text-gray-500">Places</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-semibold leading-tight">850</span>
                    <span className="text-xs text-gray-500">Pts</span>
                  </div>
                </div>
              </div>

              {/* BIO SECTION */}
              <div className="mb-4">
                <h2 className="font-semibold text-sm leading-tight">{displayName || copy.memberLabel}</h2>
                <p className="text-sm text-gray-600 mt-0.5">{profile?.email}</p>
                {address && <p className="text-sm mt-0.5">{address}</p>}
                {phone && <p className="text-sm text-blue-900 mt-0.5">{phone}</p>}
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 mb-6">
                <button 
                  onClick={() => setActiveTab('personal')}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-sm font-semibold rounded-lg py-1.5"
                >
                  {copy.editPersonalInfo || 'Edit Profile'}
                </button>
                <button 
                  className="flex-1 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-sm font-semibold rounded-lg py-1.5"
                >
                  Share Profile
                </button>
              </div>

              {/* STORY HIGHLIGHTS (SETTINGS) */}
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 mb-4">
                {menuItems.filter(m => m.id !== 'personal').map((item) => (
                  <div 
                    key={item.id} 
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                    onClick={() => {
                      if (item.isLink) window.location.href = item.href || '/'
                      else setActiveTab(item.id as ActiveTab)
                    }}
                  >
                    <div className="w-16 h-16 rounded-full border border-gray-200 p-0.5 group-active:scale-95 transition-transform">
                      <div className={`w-full h-full rounded-full flex items-center justify-center ${item.color.split(' ')[0]} ${item.color.split(' ')[1]}`}>
                        {item.icon}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-900 truncate max-w-[64px] text-center">{item.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* CONTENT GRID */}
            <section className="border-t border-gray-100">
              <div className="flex justify-around items-center h-12 border-b border-gray-100">
                 <button className="flex-1 flex justify-center items-center h-full border-b-2 border-gray-900 text-gray-900">
                    <ShoppingBag size={20} strokeWidth={1.5} />
                 </button>
                 <button className="flex-1 flex justify-center items-center h-full text-gray-400">
                    <Info size={20} strokeWidth={1.5} />
                 </button>
                 <button className="flex-1 flex justify-center items-center h-full text-gray-400">
                    <Heart size={20} strokeWidth={1.5} />
                 </button>
              </div>
              
              <div className="grid grid-cols-3 gap-0.5 mt-0.5">
                {gridItems.map((item) => (
                  <div key={item.id} className="aspect-square bg-gray-100 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors cursor-pointer">
                    {item.icon}
                    <span className="text-[10px] mt-2 font-medium">{item.label}</span>
                  </div>
                ))}
                {/* Fill empty spots if needed to look like a grid */}
                {[...Array(3)].map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square bg-gray-50" />
                ))}
              </div>
            </section>
          </motion.div>
        ) : (
          /* EDIT VIEWS */
          <motion.div 
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full bg-white relative z-50"
          >
            {/* Header */}
            <header className="sticky top-0 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveTab('menu')} className="active:opacity-50">
                  <ArrowLeft size={24} strokeWidth={1.5} />
                </button>
                <h1 className="text-base font-semibold">
                  {activeTab === 'personal' ? (copy.editPersonalInfo || 'Edit Profile') : activeTab === 'line' ? (copy.lineNotificationHeader || 'LINE') : activeTab === 'language' ? (copy.languageSettingsTitle || 'Language') : (copy.securityLabel || 'Security')}
                </h1>
              </div>
            </header>

            <div className="p-4">
              {activeTab === 'personal' && (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  {/* Change Avatar Mockup */}
                  <div className="flex flex-col items-center py-4">
                    <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
                      {displayName ? displayName.charAt(0).toUpperCase() : <User size={32} strokeWidth={1.5} />}
                    </div>
                    <button type="button" className="text-blue-500 font-semibold text-sm">Change profile photo</button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col border-b border-gray-200 pb-2">
                      <label className="text-xs text-gray-500 mb-1">{copy.displayNameLabel || 'Name'}</label>
                      <input 
                        type="text" 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)} 
                        className="text-sm focus:outline-none" 
                        placeholder={copy.displayNamePlaceholder || 'Your Name'}
                      />
                    </div>
                    <div className="flex flex-col border-b border-gray-200 pb-2">
                      <label className="text-xs text-gray-500 mb-1">{copy.phoneNumberLabel || 'Phone'}</label>
                      <input 
                        type="tel" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        className="text-sm focus:outline-none" 
                        placeholder={copy.phonePlaceholder || 'Phone Number'}
                      />
                    </div>
                    <div className="flex flex-col border-b border-gray-200 pb-2">
                      <label className="text-xs text-gray-500 mb-1">{copy.contactAddressLabel || 'Bio / Address'}</label>
                      <textarea 
                        rows={2} 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        className="text-sm focus:outline-none resize-none" 
                        placeholder={copy.addressPlaceholder || 'Your Address...'}
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full py-3 mt-4 bg-blue-500 text-white rounded-lg text-sm font-semibold active:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {isSubmitting ? (copy.savingChanges || 'Saving...') : (copy.saveChanges || 'Done')}
                  </button>
                </form>
              )}

              {activeTab === 'line' && (
                <div className="text-center pt-8 px-4">
                  <div className="flex justify-center mb-6">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${lineUserId ? 'bg-[#06C755] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <MessageCircle size={32} strokeWidth={1.5} />
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">LINE Connect</h4>
                  <p className={`text-sm font-medium mb-4 ${lineUserId ? 'text-[#06C755]' : 'text-gray-500'}`}>
                    {lineUserId ? (copy.serviceConnected || 'Connected') : (copy.notConnected || 'Not Connected')}
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed mb-8">
                    {copy.lineConnectDesc || 'Connect with LINE to receive real-time notifications for your services.'}
                  </p>
                  <a 
                    href="/api/auth/line/link" 
                    className={`w-full py-3 text-sm font-semibold rounded-lg text-center block transition-colors ${lineUserId ? 'bg-gray-100 text-gray-900' : 'bg-[#06C755] text-white'}`}
                  >
                    {lineUserId ? (copy.updateConnection || 'Update Connection') : (copy.connectLineNow || 'Connect LINE')}
                  </a>
                </div>
              )}

              {activeTab === 'language' && (
                <div className="pt-4">
                  <LanguageSettings />
                </div>
              )}

              {activeTab === 'security' && (
                <div className="pt-8 px-4 text-center">
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-900 flex items-center justify-center">
                      <Lock size={24} strokeWidth={1.5} />
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold mb-2">{copy.securityLabel || 'Security'}</h4>
                  <p className="text-sm text-gray-500 mb-8">
                    {copy.passwordDesc || 'Manage your password and security settings.'}
                  </p>
                  <button className="w-full py-3 bg-gray-100 text-gray-900 rounded-lg text-sm font-semibold">
                    {copy.changePassword || 'Change Password'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST FEEDBACK */}
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }} 
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300]"
          >
            <div className={`px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
              feedback.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'
            }`}>
              {feedback.type === 'success' ? <Check size={16} /> : <Info size={16} />}
              <span className="text-sm font-medium">{feedback.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CustomerProfile
