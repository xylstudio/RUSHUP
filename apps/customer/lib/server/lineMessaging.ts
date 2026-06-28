import type { SupabaseClient } from '@supabase/supabase-js'
import { createAcceptJobActionToken, createClaimOrderActionToken, createCustomerOrderActionToken } from './lineActionToken'
import { isLineCategoryEnabled, resolveLinePreferences, type LineNotificationCategory } from './linePreferences'

type LinePushMessage = {
  type: 'text'
  text: string
}

type LineFlexMessage = {
  type: 'flex'
  altText: string
  contents: Record<string, unknown>
}

type LineActionPayload = {
  type: 'accept_job_assignment' | 'claim_open_order'
  job_assignment_id?: string
  order_id?: string | null
  service_name?: string | null
  scheduled_date?: string | null
  location_label?: string | null
  service_area_sqm?: number | null
  detail_path?: string | null
}

type AcceptJobLineActionPayload = {
  type: 'accept_job_assignment'
  job_assignment_id: string
  order_id?: string | null
  service_name?: string | null
  scheduled_date?: string | null
}

type LineNotificationPayload = {
  title?: string | null
  message: string
  lineAction?: LineActionPayload | null
  lineReport?: {
    orderId: string
    followUpOrderId?: string | null
    reportId?: string | null
    orderCode?: string | null
    serviceName?: string | null
    staffName?: string | null
    completedAt?: string | null
    workDone?: string | null
    problemsFound?: string | null
    recommendations?: string | null
    nextVisitDate?: string | null
    nextVisitTimeStart?: string | null
    nextVisitTimeEnd?: string | null
    nextVisitNotes?: string | null
    beforePhotos?: string[] | null
    afterPhotos?: string[] | null
    visitCountText?: string | null
    houseName?: string | null
    zones?: any[] | null
  } | null
  appBaseUrl?: string | null
  category?: LineNotificationCategory
  bypassPreferences?: boolean
  rescheduleInfo?: {
    houseName: string
    serviceName: string
    newDateText: string
    orderId: string
    customerId: string
    visitCountText?: string | null
  } | null
  newServicePlanInfo?: {
    serviceName: string
    houseName: string
    pricingPeriod: string
    totalSessions: number
    totalPrice: number
    scheduledDate: string
    orderCode: string
    orderId: string
  } | null
  batchReports?: {
    staffName: string
    reports: {
      orderId: string
      reportId?: string | null
      orderCode?: string | null
      houseName: string
      serviceName: string
      workDone: string
      problemsFound?: string | null
      recommendations?: string | null
      completedAt: string
      visitCountText?: string | null
      beforePhotos?: string[] | null
      afterPhotos?: string[] | null
    }[]
  } | null
}

type LinePushResult = {
  delivered: boolean
  reason?: string
  error?: string
}

export type StoredLineDeliveryStatus = {
  linked: boolean
  lineUserId: string | null
  friendshipStatus: boolean | null
  friendshipCheckedAt: string | null
  messagingStatus: 'ready' | 'failed' | null
  messagingCheckedAt: string | null
  reason: string | null
  error: string | null
}

type LineFriendshipStatusResult = {
  checked: boolean
  friendFlag: boolean | null
  reason?: string
  error?: string
}

export type LineLinkVerificationResult = {
  friendFlag: boolean | null
  friendshipCheckedAt: string | null
  friendshipReason: string | null
  friendshipError: string | null
  messagingStatus: 'ready' | 'failed'
  messagingCheckedAt: string
  reason: string | null
  error: string | null
}

const MAX_LINE_TEXT_LENGTH = 4800

const getLineMessagingToken = () => {
  return process.env.LINE_MESSAGING_API_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
}

const normalizeText = (value: string) => {
  const compact = value
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (compact.length <= MAX_LINE_TEXT_LENGTH) return compact
  return `${compact.slice(0, MAX_LINE_TEXT_LENGTH - 1)}…`
}

const normalizeLineUserId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^U[a-f0-9]{32}$/i.test(trimmed)) return null
  return trimmed
}

const normalizeStoredTimestamp = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const normalizeStoredMessagingStatus = (value: unknown): 'ready' | 'failed' | null => {
  if (value === 'ready' || value === 'failed') return value
  return null
}

const resolveAppBaseUrl = (runtimeBaseUrl?: string | null) => {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const fallback = runtimeBaseUrl?.trim() || envUrl || 'http://localhost:3000'
  return fallback.replace(/\/$/, '')
}

