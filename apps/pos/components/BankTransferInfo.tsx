'use client'

import { useI18n } from '@/lib/I18nContext'

interface BankTransferInfoProps {
  amount: number
  bookingId?: string
  onPaymentComplete?: () => void
}

export default function BankTransferInfo({ amount, bookingId, onPaymentComplete }: BankTransferInfoProps) {
  const { locale } = useI18n()

  const bankAccounts = [
    {
      bank: 'ธนาคารกสิกรไทย',
      bankEn: 'Kasikorn Bank',
      accountNumber: '123-4-56789-0',
      accountName: 'XYL STUDIO CO., LTD.',
      color: 'bg-green-600'
    },
    {
      bank: 'ธนาคารกรุงเทพ',
      bankEn: 'Bangkok Bank',
      accountNumber: '987-6-54321-0',
      accountName: 'XYL STUDIO CO., LTD.',
      color: 'bg-blue-600'
    },
    {
      bank: 'ธนาคารไทยพาณิชย์',
      bankEn: 'Siam Commercial Bank',
      accountNumber: '555-1-23456-7',
      accountName: 'XYL STUDIO CO., LTD.',
      color: 'bg-purple-600'
    }
  ]

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const handlePaymentConfirm = () => {
    // Mock confirmation - in real app, this would verify the transfer
    if (onPaymentComplete) {
      onPaymentComplete()
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {locale === 'th' ? 'โอนเงินผ่านธนาคาร' : locale === 'en' ? 'Bank Transfer' : '银行转账'}
        </h3>
        <div className="text-2xl font-bold text-green-600">
          {amount.toLocaleString()} THB
        </div>
      </div>

      {/* Reference Number */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 13.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="font-semibold text-yellow-800">
            {locale === 'th' ? 'หมายเลขอ้างอิง (สำคัญ!)' : locale === 'en' ? 'Reference Number (Important!)' : '参考号码（重要！）'}
          </span>
        </div>
        <div className="flex items-center justify-between bg-white rounded-lg p-3 border">
          <code className="text-lg font-mono font-bold">
            WS{bookingId || Date.now().toString().slice(-6)}
          </code>
          <button
            onClick={() => copyToClipboard(`WS${bookingId || Date.now().toString().slice(-6)}`)}
            className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
          >
            {locale === 'th' ? 'คัดลอก' : locale === 'en' ? 'Copy' : '复制'}
          </button>
        </div>
        <p className="text-sm text-yellow-700 mt-2">
          {locale === 'th' 
            ? '* กรุณาระบุหมายเลขอ้างอิงนี้ในการโอนเงิน'
            : locale === 'en'
            ? '* Please include this reference number in your transfer'
            : '* 请在转账时包含此参考号码'
          }
        </p>
      </div>

      {/* Bank Accounts */}
      <div className="space-y-4 mb-6">
        <h4 className="font-semibold text-gray-900">
          {locale === 'th' ? 'บัญชีธนาคารของเรา' : locale === 'en' ? 'Our Bank Accounts' : '我们的银行账户'}
        </h4>
        
        {bankAccounts.map((account, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${account.color}`}></div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {locale === 'th' ? account.bank : account.bankEn}
                  </div>
                  <div className="text-sm text-gray-600">{account.accountName}</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <code className="text-lg font-mono font-bold text-gray-900">
                {account.accountNumber}
              </code>
              <button
                onClick={() => copyToClipboard(account.accountNumber)}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                {locale === 'th' ? 'คัดลอก' : locale === 'en' ? 'Copy' : '复制'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h5 className="font-semibold text-blue-900 mb-3">
          {locale === 'th' ? 'วิธีการโอนเงิน' : locale === 'en' ? 'How to Transfer' : '转账方法'}
        </h5>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">1</div>
            <p>
              {locale === 'th' 
                ? 'เลือกบัญชีธนาคารที่สะดวกสำหรับคุณ'
                : locale === 'en'
                ? 'Choose a convenient bank account for you'
                : '选择对您方便的银行账户'
              }
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">2</div>
            <p>
              {locale === 'th' 
                ? 'โอนเงินจำนวน ' + amount.toLocaleString() + ' บาท'
                : locale === 'en'
                ? 'Transfer ' + amount.toLocaleString() + ' THB'
                : '转账 ' + amount.toLocaleString() + ' 泰铢'
              }
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">3</div>
            <p>
              {locale === 'th' 
                ? 'ระบุหมายเลขอ้างอิงในหมายเหตุการโอน'
                : locale === 'en'
                ? 'Include reference number in transfer memo'
                : '在转账备注中包含参考号码'
              }
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">4</div>
            <p>
              {locale === 'th' 
                ? 'กดปุ่ม "แจ้งชำระเงินแล้ว" ด้านล่าง'
                : locale === 'en'
                ? 'Click "Payment Completed" button below'
                : '点击下方"支付完成"按钮'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Button */}
      <button
        onClick={handlePaymentConfirm}
        className="w-full px-6 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {locale === 'th' ? 'แจ้งชำระเงินแล้ว' : locale === 'en' ? 'Payment Completed' : '支付完成'}
      </button>

      <p className="text-xs text-gray-500 text-center mt-3">
        {locale === 'th' 
          ? '* การจองจะได้รับการยืนยันภายใน 1-2 ชั่วโมงหลังจากได้รับการชำระเงิน'
          : locale === 'en'
          ? '* Booking will be confirmed within 1-2 hours after payment is received'
          : '* 预订将在收到付款后1-2小时内确认'
        }
      </p>
    </div>
  )
}