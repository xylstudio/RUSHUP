import React, { forwardRef } from 'react'
import { useI18n } from "@/lib/I18nContext";

export interface KitchenTicketProps {
  orderNumber: string
  queueNumber?: string
  orderType: string
  tableNumber?: string
  deliveryPlatform?: string
  referenceName?: string
  comment?: string
  pickupTime?: string
  items: any[]
  timestamp: string
}

export const POSKitchenTicket = forwardRef<HTMLDivElement, KitchenTicketProps>(({
  orderNumber,
  queueNumber,
  orderType,
  tableNumber,
  deliveryPlatform,
  referenceName,
  comment,
  pickupTime,
  items,
  timestamp,
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
  const getPickupTime = () => {
    const explicit = String(pickupTime || '').trim()
    if (explicit) return explicit
    const raw = String(comment || '')
    const pickupMatch = raw.match(/(?:เวลารับ|pickup\s*time)\s*:\s*([^\n]+)/i)
    return pickupMatch?.[1]?.trim() || ''
  }
  const getOrderNote = () => {
    const raw = String(comment || '').trim()
    if (!raw) return ''
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^(?:เวลารับ|pickup\s*time)\s*:/i.test(line))
      .join('\n')
  }
  const pickupTimeLabel = getPickupTime()
  const orderNote = getOrderNote()
  return (
    <div ref={ref} className="bg-white text-black p-5 text-[18px] w-[326px] font-sans mx-auto shadow-sm border border-gray-200">
      <div className="text-center mb-4 border-b border-black pb-2">
        <h2 className="text-3xl font-black mb-1 leading-none">{locale === 'en' ? 'ใบสั่งออเดอร์' : locale === 'zh' ? 'ใบสั่งออเดอร์' : 'ใบสั่งออเดอร์'}</h2>
        <div className="text-2xl font-black mt-2 uppercase leading-tight">{formatOrderTypeLabel(orderType)}</div>
      </div>

      <div className="mb-4 text-[18px] font-bold border-b-2 border-black pb-3">
        <div className="border-[3px] border-black px-3 py-4 mb-3 text-center">
          {orderType === 'delivery' ? (
            <>
              <div className="text-[13px] font-black uppercase tracking-[0.25em] mb-2">ค่ายเดลิเวอรี่</div>
              <div className="text-3xl font-black leading-tight break-words">{formatDeliveryPlatformLabel(deliveryPlatform)}</div>
              <div className="mt-3 text-[13px] font-black uppercase tracking-[0.25em] mb-1">เลข</div>
              <div className="text-4xl font-black leading-tight break-words">{referenceName || '-'}</div>
            </>
          ) : orderType === 'dine-in' || orderType === 'dine_in' ? (
            <>
              <div className="text-[13px] font-black uppercase tracking-[0.25em] mb-1">โต๊ะ</div>
              <div className="text-6xl font-black leading-none break-words">{tableNumber || '-'}</div>
            </>
          ) : (
            <>
              <div className="text-[15px] font-black uppercase tracking-[0.25em] mb-1">TAKEAWAY</div>
              <div className="text-6xl font-black leading-none break-words">{queueNumber || '-'}</div>
              <div className="mt-2 text-[15px] font-black">เลขคิว</div>
            </>
          )}
        </div>
        {orderType !== 'delivery' && (
          <div className="flex justify-between"><span>เลขบิลระบบ:</span> <span>{orderNumber}</span></div>
        )}
        <div className="flex justify-between"><span>Date:</span> <span>{new Date(timestamp).toLocaleString('th-TH')}</span></div>
        {(pickupTimeLabel || orderNote) && (
          <div className="mt-3 border border-dashed border-black px-3 py-2 text-left">
            <div className="text-[12px] font-black uppercase tracking-[0.12em] mb-1 text-center">ข้อมูลเพิ่มเติม</div>
            {pickupTimeLabel && <div className="text-[18px] font-black">เวลารับ: {pickupTimeLabel}</div>}
            {orderNote && <div className="whitespace-pre-wrap text-[16px] font-semibold">{orderNote}</div>}
          </div>
        )}
      </div>

      <div className="mb-4">
        <table className="w-full text-[18px] font-bold">
          <thead>
            <tr className="border-b border-black">
              <th className="text-center w-12 pb-2">{locale === 'en' ? 'quantity' : locale === 'zh' ? '数量' : 'จำนวน'}</th>
              <th className="text-left pb-2 pl-2">{locale === 'en' ? 'รายการ' : locale === 'zh' ? 'รายการ' : 'รายการ'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <React.Fragment key={idx}>
                <tr>
                  <td className="text-center align-top py-2 border-b border-dashed border-gray-400 text-3xl font-black">{item.quantity}</td>
                  <td className="py-2 pl-2 border-b border-dashed border-gray-400">
                    <div className="font-black text-2xl leading-tight">{item.name}</div>
                    {getModifierLines(item).map((m: string, i: number) => (
                      <div key={i} className="text-[17px] text-gray-800 font-semibold">- {m}</div>
                    ))}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-center mt-8 text-sm font-black">
        <p>{locale === 'en' ? '--- สิ้นสุดออเดอร์ ---' : locale === 'zh' ? '--- สิ้นสุดออเดอร์ ---' : '--- สิ้นสุดออเดอร์ ---'}</p>
      </div>
    </div>
  )
})

POSKitchenTicket.displayName = 'POSKitchenTicket'
