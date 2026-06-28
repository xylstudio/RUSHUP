import type { Locale } from '@/lib/I18nContext'
import { formatDateByLocale, formatDateTimeByLocale } from '@/lib/localeFormat'

export type CustomerReportItem = {
  id: string
  orderId: string | null
  orderCode: string | null
  orderStatus?: string | null
  orderScheduledDate?: string | null
  houseId: string | null
  houseCode: string | null
  houseName: string | null
  houseAddress: string | null
  serviceName: string | null
  jobAssignmentId: string | null
  pricingPeriod?: 'one-time' | 'monthly' | 'yearly' | null
  workDone: string | null
  problemsFound: string | null
  recommendations: string | null
  nextVisitDate: string | null
  nextVisitTimeStart: string | null
  nextVisitTimeEnd: string | null
  nextVisitNotes: string | null
  beforePhotos: string[]
  afterPhotos: string[]
  updatedAt: string | null
  createdAt: string | null
  staff_name?: string | null
  staff_phone?: string | null
  feedbackEntries?: CustomerReportFeedbackItem[]
  customerRating?: CustomerReportFeedbackItem | null
  latestIssueFeedback?: CustomerReportFeedbackItem | null
  annualVisitSequence?: number | null
  annualVisitTotal?: number | null
  annualCompletedVisits?: number
  annualPendingVisits?: number
  annualNextDueAt?: string | null
  zones?: WorkReportZone[]
}

export type WorkReportZone = {
  id: string
  name: string
  workDone: string
  photos: string[]
  beforePhotos?: string[]
  afterPhotos?: string[]
}

export type CustomerReportFeedbackItem = {
  id: string | null
  reportId: string
  orderId: string | null
  jobAssignmentId: string | null
  staffId: string | null
  customerId: string | null
  feedbackType: 'rating' | 'issue'
  rating: number | null
  commentMessage: string | null
  issueMessage: string | null
  source: string | null
  status: string | null
  createdAt: string | null
  updatedAt: string | null
  fallbackStorage?: 'audit_logs'
}

export type CustomerReportPlanItem = {
  id: string
  orderId: string
  orderCode: string | null
  houseId: string | null
  houseCode: string | null
  houseName: string | null
  houseAddress: string | null
  serviceName: string | null
  pricingPeriod: 'yearly'
  sequenceNumber: number
  monthIndex: number
  visitWindow: 'first-half' | 'second-half'
  dueDate: string
  dueAt: string
  status: 'completed' | 'pending'
  linkedReportId: string | null
  linkedReportUpdatedAt: string | null
}

export type CustomerReportSummary = {
  totalReports: number
  totalOrders: number
  totalHouses: number
  reportsWithIssues: number
  totalBeforePhotos: number
  totalAfterPhotos: number
  latestReportAt: string | null
  nextVisitAt: string | null
  plannedReports: number
  completedPlannedReports: number
  pendingPlannedReports: number
  nextPlannedReportAt: string | null
  annualPlanOrders: number
}

type OrderLookupRow = {
  id: string
  order_code?: string | null
  status?: string | null
  house_id?: string | null
  house_code?: string | null
  pricing_period?: 'one-time' | 'monthly' | 'yearly' | null
  scheduled_date?: string | null
  created_at?: string | null
  services?: {
    service_name?: string | null
  } | null
  houses?: {
    id?: string | null
    house_code?: string | null
    name?: string | null
    address?: string | null
  } | null
}

type HouseAccessRow = {
  id: string
  house_code?: string | null
}

type WorkReportRow = {
  id: string
  order_id?: string | null
  job_assignment_id?: string | null
  work_done?: string | null
  problems_found?: string | null
  recommendations?: string | null
  next_visit_date?: string | null
  next_visit_time_start?: string | null
  next_visit_time_end?: string | null
  next_visit_notes?: string | null
  before_photos?: string[] | null
  after_photos?: string[] | null
  updated_at?: string | null
  created_at?: string | null
  zones?: any[] | null
  profiles?: {
    display_name?: string | null
  } | null
}

