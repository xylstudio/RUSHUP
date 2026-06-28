import type { SupabaseClient } from '@supabase/supabase-js'

export const MAX_SELF_SERVICE_RESCHEDULES = 2

export type RescheduleOrderRecord = {
  id: string
  customer_id: string
  scheduled_date: string
  preferred_time_start: string | null
  preferred_time_end: string | null
  status: string
  house_id: string | null
  profiles?: {
    display_name?: string | null
    line_user_id?: string | null
    email?: string | null
  } | null
  services?: {
    service_name?: string | null
  } | null
}

export const formatThaiDate = (value: string) =>
  new Date(value).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

export const formatThaiTime = (value: string | null | undefined) => (value || '').slice(0, 5)

export const buildAppointmentTimestamp = (date: string, time: string | null | undefined) => {
  const normalizedTime = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : '09:00'
  return new Date(`${date}T${normalizedTime}:00+07:00`)
}

const isHourSlot = (start: string, end: string) => {
  const startMatch = start.match(/^(\d{2}):(\d{2})/)
  const endMatch = end.match(/^(\d{2}):(\d{2})/)
  if (!startMatch || !endMatch) return false

  const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2])
  const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2])
  return startMinutes >= 9 * 60 && endMinutes <= 18 * 60 && endMinutes - startMinutes === 60
}

