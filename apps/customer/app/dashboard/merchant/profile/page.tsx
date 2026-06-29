'use client';
import { useState, useEffect } from 'react'
import { useAuth } from '../../../../lib/AuthContext'
import { supabase, updateUserProfile } from '../../../../lib/supabaseClient'
import { timeZonesNames } from '@vvo/tzdb'
import WebsiteLanguageSettings from '@/components/settings/WebsiteLanguageSettings'
import { useI18n } from "@/lib/I18nContext";

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
  new_order: true,
  job_assigned: false,
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

const getLineStatusMessage = (status: LineStatus) => {
  if (!status.linked) return 'ยังไม่เชื่อมบัญชี LINE กับบัญชีนี้'
  if (status.messagingStatus === 'ready') return 'เชื่อมสำเร็จและระบบยืนยันแล้วว่าส่ง LINE ถึงบัญชีนี้ได้'
  if (status.reason === 'line_official_account_not_added') {
    return 'เชื่อมแล้ว แต่บัญชีนี้ยังไม่ได้เพิ่ม Official Account เป็นเพื่อน จึงยังรับข้อความ push ไม่ได้'
  }
  if (status.reason === 'line_official_account_link_unverified') {
    return 'เชื่อมแล้ว แต่ LINE Login channel กับ Official Account ยังยืนยันความสัมพันธ์ไม่ได้ อาจยังไม่ได้ผูก OA เดียวกันหรืออยู่คนละ provider'
  }
  if (status.reason === 'missing_line_messaging_token') {
    return 'ระบบยังไม่มี LINE Messaging API token ใน environment จึงส่งข้อความไม่ได้'
  }
  if (status.messagingStatus === 'failed') {
    return 'เชื่อมแล้ว แต่ระบบทดสอบส่งข้อความไม่สำเร็จ กรุณากดเชื่อมใหม่อีกครั้งหลังเพิ่ม Official Account แล้ว'
  }
  return 'สถานะ LINE กำลังรอการยืนยันการส่งข้อความ'
}

