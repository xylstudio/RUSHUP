'use client';
import React, { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { PrinterSocket } from 'custom-printer-plugin'
import { printCustomerReceipt, printKitchenTicket } from '@/lib/printerUtils'
import { 
  Plus, Loader2, Save, X, Settings, Clock,
  Bell, Info, Image as ImageIcon, Star,
  ChevronDown, ChevronUp, Upload, Trash2, Menu as MenuIcon, ChevronRight, ArrowLeft, ShieldCheck, QrCode,
  MapPin, Printer, Truck
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import AddressMapInput from '@/components/AddressMapInput'
import { useI18n } from "@/lib/I18nContext";

const permissionOptions = [
  { id: 'terminal', label: 'หน้าขาย (POS TERMINAL)', desc: 'หน้าขายหลักของระบบ POS สำหรับทำรายการขายหน้าร้าน' },
  { id: 'kitchen', label: 'จอสั่งอาหาร (KITCHEN)', desc: 'จอแสดงออเดอร์สำหรับห้องครัวเพื่อเตรียมและเสิร์ฟอาหาร' },
  { id: 'tables', label: 'จัดการโต๊ะ (TABLES)', desc: 'ระบบจัดการและแสดงสถานะโต๊ะอาหารภายในร้าน' },
  { id: 'members', label: 'จัดการสมาชิก (MEMBERS)', desc: 'จัดการข้อมูลและแต้มสะสมของสมาชิก' },
  { id: 'drawer', label: 'ลิ้นชักเงิน (DRAWER)', desc: 'ควบคุมประวัติการเปิด-ปิดกะลิ้นชักเก็บเงินสด' },
  { id: 'delivery', label: 'ศูนย์ส่งสินค้า (DELIVERY)', desc: 'จัดการออเดอร์เดลิเวอรี่และไรเดอร์' },
  { id: 'history', label: 'ประวัติการขาย (HISTORY)', desc: 'ดูบิลขายย้อนหลังและจัดการบิลที่ปิดแล้ว' },
  { id: 'inventory', label: 'สต็อกวัตถุดิบ (INVENTORY)', desc: 'ควบคุมสต็อกวัตถุดิบและส่วนประกอบอาหาร' },
  { id: 'modifiers', label: 'จัดการตัวเลือก (MODIFIERS)', desc: 'เพิ่ม/แก้ไขตัวเลือกเสริม (Modifiers) ของเมนูอาหาร' },
  { id: 'management', label: 'จัดการระบบ (MANAGEMENT)', desc: 'การจัดการข้อมูลเชิงลึกและระบบหลังบ้านของสาขา' },
  { id: 'settings', label: 'ตั้งค่าร้าน (SHOP SETTINGS)', desc: 'จัดการวันเวลาเปิดปิดร้าน แบนเนอร์ และสิทธิ์พนักงาน' },
  { id: 'reports', label: 'รายงานผล (REPORTS)', desc: 'รายงานยอดขายและสถิติสำคัญประจำกะ' },
  { id: 'staff', label: 'จัดการพนักงาน (STAFF)', desc: 'ระบบจัดการสิทธิ์และรายชื่อพนักงานประจำร้าน' },
];

interface POSShopSettingsProps {
  profile: any
  activeView: string
  allowedNav: any[]
  onSetView: (view: any) => void
  onShiftModalOpen?: () => void
  activeShift?: any
  setViewExtraHeader: (node: React.ReactNode) => void
}

export default function POSShopSettings({ 
  profile, activeView, allowedNav, onSetView, onShiftModalOpen, activeShift, setViewExtraHeader
}: POSShopSettingsProps) {
    const { locale } = useI18n();
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('general')
  const [previewStoryIndex, setPreviewStoryIndex] = useState<number>(0)
  
  const [banners, setBanners] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)

  const [settings, setSettings] = useState<any>({
    id: null,
    branch_id: null,
    status: 'open',
    status_expiry: null,
    is_open: true,
    status_message: 'ขออภัย ขณะนี้ร้านปิดให้บริการชั่วคราว',
    opening_hours: { allow_qr_payment: true },
    loyalty_points_per_thb: 10,
    loyalty_earn_rate: 100,
    latitude: 13.7563,
    longitude: 100.5018,
    address: '',
    role_permissions: {
      manager: ['terminal', 'inventory', 'kitchen', 'tables', 'members', 'drawer', 'delivery', 'history', 'modifiers', 'settings'],
      staff: ['terminal', 'inventory', 'kitchen', 'tables', 'members', 'drawer', 'delivery', 'history']
    },
    printers: [],
    receipt_story_mode: false,
    receipt_stories: [
      { id: '1', title: 'บทที่ 1: การพบเจอ', content: 'วันนี้อากาศดีเหมือนทุกวัน แต่สายตาของผมกลับหยุดอยู่ที่โต๊ะริมหน้าต่าง... รอยยิ้มของเธอทำให้กาแฟแก้วนี้หวานขึ้นอย่างประหลาด' },
      { id: '2', title: 'บทที่ 2: แก้วที่สอง', content: '"รับเหมือนเดิมนะคะ" เธอพูดพร้อมส่งยิ้มบางๆ ผมพยักหน้า ทั้งที่ใจจริงอยากจะตอบไปว่ารับคุณด้วยได้ไหม' }
    ],
    receipt_payment_qr_image: '',
  })

  useEffect(() => {
    if (profile) {
      void fetchSettings()
      void fetchBanners()
    }
  }, [profile])

  useEffect(() => {
    setViewExtraHeader(null);
    return () => setViewExtraHeader(null);
  }, [setViewExtraHeader, profile]);

  const fetchSettings = async () => {
    setLoading(true)
    try {
        let branchId = null
        if (profile?.branch_code) {
            const { data: branch } = await supabase
                .from('branches')
                .select('id')
                .eq('branch_code', profile.branch_code)
                .maybeSingle()
            if (branch) branchId = branch.id
        }
        
        let data = null
        if (branchId) {
            const { data: bData } = await supabase
                .from('pos_shop_settings')
                .select('*')
                .eq('branch_id', branchId)
                .maybeSingle()
            data = bData
        } else {
            const { data: bData } = await supabase
                .from('pos_shop_settings')
                .select('*')
                .eq('id', '00000000-0000-0000-0000-000000000001')
                .maybeSingle()
            data = bData
        }
        
        if (!data) {
            const { data: globalData } = await supabase
                .from('pos_shop_settings')
                .select('*')
                .is('branch_id', null)
                .maybeSingle()
            data = globalData
        }

        if (data) {
            const effectiveStatus = data.status || (data.is_open ? 'open' : 'closed');
            setSettings({
                ...data,
                branch_id: data.branch_id || branchId,
                status: effectiveStatus,
                is_open: effectiveStatus === 'open',
                role_permissions: data.role_permissions || {
                    manager: ['terminal', 'inventory', 'kitchen', 'tables', 'members', 'drawer', 'delivery', 'history', 'modifiers', 'settings'],
                    staff: ['terminal', 'inventory', 'kitchen', 'tables', 'members', 'drawer', 'delivery', 'history']
                },
                printers: data.printers || [],
                receipt_header: data.opening_hours?.receipt_header || '',
                receipt_story_mode: data.opening_hours?.receipt_story_mode || false,
                receipt_stories: data.opening_hours?.receipt_stories || [],
                receipt_show_logo: data.opening_hours?.receipt_show_logo ?? true,
                receipt_font_size: data.opening_hours?.receipt_font_size || 'normal',
                receipt_payment_qr_image: data.opening_hours?.receipt_payment_qr_image || '',
                address: data.opening_hours?.address || '',
                loyalty_points_per_thb: data.opening_hours?.loyalty_points_per_thb || 10,
                loyalty_earn_rate: data.opening_hours?.loyalty_earn_rate || 100,
                delivery_gp: data.opening_hours?.delivery_gp || { grab: 32.1, lineman: 32.1, shopee: 32.1, foodpanda: 32.1, robinhood: 0 },
                active_delivery_platforms: data.opening_hours?.active_delivery_platforms || ['grab', 'shopee', 'lineman', 'foodpanda', 'robinhood'],
            })
        } else {
            setSettings((prev: any) => ({ ...prev, branch_id: branchId }))
        }

        const { data: catData } = await supabase.from('pos_menu_categories').select('*').order('order_index')
        if (catData) setCategories(catData)
    } catch (err) {
        console.error('Fetch settings error:', err)
    } finally {
        setLoading(false)
    }
  }

  const fetchBanners = async () => {
    const { data } = await supabase
      .from('pos_banners')
      .select('*')
      .order('order_index', { ascending: true })
      
    if (data) setBanners(data)
  }

  const handleSave = async () => {
    if (!settings.branch_id && settings.id !== '00000000-0000-0000-0000-000000000001') {
        alert('ไม่พบรหัสสาขาของพนักงาน')
        return
    }
    
    setIsSaving(true)
    const payload: any = {
      ...settings,
      opening_hours: {
        ...(settings.opening_hours || {}),
        receipt_header: settings.receipt_header,
        receipt_story_mode: settings.receipt_story_mode,
        receipt_stories: settings.receipt_stories,
        receipt_show_logo: settings.receipt_show_logo,
        receipt_font_size: settings.receipt_font_size,
        receipt_payment_qr_image: settings.receipt_payment_qr_image,
        address: settings.address,
        loyalty_points_per_thb: settings.loyalty_points_per_thb,
        loyalty_earn_rate: settings.loyalty_earn_rate,
        delivery_gp: settings.delivery_gp,
        active_delivery_platforms: settings.active_delivery_platforms,
      },
      is_open: settings.status === 'open',
      updated_at: new Date().toISOString()
    }

    // Strip keys that don't exist in pos_shop_settings schema
    delete payload.receipt_header;
    delete payload.receipt_story_mode;
    delete payload.receipt_stories;
    delete payload.receipt_show_logo;
    delete payload.receipt_font_size;
    delete payload.receipt_payment_qr_image;
    delete payload.loyalty_points_per_thb;
    delete payload.loyalty_earn_rate;
    delete payload.address;
    delete payload.delivery_gp;
    delete payload.active_delivery_platforms;

    try {
        let result;
        if (settings.id) {
            result = await supabase
                .from('pos_shop_settings')
                .update(payload)
                .eq('id', settings.id)
                .select()
                .single()
        } else {
            result = await supabase
                .from('pos_shop_settings')
                .insert(payload)
                .select()
                .single()
        }

        if (result.error) throw result.error
        
        if (result.data) {
            const data = result.data;
            const effectiveStatus = data.status || (data.is_open ? 'open' : 'closed');
            setSettings({
                ...data,
                status: effectiveStatus,
                is_open: effectiveStatus === 'open',
                role_permissions: data.role_permissions || {
                    manager: ['terminal', 'inventory', 'kitchen', 'tables', 'members', 'drawer', 'delivery', 'history', 'modifiers', 'settings'],
                    staff: ['terminal', 'inventory', 'kitchen', 'tables', 'members', 'drawer', 'delivery', 'history']
                },
                printers: data.printers || [],
                receipt_header: data.opening_hours?.receipt_header || '',
                receipt_story_mode: data.opening_hours?.receipt_story_mode || false,
                receipt_stories: data.opening_hours?.receipt_stories || [],
                receipt_show_logo: data.opening_hours?.receipt_show_logo ?? true,
                receipt_font_size: data.opening_hours?.receipt_font_size || 'normal',
                receipt_payment_qr_image: data.opening_hours?.receipt_payment_qr_image || '',
                address: data.opening_hours?.address || '',
                loyalty_points_per_thb: data.opening_hours?.loyalty_points_per_thb || 10,
                loyalty_earn_rate: data.opening_hours?.loyalty_earn_rate || 100,
                delivery_gp: data.opening_hours?.delivery_gp || { grab: 32.1, lineman: 32.1, shopee: 32.1, foodpanda: 32.1, robinhood: 0 },
                active_delivery_platforms: data.opening_hours?.active_delivery_platforms || ['grab', 'shopee', 'lineman', 'foodpanda', 'robinhood'],
            })
            alert('บันทึกการตั้งค่าเรียบร้อยแล้ว')
        }
    } catch (error: any) {
        console.error('Save settings error:', error)
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message)
    } finally {
        setIsSaving(false)
    }
  };

  const handleTestPrint = async (index: number) => {
    const printer = settings.printers[index];
    if (!printer) return;
    
    setIsSaving(true);
    try {
        const dummyOrder = {
            orderNumber: 'Q-01',
            date: new Date().toLocaleString(),
            queueNumber: '01',
            orderType: 'dine_in',
            tableNumber: 'T-01',
            staffName: 'Demo Staff',
            total: 140,
            subtotal: 140,
            discount: 0,
            tax: 0,
            items: [
                {
                    name: 'กาแฟลาเต้ (เย็น)',
                    quantity: 1,
                    subtotal: 140,
                    modifiers: ['หวานน้อย 50%', 'เปลี่ยนนมโอ๊ต'],
                    selected_modifiers: [
                        { name: 'หวานน้อย 50%' },
                        { name: 'เปลี่ยนนมโอ๊ต' }
                    ]
                }
            ]
        };

        if (printer.encoding === 'graphic') {
            const { printGraphicModeCustomerReceipt, printGraphicModeKitchenTicket } = await import('@/lib/graphicPrinter');
            if (printer.type === 'kitchen') {
                await printGraphicModeKitchenTicket(printer.ip, dummyOrder, settings, printer.model, printer.encoding);
            } else if (printer.type === 'receipt') {
                await printGraphicModeCustomerReceipt(printer.ip, dummyOrder, settings, printer.model, printer.encoding);
            } else {
                await printGraphicModeCustomerReceipt(printer.ip, dummyOrder, settings, printer.model, printer.encoding);
                await new Promise(r => setTimeout(r, 1000));
                await printGraphicModeKitchenTicket(printer.ip, dummyOrder, settings, printer.model, printer.encoding);
            }
        } else {
            if (printer.type === 'kitchen') {
                await printKitchenTicket(printer.ip, dummyOrder, settings, printer.model, printer.encoding);
            } else if (printer.type === 'receipt') {
                await printCustomerReceipt(printer.ip, dummyOrder, settings, printer.model, printer.encoding);
            } else {
                await printCustomerReceipt(printer.ip, dummyOrder, settings, printer.model, printer.encoding);
                await new Promise(r => setTimeout(r, 1000));
                await printKitchenTicket(printer.ip, dummyOrder, settings, printer.model, printer.encoding);
            }
        }

        alert('ส่งคำสั่งพิมพ์ทดสอบสำเร็จ');
    } catch (error) {
        console.error('Test print error:', error);
        alert('เกิดข้อผิดพลาดในการพิมพ์ทดสอบ: ' + (error as any).message);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto bg-[#FAFAFA] border-none custom-scrollbar text-[#1A1A18]">
          {loading ? (
             <div className="h-full flex items-center justify-center opacity-10">
                 <Loader2 className="animate-spin" size={64} />
             </div>
          ) : (
            <div className="max-w-6xl mx-auto py-10 sm:py-16 px-4 sm:px-8 space-y-8 pb-40">
                
                {/* 🧧 HEADER & CRITICAL STATUS */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{locale === 'en' ? 'ตั้งค่าร้าน ' : locale === 'zh' ? 'ตั้งค่าร้าน ' : 'ตั้งค่าร้าน '}<span className="text-gray-400 font-light">| Settings</span></h1>
                        <p className="text-[13px] font-bold text-gray-500">{locale === 'en' ? 'จัดการข้อมูลร้านค้า ใบเสร็จ และอุปกรณ์สำหรับสาขา ' : locale === 'zh' ? 'จัดการข้อมูลร้านค้า ใบเสร็จ และอุปกรณ์สำหรับสาขา ' : 'จัดการข้อมูลร้านค้า ใบเสร็จ และอุปกรณ์สำหรับสาขา '}{profile?.branch_code}</p>
                    </div>
                    
                    <div className="flex flex-col items-start md:items-end gap-3 bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <h4 className="text-[12px] font-black uppercase tracking-tight">System Status</h4>
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${settings.status === 'open' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {settings.status === 'open' ? 'ร้านเปิดให้บริการ' : 'ร้านปิดให้บริการ'}
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    const newStatus = settings.status === 'open' ? 'closed' : 'open';
                                    setSettings({ ...settings, status: newStatus, is_open: newStatus === 'open' });
                                }}
                                className={`relative w-20 h-10 rounded-full transition-colors duration-300 shadow-inner ${settings.status === 'open' ? 'bg-emerald-500' : 'bg-red-500'}`}
                            >
                                <div className={`absolute top-1 w-8 h-8 rounded-full bg-white transition-all duration-300 shadow-md flex items-center justify-center ${settings.status === 'open' ? 'left-11' : 'left-1'}`}>
                                    <div className={`w-2 h-2 rounded-full ${settings.status === 'open' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* SIDEBAR TABS */}
                    <div className="w-full lg:w-64 flex-shrink-0 space-y-3">
                        {[
                            { id: 'general', icon: Info, label: 'ข้อมูลร้านค้า', desc: 'ที่อยู่, ข้อความประกาศ' },
                            { id: 'receipt', icon: Printer, label: 'ตั้งค่าใบเสร็จ', desc: 'หัวบิล, โลโก้, ท้ายบิล' },
                            { id: 'kitchen', icon: MenuIcon, label: 'ห้องครัว', desc: 'ฟอนต์, ออเดอร์' },
                            { id: 'hardware', icon: Settings, label: 'เครื่องปริ้น', desc: 'จัดการอุปกรณ์เสริม' },
                            { id: 'advanced', icon: Star, label: 'ระบบจ่ายเงิน & สมาชิก', desc: 'QR, พอยท์สะสม' },
                            { id: 'permissions', icon: ShieldCheck, label: 'สิทธิ์การใช้งาน', desc: 'ผู้จัดการ, พนักงาน' }
                        ].map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-left ${isActive ? 'bg-black text-white shadow-xl shadow-black/10 scale-[1.02]' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-white/10' : 'bg-gray-100'}`}>
                                        <Icon size={18} className={isActive ? 'text-white' : 'text-gray-500'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-[13px] leading-tight truncate">{tab.label}</div>
                                        <div className={`text-[10px] font-bold tracking-tight mt-0.5 truncate ${isActive ? 'text-white/60' : 'text-gray-400'}`}>{tab.desc}</div>
                                    </div>
                                    {isActive && <ChevronRight size={16} className="opacity-50 flex-shrink-0" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="flex-1 min-w-0 pb-20">
                        
                        {/* TAB: GENERAL */}
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                    <h3 className="text-xl font-black mb-2 flex items-center gap-3">
                                        <Info className="text-blue-500" size={24} /> {locale === 'en' ? ' ข้อมูลร้านทั่วไป                                     ' : locale === 'zh' ? ' ข้อมูลร้านทั่วไป                                     ' : ' ข้อมูลร้านทั่วไป                                     '}</h3>
                                    <p className="text-[12px] text-gray-500 font-bold mb-8">{locale === 'en' ? 'ข้อมูลสำหรับการแสดงผลและการติดต่อ' : locale === 'zh' ? 'ข้อมูลสำหรับการแสดงผลและการติดต่อ' : 'ข้อมูลสำหรับการแสดงผลและการติดต่อ'}</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'ชื่อร้าน (Shop Name)' : locale === 'zh' ? 'ชื่อร้าน (Shop Name)' : 'ชื่อร้าน (Shop Name)'}</label>
                                            <input 
                                                type="text" 
                                                value={settings.name || ''}
                                                onChange={e => setSettings({...settings, name: e.target.value})}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 px-5 text-[14px] font-bold outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all" 
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'ชื่อสาขา (Branch)' : locale === 'zh' ? 'ชื่อสาขา (Branch)' : 'ชื่อสาขา (Branch)'}</label>
                                            <input 
                                                type="text" 
                                                value={settings.branch_name || ''}
                                                onChange={e => setSettings({...settings, branch_name: e.target.value})}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 px-5 text-[14px] font-bold outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all" 
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'เลขผู้เสียภาษี (Tax ID)' : locale === 'zh' ? 'เลขผู้เสียภาษี (Tax ID)' : 'เลขผู้เสียภาษี (Tax ID)'}</label>
                                            <input 
                                                type="text" 
                                                value={settings.tax_id || ''}
                                                onChange={e => setSettings({...settings, tax_id: e.target.value})}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 px-5 text-[14px] font-bold outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all" 
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'เบอร์โทร (Phone)' : locale === 'zh' ? 'เบอร์โทร (Phone)' : 'เบอร์โทร (Phone)'}</label>
                                            <input 
                                                type="text" 
                                                value={settings.phone || ''}
                                                onChange={e => setSettings({...settings, phone: e.target.value})}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 px-5 text-[14px] font-bold outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all" 
                                            />
                                        </div>
                                        <div className="space-y-3 md:col-span-2">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'ที่อยู่ (Address)' : locale === 'zh' ? 'ที่อยู่ (Address)' : 'ที่อยู่ (Address)'}</label>
                                            <textarea 
                                                value={settings.address || ''}
                                                onChange={e => setSettings({...settings, address: e.target.value})}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 px-5 text-[14px] font-bold outline-none focus:ring-2 focus:ring-black focus:border-transparent min-h-[100px] resize-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                    <h3 className="text-xl font-black mb-2 flex items-center gap-3">
                                        <Bell className="text-orange-500" size={24} /> {locale === 'en' ? ' ประกาศและข้อความหน้าร้าน                                     ' : locale === 'zh' ? ' ประกาศและข้อความหน้าร้าน                                     ' : ' ประกาศและข้อความหน้าร้าน                                     '}</h3>
                                    <p className="text-[12px] text-gray-500 font-bold mb-6">{locale === 'en' ? 'ข้อความที่จะแสดงในหน้าระบบสั่งอาหาร LINE LIFF' : locale === 'zh' ? 'ข้อความที่จะแสดงในหน้าระบบสั่งอาหาร LINE LIFF' : 'ข้อความที่จะแสดงในหน้าระบบสั่งอาหาร LINE LIFF'}</p>
                                    <textarea 
                                        value={settings.status_message}
                                        onChange={e => setSettings({...settings, status_message: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 px-5 text-[14px] font-bold outline-none focus:ring-2 focus:ring-black min-h-[120px] resize-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* TAB: RECEIPT */}
                        {activeTab === 'receipt' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                    <h3 className="text-xl font-black mb-2 flex items-center gap-3">
                                        <Printer className="text-purple-500" size={24} /> {locale === 'en' ? ' ตั้งค่ารูปแบบใบเสร็จ                                     ' : locale === 'zh' ? ' ตั้งค่ารูปแบบใบเสร็จ                                     ' : ' ตั้งค่ารูปแบบใบเสร็จ                                     '}</h3>
                                    <p className="text-[12px] text-gray-500 font-bold mb-8">{locale === 'en' ? 'ข้อความและรายละเอียดที่จะปรากฏบนใบเสร็จที่พิมพ์ให้ลูกค้า' : locale === 'zh' ? 'ข้อความและรายละเอียดที่จะปรากฏบนใบเสร็จที่พิมพ์ให้ลูกค้า' : 'ข้อความและรายละเอียดที่จะปรากฏบนใบเสร็จที่พิมพ์ให้ลูกค้า'}</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3 md:col-span-2">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'ข้อความหัวใบเสร็จ (Header)' : locale === 'zh' ? 'ข้อความหัวใบเสร็จ (Header)' : 'ข้อความหัวใบเสร็จ (Header)'}</label>
                                            <textarea 
                                                value={settings.receipt_header || ''}
                                                onChange={e => setSettings({...settings, receipt_header: e.target.value})}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 px-5 text-[14px] font-bold outline-none focus:ring-2 focus:ring-black min-h-[100px] resize-none transition-all"
                                                placeholder={locale === 'en' ? 'ยินดีต้อนรับ / Welcome' : locale === 'zh' ? 'ยินดีต้อนรับ / Welcome' : 'ยินดีต้อนรับ / Welcome'}
                                            />
                                        </div>
                                        <div className="space-y-3 md:col-span-2">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'ข้อความท้ายใบเสร็จ (Footer)' : locale === 'zh' ? 'ข้อความท้ายใบเสร็จ (Footer)' : 'ข้อความท้ายใบเสร็จ (Footer)'}</label>
                                            <textarea 
                                                value={settings.receipt_footer || ''}
                                                onChange={e => setSettings({...settings, receipt_footer: e.target.value})}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 px-5 text-[14px] font-bold outline-none focus:ring-2 focus:ring-black min-h-[100px] resize-none transition-all"
                                                placeholder="Thank you for your visit!"
                                            />
                                        </div>
                                        
                                        <div className="flex items-center justify-between bg-gray-50 p-5 rounded-xl border border-gray-100">
                                            <div>
                                                <label className="text-[13px] font-black text-gray-900 block mb-1">{locale === 'en' ? 'แสดงโลโก้ร้าน (Show Logo)' : locale === 'zh' ? 'แสดงโลโก้ร้าน (Show Logo)' : 'แสดงโลโก้ร้าน (Show Logo)'}</label>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{locale === 'en' ? 'พิมพ์โลโก้ด้านบนใบเสร็จ' : locale === 'zh' ? 'พิมพ์โลโก้ด้านบนใบเสร็จ' : 'พิมพ์โลโก้ด้านบนใบเสร็จ'}</p>
                                            </div>
                                            <button 
                                                onClick={() => setSettings({...settings, receipt_show_logo: settings.receipt_show_logo === false ? true : false})}
                                                className={`relative w-14 h-8 rounded-full transition-colors ${settings.receipt_show_logo !== false ? 'bg-black' : 'bg-gray-300'}`}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.receipt_show_logo !== false ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 block mb-2">{locale === 'en' ? 'ขนาดตัวอักษรใบเสร็จ (Font Size)' : locale === 'zh' ? 'ขนาดตัวอักษรใบเสร็จ (Font Size)' : 'ขนาดตัวอักษรใบเสร็จ (Font Size)'}</label>
                                            <div className="flex p-1 bg-gray-100 rounded-xl">
                                                <button onClick={() => setSettings({...settings, receipt_font_size: 'normal'})} className={`flex-1 py-3 text-sm font-black rounded-lg transition-all ${(!settings.receipt_font_size || settings.receipt_font_size === 'normal') ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>{locale === 'en' ? 'ขนาดปกติ' : locale === 'zh' ? 'ขนาดปกติ' : 'ขนาดปกติ'}</button>
                                                <button onClick={() => setSettings({...settings, receipt_font_size: 'large'})} className={`flex-1 py-3 text-sm font-black rounded-lg transition-all ${settings.receipt_font_size === 'large' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>{locale === 'en' ? 'ขนาดใหญ่' : locale === 'zh' ? 'ขนาดใหญ่' : 'ขนาดใหญ่'}</button>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 space-y-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <label className="text-[13px] font-black text-gray-900 block mb-1 flex items-center gap-2">
                                                        <QrCode size={16} /> QR จ่ายเงินท้ายใบเสร็จ
                                                    </label>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                                        ใช้กับ LIFF ที่เลือกชำระปลายทาง / COD
                                                    </p>
                                                </div>
                                                {settings.receipt_payment_qr_image && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSettings({...settings, receipt_payment_qr_image: ''})}
                                                        className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-red-500 hover:text-red-600"
                                                    >
                                                        <X size={14} /> ลบ QR
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                <label className="inline-flex items-center gap-2 cursor-pointer text-[12px] font-black text-black">
                                                    <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm">
                                                        <Upload size={14} /> อัปโหลด QR
                                                    </span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0]
                                                            if (!file) return
                                                            const reader = new FileReader()
                                                            reader.onload = () => {
                                                                setSettings({
                                                                    ...settings,
                                                                    receipt_payment_qr_image: String(reader.result || ''),
                                                                })
                                                            }
                                                            reader.readAsDataURL(file)
                                                            e.currentTarget.value = ''
                                                        }}
                                                    />
                                                </label>
                                                <textarea
                                                    value={settings.receipt_payment_qr_image || ''}
                                                    onChange={e => setSettings({...settings, receipt_payment_qr_image: e.target.value})}
                                                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-[12px] font-mono outline-none focus:ring-2 focus:ring-emerald-400 min-h-[120px] resize-none transition-all"
                                                    placeholder="วาง data URL หรือ image URL ของ QR ที่ต้องการพิมพ์ท้ายใบเสร็จ"
                                                />
                                                {settings.receipt_payment_qr_image && (
                                                    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
                                                        <div className="w-20 h-20 rounded-xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                                                            <img src={settings.receipt_payment_qr_image} alt="QR preview" className="max-w-full max-h-full object-contain" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-[12px] font-black text-gray-900 mb-1">ตัวอย่าง QR</div>
                                                            <div className="text-[10px] text-gray-500 font-bold break-all leading-relaxed">
                                                                ระบบจะพิมพ์ QR นี้ต่อท้ายใบเสร็จเมื่อเป็นออเดอร์ LIFF ที่เลือก COD
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                    <h3 className="text-xl font-black mb-2 flex items-center gap-3">
                                        <Star className="text-pink-500" size={24} /> {locale === 'en' ? ' นิยายท้ายบิล (Story on Receipt)                                     ' : locale === 'zh' ? ' นิยายท้ายบิล (Story on Receipt)                                     ' : ' นิยายท้ายบิล (Story on Receipt)                                     '}</h3>
                                    <p className="text-[12px] text-gray-500 font-bold mb-8">{locale === 'en' ? 'พิมพ์เรื่องราวสั้นๆ แบบสุ่มให้ลูกค้าอ่านท้ายใบเสร็จ เพื่อสร้างความประทับใจ' : locale === 'zh' ? 'พิมพ์เรื่องราวสั้นๆ แบบสุ่มให้ลูกค้าอ่านท้ายใบเสร็จ เพื่อสร้างความประทับใจ' : 'พิมพ์เรื่องราวสั้นๆ แบบสุ่มให้ลูกค้าอ่านท้ายใบเสร็จ เพื่อสร้างความประทับใจ'}</p>
                                    
                                    <div className="flex items-center justify-between bg-gray-50 p-5 rounded-xl border border-gray-100 mb-6">
                                        <div>
                                            <label className="text-[13px] font-black text-gray-900 block mb-1">{locale === 'en' ? 'เปิดใช้งานนิยายท้ายบิล (Enable Story Mode)' : locale === 'zh' ? 'เปิดใช้งานนิยายท้ายบิล (Enable Story Mode)' : 'เปิดใช้งานนิยายท้ายบิล (Enable Story Mode)'}</label>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{locale === 'en' ? 'ระบบจะสุ่มตอนนิยายที่มีอยู่ไปแสดงท้ายใบเสร็จ' : locale === 'zh' ? 'ระบบจะสุ่มตอนนิยายที่มีอยู่ไปแสดงท้ายใบเสร็จ' : 'ระบบจะสุ่มตอนนิยายที่มีอยู่ไปแสดงท้ายใบเสร็จ'}</p>
                                        </div>
                                        <button 
                                            onClick={() => setSettings({...settings, receipt_story_mode: !settings.receipt_story_mode})}
                                            className={`relative w-14 h-8 rounded-full transition-colors ${settings.receipt_story_mode ? 'bg-black' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.receipt_story_mode ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    {settings.receipt_story_mode && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'เนื้อเรื่องทั้งหมด (' : locale === 'zh' ? 'เนื้อเรื่องทั้งหมด (' : 'เนื้อเรื่องทั้งหมด ('}{(settings.receipt_stories || []).length} {locale === 'en' ? ' ตอน)' : locale === 'zh' ? ' ตอน)' : ' ตอน)'}</label>
                                                <button 
                                                    onClick={() => {
                                                        const stories = [...(settings.receipt_stories || [])];
                                                        stories.push({ id: Date.now().toString(), title: 'บทที่ ' + (stories.length + 1), content: '' });
                                                        setSettings({...settings, receipt_stories: stories});
                                                    }}
                                                    className="text-[11px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                                >
                                                    <Plus size={14} /> {locale === 'en' ? ' เพิ่มตอนใหม่                                                 ' : locale === 'zh' ? ' เพิ่มตอนใหม่                                                 ' : ' เพิ่มตอนใหม่                                                 '}</button>
                                            </div>
                                            {(settings.receipt_stories || []).map((story: any, idx: number) => (
                                                <div key={story.id} className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4 relative group">
                                                    <button 
                                                        onClick={() => {
                                                            const stories = [...(settings.receipt_stories || [])].filter((_, i) => i !== idx);
                                                            setSettings({...settings, receipt_stories: stories});
                                                        }}
                                                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{locale === 'en' ? 'ชื่อตอน (Title)' : locale === 'zh' ? 'ชื่อตอน (Title)' : 'ชื่อตอน (Title)'}</label>
                                                        <input 
                                                            type="text" 
                                                            value={story.title}
                                                            onChange={e => {
                                                                const stories = [...(settings.receipt_stories || [])];
                                                                stories[idx].title = e.target.value;
                                                                setSettings({...settings, receipt_stories: stories});
                                                            }}
                                                            className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 text-[13px] font-bold outline-none focus:ring-1 focus:ring-black pr-10" 
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{locale === 'en' ? 'เนื้อหา (Content)' : locale === 'zh' ? 'เนื้อหา (Content)' : 'เนื้อหา (Content)'}</label>
                                                        <textarea 
                                                            value={story.content}
                                                            onChange={e => {
                                                                const stories = [...(settings.receipt_stories || [])];
                                                                stories[idx].content = e.target.value;
                                                                setSettings({...settings, receipt_stories: stories});
                                                            }}
                                                            className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 text-[13px] font-bold outline-none focus:ring-1 focus:ring-black min-h-[80px] resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            {(!settings.receipt_stories || settings.receipt_stories.length === 0) && (
                                                <div className="py-8 text-center text-gray-400 text-[12px] font-bold border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                                                    {locale === 'en' ? '                                                     ยังไม่มีตอนนิยาย กรุณาเพิ่มตอนใหม่                                                 ' : locale === 'zh' ? '                                                     ยังไม่มีตอนนิยาย กรุณาเพิ่มตอนใหม่                                                 ' : '                                                     ยังไม่มีตอนนิยาย กรุณาเพิ่มตอนใหม่                                                 '}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB: KITCHEN */}
                        {activeTab === 'kitchen' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                    <h3 className="text-xl font-black mb-2 flex items-center gap-3">
                                        <MenuIcon className="text-orange-500" size={24} /> {locale === 'en' ? ' ตั้งค่าบิลส่งครัว                                     ' : locale === 'zh' ? ' ตั้งค่าบิลส่งครัว                                     ' : ' ตั้งค่าบิลส่งครัว                                     '}</h3>
                                    <p className="text-[12px] text-gray-500 font-bold mb-8">{locale === 'en' ? 'รูปแบบตัวอักษรและการแสดงผลสำหรับบิลที่พิมพ์เข้าห้องครัว' : locale === 'zh' ? 'รูปแบบตัวอักษรและการแสดงผลสำหรับบิลที่พิมพ์เข้าห้องครัว' : 'รูปแบบตัวอักษรและการแสดงผลสำหรับบิลที่พิมพ์เข้าห้องครัว'}</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3 md:col-span-2">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 block mb-2">{locale === 'en' ? 'ขนาดตัวอักษรรายการอาหาร (Font Size)' : locale === 'zh' ? 'ขนาดตัวอักษรรายการอาหาร (Font Size)' : 'ขนาดตัวอักษรรายการอาหาร (Font Size)'}</label>
                                            <div className="flex flex-wrap sm:flex-nowrap p-1 bg-gray-100 rounded-xl">
                                                <button onClick={() => setSettings({...settings, kitchen_font_size: 'normal'})} className={`flex-1 min-w-[100px] py-3 text-sm font-black rounded-lg transition-all ${(!settings.kitchen_font_size || settings.kitchen_font_size === 'normal') ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>{locale === 'en' ? 'normal' : locale === 'zh' ? '普通的' : 'ปกติ'}</button>
                                                <button onClick={() => setSettings({...settings, kitchen_font_size: 'large'})} className={`flex-1 min-w-[100px] py-3 text-sm font-black rounded-lg transition-all ${settings.kitchen_font_size === 'large' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>{locale === 'en' ? 'ใหญ่' : locale === 'zh' ? 'ใหญ่' : 'ใหญ่'}</button>
                                                <button onClick={() => setSettings({...settings, kitchen_font_size: 'huge'})} className={`flex-1 min-w-[100px] py-3 text-sm font-black rounded-lg transition-all ${settings.kitchen_font_size === 'huge' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>{locale === 'en' ? 'ใหญ่มาก (Huge)' : locale === 'zh' ? 'ใหญ่มาก (Huge)' : 'ใหญ่มาก (Huge)'}</button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between bg-gray-50 p-5 rounded-xl border border-gray-100 md:col-span-2">
                                            <div>
                                                <label className="text-[13px] font-black text-gray-900 block mb-1">{locale === 'en' ? 'แสดงประเภทออเดอร์ (Order Type)' : locale === 'zh' ? 'แสดงประเภทออเดอร์ (Order Type)' : 'แสดงประเภทออเดอร์ (Order Type)'}</label>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{locale === 'en' ? 'เช่น ทานที่ร้าน, สั่งกลับบ้าน, เดลิเวอรี่' : locale === 'zh' ? 'เช่น ทานที่ร้าน, สั่งกลับบ้าน, เดลิเวอรี่' : 'เช่น ทานที่ร้าน, สั่งกลับบ้าน, เดลิเวอรี่'}</p>
                                            </div>
                                            <button 
                                                onClick={() => setSettings({...settings, kitchen_show_type: settings.kitchen_show_type === false ? true : false})}
                                                className={`relative w-14 h-8 rounded-full transition-colors ${settings.kitchen_show_type !== false ? 'bg-black' : 'bg-gray-300'}`}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.kitchen_show_type !== false ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: ADVANCED */}
                        {activeTab === 'advanced' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                    <h3 className="text-xl font-black mb-2 flex items-center gap-3">
                                        <Star className="text-yellow-500" size={24} /> {locale === 'en' ? ' ระบบสมาชิก & สะสมแต้ม                                     ' : locale === 'zh' ? ' ระบบสมาชิก & สะสมแต้ม                                     ' : ' ระบบสมาชิก & สะสมแต้ม                                     '}</h3>
                                    <p className="text-[12px] text-gray-500 font-bold mb-8">{locale === 'en' ? 'ตั้งค่าอัตราส่วนการสะสมและแลกแต้มของสมาชิกร้าน' : locale === 'zh' ? 'ตั้งค่าอัตราส่วนการสะสมและแลกแต้มของสมาชิกร้าน' : 'ตั้งค่าอัตราส่วนการสะสมและแลกแต้มของสมาชิกร้าน'}</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'เงินกี่บาท ได้ 1 พอยท์ (Earn Rate)' : locale === 'zh' ? 'เงินกี่บาท ได้ 1 พอยท์ (Earn Rate)' : 'เงินกี่บาท ได้ 1 พอยท์ (Earn Rate)'}</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    value={settings.loyalty_earn_rate || 100}
                                                    onChange={e => setSettings({...settings, loyalty_earn_rate: parseInt(e.target.value) || 0})}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 px-5 text-[14px] font-bold outline-none focus:ring-2 focus:ring-black pr-16" 
                                                />
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-black">{locale === 'en' ? 'baht' : locale === 'zh' ? '铢' : 'บาท'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? '1 พอยท์ ลดได้กี่บาท (Value)' : locale === 'zh' ? '1 พอยท์ ลดได้กี่บาท (Value)' : '1 พอยท์ ลดได้กี่บาท (Value)'}</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    value={settings.loyalty_points_per_thb || 10}
                                                    onChange={e => setSettings({...settings, loyalty_points_per_thb: parseInt(e.target.value) || 0})}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 px-5 text-[14px] font-bold outline-none focus:ring-2 focus:ring-black pr-16" 
                                                />
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-black">{locale === 'en' ? 'baht' : locale === 'zh' ? '铢' : 'บาท'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                    <h3 className="text-xl font-black mb-2 flex items-center gap-3">
                                        <ShieldCheck className="text-blue-500" size={24} /> {locale === 'en' ? ' ระบบสั่งอาหารผ่าน QR (QR Payment)                                     ' : locale === 'zh' ? ' ระบบสั่งอาหารผ่าน QR (QR Payment)                                     ' : ' ระบบสั่งอาหารผ่าน QR (QR Payment)                                     '}</h3>
                                    
                                    <div className="flex items-center justify-between bg-gray-50 p-5 rounded-xl border border-gray-100 mt-6">
                                        <div>
                                            <label className="text-[13px] font-black text-gray-900 block mb-1">{locale === 'en' ? 'อนุญาตให้ลูกค้าจ่ายเงินที่โต๊ะผ่านมือถือ' : locale === 'zh' ? 'อนุญาตให้ลูกค้าจ่ายเงินที่โต๊ะผ่านมือถือ' : 'อนุญาตให้ลูกค้าจ่ายเงินที่โต๊ะผ่านมือถือ'}</label>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{locale === 'en' ? 'เมื่อปิด ลูกค้าจะต้องมาจ่ายที่เคาน์เตอร์' : locale === 'zh' ? 'เมื่อปิด ลูกค้าจะต้องมาจ่ายที่เคาน์เตอร์' : 'เมื่อปิด ลูกค้าจะต้องมาจ่ายที่เคาน์เตอร์'}</p>
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                const h = settings.opening_hours || {};
                                                const isAllowed = h.allow_qr_payment !== false;
                                                const newSettings = {...settings, opening_hours: { ...h, allow_qr_payment: !isAllowed }};
                                                setSettings(newSettings);
                                                const targetId = settings.id || '00000000-0000-0000-0000-000000000001';
                                                await supabase.from('pos_shop_settings').update({ opening_hours: newSettings.opening_hours }).eq('id', targetId);
                                            }}
                                            className={`relative w-14 h-8 rounded-full transition-colors ${settings.opening_hours?.allow_qr_payment !== false ? 'bg-black' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.opening_hours?.allow_qr_payment !== false ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                    <h3 className="text-xl font-black mb-2 flex items-center gap-3">
                                        <Truck className="text-orange-500" size={24} /> {locale === 'en' ? 'ตั้งค่า GP เดลิเวอรี่' : locale === 'zh' ? '设置外卖GP' : 'ตั้งค่า GP เดลิเวอรี่'}
                                    </h3>
                                    <p className="text-[12px] text-gray-500 font-bold mb-8">{locale === 'en' ? 'ระบุเปอร์เซ็นต์หัก GP ของแต่ละแอป' : locale === 'zh' ? '指定每个应用程序扣除的GP百分比' : 'ระบุเปอร์เซ็นต์หัก GP ของแต่ละแอป'}</p>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                        {['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood'].map(platform => {
                                            const isActive = settings.active_delivery_platforms?.includes(platform) ?? true;
                                            return (
                                            <div key={platform} className={`space-y-3 ${isActive ? '' : 'opacity-50'}`}>
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                                                        {platform === 'grab' ? 'Grab' : platform === 'lineman' ? 'LINE MAN' : platform === 'shopee' ? 'ShopeeFood' : platform === 'foodpanda' ? 'Foodpanda' : 'Robinhood'}
                                                    </label>
                                                    <button
                                                        onClick={() => {
                                                            let active = settings.active_delivery_platforms || ['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood'];
                                                            if (active.includes(platform)) {
                                                                active = active.filter(p => p !== platform);
                                                            } else {
                                                                active = [...active, platform];
                                                            }
                                                            setSettings({...settings, active_delivery_platforms: active});
                                                        }}
                                                        className={`w-10 h-5 rounded-full relative transition-colors ${isActive ? 'bg-black' : 'bg-gray-300'}`}
                                                    >
                                                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${isActive ? 'left-5' : 'left-0.5'}`} />
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        step="0.1"
                                                        disabled={!isActive}
                                                        value={settings.delivery_gp?.[platform] ?? 32.1}
                                                        onChange={e => setSettings({
                                                            ...settings, 
                                                            delivery_gp: { ...settings.delivery_gp, [platform]: parseFloat(e.target.value) || 0 }
                                                        })}
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-[14px] font-bold outline-none focus:ring-2 focus:ring-black pr-10" 
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">%</span>
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: PERMISSIONS */}
                        {activeTab === 'permissions' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                    <h3 className="text-xl font-black mb-2 flex items-center gap-3">
                                        <ShieldCheck className="text-red-500" size={24} /> {locale === 'en' ? ' สิทธิ์การเข้าถึง (Role Permissions)                                     ' : locale === 'zh' ? ' สิทธิ์การเข้าถึง (Role Permissions)                                     ' : ' สิทธิ์การเข้าถึง (Role Permissions)                                     '}</h3>
                                    <p className="text-[12px] text-gray-500 font-bold mb-8">{locale === 'en' ? 'อนุญาตให้พนักงานแต่ละระดับสามารถเข้าถึงหน้าต่างต่างๆ ในแอป POS ได้' : locale === 'zh' ? 'อนุญาตให้พนักงานแต่ละระดับสามารถเข้าถึงหน้าต่างต่างๆ ในแอป POS ได้' : 'อนุญาตให้พนักงานแต่ละระดับสามารถเข้าถึงหน้าต่างต่างๆ ในแอป POS ได้'}</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        {['manager', 'staff'].map((role) => (
                                            <div key={role} className="space-y-4">
                                                <h4 className="text-[13px] font-black uppercase tracking-[0.2em] mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                                                    {role === 'manager' ? <Star size={16} className="text-yellow-500" /> : <Info size={16} className="text-blue-500" />}
                                                    {role === 'manager' ? 'ผู้จัดการ (Manager)' : 'พนักงาน (Staff)'}
                                                </h4>
                                                <div className="space-y-3">
                                                    {permissionOptions.map((opt) => {
                                                        const isChecked = (settings.role_permissions?.[role] || []).includes(opt.id)
                                                        return (
                                                            <div key={opt.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 group cursor-pointer"
                                                                 onClick={() => {
                                                                     const current = settings.role_permissions?.[role] || []
                                                                     const next = isChecked ? current.filter((c: string) => c !== opt.id) : [...current, opt.id]
                                                                     setSettings({
                                                                         ...settings,
                                                                         role_permissions: { ...settings.role_permissions, [role]: next }
                                                                     })
                                                                 }}
                                                            >
                                                                <button 
                                                                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${isChecked ? 'bg-black text-white' : 'bg-gray-100 border border-gray-200'}`}
                                                                >
                                                                    {isChecked && <div className="w-2.5 h-2.5 rounded-sm bg-white" />}
                                                                </button>
                                                                <div>
                                                                    <div className={`text-[12px] font-black uppercase tracking-tight transition-all ${isChecked ? 'text-black' : 'text-gray-500'}`}>{opt.label}</div>
                                                                    <div className="text-[10px] text-gray-400 font-bold leading-tight mt-1 group-hover:text-gray-500">{opt.desc}</div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: HARDWARE & PRINTERS */}
                        {activeTab === 'hardware' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                
                                {/* PRINT PREVIEWS (MOVED TOP) */}
                                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                    <h3 className="text-xl font-black mb-2 flex items-center gap-3">
                                        <ImageIcon className="text-indigo-500" size={24} /> {locale === 'en' ? ' ตัวอย่างบิล (Print Preview)                                     ' : locale === 'zh' ? ' ตัวอย่างบิล (Print Preview)                                     ' : ' ตัวอย่างบิล (Print Preview)                                     '}</h3>
                                    <p className="text-[12px] text-gray-500 font-bold mb-8">{locale === 'en' ? 'คลิกปุ่มทดสอบพิมพ์ เพื่อลองปริ้นใบเสร็จจริงกับเครื่องปริ้นที่ตั้งค่าไว้' : locale === 'zh' ? 'คลิกปุ่มทดสอบพิมพ์ เพื่อลองปริ้นใบเสร็จจริงกับเครื่องปริ้นที่ตั้งค่าไว้' : 'คลิกปุ่มทดสอบพิมพ์ เพื่อลองปริ้นใบเสร็จจริงกับเครื่องปริ้นที่ตั้งค่าไว้'}</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                        {/* Receipt Preview */}
                                        <div className="bg-[#111111] p-6 sm:p-8 flex flex-col items-center overflow-hidden rounded-xl shadow-xl relative group border border-black">
                                            <div className="text-[10px] font-black text-white/50 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                                {locale === 'en' ? '                                                 ใบเสร็จรับเงิน (Receipt)                                             ' : locale === 'zh' ? '                                                 ใบเสร็จรับเงิน (Receipt)                                             ' : '                                                 ใบเสร็จรับเงิน (Receipt)                                             '}</div>
                                            <div id="receipt-preview-capture" className="bg-[#FDFDFB] shadow-2xl p-6 sm:p-8 w-full max-w-[300px] font-mono text-[12px] text-center text-black relative" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
                                                {/* Paper edge */}
                                                <div className="absolute -top-1 inset-x-0 h-2 bg-repeat-x flex" style={{ backgroundImage: 'radial-gradient(circle at 4px 0px, transparent 4px, #FDFDFB 5px)', backgroundSize: '10px 10px' }}></div>
                                                
                                                {settings.receipt_show_logo !== false && (
                                                    <div className="flex justify-center mb-6 mt-2">
                                                        <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white text-[9px] font-sans font-black tracking-widest shadow-inner">LOGO</div>
                                                    </div>
                                                )}
                                                {settings.receipt_header && (
                                                    <div className="mb-6 whitespace-pre-wrap font-bold leading-tight">{settings.receipt_header}</div>
                                                )}
                                                <div className={`font-black uppercase tracking-tight mb-3 ${settings.receipt_font_size === 'large' ? 'text-[20px]' : 'text-[16px]'}`}>{settings.name || 'XYL STUDIO'}</div>
                                                {settings.branch_name && <div className="text-[10px] font-bold mb-1">{locale === 'en' ? 'สาขา: ' : locale === 'zh' ? 'สาขา: ' : 'สาขา: '}{settings.branch_name}</div>}
                                                {settings.tax_id && <div className="text-[10px] font-bold mb-1">TAX ID: {settings.tax_id}</div>}
                                                {settings.phone && <div className="text-[10px] font-bold mb-6">{locale === 'en' ? 'โทร: ' : locale === 'zh' ? 'โทร: ' : 'โทร: '}{settings.phone}</div>}
                                                
                                                <div className="border-t-[1.5px] border-dashed border-black/30 my-4"></div>
                                                
                                                <div className="text-left font-bold space-y-2">
                                                    <div className="flex justify-between text-[10px]"><span>{locale === 'en' ? 'วันที่: ' : locale === 'zh' ? 'วันที่: ' : 'วันที่: '}{new Date().toLocaleDateString('th-TH')}</span><span>{locale === 'en' ? 'คิว: 01' : locale === 'zh' ? 'คิว: 01' : 'คิว: 01'}</span></div>
                                                    <div className="text-[10px]">{locale === 'en' ? 'พนักงาน: Demo Staff' : locale === 'zh' ? 'พนักงาน: Demo Staff' : 'พนักงาน: Demo Staff'}</div>
                                                    <div className="text-[10px]">{locale === 'en' ? 'ประเภท: Dine-In' : locale === 'zh' ? 'ประเภท: Dine-In' : 'ประเภท: Dine-In'}</div>
                                                </div>
                                                
                                                <div className="border-t-[1.5px] border-dashed border-black/30 my-4"></div>
                                                
                                                <div className="space-y-3 text-left font-bold">
                                                    <div className="flex justify-between items-start">
                                                        <div><span className="mr-2">1x</span> {locale === 'en' ? ' กาแฟลาเต้ (เย็น)' : locale === 'zh' ? ' กาแฟลาเต้ (เย็น)' : ' กาแฟลาเต้ (เย็น)'}</div>
                                                        <div>120.00</div>
                                                    </div>
                                                    <div className="pl-6 text-[10px] text-gray-500 font-medium space-y-1">
                                                        <div>{locale === 'en' ? '- หวานน้อย 50%' : locale === 'zh' ? '- หวานน้อย 50%' : '- หวานน้อย 50%'}</div>
                                                        <div>{locale === 'en' ? '- เปลี่ยนนมโอ๊ต (+20)' : locale === 'zh' ? '- เปลี่ยนนมโอ๊ต (+20)' : '- เปลี่ยนนมโอ๊ต (+20)'}</div>
                                                    </div>
                                                </div>
                                                
                                                <div className="border-t-[1.5px] border-dashed border-black/30 my-4"></div>
                                                
                                                <div className="space-y-2 text-[10px] font-bold">
                                                    <div className="flex justify-between"><span>{locale === 'en' ? 'ภาษี (VAT 7%)' : locale === 'zh' ? 'ภาษี (VAT 7%)' : 'ภาษี (VAT 7%)'}</span><span>8.40</span></div>
                                                    <div className="flex justify-between text-[14px] font-black mt-2"><span>{locale === 'en' ? 'ยอดรวม (Total)' : locale === 'zh' ? 'ยอดรวม (Total)' : 'ยอดรวม (Total)'}</span><span>140.00</span></div>
                                                    <div className="flex justify-between text-gray-500 mt-2"><span>{locale === 'en' ? 'รับเงิน (CASH)' : locale === 'zh' ? 'รับเงิน (CASH)' : 'รับเงิน (CASH)'}</span><span>500.00</span></div>
                                                    <div className="flex justify-between text-gray-500"><span>{locale === 'en' ? 'เงินทอน' : locale === 'zh' ? 'เงินทอน' : 'เงินทอน'}</span><span>360.00</span></div>
                                                </div>
                                                
                                                <div className="border-t-[1.5px] border-dashed border-black/30 my-4"></div>
                                                
                                                <div className="border-t-[1.5px] border-dashed border-black/30 my-4"></div>
                                                <div className="mt-6 whitespace-pre-wrap font-bold leading-tight text-[10px] text-center">
                                                    {settings.receipt_footer || 'Thank you\nPowered by XYL STUDIO'}
                                                </div>

                                                {settings.receipt_story_mode && settings.receipt_stories?.length > 0 && (
                                                    <div className="mt-6 pt-3 border-t border-dashed border-black/30">
                                                        <div className="font-black text-[12px] mb-2 text-center">{settings.receipt_stories[previewStoryIndex]?.title}</div>
                                                        <div className="whitespace-pre-wrap text-[10px] leading-relaxed text-left">{settings.receipt_stories[previewStoryIndex]?.content}</div>
                                                    </div>
                                                )}
                                            </div>

                                            {settings.receipt_story_mode && settings.receipt_stories?.length > 0 && (
                                                <div className="mt-6 w-full max-w-[300px]">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">{locale === 'en' ? 'เลือกตอนที่ต้องการดูตัวอย่าง (Preview)' : locale === 'zh' ? 'เลือกตอนที่ต้องการดูตัวอย่าง (Preview)' : 'เลือกตอนที่ต้องการดูตัวอย่าง (Preview)'}</label>
                                                    <select 
                                                        value={previewStoryIndex}
                                                        onChange={e => setPreviewStoryIndex(Number(e.target.value))}
                                                        className="w-full bg-black text-white border border-gray-700 rounded-lg py-2 px-3 text-[11px] font-bold outline-none" 
                                                    >
                                                        {settings.receipt_stories.map((s: any, i: number) => (
                                                            <option key={s.id} value={i}>{s.title}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        {/* Kitchen Preview */}
                                        <div className="bg-[#111111] p-6 sm:p-8 flex flex-col items-center overflow-hidden rounded-xl shadow-xl relative group border border-black">
                                            <div className="text-[10px] font-black text-white/50 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
                                                {locale === 'en' ? '                                                 ใบออเดอร์ (Kitchen)                                             ' : locale === 'zh' ? '                                                 ใบออเดอร์ (Kitchen)                                             ' : '                                                 ใบออเดอร์ (Kitchen)                                             '}</div>
                                            <div id="kitchen-preview-capture" className="bg-[#FDFDFB] shadow-2xl p-6 sm:p-8 w-full max-w-[300px] font-mono text-left text-black relative" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
                                                <div className="absolute -top-1 inset-x-0 h-2 bg-repeat-x flex" style={{ backgroundImage: 'radial-gradient(circle at 4px 0px, transparent 4px, #FDFDFB 5px)', backgroundSize: '10px 10px' }}></div>
                                                
                                                <div className="text-center font-black text-[20px] mb-3 border-b-[3px] border-black pb-3 mt-2">
                                                    {locale === 'en' ? '                                                     ใบสั่งอาหาร                                                 ' : locale === 'zh' ? '                                                     ใบสั่งอาหาร                                                 ' : '                                                     ใบสั่งอาหาร                                                 '}</div>
                                                
                                                {settings.kitchen_show_type !== false && (
                                                    <div className="text-center font-black text-[16px] mb-4 bg-black text-white py-1">
                                                        {locale === 'en' ? '                                                         ทานที่ร้าน (Dine-In)                                                     ' : locale === 'zh' ? '                                                         ทานที่ร้าน (Dine-In)                                                     ' : '                                                         ทานที่ร้าน (Dine-In)                                                     '}</div>
                                                )}

                                                <div className="font-bold space-y-1 mb-4 text-[11px]">
                                                    <div className="flex justify-between"><span>{locale === 'en' ? 'โต๊ะ: T-01' : locale === 'zh' ? 'โต๊ะ: T-01' : 'โต๊ะ: T-01'}</span><span>{locale === 'en' ? 'เวลา: 12:30' : locale === 'zh' ? 'เวลา: 12:30' : 'เวลา: 12:30'}</span></div>
                                                    <div>{locale === 'en' ? 'คิว: 01' : locale === 'zh' ? 'คิว: 01' : 'คิว: 01'}</div>
                                                </div>
                                                
                                                <div className="border-t-[2px] border-dashed border-black/40 my-3"></div>
                                                
                                                <div className={`font-black space-y-3 ${settings.kitchen_font_size === 'huge' ? 'text-[24px]' : settings.kitchen_font_size === 'large' ? 'text-[18px]' : 'text-[14px]'}`}>
                                                    <div className="flex gap-3 items-start">
                                                        <span className="leading-none">1x</span>
                                                        <span className="leading-tight">{locale === 'en' ? 'ผัดไทยกุ้งสด' : locale === 'zh' ? 'ผัดไทยกุ้งสด' : 'ผัดไทยกุ้งสด'}</span>
                                                    </div>
                                                    <div className="pl-9 text-[12px] text-gray-600 font-bold space-y-1">
                                                        <div>{locale === 'en' ? '- ไม่ใส่ถั่วงอก' : locale === 'zh' ? '- ไม่ใส่ถั่วงอก' : '- ไม่ใส่ถั่วงอก'}</div>
                                                        <div>{locale === 'en' ? '- เผ็ดน้อย' : locale === 'zh' ? '- เผ็ดน้อย' : '- เผ็ดน้อย'}</div>
                                                    </div>
                                                </div>
                                                <div className="border-t-[2px] border-dashed border-black/40 my-4"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                                        <div>
                                            <h3 className="text-xl font-black flex items-center gap-3">
                                                <Settings className="text-gray-900" size={24} /> {locale === 'en' ? ' อุปกรณ์ปริ้นเตอร์ (Printers)                                             ' : locale === 'zh' ? ' อุปกรณ์ปริ้นเตอร์ (Printers)                                             ' : ' อุปกรณ์ปริ้นเตอร์ (Printers)                                             '}</h3>
                                            <p className="text-[12px] text-gray-500 font-bold mt-2">{locale === 'en' ? 'จัดการการเชื่อมต่อเครื่องพิมพ์ใบเสร็จผ่านระบบเครือข่าย (TCP/IP)' : locale === 'zh' ? 'จัดการการเชื่อมต่อเครื่องพิมพ์ใบเสร็จผ่านระบบเครือข่าย (TCP/IP)' : 'จัดการการเชื่อมต่อเครื่องพิมพ์ใบเสร็จผ่านระบบเครือข่าย (TCP/IP)'}</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const p = [...(settings.printers || [])];
                                                p.push({ ip: '', type: 'receipt', name: 'Printer ' + (p.length + 1), encoding: 'cp874', categories: ['all'] });
                                                setSettings({...settings, printers: p});
                                            }}
                                            className="bg-black hover:bg-gray-800 text-white px-5 py-3 rounded-xl font-black text-[12px] uppercase tracking-wider flex items-center gap-2 transition-all shadow-md"
                                        >
                                            <Plus size={16} /> Add Printer
                                        </button>
                                    </div>

                                    {(settings.printers || []).map((printer: any, index: number) => (
                                        <div key={index} className="mb-8 p-6 sm:p-8 bg-gray-50 border border-gray-200 rounded-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-black/5 to-transparent rounded-bl-full pointer-events-none"></div>
                                            
                                            <div className="flex flex-col sm:flex-row gap-6 sm:items-center justify-between mb-8 relative z-10">
                                                <div className="flex-1 w-full">
                                                    <input 
                                                        type="text" 
                                                        value={printer.name}
                                                        onChange={e => {
                                                            const p = [...(settings.printers || [])];
                                                            p[index].name = e.target.value;
                                                            setSettings({...settings, printers: p});
                                                        }}
                                                        className="bg-transparent border-none text-xl sm:text-2xl font-black outline-none placeholder:text-gray-300 w-full"
                                                        placeholder="Printer Name"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const p = [...(settings.printers || [])].filter((_, i) => i !== index);
                                                        setSettings({...settings, printers: p});
                                                    }}
                                                    className="w-10 h-10 bg-white border border-gray-200 hover:border-red-500 hover:text-red-500 flex items-center justify-center rounded-xl transition-all shadow-sm flex-shrink-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2"><MapPin size={12}/> IP Address</label>
                                                    <input 
                                                        type="text" 
                                                        value={printer.ip}
                                                        onChange={e => {
                                                            const p = [...(settings.printers || [])];
                                                            p[index].ip = e.target.value;
                                                            setSettings({...settings, printers: p});
                                                        }}
                                                        className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-[13px] font-bold outline-none focus:ring-2 focus:ring-black transition-all" 
                                                        placeholder="192.168.1.100"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2"><Printer size={12}/> Printer Model</label>
                                                    <select 
                                                        value={printer.model || 'xprinter-xp-n160ii'}
                                                        onChange={e => {
                                                            const p = [...(settings.printers || [])];
                                                            p[index].model = e.target.value;
                                                            setSettings({...settings, printers: p});
                                                        }}
                                                        className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-[13px] font-bold outline-none focus:ring-2 focus:ring-black transition-all appearance-none" 
                                                    >
                                                        <option value="xprinter-xp-n160ii">Xprinter XP-N160II</option>
                                                        <option value="xprinter-xp-c300h">Xprinter XP-C300H</option>
                                                        <option value="epson-tm-t82x">Epson TM-T82X</option>
                                                        <option value="generic">Generic ESC/POS</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2"><Settings size={12}/> {locale === 'en' ? ' การเข้ารหัสภาษาไทย' : locale === 'zh' ? ' การเข้ารหัสภาษาไทย' : ' การเข้ารหัสภาษาไทย'}</label>
                                                    <select 
                                                        value={printer.encoding || 'ku42'}
                                                        onChange={e => {
                                                            const p = [...(settings.printers || [])];
                                                            p[index].encoding = e.target.value;
                                                            setSettings({...settings, printers: p});
                                                        }}
                                                        className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-[13px] font-bold outline-none focus:ring-2 focus:ring-black transition-all appearance-none" 
                                                    >
                                                        <option value="graphic">{locale === 'en' ? 'โหมดรูปภาพ (Graphic Mode) - สระไม่ลอย 100%' : locale === 'zh' ? 'โหมดรูปภาพ (Graphic Mode) - สระไม่ลอย 100%' : 'โหมดรูปภาพ (Graphic Mode) - สระไม่ลอย 100%'}</option>
                                                        <option value="ku42">{locale === 'en' ? 'ภาษาไทย Xprinter (KU42 / CP27)' : locale === 'zh' ? 'ภาษาไทย Xprinter (KU42 / CP27)' : 'ภาษาไทย Xprinter (KU42 / CP27)'}</option>
                                                        <option value="tis620">{locale === 'en' ? 'ภาษาไทย มาตรฐาน (TIS-620 / CP26)' : locale === 'zh' ? 'ภาษาไทย มาตรฐาน (TIS-620 / CP26)' : 'ภาษาไทย มาตรฐาน (TIS-620 / CP26)'}</option>
                                                        <option value="cp874">{locale === 'en' ? 'ภาษาไทย Windows (CP874)' : locale === 'zh' ? 'ภาษาไทย Windows (CP874)' : 'ภาษาไทย Windows (CP874)'}</option>
                                                    </select>
                                                </div>

                                                <div className="md:col-span-2 lg:col-span-3 space-y-3 mt-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{locale === 'en' ? 'หน้าที่ของเครื่องพิมพ์นี้ (Role)' : locale === 'zh' ? 'หน้าที่ของเครื่องพิมพ์นี้ (Role)' : 'หน้าที่ของเครื่องพิมพ์นี้ (Role)'}</label>
                                                    <div className="flex flex-wrap gap-3">
                                                        {[
                                                            { id: 'receipt', label: 'ใบเสร็จ' },
                                                            { id: 'kitchen', label: 'ใบสั่งอาหาร' },
                                                            { id: 'both', label: 'ทั้งใบเสร็จและห้องครัว' }
                                                        ].map(role => (
                                                            <button 
                                                                key={role.id}
                                                                onClick={() => {
                                                                    const p = [...(settings.printers || [])];
                                                                    p[index].type = role.id;
                                                                    setSettings({...settings, printers: p});
                                                                }}
                                                                className={`px-5 py-2.5 rounded-full text-[12px] font-black transition-all ${printer.type === role.id ? 'bg-black text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'}`}
                                                            >
                                                                {role.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Kitchen Categories Logic */}
                                                {(printer.type === 'kitchen' || printer.type === 'both') && (
                                                    <div className="md:col-span-2 lg:col-span-3 mt-4 pt-6 border-t border-gray-200 space-y-4">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{locale === 'en' ? 'พิมพ์เฉพาะหมวดหมู่อาหาร (สำหรับครัวแยก)' : locale === 'zh' ? 'พิมพ์เฉพาะหมวดหมู่อาหาร (สำหรับครัวแยก)' : 'พิมพ์เฉพาะหมวดหมู่อาหาร (สำหรับครัวแยก)'}</label>
                                                        <div className="flex flex-wrap gap-3">
                                                            <button 
                                                                onClick={() => {
                                                                    const p = [...(settings.printers || [])];
                                                                    p[index].categories = ['all'];
                                                                    setSettings({...settings, printers: p});
                                                                }}
                                                                className={`px-4 py-2 text-[11px] font-black rounded-lg border transition-all ${printer.categories?.includes('all') ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                            >
                                                                {locale === 'en' ? '                                                                 พิมพ์ทุกหมวดหมู่                                                             ' : locale === 'zh' ? '                                                                 พิมพ์ทุกหมวดหมู่                                                             ' : '                                                                 พิมพ์ทุกหมวดหมู่                                                             '}</button>
                                                            {categories.map((c: any) => {
                                                                const isSelected = !printer.categories?.includes('all') && printer.categories?.includes(c.id);
                                                                return (
                                                                    <button 
                                                                        key={c.id}
                                                                        onClick={() => {
                                                                            const p = [...(settings.printers || [])];
                                                                            let cats = p[index].categories || [];
                                                                            if (cats.includes('all')) cats = [];
                                                                            if (cats.includes(c.id)) {
                                                                                cats = cats.filter((id: string) => id !== c.id);
                                                                            } else {
                                                                                cats.push(c.id);
                                                                            }
                                                                            if (cats.length === 0) cats = ['all'];
                                                                            p[index].categories = cats;
                                                                            setSettings({...settings, printers: p});
                                                                        }}
                                                                        className={`px-4 py-2 text-[11px] font-black rounded-lg border transition-all ${isSelected ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                                    >
                                                                        {c.name}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Test Buttons */}
                                                <div className="md:col-span-2 lg:col-span-3 mt-4 pt-6 border-t border-gray-200 flex justify-end gap-3">
                                                    <button 
                                                        onClick={() => handleTestPrint(index)}
                                                        className="px-6 py-3 bg-white border border-gray-300 hover:border-black text-black font-black text-[12px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
                                                    >
                                                        <Printer size={14} /> {locale === 'en' ? ' ทดสอบพิมพ์ใบเสร็จ (Test Print)                                                     ' : locale === 'zh' ? ' ทดสอบพิมพ์ใบเสร็จ (Test Print)                                                     ' : ' ทดสอบพิมพ์ใบเสร็จ (Test Print)                                                     '}</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {(!settings.printers || settings.printers.length === 0) && (
                                        <div className="py-12 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                                            <Printer size={48} className="mb-4 opacity-50" />
                                            <p className="font-bold text-sm">{locale === 'en' ? 'ยังไม่มีเครื่องปริ้นเตอร์' : locale === 'zh' ? 'ยังไม่มีเครื่องปริ้นเตอร์' : 'ยังไม่มีเครื่องปริ้นเตอร์'}</p>
                                            <p className="text-[11px] mt-1 font-medium">{locale === 'en' ? 'กดปุ่ม Add Printer ด้านบนเพื่อเพิ่มอุปกรณ์' : locale === 'zh' ? 'กดปุ่ม Add Printer ด้านบนเพื่อเพิ่มอุปกรณ์' : 'กดปุ่ม Add Printer ด้านบนเพื่อเพิ่มอุปกรณ์'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* BOTTOM SAVE BUTTON */}
                <div className="fixed bottom-0 left-0 right-0 p-6 sm:p-8 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-end z-50">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="w-full sm:w-64 h-16 bg-black text-white rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest hover:bg-gray-900 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {isSaving ? 'SAVING...' : 'SAVE SETTINGS'}
                    </button>
                </div>

            </div>
          )}
      </main>
    </>
  )
}
