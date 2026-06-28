"use client"

import { useState } from 'react'
import { useI18n } from "@/lib/I18nContext";

export default function TestEmailPage() {
    const { locale } = useI18n();
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedLang, setSelectedLang] = useState('th')

  const testConnection = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/test-email')
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, error: 'Failed to test connection' })
    } finally {
      setLoading(false)
    }
  }

  const sendTestEmail = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', language: selectedLang })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, error: 'Failed to send test email' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            {locale === 'en' ? '             🧪 ทดสอบระบบอีเมล           ' : locale === 'zh' ? '             🧪 ทดสอบระบบอีเมล           ' : '             🧪 ทดสอบระบบอีเมล           '}</h1>
          
          {/* Language Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {locale === 'en' ? '               เลือกภาษาสำหรับทดสอบ:             ' : locale === 'zh' ? '               เลือกภาษาสำหรับทดสอบ:             ' : '               เลือกภาษาสำหรับทดสอบ:             '}</label>
            <select 
              value={selectedLang} 
              onChange={(e) => setSelectedLang(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="th">{locale === 'en' ? '🇹🇭 ไทย' : locale === 'zh' ? '🇹🇭 ไทย' : '🇹🇭 ไทย'}</option>
              <option value="en">🇺🇸 English</option>
              <option value="zh">🇨🇳 中文</option>
            </select>
          </div>

          {/* Test Buttons */}
          <div className="space-y-4 mb-8">
            <button
              onClick={testConnection}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '⏳ กำลังทดสอบ...' : '🔌 ทดสอบการเชื่อมต่อ SMTP'}
            </button>
            
            <button
              onClick={sendTestEmail}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '⏳ กำลังส่ง...' : '📧 ส่งอีเมลทดสอบ'}
            </button>
          </div>

          {/* Email Configuration Display */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">{locale === 'en' ? '📋 การตั้งค่าอีเมล:' : locale === 'zh' ? '📋 การตั้งค่าอีเมล:' : '📋 การตั้งค่าอีเมล:'}</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Host:</strong> smtp.gmail.com</p>
              <p><strong>Port:</strong> 587</p>
              <p><strong>Email:</strong> xylstudio.workshop@gmail.com</p>
              <p><strong>Security:</strong> STARTTLS</p>
            </div>
          </div>

          {/* Result Display */}
          {result && (
            <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">
                  {result.success ? '✅' : '❌'}
                </span>
                <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? 'สำเร็จ!' : 'เกิดข้อผิดพลาด'}
                </h3>
              </div>
              
              {result.success ? (
                <div className="space-y-2 text-sm">
                  {result.customerMessageId && (
                    <p className="text-green-700">
                      <strong>{locale === 'en' ? 'อีเมลลูกค้า:' : locale === 'zh' ? 'อีเมลลูกค้า:' : 'อีเมลลูกค้า:'}</strong> {result.customerMessageId}
                    </p>
                  )}
                  {result.adminMessageId && (
                    <p className="text-green-700">
                      <strong>{locale === 'en' ? 'อีเมลแอดมิน:' : locale === 'zh' ? 'อีเมลแอดมิน:' : 'อีเมลแอดมิน:'}</strong> {result.adminMessageId}
                    </p>
                  )}
                  {result.message && (
                    <p className="text-green-700">{result.message}</p>
                  )}
                </div>
              ) : (
                <div className="text-red-700 text-sm">
                  <p><strong>{locale === 'en' ? 'ข้อผิดพลาด:' : locale === 'zh' ? 'ข้อผิดพลาด:' : 'ข้อผิดพลาด:'}</strong> {result.error}</p>
                  
                  {result.error?.includes('authentication') && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-yellow-800 text-xs">
                        💡 <strong>{locale === 'en' ? 'แนะนำการแก้ไข:' : locale === 'zh' ? 'แนะนำการแก้ไข:' : 'แนะนำการแก้ไข:'}</strong><br/>
                        {locale === 'en' ? '                         1. ตรวจสอบว่าเปิด "2-Step Verification" แล้ว' : locale === 'zh' ? '                         1. ตรวจสอบว่าเปิด "2-Step Verification" แล้ว' : '                         1. ตรวจสอบว่าเปิด "2-Step Verification" แล้ว'}<br/>
                        {locale === 'en' ? '                         2. สร้าง "App Password" ใน Google Account' : locale === 'zh' ? '                         2. สร้าง "App Password" ใน Google Account' : '                         2. สร้าง "App Password" ใน Google Account'}<br/>
                        {locale === 'en' ? '                         3. ใช้ App Password แทน password ปกติ                       ' : locale === 'zh' ? '                         3. ใช้ App Password แทน password ปกติ                       ' : '                         3. ใช้ App Password แทน password ปกติ                       '}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Setup Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">{locale === 'en' ? '📝 วิธีการตั้งค่า Gmail SMTP:' : locale === 'zh' ? '📝 วิธีการตั้งค่า Gmail SMTP:' : '📝 วิธีการตั้งค่า Gmail SMTP:'}</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>{locale === 'en' ? 'เข้า Google Account → Security → 2-Step Verification (เปิดใช้งาน)' : locale === 'zh' ? 'เข้า Google Account → Security → 2-Step Verification (เปิดใช้งาน)' : 'เข้า Google Account → Security → 2-Step Verification (เปิดใช้งาน)'}</li>
              <li>{locale === 'en' ? 'ไป App passwords → สร้าง password ใหม่สำหรับแอป' : locale === 'zh' ? 'ไป App passwords → สร้าง password ใหม่สำหรับแอป' : 'ไป App passwords → สร้าง password ใหม่สำหรับแอป'}</li>
              <li>{locale === 'en' ? 'คัดลอก App Password มาใส่ใน EMAIL_PASS' : locale === 'zh' ? 'คัดลอก App Password มาใส่ใน EMAIL_PASS' : 'คัดลอก App Password มาใส่ใน EMAIL_PASS'}</li>
              <li>{locale === 'en' ? 'บันทึกไฟล์ .env.local และรีสตาร์ทเซิร์ฟเวอร์' : locale === 'zh' ? 'บันทึกไฟล์ .env.local และรีสตาร์ทเซิร์ฟเวอร์' : 'บันทึกไฟล์ .env.local และรีสตาร์ทเซิร์ฟเวอร์'}</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}