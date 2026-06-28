"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/I18nContext'
import PaymentMethodSelector, { PaymentMethod } from '@/components/PaymentMethodSelector'
import BankTransferInfo from '@/components/BankTransferInfo'
import { appCopy, pickLocalizedText } from '@/lib/appLocale'
import { formatCurrencyByLocale } from '@/lib/localeFormat'

interface WorkshopBookingData {
  topic: string
  date: string
  start_time: string
  end_time: string
  attendees_count: number
  amount: number
  client_token?: string
  consents?: {
    privacyPolicy?: boolean
    termsOfService?: boolean
    marketing?: boolean
  }
  [key: string]: unknown
}

export default function WorkshopPaymentPage() {
  const { t, locale, setLocale } = useI18n()
  const router = useRouter()
  const [bookingData, setBookingData] = useState<WorkshopBookingData | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('promptpay')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const detailsRef = useRef<HTMLDivElement | null>(null)
  const [clientToken] = useState<string>(() => `bk_${Date.now()}_${Math.random().toString(36).slice(2,8)}`)

  // Load booking from session; redirect back if missing
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('workshopBooking')
      if (!raw) {
        router.replace('/workshops/book')
        return
      }
      const parsed = JSON.parse(raw) as WorkshopBookingData
      setBookingData(parsed)
    } catch {
      router.replace('/workshops/book')
    }
  }, [router])

  // Scroll to details when method selected (for the first time)
  const scrolledRef = useRef(false)
  useEffect(() => {
    if (!bookingData) return
    if (!scrolledRef.current) {
      scrolledRef.current = true
      setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
  }, [paymentMethod, bookingData])

  const handlePaymentComplete = async (paymentData?: unknown) => {
    if (!bookingData) return

    try {
      setIsSubmitting(true)
      setSubmitError(null)

      const res = await fetch('/api/workshops/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookingData,
          payment_method: paymentMethod,
          payment_data: paymentData,
          client_token: bookingData.client_token || clientToken
        })
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || pickLocalizedText(locale, appCopy.workshopPayment.paymentError))
      }

      if (json.redirectUrl) {
        window.location.href = json.redirectUrl
        return
      }

      if (res.ok) {
        const bookingId = json.booking?.id || json.booking_id
        router.push(`/workshops/success?booking=${bookingId}`)
      }
    } catch (err: unknown) {
      console.error('Payment error:', err)
      setSubmitError(err instanceof Error ? err.message : pickLocalizedText(locale, appCopy.workshopPayment.serverError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStripePaymentPanel = () => {
    const isPromptPay = paymentMethod === 'promptpay'

    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h4 className="text-base font-semibold text-slate-900">
              {isPromptPay
                ? (locale === 'th' ? 'ชำระผ่าน Stripe PromptPay' : locale === 'en' ? 'Pay with Stripe PromptPay' : '通过 Stripe PromptPay 支付')
                : (locale === 'th' ? 'ชำระผ่าน Stripe Checkout' : locale === 'en' ? 'Pay with Stripe Checkout' : '通过 Stripe Checkout 支付')}
            </h4>
            <p className="mt-1 text-sm text-slate-600">
              {isPromptPay
                ? (locale === 'th'
                    ? 'ระบบจะพาคุณไปยังหน้าชำระเงินของ Stripe เพื่อแสดง QR PromptPay และติดตามสถานะกลับมายังหน้ายืนยันนี้อัตโนมัติ'
                    : locale === 'en'
                      ? 'You will be redirected to Stripe Checkout to display a PromptPay QR and this page will automatically track the final payment status.'
                      : '系统会带您前往 Stripe Checkout 显示 PromptPay 二维码，并在返回后自动追踪最终支付状态。')
                : (locale === 'th'
                    ? 'ระบบจะพาคุณไปยังหน้าชำระเงินที่ปลอดภัยของ Stripe เพื่อชำระด้วยบัตรเครดิตหรือเดบิต'
                    : locale === 'en'
                      ? 'You will be redirected to Stripe Checkout to complete a secure card payment.'
                      : '系统会带您前往 Stripe Checkout 以安全完成银行卡支付。')}
            </p>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 ring-1 ring-slate-200">
            Stripe
          </div>
        </div>

        <div className="mb-5 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{locale === 'th' ? 'ยอดที่ต้องชำระ' : locale === 'en' ? 'Amount due' : '应付金额'}</span>
            <span className="text-lg font-bold text-slate-900">{formatCurrencyByLocale(bookingData?.amount || 0, locale)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handlePaymentComplete()}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-4 font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <svg className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {locale === 'th' ? 'กำลังเตรียมหน้าชำระเงิน' : locale === 'en' ? 'Preparing checkout' : '正在准备结账页面'}
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a5 5 0 00-10 0v2m-2 0h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z" />
              </svg>
              {isPromptPay
                ? (locale === 'th' ? 'ไปที่ Stripe PromptPay' : locale === 'en' ? 'Continue to Stripe PromptPay' : '前往 Stripe PromptPay')
                : (locale === 'th' ? 'ไปที่ Stripe Checkout' : locale === 'en' ? 'Continue to Stripe Checkout' : '前往 Stripe Checkout')}
            </>
          )}
        </button>

        {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/workshops/book')}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {pickLocalizedText(locale, appCopy.workshopPayment.backToEdit)}
          </button>
          <div className="flex items-center gap-1">
            {(['th','en','zh'] as const).map(code => (
              <button key={code} onClick={()=>setLocale(code)} className={`px-2.5 py-1.5 rounded-md text-xs ring-1 transition ${locale===code?'bg-slate-900 text-white ring-slate-900':'bg-white text-slate-900 ring-slate-200 hover:bg-slate-100'}`}>{code==='th'?'ไทย':code==='en'?'EN':'中文'}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-2" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Guard missing booking */}
        {!bookingData ? (
          <div className="text-center text-slate-600 py-16">
            {pickLocalizedText(locale, appCopy.workshopPayment.loadingBooking)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <div className="md:col-span-3 lg:col-span-1 space-y-4 sm:space-y-6">
              {/* Method selector */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
                <h3 className="font-semibold text-slate-900 mb-3">{pickLocalizedText(locale, appCopy.workshopPayment.paymentMethod)}</h3>
                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onMethodChange={setPaymentMethod}
                  amount={bookingData?.amount || 0}
                  showTitle={false}
                  variant="radio"
                />
              </div>

              {/* Payment details */}
              <div ref={detailsRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
                <h3 className="font-semibold text-slate-900 mb-3">{pickLocalizedText(locale, appCopy.workshopPayment.paymentDetails)}</h3>
                {(paymentMethod === 'promptpay' || paymentMethod === 'creditcard') && renderStripePaymentPanel()}

                {paymentMethod === 'banktransfer' && (
                  <BankTransferInfo
                    amount={bookingData?.amount || 0}
                    bookingId={Date.now().toString()}
                    onPaymentComplete={handlePaymentComplete}
                  />
                )}

                <p className="mt-4 text-xs text-slate-500">{pickLocalizedText(locale, appCopy.workshopPayment.secureNotice)}</p>
              </div>
            </div>

            {/* Summary on the right */}
            <div className="md:col-span-2 lg:col-span-1 rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm p-5 sm:p-6 lg:sticky lg:top-4 h-fit">
              <div className="font-semibold text-slate-900 mb-3">{t('summary.title')}</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{t('summary.topic')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{bookingData?.topic}</span>
                    <button
                      onClick={() => router.push('/workshops/book')}
                      className="text-xs text-slate-500 hover:text-slate-700 px-1 py-0.5 rounded hover:bg-slate-100"
                      title={pickLocalizedText(locale, appCopy.workshopPayment.edit)}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{t('summary.date')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{bookingData?.date}</span>
                    <button
                      onClick={() => router.push('/workshops/book')}
                      className="text-xs text-slate-500 hover:text-slate-700 px-1 py-0.5 rounded hover:bg-slate-100"
                      title={pickLocalizedText(locale, appCopy.workshopPayment.edit)}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{t('summary.time')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{bookingData?.start_time} - {bookingData?.end_time}</span>
                    <button
                      onClick={() => router.push('/workshops/book')}
                      className="text-xs text-slate-500 hover:text-slate-700 px-1 py-0.5 rounded hover:bg-slate-100"
                      title={pickLocalizedText(locale, appCopy.workshopPayment.edit)}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{t('summary.attendees')}</span>
                  <span className="font-semibold text-slate-900">{bookingData?.attendees_count}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-900">{t('summary.total')}</span>
                    <span className="text-xl font-extrabold text-slate-900">{formatCurrencyByLocale(bookingData?.amount || 0, locale)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
