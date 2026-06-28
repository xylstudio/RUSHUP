import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/server/requestAuth'
import { createServiceRoleSupabaseClient } from '@/lib/server/compliance'

export const dynamic = 'force-dynamic'

export async function GET(
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

    // 2. Check if house exists and user is owner or collaborator
    const serviceSupabase = createServiceRoleSupabaseClient()
    const { data: house, error: houseError } = await serviceSupabase
      .from('houses')
      .select('id, user_id, customer_id')
      .eq('id', houseId)
      .single()

    if (houseError || !house) {
      return NextResponse.json({ error: 'House not found' }, { status: 404 })
    }

    const isOwner = house.user_id === userId || house.customer_id === userId
    
    let isCollaborator = false
    if (!isOwner) {
      const { data: coll } = await serviceSupabase
        .from('house_collaborators')
        .select('id')
        .eq('house_id', houseId)
        .eq('user_id', userId)
        .maybeSingle()
      if (coll) isCollaborator = true
    }

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Fetch collaborators
    const { data: collaborators, error: collError } = await serviceSupabase
      .from('house_collaborators')
      .select('*')
      .eq('house_id', houseId)
      .order('created_at', { ascending: true })

    if (collError) {
      return NextResponse.json({ error: collError.message }, { status: 500 })
    }

    // 4. Enrich with profile data separately (avoid FK join ambiguity)
    const userIds = (collaborators || []).map((c: any) => c.user_id).filter(Boolean)
    let profilesMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await serviceSupabase
        .from('profiles')
        .select('id, display_name, email, avatar_url')
        .in('id', userIds)
      profiles?.forEach((p: any) => { profilesMap[p.id] = p })

      // Fallback: fetch auth users for any missing profiles
      const missingIds = userIds.filter((id: string) => !profilesMap[id] || (!profilesMap[id].email && !profilesMap[id].display_name))
      if (missingIds.length > 0) {
        const { data: { users: authUsers }, error: authError } = await serviceSupabase.auth.admin.listUsers()
        if (!authError && authUsers) {
          authUsers
            .filter((u: any) => missingIds.includes(u.id))
            .forEach((u: any) => {
              if (!profilesMap[u.id]) profilesMap[u.id] = {}
              profilesMap[u.id].email = profilesMap[u.id].email || u.email
              profilesMap[u.id].display_name = profilesMap[u.id].display_name || u.user_metadata?.display_name || u.email?.split('@')[0]
            })
        }
      }
    }

    const enriched = (collaborators || []).map((c: any) => ({
      ...c,
      profiles: profilesMap[c.user_id] || null
    }))

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('Error fetching collaborators:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
