'use client';
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useI18n } from "@/lib/I18nContext";

export default function ReschedulePage() {
    const { locale } = useI18n();
  const router = useRouter()
  const params = useParams()
  const orderId = typeof params?.id === 'string' ? params.id.trim() : ''

  const [step, setStep] = useState<'loading' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!orderId) {
      setErrorMsg('ลิงก์ไม่ถูกต้อง ไม่พบรหัสนัดหมาย')
      setStep('error')
      return
    }

    const supabase = createClient()

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace(`/login?next=/reschedule/${orderId}`)
        return
      }

      // 2. Flexible lookup: UUID → order.id, otherwise → house_code or order_code
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)

      let data: any = null
      let error: any = null

      if (isUuid) {
        const res = await supabase
          .from('orders')
          .select('id, house_id, customer_id')
          .eq('id', orderId)
          .maybeSingle()
        data = res.data
        error = res.error
      } else {
        const res = await supabase
          .from('orders')
          .select('id, house_id, customer_id')
          .or(`house_code.eq.${orderId},order_code.eq.${orderId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        data = res.data
        error = res.error
      }

      if (error) {
        console.error('[Reschedule] DB Error:', error)
        setErrorMsg(`เกิดข้อผิดพลาดจากฐานข้อมูล: ${error.message}`)
        setStep('error')
        return
      }

      if (!data) {
        setErrorMsg('ไม่พบข้อมูลนัดหมายนี้ในระบบ โปรดติดต่อเจ้าหน้าที่')
        setStep('error')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      const isOwner = data.customer_id === session.user.id
      const isStaff = profile?.role === 'admin' || profile?.role === 'staff'

      if (!isOwner && !isStaff) {
        setErrorMsg('คุณไม่มีสิทธิ์เข้าถึงนัดหมายนี้')
        setStep('error')
        return
      }

      if (!data.house_id) {
        setErrorMsg('ไม่พบข้อมูลบ้านสำหรับนัดหมายนี้')
        setStep('error')
        return
      }

      router.replace(`/dashboard/customer/houses/${encodeURIComponent(data.house_id)}?calendar=open&action=reschedule&orderId=${encodeURIComponent(data.id)}`)
    }

    load().catch(err => {
      console.error('[Reschedule] Unexpected error:', err)
      setErrorMsg('เกิดข้อผิดพลาดที่ไม่คาดคิด โปรดลองใหม่อีกครั้ง')
      setStep('error')
    })
  }, [orderId, router])

  if (step === 'loading') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>{locale === 'en' ? 'Taking you to the home calendar...' : locale === 'zh' ? '带您进入家庭日历...' : 'กำลังพาไปยังปฏิทินของบ้าน...'}</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>⚠️</div>
          <h1 style={styles.title}>{locale === 'en' ? 'ไม่สามารถโหลดได้' : locale === 'zh' ? 'ไม่สามารถโหลดได้' : 'ไม่สามารถโหลดได้'}</h1>
          <p style={styles.subtitle}>{errorMsg}</p>
          <button style={styles.btn} onClick={() => router.back()}>{locale === 'en' ? '← กลับหน้าเดิม' : locale === 'zh' ? '← กลับหน้าเดิม' : '← กลับหน้าเดิม'}</button>
        </div>
      </div>
    )
  }
  return null
}

/* ─────────────── INLINE STYLES (no layout dependency) ─────────────── */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Outfit', 'Noto Sans Thai', sans-serif",
  },
  card: {
    background: '#ffffff',
    borderRadius: 24,
    padding: '40px 32px',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 60px -10px rgba(0,0,0,0.10)',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  header: { display: 'flex', flexDirection: 'column', gap: 8 },
  badge: {
    display: 'inline-block',
    background: '#d1fae5',
    color: '#065f46',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.2em',
    padding: '4px 12px',
    borderRadius: 100,
    width: 'fit-content',
    textTransform: 'uppercase',
  },
  title: { fontSize: 28, fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.2 },
  subtitle: { fontSize: 16, color: '#6b7280', margin: 0, lineHeight: 1.5 },
  infoBox: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  infoLabel: { fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' },
  infoValue: { fontSize: 20, fontWeight: 700, color: '#111827' },
  infoSecondary: { fontSize: 14, fontWeight: 600, color: '#4b5563' },
  policyBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 16,
    padding: '16px 20px',
    color: '#92400e',
    fontSize: 14,
    lineHeight: 1.5,
  },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' },
  datePicker: {
    width: '100%',
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: 16,
    padding: '16px 20px',
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box',
  },
  selectField: {
    width: '100%',
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: 16,
    padding: '14px 16px',
    fontSize: 15,
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textArea: {
    width: '100%',
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: 16,
    padding: '14px 16px',
    fontSize: 15,
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  hint: { fontSize: 13, color: '#9ca3af', margin: 0, fontStyle: 'italic' },
  softPanel: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: '16px 18px',
    color: '#6b7280',
    fontSize: 14,
    fontWeight: 600,
  },
  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
  },
  slotButton: {
    border: '1px solid #d1d5db',
    background: '#ffffff',
    borderRadius: 18,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    textAlign: 'left',
    cursor: 'pointer',
  },
  slotButtonActive: {
    border: '2px solid #059669',
    background: '#ecfdf5',
    boxShadow: '0 10px 24px rgba(5, 150, 105, 0.12)',
  },
  slotText: { fontSize: 16, fontWeight: 800, color: '#111827' },
  slotSubtext: { fontSize: 12, color: '#6b7280', fontWeight: 600 },
  summaryBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 16,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  summaryLabel: { fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.1em' },
  summaryText: { fontSize: 14, fontWeight: 600, color: '#14532d' },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 12,
    padding: '12px 16px',
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: 600,
  },
  submitBtn: {
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 100,
    padding: '18px 0',
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    width: '100%',
    transition: 'all 0.2s',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '8px 0',
    textAlign: 'center',
    width: '100%',
  },
  btn: {
    background: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: 100,
    padding: '14px 28px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #d1fae5',
    borderTop: '3px solid #059669',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  loadingText: { color: '#6b7280', fontWeight: 600, textAlign: 'center', margin: 0 },
  successIcon: { fontSize: 48, textAlign: 'center' },
  errorIcon: { fontSize: 48, textAlign: 'center' },
  footer: {
    marginTop: 24,
    fontSize: 11,
    color: '#d1d5db',
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
  },
}
