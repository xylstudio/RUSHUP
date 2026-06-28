/**
 * Example: Service Booking Form with React Hook Form
 * 
 * Shows complex form with multiple fields, conditional rendering,
 * and async validation.
 */

'use client'

import { useServiceBookingForm } from '@/lib/hooks/useForms'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useFormErrors } from '@/lib/hooks/useForms'
import { useState } from 'react'

/**
 * This form demonstrates:
 * - Multiple input types (text, select, number, date, textarea)
 * - Conditional field display
 * - Real-time validation feedback
 * - Async API submission
 * - Loading states
 */

export default function ServiceBookingFormExample() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useServiceBookingForm()
  const { getFieldError } = useFormErrors(errors)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Watch pricing period to show conditional fields
  const pricingPeriod = watch('pricingPeriod')

  const onSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (response.ok) {
        setSubmitSuccess(true)
      }
    } catch (error) {
      console.error('Booking failed', error)
    }
  }

  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-[#2A4532]">บัญชีการสั่งใช้บริการ</h2>
        <p className="text-[#70706B] mt-2">เราได้รับคำขอของคุณแล้ว แล้วจะติดต่อกลับภายในอีก 2 ชั่วโมง</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-lg">
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">สั่งใช้บริการ</h1>
      <p className="text-sm text-[#70706B] mb-6">กรอกข้อมูลเพื่อสั่งบริการ</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Row 1: House & Service */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="บ้านของคุณ"
            error={getFieldError('houseCode')}
            options={[
              { value: 'HOUSE001', label: 'บ้านที่วัง' },
              { value: 'HOUSE002', label: 'บ้านเก่า' },
            ]}
            {...register('houseCode')}
          />

          <Select
            label="บริการที่ต้องการ"
            error={getFieldError('serviceCode')}
            options={[
              { value: 'SVC001', label: 'ตัดหญ้า' },
              { value: 'SVC002', label: 'ตัดต้นไม้' },
              { value: 'SVC003', label: 'จัดการสวน' },
            ]}
            {...register('serviceCode')}
          />
        </div>

        {/* Row 2: Area & Template */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="พื้นที่ (ตร.ม.)"
            type="number"
            min="1"
            error={getFieldError('serviceArea')}
            {...register('serviceArea', { valueAsNumber: true })}
          />

          <Select
            label="แพ็กเกจราคา"
            error={getFieldError('templateId')}
            options={[
              { value: 'PKG001', label: 'ชำระเดือนละ ฿1,500' },
              { value: 'PKG002', label: 'ชำระปีละ ฿15,000' },
              { value: 'PKG003', label: 'ชำระครั้งเดียว ฿3,000' },
            ]}
            {...register('templateId')}
          />
        </div>

        {/* Pricing Period */}
        <Select
          label="ระยะเวลาการชำระ"
          error={getFieldError('pricingPeriod')}
          options={[
            { value: 'monthly', label: 'รายเดือน' },
            { value: 'yearly', label: 'รายปี' },
            { value: 'one-time', label: 'ครั้งเดียว' },
          ]}
          {...register('pricingPeriod')}
        />

        {/* Conditional: Show price based on period */}
        {pricingPeriod === 'monthly' && (
          <div className="p-4 bg-[#F7F7F2] rounded-2xl">
            <p className="text-sm text-[#70706B]">ราคารายเดือน: <span className="font-bold text-[#1A1A1A]">฿1,500</span></p>
          </div>
        )}

        {/* Scheduled Date */}
        <Input
          label="วันที่ต้องการเริ่มบริการ"
          type="date"
          error={getFieldError('scheduledDate')}
          {...register('scheduledDate')}
        />

        {/* Additional Notes */}
        <Textarea
          label="หมายเหตุเพิ่มเติม (ตัวเลือก)"
          placeholder="บอกเราทีว่าต้องการให้ทำอะไรพิเศษ..."
          error={getFieldError('additionalNotes')}
          characterLimit={500}
          {...register('additionalNotes')}
        />

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอบริการ'}
          </Button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
        <p className="text-xs text-blue-700">
          💡 <strong>เคล็ดลับ:</strong> ฟอร์มนี้มีการตรวจสอบข้อมูลอัตโนมัติเมื่อคุณเติมารูปแบบ ถ้าข้อมูลไม่ถูกต้อง จะสีแดงได้ทันที
        </p>
      </div>
    </div>
  )
}