export default function AdminProfile() {
    const { locale } = useI18n();
  const { profile, loading, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [timezone, setTimezone] = useState('Asia/Bangkok')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [linePrefs, setLinePrefs] = useState<LinePreferences>(DEFAULT_LINE_PREFS)
  const [lineRole, setLineRole] = useState('admin')
  const [lineLinked, setLineLinked] = useState(false)
  const [lineStatus, setLineStatus] = useState<LineStatus>(DEFAULT_LINE_STATUS)
  const [linePrefsLoading, setLinePrefsLoading] = useState(true)
  const [linePrefsSaving, setLinePrefsSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setEmail(profile.email || '')
      setPhone(profile.phone || '')
      setTimezone(profile.timezone || 'Asia/Bangkok')
    }
  }, [profile])

  useEffect(() => {
    const loadLinePreferences = async () => {
      if (!profile) return
      setLinePrefsLoading(true)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const response = await fetch('/api/notifications/preferences', {
          method: 'GET',
          headers: {
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          credentials: 'include',
        })

        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(result?.error || 'โหลดการตั้งค่า LINE ไม่สำเร็จ')
        }

        setLinePrefs(result.linePreferences || DEFAULT_LINE_PREFS)
        setLineRole(result.role || profile.role || 'admin')
        setLineLinked(Boolean(result.lineLinked))
        setLineStatus(result.lineStatus || DEFAULT_LINE_STATUS)
      } catch (error: any) {
        setFeedback({ type: 'error', message: error?.message || 'โหลดการตั้งค่า LINE ไม่สำเร็จ' })
      } finally {
        setLinePrefsLoading(false)
      }
    }

    void loadLinePreferences()
  }, [profile])

  const updateLinePref = (key: keyof LinePreferences, value: boolean) => {
    setLinePrefs((prev) => ({ ...prev, [key]: value }))
  }

  const saveLinePreferences = async () => {
    setLinePrefsSaving(true)
    setFeedback(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ linePreferences: linePrefs }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error || 'บันทึกการตั้งค่า LINE ไม่สำเร็จ')
      }

      setLinePrefs(result.linePreferences || linePrefs)
      setFeedback({ type: 'success', message: 'บันทึกการตั้งค่าแจ้งเตือน LINE แล้ว' })
    } catch (error: any) {
      setFeedback({ type: 'error', message: error?.message || 'บันทึกการตั้งค่า LINE ไม่สำเร็จ' })
    } finally {
      setLinePrefsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>{locale === 'en' ? 'Loading data...' : locale === 'zh' ? '正在加载数据...' : 'กำลังโหลดข้อมูล...'}</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-red-500">{locale === 'en' ? 'ไม่พบข้อมูลโปรไฟล์' : locale === 'zh' ? 'ไม่พบข้อมูลโปรไฟล์' : 'ไม่พบข้อมูลโปรไฟล์'}</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFeedback(null)

    const { error } = await updateUserProfile(profile.id, {
      display_name: displayName,
      phone,
      timezone,
      // email is not updated here as it's a sensitive field
    })

    if (error) {
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดในการบันทึก: ' + error.message })
    } else {
      setFeedback({ type: 'success', message: 'บันทึกข้อมูลเรียบร้อยแล้ว!' })
      await refreshProfile();
    }
    setIsSubmitting(false)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{locale === 'en' ? 'โปรไฟล์ผู้ดูแลระบบ' : locale === 'zh' ? 'โปรไฟล์ผู้ดูแลระบบ' : 'โปรไฟล์ผู้ดูแลระบบ'}</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                {locale === 'en' ? '                 ชื่อที่แสดง               ' : locale === 'zh' ? '                 ชื่อที่แสดง               ' : '                 ชื่อที่แสดง               '}</label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {locale === 'en' ? '                 อีเมล (ไม่สามารถแก้ไขได้)               ' : locale === 'zh' ? '                 อีเมล (ไม่สามารถแก้ไขได้)               ' : '                 อีเมล (ไม่สามารถแก้ไขได้)               '}</label>
              <input
                type="email"
                id="email"
                value={email}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                readOnly
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              {locale === 'en' ? '               เบอร์โทรศัพท์             ' : locale === 'zh' ? '               เบอร์โทรศัพท์             ' : '               เบอร์โทรศัพท์             '}</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
              {locale === 'en' ? '               เขตเวลา (Timezone)             ' : locale === 'zh' ? '               เขตเวลา (Timezone)             ' : '               เขตเวลา (Timezone)             '}</label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {timeZonesNames.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <WebsiteLanguageSettings />
          
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              {locale === 'en' ? '               สิทธิ์การเข้าถึง (ไม่สามารถแก้ไขได้)             ' : locale === 'zh' ? '               สิทธิ์การเข้าถึง (ไม่สามารถแก้ไขได้)             ' : '               สิทธิ์การเข้าถึง (ไม่สามารถแก้ไขได้)             '}</label>
            <input
              id="role"
              value={profile.role}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              readOnly
            />
          </div>

          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm font-medium text-emerald-900">{locale === 'en' ? 'เชื่อมบัญชี LINE เพื่อรับแจ้งเตือน' : locale === 'zh' ? 'เชื่อมบัญชี LINE เพื่อรับแจ้งเตือน' : 'เชื่อมบัญชี LINE เพื่อรับแจ้งเตือน'}</div>
            <p className="mt-1 text-xs text-emerald-800">
              {locale === 'en' ? '               สำหรับแจ้งเตือนแบบ push ใน LINE ของบัญชีแอดมินนี้ กดเชื่อมเพียงครั้งเดียว             ' : locale === 'zh' ? '               สำหรับแจ้งเตือนแบบ push ใน LINE ของบัญชีแอดมินนี้ กดเชื่อมเพียงครั้งเดียว             ' : '               สำหรับแจ้งเตือนแบบ push ใน LINE ของบัญชีแอดมินนี้ กดเชื่อมเพียงครั้งเดียว             '}</p>
            <p className="mt-1 text-xs text-emerald-900">
              {locale === 'en' ? '               สถานะ: ' : locale === 'zh' ? '               สถานะ: ' : '               สถานะ: '}{lineLinked ? 'เชื่อมแล้ว' : 'ยังไม่เชื่อม'} {locale === 'en' ? ' | role ที่ระบบใช้: ' : locale === 'zh' ? ' | role ที่ระบบใช้: ' : ' | role ที่ระบบใช้: '}{lineRole}
            </p>
            <p className="mt-1 text-xs text-emerald-900">{getLineStatusMessage(lineStatus)}</p>
            {lineStatus.error && (
              <p className="mt-1 text-[11px] text-amber-800">{locale === 'en' ? 'รายละเอียดล่าสุด: ' : locale === 'zh' ? 'รายละเอียดล่าสุด: ' : 'รายละเอียดล่าสุด: '}{lineStatus.error}</p>
            )}
            <div className="mt-3">
              <a
                href="/api/auth/line/link"
                className="inline-flex items-center rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                {lineStatus.messagingStatus === 'ready' ? 'เชื่อม LINE ใหม่อีกครั้ง' : 'เชื่อม LINE กับบัญชีนี้'}
              </a>
            </div>
          </div>

          <div className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <div className="text-sm font-semibold text-gray-800">{locale === 'en' ? 'ตั้งค่าการแจ้งเตือน LINE' : locale === 'zh' ? 'ตั้งค่าการแจ้งเตือน LINE' : 'ตั้งค่าการแจ้งเตือน LINE'}</div>
            <p className="mt-1 text-xs text-gray-600">{locale === 'en' ? 'เลือกหัวข้อที่ต้องการรับข้อความผ่าน LINE' : locale === 'zh' ? 'เลือกหัวข้อที่ต้องการรับข้อความผ่าน LINE' : 'เลือกหัวข้อที่ต้องการรับข้อความผ่าน LINE'}</p>

            {linePrefsLoading ? (
              <div className="mt-3 text-sm text-gray-500">{locale === 'en' ? 'กำลังโหลดการตั้งค่า...' : locale === 'zh' ? 'กำลังโหลดการตั้งค่า...' : 'กำลังโหลดการตั้งค่า...'}</div>
            ) : (
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <label className="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2">
                  <span>{locale === 'en' ? 'เปิดรับ LINE ทั้งหมด' : locale === 'zh' ? 'เปิดรับ LINE ทั้งหมด' : 'เปิดรับ LINE ทั้งหมด'}</span>
                  <input type="checkbox" checked={linePrefs.enabled} onChange={(e) => updateLinePref('enabled', e.target.checked)} />
                </label>
                <label className="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2">
                  <span>{locale === 'en' ? 'ออเดอร์ใหม่' : locale === 'zh' ? 'ออเดอร์ใหม่' : 'ออเดอร์ใหม่'}</span>
                  <input type="checkbox" checked={linePrefs.new_order} onChange={(e) => updateLinePref('new_order', e.target.checked)} disabled={!linePrefs.enabled} />
                </label>
                <label className="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2">
                  <span>{locale === 'en' ? 'อัปเดตสถานะงาน/ออเดอร์' : locale === 'zh' ? 'อัปเดตสถานะงาน/ออเดอร์' : 'อัปเดตสถานะงาน/ออเดอร์'}</span>
                  <input type="checkbox" checked={linePrefs.order_status} onChange={(e) => updateLinePref('order_status', e.target.checked)} disabled={!linePrefs.enabled} />
                </label>
                <label className="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2">
                  <span>{locale === 'en' ? 'แจ้งเตือนระบบ' : locale === 'zh' ? 'แจ้งเตือนระบบ' : 'แจ้งเตือนระบบ'}</span>
                  <input type="checkbox" checked={linePrefs.system} onChange={(e) => updateLinePref('system', e.target.checked)} disabled={!linePrefs.enabled} />
                </label>
              </div>
            )}

            <div className="mt-3">
              <button
                type="button"
                onClick={saveLinePreferences}
                disabled={linePrefsLoading || linePrefsSaving}
                className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {linePrefsSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า LINE'}
              </button>
            </div>
          </div>

          {feedback && (
            <div className={`p-3 rounded-md text-sm ${
              feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {feedback.message}
            </div>
          )}
          
          <div className="flex justify-end space-x-4">
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 