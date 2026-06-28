import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = params.id

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  // Use service role to bypass RLS and delete user
  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Check if user exists in auth.users, but don't abort if they don't!
    // They might have been deleted from auth.users but still exist in profiles.
    const { data: user, error: userError } = await serviceSupabase.auth.admin.getUserById(userId)
    
    // MANUALLY PRE-DELETE DOCUMENTS TO AVOID TRIGGER ERRORS:
    while (true) {
      const { data: docs, error: fetchDocsError } = await serviceSupabase
        .from('documents')
        .select('id, source_document_id')
        .or(`user_id.eq.${userId},source_customer_id.eq.${userId}`)
        
      if (fetchDocsError) throw fetchDocsError;
      if (!docs || docs.length === 0) break;
      
      const allSourceIds = new Set(docs.map((d: any) => d.source_document_id).filter(Boolean));
      const leaves = docs.filter((d: any) => !allSourceIds.has(d.id)).map((d: any) => d.id);
      
      if (leaves.length === 0) {
         // If there is a circular dependency or some weird state, just try to delete all and throw if it fails
         const { error: fallbackErr } = await serviceSupabase.from('documents').delete().in('id', docs.map((d: any)=>d.id));
         if (fallbackErr) throw fallbackErr;
         break;
      }
      
      const { error: delErr } = await serviceSupabase.from('documents').delete().in('id', leaves);
      if (delErr) throw delErr;
    }

    // PRE-DELETE / NULLIFY OTHER RELATED TABLES
    // Nullify staff references in POS tables to preserve financial records
    await serviceSupabase.from('pos_shifts').update({ staff_id: null }).eq('staff_id', userId);
    await serviceSupabase.from('pos_orders').update({ staff_id: null }).eq('staff_id', userId);

    // Delete feedback and reports
    const deleteTables = [
      'work_report_feedback',
      'customer_order_feedback',
      'work_reports',
      'job_assignments',
      'measurement_requests',
      'orders',
      'houses'
    ];
    
    for (const table of deleteTables) {
      // Delete where user is customer
      await serviceSupabase.from(table).delete().eq('customer_id', userId);
      // Delete where user is staff
      await serviceSupabase.from(table).delete().eq('staff_id', userId);
    }
    
    await serviceSupabase.from('houses').delete().eq('user_id', userId);
    await serviceSupabase.from('document_customer_registry').delete().eq('source_customer_id', userId);

    // Manually delete from profiles (in case auth.users doesn't exist to trigger cascade)
    const { error: profileError } = await serviceSupabase.from('profiles').delete().eq('id', userId)
    if (profileError) {
      throw new Error(`Failed to delete profile: ${profileError.message}`)
    }

    // Try to delete from auth.users if they exist
    if (user && !userError) {
      const { error: deleteError } = await serviceSupabase.auth.admin.deleteUser(userId)
      if (deleteError) {
        console.error('Failed to delete auth user:', deleteError.message)
      }
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('Delete user API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