export const toThaiDate = (isoDate?: string | null) => {
  if (!isoDate) return null
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const toThaiDateTime = (isoDate?: string | null) => {
  if (!isoDate) return null
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formats a multiline string into a list with icons
 */
const formatToListContents = (text: string, icon: string): any[] => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  
  if (lines.length === 0) return [{ type: 'text', text: '-', size: 'sm', color: '#333333' }]

  return lines.map((line) => ({
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    contents: [
      { type: 'text', text: icon, size: 'sm', flex: 0 },
      { type: 'text', text: line, size: 'sm', color: '#333333', wrap: true, flex: 1 }
    ]
  }))
}

const truncateLineText = (value: string, max = 120) => {
  const text = value.trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trim()}…`
}

const normalizeLineImageUrl = (value: unknown) => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

const summarizeMultiline = (value?: string | null, options?: { maxLines?: number; maxChars?: number }) => {
  const maxLines = options?.maxLines || 3
  const maxChars = options?.maxChars || 180
  const lines = String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return '-'
  const preview = lines.slice(0, maxLines).join(' • ')
  return truncateLineText(preview, maxChars)
}

const summarizeChecklistItems = (value?: string | null, maxItems = 4) => {
  const items = String(value || '')
    .split(/\n|•/)
    .map((item) => item.replace(/^[-*\d.\s)]+/, '').trim())
    .filter(Boolean)

  if (items.length === 0) return ['ไม่มีรายละเอียดเพิ่มเติม']
  return items.slice(0, maxItems).map((item) => truncateLineText(item, 72))
}

const buildCustomerActionUrls = (orderId: string, appBaseUrl?: string | null) => {
  const baseUrl = resolveAppBaseUrl(appBaseUrl)
  const safeOrderId = encodeURIComponent(orderId)
  return {
    detailUrl: `${baseUrl}/dashboard/customer?orderId=${safeOrderId}`,
    ratingUrl: `${baseUrl}/dashboard/customer?orderId=${safeOrderId}&action=rate`,
    issueUrl: `${baseUrl}/dashboard/customer?orderId=${safeOrderId}&action=issue`,
  }
}

const buildCustomerActionUrlsForLine = (payload: {
  orderId: string
  customerId: string
  followUpOrderId?: string | null
  reportId?: string | null
  appBaseUrl?: string | null
}) => {
  const baseUrl = resolveAppBaseUrl(payload.appBaseUrl)

  const makeUrl = (mode: 'detail' | 'rate' | 'issue' | 'reschedule', fallbackPath: string) => {
    const targetOrderId = mode === 'reschedule' && payload.followUpOrderId ? payload.followUpOrderId : payload.orderId
    const token = createCustomerOrderActionToken({
      orderId: targetOrderId,
      customerId: payload.customerId,
      mode,
      reportId: payload.reportId,
    })

    if (!token) {
      return `${baseUrl}${fallbackPath}`
    }

    return `${baseUrl}/api/line/actions/customer-order?token=${encodeURIComponent(token)}`
  }

  const safeOrderId = encodeURIComponent(payload.orderId)
  const reportConnector = payload.reportId ? `&reportId=${encodeURIComponent(payload.reportId)}` : ''
  const rescheduleTargetId = encodeURIComponent(payload.followUpOrderId || payload.orderId)

  return {
    detailUrl: makeUrl('detail', `/dashboard/customer?orderId=${safeOrderId}`),
    ratingUrl: makeUrl('rate', `/dashboard/customer?orderId=${safeOrderId}&action=rate-report${reportConnector}`),
    issueUrl: makeUrl('issue', `/dashboard/customer?orderId=${safeOrderId}&action=issue-report${reportConnector}`),
    rescheduleUrl: makeUrl('reschedule', `/reschedule/${rescheduleTargetId}`),
  }
}

const buildActionUrls = (payload: {
  lineAction: LineActionPayload
  staffId: string
  appBaseUrl?: string | null
}) => {
  const baseUrl = resolveAppBaseUrl(payload.appBaseUrl)

  if (payload.lineAction.type === 'accept_job_assignment') {
    const assignmentId = payload.lineAction.job_assignment_id
    if (!assignmentId) return null

    const token = createAcceptJobActionToken({
      assignmentId,
      staffId: payload.staffId,
    })
    if (!token) return null

    return {
      primaryActionUrl: `${baseUrl}/api/line/actions/accept-job?token=${encodeURIComponent(token)}`,
      detailUrl: `${baseUrl}${payload.lineAction.detail_path || `/dashboard/staff/tasks/${encodeURIComponent(assignmentId)}`}`,
    }
  }

  const orderId = payload.lineAction.order_id?.trim()
  if (!orderId) return null

  const token = createClaimOrderActionToken({
    orderId,
    staffId: payload.staffId,
  })
  if (!token) return null

  return {
    primaryActionUrl: `${baseUrl}/api/line/actions/claim-order?token=${encodeURIComponent(token)}`,
    detailUrl: `${baseUrl}${payload.lineAction.detail_path || '/dashboard/staff'}`,
  }
}

const buildStaffActionFlexMessage = (args: {
  title?: string | null
  message: string
  lineAction: LineActionPayload
  staffId: string
  appBaseUrl?: string | null
}): LineFlexMessage | null => {
  const actionUrls = buildActionUrls({ lineAction: args.lineAction, staffId: args.staffId, appBaseUrl: args.appBaseUrl })
  if (!actionUrls) return null

  const serviceName = args.lineAction.service_name?.trim() || 'งานบริการ'
  const dateText = toThaiDate(args.lineAction.scheduled_date)
  const locationLabel = args.lineAction.location_label?.trim() || ''
  const areaText =
    typeof args.lineAction.service_area_sqm === 'number' && args.lineAction.service_area_sqm > 0
      ? `${args.lineAction.service_area_sqm.toLocaleString('th-TH')} ตร.ม.`
      : ''
  const title = args.title?.trim() || 'มีงานใหม่เข้าระบบ'
  const altText = normalizeText(`${title} - ${serviceName}`)

  const actionLabel = args.lineAction.type === 'claim_open_order' ? 'รับงานนี้' : 'รับงานทันที'

  const bodyContents: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: title,
      weight: 'bold',
      size: 'md',
      color: '#1F2937',
      wrap: true,
    },
    {
      type: 'box',
      layout: 'vertical',
      margin: 'sm',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: `บริการ: ${serviceName}`,
          size: 'sm',
          color: '#4B5563',
          wrap: true,
        },
        ...(dateText
          ? [
              {
                type: 'text',
                text: `นัดหมาย: ${dateText}`,
                size: 'sm',
                color: '#4B5563',
                wrap: true,
              },
            ]
          : []),
        ...(locationLabel
          ? [
              {
                type: 'text',
                text: `สถานที่: ${locationLabel}`,
                size: 'sm',
                color: '#4B5563',
                wrap: true,
              },
            ]
          : []),
        ...(areaText
          ? [
              {
                type: 'text',
                text: `ขนาดพื้นที่: ${areaText}`,
                size: 'sm',
                color: '#4B5563',
                wrap: true,
              },
            ]
          : []),
      ],
    },
  ]

  return {
    type: 'flex',
    altText,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: bodyContents,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#111827',
            action: {
              type: 'uri',
              label: actionLabel,
              uri: actionUrls.primaryActionUrl,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'uri',
              label: 'ดูรายละเอียดงาน',
              uri: actionUrls.detailUrl,
            },
          },
        ],
      },
    },
  }
}

export function buildCustomerReportFlexMessage(args: {
  title?: string | null
  message: string
  lineReport: any
  customerId: string
  appBaseUrl?: string | null
}): LineFlexMessage {
  const baseUrl = resolveAppBaseUrl(args.appBaseUrl)
  const houseName = (args.lineReport.houseName || 'บ้านของคุณ').trim()
  const staffName = (args.lineReport.staffName || 'ทีมงาน Xylem').trim()
  
  // Create secure auto-login URL
  const detailUrl = (() => {
    const token = createCustomerOrderActionToken({
      orderId: args.lineReport.orderId,
      customerId: args.customerId,
      mode: 'detail',
      reportId: args.lineReport.reportId,
    })
    if (!token) return `${baseUrl}/dashboard/customer/reports/${args.lineReport.reportId}?orderId=${args.lineReport.orderId}`
    return `${baseUrl}/api/line/actions/customer-order?token=${encodeURIComponent(token)}`
  })()

  // Progress & Plan Info
  const visitCount = args.lineReport.visitCountText || ''
  const isRecurring = !!visitCount
  const pricingPeriod = args.lineReport.pricingPeriod || 'one-time'
  
  const periodLabels: Record<string, string> = {
    'one-time': 'รายครั้ง',
    'monthly': 'รายเดือน',
    'yearly': 'รายปี',
    'quarterly': 'รายไตรมาส'
  }
  const serviceTypeLabel = periodLabels[pricingPeriod] || 'บริการดูแลสวน'
  
  // Legacy Photos Logic (Fallback if no zones)
  let legacyBeforeUrl = normalizeLineImageUrl(args.lineReport.beforePhotos?.[0])
  let legacyAfterUrl = normalizeLineImageUrl(args.lineReport.afterPhotos?.[0])

  if (!legacyBeforeUrl || !legacyAfterUrl) {
    const anyBefore = (args.lineReport.zones || []).flatMap((z: any) => z.before_photos || z.beforePhotos || []).find(Boolean)
    const anyAfter = (args.lineReport.zones || []).flatMap((z: any) => z.after_photos || z.afterPhotos || []).find(Boolean)
    legacyBeforeUrl = legacyBeforeUrl || normalizeLineImageUrl(anyBefore)
    legacyAfterUrl = legacyAfterUrl || normalizeLineImageUrl(anyAfter)
  }

  const hasZones = Array.isArray(args.lineReport.zones) && args.lineReport.zones.length > 0;

  return {
    type: 'flex',
    altText: `รายงานการดูแลสวน: ${houseName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      styles: {
        header: { backgroundColor: '#FFFFFF' },
        body: { backgroundColor: '#FFFFFF' },
        footer: { separator: false },
      },
      header: {
        type: 'box',
        layout: 'vertical',
        paddingTop: '20px',
        paddingBottom: '0px',
        paddingStart: '20px',
        paddingEnd: '20px',
        contents: [
          { type: 'text', text: 'XYLEM LANDSCAPE', color: '#A3A39C', size: 'xxs', weight: 'bold' },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            alignItems: 'center',
            contents: [
              {
                type: 'text',
                text: houseName,
                weight: 'bold',
                size: 'xl',
                color: '#123524',
                flex: 4,
                wrap: true,
              },
              ...(isRecurring ? [{
                type: 'box',
                layout: 'vertical',
                flex: 2,
                contents: [
                  { type: 'text', text: 'SESSION', size: 'xxs', color: '#10B981', weight: 'bold', align: 'end' },
                  { type: 'text', text: visitCount, size: 'xs', color: '#10B981', weight: 'bold', align: 'end' },
                ]
              }] : [])
            ]
          },
          {
            type: 'text',
            text: `สรุปรายงานการเข้าดูแล ${serviceTypeLabel}`,
            size: 'xs',
            color: '#A3A39C',
            margin: 'xs',
          },
          { type: 'box', layout: 'vertical', margin: 'lg', height: '1px', backgroundColor: '#F1F1EB', contents: [] },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        paddingStart: '20px',
        paddingEnd: '20px',
        paddingBottom: '20px',
        contents: [
          // Property & Staff
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'สถานที่', size: 'xs', color: '#A3A39C', flex: 1 },
                  { type: 'text', text: houseName, size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end' },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ผู้ดูแล', size: 'xs', color: '#A3A39C', flex: 1 },
                  { type: 'text', text: staffName, size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end' },
                ],
              },
            ],
          },
          
          // Zonal Reports or Legacy Before/After Comparison
          ...(hasZones ? [{
            type: 'box',
            layout: 'vertical',
            spacing: 'lg',
            contents: args.lineReport.zones.slice(0, 5).map((zone: any, idx: number) => {
              const zBeforeUrl = normalizeLineImageUrl(zone.before_photos?.[0] || zone.beforePhotos?.[0]);
              const zAfterUrl = normalizeLineImageUrl(zone.after_photos?.[0] || zone.afterPhotos?.[0] || zone.photos?.[0]);
              const zName = zone.name || `โซนที่ ${idx + 1}`;
              const zWork = zone.work_done || zone.workDone || '';

              return {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: `• ${zName.toUpperCase()}`, size: 'xxs', weight: 'bold', color: '#1A3626' },
                  ...(zBeforeUrl || zAfterUrl ? [{
                    type: 'box',
                    layout: 'horizontal',
                    spacing: 'md',
                    contents: [
                      ...(zBeforeUrl ? [{
                        type: 'box',
                        layout: 'vertical',
                        flex: 1,
                        contents: [
                          { type: 'image', url: zBeforeUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover' },
                          { type: 'text', text: 'ก่อนทำ (Before)', size: 'xxs', color: '#A3A39C', align: 'center', margin: 'xs' }
                        ]
                      }] : []),
                      ...(zAfterUrl ? [{
                        type: 'box',
                        layout: 'vertical',
                        flex: 1,
                        contents: [
                          { type: 'image', url: zAfterUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover' },
                          { type: 'text', text: 'หลังทำ (After)', size: 'xxs', color: '#10B981', align: 'center', margin: 'xs', weight: 'bold' }
                        ]
                      }] : [])
                    ]
                  }] : []),
                  ...(zWork ? [{
                    type: 'text',
                    text: zWork,
                    size: 'xs',
                    color: '#4B5563',
                    wrap: true,
                    margin: 'sm'
                  }] : []),
                ]
              };
            })
          }] : (legacyBeforeUrl || legacyAfterUrl ? [{
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            contents: [
              ...(legacyBeforeUrl ? [{
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'image', url: legacyBeforeUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover' },
                  { type: 'text', text: 'ก่อนทำ (Before)', size: 'xxs', color: '#A3A39C', align: 'center', margin: 'xs' }
                ]
              }] : []),
              ...(legacyAfterUrl ? [{
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'image', url: legacyAfterUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover' },
                  { type: 'text', text: 'หลังทำ (After)', size: 'xxs', color: '#10B981', align: 'center', margin: 'xs', weight: 'bold' }
                ]
              }] : [])
            ]
          }] : [])),

          // Work Done List — strip placeholder text before rendering
          (() => {
            const PLACEHOLDER = 'กำลังดำเนินการลงรายงาน...'
            const rawWork: string = args.lineReport.workDone || ''
            const cleanWork = rawWork === PLACEHOLDER ? '' : rawWork
            return {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                { type: 'text', text: '• รายการที่ดำเนินการ', size: 'xs', weight: 'bold', color: '#123524' },
                {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'xs',
                  contents: formatToListContents(cleanWork || 'ไม่มีรายละเอียดการดำเนินงาน', '•')
                }
              ]
            }
          })(),

          // Problems/Fixes
          ...(args.lineReport.problemsFound?.trim() ? [{
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              { type: 'text', text: '• ปัญหาที่พบ', size: 'xs', weight: 'bold', color: '#C2410C' },
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'xs',
                contents: formatToListContents(args.lineReport.problemsFound, '•')
              }
            ]
          }] : []),

          // Next Visit Section
          ...(args.lineReport.nextVisitDate ? [{
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            paddingAll: '12px',
            backgroundColor: '#F3F4F6',
            contents: [
              { type: 'text', text: 'นัดหมายครั้งถัดไป', size: 'xs', weight: 'bold', color: '#123524' },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'sm',
                contents: [
                  { type: 'text', text: '📅 วันที่', size: 'xs', color: '#4B5563', flex: 1 },
                  { type: 'text', text: toThaiDate(args.lineReport.nextVisitDate) || args.lineReport.nextVisitDate, size: 'xs', color: '#111111', weight: 'bold', align: 'end', flex: 2 }
                ]
              }
            ]
          }] : []),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '20px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '📋 ดูรายงานฉบับเต็ม',
              uri: detailUrl,
            },
            style: 'primary',
            color: '#111111',
            height: 'sm',
          },
          ...( args.lineReport.nextVisitDate ? [{
            type: 'button',
            action: {
              type: 'uri',
              label: '📅 เลื่อนนัดหมาย',
              uri: (() => {
                const token = createCustomerOrderActionToken({
                  orderId: args.lineReport.orderId,
                  customerId: args.customerId,
                  mode: 'reschedule',
                })
                return token
                  ? `${baseUrl}/api/line/actions/customer-order?token=${encodeURIComponent(token)}`
                  : `${baseUrl}/reschedule/${encodeURIComponent(args.lineReport.orderId)}`
              })(),
            },
            style: 'secondary',
            height: 'sm',
          }] : []),
          {
            type: 'text',
            text: 'ขอบคุณที่ไว้วางใจ Xylem Landscape ครับ',
            size: 'xxs',
            color: '#A3A39C',
            align: 'center',
            margin: 'md',
          }
        ],
      },
    },
  }
}


