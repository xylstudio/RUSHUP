'use client';
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Save, 
  Settings, 
  Building2, 
  CreditCard, 
  Cpu, 
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  MapPin
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import GoogleMapsLocationPicker from '@/components/GoogleMapsLocationPicker'
import { supabase } from '@/lib/supabaseClient'
import { useI18n } from "@/lib/I18nContext";

const BANK_ICON_OPTIONS = [
    {
        code: 'kbank',
        bankName: 'ธนาคารกสิกรไทย',
        label: 'กสิกรไทย (KBANK)',
        icon: '/bank-icons/kbank.png',
        aliases: ['กสิกร', 'kbank', 'kasikorn']
    },
    {
        code: 'scb',
        bankName: 'ธนาคารไทยพาณิชย์',
        label: 'ไทยพาณิชย์ (SCB)',
        icon: '/bank-icons/scb.png',
        aliases: ['ไทยพาณิชย์', 'scb', 'siam commercial']
    },
    {
        code: 'ktb',
        bankName: 'ธนาคารกรุงไทย',
        label: 'กรุงไทย (KTB)',
        icon: '/bank-icons/KTB.png',
        aliases: ['กรุงไทย', 'ktb', 'krungthai', 'krung thai']
    }
] as const

function inferBankOption(bankName: string) {
    const name = String(bankName || '').toLowerCase()
    return BANK_ICON_OPTIONS.find((option) => option.aliases.some((alias) => name.includes(alias.toLowerCase())))
}

// Default Configurations (Fallback)
const DEFAULTS = {
  company_info: {
    name_th: 'บริษัท เอ็กซ์วายแอล แลนด์สเคป จำกัด',
    name_en: 'XYLEM LANDSCAPE CO., LTD.',
    address: '158/13-14 หมู่บ้าน บ้านสวนพรีเมียร์ หมู่ที่ 6 ต.หนองจ๊อม อ.สันทราย จ.เชียงใหม่',
    tax_id: '0505567008779',
    phone: '02-xxx-xxxx',
    email: 'contact@xylem.co.th',
        logo_url: '',
        contract_company_name: 'บริษัท เอ็กซ์วายแอล สตูดิโอ จำกัด',
        contract_company_address: '158/13-14 หมู่บ้านบ้านสวนธาร หมู่ที่ 6 ซอย 1 ถนนเชียงใหม่-เชียงราย ตำบลเชิงดอย อำเภอดอยสะเก็ด จังหวัดเชียงใหม่ 50220',
        contract_company_tax_id: '0505568019024',
        contract_signer_name: 'นางสาวเจนจิรา วงค์โพธิสาร',
        contract_witness_name: 'นายศุภโชค บุรีคำ'
  },
  financial_info: {
    bank_name: 'ธนาคารกสิกรไทย',
    account_no: '180-3-31959-5',
    account_name: 'บจก. เอ็กซ์วายแอล แลนด์สเคป',
    branch: 'สาขาสันทราย',
        promptpay_id: '',
        bank_code: '',
        bank_icon: ''
  },
  features: {
    marketplace_enabled: false,
    service_booking_enabled: false,
    new_user_registration: true,
    maintenance_mode: false
  }
}

const toBoolean = (value: unknown, fallback: boolean) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true
        if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false
    }
    return fallback
}

const normalizeFeatures = (value: unknown) => {
    const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
    return {
        marketplace_enabled: toBoolean(source.marketplace_enabled, DEFAULTS.features.marketplace_enabled),
        service_booking_enabled: toBoolean(source.service_booking_enabled, DEFAULTS.features.service_booking_enabled),
        new_user_registration: toBoolean(source.new_user_registration, DEFAULTS.features.new_user_registration),
        maintenance_mode: toBoolean(source.maintenance_mode, DEFAULTS.features.maintenance_mode),
    }
}