type WorkReportFeedbackRow = {
  id?: string | null
  report_id?: string | null
  order_id?: string | null
  job_assignment_id?: string | null
  staff_id?: string | null
  customer_id?: string | null
  feedback_type?: 'rating' | 'issue' | string | null
  rating?: number | string | null
  comment_message?: string | null
  issue_message?: string | null
  source?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type CustomerReportFetchOptions = {
  orderId?: string | null
  houseId?: string | null
  limit?: number
}

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const normalizePhotoList = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[]
  return value.filter((item): item is string => isNonEmptyString(item))
}

const normalizeLimit = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 50
  return Math.max(1, Math.min(200, Math.floor(value)))
}

const mergeRowsById = <T extends { id: string }>(...groups: Array<T[] | null | undefined>) => {
  const map = new Map<string, T>()
  for (const group of groups) {
    for (const item of group || []) {
      map.set(item.id, item)
    }
  }
  return Array.from(map.values())
}

const isMissingReportFeedbackRelationError = (message: string) =>
  /work_report_feedback|relation .* does not exist|could not find the table/i.test(message)

const isMissingRelationError = (message: string) =>
  /relation .* does not exist|could not find the table|schema cache/i.test(message)

const isMissingSchemaFieldError = (message: string) =>
  /column .* does not exist|42703|schema cache/i.test(message)

const toUtcDate = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day))

const getDaysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

const parseDateLike = (value?: string | null) => {
  if (!value) return null

  const direct = /^\d{4}-\d{2}-\d{2}/.exec(value)
  if (direct) {
    const [year, month, day] = direct[0].split('-').map(Number)
    return toUtcDate(year, month - 1, day)
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return toUtcDate(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
}

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10)

const sortReportsChronologically = (items: CustomerReportItem[]) => {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime()
    const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime()
    return aTime - bTime
  })
}

const sortByUpdatedAt = <T extends { updatedAt: string | null; createdAt: string | null }>(items: T[]) => {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime()
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime()
    return bTime - aTime
  })
}

export const formatCustomerReportDate = (value?: string | null, locale: Locale = 'th') =>
  formatDateByLocale(value, locale, { day: 'numeric', month: 'short', year: 'numeric' })

export const formatCustomerReportDateTime = (value?: string | null, locale: Locale = 'th') =>
  formatDateTimeByLocale(value, locale, { dateStyle: 'medium', timeStyle: 'short' })

export const getCustomerReportStatusText = (report?: CustomerReportItem | null, locale: Locale = 'th') => {
  if (!report) {
    return locale === 'en' ? 'Waiting for data' : locale === 'zh' ? '等待数据' : 'กำลังรอข้อมูล'
  }
  if (report.problemsFound?.trim()) {
    return locale === 'en' ? 'Needs follow-up' : locale === 'zh' ? '需要跟进' : 'ต้องติดตามเพิ่มเติม'
  }
  return locale === 'en' ? 'Healthy' : locale === 'zh' ? '状态正常' : 'ปกติดี'
}

export const extractCustomerReportTasks = (raw?: string | null, maxItems = 4) => {
  if (!raw) return [] as string[]

  const byLine = raw
    .split('\n')
    .map((line) => line.replace(/^[-•\s]+/, '').trim())
    .filter(Boolean)

  if (byLine.length > 0) return byLine.slice(0, maxItems)

  return raw
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
}

