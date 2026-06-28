export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { reservePOSOrderIdentity } from '@/lib/posOrderIdentity'

const env = (value?: string) => (value || '').trim()

const createServiceClient = () => {
  const supabaseUrl = env(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = env(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient<any>(supabaseUrl, serviceRoleKey)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const identity = await reservePOSOrderIdentity(createServiceClient(), {
      orderType: typeof body?.orderType === 'string' ? body.orderType : null,
      branchId: typeof body?.branchId === 'string' ? body.branchId : null,
      shiftId: typeof body?.shiftId === 'string' ? body.shiftId : null,
      existingOrderId: typeof body?.existingOrderId === 'string' ? body.existingOrderId : null,
    })

    return NextResponse.json({ ok: true, ...identity })
  } catch (error: any) {
    console.error('POS order identity API error:', error)
    return NextResponse.json({ error: error.message || 'Order identity API error' }, { status: 500 })
  }
}
