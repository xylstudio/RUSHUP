import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchCustomerReports } from '@/lib/customerReports'
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

    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')
    const houseId = searchParams.get('houseId')
    const limitValue = Number(searchParams.get('limit') || '50')

    const supabase = createServiceClient()
    const payload = await fetchCustomerReports(supabase, user.id, {
      orderId,
      houseId,
      limit: Number.isNaN(limitValue) ? 50 : limitValue,
    })

    return NextResponse.json({ success: true, ...payload })
  } catch (error) {
    console.error('GET /api/customer/reports error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}