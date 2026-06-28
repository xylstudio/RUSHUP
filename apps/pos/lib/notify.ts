/**
 * notify.ts — Centralized notification helper
 *
 * All cross-user notifications go through these helpers.
 * They insert rows into the `notifications` table so Supabase Realtime
 * can push them to the target user's NotificationBell instantly.
 */

import { createNotificationWithRetry, supabase } from './supabaseClient'

type NotifyLineAction = {
  type: 'accept_job_assignment'
  job_assignment_id: string
  order_id?: string
  service_name?: string
  scheduled_date?: string
}

type NotifyUserOptions = {
  title?: string
  lineAction?: NotifyLineAction
  notificationCategory?: 'new_order' | 'job_assigned' | 'order_status' | 'system'
  suppressLine?: boolean
}

// ─────────────────────────────────────────
// Core insert helper (silent fail)
// ─────────────────────────────────────────
export async function notifyUser(
  userId: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  relatedOrderId?: string,
  options?: NotifyUserOptions
) {
  try {
    const payload: Record<string, unknown> = {
      user_id: userId,
      title: options?.title || null,
      message,
      type,
      related_order_id: relatedOrderId,
      read: false,
    }

    if (options?.lineAction) {
      payload.line_action = options.lineAction
    }

    payload.notification_category = options?.notificationCategory || 'system'

    if (options?.suppressLine) {
      payload.suppress_line = true
    }

    const { error } = await createNotificationWithRetry(payload, { context: 'notifyUser' })

    if (error) {
      console.error('notifyUser failed:', error)
    }
  } catch (error) {
    console.error('notifyUser error:', error)
  }
}

// ─────────────────────────────────────────
// Notify all admins
// ─────────────────────────────────────────
export async function notifyAdmins(
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  relatedOrderId?: string,
  options?: NotifyUserOptions
) {
  try {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (!admins || admins.length === 0) return

    await Promise.allSettled(
      admins.map((a: { id: string }) => notifyUser(a.id, message, type, relatedOrderId, options))
    )
  } catch (error) {
    console.error('notifyAdmins error:', error)
  }
}

// ─────────────────────────────────────────
// Convenience wrappers per event
// ─────────────────────────────────────────

/** ลูกค้าสั่งบริการใหม่ → แจ้ง admin */
export async function notifyNewOrder(
  orderId: string,
  customerName: string,
  serviceName: string
) {
  await notifyAdmins(
    `คำสั่งซื้อใหม่จาก ${customerName} • ${serviceName}`,
    'info',
    orderId,
    { notificationCategory: 'new_order' }
  )
}

/** Admin ยืนยัน order → แจ้งลูกค้า */
export async function notifyOrderConfirmed(
  customerId: string,
  orderId: string,
  orderCode?: string
) {
  await notifyUser(
    customerId,
    `คำสั่งซื้อ${orderCode ? ` #${orderCode}` : ''} ได้รับการยืนยันแล้ว`,
    'success',
    orderId,
    { notificationCategory: 'order_status' }
  )
}

/** Admin เปลี่ยนสถานะ → แจ้งลูกค้า */
export async function notifyOrderStatusChanged(
  customerId: string,
  orderId: string,
  newStatus: string,
  orderCode?: string
) {
  const msgs: Record<string, string> = {
    confirmed:   `คำสั่งซื้อ${orderCode ? ` #${orderCode}` : ''} ได้รับการยืนยันแล้ว`,
    in_progress: `คำสั่งซื้อ${orderCode ? ` #${orderCode}` : ''} กำลังดำเนินการ`,
    completed:   `คำสั่งซื้อ${orderCode ? ` #${orderCode}` : ''} เสร็จสิ้นแล้ว`,
    cancelled:   `คำสั่งซื้อ${orderCode ? ` #${orderCode}` : ''} ถูกยกเลิก`,
  }
  const msg = msgs[newStatus]
  if (!msg) return
  const notifType = newStatus === 'cancelled' ? 'error' : newStatus === 'completed' ? 'success' : 'info'
  await notifyUser(customerId, msg, notifType, orderId, { notificationCategory: 'order_status' })
}

/** Admin มอบหมายพนักงาน → แจ้งพนักงาน */
export async function notifyStaffAssigned(
  staffId: string,
  orderId: string,
  serviceName: string,
  scheduledDate?: string,
  assignmentId?: string
) {
  const dateStr = scheduledDate
    ? ` (${new Date(scheduledDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })})`
    : ''

  const lineAction = assignmentId
    ? {
        type: 'accept_job_assignment' as const,
        job_assignment_id: assignmentId,
        order_id: orderId,
        service_name: serviceName,
        scheduled_date: scheduledDate,
      }
    : undefined

  await notifyUser(
    staffId,
    `คุณได้รับมอบหมายงาน: ${serviceName}${dateStr}`,
    'info',
    orderId,
    {
      title: 'มีงานใหม่เข้าระบบ',
      lineAction,
      notificationCategory: 'job_assigned',
    }
  )
}

/** พนักงานเริ่มงาน → แจ้งลูกค้า + admin */
export async function notifyStaffStarted(
  customerId: string,
  orderId: string,
  staffName: string,
  serviceName: string
) {
  await Promise.allSettled([
    notifyUser(
      customerId,
      `${staffName} เริ่มดำเนินการ ${serviceName} แล้ว คุณสามารถติดตามความคืบหน้าได้จากหน้ารายละเอียดงาน`,
      'info',
      orderId,
      {
        title: 'ทีมงานเริ่มเข้าดูแลแล้ว',
        notificationCategory: 'order_status',
      }
    ),
    notifyAdmins(
      `${staffName} เริ่มงาน: ${serviceName}`,
      'info',
      orderId,
      { notificationCategory: 'system' }
    ),
  ])
}

/** พนักงานทำงานเสร็จ → แจ้งลูกค้า + admin */
export async function notifyStaffCompleted(
  customerId: string,
  orderId: string,
  staffName: string,
  serviceName: string
) {
  await Promise.allSettled([
    notifyUser(
      customerId,
      `${staffName} ดำเนินการ ${serviceName} เสร็จสิ้นแล้ว กรุณาตรวจสอบผลงาน`,
      'success',
      orderId,
      { notificationCategory: 'order_status', suppressLine: true }
    ),
    notifyAdmins(
      `${staffName} เสร็จงาน: ${serviceName}`,
      'success',
      orderId,
      { notificationCategory: 'system' }
    ),
  ])
}

/** Admin สร้างเอกสาร → แจ้งลูกค้า */
export async function notifyDocumentCreated(
  customerId: string,
  orderId: string,
  docType: string,
  docCode?: string
) {
  const labels: Record<string, string> = {
    quotation: 'ใบเสนอราคา',
    invoice:   'ใบแจ้งหนี้',
    receipt:   'ใบเสร็จ',
  }
  const label = labels[docType] || docType
  await notifyUser(
    customerId,
    `${label}${docCode ? ` (${docCode})` : ''} พร้อมดาวน์โหลดแล้ว`,
    'info',
    orderId,
    { notificationCategory: 'system' }
  )
}
