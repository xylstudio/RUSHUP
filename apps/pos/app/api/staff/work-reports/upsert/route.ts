import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

const createServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const asOptionalText = (value: unknown) => {
  const text = asText(value)
  return text || null
}

const asStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[]
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const hasMeaningfulReportPayload = (payload: {
  work_done: string | null
  problems_found: string | null
  recommendations: string | null
  after_photos: string[]
  zones: any[]
}) => {
  const textValues = [payload.work_done, payload.problems_found, payload.recommendations]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)

  const hasGeneralPhoto = payload.after_photos.length > 0
  const hasZonePhoto = payload.zones.some(z => 
    (Array.isArray(z.after_photos) && z.after_photos.length > 0) || 
    (Array.isArray(z.photos) && z.photos.length > 0)
  )

  return textValues.length > 0 && (hasGeneralPhoto || hasZonePhoto)
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)
    const supabase = createServiceClient()

    const body = await req.json().catch(() => ({}))
    const finalize = body?.finalize === true

    const assignmentId = asText(body?.job_assignment_id)
    const orderId = asText(body?.order_id)

    if (!assignmentId || !orderId) {
      return NextResponse.json({ error: 'Missing assignment/order' }, { status: 400 })
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('job_assignments')
      .select('id, order_id, staff_id')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    if (assignment.order_id !== orderId) {
      return NextResponse.json({ error: 'Assignment/order mismatch' }, { status: 400 })
    }

    if (user) {
      if (assignment.staff_id !== user.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    const { data: order } = await supabase
      .from('orders')
      .select('customer_id, completed_sessions')
      .eq('id', orderId)
      .single()

    const payload = {
      job_assignment_id: assignmentId,
      order_id: orderId,
      staff_id: assignment.staff_id,
      customer_id: asText(order?.customer_id),
      work_done: asOptionalText(body?.work_done),
      problems_found: asOptionalText(body?.problems_found),
      recommendations: asOptionalText(body?.recommendations),
      next_visit_date: asOptionalText(body?.next_visit_date),
      next_visit_time_start: asOptionalText(body?.next_visit_time_start),
      next_visit_time_end: asOptionalText(body?.next_visit_time_end),
      next_visit_notes: asOptionalText(body?.next_visit_notes),
      before_photos: asStringArray(body?.before_photos),
      after_photos: asStringArray(body?.after_photos),
      zones: Array.isArray(body?.zones) ? body.zones.map((z: any) => ({
        id: String(z.id || ''),
        name: String(z.name || ''),
        work_done: String(z.work_done || z.workDone || ''),
        photos: Array.isArray(z.photos) ? z.photos.map((p: any) => String(p)) : [],
        before_photos: Array.isArray(z.before_photos) ? z.before_photos.map((p: any) => String(p)) : (Array.isArray(z.beforePhotos) ? z.beforePhotos.map((p: any) => String(p)) : []),
        after_photos: Array.isArray(z.after_photos) ? z.after_photos.map((p: any) => String(p)) : (Array.isArray(z.afterPhotos) ? z.afterPhotos.map((p: any) => String(p)) : [])
      })) : []
    }

    if (finalize && !hasMeaningfulReportPayload(payload)) {
      return NextResponse.json(
        { error: 'A completion report requires meaningful notes and at least one after photo.' },
        { status: 400 }
      )
    }

    const { data: report, error: saveError } = await supabase
      .from('work_reports')
      .upsert(payload, { onConflict: 'job_assignment_id' })
      .select('id, job_assignment_id, order_id, staff_id, customer_id, work_done, problems_found, recommendations, next_visit_date, next_visit_time_start, next_visit_time_end, next_visit_notes, before_photos, after_photos, zones, created_at, updated_at')
      .single()

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    // If finalized, increment completed_sessions on the order
    if (finalize) {
      // Fetch fresh count to avoid race conditions
      const { data: freshOrder } = await supabase
        .from('orders')
        .select('completed_sessions')
        .eq('id', orderId)
        .single()

      const currentCount = (freshOrder as any)?.completed_sessions || 0
      const nextCount = currentCount + 1

      const { error: incError } = await supabase
        .from('orders')
        .update({ completed_sessions: nextCount })
        .eq('id', orderId)

      if (incError) {
        console.error(`CRITICAL: Failed to increment session for order ${orderId}:`, incError)
      } else {
        console.log(`Successfully incremented session for order ${orderId} to ${nextCount}`)
      }
    }

    return NextResponse.json({ success: true, report })
  } catch (err) {
    console.error('POST /api/staff/work-reports/upsert error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
