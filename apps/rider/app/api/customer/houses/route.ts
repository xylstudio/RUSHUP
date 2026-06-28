import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json({ error: 'Missing customerId' }, { status: 400 })
    }

    // Initialize Supabase admin client to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Phase 1: Owned houses
    const { data: ownedHouses, error: ownedError } = await supabaseAdmin
      .from('houses')
      .select('*')
      .or(`user_id.eq.${customerId},customer_id.eq.${customerId}`)
      .order('created_at', { ascending: false })

    if (ownedError) {
      // Fallback
      if (ownedError.message?.includes('customer_id')) {
        const fallbackResult = await supabaseAdmin
          .from('houses')
          .select('*')
          .eq('user_id', customerId)
          .order('created_at', { ascending: false })
        
        if (fallbackResult.error) throw fallbackResult.error
        return NextResponse.json({ data: fallbackResult.data })
      }
      throw ownedError
    }

    // Phase 2: Shared houses via collaborators (with role)
    const { data: collaborations, error: collError } = await supabaseAdmin
      .from('house_collaborators')
      .select('house_id, role')
      .eq('user_id', customerId)

    let sharedHouses: any[] = []
    if (!collError && collaborations && collaborations.length > 0) {
      const sharedHouseIds = Array.from(new Set(collaborations.map((row: any) => row.house_id).filter(Boolean))) as string[]
      const roleByHouseId: Record<string, string> = {}
      collaborations.forEach((row: any) => { if (row.house_id) roleByHouseId[row.house_id] = row.role })

      if (sharedHouseIds.length > 0) {
        const { data: sharedRows, error: sharedError } = await supabaseAdmin
          .from('houses')
          .select('*')
          .in('id', sharedHouseIds)

        if (!sharedError && sharedRows) {
          // Attach role so frontend can show correct badge
          sharedHouses = sharedRows.map((h: any) => ({
            ...h,
            role: roleByHouseId[h.id] || 'viewer',
            is_shared: true,
          }))
        }
      }
    }

    // Combine and deduplicate
    const allHousesMap = new Map<string, any>()
    ownedHouses?.forEach((h: any) => allHousesMap.set(h.id, h))
    sharedHouses?.forEach((h: any) => allHousesMap.set(h.id, h))

    // Check which owned houses have collaborators
    if (ownedHouses && ownedHouses.length > 0) {
      const ownedHouseIds = ownedHouses.map((h: any) => h.id)
      const { data: allCollaborators, error: allCollError } = await supabaseAdmin
        .from('house_collaborators')
        .select('house_id')
        .in('house_id', ownedHouseIds)
      
      if (!allCollError && allCollaborators) {
        const housesWithCollaborators = new Set(allCollaborators.map((c: any) => c.house_id))
        ownedHouses.forEach((h: any) => {
          if (housesWithCollaborators.has(h.id)) {
            const houseInMap = allHousesMap.get(h.id)
            if (houseInMap) {
              houseInMap.has_collaborators = true
            }
          }
        })
      }
    }

    const finalHouses = Array.from(allHousesMap.values()).sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Fetch branch names to enrich the data
    const { data: branches } = await supabaseAdmin.from('branches').select('branch_code, branch_name')
    const branchMap = new Map<string, string>()
    if (branches) {
      branches.forEach((b: any) => {
        if (b.branch_code && b.branch_name) {
          branchMap.set(b.branch_code, b.branch_name)
        }
      })
    }

    const enrichedHouses = finalHouses.map((h: any) => ({
      ...h,
      branch_name: h.branch_code ? (branchMap.get(h.branch_code) || h.branch_code) : null
    }))

    return NextResponse.json({ data: enrichedHouses })
  } catch (error: any) {
    console.error('API /api/customer/houses error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Initialize Supabase admin client to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data, error } = await supabaseAdmin
      .from('houses')
      .insert(body)
      .select()
      .single()
      
    if (error) {
      console.error('Insert error (Admin):', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('API POST /api/customer/houses error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing house id' }, { status: 400 })
    }
    
    // Initialize Supabase admin client to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data, error } = await supabaseAdmin
      .from('houses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
      
    if (error) {
      console.error('Update error (Admin):', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('API PATCH /api/customer/houses error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
