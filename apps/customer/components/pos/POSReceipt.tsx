import React, { forwardRef } from 'react'
import { useI18n } from "@/lib/I18nContext";

export interface ReceiptProps {
  orderNumber: string
  orderType: string
  tableNumber?: string
  customerName?: string
  items: any[]
  subtotal: number
  discount: number
  tax: number
  serviceCharge: number
  total: number
  paymentMethod: string
  paidAmount: number
  change: number
  timestamp: string
  cashierName: string
  deliveryPlatform?: string
  referenceName?: string
  orderSource?: string
  receiptStoryMode?: boolean
  receiptStories?: Array<{ title: string; content: string }>
  receiptFooter?: string
  receiptPaymentQrImage?: string
}

export const POSReceipt = forwardRef<HTMLDivElement, ReceiptProps>(({
  orderNumber,
  orderType,
  tableNumber,
  customerName,
  items,
  subtotal,
  discount,
  tax,
  serviceCharge,
  total,
  paymentMethod,
  paidAmount,
  change,
  timestamp,
  cashierName,
  deliveryPlatform,
  referenceName,
  orderSource,
  receiptStoryMode,
  receiptStories,
  receiptFooter,
  receiptPaymentQrImage
}, ref) => {
    const { locale } = useI18n();
  const formatDeliveryPlatformLabel = (platform?: string) => platform ? platform.replace(/_/g, ' ').toUpperCase() : '-'
  const formatModifierLabel = (modifier: any) => {
    if (!modifier) return ''
    const name = modifier.display_name || modifier.label || modifier.group_name || modifier.name || 'Option'
    const value = modifier.value || modifier.selected_value || modifier.option_value || modifier.option_name || ''
    if ((modifier.is_note || name === 'หมายเหตุ') && value) return `หมายเหตุ: ${value}`
    if (value && value !== name) return `${name}: ${value}`
    if (modifier.price && Number(modifier.price) !== 0) return `${name} (+฿${Number(modifier.price).toLocaleString()})`
    return name
  }
  const getModifierLines = (item: any) => {
    if (Array.isArray(item.selected_modifiers) && item.selected_modifiers.length > 0) {
      return item.selected_modifiers.map(formatModifierLabel).filter(Boolean)
    }
    return (item.modifiers || []).filter(Boolean)
  }
  const formatOrderTypeLabel = (type: string) => {
    if (type === 'dine-in' || type === 'dine_in') return 'ทานที่ร้าน (Dine-In)'
    if (type === 'takeaway') return 'สั่งกลับบ้าน (Takeaway)'
    if (type === 'delivery') return 'เดลิเวอรี่ (Delivery)'
    return type.replace(/_/g, ' ').toUpperCase()
  }
  const shouldPrintReceiptQr = String(orderSource || '').toLowerCase() === 'liff'
    && orderType === 'delivery'
    && ['cod', 'cash_on_delivery', 'cash-on-delivery'].includes(String(paymentMethod || '').toLowerCase())
    && !!receiptPaymentQrImage
  const story = receiptStoryMode && receiptStories && receiptStories.length > 0
    ? receiptStories[Math.floor(Math.random() * receiptStories.length)]
    : null
  return (
    <div ref={ref} className="bg-white text-black p-5 text-[17px] w-[326px] font-sans mx-auto shadow-sm border border-gray-200" style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', 'Tahoma', 'Arial', sans-serif", lineHeight: 1.38, letterSpacing: 0 }}>
      <div className="text-center mb-4">
        <h2 className="text-[34px] font-extrabold mb-1 leading-none">XYLEM</h2>
        <p className="text-[17px] leading-tight font-semibold">Cafe & Landscape</p>
        <p className="text-[17px] leading-tight font-bold">{locale === 'en' ? 'ใบเสร็จรับเงิน / Receipt' : locale === 'zh' ? 'ใบเสร็จรับเงิน / Receipt' : 'ใบเสร็จรับเงิน / Receipt'}</p>
      </div>

      <div className="mb-4 text-[17px] border-b-2 border-black border-dashed pb-3 font-semibold">
        <div className="flex justify-between"><span>Date:</span> <span>{new Date(timestamp).toLocaleString('th-TH')}</span></div>
        <div className="flex justify-between"><span>Type:</span> <span className="uppercase">{formatOrderTypeLabel(orderType)}</span></div>
        {orderType === 'delivery' && (
          <div className="mt-3 border-2 border-black p-3 text-center">
            <div className="text-[12px] font-black uppercase tracking-[0.1em] mb-1">ค่ายเดลิเวอรี่</div>
            <div className="text-[26px] font-extrabold leading-tight break-words">{formatDeliveryPlatformLabel(deliveryPlatform)}</div>
            {referenceName && <div className="mt-2 text-[20px] font-black break-words">เลข: {referenceName}</div>}
          </div>
        )}
        {tableNumber && <div className="flex justify-between"><span>Table:</span> <span>{tableNumber}</span></div>}
        <div className="flex justify-between"><span>Cashier:</span> <span>{cashierName}</span></div>
        {customerName && <div className="flex justify-between"><span>Customer:</span> <span>{customerName}</span></div>}
      </div>

      <div className="mb-4">
        <table className="w-full text-[17px]">
          <thead>
            <tr className="border-b border-black border-dashed">
              <th className="text-left font-normal pb-1">{locale === 'en' ? 'รายการ' : locale === 'zh' ? 'รายการ' : 'รายการ'}</th>
              <th className="text-center font-normal pb-1">{locale === 'en' ? 'quantity' : locale === 'zh' ? '数量' : 'จำนวน'}</th>
              <th className="text-right font-normal pb-1">{locale === 'en' ? 'ราคา' : locale === 'zh' ? 'ราคา' : 'ราคา'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <React.Fragment key={idx}>
                <tr>
                  <td className="py-1">
                    <div className="font-extrabold max-w-[170px] text-[20px] leading-tight">{item.name}</div>
                    {getModifierLines(item).map((m: string, i: number) => (
                      <div key={i} className="text-[15px] text-gray-700 pl-2 font-semibold">- {m}</div>
                    ))}
                    {item.discount_amount && item.discount_amount > 0 ? (
                      <div className="text-[14px] text-black pl-2 font-extrabold flex items-center">
                        <span className="inline-block border border-black rounded px-1 py-0.5 leading-none mr-1 bg-gray-100">ส่วนลด</span>
                        -฿{item.discount_amount.toLocaleString()} {item.discount_reason ? `(${item.discount_reason})` : ''}
                      </div>
                    ) : null}
                  </td>
                  <td className="text-center align-top py-1 font-black text-[20px]">{item.quantity}</td>
                  <td className="text-right align-top py-1 font-black text-[19px]">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{(item.subtotal ?? (Number(item.sale_price || 0) * Number(item.quantity || 0))).toLocaleString()}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-black border-dashed pt-3 mb-4 text-[17px] font-semibold">
        <div className="flex justify-between mb-1"><span>Subtotal:</span> <span>{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{subtotal.toLocaleString()}</span></div>
        {discount > 0 && <div className="flex justify-between mb-1"><span>Discount:</span> <span>{locale === 'en' ? '-฿' : locale === 'zh' ? '-฿' : '-฿'}{discount.toLocaleString()}</span></div>}
        {serviceCharge > 0 && <div className="flex justify-between mb-1"><span>Service Charge:</span> <span>{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{serviceCharge.toLocaleString()}</span></div>}
        {tax > 0 && <div className="flex justify-between mb-1"><span>VAT (Included):</span> <span>{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{tax.toLocaleString()}</span></div>}
        <div className="flex justify-between mt-3 pt-3 border-t-2 border-black border-dashed font-extrabold text-[25px] leading-none">
          <span>ยอดรวม:</span> <span>{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{total.toLocaleString()}</span>
        </div>
      </div>

      <div className="border-t-2 border-black border-dashed pt-3 mb-6 text-[17px] font-semibold">
        <div className="flex justify-between mb-1"><span>Payment ({paymentMethod.toUpperCase()}):</span> <span>{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{paidAmount.toLocaleString()}</span></div>
        <div className="flex justify-between"><span>Change:</span> <span>{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{change.toLocaleString()}</span></div>
      </div>

      <div className="text-center text-[17px] space-y-1 font-semibold">
        {receiptFooter ? (
          <div className="whitespace-pre-wrap">{receiptFooter}</div>
        ) : (
          <>
            <p>Thank you for visiting Xylem!</p>
            <p>Please come again.</p>
          </>
        )}
        {story && (
          <div className="mt-4 pt-3 border-t border-dashed border-black text-left">
            <p className="text-[18px] font-bold text-center mb-2">{story.title}</p>
            <p className="whitespace-pre-wrap leading-relaxed">{story.content}</p>
          </div>
        )}
        {shouldPrintReceiptQr && (
          <div className="mt-4 pt-3 border-t border-dashed border-black text-center">
            <p className="text-[16px] font-black mb-3">สแกน QR ชำระเงิน</p>
            <div className="flex justify-center">
              <img src={receiptPaymentQrImage} alt="Payment QR" className="w-[180px] h-auto object-contain" />
            </div>
          </div>
        )}
        <p className="text-[12px] mt-4 text-gray-400">Powered by Xylem POS</p>
      </div>
    </div>
  )
})

POSReceipt.displayName = 'POSReceipt'