export const buildLineNotificationText = (payload: { title?: string | null; message: string }) => {
  const title = payload.title?.trim()
  const message = payload.message?.trim() || ''

  if (title) return `${title}\n\n${message}`
  return message
}

export function buildSystemFlexMessage(args: {
  title?: string | null
  message: string
  appBaseUrl?: string | null
}): LineFlexMessage {
  const baseUrl = resolveAppBaseUrl(args.appBaseUrl)
  const title = args.title?.trim() || 'การแจ้งเตือนจากระบบ'
  const message = args.message?.trim() || ''

  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: 'XYLEM LANDSCAPE', color: '#10B981', size: 'xs', weight: 'bold' },
          {
            type: 'text',
            text: title,
            weight: 'bold',
            size: 'lg',
            color: '#1A1A18',
            wrap: true,
            margin: 'md',
          },
          { type: 'separator', margin: 'lg' },
          {
            type: 'text',
            text: message,
            size: 'sm',
            color: '#4B5563',
            wrap: true,
            margin: 'lg',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '20px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'เข้าสู่ระบบ',
              uri: `${baseUrl}/dashboard`,
            },
            style: 'primary',
            color: '#10B981',
            height: 'sm',
          },
        ],
      },
    },
  }
}

export const resolveLineUserIdBySupabaseUserId = async (
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> => {
  const { data, error } = await supabase.auth.admin.getUserById(userId)

  if (error || !data?.user) {
    return null
  }

  const metadata = (data.user.user_metadata || {}) as Record<string, unknown>
  const appMetadata = (data.user.app_metadata || {}) as Record<string, unknown>

  const candidates: Array<unknown> = [
    metadata.line_user_id,
    metadata.lineUserId,
    appMetadata.line_user_id,
  ]

  const identities = (data.user.identities || []) as Array<{ provider?: string | null; identity_data?: unknown }>
  for (const identity of identities) {
    const provider = String(identity.provider || '').toLowerCase()
    const identityData =
      identity.identity_data && typeof identity.identity_data === 'object'
        ? (identity.identity_data as Record<string, unknown>)
        : {}
    if (provider === 'line') {
      candidates.push(identityData.userId, identityData.user_id, identityData.sub)
    }
  }

  const resolved = candidates
    .map((item) => normalizeLineUserId(item))
    .find((item) => Boolean(item))

  if (resolved) return resolved

  // Fallback 1: Check line_users table
  const { data: dbEntry } = await supabase
    .from('line_users')
    .select('line_user_id')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (dbEntry?.line_user_id) return dbEntry.line_user_id

  // Fallback 2: Check if email is in deterministic format: {lineUserId}@line.xylemlandscape.com
  const email = data.user.email || ''
  if (email && email.endsWith('@line.xylemlandscape.com')) {
    const extracted = email.split('@')[0]
    const normalized = normalizeLineUserId(extracted)
    if (normalized) return normalized
  }

  return null
}

export const resolveStoredLineDeliveryStatus = (metadata: Record<string, unknown>): StoredLineDeliveryStatus => {
  const lineUserId = normalizeLineUserId(metadata.line_user_id) || normalizeLineUserId(metadata.lineUserId)

  return {
    linked: Boolean(lineUserId),
    lineUserId,
    friendshipStatus: typeof metadata.line_friendship_status === 'boolean' ? metadata.line_friendship_status : null,
    friendshipCheckedAt: normalizeStoredTimestamp(metadata.line_friendship_checked_at),
    messagingStatus: normalizeStoredMessagingStatus(metadata.line_messaging_status),
    messagingCheckedAt: normalizeStoredTimestamp(metadata.line_messaging_checked_at),
    reason: typeof metadata.line_messaging_reason === 'string' ? metadata.line_messaging_reason : null,
    error: typeof metadata.line_messaging_error === 'string' ? metadata.line_messaging_error : null,
  }
}

const checkLineFriendshipStatus = async (lineAccessToken: string): Promise<LineFriendshipStatusResult> => {
  if (!lineAccessToken.trim()) {
    return {
      checked: false,
      friendFlag: null,
      reason: 'missing_line_access_token',
    }
  }

  try {
    const response = await fetch('https://api.line.me/friendship/v1/status', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${lineAccessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      return {
        checked: false,
        friendFlag: null,
        reason: 'line_friendship_status_unavailable',
        error: errorText || response.statusText,
      }
    }

    const payload = (await response.json().catch(() => ({}))) as { friendFlag?: boolean }
    return {
      checked: true,
      friendFlag: typeof payload.friendFlag === 'boolean' ? payload.friendFlag : null,
    }
  } catch (error) {
    return {
      checked: false,
      friendFlag: null,
      reason: 'line_friendship_status_unavailable',
      error: error instanceof Error ? error.message : 'Unknown LINE friendship error',
    }
  }
}

export const verifyLineLinkDelivery = async (args: {
  lineAccessToken: string
  lineUserId: string
  displayName?: string | null
}): Promise<LineLinkVerificationResult> => {
  const friendship = await checkLineFriendshipStatus(args.lineAccessToken)
  const messagingCheckedAt = new Date().toISOString()
  const verificationText = normalizeText(
    `เชื่อมต่อ LINE กับ Xylem สำเร็จแล้ว${args.displayName?.trim() ? ` คุณ ${args.displayName.trim()}` : ''}\nข้อความนี้ใช้ยืนยันว่าบัญชีนี้รับการแจ้งเตือนจากระบบได้จริง`
  )

  const flexMessage: LineFlexMessage = {
    type: 'flex',
    altText: 'การเชื่อมต่อบัญชี LINE สำเร็จ',
    contents: {
      type: 'bubble',
      size: 'mega',
      styles: {
        header: { backgroundColor: '#FFFFFF' },
        body: { backgroundColor: '#FFFFFF' },
      },
      header: {
        type: 'box',
        layout: 'vertical',
        paddingTop: '24px',
        paddingBottom: '0px',
        contents: [
          { type: 'text', text: 'XYL STUDIO', color: '#8C8C85', size: 'xxs', weight: 'bold', align: 'center' },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            paddingAll: '20px',
            backgroundColor: '#123524',
            cornerRadius: '12px',
            alignItems: 'center',
            contents: [
              { type: 'text', text: 'LINK SUCCESSFUL', size: 'xxs', color: '#10B981', weight: 'bold', margin: 'xs' },
              { type: 'text', text: 'เชื่อมต่อบัญชีสำเร็จ', weight: 'bold', size: 'lg', color: '#FFFFFF', margin: 'sm' },
            ],
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        paddingTop: '20px',
        paddingStart: '24px',
        paddingEnd: '24px',
        paddingBottom: '24px',
        contents: [
          {
            type: 'text',
            text: `สวัสดีครับ${args.displayName?.trim() ? ` คุณ ${args.displayName.trim()}` : ''}`,
            size: 'sm',
            weight: 'bold',
            color: '#111111',
            wrap: true,
            align: 'center',
          },
          {
            type: 'text',
            text: 'บัญชี LINE ของคุณได้รับการเชื่อมต่อเข้ากับระบบของ XYL STUDIO เรียบร้อยแล้ว',
            size: 'sm',
            color: '#70706B',
            wrap: true,
            align: 'center',
            margin: 'sm',
          },
          { type: 'box', layout: 'vertical', margin: 'lg', height: '1px', backgroundColor: '#F1F1EB', contents: [] },
          {
            type: 'text',
            text: 'ข้อความฉบับนี้ใช้สำหรับยืนยันว่าบัญชีของท่านสามารถรับการแจ้งเตือนจากระบบได้ตามปกติ',
            size: 'xxs',
            color: '#A3A39C',
            wrap: true,
            align: 'center',
          },
        ],
      },
    },
  }

  const pushResult = await sendLinePushToLineUserId(args.lineUserId, verificationText, flexMessage)

  let reason = pushResult.reason || null
  if (!pushResult.delivered && friendship.friendFlag === false) {
    reason = 'line_official_account_not_added'
  } else if (!pushResult.delivered && friendship.reason === 'line_friendship_status_unavailable') {
    reason = 'line_official_account_link_unverified'
  }

  const error = [pushResult.error, friendship.error].filter(Boolean).join(' | ') || null

  return {
    friendFlag: friendship.friendFlag,
    friendshipCheckedAt: friendship.checked ? messagingCheckedAt : null,
    friendshipReason: friendship.reason || null,
    friendshipError: friendship.error || null,
    messagingStatus: pushResult.delivered ? 'ready' : 'failed',
    messagingCheckedAt,
    reason,
    error,
  }
}

export const sendLinePushToLineUserId = async (
  lineUserId: string,
  text: string,
  flexMessage?: LineFlexMessage | null,
  supabase?: SupabaseClient
): Promise<LinePushResult> => {
  const token = getLineMessagingToken()
  const normalizedLineUserId = normalizeLineUserId(lineUserId)

  if (!token) {
    return { delivered: false, reason: 'missing_line_messaging_token' }
  }

  if (!normalizedLineUserId) {
    return { delivered: false, reason: 'invalid_line_user_id' }
  }

  const cleanText = normalizeText(text)
  if (!cleanText) {
    return { delivered: false, reason: 'empty_message' }
  }

  const messages: Array<LinePushMessage | LineFlexMessage> = flexMessage
    ? [flexMessage]
    : [{ type: 'text', text: cleanText } satisfies LinePushMessage]

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: normalizedLineUserId,
        messages,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      console.error('[LINE PUSH FAILED]', {
        status: response.status,
        isFlex: !!flexMessage,
        altText: flexMessage?.altText,
        error: errorText,
      })

      if (supabase) {
        await supabase.from('audit_logs').insert({
          action: 'line_push_api_failed',
          details: {
            lineUserId: normalizedLineUserId,
            status: response.status,
            error: errorText,
            isFlex: !!flexMessage,
            altText: flexMessage?.altText || null,
          }
        })
      }

      if (flexMessage) {
        // Fallback to plain text
        return sendLinePushToLineUserId(lineUserId, text, null, supabase)
      }
      return { delivered: false, reason: 'line_api_error', error: errorText || response.statusText }
    }

    return { delivered: true }
  } catch (error: any) {
    return { delivered: false, reason: 'network_error', error: error.message }
  }
}

export const sendLinePushToSupabaseUser = async (
  supabase: SupabaseClient,
  userId: string,
  payload: LineNotificationPayload
): Promise<LinePushResult> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
  if (authError || !authUser?.user) {
    return { delivered: false, reason: 'cannot_load_target_user' }
  }

  const targetMetadata = (authUser.user.user_metadata || {}) as Record<string, unknown>
  const storedDeliveryStatus = resolveStoredLineDeliveryStatus(targetMetadata)
  const category = payload.category || 'system'
  const preferences = resolveLinePreferences(targetMetadata, profile?.role || null)

  if (!payload.bypassPreferences && !isLineCategoryEnabled(preferences, category)) {
    return { delivered: false, reason: 'line_notification_disabled' }
  }

  const lineUserId = await resolveLineUserIdBySupabaseUserId(supabase, userId)
  if (!lineUserId) {
    return { delivered: false, reason: 'line_user_not_linked' }
  }

  const text = buildLineNotificationText(payload)
  const flexMessage = payload.batchReports
    ? buildCustomerBatchReportCarouselFlexMessage({
        batchReports: payload.batchReports,
        customerId: userId,
        appBaseUrl: payload.appBaseUrl,
        message: payload.message,
        title: payload.title,
      })
    : payload.lineReport
      ? buildCustomerReportFlexMessage({
          title: payload.title,
          message: payload.message,
          lineReport: payload.lineReport,
          customerId: userId,
          appBaseUrl: payload.appBaseUrl,
        })
      : payload.lineAction?.type === 'accept_job_assignment' || payload.lineAction?.type === 'claim_open_order'
      ? buildStaffActionFlexMessage({
          title: payload.title,
          message: payload.message,
          lineAction: payload.lineAction,
          staffId: userId,
          appBaseUrl: payload.appBaseUrl,
        })
      : payload.rescheduleInfo
      ? buildRescheduleFlexMessage({
          houseName: payload.rescheduleInfo.houseName,
          serviceName: payload.rescheduleInfo.serviceName,
          newDateText: payload.rescheduleInfo.newDateText,
          orderId: payload.rescheduleInfo.orderId,
          customerId: userId,
          visitCountText: payload.rescheduleInfo.visitCountText,
          appBaseUrl: payload.appBaseUrl,
        })
      : payload.newServicePlanInfo
      ? buildNewServicePlanFlexMessage({
          ...payload.newServicePlanInfo,
          customerId: userId,
          appBaseUrl: payload.appBaseUrl,
        })
      : payload.category === 'system'
      ? buildSystemFlexMessage({
          title: payload.title,
          message: payload.message,
          appBaseUrl: payload.appBaseUrl,
        })
      : null

  let result = await sendLinePushToLineUserId(lineUserId, text, flexMessage, supabase)

  // If Flex fails, immediately try sending just the text as a reliable fallback
  if (!result.delivered && flexMessage) {
    const textOnlyResult = await sendLinePushToLineUserId(lineUserId, text, null, supabase)
    if (textOnlyResult.delivered) {
      return textOnlyResult
    }
    
    // If even text fails, combine errors
    result = {
      delivered: false,
      reason: textOnlyResult.reason || result.reason,
      error: [result.error, 'text_fallback_failed', textOnlyResult.error].filter(Boolean).join(' | '),
    }
  }

  return result
}

