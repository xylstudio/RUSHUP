export type SupportedLocale = 'th' | 'en' | 'zh'

export type CustomerProgressSnapshot = {
  order_status?: string | null
  is_assigned?: boolean
  assignment_status?: string | null
  assigned_at?: string | null
  accepted_at?: string | null
  staff_name?: string | null
  staff_phone?: string | null
}

type ServiceFlowStepState = 'complete' | 'current' | 'upcoming'

export type ServiceFlowStep = {
  key: 'request' | 'team' | 'onsite' | 'report'
  label: string
  state: ServiceFlowStepState
}

export type CustomerServiceFlow = {
  stage: 'pending' | 'confirmed' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  badgeLabel: string
  badgeTone: string
  headline: string
  detail: string
  staffLine: string
  steps: ServiceFlowStep[]
}

const FLOW_COPY = {
  th: {
    badge: {
      pending: 'รอยืนยันคำขอ',
      confirmed: 'ยืนยันคำขอแล้ว',
      scheduled: 'จัดทีมดูแลแล้ว',
      in_progress: 'กำลังเข้าดูแล',
      completed: 'เสร็จสิ้นพร้อมรายงาน',
      cancelled: 'ยกเลิกแล้ว',
    },
    headline: {
      pending: 'เราได้รับคำขอของคุณแล้ว',
      confirmed: 'คำขอได้รับการยืนยันแล้ว',
      scheduled: 'ทีมงานกำลังเตรียมเข้าหน้างาน',
      in_progress: 'พนักงานกำลังดูแลพื้นที่ของคุณ',
      completed: 'งานเสร็จแล้วและมีรายงานพร้อมดู',
      cancelled: 'รายการนี้ถูกยกเลิก',
    },
    detail: {
      pending: 'หลังชำระเงินสำเร็จ ระบบจะยืนยันงานและจัดคิวทีมดูแลให้โดยอัตโนมัติ',
      confirmed: 'ระบบยืนยันคำขอแล้ว ตอนนี้อยู่ระหว่างการจัดทีมและกำหนดคิวเข้าดูแล',
      scheduled: 'มีพนักงานประจำงานแล้ว คุณสามารถติดตามผู้รับผิดชอบและความคืบหน้าได้จากหน้านี้',
      in_progress: 'งานกำลังดำเนินอยู่ที่หน้างาน เมื่อเสร็จแล้วคุณจะเห็นภาพและสรุปรายงานทันที',
      completed: 'งานเสร็จสมบูรณ์แล้ว เปิดดูสรุปงาน ภาพหน้างาน และคำแนะนำถัดไปได้เลย',
      cancelled: 'หากต้องการเริ่มงานใหม่ กรุณาสร้างคำขอบริการรายการใหม่',
    },
    staffPending: 'กำลังจับคู่ทีมดูแล',
    staffKnown: 'ผู้รับผิดชอบ: {name}',
    steps: {
      request: 'ยืนยันคำขอ',
      team: 'จัดทีม',
      onsite: 'เข้าดูแล',
      report: 'รายงานผล',
    },
  },
  en: {
    badge: {
      pending: 'Awaiting confirmation',
      confirmed: 'Confirmed',
      scheduled: 'Team assigned',
      in_progress: 'On site',
      completed: 'Completed with report',
      cancelled: 'Cancelled',
    },
    headline: {
      pending: 'We have received your request',
      confirmed: 'Your service request is confirmed',
      scheduled: 'Your care team is being prepared',
      in_progress: 'Your staff team is currently on site',
      completed: 'The visit is complete and the report is ready',
      cancelled: 'This service request was cancelled',
    },
    detail: {
      pending: 'Once payment succeeds, the system will confirm the order and queue the care team automatically.',
      confirmed: 'Your request is confirmed. We are now assigning the right team and visit slot.',
      scheduled: 'A staff member is assigned. You can track ownership and progress from this page.',
      in_progress: 'Work is in progress on site. Photos and the service report will appear once the visit is complete.',
      completed: 'The work is complete. You can now review the service summary, photos, and next-step advice.',
      cancelled: 'Create a new service request if you want to restart this care cycle.',
    },
    staffPending: 'Matching your care team',
    staffKnown: 'Assigned staff: {name}',
    steps: {
      request: 'Request',
      team: 'Team',
      onsite: 'On site',
      report: 'Report',
    },
  },
  zh: {
    badge: {
      pending: '等待确认',
      confirmed: '已确认',
      scheduled: '已分配团队',
      in_progress: '正在现场服务',
      completed: '已完成并附报告',
      cancelled: '已取消',
    },
    headline: {
      pending: '我们已收到您的请求',
      confirmed: '您的服务请求已确认',
      scheduled: '服务团队正在准备中',
      in_progress: '工作人员正在现场服务',
      completed: '服务已完成，报告已可查看',
      cancelled: '该服务请求已取消',
    },
    detail: {
      pending: '支付成功后，系统会自动确认订单并安排服务团队。',
      confirmed: '请求已确认，我们正在安排合适的团队与上门时间。',
      scheduled: '已有工作人员接手，您可以在此页面查看负责人和进度。',
      in_progress: '现场服务正在进行中，完成后将显示照片和服务报告。',
      completed: '服务已完成，您现在可以查看总结、照片和后续建议。',
      cancelled: '如需重新开始，请创建新的服务请求。',
    },
    staffPending: '正在匹配服务团队',
    staffKnown: '负责人：{name}',
    steps: {
      request: '请求',
      team: '团队',
      onsite: '现场服务',
      report: '报告',
    },
  },
} as const

