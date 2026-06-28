'use client';
import { useState, useEffect } from 'react'
import { useAuth } from '../../../../lib/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, updateUserProfile, findBranchByZipCode } from '../../../../lib/supabaseClient'
import { timeZonesNames } from '@vvo/tzdb'
import WebsiteLanguageSettings from '@/components/settings/WebsiteLanguageSettings'
import { useI18n } from '@/lib/I18nContext'
import { appCopy, pickLocalizedText } from '@/lib/appLocale'
import { 
  User, Phone, Mail, MapPin, Globe, ShieldCheck, 
  MessageCircle, Settings2, Lock, LogOut, CheckCircle2,
  AlertCircle, ArrowRight, Camera, Briefcase, Building2,
  ArrowLeft, BellRing, Languages, Smartphone, Shield,
  CreditCard, Landmark, Upload, Loader2, Info, Check
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const LuxurySuccessAnimation = ({ message }: { message: string }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] flex items-center justify-center bg-white/90 backdrop-blur-md"
  >
    <div className="flex flex-col items-center gap-8 text-center px-12">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="relative h-24 w-24 flex items-center justify-center"
      >
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-zinc-900/5"
        />
        <div className="h-16 w-16 rounded-full bg-zinc-900 flex items-center justify-center text-white shadow-xl">
          <Check size={32} strokeWidth={3} />
        </div>
      </motion.div>
      <div className="space-y-3">
        <h3 className="text-3xl font-serif tracking-tight text-zinc-900 italic">
          {message}
        </h3>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
          Everything is set for your verification
        </p>
      </div>
    </div>
  </motion.div>
)

type LinePreferences = {
  enabled: boolean
  new_order: boolean
  job_assigned: boolean
  order_status: boolean
  system: boolean
}

type LineStatus = {
  linked: boolean
  lineUserId: string | null
  friendshipStatus: boolean | null
  friendshipCheckedAt: string | null
  messagingStatus: 'ready' | 'failed' | null
  messagingCheckedAt: string | null
  reason: string | null
  error: string | null
}

const DEFAULT_LINE_PREFS: LinePreferences = {
  enabled: true,
  new_order: false,
  job_assigned: true,
  order_status: true,
  system: true,
}

const DEFAULT_LINE_STATUS: LineStatus = {
  linked: false,
  lineUserId: null,
  friendshipStatus: null,
  friendshipCheckedAt: null,
  messagingStatus: null,
  messagingCheckedAt: null,
  reason: null,
  error: null,
}

const getLineStatusMessage = (status: LineStatus, locale: 'th' | 'en' | 'zh') => {
  const copy = appCopy.staffProfile
  if (!status.linked) return pickLocalizedText(locale, copy.lineNotLinked)
  if (status.messagingStatus === 'ready') return pickLocalizedText(locale, copy.lineReady)
  if (status.reason === 'line_official_account_not_added') return pickLocalizedText(locale, copy.lineMissingFriend)
  if (status.reason === 'line_official_account_link_unverified') return pickLocalizedText(locale, copy.lineUnverified)
  if (status.reason === 'missing_line_messaging_token') return pickLocalizedText(locale, copy.lineMissingToken)
  if (status.messagingStatus === 'failed') return pickLocalizedText(locale, copy.lineFailed)
  return pickLocalizedText(locale, copy.linePending)
}

type ActiveTab = 'menu' | 'personal' | 'work' | 'line' | 'language' | 'security' | 'verification' | 'payout'