export const buildRescheduleFlexMessage = (args: {
  houseName: string
  serviceName: string
  newDateText: string
  orderId: string
  customerId: string
  visitCountText?: string | null
  appBaseUrl?: string | null
}): LineFlexMessage => {
  let baseUrl = (args.appBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://xylem-landscape.vercel.app').trim().replace(/\/$/, '')
  if (baseUrl && !baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  
  const detailUrl = (() => {
    const token = createCustomerOrderActionToken({
      orderId: args.orderId,
      customerId: args.customerId,
      mode: 'detail',
    })
    if (!token) return `${baseUrl}/dashboard/customer?orderId=${args.orderId}`
    return `${baseUrl}/api/line/actions/customer-order?token=${encodeURIComponent(token)}`
  })()

  const rescheduleUrl = (() => {
    const token = createCustomerOrderActionToken({
      orderId: args.orderId,
      customerId: args.customerId,
      mode: 'reschedule',
    })
    if (!token) return `${baseUrl}/reschedule/${args.orderId}`
    return `${baseUrl}/api/line/actions/customer-order?token=${encodeURIComponent(token)}`
  })()

  return {
    type: 'flex',
    altText: `แจ้งเลื่อนวันนัดหมาย: ${args.houseName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      styles: {
        header: { backgroundColor: '#FFFFFF' },
        body: { backgroundColor: '#FFFFFF' },
        footer: { separator: false },
      },
      header: {
        type: 'box',
        layout: 'vertical',
        paddingTop: '20px',
        paddingBottom: '0px',
        contents: [
          {
            type: 'text',
            text: 'XYLEM LANDSCAPE',
            color: '#A3A39C',
            size: 'xxs',
            weight: 'bold',
          },
          {
            type: 'text',
            text: 'แจ้งวันเข้าบริการดูแลสวน',
            weight: 'bold',
            size: 'xl',
            color: '#123524',
            margin: 'sm',
          },
          {
            type: 'text',
            text: `มีการเลื่อนนัดหมาย${args.visitCountText ? ` (${args.visitCountText})` : ''}`,
            weight: 'bold',
            size: 'sm',
            color: '#EAB308',
            margin: 'xs',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            height: '1px',
            backgroundColor: '#F1F1EB',
            contents: [],
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        paddingTop: '0px',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'สถานที่', size: 'xs', color: '#A3A39C', flex: 1 },
                  { type: 'text', text: args.houseName || 'ไม่ระบุชื่อบ้าน', size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end' },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'บริการ', size: 'xs', color: '#A3A39C', flex: 1 },
                  { type: 'text', text: args.serviceName || 'ดูแลสวน', size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end' },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'วันที่นัดหมาย', size: 'xs', color: '#A3A39C', flex: 1 },
                  { type: 'text', text: args.newDateText, size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end' },
                ],
              },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            paddingAll: '12px',
            backgroundColor: '#FAFAF8',
            cornerRadius: 'md',
            contents: [
              {
                type: 'text',
                text: 'ทีมงาน Xylem จะเข้าดูแลสวนให้ตามวันและเวลาที่นัดหมายครับ หากมีข้อสงสัยสามารถติดต่อผ่านช่องทางนี้ได้ทันที',
                size: 'xs',
                color: '#70706B',
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '20px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '📅 เลื่อนนัดหมาย',
              uri: rescheduleUrl,
            },
            style: 'primary',
            color: '#111111',
            height: 'sm',
          },
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '📄 ดูรายละเอียดงาน',
              uri: detailUrl,
            },
            style: 'secondary',
            color: '#EDEDE8',
            height: 'sm',
          },
        ],
      },
    },
  }
}

export const buildNewServicePlanFlexMessage = (args: {
  serviceName: string
  houseName: string
  pricingPeriod: string
  totalSessions: number
  totalPrice: number
  scheduledDate: string
  orderCode: string
  orderId: string
  customerId?: string | null
  appBaseUrl?: string | null
}): LineFlexMessage => {
  const baseUrl = resolveAppBaseUrl(args.appBaseUrl)
  const dateText = toThaiDate(args.scheduledDate) || args.scheduledDate
  
  const p = String(args.pricingPeriod || '').toLowerCase()
  let periodLabel = 'รายครั้ง'
  if (p === 'yearly' || p.includes('รายปี')) periodLabel = 'รายปี'
  else if (p === 'monthly' || p.includes('รายเดือน')) periodLabel = 'รายเดือน'

  const isOneTime = periodLabel === 'รายครั้ง' || p === 'one-time'
  const sessionText = (isOneTime || args.totalSessions <= 1) ? '' : ` (รอบที่ 1/${args.totalSessions})`
  const detailUrl = (() => {
    if (!args.customerId) return `${baseUrl}/dashboard/customer?sheet=orders`
    const token = createCustomerOrderActionToken({
      orderId: args.orderId,
      customerId: args.customerId,
      mode: 'detail',
    })
    if (!token) return `${baseUrl}/dashboard/customer?sheet=orders`
    return `${baseUrl}/api/line/actions/customer-order?token=${encodeURIComponent(token)}`
  })()

  return {
    type: 'flex',
    altText: `แจ้งเริ่มแผนบริการใหม่: ${args.serviceName}${sessionText}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      styles: {
        header: { backgroundColor: '#FFFFFF' },
        body: { backgroundColor: '#FFFFFF' },
        footer: { separator: false },
      },
      header: {
        type: 'box',
        layout: 'vertical',
        paddingTop: '20px',
        paddingBottom: '0px',
        contents: [
          {
            type: 'text',
            text: 'XYLEM LANDSCAPE',
            color: '#A3A39C',
            size: 'xxs',
            weight: 'bold',
          },
          {
            type: 'text',
            text: 'แจ้งเริ่มแผนบริการใหม่',
            weight: 'bold',
            size: 'xl',
            color: '#123524',
            margin: 'sm',
          },
          {
            type: 'text',
            text: `แผนบริการ${periodLabel}${sessionText}`,
            weight: 'bold',
            size: 'sm',
            color: '#10B981',
            margin: 'xs',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            height: '1px',
            backgroundColor: '#F1F1EB',
            contents: [],
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        paddingTop: '0px',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'สถานที่', size: 'xs', color: '#A3A39C', flex: 1 },
                  { type: 'text', text: args.houseName || '-', size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end' },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'บริการ', size: 'xs', color: '#A3A39C', flex: 1 },
                  { type: 'text', text: args.serviceName || 'ดูแลสวน', size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end' },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'วันที่เริ่มบริการ', size: 'xs', color: '#A3A39C', flex: 1 },
                  { type: 'text', text: dateText, size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end' },
                ],
              },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            paddingAll: '12px',
            backgroundColor: '#FAFAF8',
            cornerRadius: 'md',
            contents: [
              {
                type: 'text',
                text: 'ทีมงาน Xylem จะเข้าดูแลสวนให้ตามวันและเวลาที่นัดหมายครับ หากมีข้อสงสัยสามารถติดต่อผ่านช่องทางนี้ได้ทันที',
                size: 'xs',
                color: '#70706B',
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '20px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '📄 ดูรายละเอียดแผน',
              uri: detailUrl,
            },
            style: 'primary',
            color: '#111111',
            height: 'sm',
          },
        ],
      },
    },
  }
}
export const buildCustomerBatchReportCarouselFlexMessage = (args: {
  title?: string | null
  message?: string | null
  batchReports: {
    staffName: string
    reports: {
      orderId: string
      reportId?: string | null
      orderCode?: string | null
      houseName: string
      serviceName: string
      workDone: string
      problemsFound?: string | null
      recommendations?: string | null
      completedAt: string
      visitCountText?: string | null
      beforePhotos?: string[] | null
      afterPhotos?: string[] | null
      nextVisitDate?: string | null
    }[]
  }
  customerId: string
  appBaseUrl?: string | null
}): LineFlexMessage => {
  const baseUrl = resolveAppBaseUrl(args.appBaseUrl)
  const staffName = (args.batchReports.staffName || 'ทีมงาน Xylem').trim()
  
  const houseCount = args.batchReports.reports.length
  const altText = `รายงานการดูแลสวน (${houseCount} หลัง)`

  // Enforce LINE Carousel limit
  const targetReports = args.batchReports.reports.slice(0, 10);

  const bubbles = targetReports.map((report) => {
    // Build token with reportId so the redirect goes to the full report detail view
    const reportToken = report.reportId
      ? createCustomerOrderActionToken({
          orderId: report.orderId,
          customerId: args.customerId,
          mode: 'detail',
          reportId: report.reportId,
        })
      : createCustomerOrderActionToken({
          orderId: report.orderId,
          customerId: args.customerId,
          mode: 'detail',
        })

    // When reportId is available, link to the full report detail panel
    // Format: /dashboard/customer?reportId=<id>  (opens the full report panel with photos)
    const fallbackUrl = report.reportId
      ? `${baseUrl}/dashboard/customer?reportId=${encodeURIComponent(report.reportId)}`
      : `${baseUrl}/dashboard/customer?orderId=${encodeURIComponent(report.orderId)}`

    const detailUrl = reportToken
      ? `${baseUrl}/api/line/actions/customer-order?token=${encodeURIComponent(reportToken)}`
      : fallbackUrl

    const beforePhoto = normalizeLineImageUrl(report.beforePhotos?.[0])
    const afterPhoto = normalizeLineImageUrl(report.afterPhotos?.[0])
    const visitCount = report.visitCountText || ''

    return {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: 'XYLEM LANDSCAPE', color: '#A3A39C', size: 'xxs', weight: 'bold' },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: report.houseName,
                weight: 'bold',
                size: 'xl',
                color: '#123524',
                wrap: true,
                flex: 4
              },
              ...(visitCount ? [{
                type: 'box',
                layout: 'vertical',
                flex: 2,
                contents: [
                  { type: 'text', text: 'SESSION', size: 'xxs', color: '#10B981', weight: 'bold', align: 'end' },
                  { type: 'text', text: visitCount, size: 'xs', color: '#10B981', weight: 'bold', align: 'end' },
                ]
              }] : [])
            ]
          },
          {
            type: 'text',
            text: `สรุปรายงาน: ${report.serviceName}`,
            size: 'xs',
            color: '#A3A39C',
            margin: 'xs',
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ผู้ดูแล', size: 'xs', color: '#A3A39C', flex: 1 },
                  { type: 'text', text: staffName, size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end' },
                ],
              },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              { type: 'text', text: 'รายการที่ดำเนินการ', size: 'xs', weight: 'bold', color: '#123524' },
              {
                type: 'text',
                text: summarizeMultiline(report.workDone || 'เข้าดูแลสวนตามแผนงาน', { maxLines: 2, maxChars: 80 }),
                size: 'sm',
                color: '#4B5563',
                wrap: true
              }
            ]
          },
          ...(report.nextVisitDate ? [{
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            paddingAll: '10px',
            backgroundColor: '#F3F4F6',
            cornerRadius: 'sm',
            contents: [
              { type: 'text', text: 'นัดหมายครั้งถัดไป', size: 'xs', weight: 'bold', color: '#123524' },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'xs',
                contents: [
                  { type: 'text', text: '📅 วันที่', size: 'xs', color: '#4B5563', flex: 1 },
                  { type: 'text', text: toThaiDate(report.nextVisitDate) || report.nextVisitDate, size: 'xs', color: '#111111', weight: 'bold', align: 'end', flex: 2 }
                ]
              }
            ]
          }] : [])
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '📋 ดูรายละเอียดรายงาน',
              uri: detailUrl,
            },
            style: 'primary',
            color: '#123524',
            height: 'sm'
          },
        ]
      }
    }
  })

  return {
    type: 'flex',
    altText,
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  }
}

