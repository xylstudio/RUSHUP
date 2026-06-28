'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/I18nContext'
import Link from 'next/link'
import { appCopy, pickLocalizedText } from '@/lib/appLocale'
import { formatCurrencyByLocale } from '@/lib/localeFormat'

interface PaymentDetails {
  bookingId: string
  amount: number
  currency: string
  paymentMethod: string
  transactionId: string
  paidAt: string
  workshopTitle: string
  workshopDate: string
  workshopTime: string
  attendeesCount: number
  customerName: string
  customerEmail: string
}

type PaymentRecord = {
  id: string
  booking_id: string
  provider: string
  provider_charge_id?: string | null
  amount: number
  currency: string
  status: string
  payer_email?: string | null
  paid_at?: string | null
  workshop_bookings?: {
    id: string
    full_name: string
    email: string
    topic: string
    attendees_count: number
    date: string
    start_time: string
    end_time: string
    status: string
  } | null
}

const normalizeStatus = (status?: string | null): 'pending' | 'paid' | 'failed' => {
  switch (status) {
    case 'paid':
    case 'complete':
    case 'succeeded':
    case 'confirmed':
      return 'paid'
    case 'failed':
    case 'cancelled':
    case 'expired':
    case 'payment_failed':
      return 'failed'
    default:
      return 'pending'
  }
}

const mapProviderToMethod = (provider?: string | null) => {
  switch (provider) {
    case 'stripe_promptpay':
      return 'promptpay'
    case 'stripe_card':
      return 'creditcard'
    case 'banktransfer':
      return 'banktransfer'
    default:
      return provider || 'payment'
  }
}