export const getCustomerRescheduleOrder = async (supabase: SupabaseClient, orderId: string) => {
  // Try finding by ID first
  let { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  // If not found, try finding by order_code
  if (!data && !error) {
    const { data: byCode, error: codeError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_code', orderId)
      .maybeSingle()
    
    data = byCode
    error = codeError
  }

  if (data) {
    // Attempt to fetch profile and service separately to be safe
    const [pRes, sRes] = await Promise.all([
      supabase.from('profiles').select('display_name, line_user_id, email').eq('id', data.customer_id).maybeSingle(),
      data.service_id ? supabase.from('services').select('service_name').eq('id', data.service_id).maybeSingle() : Promise.resolve({ data: null })
    ])
    
    data.profiles = pRes.data
    data.services = sRes.data
  }

  return {
    data: (data as any as RescheduleOrderRecord | null) ?? null,
    error,
  }
}

export const listAvailableRescheduleSlots = async (supabase: SupabaseClient, scheduledDate: string) => {
  const { data, error } = await supabase
    .from('schedules')
    .select('id, date, start_time, end_time')
    .eq('date', scheduledDate)
    .eq('is_available', true)
    .order('start_time', { ascending: true })

  if (error) throw error

  if (data && data.length > 0) {
    return data
  }

  return Array.from({ length: 8 }).map((_, i) => {
    const startHour = 9 + i
    const pad = (n: number) => String(n).padStart(2, '0')
    return {
      id: `default-${scheduledDate}-${startHour}`,
      date: scheduledDate,
      start_time: `${pad(startHour)}:00`,
      end_time: `${pad(startHour + 1)}:00`,
    }
  })
}

export const ensureLineOwnsOrder = async (supabase: SupabaseClient, orderId: string, lineUserId: string) => {
  const { data: order, error } = await getCustomerRescheduleOrder(supabase, orderId)
  if (error || !order) {
    return { order: null, customerId: null, reason: 'order_not_found' as const }
  }

  const linkedLineUserId = (order.profiles?.line_user_id || '').trim()
  const emailDerivedLineUserId = (order.profiles?.email || '').endsWith('@line.xylemlandscape.com')
    ? String(order.profiles?.email).split('@')[0]
    : ''

  if (linkedLineUserId !== lineUserId && emailDerivedLineUserId !== lineUserId) {
    return { order, customerId: null, reason: 'forbidden' as const }
  }

  return { order, customerId: order.customer_id, reason: null }
}

export const executeCustomerReschedule = async (args: {
  supabase: SupabaseClient
  orderId: string
  actorCustomerId: string
  scheduledDate: string
  preferredTimeStart?: string | null
  preferredTimeEnd?: string | null
  reason: string
  notes?: string
  customerSuccessTitle?: string
}) => {
  const { supabase, orderId, actorCustomerId, scheduledDate, preferredTimeStart, preferredTimeEnd, reason, notes = '', customerSuccessTitle } = args

  if (!scheduledDate || !reason) {
    return { ok: false as const, status: 400, error: 'Missing scheduled_date or reason' }
  }

  const { data: order, error: fetchError } = await getCustomerRescheduleOrder(supabase, orderId)
  if (fetchError || !order) {
    return { ok: false as const, status: 404, error: 'Order not found' }
  }

  if (order.customer_id !== actorCustomerId) {
    return { ok: false as const, status: 403, error: 'Forbidden' }
  }

  if (['completed', 'cancelled', 'in_service'].includes(order.status)) {
    return { ok: false as const, status: 409, error: 'Order is not eligible for self-service reschedule' }
  }

  const appointmentDate = new Date(`${scheduledDate}T00:00:00+07:00`)
  if (Number.isNaN(appointmentDate.getTime())) {
    return { ok: false as const, status: 400, error: 'Invalid scheduled_date' }
  }

  const now = new Date()
  const currentBangkokDateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  if (currentBangkokDateKey >= order.scheduled_date) {
    return { ok: false as const, status: 409, error: 'Appointments can only be rescheduled until the day before the scheduled date' }
  }

  if (preferredTimeStart && buildAppointmentTimestamp(scheduledDate, preferredTimeStart) <= now) {
    return { ok: false as const, status: 400, error: 'Please choose a future slot' }
  }

  const sameDate = order.scheduled_date === scheduledDate
  const sameTime = preferredTimeStart && (order.preferred_time_start || '').slice(0, 5) === preferredTimeStart.slice(0, 5)
  if (sameDate && (preferredTimeStart ? sameTime : true)) {
    // If only date changed, it's fine. If nothing changed, return error.
    if (sameDate && (!preferredTimeStart || sameTime)) {
       return { ok: false as const, status: 400, error: 'Please choose a different appointment date or slot' }
    }
  }

  const { count: rescheduleCount, error: countError } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('related_order_id', orderId)
    .eq('title', 'ลูกค้าเลื่อนนัดหมาย')

  if (countError) {
    throw countError
  }

  if ((rescheduleCount || 0) >= MAX_SELF_SERVICE_RESCHEDULES) {
    return { ok: false as const, status: 409, error: 'This appointment has reached the self-service reschedule limit' }
  }

  if (preferredTimeStart && preferredTimeEnd) {
    const { data: availableSlots, error: slotError } = await supabase
      .from('schedules')
      .select('id')
      .eq('date', scheduledDate)
      .eq('start_time', preferredTimeStart)
      .eq('end_time', preferredTimeEnd)
      .eq('is_available', true)
      .limit(1)
  
    if (slotError) {
      throw slotError
    }
  
    const allowFallbackSlot = (!availableSlots || availableSlots.length === 0) && isHourSlot(preferredTimeStart, preferredTimeEnd)
    if (!allowFallbackSlot && (!availableSlots || availableSlots.length === 0)) {
      return { ok: false as const, status: 409, error: 'Selected slot is no longer available' }
    }
  }

  const oldDate = order.scheduled_date
  const oldTimeStart = order.preferred_time_start
  const oldTimeEnd = order.preferred_time_end
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      scheduled_date: scheduledDate,
      preferred_time_start: preferredTimeStart || order.preferred_time_start,
      preferred_time_end: preferredTimeEnd || order.preferred_time_end,
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateError) throw updateError

  const customerName = order.profiles?.display_name || 'ลูกค้า'
  const serviceName = order.services?.service_name || 'บริการ'

  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (admins) {
    const previousWindow = oldTimeStart && oldTimeEnd
      ? `${formatThaiDate(oldDate)} เวลา ${formatThaiTime(oldTimeStart)}-${formatThaiTime(oldTimeEnd)}`
      : formatThaiDate(oldDate)
    const nextWindow = `${formatThaiDate(scheduledDate)} เวลา ${formatThaiTime(preferredTimeStart)}-${formatThaiTime(preferredTimeEnd)}`
    const reasonSuffix = reason ? ` เหตุผล: ${reason}` : ''
    const noteSuffix = notes ? ` หมายเหตุ: ${notes}` : ''
    await supabase.from('notifications').insert(
      admins.map((admin) => ({
        user_id: admin.id,
        title: 'ลูกค้าเลื่อนนัดหมาย',
        message: `คุณ ${customerName} เลื่อนนัด ${serviceName} จาก ${previousWindow} เป็น ${nextWindow}.${reasonSuffix}${noteSuffix}`,
        type: 'info',
        related_order_id: orderId,
        read: false,
        notification_category: 'order_status',
      })),
    )
  }

  await supabase.from('notifications').insert({
    user_id: actorCustomerId,
    title: customerSuccessTitle || 'ยืนยันการเลื่อนนัดสำเร็จ',
    message: `ระบบยืนยันวันใหม่ของ ${serviceName} เป็น ${formatThaiDate(scheduledDate)} เวลา ${formatThaiTime(preferredTimeStart)}-${formatThaiTime(preferredTimeEnd)}`,
    type: 'success',
    related_order_id: orderId,
    read: false,
    notification_category: 'order_status',
  })

  return {
    ok: true as const,
    status: 200,
    order,
    appointment: {
      scheduled_date: scheduledDate,
      preferred_time_start: preferredTimeStart,
      preferred_time_end: preferredTimeEnd,
    },
  }
}