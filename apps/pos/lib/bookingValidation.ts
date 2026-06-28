export type BookingValidationErrors = Partial<Record<
  'full_name' | 'email' | 'phone' | 'date' | 'time' | 'attendees_count' | 'topic' | 'notes' | 'workshop_language',
  string
>>

export function validateBooking(input: {
  full_name?: string
  email?: string
  phone?: string
  date?: string
  start_time?: string
  end_time?: string
  attendees_count?: number
  topic?: string
  notes?: string
  workshop_language?: 'th' | 'en'
}): { valid: boolean; errors: BookingValidationErrors } {
  const errors: BookingValidationErrors = {}

  const name = (input.full_name || '').trim()
  if (!name) errors.full_name = 'กรุณากรอกชื่อ-นามสกุล'
  else if (name.length < 2) errors.full_name = 'ชื่อสั้นเกินไป'

  const email = (input.email || '').trim()
  const emailOk = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email)
  if (!email) errors.email = 'กรุณากรอกอีเมล'
  else if (!emailOk) errors.email = 'อีเมลไม่ถูกต้อง'

  const phone = (input.phone || '').trim()
  if (phone && !/^(\+66|0)[1-9][0-9\-\s]{8,14}$/.test(phone)) {
    errors.phone = 'เบอร์โทรศัพท์ไม่ถูกต้อง'
  }

  if (!input.date) errors.date = 'กรุณาเลือกวันที่'
  if (!input.start_time || !input.end_time) errors.time = 'กรุณาเลือกช่วงเวลา'

  const attendees = Number(input.attendees_count || 0)
  if (!(attendees >= 1 && attendees <= 8)) errors.attendees_count = 'จำนวนผู้เข้าร่วม 1-8 คน'

  if (!input.topic) errors.topic = 'กรุณาเลือกหัวข้อเวิร์กช็อป'

  if (input.notes && input.notes.length > 500) errors.notes = 'หมายเหตุต้องไม่เกิน 500 ตัวอักษร'

  if (!input.workshop_language) {
    errors.workshop_language = 'กรุณาเลือกภาษาของเวิร์กช็อป'
  } else if (!['th','en'].includes(input.workshop_language)) {
    errors.workshop_language = 'ภาษาไม่ถูกต้อง'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