export default function PaymentSuccessPage() {
  const { locale } = useI18n()
  const router = useRouter()
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<'pending' | 'paid' | 'failed'>('paid')
  const [error, setError] = useState<string | null>(null)
  const pollerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const bookingId = params.get('booking') || ''
    const sessionId = params.get('session_id') || ''

    if (!bookingId) {
      router.push('/workshops')
      return
    }

    const loadStatus = async (): Promise<'pending' | 'paid' | 'failed'> => {
      try {
        const query = new URLSearchParams({ booking_id: bookingId })
        if (sessionId) {
          query.set('session_id', sessionId)
        }

        const res = await fetch(`/api/workshops/checkout?${query.toString()}`, { cache: 'no-store' })
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json.error || 'Unable to load payment')
        }

        const payment = json.payment as PaymentRecord
        const booking = payment.workshop_bookings
        const resolvedStatus = normalizeStatus(payment.status)

        setStatus(resolvedStatus)
        setPaymentDetails({
          bookingId: payment.booking_id,
          amount: Number(payment.amount || 0),
          currency: payment.currency || 'THB',
          paymentMethod: mapProviderToMethod(payment.provider),
          transactionId: payment.provider_charge_id || payment.id,
          paidAt: payment.paid_at || '',
          workshopTitle: booking?.topic || pickLocalizedText(locale, appCopy.workshopSuccess.bookingConfirmed),
          workshopDate: booking?.date || '',
          workshopTime: booking ? `${booking.start_time} - ${booking.end_time}` : '-',
          attendeesCount: booking?.attendees_count || 1,
          customerName: booking?.full_name || '-',
          customerEmail: booking?.email || payment.payer_email || '-',
        })
        setError(null)
                return resolvedStatus
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Verification failed')
        setStatus('failed')
                return 'failed'
      } finally {
        setIsLoading(false)
      }
    }

    let attempts = 0
    const maxAttempts = 24

            loadStatus().then((initialStatus) => {
              if (sessionId && initialStatus === 'pending') {
        pollerRef.current = setInterval(async () => {
                  attempts += 1
                  const nextStatus = await loadStatus()

                  if (nextStatus !== 'pending') {
                    if (pollerRef.current) clearInterval(pollerRef.current)
                    return
                  }

                  if (attempts >= maxAttempts) {
                    setError(pickLocalizedText(locale, appCopy.workshopSuccess.timeout))
                    if (pollerRef.current) clearInterval(pollerRef.current)
                  }
        }, 5000)
      }
    })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    if (status === 'paid' || status === 'failed') {
      if (pollerRef.current) {
        clearInterval(pollerRef.current)
      }
    }

    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current)
      }
    }
  }, [status])

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'promptpay':
        return pickLocalizedText(locale, appCopy.workshopSuccess.promptpay)
      case 'creditcard':
        return pickLocalizedText(locale, appCopy.workshopSuccess.creditcard)
      case 'banktransfer':
        return pickLocalizedText(locale, appCopy.workshopSuccess.banktransfer)
      default:
        return method
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === 'th' ? 'th-TH' : locale === 'en' ? 'en-US' : 'zh-CN')
  }

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr)
    return date.toLocaleString(locale === 'th' ? 'th-TH' : locale === 'en' ? 'en-US' : 'zh-CN')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {pickLocalizedText(locale, appCopy.workshopSuccess.paymentVerifying)}
          </p>
        </div>
      </div>
    )
  }

  if (status === 'pending') {
    const bookingId = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('booking') || '') : ''
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M4.93 4.93l14.14 14.14" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {pickLocalizedText(locale, appCopy.workshopSuccess.awaitingTitle)}
          </h1>
          <p className="text-gray-600 mb-4">
            {pickLocalizedText(locale, appCopy.workshopSuccess.awaitingBody)}
          </p>
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          <div className="text-sm text-gray-500 mb-4">#{bookingId}</div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setIsLoading(true); window.location.reload(); }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {pickLocalizedText(locale, appCopy.workshopSuccess.refreshPage)}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {locale === 'th' ? 'ยังยืนยันการชำระเงินไม่ได้' : locale === 'en' ? 'Payment Not Confirmed' : '支付尚未确认'}
          </h1>
          <p className="text-gray-600 mb-4">
            {error || (locale === 'th' ? 'กรุณาลองชำระเงินใหม่หรือติดต่อทีมงาน' : locale === 'en' ? 'Please try the payment again or contact support.' : '请重新支付或联系支持团队。')}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/workshops/payment" className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800">
              {locale === 'th' ? 'กลับไปหน้าชำระเงิน' : locale === 'en' ? 'Back to payment' : '返回支付页'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!paymentDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            {pickLocalizedText(locale, appCopy.workshopSuccess.missingPaymentDetails)}
          </h1>
          <Link href="/workshops" className="text-green-600 hover:underline">
            {pickLocalizedText(locale, appCopy.workshopSuccess.backToWorkshops)}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-6">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {status === 'paid'
              ? pickLocalizedText(locale, appCopy.workshopSuccess.paymentSuccess)
              : pickLocalizedText(locale, appCopy.workshopSuccess.awaitingTitle)}
          </h1>
          <p className="text-gray-600">
            {pickLocalizedText(locale, appCopy.workshopSuccess.confirmedSubtitle)}
          </p>
        </div>

        {/* Payment Receipt */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="border-b border-gray-200 pb-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {pickLocalizedText(locale, appCopy.workshopSuccess.receiptTitle)}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  {pickLocalizedText(locale, appCopy.workshopSuccess.paymentInfo)}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {pickLocalizedText(locale, appCopy.workshopSuccess.transactionId)}
                    </span>
                    <span className="font-mono">{paymentDetails.transactionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {pickLocalizedText(locale, appCopy.workshopSuccess.paymentMethod)}
                    </span>
                    <span>{getPaymentMethodName(paymentDetails.paymentMethod)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {pickLocalizedText(locale, appCopy.workshopSuccess.paymentDate)}
                    </span>
                    <span>{formatDateTime(paymentDetails.paidAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {pickLocalizedText(locale, appCopy.workshopSuccess.status)}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                      {pickLocalizedText(locale, appCopy.workshopSuccess.paid)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  {pickLocalizedText(locale, appCopy.workshopSuccess.bookingInfo)}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {pickLocalizedText(locale, appCopy.workshopSuccess.bookingId)}
                    </span>
                    <span className="font-mono">WS{paymentDetails.bookingId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {pickLocalizedText(locale, appCopy.workshopSuccess.workshop)}
                    </span>
                    <span>{paymentDetails.workshopTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {pickLocalizedText(locale, appCopy.workshopSuccess.date)}
                    </span>
                    <span>{formatDate(paymentDetails.workshopDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {pickLocalizedText(locale, appCopy.workshopSuccess.time)}
                    </span>
                    <span>{paymentDetails.workshopTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {pickLocalizedText(locale, appCopy.workshopSuccess.attendees)}
                    </span>
                    <span>{paymentDetails.attendeesCount} {pickLocalizedText(locale, appCopy.workshopSuccess.people)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">
                {pickLocalizedText(locale, appCopy.workshopSuccess.totalPaid)}
              </span>
              <span className="text-2xl font-bold text-green-600">
                {paymentDetails.amount.toLocaleString()} {paymentDetails.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-2xl p-8 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            {locale === 'th' ? 'ขั้นตอนถัดไป' : locale === 'en' ? 'Next Steps' : '下一步'}
          </h3>
          <div className="space-y-3 text-blue-800">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</div>
              <p>
                {locale === 'th' 
                  ? 'ใบเสร็จการชำระเงินจะถูกส่งไปยังอีเมล ' + paymentDetails.customerEmail
                  : locale === 'en'
                  ? 'Payment receipt will be sent to ' + paymentDetails.customerEmail
                  : '支付收据将发送至 ' + paymentDetails.customerEmail
                }
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</div>
              <p>
                {locale === 'th' 
                  ? 'เราจะส่งข้อมูลรายละเอียดและที่อยู่สตูดิโอให้คุณ 1 วันก่อนเวิร์กช็อป'
                  : locale === 'en'
                  ? 'We will send workshop details and studio address 1 day before the workshop'
                  : '我们将在工作坊前1天发送详细信息和工作室地址'
                }
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</div>
              <p>
                {locale === 'th' 
                  ? 'มาถึงสตูดิโอก่อนเวลา 15 นาที และเตรียมตัวสนุกกับการเรียนรู้!'
                  : locale === 'en'
                  ? 'Arrive at the studio 15 minutes early and get ready to have fun learning!'
                  : '提前15分钟到达工作室，准备享受学习的乐趣！'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {locale === 'th' ? 'พิมพ์ใบเสร็จ' : locale === 'en' ? 'Print Receipt' : '打印收据'}
          </button>
          
          <Link
            href="/workshops"
            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {locale === 'th' ? 'จองเวิร์กช็อปเพิ่มเติม' : locale === 'en' ? 'Book Another Workshop' : '预订更多工作坊'}
          </Link>
        </div>

        {/* Contact Info */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            {locale === 'th' 
              ? 'หากมีคำถาม กรุณาติดต่อ: hello@xylstudio.com หรือ 02-123-4567'
              : locale === 'en'
              ? 'For questions, contact us: hello@xylstudio.com or 02-123-4567'
              : '如有疑问，请联系我们：hello@xylstudio.com 或 02-123-4567'
            }
          </p>
        </div>
      </div>
    </div>
  )
}