export default function AdminSettingsPage() {
    const { locale } = useI18n();
  const router = useRouter()
  const { profile } = useAuth()
    const profileId = profile?.id || ''
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
    const [debugLoading, setDebugLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
    const [debugSnapshot, setDebugSnapshot] = useState<any>(null)
    const [lastSaveDebug, setLastSaveDebug] = useState<any>(null)
    const [isMapOpen, setIsMapOpen] = useState(false)

  // Settings State
  const [companyInfo, setCompanyInfo] = useState(DEFAULTS.company_info)
  const [financialInfo, setFinancialInfo] = useState(DEFAULTS.financial_info)
  const [features, setFeatures] = useState(DEFAULTS.features)

    const loadDebugSnapshot = async () => {
        setDebugLoading(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            const response = await fetch(`/api/system/settings?debug=1&t=${Date.now()}`, {
                method: 'GET',
                cache: 'no-store',
                credentials: 'include',
                headers: {
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
            })

            const result = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(result?.error || 'โหลด DB debug snapshot ไม่สำเร็จ')
            }

            setDebugSnapshot(result)
        } catch (err: any) {
            setDebugSnapshot({ error: err?.message || 'unknown' })
        } finally {
            setDebugLoading(false)
        }
    }

  useEffect(() => {
    const fetchSettings = async () => {
            if (!profileId) return
      setLoading(true)
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession()

                const response = await fetch(`/api/system/settings?t=${Date.now()}`, {
                    method: 'GET',
                    cache: 'no-store',
                    credentials: 'include',
                    headers: {
                        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                    },
                })

                const result = await response.json().catch(() => ({}))
                if (!response.ok) {
                    throw new Error(result?.error || 'ไม่สามารถโหลดการตั้งค่าระบบได้')
                }

                const mergedCompany = { ...DEFAULTS.company_info, ...(result?.companyInfo || {}) }
                const mergedFinancial = { ...DEFAULTS.financial_info, ...(result?.financialInfo || {}) }
                const inferredOption = inferBankOption(mergedFinancial.bank_name)
                if (!mergedFinancial.bank_code && inferredOption) {
                    mergedFinancial.bank_code = inferredOption.code
                }
                if (!mergedFinancial.bank_icon && inferredOption) {
                    mergedFinancial.bank_icon = inferredOption.icon
                }

                setCompanyInfo(mergedCompany)
                setFinancialInfo(mergedFinancial)
                setFeatures(normalizeFeatures(result?.features))
            } catch (err: any) {
                setError(err?.message || 'โหลดการตั้งค่าไม่สำเร็จ ใช้ค่าเริ่มต้นชั่วคราว')
            }

                        void loadDebugSnapshot()

      setLoading(false)
    }

    void fetchSettings()
    }, [profileId])

  const handleSave = async () => {
    setSaving(true)
    setSuccessMsg('')
    setError('')

    try {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            const normalizedFeaturePayload = normalizeFeatures(features)
            const savePayload = {
                companyInfo,
                financialInfo,
                features: normalizedFeaturePayload,
            }

            setLastSaveDebug({
                at: new Date().toISOString(),
                request: savePayload,
                status: 'pending',
            })

            const saveResponse = await fetch('/api/system/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify(savePayload),
            })

            const saveResult = await saveResponse.json().catch(() => ({}))
            setLastSaveDebug({
                at: new Date().toISOString(),
                request: savePayload,
                response: saveResult,
                httpStatus: saveResponse.status,
                ok: saveResponse.ok,
            })

            if (!saveResponse.ok) {
                throw new Error(saveResult?.error || `บันทึกไม่สำเร็จ (HTTP ${saveResponse.status})`)
            }

            setCompanyInfo({ ...DEFAULTS.company_info, ...(saveResult?.companyInfo || {}) })
            setFinancialInfo({ ...DEFAULTS.financial_info, ...(saveResult?.financialInfo || {}) })
            setFeatures(normalizeFeatures(saveResult?.features))
            setSuccessMsg('บันทึกการตั้งค่าเรียบร้อยแล้ว')
            void loadDebugSnapshot()

            if (typeof window !== 'undefined') {
                const stamp = String(Date.now())
                window.localStorage.setItem('xylem_features_updated_at', stamp)
                window.dispatchEvent(new CustomEvent('xylem:features-updated', { detail: { at: stamp } }))
            }

      // Auto hide success msg after 3s
      setTimeout(() => setSuccessMsg(''), 3000)

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึก')
            setSuccessMsg('')
            void loadDebugSnapshot()
    } finally {
      setSaving(false)
    }
  }

  // --- Handlers for Input Changes ---
  const handleCompanyChange = (field: keyof typeof companyInfo, value: string) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }))
  }

    const handleFinancialChange = (field: keyof typeof financialInfo, value: string) => {
        setFinancialInfo(prev => {
            const next = { ...prev, [field]: value }
            if (field === 'bank_name') {
                const inferredOption = inferBankOption(value)
                if (inferredOption) {
                    next.bank_code = inferredOption.code
                    next.bank_icon = inferredOption.icon
                }
            }
            return next
        })
  }

    const handleSelectBankIcon = (bankCode: string) => {
        const selectedOption = BANK_ICON_OPTIONS.find((option) => option.code === bankCode)
        if (!selectedOption) return
        setFinancialInfo((prev) => ({
            ...prev,
            bank_code: selectedOption.code,
            bank_icon: selectedOption.icon,
            bank_name: selectedOption.bankName
        }))
    }

  const handleFeatureToggle = (field: keyof typeof features) => {
            setFeatures(prev => ({ ...prev, [field]: !Boolean(prev[field]) }))
  }

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setCompanyInfo(prev => ({
        ...prev,
        address: location.address,
        lat: location.lat,
        lng: location.lng,
        latitude: location.lat,
        longitude: location.lng
    }))
    setIsMapOpen(false)
  }


  if (!profile) return null

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] pb-32">
        {/* Header */}
        <div className="px-6 py-8 md:py-12 border-b border-[#E5E5E5] bg-white sticky top-0 z-20">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight uppercase">System Configuration</h1>
                    <p className="text-xs text-[#666666] mt-2 font-mono flex items-center gap-2">
                        <Settings className="w-4 h-4" /> {locale === 'en' ? ' ตั้งค่าระบบและข้อมูลองค์กร                     ' : locale === 'zh' ? ' ตั้งค่าระบบและข้อมูลองค์กร                     ' : ' ตั้งค่าระบบและข้อมูลองค์กร                     '}</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {successMsg && (
                        <div className="flex items-center gap-2 text-[#059669] text-xs font-bold px-4 py-2 bg-[#ECFDF5] border border-[#059669] rounded-full animate-fade-in">
                            <CheckCircle2 className="w-4 h-4" /> {successMsg}
                        </div>
                    )}
                    <button 
                        onClick={() => void loadDebugSnapshot()}
                        disabled={debugLoading || loading}
                        className="flex items-center gap-2 border border-[#111111] text-[#111111] px-4 py-3 hover:bg-[#F2F2F2] disabled:opacity-50 transition-colors uppercase tracking-wider text-xs font-bold"
                    >
                        {debugLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {debugLoading ? 'Checking DB...' : 'DB Snapshot'}
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex items-center gap-2 bg-[#111111] text-white px-6 py-3 hover:bg-[#333333] disabled:opacity-50 transition-colors uppercase tracking-wider text-xs font-bold"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-6 py-12">
            
            {error && (
                 <div className="mb-8 p-4 border border-red-200 bg-red-50 text-red-700 text-sm flex items-start gap-3 rounded-md">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">System Error</p>
                        <p>{error}</p>
                        {error.includes('relation "system_settings" does not exist') && (
                            <div className="mt-3 text-xs bg-white p-2 border border-red-200 font-mono overflow-x-auto text-wrap">
                                Please execute the migration script in Supabase SQL Editor to create the necessary table. (File: migrations/create-system-settings.sql)
                            </div>
                        )}
                    </div>
                </div>
            )}

            {debugSnapshot && (
                <div className="mb-8 p-4 border border-[#E5E5E5] bg-white text-xs rounded-md">
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="font-bold uppercase tracking-wider text-[#111111]">DB Snapshot (system_settings)</p>
                        {debugSnapshot?.counts ? (
                            <p className="text-[#666666] font-mono">
                                counts: c={String(debugSnapshot.counts.company_info)} f={String(debugSnapshot.counts.financial_info)} x={String(debugSnapshot.counts.features)}
                            </p>
                        ) : null}
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap bg-[#FAFAFA] border border-[#EAEAEA] p-3 font-mono text-[11px]">
{JSON.stringify(debugSnapshot, null, 2)}
                    </pre>
                </div>
            )}

            {lastSaveDebug && (
                <div className="mb-8 p-4 border border-[#E5E5E5] bg-white text-xs rounded-md">
                    <p className="font-bold uppercase tracking-wider text-[#111111] mb-2">Last Save Debug</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap bg-[#FAFAFA] border border-[#EAEAEA] p-3 font-mono text-[11px]">
{JSON.stringify(lastSaveDebug, null, 2)}
                    </pre>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-[#E5E5E5] mb-12 overflow-x-auto no-scrollbar">
                {[
                    { id: 'general', label: 'General Profile', icon: Building2 },
                    { id: 'financial', label: 'Financials', icon: CreditCard },
                    { id: 'features', label: 'System Features', icon: Cpu },
                    // { id: 'advanced', label: 'Advanced', icon: ShieldCheck },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-8 py-4 border-b-2 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'border-[#111111] text-[#111111]' 
                            : 'border-transparent text-[#A3A3A3] hover:text-[#666666]'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                 <div className="flex justify-center py-20 text-[#A3A3A3]">
                    <Loader2 className="w-8 h-8 animate-spin" />
                 </div>
            ) : (
                <div className="space-y-12 animate-fade-in-up">
                    
                    {/* --- TAB: GENERAL --- */}
                    {activeTab === 'general' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="col-span-full">
                                <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-[#111111] inline-block"></span>
                                    {locale === 'en' ? '                                     ข้อมูลองค์กร (Company Information)                                 ' : locale === 'zh' ? '                                     ข้อมูลองค์กร (Company Information)                                 ' : '                                     ข้อมูลองค์กร (Company Information)                                 '}</h2>
                                <p className="text-sm text-[#666666] mb-8 font-light max-w-2xl">
                                    {locale === 'en' ? '                                     ข้อมูลเหล่านี้จะถูกนำไปแสดงในส่วนหัวของเอกสาร (ใบเสนอราคา, ใบแจ้งหนี้, ใบเสร็จรับเงิน) และในส่วนท้ายของอีเมลระบบ                                 ' : locale === 'zh' ? '                                     ข้อมูลเหล่านี้จะถูกนำไปแสดงในส่วนหัวของเอกสาร (ใบเสนอราคา, ใบแจ้งหนี้, ใบเสร็จรับเงิน) และในส่วนท้ายของอีเมลระบบ                                 ' : '                                     ข้อมูลเหล่านี้จะถูกนำไปแสดงในส่วนหัวของเอกสาร (ใบเสนอราคา, ใบแจ้งหนี้, ใบเสร็จรับเงิน) และในส่วนท้ายของอีเมลระบบ                                 '}</p>
                            </div>

                            {/* Form Fields */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'ชื่อบริษัท (ภาษาไทย)' : locale === 'zh' ? 'ชื่อบริษัท (ภาษาไทย)' : 'ชื่อบริษัท (ภาษาไทย)'}</label>
                                    <input 
                                        type="text" 
                                        value={companyInfo.name_th}
                                        onChange={(e) => handleCompanyChange('name_th', e.target.value)}
                                        className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors"
                                        placeholder={locale === 'en' ? 'เช่น บริษัท ไซเล็ม แลนด์สเคป จำกัด' : locale === 'zh' ? 'เช่น บริษัท ไซเล็ม แลนด์สเคป จำกัด' : 'เช่น บริษัท ไซเล็ม แลนด์สเคป จำกัด'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">Company Name (English)</label>
                                    <input 
                                        type="text" 
                                        value={companyInfo.name_en}
                                        onChange={(e) => handleCompanyChange('name_en', e.target.value)}
                                        className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors font-mono"
                                        placeholder="e.g. XYLEM LANDSCAPE CO., LTD."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'เลขประจำตัวผู้เสียภาษี (Tax ID)' : locale === 'zh' ? 'เลขประจำตัวผู้เสียภาษี (Tax ID)' : 'เลขประจำตัวผู้เสียภาษี (Tax ID)'}</label>
                                    <input 
                                        type="text" 
                                        value={companyInfo.tax_id}
                                        onChange={(e) => handleCompanyChange('tax_id', e.target.value)}
                                        className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'ที่อยู่สำนักงานใหญ่ (Head Office Address)' : locale === 'zh' ? 'ที่อยู่สำนักงานใหญ่ (Head Office Address)' : 'ที่อยู่สำนักงานใหญ่ (Head Office Address)'}</label>
                                    <div className="relative">
                                        <textarea 
                                            rows={4}
                                            value={companyInfo.address}
                                            onChange={(e) => handleCompanyChange('address', e.target.value)}
                                            className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors leading-relaxed pr-12"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setIsMapOpen(true)}
                                            className="absolute top-4 right-4 text-[#A3A3A3] hover:text-[#111111] transition-colors"
                                            title={locale === 'en' ? 'Select a location on the map' : locale === 'zh' ? '在地图上选择一个位置' : 'เลือกตำแหน่งบนแผนที่'}
                                        >
                                            <MapPin className="w-5 h-5" />
                                        </button>
                                    </div>
                                    {(companyInfo as any).lat && (
                                        <p className="text-[10px] font-mono text-[#666666] mt-1">
                                            GPS: {(companyInfo as any).lat.toFixed(6)}, {(companyInfo as any).lng.toFixed(6)}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'เบอร์โทรศัพท์' : locale === 'zh' ? 'เบอร์โทรศัพท์' : 'เบอร์โทรศัพท์'}</label>
                                        <input 
                                            type="text" 
                                            value={companyInfo.phone}
                                            onChange={(e) => handleCompanyChange('phone', e.target.value)}
                                            className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'อีเมลติดต่อ' : locale === 'zh' ? 'อีเมลติดต่อ' : 'อีเมลติดต่อ'}</label>
                                        <input 
                                            type="email" 
                                            value={companyInfo.email}
                                            onChange={(e) => handleCompanyChange('email', e.target.value)}
                                            className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-full border border-[#E5E5E5] bg-white p-6 md:p-8">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111] mb-2">Contract Legal Profile</h3>
                                <p className="text-xs text-[#666666] mb-6">
                                    {locale === 'en' ? '                                     ใช้สำหรับแบบฟอร์มสัญญารับจ้างเหมาจัดสวนโดยเฉพาะ เช่น ชื่อนิติบุคคลในสัญญา ผู้ลงนาม และพยานฝั่งผู้รับจ้าง                                 ' : locale === 'zh' ? '                                     ใช้สำหรับแบบฟอร์มสัญญารับจ้างเหมาจัดสวนโดยเฉพาะ เช่น ชื่อนิติบุคคลในสัญญา ผู้ลงนาม และพยานฝั่งผู้รับจ้าง                                 ' : '                                     ใช้สำหรับแบบฟอร์มสัญญารับจ้างเหมาจัดสวนโดยเฉพาะ เช่น ชื่อนิติบุคคลในสัญญา ผู้ลงนาม และพยานฝั่งผู้รับจ้าง                                 '}</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'ชื่อนิติบุคคลในสัญญา' : locale === 'zh' ? 'ชื่อนิติบุคคลในสัญญา' : 'ชื่อนิติบุคคลในสัญญา'}</label>
                                        <input
                                            type="text"
                                            value={companyInfo.contract_company_name}
                                            onChange={(e) => handleCompanyChange('contract_company_name', e.target.value)}
                                            className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'เลขทะเบียน/ภาษีในสัญญา' : locale === 'zh' ? 'เลขทะเบียน/ภาษีในสัญญา' : 'เลขทะเบียน/ภาษีในสัญญา'}</label>
                                        <input
                                            type="text"
                                            value={companyInfo.contract_company_tax_id}
                                            onChange={(e) => handleCompanyChange('contract_company_tax_id', e.target.value)}
                                            className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors font-mono"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'ที่อยู่นิติบุคคลในสัญญา' : locale === 'zh' ? 'ที่อยู่นิติบุคคลในสัญญา' : 'ที่อยู่นิติบุคคลในสัญญา'}</label>
                                        <textarea
                                            rows={3}
                                            value={companyInfo.contract_company_address}
                                            onChange={(e) => handleCompanyChange('contract_company_address', e.target.value)}
                                            className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors leading-relaxed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'Contractor\'s signatory' : locale === 'zh' ? '承包商签字人' : 'ผู้ลงนามฝ่ายผู้รับจ้าง'}</label>
                                        <input
                                            type="text"
                                            value={companyInfo.contract_signer_name}
                                            onChange={(e) => handleCompanyChange('contract_signer_name', e.target.value)}
                                            className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'พยานฝ่ายผู้รับจ้าง' : locale === 'zh' ? 'พยานฝ่ายผู้รับจ้าง' : 'พยานฝ่ายผู้รับจ้าง'}</label>
                                        <input
                                            type="text"
                                            value={companyInfo.contract_witness_name}
                                            onChange={(e) => handleCompanyChange('contract_witness_name', e.target.value)}
                                            className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* --- TAB: FINANCIALS --- */}
                    {activeTab === 'financial' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="col-span-full">
                                <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-[#111111] inline-block"></span>
                                    {locale === 'en' ? '                                     ข้อมูลทางการเงิน (Financial Information)                                 ' : locale === 'zh' ? '                                     ข้อมูลทางการเงิน (Financial Information)                                 ' : '                                     ข้อมูลทางการเงิน (Financial Information)                                 '}</h2>
                                <p className="text-sm text-[#666666] mb-8 font-light max-w-2xl">
                                    {locale === 'en' ? '                                     ข้อมูลบัญชีธนาคารสำหรับแสดงในท้ายใบแจ้งหนี้/ใบเสนอราคา เพื่อให้ลูกค้าชำระเงิน                                 ' : locale === 'zh' ? '                                     ข้อมูลบัญชีธนาคารสำหรับแสดงในท้ายใบแจ้งหนี้/ใบเสนอราคา เพื่อให้ลูกค้าชำระเงิน                                 ' : '                                     ข้อมูลบัญชีธนาคารสำหรับแสดงในท้ายใบแจ้งหนี้/ใบเสนอราคา เพื่อให้ลูกค้าชำระเงิน                                 '}</p>
                            </div>

                           <div className="space-y-6 p-6 border border-[#E5E5E5] bg-white">
                                                                <div className="space-y-3">
                                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'ไอคอนธนาคารบนเอกสาร' : locale === 'zh' ? 'ไอคอนธนาคารบนเอกสาร' : 'ไอคอนธนาคารบนเอกสาร'}</label>
                                                                        <div className="grid grid-cols-1 gap-3">
                                                                            {BANK_ICON_OPTIONS.map((option) => {
                                                                                const { locale } = useI18n();
                                                                                const selected = financialInfo.bank_code === option.code
                                                                                return (
                                                                                    <button
                                                                                        key={option.code}
                                                                                        type="button"
                                                                                        onClick={() => handleSelectBankIcon(option.code)}
                                                                                        className={`flex items-center gap-3 border p-3 text-left transition-colors ${selected ? 'border-[#111111] bg-[#F5F5F5]' : 'border-[#E5E5E5] bg-white hover:border-[#BDBDBD]'}`}
                                                                                    >
                                                                                        <img src={option.icon} alt={option.label} className="w-10 h-10 rounded-full object-cover border border-[#E5E5E5]" />
                                                                                        <div>
                                                                                            <p className="text-sm font-semibold text-[#111111]">{option.label}</p>
                                                                                            <p className="text-xs text-[#666666]">{locale === 'en' ? 'ใช้เป็นไอคอนในใบเสนอราคา/ใบแจ้งหนี้' : locale === 'zh' ? 'ใช้เป็นไอคอนในใบเสนอราคา/ใบแจ้งหนี้' : 'ใช้เป็นไอคอนในใบเสนอราคา/ใบแจ้งหนี้'}</p>
                                                                                        </div>
                                                                                    </button>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'ชื่อธนาคาร (Bank Name)' : locale === 'zh' ? 'ชื่อธนาคาร (Bank Name)' : 'ชื่อธนาคาร (Bank Name)'}</label>
                                    <input 
                                        type="text" 
                                        value={financialInfo.bank_name}
                                        onChange={(e) => handleFinancialChange('bank_name', e.target.value)}
                                        className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'เลขที่บัญชี (Account No.)' : locale === 'zh' ? 'เลขที่บัญชี (Account No.)' : 'เลขที่บัญชี (Account No.)'}</label>
                                    <input 
                                        type="text" 
                                        value={financialInfo.account_no}
                                        onChange={(e) => handleFinancialChange('account_no', e.target.value)}
                                        className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-2xl font-light tracking-widest font-mono text-[#111111]"
                                    />
                                </div>
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'ชื่อบัญชี (Account Name)' : locale === 'zh' ? 'ชื่อบัญชี (Account Name)' : 'ชื่อบัญชี (Account Name)'}</label>
                                    <input 
                                        type="text" 
                                        value={financialInfo.account_name}
                                        onChange={(e) => handleFinancialChange('account_name', e.target.value)}
                                        className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'สาขา (Branch)' : locale === 'zh' ? 'สาขา (Branch)' : 'สาขา (Branch)'}</label>
                                    <input 
                                        type="text" 
                                        value={financialInfo.branch}
                                        onChange={(e) => handleFinancialChange('branch', e.target.value)}
                                        className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors"
                                    />
                                </div>
                           </div>

                             <div className="space-y-6">
                                {/* Preview Card */}
                                <div className="border border-[#111111] p-8 bg-[#FAFAFA] relative overflow-hidden">
                                     <div className="absolute top-0 right-0 bg-[#111111] text-white text-[9px] px-3 py-1 font-bold uppercase">Preview on Document</div>
                                    <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded text-sm text-green-900">
                                        <p className="font-bold text-xs uppercase tracking-wider mb-2 text-green-800">Payment Details</p>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                {financialInfo.bank_icon ? <img src={financialInfo.bank_icon} alt={financialInfo.bank_name} className="w-6 h-6 rounded-full object-cover border border-green-200" /> : null}
                                                <p><span className="font-semibold">{financialInfo.bank_name}</span></p>
                                            </div>
                                            <p>{locale === 'en' ? 'เลขที่บัญชี: ' : locale === 'zh' ? 'เลขที่บัญชี: ' : 'เลขที่บัญชี: '}<span className="font-mono font-bold">{financialInfo.account_no}</span></p>
                                            <p>{locale === 'en' ? 'ชื่อบัญชี: ' : locale === 'zh' ? 'ชื่อบัญชี: ' : 'ชื่อบัญชี: '}{financialInfo.account_name}</p>
                                            <p className="text-xs text-green-700 mt-2">* {financialInfo.branch}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-[#666666] mt-4 font-light italic">
                                        {locale === 'en' ? '                                         นี่คือตัวอย่างการแสดงผลในเอกสาร PDF (Invoice / Quotation) เมื่อบันทึกข้อมูลแล้ว                                     ' : locale === 'zh' ? '                                         นี่คือตัวอย่างการแสดงผลในเอกสาร PDF (Invoice / Quotation) เมื่อบันทึกข้อมูลแล้ว                                     ' : '                                         นี่คือตัวอย่างการแสดงผลในเอกสาร PDF (Invoice / Quotation) เมื่อบันทึกข้อมูลแล้ว                                     '}</p>
                                </div>
                             </div>
                        </div>
                    )}


                    {/* --- TAB: FEATURES --- */}
                    {activeTab === 'features' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="col-span-full">
                                <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-[#111111] inline-block"></span>
                                    {locale === 'en' ? '                                     การเปิด-ปิดระบบ (System Features)                                 ' : locale === 'zh' ? '                                     การเปิด-ปิดระบบ (System Features)                                 ' : '                                     การเปิด-ปิดระบบ (System Features)                                 '}</h2>
                                <p className="text-sm text-[#666666] mb-8 font-light max-w-2xl">
                                    {locale === 'en' ? '                                     ควบคุมการเข้าถึงฟีเจอร์ต่างๆ ของระบบ หากปิดการใช้งาน เมนูที่เกี่ยวข้องจะถูกซ่อนจากผู้ใช้ทั่วไป                                 ' : locale === 'zh' ? '                                     ควบคุมการเข้าถึงฟีเจอร์ต่างๆ ของระบบ หากปิดการใช้งาน เมนูที่เกี่ยวข้องจะถูกซ่อนจากผู้ใช้ทั่วไป                                 ' : '                                     ควบคุมการเข้าถึงฟีเจอร์ต่างๆ ของระบบ หากปิดการใช้งาน เมนูที่เกี่ยวข้องจะถูกซ่อนจากผู้ใช้ทั่วไป                                 '}</p>
                            </div>

                                 {/* Marketplace Toggle */}
                                <div className="flex items-center justify-between p-6 border border-[#E5E5E5] bg-white hover:border-[#CCCCCC] transition-colors group">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">{locale === 'en' ? 'Marketplace (ตลาดสินค้า)' : locale === 'zh' ? 'Marketplace (ตลาดสินค้า)' : 'Marketplace (ตลาดสินค้า)'}</h3>
                                        <p className="text-xs text-[#666666] mt-1 font-light">
                                            {locale === 'en' ? '                                             เปิดให้ลูกค้าเข้าชมและสั่งซื้อต้นไม้/สินค้าผ่านหน้าร้านค้าออนไลน์                                         ' : locale === 'zh' ? '                                             เปิดให้ลูกค้าเข้าชมและสั่งซื้อต้นไม้/สินค้าผ่านหน้าร้านค้าออนไลน์                                         ' : '                                             เปิดให้ลูกค้าเข้าชมและสั่งซื้อต้นไม้/สินค้าผ่านหน้าร้านค้าออนไลน์                                         '}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleFeatureToggle('marketplace_enabled')}
                                        className={`w-12 h-6 rounded-full p-1 transition-colors relative ${features.marketplace_enabled ? 'bg-[#111111]' : 'bg-[#E5E5E5]'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${features.marketplace_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {/* Service Booking Toggle */}
                                <div className="flex items-center justify-between p-6 border border-[#E5E5E5] bg-white hover:border-[#CCCCCC] transition-colors group">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">{locale === 'en' ? 'Service Booking (จองบริการ)' : locale === 'zh' ? 'Service Booking (จองบริการ)' : 'Service Booking (จองบริการ)'}</h3>
                                        <p className="text-xs text-[#666666] mt-1 font-light">
                                            {locale === 'en' ? '                                             เปิดให้ลูกค้ากดจองบริการดูแลสวนผ่านระบบ                                         ' : locale === 'zh' ? '                                             เปิดให้ลูกค้ากดจองบริการดูแลสวนผ่านระบบ                                         ' : '                                             เปิดให้ลูกค้ากดจองบริการดูแลสวนผ่านระบบ                                         '}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleFeatureToggle('service_booking_enabled')}
                                        className={`w-12 h-6 rounded-full p-1 transition-colors relative ${features.service_booking_enabled ? 'bg-[#111111]' : 'bg-[#E5E5E5]'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${features.service_booking_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                            <div className="space-y-4">
                                 {/* New Registration Toggle */}
                                 <div className="flex items-center justify-between p-6 border border-[#E5E5E5] bg-white hover:border-[#CCCCCC] transition-colors group">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">{locale === 'en' ? 'New Registration (สมัครสมาชิกใหม่)' : locale === 'zh' ? 'New Registration (สมัครสมาชิกใหม่)' : 'New Registration (สมัครสมาชิกใหม่)'}</h3>
                                        <p className="text-xs text-[#666666] mt-1 font-light">
                                            {locale === 'en' ? '                                             อนุญาตให้ผู้ใช้อื่นสมัครสมาชิกเข้ามาในระบบได้                                         ' : locale === 'zh' ? '                                             อนุญาตให้ผู้ใช้อื่นสมัครสมาชิกเข้ามาในระบบได้                                         ' : '                                             อนุญาตให้ผู้ใช้อื่นสมัครสมาชิกเข้ามาในระบบได้                                         '}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleFeatureToggle('new_user_registration')}
                                        className={`w-12 h-6 rounded-full p-1 transition-colors relative ${features.new_user_registration ? 'bg-[#111111]' : 'bg-[#E5E5E5]'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${features.new_user_registration ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {/* Maintenance Mode */}
                                <div className={`flex items-center justify-between p-6 border transition-colors group ${features.maintenance_mode ? 'border-red-500 bg-red-50' : 'border-[#E5E5E5] bg-white'}`}>
                                    <div>
                                        <h3 className={`text-sm font-bold uppercase tracking-wider ${features.maintenance_mode ? 'text-red-600' : 'text-[#111111]'}`}>{locale === 'en' ? 'Maintenance Mode (ปิดปรับปรุง)' : locale === 'zh' ? 'Maintenance Mode (ปิดปรับปรุง)' : 'Maintenance Mode (ปิดปรับปรุง)'}</h3>
                                        <p className={`text-xs mt-1 font-light ${features.maintenance_mode ? 'text-red-500' : 'text-[#666666]'}`}>
                                            {locale === 'en' ? '                                             ปิดการเข้าถึงระบบทั้งหมดสำหรับลูกค้า (แสดงหน้าปิดปรับปรุง)                                         ' : locale === 'zh' ? '                                             ปิดการเข้าถึงระบบทั้งหมดสำหรับลูกค้า (แสดงหน้าปิดปรับปรุง)                                         ' : '                                             ปิดการเข้าถึงระบบทั้งหมดสำหรับลูกค้า (แสดงหน้าปิดปรับปรุง)                                         '}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleFeatureToggle('maintenance_mode')}
                                        className={`w-12 h-6 rounded-full p-1 transition-colors relative ${features.maintenance_mode ? 'bg-red-600' : 'bg-[#E5E5E5]'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${features.maintenance_mode ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>

        <GoogleMapsLocationPicker 
            isOpen={isMapOpen}
            onClose={() => setIsMapOpen(false)}
            onLocationSelect={handleLocationSelect}
            initialLocation={(companyInfo as any).lat ? { lat: (companyInfo as any).lat, lng: (companyInfo as any).lng } : undefined}
        />
    </div>
  )
}
