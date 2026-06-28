'use client';
import { useI18n } from '@/lib/I18nContext';

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type CustomerRow = {
  id: string
  display_name?: string | null
  email?: string | null
  customer_base_code?: string | null
}

type HouseRow = {
  id: string
  customer_id?: string | null
  user_id?: string | null
  name?: string | null
  address?: string | null
  house_code?: string | null
  area_size?: number | null
}

type ServiceRow = {
  id: string
  service_name?: string | null
  name?: string | null
  billing_type?: string | null
}

type PriceTemplateRow = {
  id: string
  service_id: string
  template_name?: string | null
  area_min?: number | null
  area_max?: number | null
  base_price?: number | null
  price_per_unit?: number | null
}

type AdditionalServiceRow = {
  id: string
  service_name?: string | null
  category?: string | null
  price?: number | null
}

type PriorityLevel = 'normal' | 'high' | 'urgent'

const formatTHB = (value: number) =>
  new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)

export default function AdminCreateOrderPage() {
    const { locale } = useI18n();
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [houses, setHouses] = useState<HouseRow[]>([])
  const [services, setServices] = useState<ServiceRow[]>([])
  const [templates, setTemplates] = useState<PriceTemplateRow[]>([])
  const [additionalServices, setAdditionalServices] = useState<AdditionalServiceRow[]>([])

  const [customerId, setCustomerId] = useState('')
  const [houseId, setHouseId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [priceTemplateId, setPriceTemplateId] = useState('')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10))
  const [preferredTimeStart, setPreferredTimeStart] = useState('')
  const [preferredTimeEnd, setPreferredTimeEnd] = useState('')
  const [priority, setPriority] = useState<PriorityLevel>('normal')
  const [notes, setNotes] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [additionalQtyById, setAdditionalQtyById] = useState<Record<string, number>>({})
  const [pricingPeriod, setPricingPeriod] = useState('one-time')
  const [totalSessions, setTotalSessions] = useState(1)
  const [manualTotalPrice, setManualTotalPrice] = useState<string>('')

  const selectedHouse = useMemo(() => houses.find((h) => h.id === houseId) || null, [houses, houseId])

  const customerHouses = useMemo(
    () => houses.filter((house) => house.customer_id === customerId || house.user_id === customerId),
    [houses, customerId]
  )

  const serviceTemplates = useMemo(
    () => templates.filter((template) => template.service_id === serviceId),
    [templates, serviceId]
  )

  const selectedTemplate = useMemo(
    () => serviceTemplates.find((template) => template.id === priceTemplateId) || null,
    [serviceTemplates, priceTemplateId]
  )

  const selectedArea = Number(selectedHouse?.area_size || 0)
  const basePrice = Number(selectedTemplate?.base_price || 0)
  const unitPrice = Number(selectedTemplate?.price_per_unit || 0)
  
  const isManualPrice = manualTotalPrice.trim() !== '' && !Number.isNaN(Number(manualTotalPrice)) && Number(manualTotalPrice) >= 0
  const calculatedPrice = isManualPrice 
    ? Number(manualTotalPrice) 
    : basePrice + Math.max(0, selectedArea) * unitPrice

  const additionalRows = useMemo(
    () =>
      additionalServices
        .map((service) => ({
          ...service,
          qty: Number(additionalQtyById[service.id] || 0),
          unitPrice: Number(service.price || 0),
        }))
        .filter((row) => row.qty > 0),
    [additionalServices, additionalQtyById]
  )

  const additionalTotal = additionalRows.reduce((sum, row) => sum + row.qty * row.unitPrice, 0)
  const multiplier = priority === 'high' ? 1.1 : priority === 'urgent' ? 1.2 : 1
  const estimatedTotal = (calculatedPrice + additionalTotal) * multiplier

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const response = await fetch('/api/admin/orders/create', {
          method: 'GET',
          headers: {
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          credentials: 'include',
          cache: 'no-store',
        })

        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(result?.error || 'โหลดข้อมูลสำหรับสร้างออเดอร์ไม่สำเร็จ')
        }

        setCustomers((result?.customers || []) as CustomerRow[])
        setHouses((result?.houses || []) as HouseRow[])
        setServices((result?.services || []) as ServiceRow[])
        setTemplates((result?.priceTemplates || []) as PriceTemplateRow[])
        setAdditionalServices((result?.additionalServices || []) as AdditionalServiceRow[])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  useEffect(() => {
    if (!customerId) {
      setHouseId('')
      return
    }
    if (!customerHouses.some((house) => house.id === houseId)) {
      setHouseId('')
    }
  }, [customerId, customerHouses, houseId])

  useEffect(() => {
    if (!serviceId) {
      setPriceTemplateId('')
      return
    }

    const area = Math.max(0, selectedArea)
    const matched = serviceTemplates.find((template) => {
      const min = Number(template.area_min ?? 0)
      const max = Number(template.area_max ?? 999999)
      return area >= min && area <= max
    })

    setPriceTemplateId((prev) => {
      if (serviceTemplates.some((template) => template.id === prev)) return prev
      return matched?.id || serviceTemplates[0]?.id || ''
    })
  }, [serviceId, serviceTemplates, selectedArea])

  const handleQtyChange = (id: string, value: string) => {
    const next = Number(value)
    setAdditionalQtyById((prev) => ({
      ...prev,
      [id]: Number.isFinite(next) && next > 0 ? Math.floor(next) : 0,
    }))
  }

  const handleCreateOrder = async () => {
    if (!customerId || !houseId || !serviceId || !priceTemplateId || !scheduledDate) {
      setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบ')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          customerId,
          houseId,
          serviceId,
          priceTemplateId,
          scheduledDate,
          preferredTimeStart: preferredTimeStart || null,
          preferredTimeEnd: preferredTimeEnd || null,
          priority,
          pricingPeriod,
          sessionsPerPeriod: pricingPeriod === 'one-time' ? 1 : totalSessions,
          totalSessions: pricingPeriod === 'one-time' ? 1 : totalSessions,
          manualTotalPrice: isManualPrice ? Number(manualTotalPrice) : undefined,
          notes: notes.trim() || null,
          specialInstructions: specialInstructions.trim() || null,
          paymentMethod,
          additionalServices: additionalRows.map((row) => ({ id: row.id, quantity: row.qty })),
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.orderId) {
        throw new Error(result?.error || 'สร้างออเดอร์ไม่สำเร็จ')
      }

      router.push(`/dashboard/admin/orders/${result.orderId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'สร้างออเดอร์ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">Admin Order</div>
          <h1 className="mt-1 text-3xl font-semibold text-gray-900">{locale === 'en' ? 'Create Order on Behalf of Customer' : locale === 'zh' ? '代客户创建订单' : 'สร้างออเดอร์แทนลูกค้า'}</h1>
          <p className="mt-2 text-sm text-gray-600">{locale === 'en' ? 'Select customer, property, service, and pricing terms to quickly create an order.' : locale === 'zh' ? '选择客户、房产、服务和定价条款，以快速创建订单。' : 'เลือกข้อมูลลูกค้า บ้าน บริการ และเงื่อนไขราคา จากนั้นสร้างออเดอร์ได้ทันที'}</p>
        </div>
        <Link href="/dashboard/admin/orders" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900">
          {locale === 'en' ? 'Return to the work orders page.' : locale === 'zh' ? '返回工单页面。' : '           กลับหน้าคำสั่งงาน         '}</Link>
      </div>

      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        {loading ? (
          <div className="text-sm text-gray-600">{locale === 'en' ? 'Loading data...' : locale === 'zh' ? '正在加载数据...' : 'กำลังโหลดข้อมูล...'}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">{locale === 'en' ? 'customer' : locale === 'zh' ? '顾客' : 'ลูกค้า'}</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">{locale === 'en' ? '-- Select customer --' : locale === 'zh' ? '-- 选择客户 --' : '-- เลือกลูกค้า --'}</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.display_name || customer.email || customer.id}
                      {customer.customer_base_code ? ` (${customer.customer_base_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">{locale === 'en' ? 'customer\'s home' : locale === 'zh' ? '客户家' : 'บ้านของลูกค้า'}</label>
                <select
                  value={houseId}
                  onChange={(e) => setHouseId(e.target.value)}
                  disabled={!customerId}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100"
                >
                  <option value="">{locale === 'en' ? '-- Choose a house --' : locale === 'zh' ? '-- 选择房子 --' : '-- เลือกบ้าน --'}</option>
                  {customerHouses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name || house.house_code || house.id.slice(0, 8)}
                      {house.area_size ? ` (${house.area_size} ตร.ม.)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">{locale === 'en' ? 'serve' : locale === 'zh' ? '服务' : 'บริการ'}</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">{locale === 'en' ? '-- Select service --' : locale === 'zh' ? '-- 选择服务 --' : '-- เลือกบริการ --'}</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.service_name || service.name || service.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">{locale === 'en' ? 'Price package' : locale === 'zh' ? '价格套餐' : 'แพ็กเกจราคา'}</label>
                <select
                  value={priceTemplateId}
                  onChange={(e) => setPriceTemplateId(e.target.value)}
                  disabled={!serviceId}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100"
                >
                  <option value="">{locale === 'en' ? '-- Choose a package --' : locale === 'zh' ? '-- 选择套餐 --' : '-- เลือกแพ็กเกจ --'}</option>
                  {serviceTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.template_name || `พื้นที่ ${template.area_min || 0}-${template.area_max || 0}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">{locale === 'en' ? 'Service format' : locale === 'zh' ? '服务形式' : 'รูปแบบบริการ'}</label>
                <select
                  value={pricingPeriod}
                  onChange={(e) => setPricingPeriod(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="one-time">{locale === 'en' ? 'One-time' : locale === 'zh' ? '一度' : 'รายครั้ง (One-time)'}</option>
                  <option value="monthly">{locale === 'en' ? 'Monthly (Monthly)' : locale === 'zh' ? '每月（每月）' : 'รายเดือน (Monthly)'}</option>
                  <option value="yearly">{locale === 'en' ? 'Yearly (Yearly)' : locale === 'zh' ? '每年（每年）' : 'รายปี (Yearly)'}</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">{locale === 'en' ? 'Total number of times' : locale === 'zh' ? '总次数' : 'จำนวนครั้งทั้งหมด'}</label>
                <input
                  type="number"
                  min="1"
                  value={totalSessions}
                  onChange={(e) => setTotalSessions(Number(e.target.value) || 1)}
                  disabled={pricingPeriod === 'one-time'}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">{locale === 'en' ? 'ราคาสุทธิแบบเหมา (กำหนดเอง)' : locale === 'zh' ? 'ราคาสุทธิแบบเหมา (กำหนดเอง)' : 'ราคาสุทธิแบบเหมา (กำหนดเอง)'}</label>
                <input
                  type="number"
                  min="0"
                  value={manualTotalPrice}
                  onChange={(e) => setManualTotalPrice(e.target.value)}
                  placeholder={locale === 'en' ? 'Leave blank to calculate by area.' : locale === 'zh' ? '留空以按面积计算。' : 'เว้นว่างเพื่อคำนวณตามพื้นที่'}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm border-blue-300 bg-blue-50 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">{locale === 'en' ? 'Appointment date' : locale === 'zh' ? '预约日期' : 'วันที่นัดหมาย'}</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">{locale === 'en' ? 'Start time' : locale === 'zh' ? '开始时间' : 'เวลาเริ่ม'}</label>
                <input
                  type="time"
                  value={preferredTimeStart}
                  onChange={(e) => setPreferredTimeStart(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">{locale === 'en' ? 'end time' : locale === 'zh' ? '结束时间' : 'เวลาสิ้นสุด'}</label>
                <input
                  type="time"
                  value={preferredTimeEnd}
                  onChange={(e) => setPreferredTimeEnd(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">{locale === 'en' ? 'urgency' : locale === 'zh' ? '紧迫性' : 'ความเร่งด่วน'}</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="normal">{locale === 'en' ? 'normal' : locale === 'zh' ? '普通的' : 'ปกติ'}</option>
                  <option value="high">{locale === 'en' ? 'Urgent (+10%)' : locale === 'zh' ? '紧急（+10%）' : 'ด่วน (+10%)'}</option>
                  <option value="urgent">{locale === 'en' ? 'Very urgent (+20%)' : locale === 'zh' ? '非常紧急 (+20%)' : 'เร่งด่วนมาก (+20%)'}</option>
                </select>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-900">{locale === 'en' ? 'Additional services (if any)' : locale === 'zh' ? '附加服务（如有）' : 'บริการเสริม (ถ้ามี)'}</label>
                <span className="text-xs text-gray-500">{locale === 'en' ? 'Add the quantity and the system will automatically calculate the price.' : locale === 'zh' ? '添加数量，系统会自动计算价格。' : 'เพิ่มจำนวนแล้วระบบจะคำนวณราคาให้อัตโนมัติ'}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {additionalServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{service.service_name || 'บริการเสริม'}</p>
                      <p className="text-xs text-gray-500">
                        {service.category || '-'} • {formatTHB(Number(service.price || 0))}{locale === 'en' ? '/unit' : locale === 'zh' ? '/单元' : '/หน่วย                       '}</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={additionalQtyById[service.id] || 0}
                      onChange={(e) => handleQtyChange(service.id, e.target.value)}
                      className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 text-right text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">{locale === 'en' ? 'Note to the team' : locale === 'zh' ? '团队注意事项' : 'หมายเหตุถึงทีม'}</label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                  placeholder={locale === 'en' ? 'For example, areas where there are pets in the garden. Must inform before entering the area.' : locale === 'zh' ? '例如，花园里有宠物的区域。进入该区域前必须告知。' : 'เช่น พื้นที่มีสัตว์เลี้ยงในสวน ต้องแจ้งก่อนเข้าพื้นที่'}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-900">{locale === 'en' ? 'Special orders/payments' : locale === 'zh' ? '特殊订单/付款' : 'คำสั่งพิเศษ / การชำระเงิน'}</label>
                <textarea
                  rows={4}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                  placeholder={locale === 'en' ? 'Supplementary information for documents or work' : locale === 'zh' ? '文件或工作的补充信息' : 'ข้อมูลเสริมสำหรับเอกสารหรือการทำงาน'}
                />
                <div className="mt-2 flex gap-2">
                  {['bank_transfer', 'promptpay', 'cash'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        paymentMethod === method ? 'bg-gray-900 text-white' : 'border border-gray-300 bg-white text-gray-600'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm">
              <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                <div>{locale === 'en' ? 'area:' : locale === 'zh' ? '区域：' : 'พื้นที่: '}<span className="font-semibold">{selectedArea || 0} {locale === 'en' ? 'sq m.' : locale === 'zh' ? '平方米。' : ' ตร.ม.'}</span></div>
                <div>{locale === 'en' ? 'Base price:' : locale === 'zh' ? '基价：' : 'ฐานราคา: '}<span className="font-semibold">{formatTHB(basePrice)}</span></div>
                <div>{locale === 'en' ? 'Calculate by area:' : locale === 'zh' ? '按面积计算：' : 'คำนวณตามพื้นที่: '}<span className="font-semibold">{formatTHB(calculatedPrice)}</span></div>
                <div>{locale === 'en' ? 'Additional services:' : locale === 'zh' ? '附加服务：' : 'บริการเสริม: '}<span className="font-semibold">{formatTHB(additionalTotal)}</span></div>
                <div>{locale === 'en' ? 'Urgency Multiplier:' : locale === 'zh' ? '紧急程度乘数：' : 'ตัวคูณความเร่งด่วน: '}<span className="font-semibold">x{multiplier.toFixed(2)}</span></div>
                <div>{locale === 'en' ? 'Estimated total:' : locale === 'zh' ? '预计总数：' : 'ยอดรวมประมาณการ: '}<span className="font-bold text-gray-900">{formatTHB(estimatedTotal)}</span></div>
              </div>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleCreateOrder()}
                disabled={saving}
                className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'กำลังสร้างออเดอร์...' : 'สร้างออเดอร์ทันที'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
