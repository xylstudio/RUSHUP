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

    console.log('🔍 Checking database schema...')

    // Check workshop_bookings table structure
    const { data: bookingsSchema, error: bookingsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'workshop_bookings')
      .order('ordinal_position')

    if (bookingsError) {
      console.error('Error fetching bookings schema:', bookingsError)
    }

    // Check workshop_payments table structure
    const { data: paymentsSchema, error: paymentsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'workshop_payments')
      .order('ordinal_position')

    if (paymentsError) {
      console.error('Error fetching payments schema:', paymentsError)
    }

    // Test inserting a sample booking to see what fails
    const testBooking = {
      full_name: 'Test User',
      email: 'test@example.com',
      phone: '0123456789',
      topic: 'Tray Garden',
      attendees_count: 2,
      date: '2024-12-01',
      start_time: '10:00',
      end_time: '12:00',
      notes: 'Test booking',
      status: 'pending'
    }

    let insertTest = null
    let insertError = null

    try {
      const { data, error } = await supabase
        .from('workshop_bookings')
        .insert(testBooking)
        .select()

      if (error) {
        insertError = error.message
      } else {
        insertTest = 'SUCCESS - Can insert bookings'
        // Clean up test data
        if (data && data[0]) {
          await supabase
            .from('workshop_bookings')
            .delete()
            .eq('id', data[0].id)
        }
      }
    } catch (err: any) {
      insertError = err.message
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database_check: {
        workshop_bookings: {
          schema: bookingsSchema || [],
          schema_error: bookingsError?.message || null
        },
        workshop_payments: {
          schema: paymentsSchema || [],
          schema_error: paymentsError?.message || null
        },
        insert_test: {
          result: insertTest,
          error: insertError
        }
      },
      required_columns: {
        workshop_bookings: [
          'id', 'full_name', 'email', 'phone', 'topic', 
          'attendees_count', 'date', 'start_time', 'end_time', 
          'notes', 'status', 'created_at'
        ],
        workshop_payments: [
          'id', 'booking_id', 'provider', 'provider_charge_id',
          'amount', 'currency', 'status', 'payer_email',
          'paid_at', 'payment_data', 'created_at', 'updated_at'
        ]
      }
    })

  } catch (error: any) {
    console.error('💥 Database check error:', error)
    return NextResponse.json({
      error: 'Database check failed',
      details: error.message
    }, { status: 500 })
  }
}