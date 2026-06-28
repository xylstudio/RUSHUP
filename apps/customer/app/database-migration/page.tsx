'use client';
import { useState } from 'react'
import { useI18n } from "@/lib/I18nContext";

export default function DatabaseMigrationPage() {
    const { locale } = useI18n();
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<any>(null)

  const checkDatabase = async () => {
    setChecking(true)
    try {
      const response = await fetch('/api/check-database')
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Failed to check database' })
    }
    setChecking(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🗄️ Database Migration & Check
        </h1>

        <div className="space-y-6">
          {/* Database Check Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              1. Check Database Schema & Permissions
            </h2>
            <p className="text-gray-600 mb-4">
              {locale === 'en' ? 'Check the database schema and Row Level Security (RLS) permissions.' : locale === 'zh' ? '检查数据库架构和行级安全性 (RLS) 权限。' : '               ตรวจสอบ database schema และ Row Level Security (RLS) permissions             '}</p>
            
            <div className="flex gap-3 mb-4">
              <button
                onClick={checkDatabase}
                disabled={checking}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {checking ? 'Checking...' : 'Check Schema'}
              </button>
              
              <button
                onClick={async () => {
                  setChecking(true)
                  try {
                    const response = await fetch('/api/test-database-access')
                    const data = await response.json()
                    setResult(data)
                  } catch (error) {
                    setResult({ error: 'Failed to test database access' })
                  }
                  setChecking(false)
                }}
                disabled={checking}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {checking ? 'Testing...' : 'Test RLS & Permissions'}
              </button>
            </div>

            {result && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* RLS Fix Section */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <h2 className="text-lg font-semibold text-red-800 mb-3">
              2. Fix Row Level Security (RLS) Error
            </h2>
            <p className="text-red-700 text-sm mb-4">
              {locale === 'en' ? '               หากเกิด error: "new row violates row-level security policy" ให้รัน SQL นี้:             ' : locale === 'zh' ? '               หากเกิด error: "new row violates row-level security policy" ให้รัน SQL นี้:             ' : '               หากเกิด error: "new row violates row-level security policy" ให้รัน SQL นี้:             '}</p>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap mb-4">
{`-- แก้ไข RLS สำหรับที่อยู่จัดส่งให้สามารถลบได้
DROP POLICY IF EXISTS "Allow DELETE for own addresses" ON public.saved_addresses;
CREATE POLICY "Allow DELETE for own addresses" ON public.saved_addresses FOR DELETE USING (true);

-- แก้ไข RLS ให้ใช้งานได้ (Workshop)
ALTER TABLE workshop_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_payments DISABLE ROW LEVEL SECURITY;

-- หรือสร้าง Policy ที่อนุญาตให้ใช้งานได้
CREATE POLICY "Allow public access" ON workshop_bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON workshop_payments FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_addresses TO anon;
GRANT SELECT, INSERT, UPDATE ON workshop_bookings TO anon;
GRANT SELECT, INSERT, UPDATE ON workshop_payments TO anon;`}
            </div>

            <div className="bg-yellow-100 border border-yellow-300 rounded p-3 text-sm text-yellow-800">
              <strong>{locale === 'en' ? '⚠️ หมายเหตุ:' : locale === 'zh' ? '⚠️ หมายเหตุ:' : '⚠️ หมายเหตุ:'}</strong> {locale === 'en' ? ' การปิด RLS หรือใช้ policy แบบ open นี้เหมาะสำหรับการทดสอบเท่านั้น                สำหรับ production ควรสร้าง policy ที่มีความปลอดภัยมากกว่า             ' : locale === 'zh' ? ' การปิด RLS หรือใช้ policy แบบ open นี้เหมาะสำหรับการทดสอบเท่านั้น                สำหรับ production ควรสร้าง policy ที่มีความปลอดภัยมากกว่า             ' : ' การปิด RLS หรือใช้ policy แบบ open นี้เหมาะสำหรับการทดสอบเท่านั้น                สำหรับ production ควรสร้าง policy ที่มีความปลอดภัยมากกว่า             '}</div>
          </div>

          {/* Migration Instructions */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {locale === 'en' ? '               3. Run Migration (หากจำเป็น)             ' : locale === 'zh' ? '               3. Run Migration (หากจำเป็น)             ' : '               3. Run Migration (หากจำเป็น)             '}</h2>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-medium text-red-800 mb-2">
                  {locale === 'en' ? '                   🚨 Error: attendees_count column หาย                 ' : locale === 'zh' ? '                   🚨 Error: attendees_count column หาย                 ' : '                   🚨 Error: attendees_count column หาย                 '}</h3>
                <p className="text-red-700 text-sm mb-3">
                  <strong>{locale === 'en' ? 'แก้ไขเร่งด่วน:' : locale === 'zh' ? 'แก้ไขเร่งด่วน:' : 'แก้ไขเร่งด่วน:'}</strong> {locale === 'en' ? ' รัน SQL command นี้ใน Supabase SQL Editor                 ' : locale === 'zh' ? ' รัน SQL command นี้ใน Supabase SQL Editor                 ' : ' รัน SQL command นี้ใน Supabase SQL Editor                 '}</p>
                <div className="bg-gray-900 text-green-400 p-3 rounded text-sm font-mono overflow-x-auto">
                  ALTER TABLE workshop_bookings ADD COLUMN attendees_count INTEGER DEFAULT 1;
                </div>
                <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-800">
                  ✅ <strong>{locale === 'en' ? 'หลังรันคำสั่งนี้:' : locale === 'zh' ? 'หลังรันคำสั่งนี้:' : 'หลังรันคำสั่งนี้:'}</strong> {locale === 'en' ? ' กลับไปทดสอบการจองได้ทันที! ระบบจะทำงานปกติ                 ' : locale === 'zh' ? ' กลับไปทดสอบการจองได้ทันที! ระบบจะทำงานปกติ                 ' : ' กลับไปทดสอบการจองได้ทันที! ระบบจะทำงานปกติ                 '}</div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">
                  {locale === 'en' ? '                   📋 เวอร์ชันแก้ไขรวดเร็ว (แนะนำ)                 ' : locale === 'zh' ? '                   📋 เวอร์ชันแก้ไขรวดเร็ว (แนะนำ)                 ' : '                   📋 เวอร์ชันแก้ไขรวดเร็ว (แนะนำ)                 '}</h3>
                <p className="text-blue-700 text-sm mb-3">
                  {locale === 'en' ? '                   รัน script นี้แทน (ไม่มี syntax error):                 ' : locale === 'zh' ? '                   รัน script นี้แทน (ไม่มี syntax error):                 ' : '                   รัน script นี้แทน (ไม่มี syntax error):                 '}</p>
                <div className="bg-gray-900 text-green-400 p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`-- Quick Fix Script
ALTER TABLE workshop_bookings ADD COLUMN IF NOT EXISTS attendees_count INTEGER DEFAULT 1;
ALTER TABLE workshop_bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE workshop_bookings ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE workshop_bookings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE workshop_bookings ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create payments table
CREATE TABLE IF NOT EXISTS workshop_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES workshop_bookings(id),
    provider TEXT NOT NULL DEFAULT 'unknown',
    provider_charge_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'THB',
    status TEXT DEFAULT 'pending',
    payer_email TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}
                </div>
              </div>
            </div>
          </div>

          {/* Supabase Instructions */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {locale === 'en' ? '               4. วิธีรัน Migration ใน Supabase             ' : locale === 'zh' ? '               4. วิธีรัน Migration ใน Supabase             ' : '               4. วิธีรัน Migration ใน Supabase             '}</h2>
            
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="font-medium text-blue-600">1.</span>
                <span>{locale === 'en' ? 'เปิด ' : locale === 'zh' ? 'เปิด ' : 'เปิด '}<a href="https://supabase.com/dashboard" target="_blank" className="text-blue-600 underline">Supabase Dashboard</a></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-blue-600">2.</span>
                <span>{locale === 'en' ? 'เลือก Project ของคุณ' : locale === 'zh' ? 'เลือก Project ของคุณ' : 'เลือก Project ของคุณ'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-blue-600">3.</span>
                <span>{locale === 'en' ? 'ไปที่ ' : locale === 'zh' ? 'ไปที่ ' : 'ไปที่ '}<strong>SQL Editor</strong> {locale === 'en' ? ' ในเมนูซ้าย' : locale === 'zh' ? ' ในเมนูซ้าย' : ' ในเมนูซ้าย'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-blue-600">4.</span>
                <span>{locale === 'en' ? 'Copy SQL จาก ' : locale === 'zh' ? 'Copy SQL จาก ' : 'Copy SQL จาก '}<code>complete-database-migration.sql</code></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-blue-600">5.</span>
                <span>{locale === 'en' ? 'Paste และกด ' : locale === 'zh' ? 'Paste และกด ' : 'Paste และกด '}<strong>Run</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-blue-600">6.</span>
                <span>{locale === 'en' ? 'ตรวจสอบผลลัพธ์และกลับมาทดสอบ' : locale === 'zh' ? 'ตรวจสอบผลลัพธ์และกลับมาทดสอบ' : 'ตรวจสอบผลลัพธ์และกลับมาทดสอบ'}</span>
              </div>
            </div>
          </div>

          {/* Quick Fix */}
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <h2 className="text-lg font-semibold text-green-800 mb-3">
              {locale === 'en' ? '               ⚡ แก้ไขเร่งด่วน (รัน 2 คำสั่งนี้)             ' : locale === 'zh' ? '               ⚡ แก้ไขเร่งด่วน (รัน 2 คำสั่งนี้)             ' : '               ⚡ แก้ไขเร่งด่วน (รัน 2 คำสั่งนี้)             '}</h2>
            <p className="text-green-700 text-sm mb-3">
              {locale === 'en' ? '               รัน SQL 2 คำสั่งนี้แล้วทดสอบทันที:             ' : locale === 'zh' ? '               รัน SQL 2 คำสั่งนี้แล้วทดสอบทันที:             ' : '               รัน SQL 2 คำสั่งนี้แล้วทดสอบทันที:             '}</p>
            <div className="bg-gray-900 text-green-400 p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`-- 1. เพิ่ม column ที่ขาดหาย
ALTER TABLE workshop_bookings ADD COLUMN attendees_count INTEGER DEFAULT 1;

-- 2. ปิด RLS เพื่อให้ insert ได้
ALTER TABLE workshop_bookings DISABLE ROW LEVEL SECURITY;`}
            </div>
            <p className="text-green-600 text-xs mt-2">
              {locale === 'en' ? '               ✅ หลังรันคำสั่งนี้แล้ว กลับไปทดสอบการจองได้เลย             ' : locale === 'zh' ? '               ✅ หลังรันคำสั่งนี้แล้ว กลับไปทดสอบการจองได้เลย             ' : '               ✅ หลังรันคำสั่งนี้แล้ว กลับไปทดสอบการจองได้เลย             '}
            </p>
          </div>

          {/* Feature: Enable Realtime for POS Orders */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 mt-4">
            <h2 className="text-lg font-semibold text-blue-800 mb-3">
              ⚡ เปิดใช้งาน Real-time สำหรับออเดอร์ Delivery/LIFF
            </h2>
            <p className="text-blue-700 text-sm mb-3">
              รันคำสั่งนี้ใน SQL Editor เพื่อให้เวลามีลูกค้ากดสั่ง ออเดอร์จะเด้งขึ้นระบบ POS ทันทีโดยไม่ต้องกดรีเฟรช:
            </p>
            <div className="bg-gray-900 text-blue-400 p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`-- Enable Realtime for pos_orders and pos_order_payments
ALTER PUBLICATION supabase_realtime ADD TABLE pos_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE pos_order_payments;
`}
            </div>
            <p className="text-blue-600 text-xs mt-2">
              ✅ เมื่อรันเสร็จ ระบบจะแสดงรายการออเดอร์ใหม่แบบเรียลไทม์ทันที
            </p>
          </div>

          {/* Feature: House Invites */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <h2 className="text-lg font-semibold text-blue-800 mb-3">
              {locale === 'en' ? '               🔗 ระบบคำเชิญบ้านแบบใช้ครั้งเดียว (Single-use Invites)             ' : locale === 'zh' ? '               🔗 ระบบคำเชิญบ้านแบบใช้ครั้งเดียว (Single-use Invites)             ' : '               🔗 ระบบคำเชิญบ้านแบบใช้ครั้งเดียว (Single-use Invites)             '}</h2>
            <p className="text-blue-700 text-sm mb-3">
              {locale === 'en' ? '               รันคำสั่งนี้เพื่อสร้างตารางเก็บประวัติคำเชิญบ้าน:             ' : locale === 'zh' ? '               รันคำสั่งนี้เพื่อสร้างตารางเก็บประวัติคำเชิญบ้าน:             ' : '               รันคำสั่งนี้เพื่อสร้างตารางเก็บประวัติคำเชิญบ้าน:             '}</p>
            <div className="bg-gray-900 text-blue-400 p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`-- Create house_invites table
CREATE TABLE IF NOT EXISTS house_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    used_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policies
ALTER TABLE house_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select for validation"
ON house_invites FOR SELECT
USING (true);

CREATE POLICY "Allow house owners to create invites"
ON house_invites FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM houses
        WHERE id = house_invites.house_id
        AND (user_id = auth.uid() OR customer_id = auth.uid())
    )
);

CREATE POLICY "Allow service role to update used_by"
ON house_invites FOR UPDATE
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS house_invites_house_id_idx ON house_invites(house_id);
CREATE INDEX IF NOT EXISTS house_invites_used_by_idx ON house_invites(used_by);`}
            </div>
            <p className="text-blue-600 text-xs mt-2">
              {locale === 'en' ? '               ✅ เมื่อรันเสร็จ ระบบคำเชิญจะทำงานได้ 1 ลิงก์ต่อ 1 คน             ' : locale === 'zh' ? '               ✅ เมื่อรันเสร็จ ระบบคำเชิญจะทำงานได้ 1 ลิงก์ต่อ 1 คน             ' : '               ✅ เมื่อรันเสร็จ ระบบคำเชิญจะทำงานได้ 1 ลิงก์ต่อ 1 คน             '}</p>
          </div>

          {/* Feature: Spatial Table Layout */}
          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
            <h2 className="text-lg font-semibold text-purple-800 mb-3">
              {locale === 'en' ? '               🗺️ ระบบจัดการตำแหน่งโต๊ะแบบลากวาง (Spatial Table Layout)             ' : locale === 'zh' ? '               🗺️ ระบบจัดการตำแหน่งโต๊ะแบบลากวาง (Spatial Table Layout)             ' : '               🗺️ ระบบจัดการตำแหน่งโต๊ะแบบลากวาง (Spatial Table Layout)             '}</h2>
            <p className="text-purple-700 text-sm mb-3">
              {locale === 'en' ? '               รันคำสั่งนี้เพื่อเพิ่ม column สำหรับเก็บพิกัด x, y และรูปร่างของโต๊ะ:             ' : locale === 'zh' ? '               รันคำสั่งนี้เพื่อเพิ่ม column สำหรับเก็บพิกัด x, y และรูปร่างของโต๊ะ:             ' : '               รันคำสั่งนี้เพื่อเพิ่ม column สำหรับเก็บพิกัด x, y และรูปร่างของโต๊ะ:             '}</p>
            <div className="bg-gray-900 text-purple-400 p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`-- Add spatial coordinates to pos_tables
ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS position_x INTEGER;
ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS position_y INTEGER;
ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS shape TEXT DEFAULT 'square';`}
            </div>
            <p className="text-purple-600 text-xs mt-2">
              {locale === 'en' ? '               ✅ เมื่อรันเสร็จ คุณจะสามารถลากและบันทึกตำแหน่ง รวมถึงกดเปลี่ยนรูปร่างโต๊ะได้             ' : locale === 'zh' ? '               ✅ เมื่อรันเสร็จ คุณจะสามารถลากและบันทึกตำแหน่ง รวมถึงกดเปลี่ยนรูปร่างโต๊ะได้             ' : '               ✅ เมื่อรันเสร็จ คุณจะสามารถลากและบันทึกตำแหน่ง รวมถึงกดเปลี่ยนรูปร่างโต๊ะได้             '}</p>
          </div>

          {/* Feature: Delivery Platform Tracking + GP */}
          <div className="border border-orange-200 rounded-lg p-4 bg-orange-50 mt-4">
            <h2 className="text-lg font-semibold text-orange-800 mb-3">
              🚚 ระบบแจกแจงแพลตฟอร์ม Delivery (GP)
            </h2>
            <p className="text-orange-700 text-sm mb-3">
              รันคำสั่งนี้เพื่อเพิ่ม column สำหรับเก็บข้อมูลแอปและค่า GP ในบิลและตั้งค่า:
            </p>
            <div className="bg-gray-900 text-orange-400 p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`-- Add delivery platform GP tracking to pos_orders
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS delivery_platform TEXT;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS delivery_gp_amount NUMERIC DEFAULT 0;

-- Add GP rate settings to pos_shop_settings
ALTER TABLE pos_shop_settings ADD COLUMN IF NOT EXISTS delivery_gp JSONB DEFAULT '{"grab": 32.1, "lineman": 32.1, "shopee": 32.1, "foodpanda": 32.1, "robinhood": 0}'::jsonb;`}
            </div>
            <p className="text-orange-600 text-xs mt-2">
              ✅ เมื่อรันเสร็จ ระบบ POS จะสามารถแยกยอดขายแต่ละแอปและคำนวณ GP ได้ และตั้งค่า % GP ได้ที่หน้า POS Settings
            </p>
          </div>

          {/* Feature: POS Void Reason */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50 mt-4">
            <h2 className="text-lg font-semibold text-red-800 mb-3">
              🗑️ ระบบยกเลิกบิล (Void Reason)
            </h2>
            <p className="text-red-700 text-sm mb-3">
              รันคำสั่งนี้เพื่อเพิ่ม column สำหรับเก็บข้อมูลเหตุผลในการยกเลิกบิล:
            </p>
            <div className="bg-gray-900 text-red-400 p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`-- Add void_reason to pos_orders
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS void_reason TEXT;`}
            </div>
            <p className="text-red-600 text-xs mt-2">
              ✅ เมื่อรันเสร็จ ระบบ POS จะสามารถเก็บเหตุผลการยกเลิกบิลและแสดงผลในรายงานได้
            </p>
          </div>

          {/* Feature: Out of Stock Toggle */}
          <div className="border border-teal-200 rounded-lg p-4 bg-teal-50 mt-4">
            <h2 className="text-lg font-semibold text-teal-800 mb-3">
              📦 ระบบของหมด (Out of Stock)
            </h2>
            <p className="text-teal-700 text-sm mb-3">
              รันคำสั่งนี้เพื่อเพิ่ม column สำหรับจัดการสถานะ "ของหมด" โดยไม่ทำให้เมนูหายไปจากจอ:
            </p>
            <div className="bg-gray-900 text-teal-400 p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`-- Add in_stock column to pos_menu_items
ALTER TABLE pos_menu_items ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT true;`}
            </div>
            <p className="text-teal-600 text-xs mt-2">
              ✅ เมื่อรันเสร็จ ระบบ POS จะมีปุ่มให้กดเปลี่ยนสถานะเมนูว่ามีของหรือหมดได้ทันที
            </p>
          </div>

          {/* Feature: POS Other Expenses Prorated */}
          <div className="border border-pink-200 rounded-lg p-4 bg-pink-50 mt-4">
            <h2 className="text-lg font-semibold text-pink-800 mb-3">
              💸 ระบบค่าใช้จ่ายรายวันและรายเดือน (Expenses)
            </h2>
            <p className="text-pink-700 text-sm mb-3">
              รันคำสั่งนี้เพื่อสร้างตารางค่าใช้จ่ายที่รองรับการหักรายวัน/รายเดือน:
            </p>
            <div className="bg-gray-900 text-pink-400 p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`-- Create pos_other_expenses table
CREATE TABLE IF NOT EXISTS pos_other_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    branch_code TEXT,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    expense_type TEXT DEFAULT 'one_time',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if table already exists
ALTER TABLE pos_other_expenses ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;
ALTER TABLE pos_other_expenses ADD COLUMN IF NOT EXISTS branch_code TEXT;
ALTER TABLE pos_other_expenses ADD COLUMN IF NOT EXISTS expense_type TEXT DEFAULT 'one_time';
ALTER TABLE pos_other_expenses ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- Disable RLS to allow POS access
ALTER TABLE pos_other_expenses DISABLE ROW LEVEL SECURITY;

-- Reload schema
NOTIFY pgrst, 'reload schema';
`}
            </div>
            <p className="text-pink-600 text-xs mt-2">
              ✅ เมื่อรันเสร็จ ระบบ POS จะสามารถบันทึกและคำนวณค่าเช่าเฉลี่ยรายวันได้
            </p>
          </div>

          {/* Feature: Inventory Shopping List */}
          <div className="border border-amber-200 rounded-lg p-4 bg-amber-50 mt-4">
            <h2 className="text-lg font-semibold text-amber-800 mb-3">
              🛒 ระบบแหล่งจัดซื้อวัตถุดิบ (Shopping List)
            </h2>
            <p className="text-amber-700 text-sm mb-3">
              รันคำสั่งนี้เพื่อเพิ่มฟิลด์สถานที่ซื้อสำหรับสรุปรายการสั่งซื้อของสต็อก:
            </p>
            <div className="bg-gray-900 text-amber-400 p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`-- Create pos_suppliers table
CREATE TABLE IF NOT EXISTS pos_suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add supplier_id column to inventory_items
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES pos_suppliers(id) ON DELETE SET NULL;

-- Enable RLS and add a policy to allow all operations (fixes "violates row-level security policy" error)
ALTER TABLE pos_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for pos_suppliers" ON pos_suppliers;
CREATE POLICY "Allow all for pos_suppliers" ON pos_suppliers FOR ALL TO public USING (true) WITH CHECK (true);

-- Grant permissions (just in case)
GRANT ALL ON TABLE pos_suppliers TO anon, authenticated, service_role;

-- Add discount columns to pos_order_items
ALTER TABLE pos_order_items ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE pos_order_items ADD COLUMN IF NOT EXISTS discount_reason TEXT;

-- Reload schema
NOTIFY pgrst, 'reload schema';
`}
            </div>
            <p className="text-amber-600 text-xs mt-2">
              ✅ เมื่อรันเสร็จ คุณจะสามารถระบุแหล่งซื้อของวัตถุดิบแต่ละชนิดได้
            </p>
          </div>
          {/* Feature: Promotions Management */}
          <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50 mt-4">
            <h2 className="text-lg font-semibold text-indigo-800 mb-3">
              🎁 ระบบจัดการโปรโมชั่น (Promotions)
            </h2>
            <p className="text-indigo-700 text-sm mb-3">
              รันคำสั่งนี้เพื่อสร้างตารางเก็บข้อมูลโปรโมชั่น:
            </p>
            <div className="bg-gray-900 text-indigo-400 p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`-- Create pos_promotions table
CREATE TABLE IF NOT EXISTS pos_promotions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    discount_type TEXT DEFAULT 'fixed',
    discount_value DECIMAL(12,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add a policy to allow all operations
ALTER TABLE pos_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for pos_promotions" ON pos_promotions;
CREATE POLICY "Allow all for pos_promotions" ON pos_promotions FOR ALL TO public USING (true) WITH CHECK (true);

-- Grant permissions (just in case)
GRANT ALL ON TABLE pos_promotions TO anon, authenticated, service_role;

-- Reload schema
NOTIFY pgrst, 'reload schema';
`}
            </div>
            <p className="text-indigo-600 text-xs mt-2">
              ✅ เมื่อรันเสร็จ คุณจะสามารถสร้างและจัดการโปรโมชั่นได้จากหลังบ้าน
            </p>
          </div>

          {/* Feature: Queue Number */}
          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50 mt-4">
            <h2 className="text-lg font-semibold text-purple-800 mb-3">
              🎫 ระบบเลขคิว (Queue Number)
            </h2>
            <p className="text-purple-700 text-sm mb-3">
              รันคำสั่งนี้เพื่อเพิ่ม column สำหรับเก็บเลขคิว เพื่อแก้ปัญหาเลขคิวไม่ขึ้น:
            </p>
            <div className="bg-gray-900 text-purple-400 p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`-- Add queue_number to pos_orders
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS queue_number INTEGER;
`}
            </div>
            <p className="text-purple-600 text-xs mt-2">
              ✅ เมื่อรันเสร็จ ระบบจะเริ่มรันเลขคิวได้ตามปกติ
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}