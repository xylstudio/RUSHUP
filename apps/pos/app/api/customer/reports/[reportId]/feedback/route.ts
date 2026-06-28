import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

const createServiceClient = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase service configuration')
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const isMissingFeedbackRelationError = (message: string) =>
  /work_report_feedback|relation .* does not exist|could not find the table/i.test(message)

const buildFeedbackResponse = (row: Record<string, unknown> | null, fallbackStorage?: 'audit_logs') => {
  if (!row) return null

  return {
    id: row.id || null,
    report_id: asText(row.report_id),
    order_id: asText(row.order_id),
    job_assignment_id: asText(row.job_assignment_id),
    staff_id: asText(row.staff_id),
    customer_id: asText(row.customer_id),
    feedback_type: asText(row.feedback_type),
    rating: typeof row.rating === 'number' ? row.rating : row.rating ? Number(row.rating) : null,
    comment_message: asText(row.comment_message) || null,
    issue_message: asText(row.issue_message) || null,
    source: asText(row.source) || 'web',
    status: asText(row.status) || 'new',
    created_at: asText(row.created_at) || null,
    updated_at: asText(row.updated_at) || null,
    ...(fallbackStorage ? { fallback_storage: fallbackStorage } : {}),
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const user = await resolveRequestUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reportId = asText(params?.reportId)
    if (!reportId) {
      return NextResponse.json({ error: 'Missing reportId' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const action = asText(body?.action)
    const source = asText(body?.source) || 'web'
    const commentMessage = asText(body?.comment_message)
    const issueMessage = asText(body?.issue_message)
    const ratingValue = Number(body?.rating)

    if (action !== 'rating' && action !== 'issue') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (action === 'rating' && (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    if (action === 'issue' && issueMessage.length < 5) {
      return NextResponse.json({ error: 'Issue message is too short' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: report, error: reportError } = await supabase
      .from('work_reports')
      .select('id, order_id, job_assignment_id, staff_id, customer_id')
      .eq('id', reportId)
      .maybeSingle()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (report.customer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, order_code')
      .eq('id', report.order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.customer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (action === 'rating') {
      const existingRatingResult = await supabase
        .from('work_report_feedback')
        .select('id, report_id, order_id, job_assignment_id, staff_id, customer_id, feedback_type, rating, comment_message, issue_message, source, status, created_at, updated_at')
        .eq('report_id', reportId)
        .eq('customer_id', user.id)
        .eq('feedback_type', 'rating')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (existingRatingResult.error) {
        if (!isMissingFeedbackRelationError(existingRatingResult.error.message || '')) {
          return NextResponse.json({ error: existingRatingResult.error.message }, { status: 500 })
        }

        const auditResult = await supabase
          .from('audit_logs')
          .select('id, created_at, details')
          .eq('user_id', user.id)
          .eq('action', 'customer_report_feedback_submitted')
          .order('created_at', { ascending: true })

        if (auditResult.error) {
          return NextResponse.json({ error: auditResult.error.message }, { status: 500 })
        }

        const existingAuditRating = (auditResult.data || []).find((log) => {
          const details = log.details && typeof log.details === 'object' ? log.details as Record<string, unknown> : {}
          return asText(details.report_id) === reportId && asText(details.feedback_type) === 'rating'
        })

        if (existingAuditRating) {
          const details = existingAuditRating.details && typeof existingAuditRating.details === 'object'
            ? existingAuditRating.details as Record<string, unknown>
            : {}

          return NextResponse.json({
            error: 'Rating already submitted',
            code: 'RATING_ALREADY_SUBMITTED',
            feedback: buildFeedbackResponse({
              id: null,
              report_id: reportId,
              order_id: report.order_id,
              job_assignment_id: report.job_assignment_id,
              staff_id: report.staff_id,
              customer_id: user.id,
              feedback_type: 'rating',
              rating: details.rating,
              comment_message: asText(details.comment_message) || null,
              issue_message: null,
              source: details.source,
              status: 'new',
              created_at: existingAuditRating.created_at,
              updated_at: existingAuditRating.created_at,
            }, 'audit_logs'),
          }, { status: 409 })
        }
      } else if (existingRatingResult.data) {
        return NextResponse.json({
          error: 'Rating already submitted',
          code: 'RATING_ALREADY_SUBMITTED',
          feedback: buildFeedbackResponse(existingRatingResult.data as Record<string, unknown>),
        }, { status: 409 })
      }
    }

    const insertPayload = {
      report_id: reportId,
      order_id: report.order_id,
      job_assignment_id: report.job_assignment_id,
      staff_id: report.staff_id,
      customer_id: user.id,
      feedback_type: action,
      rating: action === 'rating' ? ratingValue : null,
      comment_message: action === 'rating' ? commentMessage || null : null,
      issue_message: action === 'issue' ? issueMessage : null,
      source,
      status: 'new',
    }

    let feedback: Record<string, unknown> | null = null
    const { data: feedbackRow, error: feedbackError } = await supabase
      .from('work_report_feedback')
      .insert(insertPayload)
      .select('*')
      .single()

    if (feedbackError) {
      if ((feedbackError as { code?: string }).code === '23505' || /duplicate|unique/i.test(feedbackError.message || '')) {
        const existingRating = await supabase
          .from('work_report_feedback')
          .select('id, report_id, order_id, job_assignment_id, staff_id, customer_id, feedback_type, rating, comment_message, issue_message, source, status, created_at, updated_at')
          .eq('report_id', reportId)
          .eq('customer_id', user.id)
          .eq('feedback_type', 'rating')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        return NextResponse.json({
          error: 'Rating already submitted',
          code: 'RATING_ALREADY_SUBMITTED',
          feedback: buildFeedbackResponse((existingRating.data || null) as Record<string, unknown> | null),
        }, { status: 409 })
      }

      const fallbackAllowed = /work_report_feedback/i.test(feedbackError.message || '')
      if (!fallbackAllowed) {
        return NextResponse.json({ error: feedbackError.message }, { status: 500 })
      }

      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'customer_report_feedback_submitted',
        details: {
          report_id: reportId,
          order_id: report.order_id,
          order_code: order.order_code || null,
          job_assignment_id: report.job_assignment_id,
          staff_id: report.staff_id,
          feedback_type: action,
          rating: action === 'rating' ? ratingValue : null,
          comment_message: action === 'rating' ? commentMessage || null : null,
          issue_message: action === 'issue' ? issueMessage : null,
          source,
          fallback_storage: 'audit_logs',
        },
      })

      if (auditError) {
        return NextResponse.json({ error: auditError.message }, { status: 500 })
      }

      feedback = buildFeedbackResponse({
        id: null,
        ...insertPayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, 'audit_logs')
    } else {
      feedback = buildFeedbackResponse(feedbackRow as Record<string, unknown>)
    }

    const shouldNotify = action === 'issue' || (action === 'rating' && ratingValue <= 3)
    if (shouldNotify) {
      const recipients = new Set<string>()
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      for (const admin of admins || []) {
        if (admin?.id) recipients.add(admin.id)
      }
      if (report.staff_id) recipients.add(report.staff_id)

      if (recipients.size > 0) {
        const title = action === 'issue'
          ? 'ลูกค้าแจ้งปัญหาจากรายงานการดูแล'
          : 'ลูกค้าให้คะแนนรายงานการดูแล'
        const message = action === 'issue'
          ? `รายงานของออเดอร์ #${order.order_code || report.order_id.slice(0, 8)} มีการแจ้งปัญหาใหม่`
          : `รายงานของออเดอร์ #${order.order_code || report.order_id.slice(0, 8)} ได้รับคะแนน ${ratingValue}/5`

        await supabase.from('notifications').insert(
          Array.from(recipients).map((userId) => ({
            user_id: userId,
            title,
            message,
            type: action === 'issue' ? 'warning' : ratingValue <= 2 ? 'warning' : 'info',
            related_order_id: report.order_id,
            read: false,
            notification_category: 'system',
          }))
        )
      }
    }

    return NextResponse.json({ success: true, feedback })
  } catch (error) {
    console.error('POST /api/customer/reports/[reportId]/feedback error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