const buildAnnualReportPlan = (order: OrderLookupRow, reports: CustomerReportItem[]): CustomerReportPlanItem[] => {
  if (order.pricing_period !== 'yearly') return []

  const startDate = parseDateLike(order.scheduled_date || order.created_at)
  if (!startDate) return []

  const baseDay = startDate.getUTCDate()
  const startYear = startDate.getUTCFullYear()
  const startMonth = startDate.getUTCMonth()
  const orderedReports = sortReportsChronologically(reports)

  return Array.from({ length: 12 }, (_, monthOffset) => {
    const absoluteMonth = startMonth + monthOffset
    const year = startYear + Math.floor(absoluteMonth / 12)
    const month = absoluteMonth % 12
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = Math.min(baseDay, daysInMonth)
    const rawSecondDay = Math.min(baseDay + 14, daysInMonth)
    const secondDay = rawSecondDay <= firstDay && daysInMonth > firstDay ? firstDay + 1 : rawSecondDay
    const firstDate = toUtcDate(year, month, firstDay)
    const secondDate = toUtcDate(year, month, secondDay)

    return [firstDate, secondDate].map((dueDate, visitIndex) => {
      const sequenceNumber = monthOffset * 2 + visitIndex + 1
      const linkedReport = orderedReports[sequenceNumber - 1] || null

      const planItem: CustomerReportPlanItem = {
        id: `${order.id}:${sequenceNumber}`,
        orderId: order.id,
        orderCode: order.order_code || null,
        houseId: order.houses?.id || order.house_id || null,
        houseCode: order.houses?.house_code || order.house_code || null,
        houseName: order.houses?.name || order.house_code || order.order_code || null,
        houseAddress: order.houses?.address || null,
        serviceName: order.services?.service_name || null,
        pricingPeriod: 'yearly' as const,
        sequenceNumber,
        monthIndex: monthOffset + 1,
        visitWindow: visitIndex === 0 ? 'first-half' : 'second-half',
        dueDate: toIsoDate(dueDate),
        dueAt: dueDate.toISOString(),
        status: linkedReport ? 'completed' : 'pending',
        linkedReportId: linkedReport?.id || null,
        linkedReportUpdatedAt: linkedReport?.updatedAt || linkedReport?.createdAt || null,
      }

      return planItem
    })
  }).flat()
}

export const buildCustomerReportSummary = (
  reports: CustomerReportItem[],
  planItems: CustomerReportPlanItem[] = []
): CustomerReportSummary => {
  const sorted = sortByUpdatedAt(reports)
  const nextVisit = reports
    .filter((item) => !!item.nextVisitDate)
    .map((item) => new Date(item.nextVisitDate || 0))
    .filter((item) => !Number.isNaN(item.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())[0]
  const nextPlanned = planItems.find((item) => item.status === 'pending') || null
  const effectiveNextVisitAt = nextVisit?.toISOString() || nextPlanned?.dueAt || null

  return {
    totalReports: reports.length,
    totalOrders: new Set(reports.map((item) => item.orderId).filter(Boolean)).size,
    totalHouses: new Set(reports.map((item) => item.houseId || item.houseCode).filter(Boolean)).size,
    reportsWithIssues: reports.filter((item) => !!item.problemsFound?.trim()).length,
    totalBeforePhotos: reports.reduce((sum, item) => sum + item.beforePhotos.length, 0),
    totalAfterPhotos: reports.reduce((sum, item) => sum + item.afterPhotos.length, 0),
    latestReportAt: sorted[0]?.updatedAt || sorted[0]?.createdAt || null,
    nextVisitAt: effectiveNextVisitAt,
    plannedReports: planItems.length,
    completedPlannedReports: planItems.filter((item) => item.status === 'completed').length,
    pendingPlannedReports: planItems.filter((item) => item.status === 'pending').length,
    nextPlannedReportAt: nextPlanned?.dueAt || null,
    annualPlanOrders: new Set(planItems.map((item) => item.orderId)).size,
  }
}

export const buildHouseReportSummaries = (reports: CustomerReportItem[]) => {
  const groups = new Map<string, CustomerReportItem[]>()

  for (const report of reports) {
    const key = report.houseId || report.houseCode || report.orderId || report.id
    const existing = groups.get(key)
    if (existing) {
      existing.push(report)
      continue
    }
    groups.set(key, [report])
  }

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const sorted = sortByUpdatedAt(items)
      const latest = sorted[0] || null
      const nextVisit = items
        .filter((item) => !!item.nextVisitDate)
        .map((item) => new Date(item.nextVisitDate || 0))
        .filter((item) => !Number.isNaN(item.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())[0]

      return {
        key,
        houseId: latest?.houseId || null,
        houseCode: latest?.houseCode || null,
        houseName: latest?.houseName || 'บ้านของคุณ',
        houseAddress: latest?.houseAddress || 'ไม่ได้ระบุที่อยู่',
        reportCount: items.length,
        latestAt: latest?.updatedAt || latest?.createdAt || null,
        nextVisitAt: nextVisit ? nextVisit.toISOString() : null,
        statusText: getCustomerReportStatusText(latest),
      }
    })
    .sort((a, b) => {
      const aTime = new Date(a.latestAt || 0).getTime()
      const bTime = new Date(b.latestAt || 0).getTime()
      return bTime - aTime
    })
}

