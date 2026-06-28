import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

export async function GET() {
  try {
    const supabase = createSupabaseClient()

    console.log('🔍 Testing database permissions and RLS...')

    // Test 1: Check if we can read from workshop_bookings
    const { data: readTest, error: readError } = await supabase
      .from('workshop_bookings')
      .select('*')
      .limit(1)

    console.log('Read test:', readTest, readError)

    // Test 2: Try to insert a test record
    const testBooking = {
      full_name: 'Test User',
      email: 'test@example.com',
      phone: '0123456789',
      topic: 'Tray Garden',
      attendees_count: 2,
      date: '2024-12-01',
      start_time: '10:00:00',
      end_time: '12:00:00',
      notes: 'Test booking for RLS check',
      status: 'pending'
    }

    const { data: insertTest, error: insertError } = await supabase
      .from('workshop_bookings')
      .insert(testBooking)
      .select()

    console.log('Insert test:', insertTest, insertError)

    let testResult = 'UNKNOWN'
    let cleanupId = null

    if (insertError) {
      testResult = `INSERT_FAILED: ${insertError.message}`
    } else if (insertTest && insertTest.length > 0) {
      testResult = 'INSERT_SUCCESS'
      cleanupId = insertTest[0].id
      
      // Clean up test data
      const { error: deleteError } = await supabase
        .from('workshop_bookings')
        .delete()
        .eq('id', cleanupId)
      
      if (deleteError) {
        console.log('Cleanup failed:', deleteError)
      }
    }

    // Test 3: Check RLS policies (skip if not available)
    let policies = null
    let policyError = null
    try {
      const result = await supabase.rpc('get_table_policies', { table_name: 'workshop_bookings' })
      policies = result.data
      policyError = result.error
    } catch (err) {
      policyError = 'RPC not available'
    }

    // Test 4: Check table permissions (skip if not available)
    let permissions = null
    let permError = null
    try {
      const result = await supabase
        .from('information_schema.table_privileges')
        .select('*')
        .in('table_name', ['workshop_bookings', 'workshop_payments'])
      permissions = result.data?.slice(0, 10) // Limit results
      permError = result.error
    } catch (err) {
      permError = 'Cannot access table_privileges'
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database_access_test: {
        read_test: {
          success: !readError,
          error: readError?.message || null,
          records_found: readTest?.length || 0
        },
        insert_test: {
          result: testResult,
          error: insertError?.message || null,
          cleanup_performed: !!cleanupId
        },
        rls_policies: {
          data: policies,
          error: policyError
        },
        permissions: {
          data: permissions,
          error: permError
        }
      },
      recommendations: {
        if_insert_failed: [
          "1. Run fix-rls-policies.sql script",
          "2. Check Supabase Dashboard > Authentication > Policies",
          "3. Ensure anon role has INSERT permissions",
          "4. Consider disabling RLS for testing: ALTER TABLE workshop_bookings DISABLE ROW LEVEL SECURITY;"
        ],
        if_insert_success: [
          "✅ Database access is working correctly",
          "You can proceed with workshop booking system"
        ]
      }
    })

  } catch (error: any) {
    console.error('💥 Database test error:', error)
    return NextResponse.json({
      error: 'Database test failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}