const fs = require('fs');

const part1 = `\'use client\'

import React, { useState, useEffect } from \'react\'
import { Capacitor } from \'@capacitor/core\'
import { PrinterSocket } from \'custom-printer-plugin\'
import { printCustomerReceipt, printKitchenTicket } from \'@/lib/printerUtils\'
import { 
  Plus, Loader2, Save, X, Settings, Clock,
  Bell, Info, Image as ImageIcon, Star,
  ChevronDown, ChevronUp, Upload, Trash2, Menu as MenuIcon, ChevronRight, ArrowLeft, ShieldCheck,
  MapPin, Printer
} from \'lucide-react\'
import { supabase } from \'@/lib/supabaseClient\'
import Link from \'next/link\'
import AddressMapInput from \'@/components/AddressMapInput\'

const permissionOptions = [
  { id: \'terminal\', label: \'หน้าขาย (POS TERMINAL)\', desc: \'หน้าขายหลักของระบบ POS สำหรับทำรายการขายหน้าร้าน\' },
  { id: \'kitchen\', label: \'จอสั่งอาหาร (KITCHEN)\', desc: \'จอแสดงออเดอร์สำหรับห้องครัวเพื่อเตรียมและเสิร์ฟอาหาร\' },
  { id: \'tables\', label: \'จัดการโต๊ะ (TABLES)\', desc: \'ระบบจัดการและแสดงสถานะโต๊ะอาหารภายในร้าน\' },
  { id: \'members\', label: \'จัดการสมาชิก (MEMBERS)\', desc: \'จัดการข้อมูลและแต้มสะสมของสมาชิก\' },
  { id: \'drawer\', label: \'ลิ้นชักเงิน (DRAWER)\', desc: \'ควบคุมประวัติการเปิด-ปิดกะลิ้นชักเก็บเงินสด\' },
  { id: \'delivery\', label: \'ศูนย์ส่งสินค้า (DELIVERY)\', desc: \'จัดการออเดอร์เดลิเวอรี่และไรเดอร์\' },
  { id: \'inventory\', label: \'สต็อกวัตถุดิบ (INVENTORY)\', desc: \'ควบคุมสต็อกวัตถุดิบและส่วนประกอบอาหาร\' },
  { id: \'modifiers\', label: \'จัดการตัวเลือก (MODIFIERS)\', desc: \'เพิ่ม/แก้ไขตัวเลือกเสริม (Modifiers) ของเมนูอาหาร\' },
  { id: \'management\', label: \'จัดการระบบ (MANAGEMENT)\', desc: \'การจัดการข้อมูลเชิงลึกและระบบหลังบ้านของสาขา\' },
  { id: \'settings\', label: \'ตั้งค่าร้าน (SHOP SETTINGS)\', desc: \'จัดการวันเวลาเปิดปิดร้าน แบนเนอร์ และสิทธิ์พนักงาน\' },
  { id: \'reports\', label: \'รายงานผล (REPORTS)\', desc: \'รายงานยอดขายและสถิติสำคัญประจำกะ\' },
  { id: \'staff\', label: \'จัดการพนักงาน (STAFF)\', desc: \'ระบบจัดการสิทธิ์และรายชื่อพนักงานประจำร้าน\' },
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
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<string>(\'general\')
  
  const [banners, setBanners] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)

  const [settings, setSettings] = useState<any>({
    id: null,
    branch_id: null,
    status: \'open\',
    status_expiry: null,
    is_open: true,
    status_message: \'ขออภัย ขณะนี้ร้านปิดให้บริการชั่วคราว\',
    opening_hours: { allow_qr_payment: true },
    loyalty_points_per_thb: 10,
    loyalty_earn_rate: 100,
    latitude: 13.7563,
    longitude: 100.5018,
    address: \'\',
    role_permissions: {
      manager: [\'terminal\', \'inventory\', \'kitchen\', \'tables\', \'members\', \'drawer\', \'delivery\', \'modifiers\', \'settings\'],
      staff: [\'terminal\', \'inventory\', \'kitchen\', \'tables\', \'members\', \'drawer\', \'delivery\']
    },
    printers: []
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
                .from(\'branches\')
                .select(\'id\')
                .eq(\'branch_code\', profile.branch_code)
                .maybeSingle()
            if (branch) branchId = branch.id
        }
        
        let data = null
        if (branchId) {
            const { data: bData } = await supabase
                .from(\'pos_shop_settings\')
                .select(\'*\')
                .eq(\'branch_id\', branchId)
                .maybeSingle()
            data = bData
        } else {
            const { data: bData } = await supabase
                .from(\'pos_shop_settings\')
                .select(\'*\')
                .eq(\'id\', \'00000000-0000-0000-0000-000000000001\')
                .maybeSingle()
            data = bData
        }
        
        if (!data) {
            const { data: globalData } = await supabase
                .from(\'pos_shop_settings\')
                .select(\'*\')
                .is(\'branch_id\', null)
                .maybeSingle()
            data = globalData
        }

        if (data) {
            const effectiveStatus = data.status || (data.is_open ? \'open\' : \'closed\');
            setSettings({
                ...data,
                branch_id: data.branch_id || branchId,
                status: effectiveStatus,
                is_open: effectiveStatus === \'open\',
                role_permissions: data.role_permissions || {
                    manager: [\'terminal\', \'inventory\', \'kitchen\', \'tables\', \'members\', \'drawer\', \'delivery\', \'modifiers\', \'settings\'],
                    staff: [\'terminal\', \'inventory\', \'kitchen\', \'tables\', \'members\', \'drawer\', \'delivery\']
                },
                printers: data.printers || []
            })
        } else {
            setSettings((prev: any) => ({ ...prev, branch_id: branchId }))
        }

        const { data: catData } = await supabase.from(\'pos_menu_categories\').select(\'*\').order(\'order_index\')
        if (catData) setCategories(catData)
    } catch (err) {
        console.error(\'Fetch settings error:\', err)
    } finally {
        setLoading(false)
    }
  }

  const fetchBanners = async () => {
    const { data } = await supabase
      .from(\'pos_banners\')
      .select(\'*\')
      .order(\'order_index\', { ascending: true })
      
    if (data) setBanners(data)
  }

  const handleSave = async () => {
    if (!settings.branch_id && settings.id !== \'00000000-0000-0000-0000-000000000001\') {
        alert(\'ไม่พบรหัสสาขาของพนักงาน\')
        return
    }
    
    setIsSaving(true)
    const payload: any = {
      ...settings,
      is_open: settings.status === \'open\',
      updated_at: new Date().toISOString()
    }

    try {
        let result;
        if (settings.id) {
            result = await supabase
                .from(\'pos_shop_settings\')
                .update(payload)
                .eq(\'id\', settings.id)
                .select()
                .single()
        } else {
            result = await supabase
                .from(\'pos_shop_settings\')
                .insert(payload)
                .select()
                .single()
        }

        if (result.error) throw result.error
        
        if (result.data) {
            setSettings(result.data)
            alert(\'บันทึกการตั้งค่าเรียบร้อยแล้ว\')
        }
    } catch (error: any) {
        console.error(\'Save settings error:\', error)
        alert(\'เกิดข้อผิดพลาดในการบันทึก: \' + error.message)
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
            id: 'test-order-001',
            order_number: 'Q-01',
            queue_number: '01',
            created_at: new Date().toISOString(),
            order_type: 'dine_in',
            total_amount: 140,
            table_id: 'T-01',
            items: [
                {
                    product_id: 'p-001',
                    product_name: 'กาแฟลาเต้ (เย็น)',
                    quantity: 1,
                    price: 120,
                    total_price: 140,
                    options: [
                        { name: 'ความหวาน', value: 'หวานน้อย 50%', price: 0 },
                        { name: 'ประเภทนม', value: 'เปลี่ยนนมโอ๊ต', price: 20 }
                    ]
                }
            ],
            staff_name: 'Demo Staff'
        };

        if (printer.type === 'kitchen') {
            await printKitchenTicket(printer, dummyOrder);
        } else if (printer.type === 'receipt') {
            await printCustomerReceipt(printer, dummyOrder, settings);
        } else {
            await printCustomerReceipt(printer, dummyOrder, settings);
            await new Promise(r => setTimeout(r, 1000));
            await printKitchenTicket(printer, dummyOrder);
        }

        alert('ส่งคำสั่งพิมพ์ทดสอบสำเร็จ');
    } catch (error) {
        console.error('Test print error:', error);
        alert('เกิดข้อผิดพลาดในการพิมพ์ทดสอบ: ' + (error as any).message);
    } finally {
        setIsSaving(false);
    }
  };

`;

const newUi = fs.readFileSync('/Users/natthanchaimongkol/Downloads/XYLPROJECT-main/ui_replacement.txt', 'utf8');

fs.writeFileSync('/Users/natthanchaimongkol/Downloads/XYLPROJECT-main/components/pos/POSShopSettings.tsx', part1 + newUi);
console.log('Reconstructed completely!');