export default function StaffProfile() {
  const { profile, loading, refreshProfile, signOut } = useAuth()
  const { locale } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const copy = appCopy.staffProfile
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('menu')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [timezone, setTimezone] = useState('Asia/Bangkok')
  const [address, setAddress] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [branchCode, setBranchCode] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [branchLookupError, setBranchLookupError] = useState<string | null>(null)
  const [linePrefs, setLinePrefs] = useState<LinePreferences>(DEFAULT_LINE_PREFS)
  const [lineRole, setLineRole] = useState('staff')
  const [lineLinked, setLineLinked] = useState(false)
  const [lineStatus, setLineStatus] = useState<LineStatus>(DEFAULT_LINE_STATUS)
  const [linePrefsLoading, setLinePrefsLoading] = useState(true)
  const [linePrefsSaving, setLinePrefsSaving] = useState(false)

  // Verification States
  const [verificationData, setVerificationData] = useState({
    id_card_number: '',
    bank_name: '',
    bank_account_number: '',
    id_card_photo_url: null as string | null
  })
  const [isIdentitySubmitted, setIsIdentitySubmitted] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [realTimeProfile, setRealTimeProfile] = useState<any>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [idExists, setIdExists] = useState(false)
  const [isCheckingId, setIsCheckingId] = useState(false)

  // 🚀 Auto-switch tab based on URL search params (e.g. ?tab=verification)
  useEffect(() => {
    const checkIdAvailability = async () => {
      if (verificationData.id_card_number.length === 13) {
        setIsCheckingId(true)
        try {
          const formData = new FormData()
          formData.append('action', 'check')
          formData.append('profileId', profile?.id || '')
          formData.append('idCardNumber', verificationData.id_card_number)

          const response = await fetch('/api/staff/verify-upload', {
            method: 'POST',
            body: formData
          })
          const result = await response.json()
          setIdExists(result.exists)
        } catch (err) {
          console.error('Check ID error:', err)
        } finally {
          setIsCheckingId(false)
        }
      } else {
        setIdExists(false)
      }
    }

    checkIdAvailability()
  }, [verificationData.id_card_number, profile?.id])

  useEffect(() => {
    const requestedTab = searchParams.get('tab') as ActiveTab
    if (requestedTab && ['personal', 'work', 'line', 'language', 'security', 'verification', 'payout'].includes(requestedTab)) {
      setActiveTab(requestedTab)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchLatestProfile = async () => {
        if (!profile?.id) return
        const { data } = await supabase.from('profiles').select('*').eq('id', profile.id).single()
        if (data) {
            setRealTimeProfile(data)
            console.log("DEBUG: Latest Profile Data:", data)
        }
    }
    
    // Force refresh profile data to get latest changes from admin
    refreshProfile().then(() => fetchLatestProfile())
  }, [profile?.id])

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setPhone(profile.phone || '')
      setTimezone(profile.timezone || 'Asia/Bangkok')
      setAddress(profile.address || '')
      setZipCode(profile.zip_code || '')
      setBranchCode(profile.branch_code || '')
      
      // Load verification info
      checkVerificationStatus()
    }
  }, [profile])

  const checkVerificationStatus = async () => {
    if (!profile?.id) return
    try {
        const { data } = await supabase
          .from('staff_identity')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle()
        
        if (data) {
          setIsIdentitySubmitted(true)
          setVerificationData({
            id_card_number: data.id_card_number || '',
            bank_name: data.bank_name || '',
            bank_account_number: data.bank_account_number || '',
            id_card_photo_url: data.id_card_photo_url || null
          })
        }
    } catch (err) {
        console.error('Check verification failed:', err)
    }
  }

  useEffect(() => {
    const loadLinePreferences = async () => {
      if (!profile?.id) return
      setLinePrefsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch('/api/notifications/preferences', {
          method: 'GET',
          headers: { ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
          credentials: 'include',
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result?.error || 'Failed to load LINE settings')
        setLinePrefs(result.linePreferences || DEFAULT_LINE_PREFS)
        setLineRole(result.role || profile?.role || 'staff')
        setLineLinked(Boolean(result.lineLinked))
        setLineStatus(result.lineStatus || DEFAULT_LINE_STATUS)
      } catch (error: any) {
        console.error(error)
      } finally {
        setLinePrefsLoading(false)
      }
    }
    void loadLinePreferences()
  }, [profile?.id, locale])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    setIsSubmitting(true)
    setFeedback(null)
    const { error } = await updateUserProfile(profile.id, {
      display_name: displayName,
      phone,
      timezone,
      address,
      zip_code: zipCode,
      branch_code: branchCode,
    })
    if (error) {
      setFeedback({ type: 'error', message: `${pickLocalizedText(locale, copy.saveProfileErrorPrefix)} ${error.message}` })
    } else {
      setFeedback({ type: 'success', message: pickLocalizedText(locale, copy.saveProfileSuccess) })
      await refreshProfile()
    }
    setIsSubmitting(false)
  }

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    if (!verificationData.id_card_photo_url) {
      setFeedback({ type: 'error', message: 'กรุณาอัปโหลดรูปถ่ายบัตรประชาชนก่อนส่งข้อมูล' })
      return
    }

    setIsSubmitting(true)
    try {
      // 🚀 Use the new Server-side API to bypass RLS issues for DB table
      const formData = new FormData()
      formData.append('action', 'submit')
      formData.append('profileId', profile.id)
      formData.append('idCardNumber', verificationData.id_card_number)
      formData.append('idCardPhotoUrl', verificationData.id_card_photo_url)
      formData.append('bankName', verificationData.bank_name)
      formData.append('bankAccountNumber', verificationData.bank_account_number)

      const response = await fetch('/api/staff/verify-upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed')
      }

      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        // Scroll to the top of the tab content to show the "Pending" box clearly
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 3000)
      
      setIsIdentitySubmitted(true)
      await refreshProfile()
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    if (file.size > 5 * 1024 * 1024) {
        setFeedback({ type: 'error', message: 'ขนาดรูปภาพต้องไม่เกิน 5MB' })
        return
    }

    setIsUploading(true)
    setFeedback(null)
    
    try {
      // 🚀 Use the new Server-side API to bypass RLS issues
      const formData = new FormData()
      formData.append('action', 'upload')
      formData.append('file', file)
      formData.append('profileId', profile.id)

      const response = await fetch('/api/staff/verify-upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setVerificationData(prev => ({ ...prev, id_card_photo_url: result.publicUrl }))
    } catch (err: any) {
      setFeedback({ type: 'error', message: `อัปโหลดรูปไม่สำเร็จ: ${err.message}` })
    } finally {
      setIsUploading(false)
    }
  }

  const handleZipCodeBlur = async () => {
    setBranchLookupError(null)
    if (!zipCode || zipCode.trim().length === 0) { setBranchCode(''); return }
    const { data, error } = await findBranchByZipCode(zipCode.trim())
    if (error || !data) {
      setBranchCode(''); setBranchLookupError(pickLocalizedText(locale, copy.branchNotFound))
    } else {
      setBranchCode(data.branch_code)
    }
  }

  const saveLinePreferences = async () => {
    setLinePrefsSaving(true)
    setFeedback(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify({ linePreferences: linePrefs }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || 'Save failed')
      setFeedback({ type: 'success', message: pickLocalizedText(locale, copy.saveLineSuccess) })
    } catch (error: any) {
      setFeedback({ type: 'error', message: error?.message || 'Save failed' })
    } finally {
      setLinePrefsSaving(false)
    }
  }

  // Auto-hide feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  if (loading) return <div className="flex flex-col justify-center items-center h-[80vh] gap-4"><div className="w-12 h-12 border-4 border-gray-100 border-t-black rounded-full animate-spin" /><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading...</p></div>
  if (!profile) return <div className="p-20 text-center"><p className="text-red-500 font-bold">Profile not found. Please log in again.</p></div>

  const menuItems = [
    { id: 'personal', label: pickLocalizedText(locale, copy.fullName), sub: 'จัดการชื่อ เบอร์โทร และที่อยู่', icon: <User size={24} />, color: 'bg-blue-50 text-blue-600' },
    // Only show verification if NOT verified
    ...(!profile?.is_verified ? [{ 
        id: 'verification', 
        label: 'การยืนยันตัวตน', 
        sub: isIdentitySubmitted ? 'กำลังรอแอดมินอนุมัติ' : 'กรุณาส่งข้อมูลยืนยันตัวตน', 
        icon: <ShieldCheck size={24} />, 
        color: isIdentitySubmitted ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600',
        badge: isIdentitySubmitted ? 'PENDING' : 'REQUIRED'
    }] : []),
    // Only show payout/bank info if verified
    ...(profile?.is_verified ? [{
        id: 'payout',
        label: 'ข้อมูลบัญชีธนาคาร',
        sub: 'จัดการเลขบัญชีและการรับเงิน',
        icon: <CreditCard size={24} />,
        color: 'bg-green-50 text-green-600',
        badge: 'ACTIVE'
    }] : []),
    { id: 'work', label: 'ตำแหน่งและสาขา', sub: `ID: ${profile?.staff_code || '---'} / ${profile?.branch_code || 'Main'}`, icon: <Briefcase size={24} />, color: 'bg-purple-50 text-purple-600' },
    { id: 'line', label: 'LINE Official', sub: lineLinked ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้เชื่อมต่อ', icon: <MessageCircle size={24} />, color: 'bg-[#06C755]/10 text-[#06C755]' },
    { id: 'language', label: 'ภาษาและระบบ', sub: 'ตั้งค่าการแสดงผลของเว็บไซต์', icon: <Languages size={24} />, color: 'bg-orange-50 text-orange-600' },
    { id: 'security', label: 'ความปลอดภัย', sub: 'จัดการรหัสผ่านและการเข้าถึง', icon: <Lock size={24} />, color: 'bg-gray-50 text-gray-600' },
  ]

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 font-bold">
      
      {/* 1. COMPACT PROFILE SUMMARY */}
      <section className="mb-12 pt-12 flex items-center gap-6">
        <div className="w-24 h-24 bg-[#1A1A18] text-white flex items-center justify-center text-3xl font-light overflow-hidden shadow-xl ring-4 ring-white relative">
            {displayName ? displayName.slice(0,1).toUpperCase() : <User size={32} />}
            {profile?.is_verified && (
                <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full border-2 border-white">
                    <CheckCircle2 size={12} fill="white" className="text-blue-500" />
                </div>
            )}
        </div>
        <div>
            <h1 className="text-3xl font-light tracking-tight text-[#1A1A18] flex items-center gap-3">
                {displayName || 'พนักงาน'}
                {profile?.is_verified && <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded tracking-widest uppercase">Verified</span>}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${profile?.is_verified ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></span>
                {profile?.staff_type === 'cafe' ? 'Cafe Staff' : (profile?.staff_type === 'garden' ? 'Garden Staff' : 'Staff')}
                <span className="text-gray-200">|</span>
                <span className="text-black font-black bg-gray-100 px-2 py-0.5 rounded-sm">
                  {(realTimeProfile?.salary_type || profile?.salary_type) === 'monthly' ? 'รายเดือน' : 'รายวัน'}
                </span>
                <span className="text-gray-200">|</span>
                {profile?.branch_code || 'Main Branch'}
            </p>
        </div>
        <button 
            onClick={async () => { await signOut(); router.push('/login'); }}
            className="ml-auto p-4 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-full"
        >
            <LogOut size={20} />
        </button>
      </section>

      <AnimatePresence mode="wait">
        {activeTab === 'menu' ? (
          /* 2. MENU GRID VIEW */
          <motion.div 
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {menuItems.map((item) => (
                <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id as ActiveTab)}
                    className="flex items-center gap-5 p-6 bg-white border border-[#EFEFEF] hover:border-black hover:shadow-xl transition-all text-left group relative overflow-hidden"
                >
                    <div className={`w-14 h-14 shrink-0 flex items-center justify-center rounded-xl ${item.color} group-hover:scale-110 transition-transform`}>
                        {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[13px] font-black uppercase tracking-widest text-[#1A1A18]">{item.label}</h3>
                            {item.badge && <span className={`text-[7px] font-black px-1.5 py-0.5 rounded ${item.color} opacity-80`}>{item.badge}</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold truncate mt-1">{item.sub}</p>
                    </div>
                    <ArrowRight size={16} className="ml-2 text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
                </button>
            ))}
          </motion.div>
        ) : (
          /* 3. DETAIL VIEW (FORM) */
          <motion.div 
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white border border-[#EFEFEF] shadow-sm overflow-hidden"
          >
            {/* Sub-header */}
            <div className="p-6 border-b border-gray-50 flex items-center gap-4 bg-gray-50/30">
                <button onClick={() => setActiveTab('menu')} className="p-2 hover:bg-white rounded-full transition-all">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-[12px] font-black uppercase tracking-[0.2em]">
                    {menuItems.find(m => m.id === activeTab)?.label}
                </h2>
            </div>

            <div className="p-8 md:p-12">
                {activeTab === 'personal' && (
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Display Name</label>
                                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-gray-50 border-none p-4 text-sm font-bold focus:ring-1 focus:ring-black" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Phone Number</label>
                                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-gray-50 border-none p-4 text-sm font-bold focus:ring-1 focus:ring-black" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Home Address</label>
                            <textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-gray-50 border-none p-4 text-sm font-bold focus:ring-1 focus:ring-black" />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-black text-white text-[11px] font-black uppercase tracking-widest hover:bg-[#333] transition-all flex items-center justify-center gap-3">
                            {isSubmitting && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                            {locale === 'en' ? 'Save personal information' : locale === 'zh' ? '保存个人信息' : '                             บันทึกข้อมูลส่วนตัว                         '}</button>
                    </form>
                )}

                {activeTab === 'payout' && (
                    <div className="space-y-10">
                        <div className="p-6 bg-green-50 border border-green-100 rounded-2xl flex items-start gap-4">
                            <CreditCard size={24} className="text-green-500 shrink-0" />
                            <div>
                                <h4 className="text-[12px] font-black text-green-900 uppercase mb-1">{locale === 'en' ? 'Account information for receiving money' : locale === 'zh' ? '收款账户信息' : 'ข้อมูลบัญชีสำหรับการรับเงิน'}</h4>
                                <p className="text-[10px] text-green-700 leading-relaxed font-bold">{locale === 'en' ? 'You can edit your bank account information here. This information is used for transferring wages and commissions.' : locale === 'zh' ? '您可以在此处编辑您的银行帐户信息。该信息用于转移工资和佣金。' : 'คุณสามารถแก้ไขข้อมูลบัญชีธนาคารได้ที่นี่ ข้อมูลนี้จะใช้สำหรับการโอนเงินค่าจ้างและคอมมิชชั่น'}</p>
                            </div>
                        </div>

                        <form onSubmit={handleVerificationSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'bank' : locale === 'zh' ? '银行' : 'ธนาคาร'}</label>
                                    <select 
                                        value={verificationData.bank_name}
                                        onChange={(e) => setVerificationData(p => ({...p, bank_name: e.target.value}))}
                                        className="w-full bg-gray-50 border-none p-4 text-sm font-bold focus:ring-1 focus:ring-black appearance-none"
                                    >
                                        <option value="">{locale === 'en' ? 'Choose a bank' : locale === 'zh' ? '选择银行' : 'เลือกธนาคาร'}</option>
                                        <option value={locale === 'en' ? 'Kasikorn Thai' : locale === 'zh' ? '泰泰华泰' : 'กสิกรไทย'}>{locale === 'en' ? 'Kasikorn Thai' : locale === 'zh' ? '泰泰华泰' : 'กสิกรไทย'}</option>
                                        <option value={locale === 'en' ? 'Siam Commercial Bank' : locale === 'zh' ? '暹罗商业银行' : 'ไทยพาณิชย์'}>{locale === 'en' ? 'Siam Commercial Bank' : locale === 'zh' ? '暹罗商业银行' : 'ไทยพาณิชย์'}</option>
                                        <option value={locale === 'en' ? 'Bangkok' : locale === 'zh' ? '曼谷' : 'กรุงเทพ'}>{locale === 'en' ? 'Bangkok' : locale === 'zh' ? '曼谷' : 'กรุงเทพ'}</option>
                                        <option value={locale === 'en' ? 'Ayutthaya' : locale === 'zh' ? '大城府' : 'กรุงศรีอยุธยา'}>{locale === 'en' ? 'Ayutthaya' : locale === 'zh' ? '大城府' : 'กรุงศรีอยุธยา'}</option>
                                        <option value={locale === 'en' ? 'Krungthai' : locale === 'zh' ? '恭泰' : 'กรุงไทย'}>{locale === 'en' ? 'Krungthai' : locale === 'zh' ? '恭泰' : 'กรุงไทย'}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'bank account number' : locale === 'zh' ? '银行帐号' : 'เลขบัญชีธนาคาร'}</label>
                                    <input 
                                        type="text" 
                                        value={verificationData.bank_account_number}
                                        onChange={(e) => setVerificationData(p => ({...p, bank_account_number: e.target.value}))}
                                        className="w-full bg-gray-50 border-none p-4 text-sm font-bold focus:ring-1 focus:ring-black" 
                                        placeholder="000-0-00000-0"
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-black text-white text-[11px] font-black uppercase tracking-widest">
                                {isSubmitting ? 'กำลังบันทึก...' : 'อัปเดตข้อมูลบัญชี'}
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'verification' && !profile?.is_verified && (
                    <div className="space-y-10">
                        {isIdentitySubmitted && (
                            <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4 mb-8">
                                <Loader2 size={24} className="text-amber-500 shrink-0 animate-spin" />
                                <div>
                                    <h4 className="text-[12px] font-black text-amber-900 uppercase mb-2">{locale === 'en' ? 'Under investigation' : locale === 'zh' ? '正在调查中' : 'อยู่ระหว่างการตรวจสอบ'}</h4>
                                    <p className="text-[10px] text-amber-700 leading-relaxed font-bold">{locale === 'en' ? 'You have submitted your information. Admin is working to verify your information as quickly as possible.' : locale === 'zh' ? '您已提交您的信息。管理员正在尽快验证您的信息。' : 'คุณได้ส่งข้อมูลแล้ว แอดมินกำลังดำเนินการตรวจสอบข้อมูลของคุณโดยเร็วที่สุด'}</p>
                                </div>
                            </div>
                        )}
                        
                        <form onSubmit={handleVerificationSubmit} className="space-y-8">
                            {/* ID Card Upload */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'ID card photo (or a picture holding the pair in front)' : locale === 'zh' ? '身份证照片（或两人正面的照片）' : 'รูปถ่ายบัตรประชาชน (หรือรูปถือคู่หน้า)'}</label>
                                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">MAX 5MB</span>
                                </div>
                                <div className="relative aspect-video rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center overflow-hidden group hover:border-black transition-all">
                                    {verificationData.id_card_photo_url ? (
                                        <>
                                            <img src={verificationData.id_card_photo_url} alt="ID Card" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase">{locale === 'en' ? 'change shape' : locale === 'zh' ? '改变形状' : 'เปลี่ยนรูป'}</label>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="text-gray-300 mb-2" size={32} />
                                            <span className="text-[10px] text-gray-400 font-bold">{locale === 'en' ? 'Click to upload' : locale === 'zh' ? '点击上传' : 'คลิกเพื่ออัปโหลด'}</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleFileUpload} disabled={isIdentitySubmitted} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
                                            <Loader2 className="animate-spin text-black" size={24} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? '13 digit ID card number' : locale === 'zh' ? '13位身份证号码' : 'เลขบัตรประชาชน 13 หลัก'}</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        maxLength={13}
                                        value={verificationData.id_card_number}
                                        onChange={(e) => setVerificationData(p => ({...p, id_card_number: e.target.value.replace(/\D/g, '')}))}
                                        readOnly={isIdentitySubmitted}
                                        className={`w-full bg-gray-50 border-none p-4 text-sm font-bold focus:ring-1 ${idExists ? 'focus:ring-red-500 ring-1 ring-red-500' : 'focus:ring-black'} transition-all`} 
                                        placeholder="0-0000-00000-00-0"
                                    />
                                    {isCheckingId && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                                        </div>
                                    )}
                                </div>
                                {idExists && (
                                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-widest">
                                        {locale === 'en' ? 'There is already information in the system.' : locale === 'zh' ? '系统里已经有信息了。' : '                                         มีข้อมูลในระบบแล้ว                                     '}</motion.p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'bank' : locale === 'zh' ? '银行' : 'ธนาคาร'}</label>
                                    <select 
                                        value={verificationData.bank_name}
                                        onChange={(e) => setVerificationData(p => ({...p, bank_name: e.target.value}))}
                                        disabled={isIdentitySubmitted}
                                        className="w-full bg-gray-50 border-none p-4 text-sm font-bold focus:ring-1 focus:ring-black appearance-none"
                                    >
                                        <option value="">{locale === 'en' ? 'Choose a bank' : locale === 'zh' ? '选择银行' : 'เลือกธนาคาร'}</option>
                                        <option value={locale === 'en' ? 'Kasikorn Thai' : locale === 'zh' ? '泰泰华泰' : 'กสิกรไทย'}>{locale === 'en' ? 'Kasikorn Thai' : locale === 'zh' ? '泰泰华泰' : 'กสิกรไทย'}</option>
                                        <option value={locale === 'en' ? 'Siam Commercial Bank' : locale === 'zh' ? '暹罗商业银行' : 'ไทยพาณิชย์'}>{locale === 'en' ? 'Siam Commercial Bank' : locale === 'zh' ? '暹罗商业银行' : 'ไทยพาณิชย์'}</option>
                                        <option value={locale === 'en' ? 'Bangkok' : locale === 'zh' ? '曼谷' : 'กรุงเทพ'}>{locale === 'en' ? 'Bangkok' : locale === 'zh' ? '曼谷' : 'กรุงเทพ'}</option>
                                        <option value={locale === 'en' ? 'Ayutthaya' : locale === 'zh' ? '大城府' : 'กรุงศรีอยุธยา'}>{locale === 'en' ? 'Ayutthaya' : locale === 'zh' ? '大城府' : 'กรุงศรีอยุธยา'}</option>
                                        <option value={locale === 'en' ? 'Krungthai' : locale === 'zh' ? '恭泰' : 'กรุงไทย'}>{locale === 'en' ? 'Krungthai' : locale === 'zh' ? '恭泰' : 'กรุงไทย'}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'bank account number' : locale === 'zh' ? '银行帐号' : 'เลขบัญชีธนาคาร'}</label>
                                    <input 
                                        type="text" 
                                        value={verificationData.bank_account_number}
                                        onChange={(e) => setVerificationData(p => ({...p, bank_account_number: e.target.value}))}
                                        readOnly={isIdentitySubmitted}
                                        className="w-full bg-gray-50 border-none p-4 text-sm font-bold focus:ring-1 focus:ring-black" 
                                        placeholder="000-0-00000-0"
                                    />
                                </div>
                            </div>

                            {!isIdentitySubmitted && (
                                <button type="submit" disabled={isSubmitting || isUploading} className="w-full py-5 bg-black text-white text-[11px] font-black uppercase tracking-widest">
                                    {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูลเพื่อตรวจสอบ'}
                                </button>
                            )}
                        </form>
                    </div>
                )}

                {activeTab === 'work' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-gray-50 border border-gray-100">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">Staff ID</span>
                                <div className="text-xl font-mono">{profile?.staff_code || '---'}</div>
                            </div>
                            <div className="p-6 bg-gray-50 border border-gray-100">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">Branch</span>
                                <div className="text-xl font-mono">{profile?.branch_code || 'HQ'}</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Zip Code (Auto-Branch lookup)</label>
                            <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} onBlur={handleZipCodeBlur} className="w-full bg-gray-50 border-none p-4 text-sm font-bold focus:ring-1 focus:ring-black" />
                            {branchLookupError && <p className="text-red-500 text-[9px] font-bold mt-2">{branchLookupError}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Timezone</label>
                            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full bg-gray-50 border-none p-4 text-sm font-bold focus:ring-1 focus:ring-black appearance-none">
                                {timeZonesNames.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                            </select>
                        </div>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-5 bg-black text-white text-[11px] font-black uppercase tracking-widest">
                            {locale === 'en' ? 'Update work information' : locale === 'zh' ? '更新工作信息' : '                             อัปเดตข้อมูลการทำงาน                         '}</button>
                    </div>
                )}

                {activeTab === 'line' && (
                    <div className="space-y-10">
                        <div className={`p-8 rounded-2xl ${lineLinked ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-200'}`}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${lineLinked ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'}`}>
                                    <MessageCircle size={24} />
                                </div>
                                <div>
                                    <h4 className="text-[13px] font-black text-[#1A1A18] uppercase">LINE Notification Service</h4>
                                    <p className="text-[10px] text-gray-400">{lineLinked ? 'เชื่อมต่อบริการแล้ว' : 'ยังไม่ได้เชื่อมต่อบริการ'}</p>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-600 leading-relaxed mb-8">{getLineStatusMessage(lineStatus, locale)}</p>
                            <a href="/api/auth/line/link" className={`w-full py-4 text-[10px] font-black uppercase tracking-widest text-center block transition-all shadow-sm ${lineLinked ? 'bg-white text-green-600 border border-green-200' : 'bg-[#06C755] text-white hover:bg-[#05a647]'}`}>
                                {lineLinked ? 'Reconnect Account' : 'Connect LINE ID'}
                            </a>
                        </div>
                        
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><BellRing size={16} /> Notification Rules</h4>
                            <PrefToggle label={locale === 'en' ? 'Get all notifications' : locale === 'zh' ? '获取所有通知' : 'รับการแจ้งเตือนทั้งหมด'} checked={linePrefs.enabled} onChange={(v: boolean) => setLinePrefs(p => ({...p, enabled: v}))} />
                            <PrefToggle label={locale === 'en' ? 'Assigning new work' : locale === 'zh' ? '分配新工作' : 'การมอบหมายงานใหม่'} checked={linePrefs.job_assigned} disabled={!linePrefs.enabled} onChange={(v: boolean) => setLinePrefs(p => ({...p, job_assigned: v}))} />
                            <PrefToggle label={locale === 'en' ? 'Order status' : locale === 'zh' ? '订单状态' : 'สถานะออเดอร์'} checked={linePrefs.order_status} disabled={!linePrefs.enabled} onChange={(v: boolean) => setLinePrefs(p => ({...p, order_status: v}))} />
                            <button onClick={saveLinePreferences} disabled={linePrefsSaving} className="w-full py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest mt-6">
                                {linePrefsSaving ? 'Saving...' : 'Update Preferences'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'language' && (
                    <div className="space-y-8">
                        <WebsiteLanguageSettings />
                        <div className="p-8 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
                            <InfoIcon size={24} className="text-blue-500 shrink-0" />
                            <div>
                                <h4 className="text-[12px] font-black text-blue-900 uppercase mb-2">{locale === 'en' ? 'Language information' : locale === 'zh' ? '语言信息' : 'ข้อมูลภาษา'}</h4>
                                <p className="text-[10px] text-blue-700 leading-relaxed font-bold">{locale === 'en' ? 'This language setting affects the display of dashboards and reports. only in your system' : locale === 'zh' ? '此语言设置会影响仪表板和报告的显示。仅在您的系统中' : 'การตั้งค่าภาษานี้จะส่งผลต่อการแสดงผลของแดชบอร์ดและรายงานต่างๆ ในระบบของคุณเท่านั้น'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="text-center py-12 space-y-6">
                        <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock size={32} />
                        </div>
                        <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A18]">Password Management</h3>
                        <p className="text-[11px] text-gray-400 max-w-xs mx-auto font-bold">{locale === 'en' ? 'for safety It is recommended to change your password every 3-6 months.' : locale === 'zh' ? '为了安全，建议每 3-6 个月更改一次密码。' : 'เพื่อความปลอดภัย แนะนำให้เปลี่ยนรหัสผ่านทุกๆ 3-6 เดือน'}</p>
                        <button className="px-10 py-4 border border-black text-black text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all">
                            Change Password Now
                        </button>
                    </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {feedback && (
            <motion.div 
                initial={{ opacity: 0, y: 100, scale: 0.9 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 50, scale: 0.9, transition: { duration: 0.2 } }} 
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs"
            >
                <div className={`p-5 backdrop-blur-xl border flex items-center gap-4 shadow-2xl rounded-none ${
                    feedback.type === 'success' 
                    ? 'bg-black/90 border-black text-white' 
                    : 'bg-red-600/95 border-red-700 text-white'
                }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        feedback.type === 'success' ? 'bg-white/10' : 'bg-white/20'
                    }`}>
                        {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                            {feedback.message}
                        </p>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
          <LuxurySuccessAnimation message={locale === 'en' ? 'Information has been sent successfully.' : locale === 'zh' ? '信息已发送成功。' : 'ส่งข้อมูลเรียบร้อยแล้ว'} />
        )}
      </AnimatePresence>
    </div>
  )
}

function PrefToggle({ label, checked, onChange, disabled }: any) {
    return (
        <label className={`flex items-center justify-between p-4 border rounded-xl ${disabled ? 'opacity-30' : 'hover:border-black cursor-pointer'} transition-all`}>
            <span className="text-[10px] font-bold text-gray-600">{label}</span>
            <div className={`w-12 h-6 rounded-full relative transition-all ${checked ? 'bg-black' : 'bg-gray-200'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-7' : 'left-1'}`} />
            </div>
            <input type="checkbox" checked={checked} disabled={disabled} className="hidden" onChange={(e) => onChange(e.target.checked)} />
        </label>
    )
}

function InfoIcon({ size, className }: { size: number, className?: string }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> }