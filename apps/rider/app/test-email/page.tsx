'use client';
import { useState } from 'react'
import { useI18n } from "@/lib/I18nContext";

export default function EmailTestPage() {
    const { locale } = useI18n();
  const [emailConfig, setEmailConfig] = useState({
    EMAIL_USER: '',
    EMAIL_PASS: '',
    EMAIL_FROM: '',
    EMAIL_FROM_NAME: 'XYL Studio'
  })
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('th')

  const handleConfigChange = (key: string, value: string) => {
    setEmailConfig(prev => ({ ...prev, [key]: value }))
  }

  const testConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-email')
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({ success: false, error: 'Failed to test connection' })
    }
    setLoading(false)
  }

  const sendTestEmail = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', language: selectedLanguage })
      })
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({ success: false, error: 'Failed to send test email' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">📧 Email System Setup & Test</h1>
          
          {/* Gmail Setup Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">🔧 Gmail Setup Instructions</h2>
            <ol className="list-decimal list-inside space-y-3 text-blue-800">
              <li>{locale === 'en' ? 'ไปที่ ' : locale === 'zh' ? 'ไปที่ ' : 'ไปที่ '}<a href="https://myaccount.google.com/security" target="_blank" className="underline">Google Account Security</a></li>
              <li>{locale === 'en' ? 'เปิด ' : locale === 'zh' ? 'เปิด ' : 'เปิด '}<strong>2-Step Verification</strong> {locale === 'en' ? ' (ถ้ายังไม่ได้เปิด)' : locale === 'zh' ? ' (ถ้ายังไม่ได้เปิด)' : ' (ถ้ายังไม่ได้เปิด)'}</li>
              <li>{locale === 'en' ? 'ใน "2-Step Verification" ให้หา ' : locale === 'zh' ? 'ใน "2-Step Verification" ให้หา ' : 'ใน "2-Step Verification" ให้หา '}<strong>"App passwords"</strong></li>
              <li>{locale === 'en' ? 'สร้าง App Password ใหม่ เลือก ' : locale === 'zh' ? 'สร้าง App Password ใหม่ เลือก ' : 'สร้าง App Password ใหม่ เลือก '}<strong>"Mail"</strong></li>
              <li>{locale === 'en' ? 'คัดลอก password ที่ได้ (16 ตัวอักษร) มาใส่ในช่อง EMAIL_PASS' : locale === 'zh' ? 'คัดลอก password ที่ได้ (16 ตัวอักษร) มาใส่ในช่อง EMAIL_PASS' : 'คัดลอก password ที่ได้ (16 ตัวอักษร) มาใส่ในช่อง EMAIL_PASS'}</li>
              <li>{locale === 'en' ? 'แก้ไขไฟล์ ' : locale === 'zh' ? 'แก้ไขไฟล์ ' : 'แก้ไขไฟล์ '}<code className="bg-blue-100 px-2 py-1 rounded">.env.local</code></li>
            </ol>
          </div>

          {/* Current Config Display */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Current Email Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gmail Address:</label>
                <input
                  type="email"
                  value={emailConfig.EMAIL_USER}
                  onChange={(e) => handleConfigChange('EMAIL_USER', e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gmail App Password:</label>
                <input
                  type="password"
                  value={emailConfig.EMAIL_PASS}
                  onChange={(e) => handleConfigChange('EMAIL_PASS', e.target.value)}
                  placeholder="16-character app password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Name:</label>
                <input
                  type="text"
                  value={emailConfig.EMAIL_FROM_NAME}
                  onChange={(e) => handleConfigChange('EMAIL_FROM_NAME', e.target.value)}
                  placeholder="XYL Studio"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">{locale === 'en' ? '💡 คัดลอกไปใส่ใน .env.local:' : locale === 'zh' ? '💡 คัดลอกไปใส่ใน .env.local:' : '💡 คัดลอกไปใส่ใน .env.local:'}</h4>
              <pre className="text-sm text-yellow-700 bg-yellow-100 p-3 rounded overflow-x-auto">
{`EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=${emailConfig.EMAIL_USER || 'your-email@gmail.com'}
EMAIL_PASS=${emailConfig.EMAIL_PASS || 'your-app-password'}
EMAIL_FROM=${emailConfig.EMAIL_USER || 'your-email@gmail.com'}
EMAIL_FROM_NAME=${emailConfig.EMAIL_FROM_NAME}`}
              </pre>
            </div>
          </div>

          {/* Language Selection */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">🌐 Test Email Languages</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { code: 'th', name: 'ไทย', flag: '🇹🇭' },
                { code: 'en', name: 'English', flag: '🇺🇸' },
                { code: 'zh', name: '中文', flag: '🇨🇳' }
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`p-4 rounded-lg border text-center transition ${
                    selectedLanguage === lang.code
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  <div className="text-2xl mb-2">{lang.flag}</div>
                  <div className="font-medium">{lang.name}</div>
                </button>
              ))}
            </div>
            <p className="text-sm text-purple-700">
              {locale === 'en' ? '               เลือกภาษาเพื่อทดสอบอีเมลในภาษานั้นๆ (Select language to test email in that language)             ' : locale === 'zh' ? '               เลือกภาษาเพื่อทดสอบอีเมลในภาษานั้นๆ (Select language to test email in that language)             ' : '               เลือกภาษาเพื่อทดสอบอีเมลในภาษานั้นๆ (Select language to test email in that language)             '}</p>
          </div>

          {/* Test Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={testConnection}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Testing...' : '🔗 Test Connection'}
            </button>
            
            <button
              onClick={sendTestEmail}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Sending...' : `📧 Send Test Email (${selectedLanguage.toUpperCase()})`}
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`rounded-lg p-6 ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                {testResult.success ? '✅ Success!' : '❌ Error'}
              </h3>
              <pre className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'} bg-white p-4 rounded overflow-x-auto`}>
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}

          {/* Sample Email Preview */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📧 Email Preview</h3>
            <p className="text-gray-600 mb-4">{locale === 'en' ? 'นี่คือตัวอย่างอีเมลที่ลูกค้าจะได้รับ:' : locale === 'zh' ? 'นี่คือตัวอย่างอีเมลที่ลูกค้าจะได้รับ:' : 'นี่คือตัวอย่างอีเมลที่ลูกค้าจะได้รับ:'}</p>
            
            <div className="bg-white border rounded-lg p-4 max-w-2xl">
              <div className="bg-gradient-to-r from-slate-800 to-slate-600 text-white p-4 rounded-t-lg text-center">
                <h2 className="text-xl font-bold">🌿 XYL Studio</h2>
                <h3 className="text-lg">{locale === 'en' ? 'ยืนยันการจอง Workshop' : locale === 'zh' ? 'ยืนยันการจอง Workshop' : 'ยืนยันการจอง Workshop'}</h3>
              </div>
              
              <div className="p-4 space-y-3">
                <p>{locale === 'en' ? 'เรียน คุณทดสอบ ระบบ' : locale === 'zh' ? 'เรียน คุณทดสอบ ระบบ' : 'เรียน คุณทดสอบ ระบบ'}</p>
                <p>{locale === 'en' ? 'ขอบคุณที่จองเวิร์คชอปกับเรา! นี่คือรายละเอียดการจองของคุณ:' : locale === 'zh' ? 'ขอบคุณที่จองเวิร์คชอปกับเรา! นี่คือรายละเอียดการจองของคุณ:' : 'ขอบคุณที่จองเวิร์คชอปกับเรา! นี่คือรายละเอียดการจองของคุณ:'}</p>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{locale === 'en' ? 'หมายเลขการจอง:' : locale === 'zh' ? 'หมายเลขการจอง:' : 'หมายเลขการจอง:'}</span>
                      <span className="font-medium">#TEST-123456</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{locale === 'en' ? 'เวิร์คชอป:' : locale === 'zh' ? 'เวิร์คชอป:' : 'เวิร์คชอป:'}</span>
                      <span className="font-medium">{locale === 'en' ? 'สวนถาด (ทดสอบ)' : locale === 'zh' ? 'สวนถาด (ทดสอบ)' : 'สวนถาด (ทดสอบ)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{locale === 'en' ? 'วันที่:' : locale === 'zh' ? 'วันที่:' : 'วันที่:'}</span>
                      <span className="font-medium">{locale === 'en' ? 'วันนี้' : locale === 'zh' ? 'วันนี้' : 'วันนี้'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{locale === 'en' ? 'time:' : locale === 'zh' ? '时间：' : 'เวลา:'}</span>
                      <span className="font-medium">09:00 - 11:30</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">{locale === 'en' ? 'ยอดรวม:' : locale === 'zh' ? 'ยอดรวม:' : 'ยอดรวม:'}</span>
                      <span className="font-bold text-lg">{locale === 'en' ? '890 บาท' : locale === 'zh' ? '890 บาท' : '890 บาท'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <p className="text-blue-800 text-sm">{locale === 'en' ? '💵 การชำระเงินสด - กรุณามาถึงก่อนเวลาเริ่ม 15 นาที' : locale === 'zh' ? '💵 การชำระเงินสด - กรุณามาถึงก่อนเวลาเริ่ม 15 นาที' : '💵 การชำระเงินสด - กรุณามาถึงก่อนเวลาเริ่ม 15 นาที'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}