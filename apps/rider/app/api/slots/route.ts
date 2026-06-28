import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { resolveRequestUser } from '@/lib/server/requestAuth'

export const dynamic = 'force-dynamic'

// GET /api/slots?date=YYYY-MM-DD&branchId=optional
export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createRouteHandlerClient({ cookies })

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const branchId = searchParams.get('branchId')
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

    let query = supabase
      .from('schedules')
      .select('id, staff_id, branch_id, date, start_time, end_time, is_available')
      .eq('date', date)
      .eq('is_available', true)
      .order('start_time', { ascending: true })

    if (branchId) query = query.eq('branch_id', branchId)

    const { data, error } = await query
    if (error) {
      // If schedules are not yet populated, fallback to default hourly slots 09:00-17:00
      console.warn('No schedules found or error occurred, falling back to defaults:', error?.message)
      const slots = Array.from({ length: 8 }).map((_, i) => {
        const startHour = 9 + i
        const pad = (n: number) => String(n).padStart(2, '0')
        return {
          id: `default-${date}-${startHour}`,
          date,
          start_time: `${pad(startHour)}:00`,
          end_time: `${pad(startHour + 1)}:00`,
          staff_id: null,
          branch_id: branchId || null,
          is_available: true
        }
      })
      return NextResponse.json({ slots, fallback: true })
    }

    return NextResponse.json({ slots: data || [], fallback: false })
  } catch (err) {
    console.error('GET /api/slots error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
