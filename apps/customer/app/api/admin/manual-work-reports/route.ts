import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { sendLinePushToOrderStakeholders } from '@/lib/server/lineMessaging'

export const dynamic = 'force-dynamic'

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const generateOrderCode = () => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  return `ORD${timestamp}${random}`
}

const createServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

const ensureAdmin = async (
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error || !profile) return false
  return String(profile.role || '').toLowerCase() === 'admin'
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServiceClient()
    const isAdmin = await ensureAdmin(supabase, user.id)
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const [customersRes, ordersRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, email')
        .eq('role', 'customer')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('orders')
        .select('id, order_code, customer_id, status, created_at, pricing_period, total_sessions, completed_sessions, services(service_name, name), houses(name, image_url)')
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1000),
    ])

    if (customersRes.error) return NextResponse.json({ error: customersRes.error.message }, { status: 500 })
    if (ordersRes.error) return NextResponse.json({ error: ordersRes.error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      customers: customersRes.data || [],
      orders: ordersRes.data || [],
    })
  } catch (error) {
    console.error('GET /api/admin/manual-work-reports error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const serviceSupabase = createServiceClient()
    const user = await resolveRequestUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = await ensureAdmin(serviceSupabase, user.id)
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))

    const customerId = asText(body?.customer_id)
    const sharedWorkDone = asText(body?.work_done)
    const problemsFound = asText(body?.problems_found)
    const recommendations = asText(body?.recommendations)
    const nextVisitDate = asText(body?.next_visit_date)
    
    // Structured batch data from new UI
    const batchDataInput = body?.batch_reports_data
    const hasStructuredBatch = Array.isArray(batchDataInput) && batchDataInput.length > 0

    // Legacy or simplified input
    const orderId = asText(body?.order_id)
    const orderIdsInput = body?.order_ids
    const legacyOrderIds = Array.isArray(orderIdsInput) ? orderIdsInput.map(asText).filter(Boolean) : (orderId ? [orderId] : [])

    if (!customerId || (!hasStructuredBatch && legacyOrderIds.length === 0)) {
      return NextResponse.json({ error: 'Missing required fields (customer_id/order_ids)' }, { status: 400 })
    }

    const { data: staffProfile } = await serviceSupabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()

    const staffName = asText(staffProfile?.display_name) || 'ทีมงาน Xylem'
    const results = []
    const carouselReports = []

    // Process each report
    const targetOrders = hasStructuredBatch ? batchDataInput : legacyOrderIds.map(id => ({ order_id: id }))

    for (const item of targetOrders) {
      const currentOrderId = item.order_id
      const individualWorkDone = asText(item.individual_work_done)
      const itemProblemsFound = asText(item.problems_found)
      const itemRecommendations = asText(item.recommendations)
      const beforePhotos = Array.isArray(item.before_photos) ? item.before_photos : []
      const afterPhotos = Array.isArray(item.after_photos) ? item.after_photos : []

      // 1. Fetch Fresh Order Info
      const { data: order, error: orderError } = await serviceSupabase
        .from('orders')
        .select('id, customer_id, order_code, service_id, house_id, completed_sessions, total_sessions, houses(name), services(service_name, name)')
        .eq('id', currentOrderId)
        .single()

      if (orderError || !order) {
        results.push({ orderId: currentOrderId, error: 'Order not found' })
        continue
      }

      // 2. Create Job Assignment (Force completed)
      const assignmentNow = new Date().toISOString()
      const { data: assignment, error: assignmentError } = await serviceSupabase
        .from('job_assignments')
        .insert({
          order_id: currentOrderId,
          staff_id: user.id,
          status: 'completed',
          notes: 'manual_batch_report_by_admin',
          assigned_at: assignmentNow,
          accepted_at: assignmentNow,
          started_at: assignmentNow,
          completed_at: assignmentNow,
        })
        .select('id')
        .single()

      if (assignmentError || !assignment) {
        results.push({ orderId: currentOrderId, error: 'Failed to create assignment' })
        continue
      }

      // 3. Create Work Report
      const finalWorkDone = individualWorkDone || sharedWorkDone
      const itemNextVisitDate = asText(item.next_visit_date) || nextVisitDate
      const itemZones = Array.isArray(item.zones) ? item.zones : []
      
      const { data: report, error: reportError } = await serviceSupabase
        .from('work_reports')
        .insert({
          job_assignment_id: assignment.id,
          order_id: currentOrderId,
          staff_id: user.id,
          customer_id: customerId,
          work_done: finalWorkDone,
          problems_found: itemProblemsFound || problemsFound || null,
          recommendations: itemRecommendations || recommendations || null,
          next_visit_date: itemNextVisitDate || null,
          before_photos: beforePhotos,
          after_photos: afterPhotos,
          zones: itemZones,
        })
        .select('id, updated_at')
        .single()

      if (reportError) {
        results.push({ orderId: currentOrderId, error: reportError.message })
        continue
      }

      // 4. Atomic Increment Session Counter
      const { data: freshOrder } = await serviceSupabase
        .from('orders')
        .select('completed_sessions, total_sessions, pricing_period')
        .eq('id', currentOrderId)
        .single()

      const totalSessions = (freshOrder as any)?.total_sessions || 0
      const nextCount = ((freshOrder as any)?.completed_sessions || 0) + 1
      const pricingPeriod = (freshOrder as any)?.pricing_period || 'one-time'
      
      const updateData: any = { completed_sessions: nextCount }
      let isCompletedNow = false
      if (totalSessions > 0 && nextCount >= totalSessions) {
        updateData.status = 'completed'
        isCompletedNow = true
      } else if (!totalSessions || pricingPeriod === 'one-time') {
        updateData.status = 'completed'
        isCompletedNow = true
      }

      if (!isCompletedNow && itemNextVisitDate) {
        // If the order is still active (e.g., yearly plan), just update its next scheduled date
        updateData.scheduled_date = itemNextVisitDate
      }
      
      await serviceSupabase.from('orders').update(updateData).eq('id', currentOrderId)

      // 4.5. Create Follow-up Order ONLY IF the current order is fully completed but a next visit was still specified
      if (itemNextVisitDate && isCompletedNow) {
        const followUpOrderCodeValue = generateOrderCode()
        const followUpNotes = `นัดดูแลต่อเนื่องจากงาน #${asText(order.order_code) || currentOrderId.slice(0, 8)}`
        const followUpSpecialInstructions = [
          'follow_up_source=manual_work_report',
          `follow_up_from_order=${currentOrderId}`,
          `follow_up_from_assignment=${assignment.id}`,
          `follow_up_report=${report.id}`,
        ].join('\n')

        await serviceSupabase.from('orders').insert({
          customer_id: customerId,
          house_id: order.house_id,
          service_id: order.service_id,
          order_code: followUpOrderCodeValue,
          service_area: (freshOrder as any)?.service_area || 0,
          base_price: (freshOrder as any)?.base_price || 0,
          calculated_price: (freshOrder as any)?.calculated_price || 0,
          additional_services_price: (freshOrder as any)?.additional_services_price || 0,
          total: (freshOrder as any)?.total || (freshOrder as any)?.total_price || 0,
          total_price: (freshOrder as any)?.total_price || (freshOrder as any)?.total || 0,
          pricing_period: 'one-time', // Follow-ups are one-time until confirmed otherwise
          notes: followUpNotes,
          special_instructions: followUpSpecialInstructions,
          priority: 'normal',
          status: 'pending', // Wait for confirmation
          scheduled_date: itemNextVisitDate,
          total_sessions: 1,
          completed_sessions: 0,
        })
      }

      // 5. Prepare Data for Carousel / Single Report
      const serviceName = asText(order.services?.service_name) || asText(order.services?.name) || 'บริการดูแลสวน'
      const houseName = Array.isArray(order.houses) ? asText(order.houses[0]?.name) : asText((order.houses as any)?.name) || 'ไม่ระบุชื่อบ้าน'
      const visitCountText = totalSessions ? `${nextCount}/${totalSessions}` : null

      carouselReports.push({
        orderId: currentOrderId,
        reportId: report.id,
        orderCode: asText(order.order_code),
        houseId: order.house_id,
        houseName,
        serviceName,
        workDone: finalWorkDone,
        problemsFound: itemProblemsFound || problemsFound || '',
        recommendations: itemRecommendations || recommendations || '',
        completedAt: report.updated_at,
        visitCountText,
        beforePhotos,
        afterPhotos,
        zones: itemZones,
        nextVisitDate: itemNextVisitDate,
        pricingPeriod,
      })

      results.push({ orderId: currentOrderId, success: true, reportId: report.id })
    }

    // 6. Send Intelligent LINE Notification (Detailed for 1 house, Carousel for multiple)
    if (carouselReports.length === 1) {
      const single = carouselReports[0]
      const thaiDate = single.nextVisitDate 
        ? new Date(single.nextVisitDate).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })
        : ''
      const msg = single.nextVisitDate 
        ? `${staffName} ส่งรายงานหลังจบงานเรียบร้อยแล้ว พร้อมนัดหมายครั้งถัดไปวันที่ ${thaiDate} ให้คุณแล้ว`
        : `${staffName} ส่งรายงานหลังจบงานเรียบร้อยแล้ว กรุณาตรวจสอบรายละเอียด รูปก่อน-หลัง และตอบกลับได้ทันที`

      await sendLinePushToOrderStakeholders(serviceSupabase, single.houseId, customerId, {
        title: 'รายงานหลังจบงานพร้อมแล้ว',
        message: msg,
        appBaseUrl: req.nextUrl.origin,
        category: 'order_status',
        lineReport: {
          orderId: single.orderId,
          reportId: single.reportId,
          orderCode: single.orderCode,
          serviceName: single.serviceName,
          staffName,
          houseName: single.houseName,
          completedAt: single.completedAt,
          workDone: single.workDone,
          problemsFound: single.problemsFound,
          recommendations: single.recommendations,
          nextVisitDate: single.nextVisitDate,
          nextVisitTimeStart: single.nextVisitTimeStart,
          nextVisitTimeEnd: single.nextVisitTimeEnd,
          nextVisitNotes: single.nextVisitNotes,
          beforePhotos: single.beforePhotos,
          afterPhotos: single.afterPhotos,
          zones: single.zones,
          visitCountText: single.visitCountText,
          pricingPeriod: single.pricingPeriod,
        },
      })
    } else if (carouselReports.length > 1) {
      // In batch reports, there might be multiple houses. For simplicity, we can fetch all unique houseIds and customerId and notify everyone.
      // But let's just loop and merge all unique users from all houseIds.
      const users = new Set<string>()
      users.add(customerId)
      const houseIds = Array.from(new Set(carouselReports.map(r => r.houseId).filter(Boolean)))
      
      for (const hId of houseIds) {
        const { data: cols } = await serviceSupabase.from('house_collaborators').select('user_id').eq('house_id', hId)
        if (cols) cols.forEach(c => c.user_id && users.add(c.user_id))
      }

      for (const targetUserId of Array.from(users)) {
        const { sendLinePushToSupabaseUser } = await import('@/lib/server/lineMessaging')
        await sendLinePushToSupabaseUser(serviceSupabase, targetUserId, {
          title: 'สรุปรายงานการเข้าดูแลสวนวันนี้',
          message: `${staffName} ส่งรายงานการดูแลสวนเรียบร้อยแล้วจำนวน ${carouselReports.length} หลัง`,
          appBaseUrl: req.nextUrl.origin,
          category: 'order_status',
          batchReports: {
            staffName,
            reports: carouselReports,
          },
        })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('POST /api/admin/manual-work-reports error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