export const buildLatestCustomerReportByOrderId = (reports: CustomerReportItem[]) => {
  return reports.reduce((map, report) => {
    if (!report.orderId) return map

    const current = map.get(report.orderId)
    if (!current) {
      map.set(report.orderId, report)
      return map
    }

    const currentTime = new Date(current.updatedAt || current.createdAt || 0).getTime()
    const nextTime = new Date(report.updatedAt || report.createdAt || 0).getTime()
    if (nextTime > currentTime) {
      map.set(report.orderId, report)
    }

    return map
  }, new Map<string, CustomerReportItem>())
}

export const getCustomerReportSummaryText = (report?: CustomerReportItem | null) => {
  if (!report) return ''

  const firstTask = extractCustomerReportTasks(report.workDone, 1)[0]
  if (firstTask) return firstTask
  if (report.recommendations?.trim()) return report.recommendations.trim()
  if (report.problemsFound?.trim()) return report.problemsFound.trim()
  return ''
}

export const normalizeCustomerReportRows = (reportRows: WorkReportRow[], orders: OrderLookupRow[]) => {
  const orderById = new Map<string, OrderLookupRow>()
  for (const order of orders) orderById.set(order.id, order)

  const mapped = reportRows.map<CustomerReportItem>((row) => {
    const linkedOrder = row.order_id ? orderById.get(row.order_id) : null

    return {
      id: row.id,
      orderId: row.order_id || null,
      orderCode: linkedOrder?.order_code || null,
      orderStatus: linkedOrder?.status || null,
      orderScheduledDate: linkedOrder?.scheduled_date || null,
      houseId: linkedOrder?.houses?.id || linkedOrder?.house_id || null,
      houseCode: linkedOrder?.houses?.house_code || linkedOrder?.house_code || null,
      houseName: linkedOrder?.houses?.name || linkedOrder?.house_code || linkedOrder?.order_code || null,
      houseAddress: linkedOrder?.houses?.address || null,
      serviceName: linkedOrder?.services?.service_name || null,
      jobAssignmentId: row.job_assignment_id || null,
      pricingPeriod: linkedOrder?.pricing_period || null,
      workDone: row.work_done || null,
      problemsFound: row.problems_found || null,
      recommendations: row.recommendations || null,
      nextVisitDate: row.next_visit_date || null,
      nextVisitTimeStart: row.next_visit_time_start || null,
      nextVisitTimeEnd: row.next_visit_time_end || null,
      nextVisitNotes: row.next_visit_notes || null,
      beforePhotos: normalizePhotoList(row.before_photos),
      afterPhotos: normalizePhotoList(row.after_photos),
      updatedAt: row.updated_at || null,
      createdAt: row.created_at || null,
      staff_name: row.profiles?.display_name || null,
      zones: Array.isArray(row.zones) ? row.zones.map((z: any) => ({
        id: String(z.id || ''),
        name: String(z.name || ''),
        workDone: String(z.workDone || z.work_done || ''),
        photos: Array.isArray(z.photos) ? z.photos : [],
        beforePhotos: Array.isArray(z.before_photos) ? z.before_photos : (Array.isArray(z.beforePhotos) ? z.beforePhotos : []),
        afterPhotos: Array.isArray(z.after_photos) ? z.after_photos : (Array.isArray(z.afterPhotos) ? z.afterPhotos : []),
      })) : []
    }
  }).filter((report) => !report.orderId || !!report.orderCode)

  return sortByUpdatedAt(mapped)
}