export const normalizeAssignmentStatus = (status?: string | null) => {
  switch (String(status || '').toLowerCase()) {
    case 'pending':
      return 'assigned'
    case 'cancelled':
      return 'declined'
    case 'assigned':
    case 'accepted':
    case 'in_progress':
    case 'completed':
    case 'declined':
      return String(status).toLowerCase() as 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'declined'
    default:
      return 'assigned'
  }
}

export const parseOrderMetadata = (text?: string | null) => {
  const metadata: Record<string, string> = {}

  String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.indexOf('=')
      if (separatorIndex <= 0) return
      const key = line.slice(0, separatorIndex).trim()
      const value = line.slice(separatorIndex + 1).trim()
      if (key) {
        metadata[key] = value
      }
    })

  return metadata
}

export const isFollowUpOrder = (orderLike?: { special_instructions?: string | null; notes?: string | null } | null) => {
  const metadata = parseOrderMetadata(orderLike?.special_instructions)
  if (metadata.follow_up_from_order || metadata.follow_up_source) {
    return true
  }

  const notes = String(orderLike?.notes || '').toLowerCase()
  return notes.includes('นัดดูแลต่อเนื่อง') || notes.includes('follow-up')
}

export const getFollowUpSourceOrderId = (orderLike?: { special_instructions?: string | null } | null) => {
  const metadata = parseOrderMetadata(orderLike?.special_instructions)
  return metadata.follow_up_from_order || null
}

export const getCustomerServiceFlow = (
  locale: SupportedLocale,
  orderStatus?: string | null,
  progress?: CustomerProgressSnapshot | null,
): CustomerServiceFlow => {
  const copy = FLOW_COPY[locale] || FLOW_COPY.th
  const normalizedOrderStatus = String(orderStatus || progress?.order_status || '').toLowerCase()
  const assignmentStatus = normalizeAssignmentStatus(progress?.assignment_status)
  const isAssigned = Boolean(progress?.is_assigned) || ['assigned', 'accepted', 'in_progress', 'completed'].includes(assignmentStatus)

  let stage: CustomerServiceFlow['stage'] = 'pending'
  if (normalizedOrderStatus === 'cancelled' || assignmentStatus === 'declined') {
    stage = 'cancelled'
  } else if (normalizedOrderStatus === 'completed' || assignmentStatus === 'completed') {
    stage = 'completed'
  } else if (normalizedOrderStatus === 'in_progress' || assignmentStatus === 'in_progress') {
    stage = 'in_progress'
  } else if (isAssigned) {
    stage = 'scheduled'
  } else if (normalizedOrderStatus === 'confirmed') {
    stage = 'confirmed'
  }

  const badgeTone = {
    pending: 'bg-[#f6f1e7] text-[#7c6754]',
    confirmed: 'bg-[#eef2ea] text-[#36503e]',
    scheduled: 'bg-[#edf6ef] text-[#24543a]',
    in_progress: 'bg-[#1f3b2f] text-white',
    completed: 'bg-[#111111] text-white',
    cancelled: 'bg-[#f5e9e6] text-[#8d4d43]',
  }[stage]

  const stepIndex = {
    pending: 0,
    confirmed: 0,
    scheduled: 1,
    in_progress: 2,
    completed: 3,
    cancelled: 0,
  }[stage]

  const stepKeys: Array<ServiceFlowStep['key']> = ['request', 'team', 'onsite', 'report']
  const steps = stepKeys.map((key, index) => ({
    key,
    label: copy.steps[key],
    state: index < stepIndex ? 'complete' : index === stepIndex ? 'current' : 'upcoming',
  }))

  const staffLine = progress?.staff_name
    ? copy.staffKnown.replace('{name}', progress.staff_name)
    : copy.staffPending

  return {
    stage,
    badgeLabel: copy.badge[stage],
    badgeTone,
    headline: copy.headline[stage],
    detail: copy.detail[stage],
    staffLine,
    steps,
  }
}