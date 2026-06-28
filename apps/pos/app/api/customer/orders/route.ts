import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

const createServiceClient = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase service configuration')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Find all houses the user has access to
    const ownedHousesResult = await supabase
      .from('houses')
      .select('id')
      .or(`user_id.eq.${user.id},customer_id.eq.${user.id}`)

    const collabHousesResult = await supabase
      .from('house_collaborators')
      .select('house_id')
      .eq('user_id', user.id)

    const houseIds = new Set<string>()
    if (ownedHousesResult.data) {
      ownedHousesResult.data.forEach((h: any) => h.id && houseIds.add(h.id))
    }
    if (collabHousesResult.data) {
      collabHousesResult.data.forEach((h: any) => h.house_id && houseIds.add(h.house_id))
    }

    const houseIdsArray = Array.from(houseIds)

    if (houseIdsArray.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        services (
          id,
          service_name,
          service_code,
          description,
          estimated_duration,
          estimated_duration_unit
        ),
        houses!orders_house_id_fkey (
          id,
          name,
          address,
          house_code
        ),
        profiles!orders_customer_id_fkey (
          id,
          display_name,
          customer_base_code,
          phone,
          email
        ),
        price_templates (
          id,
          template_name,
          description
        ),
        order_additional_services (
          id,
          quantity,
          unit_price,
          total_price,
          additional_services (
            id,
            service_name,
            price
          )
        ),
        job_assignments (
          id,
          status,
          assigned_date,
          started_at,
          completed_at,
          staff_id,
          profiles!job_assignments_staff_id_fkey (
            id,
            display_name,
            phone
          )
        ),
        work_reports (
          id,
          created_at,
          updated_at
        )
      `)
      .in('house_id', houseIdsArray)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error('GET /api/customer/orders error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
