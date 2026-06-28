'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/I18nContext'

export type PaymentMethod = 'promptpay' | 'creditcard' | 'banktransfer'

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  amount: number
  showTitle?: boolean
  variant?: 'stack' | 'segmented' | 'radio'
  className?: string
}

export default function PaymentMethodSelector({ 
  selectedMethod, 
  onMethodChange, 
  amount,
  showTitle = true,
  variant = 'stack',
  className
}: PaymentMethodSelectorProps) {
  const { locale } = useI18n()

  const methods = [
    {
      id: 'promptpay' as PaymentMethod,
      name: locale === 'th' ? 'พร้อมเพย์' : locale === 'en' ? 'PromptPay' : '泰国电子支付',
      icon: '📱',
      description: locale === 'th' 
        ? 'สแกน QR Code ผ่านแอปธนาคาร' 
        : locale === 'en'
        ? 'Scan QR Code via banking app'
        : '通过银行应用扫描二维码',
      popular: true
    },
    {
      id: 'creditcard' as PaymentMethod,
      name: locale === 'th' ? 'บัตรเครดิต/เดบิต' : locale === 'en' ? 'Credit/Debit Card' : '信用卡/借记卡',
      icon: '💳',
      description: locale === 'th' 
        ? 'Visa, Mastercard, JCB' 
        : locale === 'en'
        ? 'Visa, Mastercard, JCB'
        : 'Visa, Mastercard, JCB'
    },
    {
      id: 'banktransfer' as PaymentMethod,
      name: locale === 'th' ? 'โอนเงินผ่านธนาคาร' : locale === 'en' ? 'Bank Transfer' : '银行转账',
      icon: '🏦',
      description: locale === 'th' 
        ? 'โอนผ่านแอปธนาคารหรือ ATM' 
        : locale === 'en'
        ? 'Transfer via banking app or ATM'
        : '通过银行应用或ATM转账'
    }
  ]

  // Radio list layout with circular indicator
  if (variant === 'radio') {
    return (
      <fieldset className={className}>
        {showTitle && (
          <legend className="font-semibold text-slate-900 mb-3 md:mb-4 text-base md:text-lg">
            {locale === 'th' ? 'เลือกวิธีการชำระเงิน' : locale === 'en' ? 'Choose Payment Method' : '选择支付方式'}
          </legend>
        )}
        <div className="space-y-2" role="radiogroup" aria-label={locale==='th'?'วิธีชำระเงิน':locale==='en'?'Payment method':'支付方式'}>
          {methods.map(method => {
            const active = selectedMethod === method.id
            return (
              <label
                key={method.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${active ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={method.id}
                  checked={active}
                  onChange={() => onMethodChange(method.id)}
                  className="peer sr-only"
                />
                {/* Custom circular indicator */}
                <span className={`flex items-center justify-center w-5 h-5 rounded-full border ${active ? 'border-slate-900' : 'border-slate-400'} relative`}> 
                  {active && <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />}
                </span>
                <span className="text-xl leading-none">{method.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm md:text-base">{method.name}</div>
                  <div className="text-xs text-slate-500 line-clamp-1">{method.description}</div>
                </div>
                {method.popular && (
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-xylem-dark">{locale==='th'?'แนะนำ':locale==='en'?'Popular':'推荐'}</span>
                )}
              </label>
            )
          })}
        </div>
      </fieldset>
    )
  }
  
  // Segmented compact layout for minimal appearance
  if (variant === 'segmented') {
    return (
      <div className={className}>
        {showTitle && (
          <h3 className="font-semibold text-slate-900 mb-3 md:mb-4 text-base md:text-lg">
            {locale === 'th' ? 'เลือกวิธีการชำระเงิน' : locale === 'en' ? 'Choose Payment Method' : '选择支付方式'}
          </h3>
        )}
        <div className="flex flex-wrap gap-2" role="group" aria-label={locale==='th'?'วิธีชำระเงิน':locale==='en'?'Payment method':'支付方式'}>
          {methods.map(method => (
            <button
              key={method.id}
              type="button"
              onClick={() => onMethodChange(method.id)}
              aria-pressed={selectedMethod === method.id}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium ring-1 transition focus:outline-none focus-visible:ring-2 ring-offset-2 ${
                selectedMethod === method.id
                  ? 'bg-slate-900 text-white ring-slate-900'
                  : 'bg-white text-slate-900 ring-slate-200 hover:bg-slate-100 focus-visible:ring-xylem-dark/30'
              }`}
            >
              <span className="text-base leading-none">{method.icon}</span>
              <span className="leading-none">{method.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Default stacked card list
  return (
    <div className={`space-y-3 ${className || ''}`}>
      {showTitle && (
        <h3 className="font-semibold text-slate-900 mb-3 md:mb-4 text-base md:text-lg">
          {locale === 'th' ? 'เลือกวิธีการชำระเงิน' : locale === 'en' ? 'Choose Payment Method' : '选择支付方式'}
        </h3>
      )}
      {methods.map((method) => (
        <div
          key={method.id}
          onClick={() => onMethodChange(method.id)}
          className={`relative p-3 md:p-4 border rounded-xl cursor-pointer transition-all touch-manipulation ${
            selectedMethod === method.id
              ? 'border-slate-900 bg-white ring-2 ring-slate-900/15'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100'
          }`}
        >
          {method.popular && (
            <div className="absolute -top-2 left-4 px-2 py-1 bg-xylem-gold text-white text-xs rounded-full">
              {locale === 'th' ? 'แนะนำ' : locale === 'en' ? 'Popular' : '推荐'}
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="text-xl md:text-2xl">{method.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 text-sm md:text-base">{method.name}</div>
              <div className="text-sm text-slate-500">{method.description}</div>
            </div>
            <div className={`w-5 h-5 border-2 rounded-full transition-all ${
              selectedMethod === method.id
                ? 'border-slate-900 bg-slate-900'
                : 'border-slate-300'
            }`}>
              {selectedMethod === method.id && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}