import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const createSupabaseServiceClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    return createClient(supabaseUrl, serviceRoleKey)
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}))
        const { token, lineUserId, displayName, avatarUrl } = body

        if (!token || !lineUserId) {
            return NextResponse.json({ error: 'Missing token or lineUserId' }, { status: 400 })
        }

        const supabase = createSupabaseServiceClient()
        
        // 1. Get token info
        const { data: tokenInfo, error: tokenError } = await supabase
            .from('pos_qr_reward_tokens')
            .select('*')
            .eq('token', token)
            .eq('is_used', false)
            .maybeSingle()

        if (tokenError) {
            console.error('Error fetching token:', tokenError)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        if (!tokenInfo) {
            return NextResponse.json({ error: 'Token ไม่ถูกต้อง หรือถูกใช้งานไปแล้ว' }, { status: 400 })
        }

        // 2. Ensure member exists
        const { data: member, error: memberError } = await supabase
            .from('pos_members')
            .select('*')
            .eq('line_user_id', lineUserId)
            .maybeSingle()
        
        if (!member) {
            await supabase.from('pos_members').insert({
                line_user_id: lineUserId,
                display_name: displayName,
                avatar_url: avatarUrl,
                points: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
        } else {
            // Update profile if they scan but info was empty
            if (!member.display_name || !member.avatar_url) {
                await supabase.from('pos_members').update({
                    display_name: member.display_name || displayName,
                    avatar_url: member.avatar_url || avatarUrl,
                    updated_at: new Date().toISOString()
                }).eq('id', member.id)
            }
        }

        // 3. Mark token as used (Atomic-ish)
        const { error: updateTokenError } = await supabase
            .from('pos_qr_reward_tokens')
            .update({
                is_used: true,
                claimed_by: lineUserId,
                claimed_at: new Date().toISOString()
            })
            .eq('id', tokenInfo.id)
            .eq('is_used', false)

        if (updateTokenError) {
            return NextResponse.json({ error: 'ไม่สามารถระบุการใช้งาน Token ได้' }, { status: 400 })
        }

        // 4. Increment member points
        const { error: pointError } = await supabase.rpc('increment_member_points', { 
            user_id: lineUserId, 
            points_to_add: tokenInfo.points 
        })

        if (pointError) {
            // Fallback if RPC fails
            await supabase.from('pos_members')
                .update({ 
                    points: (member?.points || 0) + tokenInfo.points,
                    updated_at: new Date().toISOString()
                })
                .eq('line_user_id', lineUserId)
        }

        // 5. Record in history (Safely attempt to include description)
        try {
            const historyObj: any = {
                member_id: lineUserId,
                points: tokenInfo.points,
                type: 'earn',
                created_at: new Date().toISOString()
            }
            
            // We try to include description; if it fails due to missing column, we'll catch it
            const { error: historyError } = await supabase.from('pos_points_history').insert({
                ...historyObj,
                description: 'Claimed via QR Code'
            })

            if (historyError && historyError.message.includes('column "description" of relation "pos_points_history" does not exist')) {
                // Retry without description column
                await supabase.from('pos_points_history').insert(historyObj)
            }
        } catch (hErr) {
            console.error('History record error (non-fatal):', hErr)
        }

        return NextResponse.json({ 
            success: true, 
            pointsAdded: tokenInfo.points,
            message: `Successfully claimed ${tokenInfo.points} points!`
        })
    } catch (error) {
        console.error('POST /api/liff/points/claim error', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
