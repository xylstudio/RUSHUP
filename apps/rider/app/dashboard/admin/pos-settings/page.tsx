'use client';
import React, { useEffect, useState, useCallback } from 'react'
import {
  Save,
  Clock,
  MapPin,
  Truck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Navigation,
  Plus,
  Trash2,
  ChevronRight,
  Store,
  ShieldCheck
} from 'lucide-react'
import { supabase, getBranches, getPosSettings, updatePosSettings, type Branch, type PosShopSettings } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from "@/lib/I18nContext";

const DAYS = [
  { id: 'monday', label: 'วันจันทร์' },
  { id: 'tuesday', label: 'วันอังคาร' },
  { id: 'wednesday', label: 'วันพุธ' },
  { id: 'thursday', label: 'วันพฤหัสบดี' },
  { id: 'friday', label: 'วันศุกร์' },
  { id: 'saturday', label: 'วันเสาร์' },
  { id: 'sunday', label: 'วันอาทิตย์' }
]

export default function PosSettingsPage() {
    const { locale } = useI18n();
  const { profile } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [settings, setSettings] = useState<Partial<PosShopSettings> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string>('')

  // Load Initial Data
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const { data: branchData, error: branchError } = await getBranches()
      if (branchError) {
        setError(branchError.message)
      } else if (branchData && branchData.length > 0) {
        setBranches(branchData)
        setSelectedBranchId(branchData[0].id)
      }
      setLoading(false)
    }
    void init()
  }, [])

  // Load Settings when Branch changes
  useEffect(() => {
    if (!selectedBranchId) return
    
    const fetchSettings = async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await getPosSettings(selectedBranchId)
      
      if (error) {
        // If table or column doesn't exist yet (migration needed)
        if (error.message.includes('column "branch_id" does not exist') || error.message.includes('relation "pos_shop_settings" does not exist')) {
          setError('Migration Required: โปรดรัน schema-all-in-one.sql ใน Supabase Editor ก่อนใช้งานหน้านี้ครับ')
        } else {
          setError(error.message)
        }
      } else if (data) {
        setSettings(data)
      } else {
        // No settings for this branch yet, create a placeholder
        setSettings({
          branch_id: selectedBranchId,
          is_open: true,
          status: 'open',
          check_in_radius: 50,
          delivery_fee_rules: [],
          opening_hours: {
            "monday": {"open": "08:00", "close": "20:00", "closed": false},
            "tuesday": {"open": "08:00", "close": "20:00", "closed": false},
            "wednesday": {"open": "08:00", "close": "20:00", "closed": false},
            "thursday": {"open": "08:00", "close": "20:00", "closed": false},
            "friday": {"open": "08:00", "close": "20:00", "closed": false},
            "saturday": {"open": "08:00", "close": "20:00", "closed": false},
            "sunday": {"open": "08:00", "close": "20:00", "closed": false}
          },
          delivery_gp: { "grab": 32.1, "lineman": 32.1, "shopee": 32.1, "foodpanda": 32.1, "robinhood": 0 }
        })
      }
      setLoading(false)
    }
    void fetchSettings()
  }, [selectedBranchId])

  const handleSave = async () => {
    if (!settings || !selectedBranchId) return
    setSaving(true)
    setError(null)
    setSuccessMsg('')

    try {
      let result;
      if (settings.id) {
        result = await updatePosSettings(settings.id, settings)
      } else {
        // Create new settings entry
        const { data, error } = await supabase
          .from('pos_shop_settings')
          .insert({ ...settings, branch_id: selectedBranchId })
          .select()
          .single()
        result = { data, error }
      }

      if (result.error) throw result.error
      
      setSettings(result.data)
      setSuccessMsg('บันทึกการตั้งค่าเรียบร้อยแล้ว')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  const updateOpeningHour = (day: string, field: string, value: any) => {
    if (!settings) return
    const newHours = { ...settings.opening_hours }
    newHours[day] = { ...newHours[day], [field]: value }
    setSettings({ ...settings, opening_hours: newHours })
  }

  const addDeliveryRule = () => {
    if (!settings) return
    const rules = [...(settings.delivery_fee_rules || [])]
    rules.push({ max_dist: 5, fee: 40 })
    setSettings({ ...settings, delivery_fee_rules: rules })
  }

  const removeDeliveryRule = (index: number) => {
    if (!settings) return
    const rules = [...(settings.delivery_fee_rules || [])]
    rules.splice(index, 1)
    setSettings({ ...settings, delivery_fee_rules: rules })
  }

  const updateDeliveryRule = (index: number, field: string, value: number) => {
    if (!settings) return
    const rules = [...(settings.delivery_fee_rules || [])]
    rules[index] = { ...rules[index], [field]: value }
    setSettings({ ...settings, delivery_fee_rules: rules })
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] pb-32">
      {/* Header */}
      <div className="px-6 py-8 md:py-12 border-b border-[#E5E5E5] bg-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight uppercase">POS & Operational Settings</h1>
            <p className="text-xs text-[#666666] mt-2 font-mono flex items-center gap-2">
              <Store className="w-4 h-4" /> {locale === 'en' ? ' ตั้งค่าสาขาและระเบียบการปฏิบัติงาน             ' : locale === 'zh' ? ' ตั้งค่าสาขาและระเบียบการปฏิบัติงาน             ' : ' ตั้งค่าสาขาและระเบียบการปฏิบัติงาน             '}</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-4 py-3 border border-[#E5E5E5] bg-white text-xs font-bold uppercase tracking-wider outline-none focus:border-[#111111] transition-colors"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.branch_name}</option>
              ))}
            </select>

            <button
              onClick={handleSave}
              disabled={saving || loading || !!error?.includes('Migration')}
              className="flex items-center gap-2 bg-[#111111] text-white px-6 py-3 hover:bg-[#333333] disabled:opacity-50 transition-colors uppercase tracking-wider text-xs font-bold shrink-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Config'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 border border-red-200 bg-red-50 text-red-700 text-sm flex items-start gap-3 rounded-md"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Execution Error</p>
                <p>{error}</p>
              </div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 border border-green-200 bg-green-50 text-green-700 text-sm flex items-center gap-3 rounded-md"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="font-bold">{successMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[#A3A3A3]" />
          </div>
        ) : settings && (
          <div className="space-y-12 animate-fade-in-up">
            {/* Section: Shop Status */}
            <section className="bg-white border border-[#E5E5E5] p-8 md:p-10">
              <h2 className="text-xl font-medium mb-8 flex items-center gap-3">
                <Store className="w-6 h-6 text-[#111111]" />
                {locale === 'en' ? '                 สถานะร้านและการให้บริการ (Shop Status)               ' : locale === 'zh' ? '                 สถานะร้านและการให้บริการ (Shop Status)               ' : '                 สถานะร้านและการให้บริการ (Shop Status)               '}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border border-[#E5E5E5] bg-[#FAFAFA]">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#666666]">Emergency Toggle</p>
                      <p className="text-sm font-medium">{locale === 'en' ? 'เปิด/ปิดรับออเดอร์ทันที' : locale === 'zh' ? 'เปิด/ปิดรับออเดอร์ทันที' : 'เปิด/ปิดรับออเดอร์ทันที'}</p>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, is_open: !settings.is_open })}
                      className={`w-14 h-7 rounded-full p-1 transition-colors relative ${settings.is_open ? 'bg-[#111111]' : 'bg-[#E5E5E5]'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.is_open ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'ข้อความประกาศ (Status Message)' : locale === 'zh' ? 'ข้อความประกาศ (Status Message)' : 'ข้อความประกาศ (Status Message)'}</label>
                    <textarea
                      value={settings.status_message || ''}
                      onChange={(e) => setSettings({ ...settings, status_message: e.target.value })}
                      className="w-full p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-sm transition-colors min-h-[100px]"
                      placeholder={locale === 'en' ? 'เช่น ร้านปิดรับออเดอร์ชั่วคราว ขออภัยในความไม่สะดวกครับ...' : locale === 'zh' ? 'เช่น ร้านปิดรับออเดอร์ชั่วคราว ขออภัยในความไม่สะดวกครับ...' : 'เช่น ร้านปิดรับออเดอร์ชั่วคราว ขออภัยในความไม่สะดวกครับ...'}
                    />
                  </div>
                </div>

                <div className="bg-[#F5F5F5] p-6 border-l-4 border-[#111111]">
                   <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Current Branch Info</h3>
                   {branches.find(b => b.id === selectedBranchId) && (
                     <div className="space-y-2 text-sm">
                       <p className="text-[#666666]">{locale === 'en' ? 'สาขา: ' : locale === 'zh' ? 'สาขา: ' : 'สาขา: '}<span className="text-[#111111] font-bold">{branches.find(b => b.id === selectedBranchId)?.branch_name}</span></p>
                       <p className="text-[#666666]">{locale === 'en' ? 'พิกัดหลัก: ' : locale === 'zh' ? 'พิกัดหลัก: ' : 'พิกัดหลัก: '}<span className="text-[#111111] font-mono">{branches.find(b => b.id === selectedBranchId)?.latitude?.toFixed(6)}, {branches.find(b => b.id === selectedBranchId)?.longitude?.toFixed(6)}</span></p>
                       <p className="text-[#A3A3A3] text-xs mt-4">{locale === 'en' ? '* พิกัดหลักถูกตั้งค่าที่หน้าจัดการสาขา' : locale === 'zh' ? '* พิกัดหลักถูกตั้งค่าที่หน้าจัดการสาขา' : '* พิกัดหลักถูกตั้งค่าที่หน้าจัดการสาขา'}</p>
                     </div>
                   )}
                </div>
              </div>
            </section>

            {/* Section: Opening Hours */}
            <section className="bg-white border border-[#E5E5E5] p-8 md:p-10">
              <h2 className="text-xl font-medium mb-8 flex items-center gap-3">
                <Clock className="w-6 h-6 text-[#111111]" />
                {locale === 'en' ? '                 เวลาเปิด-ปิดร้าน (Opening Hours)               ' : locale === 'zh' ? '                 เวลาเปิด-ปิดร้าน (Opening Hours)               ' : '                 เวลาเปิด-ปิดร้าน (Opening Hours)               '}</h2>
              
              <div className="space-y-4">
                {DAYS.map((day) => {
                    const { locale } = useI18n();
                  const dayData = settings.opening_hours?.[day.id] || { open: '08:00', close: '20:00', closed: false }
                  return (
                    <div key={day.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-[#F0F0F0] hover:border-[#E5E5E5] transition-colors gap-4">
                      <div className="flex items-center gap-4 min-w-[150px]">
                        <div className={`w-3 h-3 rounded-full ${dayData.closed ? 'bg-red-500' : 'bg-green-500'}`} />
                        <span className="text-sm font-bold">{day.label}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            disabled={dayData.closed}
                            value={dayData.open}
                            onChange={(e) => updateOpeningHour(day.id, 'open', e.target.value)}
                            className="p-2 border border-[#E5E5E5] text-xs font-mono outline-none focus:border-[#111111] disabled:opacity-30"
                          />
                          <span className="text-[#A3A3A3]">-</span>
                          <input
                            type="time"
                            disabled={dayData.closed}
                            value={dayData.close}
                            onChange={(e) => updateOpeningHour(day.id, 'close', e.target.value)}
                            className="p-2 border border-[#E5E5E5] text-xs font-mono outline-none focus:border-[#111111] disabled:opacity-30"
                          />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={dayData.closed}
                            onChange={(e) => updateOpeningHour(day.id, 'closed', e.target.checked)}
                            className="w-4 h-4 border-[#E5E5E5] rounded focus:ring-0 text-[#111111]"
                          />
                          <span className="text-xs font-medium uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'ปิดร้าน' : locale === 'zh' ? 'ปิดร้าน' : 'ปิดร้าน'}</span>
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Section: Attendance Rules */}
            <section className="bg-white border border-[#E5E5E5] p-8 md:p-10">
              <h2 className="text-xl font-medium mb-8 flex items-center gap-3">
                <Navigation className="w-6 h-6 text-[#111111]" />
                {locale === 'en' ? '                 พิกัดเช็คอินพนักงาน (Staff Geo-fencing)               ' : locale === 'zh' ? '                 พิกัดเช็คอินพนักงาน (Staff Geo-fencing)               ' : '                 พิกัดเช็คอินพนักงาน (Staff Geo-fencing)               '}</h2>
              
              <div className="max-w-md space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-md flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                      {locale === 'en' ? '                       พนักงานจะลงเวลาเข้างานและออกงานได้ก็ต่อเมื่อพิกัด GPS อยู่ในรัศมีที่กำหนดรอบสาขานี้เท่านั้น หากอยู่นอกระยะ ระบบจะบล็อกและแจ้งข้อความทันที                     ' : locale === 'zh' ? '                       พนักงานจะลงเวลาเข้างานและออกงานได้ก็ต่อเมื่อพิกัด GPS อยู่ในรัศมีที่กำหนดรอบสาขานี้เท่านั้น หากอยู่นอกระยะ ระบบจะบล็อกและแจ้งข้อความทันที                     ' : '                       พนักงานจะลงเวลาเข้างานและออกงานได้ก็ต่อเมื่อพิกัด GPS อยู่ในรัศมีที่กำหนดรอบสาขานี้เท่านั้น หากอยู่นอกระยะ ระบบจะบล็อกและแจ้งข้อความทันที                     '}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{locale === 'en' ? 'รัศมีเช็คอิน (Check-in Radius in meters)' : locale === 'zh' ? 'รัศมีเช็คอิน (Check-in Radius in meters)' : 'รัศมีเช็คอิน (Check-in Radius in meters)'}</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        value={settings.check_in_radius}
                        onChange={(e) => setSettings({ ...settings, check_in_radius: Number(e.target.value) })}
                        className="w-32 p-4 border border-[#E5E5E5] bg-white focus:border-[#111111] outline-none text-xl font-light font-mono"
                        min={10}
                        max={1000}
                      />
                      <span className="text-sm font-medium text-[#666666]">{locale === 'en' ? 'เมตร (Meters)' : locale === 'zh' ? 'เมตร (Meters)' : 'เมตร (Meters)'}</span>
                    </div>
                    <p className="text-[10px] text-[#A3A3A3] mt-2 italic font-light">{locale === 'en' ? '* ค่าแนะนำ: 50 - 100 เมตร เพื่อความเสถียรของสัญญาณ GPS' : locale === 'zh' ? '* ค่าแนะนำ: 50 - 100 เมตร เพื่อความเสถียรของสัญญาณ GPS' : '* ค่าแนะนำ: 50 - 100 เมตร เพื่อความเสถียรของสัญญาณ GPS'}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Delivery Rules */}
            <section className="bg-white border border-[#E5E5E5] p-8 md:p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-medium flex items-center gap-3">
                  <Truck className="w-6 h-6 text-[#111111]" />
                  {locale === 'en' ? '                   กฎราคาค่าขนส่ง (Delivery Fee Tiers)                 ' : locale === 'zh' ? '                   กฎราคาค่าขนส่ง (Delivery Fee Tiers)                 ' : '                   กฎราคาค่าขนส่ง (Delivery Fee Tiers)                 '}</h2>
                <button
                  onClick={addDeliveryRule}
                  className="flex items-center gap-2 border border-[#111111] px-4 py-2 hover:bg-[#F0F0F0] text-xs font-bold uppercase tracking-wider transition-all"
                >
                  <Plus className="w-4 h-4" /> {locale === 'en' ? ' เพิ่มขั้นบันได                 ' : locale === 'zh' ? ' เพิ่มขั้นบันได                 ' : ' เพิ่มขั้นบันได                 '}</button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#111111]">
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'ระยะทางสูงสุด (กม.)' : locale === 'zh' ? 'ระยะทางสูงสุด (กม.)' : 'ระยะทางสูงสุด (กม.)'}</th>
                      <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'ค่าจัดส่ง (บาท)' : locale === 'zh' ? 'ค่าจัดส่ง (บาท)' : 'ค่าจัดส่ง (บาท)'}</th>
                      <th className="py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    {(settings.delivery_fee_rules || []).map((rule, idx) => (
                      <tr key={idx} className="group hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#A3A3A3]">{locale === 'en' ? 'ไม่เกิน' : locale === 'zh' ? 'ไม่เกิน' : 'ไม่เกิน'}</span>
                            <input
                              type="number"
                              value={rule.max_dist}
                              onChange={(e) => updateDeliveryRule(idx, 'max_dist', Number(e.target.value))}
                              className="w-24 p-2 border border-[#E5E5E5] bg-white font-mono text-center outline-none focus:border-[#111111]"
                            />
                            <span className="text-xs text-[#111111]">{locale === 'en' ? 'กม.' : locale === 'zh' ? 'กม.' : 'กม.'}</span>
                          </div>
                        </td>
                        <td className="py-4 font-mono font-bold text-lg">
                           <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={rule.fee}
                              onChange={(e) => updateDeliveryRule(idx, 'fee', Number(e.target.value))}
                              className="w-24 p-2 border border-[#E5E5E5] bg-white font-mono text-center outline-none focus:border-[#111111]"
                            />
                            <span className="text-xs text-[#111111]">{locale === 'en' ? 'baht' : locale === 'zh' ? '铢' : 'บาท'}</span>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => removeDeliveryRule(idx)}
                            className="p-2 text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!settings.delivery_fee_rules || settings.delivery_fee_rules.length === 0) && (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-sm text-[#A3A3A3] font-light italic">
                          {locale === 'en' ? '                           ยังไม่ได้กำหนดราคาค่าขนส่งตามระยะทาง                         ' : locale === 'zh' ? '                           ยังไม่ได้กำหนดราคาค่าขนส่งตามระยะทาง                         ' : '                           ยังไม่ได้กำหนดราคาค่าขนส่งตามระยะทาง                         '}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-8 p-6 bg-[#FAFAFA] border border-dashed border-[#CCCCCC] rounded-md">
                <h4 className="text-xs font-bold uppercase tracking-widest mb-4">Example Calculation</h4>
                <div className="space-y-2 text-xs text-[#666666]">
                  <p>{locale === 'en' ? '• ระยะทาง 1.5 กม. → ใช้ขั้นบันไดที่ครอบคลุม 1.5 กม. อันแรก' : locale === 'zh' ? '• ระยะทาง 1.5 กม. → ใช้ขั้นบันไดที่ครอบคลุม 1.5 กม. อันแรก' : '• ระยะทาง 1.5 กม. → ใช้ขั้นบันไดที่ครอบคลุม 1.5 กม. อันแรก'}</p>
                  <p>{locale === 'en' ? '• ระบบจะคำนวณระยะทางจากหน้า LIFF ของลูกค้าโดยอัตโนมัติ' : locale === 'zh' ? '• ระบบจะคำนวณระยะทางจากหน้า LIFF ของลูกค้าโดยอัตโนมัติ' : '• ระบบจะคำนวณระยะทางจากหน้า LIFF ของลูกค้าโดยอัตโนมัติ'}</p>
                </div>
              </div>
            </section>

            {/* Section: Delivery GP Rules */}
            <section className="bg-white border border-[#E5E5E5] p-8 md:p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-medium flex items-center gap-3">
                  <span className="text-[#111111] font-bold">%</span>
                  {locale === 'en' ? '                   เปอร์เซ็นต์หัก GP ตามแพลตฟอร์ม (Delivery GP %)                 ' : locale === 'zh' ? '                   เปอร์เซ็นต์หัก GP ตามแพลตฟอร์ม (Delivery GP %)                 ' : '                   เปอร์เซ็นต์หัก GP ตามแพลตฟอร์ม (Delivery GP %)                 '}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood'].map((platform) => (
                  <div key={platform} className="p-4 border border-[#F0F0F0] hover:border-[#111111] transition-colors">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-2 block capitalize">
                      {platform} GP (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.delivery_gp?.[platform] ?? 0}
                        onChange={(e) => setSettings({
                          ...settings,
                          delivery_gp: { ...(settings.delivery_gp || {}), [platform]: Number(e.target.value) }
                        })}
                        className="w-full p-3 border border-[#E5E5E5] bg-white font-mono text-xl focus:border-[#111111] outline-none transition-colors"
                        min={0}
                        max={100}
                        step={0.1}
                      />
                      <span className="text-[#111111] font-bold text-lg">%</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-6 bg-[#FAFAFA] border border-dashed border-[#CCCCCC] rounded-md">
                <h4 className="text-xs font-bold uppercase tracking-widest mb-4">GP Calculation Notice</h4>
                <div className="space-y-2 text-xs text-[#666666]">
                  <p>{locale === 'en' ? '• ระบบจะนำเปอร์เซ็นต์ GP นี้ไปคำนวณหักลบออกจากยอดออเดอร์ (Grand Total) เพื่อแสดงเป็นยอดสุทธิในหน้า Reports อัตโนมัติ' : locale === 'zh' ? '• ระบบจะนำเปอร์เซ็นต์ GP นี้ไปคำนวณหักลบออกจากยอดออเดอร์ (Grand Total) เพื่อแสดงเป็นยอดสุทธิในหน้า Reports อัตโนมัติ' : '• ระบบจะนำเปอร์เซ็นต์ GP นี้ไปคำนวณหักลบออกจากยอดออเดอร์ (Grand Total) เพื่อแสดงเป็นยอดสุทธิในหน้า Reports อัตโนมัติ'}</p>
                  <p className="text-red-600 font-bold">{locale === 'en' ? '* สำคัญ: กรุณารัน SQL Migration เพิ่ม Column ให้กับ Database ในเมนู Database Migration ก่อนการใช้งานครั้งแรก' : locale === 'zh' ? '* สำคัญ: กรุณารัน SQL Migration เพิ่ม Column ให้กับ Database ในเมนู Database Migration ก่อนการใช้งานครั้งแรก' : '* สำคัญ: กรุณารัน SQL Migration เพิ่ม Column ให้กับ Database ในเมนู Database Migration ก่อนการใช้งานครั้งแรก'}</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
