import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { executeCustomerReschedule, formatThaiDate, formatThaiTime, ensureLineOwnsOrder, listAvailableRescheduleSlots } from '@/lib/server/orderReschedule'
import { replyLineMessages } from '@/lib/line'

export const dynamic = 'force-dynamic'

type LineWebhookEvent = {
  type: string
  replyToken?: string
  source?: {
    type?: string
    userId?: string
  }
  postback?: {
    data?: string
    params?: {
      date?: string
      time?: string
      datetime?: string
    }
  }
}

const createSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

const getChannelSecret = () => process.env.LINE_CHANNEL_SECRET || ''

const verifyLineSignature = (body: string, signature: string) => {
  const secret = getChannelSecret()
  if (!secret || !signature) return false

  const expected = createHmac('sha256', secret).update(body).digest('base64')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

const parsePostbackData = (data: string) => {
  const params = new URLSearchParams(data)
  return {
    action: params.get('action') || '',
    orderId: params.get('orderId') || '',
    date: params.get('date') || '',
    start: params.get('start') || '',
    end: params.get('end') || '',
  }
}

const buildStartDatePickerMessage = (args: { orderId: string; serviceName: string; currentDate: string }) => ({
  type: 'template',
  altText: 'เลือกวันนัดหมายใหม่',
  template: {
    type: 'buttons',
    title: 'เลื่อนนัดในแชต',
    text: `${args.serviceName}\nวันนัดปัจจุบัน: ${args.currentDate}\nเลือกวันใหม่จากปฏิทินด้านล่าง`,
    actions: [
      {
        type: 'datetimepicker',
        label: 'เลือกวันใหม่',
        data: `action=reschedule_pick_date&orderId=${encodeURIComponent(args.orderId)}`,
        mode: 'date',
        min: new Date().toISOString().slice(0, 10),
      },
      {
        type: 'postback',
        label: 'ยกเลิก',
        data: `action=reschedule_cancel&orderId=${encodeURIComponent(args.orderId)}`,
        displayText: 'ยกเลิกการเลื่อนนัด',
      },
    ],
  },
})

const buildSlotQuickReplyMessage = (args: { orderId: string; date: string; slots: Array<{ start_time: string; end_time: string }> }) => ({
  type: 'text',
  text: `เลือกช่วงเวลาที่ต้องการสำหรับวันที่ ${formatThaiDate(args.date)}`,
  quickReply: {
    items: args.slots.slice(0, 10).map((slot) => ({
      type: 'action',
      action: {
        type: 'postback',
        label: `${formatThaiTime(slot.start_time)}-${formatThaiTime(slot.end_time)}`,
        data: `action=reschedule_pick_slot&orderId=${encodeURIComponent(args.orderId)}&date=${encodeURIComponent(args.date)}&start=${encodeURIComponent(slot.start_time)}&end=${encodeURIComponent(slot.end_time)}`,
        displayText: `เลือกเวลา ${formatThaiTime(slot.start_time)}-${formatThaiTime(slot.end_time)}`,
      },
    })),
  },
})

const buildConfirmMessage = (args: { orderId: string; date: string; start: string; end: string }) => ({
  type: 'template',
  altText: 'ยืนยันการเลื่อนนัด',
  template: {
    type: 'confirm',
    text: `ยืนยันเลื่อนนัดเป็น\n${formatThaiDate(args.date)}\nเวลา ${formatThaiTime(args.start)}-${formatThaiTime(args.end)} ใช่หรือไม่`,
    actions: [
      {
        type: 'postback',
        label: 'ยืนยัน',
        data: `action=reschedule_confirm&orderId=${encodeURIComponent(args.orderId)}&date=${encodeURIComponent(args.date)}&start=${encodeURIComponent(args.start)}&end=${encodeURIComponent(args.end)}`,
        displayText: 'ยืนยันเลื่อนนัด',
      },
      {
        type: 'postback',
        label: 'เลือกใหม่',
        data: `action=reschedule_restart&orderId=${encodeURIComponent(args.orderId)}`,
        displayText: 'ขอเลือกใหม่',
      },
    ],
  },
})

const buildSimpleText = (text: string) => ({ type: 'text', text })

const handlePostbackEvent = async (supabase: ReturnType<typeof createSupabaseServiceClient>, event: LineWebhookEvent) => {
  const replyToken = event.replyToken || ''
  const lineUserId = event.source?.userId || ''
  const postbackData = parsePostbackData(event.postback?.data || '')

  if (!replyToken || !lineUserId || !postbackData.action || !postbackData.orderId) {
    return
  }

  const access = await ensureLineOwnsOrder(supabase, postbackData.orderId, lineUserId)
  if (!access.order || !access.customerId) {
    const deniedText = access.reason === 'forbidden'
      ? 'คุณไม่มีสิทธิ์จัดการนัดหมายนี้ผ่าน LINE'
      : 'ไม่พบรายการนัดหมายนี้ในระบบ'
    await replyLineMessages(replyToken, [buildSimpleText(deniedText)])
    return
  }

  const serviceName = access.order.services?.service_name || 'บริการดูแลสวน'

  if (postbackData.action === 'reschedule_start' || postbackData.action === 'reschedule_restart') {
    await replyLineMessages(replyToken, [
      buildStartDatePickerMessage({
        orderId: postbackData.orderId,
        serviceName,
        currentDate: formatThaiDate(access.order.scheduled_date),
      }),
    ])
    return
  }

  if (postbackData.action === 'reschedule_cancel') {
    await replyLineMessages(replyToken, [buildSimpleText('ยกเลิกการเลื่อนนัดแล้ว หากต้องการเปลี่ยนอีกครั้งสามารถกดปุ่มเลื่อนนัดจากข้อความเดิมได้เลย')])
    return
  }

  if (postbackData.action === 'reschedule_pick_date') {
    const pickedDate = event.postback?.params?.date || ''
    if (!pickedDate) {
      await replyLineMessages(replyToken, [buildSimpleText('ไม่พบวันที่ที่เลือก กรุณาลองใหม่อีกครั้ง')])
      return
    }

    const slots = await listAvailableRescheduleSlots(supabase, pickedDate)
    if (!slots.length) {
      await replyLineMessages(replyToken, [buildSimpleText(`ยังไม่มีช่วงเวลาว่างสำหรับวันที่ ${formatThaiDate(pickedDate)} กรุณาเลือกวันใหม่อีกครั้ง`), buildStartDatePickerMessage({ orderId: postbackData.orderId, serviceName, currentDate: formatThaiDate(access.order.scheduled_date) })])
      return
    }

    await replyLineMessages(replyToken, [buildSlotQuickReplyMessage({ orderId: postbackData.orderId, date: pickedDate, slots })])
    return
  }

  if (postbackData.action === 'reschedule_pick_slot') {
    if (!postbackData.date || !postbackData.start || !postbackData.end) {
      await replyLineMessages(replyToken, [buildSimpleText('ข้อมูลช่วงเวลาไม่ครบ กรุณาเลือกใหม่อีกครั้ง')])
      return
    }

    await replyLineMessages(replyToken, [buildConfirmMessage({
      orderId: postbackData.orderId,
      date: postbackData.date,
      start: postbackData.start,
      end: postbackData.end,
    })])
    return
  }

  if (postbackData.action === 'reschedule_confirm') {
    const result = await executeCustomerReschedule({
      supabase,
      orderId: postbackData.orderId,
      actorCustomerId: access.customerId,
      scheduledDate: postbackData.date,
      preferredTimeStart: postbackData.start,
      preferredTimeEnd: postbackData.end,
      reason: 'ลูกค้าเลื่อนนัดผ่าน LINE',
      notes: 'ยืนยันจาก LINE postback',
      customerSuccessTitle: 'ยืนยันการเลื่อนนัดจาก LINE สำเร็จ',
    })

    if (!result.ok) {
      await replyLineMessages(replyToken, [buildSimpleText(`ไม่สามารถเลื่อนนัดได้: ${result.error}`)])
      return
    }

    await replyLineMessages(replyToken, [buildSimpleText(`เลื่อนนัดสำเร็จ\n${formatThaiDate(result.appointment.scheduled_date)}\nเวลา ${formatThaiTime(result.appointment.preferred_time_start)}-${formatThaiTime(result.appointment.preferred_time_end)}\nทีมงานได้รับข้อมูลเรียบร้อยแล้ว`)] )
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-line-signature') || ''
  const rawBody = await req.text()

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const payload = JSON.parse(rawBody) as { events?: LineWebhookEvent[] }
    const events = Array.isArray(payload.events) ? payload.events : []
    const supabase = createSupabaseServiceClient()

    for (const event of events) {
      if (event.type === 'postback') {
        await handlePostbackEvent(supabase, event)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/line/webhook error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}