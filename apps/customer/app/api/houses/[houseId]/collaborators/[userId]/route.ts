import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { createServiceRoleSupabaseClient } from '@/lib/server/compliance'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { houseId: string, userId: string } }
) {
  try {
    const { houseId, userId: targetUserId } = params

    const requestUser = await resolveRequestUser(request)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { role } = body

    if (!role || !['viewer', 'editor'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleSupabaseClient()
    const { data: house, error: houseError } = await serviceSupabase
      .from('houses')
      .select('id, user_id, customer_id')
      .eq('id', houseId)
      .single()

    if (houseError || !house) {
      return NextResponse.json({ error: 'House not found' }, { status: 404 })
    }

    const isOwner = house.user_id === requestUser.id || house.customer_id === requestUser.id
    if (!isOwner) {
      return NextResponse.json({ error: 'Only owners can manage roles' }, { status: 403 })
    }

    const { error: updateError } = await serviceSupabase
      .from('house_collaborators')
      .update({ role })
      .match({ house_id: houseId, user_id: targetUserId })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating collaborator role:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { houseId: string, userId: string } }
) {
  try {
    const { houseId, userId: targetUserId } = params

    const requestUser = await resolveRequestUser(request)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleSupabaseClient()
    const { data: house, error: houseError } = await serviceSupabase
      .from('houses')
      .select('id, user_id, customer_id')
      .eq('id', houseId)
      .single()

    if (houseError || !house) {
      return NextResponse.json({ error: 'House not found' }, { status: 404 })
    }

    const isOwner = house.user_id === requestUser.id || house.customer_id === requestUser.id
    // Users can remove themselves, but only owners can remove others
    if (!isOwner && requestUser.id !== targetUserId) {
      return NextResponse.json({ error: 'Only owners can remove collaborators' }, { status: 403 })
    }

    const { error: deleteError } = await serviceSupabase
      .from('house_collaborators')
      .delete()
      .match({ house_id: houseId, user_id: targetUserId })

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing collaborator:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