export const sendLinePushToOrderStakeholders = async (
  supabase: SupabaseClient,
  houseId: string | null,
  customerId: string | null,
  payload: LineNotificationPayload
): Promise<{ success: boolean; results: Record<string, LinePushResult> }> => {
  const users = new Set<string>()
  if (customerId) users.add(customerId)

  if (houseId) {
    const { data: collaborators } = await supabase
      .from('house_collaborators')
      .select('user_id')
      .eq('house_id', houseId)
    
    if (collaborators) {
      collaborators.forEach((c) => {
        if (c.user_id) users.add(c.user_id)
      })
    }
  }

  const targetIds = Array.from(users)
  const results: Record<string, LinePushResult> = {}
  
  for (const userId of targetIds) {
    // When sending to each stakeholder, we pass their userId as customerId for formatting, 
    // but the payload might already have customerId embedded. We adjust if needed:
    const tailoredPayload = { ...payload }
    
    // Adjust lineReport for the specific recipient
    if (tailoredPayload.lineReport) {
      tailoredPayload.lineReport = {
        ...tailoredPayload.lineReport,
        // Optional override: if there's a field indicating the recipient for line format, we can adjust here.
        // Wait, lineReport format doesn't contain recipient ID. Wait, actually we pass `userId` to `sendLinePushToSupabaseUser` 
        // which then passes `customerId: userId` to `buildCustomerReportFlexMessage`. So it works perfectly!
      }
    }
    
    results[userId] = await sendLinePushToSupabaseUser(supabase, userId, tailoredPayload)
  }

  return { success: true, results }
}

