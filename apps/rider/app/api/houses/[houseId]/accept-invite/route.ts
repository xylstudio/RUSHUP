import { NextRequest, NextResponse } from 'next/server'
import { createAnonSupabaseServerClient, createServiceRoleSupabaseClient } from '@/lib/server/compliance'

import { resolveRequestUser } from '@/lib/server/requestAuth'

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

    // 2. Read token from request body
    let body: { token?: string } = {}
    try {
      body = await request.json()
    } catch (e) {
      // ignore
    }
    const token = body.token

    // 3. Check if house exists using service role (bypass RLS)
    const serviceSupabase = createServiceRoleSupabaseClient()
    const { data: house, error: houseError } = await serviceSupabase
      .from('houses')
      .select('id, user_id, customer_id')
      .eq('id', houseId)
      .single()

    if (houseError || !house) {
      return NextResponse.json({ error: 'House not found' }, { status: 404 })
    }

    // 4. Validate Token
    if (!token) {
      return NextResponse.json({ error: 'Token is required to accept invite' }, { status: 400 })
    }

    const { data: invite, error: inviteError } = await serviceSupabase
      .from('house_invites')
      .select('*')
      .eq('id', token)
      .eq('house_id', houseId)
      .maybeSingle()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 400 })
    }
    
    if (invite.used_by) {
      // If it's used by the current user, it's fine (they are already in)
      if (invite.used_by !== userId) {
        return NextResponse.json({ error: 'Invite link has already been used' }, { status: 400 })
      }
    }
    const inviteId = invite.id

    // 5. Prevent owner from joining as collaborator (they already have access)
    if (house.user_id === userId || house.customer_id === userId) {
      return NextResponse.json({ success: true, message: 'Already owner' })
    }

    // 6. Mark token as used if we have one
    if (inviteId) {
      await serviceSupabase
        .from('house_invites')
        .update({
          used_by: userId,
          used_at: new Date().toISOString()
        })
        .eq('id', inviteId)
        .is('used_by', null)
    }

    // 7. Add user to house_collaborators as a 'viewer' if not already exists
    const { data: existing } = await serviceSupabase
      .from('house_collaborators')
      .select('id')
      .eq('house_id', houseId)
      .eq('user_id', userId)
      .maybeSingle()

    const newRole = (invite && invite.role) ? invite.role : 'viewer'

    if (!existing) {
      const { error: insertError } = await serviceSupabase
        .from('house_collaborators')
        .insert({
          house_id: houseId,
          user_id: userId,
          role: newRole
        })

      if (insertError) {
        console.error('Failed to accept invite:', insertError)
        return NextResponse.json({ error: 'Failed to accept invite: ' + insertError.message }, { status: 500 })
      }
    } else {
      // If user is already a collaborator, upgrade their role if they are accepting an 'editor' invite
      if (newRole === 'editor') {
        const { error: updateError } = await serviceSupabase
          .from('house_collaborators')
          .update({ role: 'editor' })
          .eq('id', existing.id)

        if (updateError) {
          console.error('Failed to upgrade role:', updateError)
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
