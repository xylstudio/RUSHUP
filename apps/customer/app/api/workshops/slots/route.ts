import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Public slots (no auth). For now returns a default 09:00-17:00 hourly grid.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const branchId = searchParams.get('branchId')
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

    const slots = Array.from({ length: 8 }).map((_, i) => {
      const startHour = 9 + i
      const pad = (n: number) => String(n).padStart(2, '0')
      return {
        id: `public-${date}-${startHour}`,
        date,
        start_time: `${pad(startHour)}:00`,
        end_time: `${pad(startHour + 1)}:00`,
        branch_id: branchId || null,
        is_available: true
      }
    })

    return NextResponse.json({ slots, fallback: true })
  } catch (err) {
    console.error('GET /api/workshops/slots error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
