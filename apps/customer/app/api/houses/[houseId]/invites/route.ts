import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { createServiceRoleSupabaseClient } from '@/lib/server/compliance'

export async function POST(
  request: NextRequest,
  { params }: { params: { houseId: string } }
) {
  try {
    const { houseId } = params

    // 1. Verify current user
    const requestUser = await resolveRequestUser(request)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = requestUser.id

    // 2. Check if house exists and user is owner
    const serviceSupabase = createServiceRoleSupabaseClient()
    const { data: house, error: houseError } = await serviceSupabase
      .from('houses')
      .select('id, user_id, customer_id')
      .eq('id', houseId)
      .single()

    if (houseError || !house) {
      return NextResponse.json({ error: 'House not found' }, { status: 404 })
    }

    if (house.user_id !== userId && house.customer_id !== userId) {
      return NextResponse.json({ error: 'Only house owners can create invites' }, { status: 403 })
    }

    const bodyText = await request.text()
    let role = 'viewer'
    try {
      if (bodyText) {
        const body = JSON.parse(bodyText)
        if (body.role && ['viewer', 'editor'].includes(body.role)) {
          role = body.role
        }
      }
    } catch (e) {
      // Ignore JSON parse errors and fallback to 'viewer'
    }

    // 3. Create a new unique invite
    const { data: invite, error: inviteError } = await serviceSupabase
      .from('house_invites')
      .insert({
        house_id: houseId,
        created_by: userId,
        role: role
      })
      .select('id')
      .single()

    if (inviteError || !invite) {
      console.error('Failed to create invite:', inviteError)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    return NextResponse.json({ success: true, token: invite.id })
  } catch (error) {
    console.error('Error generating invite:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