const normalizeCustomerReportFeedbackRows = (rows: WorkReportFeedbackRow[]) => {
  return rows
    .map<CustomerReportFeedbackItem | null>((row) => {
      const reportId = asText(row.report_id)
      const feedbackType = asText(row.feedback_type)
      if (!reportId || (feedbackType !== 'rating' && feedbackType !== 'issue')) return null

      return {
        id: row.id ? String(row.id) : null,
        reportId,
        orderId: asText(row.order_id) || null,
        jobAssignmentId: asText(row.job_assignment_id) || null,
        staffId: asText(row.staff_id) || null,
        customerId: asText(row.customer_id) || null,
        feedbackType,
        rating: typeof row.rating === 'number' ? row.rating : row.rating ? Number(row.rating) : null,
        commentMessage: asText(row.comment_message) || null,
        issueMessage: asText(row.issue_message) || null,
        source: asText(row.source) || null,
        status: asText(row.status) || null,
        createdAt: asText(row.created_at) || null,
        updatedAt: asText(row.updated_at) || null,
      }
    })
    .filter((item): item is CustomerReportFeedbackItem => !!item)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
}

export const fetchCustomerReports = async (
  supabase: any,
  customerId: string,
  options: CustomerReportFetchOptions = {}
) => {
  const normalizedOrderId = isNonEmptyString(options.orderId) ? options.orderId.trim() : ''
  const normalizedHouseId = isNonEmptyString(options.houseId) ? options.houseId.trim() : ''
  const limit = normalizeLimit(options.limit)

  const runOrderQuery = async (buildQuery: (selectClause: string) => any) => {
    const primaryResult = await buildQuery(
      'id, order_code, status, house_id, house_code, pricing_period, scheduled_date, created_at, services(service_name), houses(id, house_code, name, address)'
    )

    if (primaryResult.error) {
      if (!isMissingSchemaFieldError(primaryResult.error.message || '')) throw primaryResult.error

      const fallbackResult = await buildQuery(
        'id, order_code, house_id, house_code, scheduled_date, created_at, services(service_name), houses(id, house_code, name, address)'
      )
      if (fallbackResult.error) throw fallbackResult.error
      return (fallbackResult.data as OrderLookupRow[]) || []
    }

    return (primaryResult.data as OrderLookupRow[]) || []
  }

  const runReportQuery = async (buildQuery: (selectClause: string) => any) => {
    const primaryResult = await buildQuery(
      'id, order_id, job_assignment_id, work_done, problems_found, recommendations, next_visit_date, next_visit_time_start, next_visit_time_end, next_visit_notes, before_photos, after_photos, updated_at, created_at, zones, profiles:staff_id(display_name)'
    )

    if (primaryResult.error) {
      if (!isMissingSchemaFieldError(primaryResult.error.message || '')) {
        return { data: [] as WorkReportRow[], error: primaryResult.error }
      }

      const fallbackResult = await buildQuery(
        'id, order_id, job_assignment_id, work_done, problems_found, recommendations, next_visit_date, before_photos, after_photos, updated_at, created_at, zones, profiles:staff_id(display_name)'
      )

      if (fallbackResult.error) {
        return { data: [] as WorkReportRow[], error: fallbackResult.error }
      }

      return { data: (fallbackResult.data as WorkReportRow[]) || [], error: null }
    }

    return { data: (primaryResult.data as WorkReportRow[]) || [], error: null }
  }

  const loadOwnedHouses = async () => {
    const ownedResult = await supabase
      .from('houses')
      .select('id, house_code')
      .or(`user_id.eq.${customerId},customer_id.eq.${customerId}`)

    if (ownedResult.error) throw ownedResult.error
    return (ownedResult.data as HouseAccessRow[]) || []
  }

  const loadCollaboratorHouses = async () => {
    const collaborationResult = await supabase
      .from('house_collaborators')
      .select('house_id')
      .eq('user_id', customerId)

    if (collaborationResult.error) {
      if (isMissingRelationError(collaborationResult.error.message || '')) {
        return [] as HouseAccessRow[]
      }
      throw collaborationResult.error
    }

    const collaboratorHouseIds = Array.from(
      new Set(
        (((collaborationResult.data as Array<{ house_id?: string | null }> | null) || [])
          .map((row) => row.house_id)
          .filter(Boolean)) as string[]
      )
    )

    if (collaboratorHouseIds.length === 0) return [] as HouseAccessRow[]

    const collaboratorHousesResult = await supabase
      .from('houses')
      .select('id, house_code')
      .in('id', collaboratorHouseIds)

    if (collaboratorHousesResult.error) throw collaboratorHousesResult.error
    return (collaboratorHousesResult.data as HouseAccessRow[]) || []
  }

  const accessibleHouses = mergeRowsById(await loadOwnedHouses(), await loadCollaboratorHouses())
  const accessibleHouseIds = accessibleHouses.map((house) => house.id)
  const accessibleHouseCodes = Array.from(new Set(accessibleHouses.map((house) => house.house_code).filter(isNonEmptyString)))

  const customerScopedOrders = await runOrderQuery((selectClause) => {
    let orderQuery = supabase
      .from('orders')
      .select(selectClause)
      .eq('customer_id', customerId)

    if (normalizedOrderId) {
      orderQuery = orderQuery.eq('id', normalizedOrderId)
    }

    return orderQuery
  })

  const ordersByHouseId = accessibleHouseIds.length > 0
    ? await runOrderQuery((selectClause) => {
        let orderQuery = supabase
          .from('orders')
          .select(selectClause)
          .in('house_id', accessibleHouseIds)

        if (normalizedOrderId) {
          orderQuery = orderQuery.eq('id', normalizedOrderId)
        }

        return orderQuery
      })
    : []

  const ordersByHouseCode = accessibleHouseCodes.length > 0
    ? await runOrderQuery((selectClause) => {
        let orderQuery = supabase
          .from('orders')
          .select(selectClause)
          .in('house_code', accessibleHouseCodes)

        if (normalizedOrderId) {
          orderQuery = orderQuery.eq('id', normalizedOrderId)
        }

        return orderQuery
      })
    : []

  const candidateOrders = mergeRowsById(customerScopedOrders, ordersByHouseId, ordersByHouseCode)
  const candidateOrderIds = candidateOrders.map((order) => order.id)

  const customerReportResult = await runReportQuery((selectClause) => {
    let reportQuery = supabase
      .from('work_reports')
      .select(selectClause)
      .eq('customer_id', customerId)

    if (normalizedOrderId) {
      reportQuery = reportQuery.eq('order_id', normalizedOrderId)
    }

    return reportQuery
      .order('updated_at', { ascending: false })
      .limit(limit)
  })

  const orderScopedReportResult = candidateOrderIds.length > 0
    ? await runReportQuery((selectClause) => {
        return supabase
          .from('work_reports')
          .select(selectClause)
          .in('order_id', candidateOrderIds)
          .order('updated_at', { ascending: false })
          .limit(limit)
      })
    : { data: [] as WorkReportRow[], error: null }

  let reportRows: WorkReportRow[] = []
  if (customerReportResult.error) {
    if (candidateOrderIds.length === 0 || !isMissingSchemaFieldError(customerReportResult.error.message || '')) {
      throw customerReportResult.error
    }

    if (orderScopedReportResult.error) throw orderScopedReportResult.error
    reportRows = orderScopedReportResult.data
  } else {
    if (orderScopedReportResult.error) throw orderScopedReportResult.error
    reportRows = mergeRowsById(
      customerReportResult.data,
      orderScopedReportResult.data
    ).sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime()
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime()
      return bTime - aTime
    }).slice(0, limit)
  }

  const reportOrderIds = Array.from(new Set(reportRows.map((row) => row.order_id).filter(isNonEmptyString)))
  const reportLinkedOrders = reportOrderIds.length > 0
    ? await runOrderQuery((selectClause) => {
        return supabase
          .from('orders')
          .select(selectClause)
          .in('id', reportOrderIds)
      })
    : []

  const orderRows = mergeRowsById(candidateOrders, reportLinkedOrders)
  const safeOrders = orderRows.filter((order) => {
    if (!normalizedHouseId) return true

    return [order.house_id, order.house_code, order.houses?.id, order.houses?.house_code]
      .filter(Boolean)
      .some((value) => value === normalizedHouseId)
  })

  let reports = normalizeCustomerReportRows(reportRows, orderRows)
  if (normalizedHouseId) {
    reports = reports.filter((report) => [report.houseId, report.houseCode].filter(Boolean).some((value) => value === normalizedHouseId))
  }

  if (normalizedOrderId) {
    reports = reports.filter((report) => report.orderId === normalizedOrderId)
  }

  const reportIds = reports.map((report) => report.id)

  let feedbackEntries: CustomerReportFeedbackItem[] = []
  if (reportIds.length > 0) {
    const loadFeedback = async (selectClause: string) => {
      return supabase
        .from('work_report_feedback')
        .select(selectClause)
        .in('report_id', reportIds)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
    }

    const feedbackResult = await loadFeedback(
      'id, report_id, order_id, job_assignment_id, staff_id, customer_id, feedback_type, rating, comment_message, issue_message, source, status, created_at, updated_at'
    )

    if (feedbackResult.error) {
      const feedbackErrorMessage = feedbackResult.error.message || ''

      if (isMissingSchemaFieldError(feedbackErrorMessage)) {
        const fallbackFeedbackResult = await loadFeedback(
          'id, report_id, order_id, job_assignment_id, staff_id, customer_id, feedback_type, rating, issue_message, source, status, created_at, updated_at'
        )

        if (fallbackFeedbackResult.error) {
          if (!isMissingReportFeedbackRelationError(fallbackFeedbackResult.error.message || '')) {
            throw fallbackFeedbackResult.error
          }
        } else {
          feedbackEntries = normalizeCustomerReportFeedbackRows((fallbackFeedbackResult.data as WorkReportFeedbackRow[]) || [])
        }
      } else if (!isMissingReportFeedbackRelationError(feedbackErrorMessage)) {
        throw feedbackResult.error
      }
    } else {
      feedbackEntries = normalizeCustomerReportFeedbackRows((feedbackResult.data as WorkReportFeedbackRow[]) || [])
    }
  }

  const reportsByOrderId = reports.reduce((map, report) => {
    if (!report.orderId) return map
    const existing = map.get(report.orderId)
    if (existing) {
      existing.push(report)
      return map
    }

    map.set(report.orderId, [report])
    return map
  }, new Map<string, CustomerReportItem[]>())
  const plans = safeOrders.flatMap((order) => buildAnnualReportPlan(order, reportsByOrderId.get(order.id) || []))
  const planByReportId = new Map<string, CustomerReportPlanItem>()
  for (const plan of plans) {
    if (plan.linkedReportId) {
      planByReportId.set(plan.linkedReportId, plan)
    }
  }

  const feedbackByReportId = feedbackEntries.reduce((map, entry) => {
    const existing = map.get(entry.reportId)
    if (existing) {
      existing.push(entry)
    } else {
      map.set(entry.reportId, [entry])
    }
    return map
  }, new Map<string, CustomerReportFeedbackItem[]>())

  const enrichedReports = reports.map((report) => {
    const planItem = planByReportId.get(report.id)
    const entries = feedbackByReportId.get(report.id) || []
    const ratingEntry = entries.find((entry) => entry.feedbackType === 'rating') || null
    const issueEntry = entries.find((entry) => entry.feedbackType === 'issue') || null
    const reportPlanItems = report.orderId ? plans.filter((item) => item.orderId === report.orderId) : []

    return {
      ...report,
      feedbackEntries: entries,
      customerRating: ratingEntry,
      latestIssueFeedback: issueEntry,
      annualVisitSequence: planItem?.sequenceNumber || null,
      annualVisitTotal: reportPlanItems.length || null,
      annualCompletedVisits: reportPlanItems.filter((item) => item.status === 'completed').length,
      annualPendingVisits: reportPlanItems.filter((item) => item.status === 'pending').length,
      annualNextDueAt: reportPlanItems.find((item) => item.status === 'pending')?.dueAt || null,
    }
  })

  return {
    reports: enrichedReports,
    summary: buildCustomerReportSummary(enrichedReports, plans),
    plans,
  }
}