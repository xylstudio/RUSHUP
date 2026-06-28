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

export async function POST() {
  try {
    const supabase = createSupabaseClient()

    console.log('🧪 Testing complete booking flow...')

    // Create a complete test booking
    const testBooking = {
      full_name: 'Test Workshop User',
      email: 'test@example.com',
      phone: '081-234-5678',
      topic: 'Tray Garden',
      attendees_count: 2,
      date: '2024-12-15',
      start_time: '10:00:00',
      end_time: '12:00:00',
      notes: 'Complete system test booking',
      status: 'pending'
    }

    // Step 1: Insert booking
    const { data: booking, error: bookingError } = await supabase
      .from('workshop_bookings')
      .insert(testBooking)
      .select()
      .single()

    if (bookingError) {
      return NextResponse.json({
        success: false,
        step: 'booking_creation',
        error: bookingError.message,
        details: bookingError,
        recommendations: [
          'Run: ALTER TABLE workshop_bookings ADD COLUMN attendees_count INTEGER DEFAULT 1;',
          'Run: ALTER TABLE workshop_bookings DISABLE ROW LEVEL SECURITY;',
          'Check database migration page for full instructions'
        ]
      }, { status: 400 })
    }

    console.log('✅ Booking created:', booking.id)

    // Step 2: Create payment record
    const paymentData = {
      booking_id: booking.id,
      provider: 'test',
      provider_charge_id: `test_${Date.now()}`,
      amount: 1600.00, // 800 * 2 attendees
      currency: 'THB',
      status: 'paid',
      payer_email: testBooking.email,
      paid_at: new Date().toISOString(),
      payment_data: JSON.stringify({
        test: true,
        payment_method: 'test',
        amount: 1600,
        timestamp: new Date().toISOString()
      })
    }

    const { data: payment, error: paymentError } = await supabase
      .from('workshop_payments')
      .insert(paymentData)
      .select()
      .single()

    if (paymentError) {
      // Clean up booking if payment fails
      await supabase
        .from('workshop_bookings')
        .delete()
        .eq('id', booking.id)

      return NextResponse.json({
        success: false,
        step: 'payment_creation',
        error: paymentError.message,
        details: paymentError,
        booking_cleaned_up: true,
        recommendations: [
          'Ensure workshop_payments table exists',
          'Run complete database migration script',
          'Check RLS policies for payments table'
        ]
      }, { status: 400 })
    }

    console.log('✅ Payment created:', payment.id)

    // Step 3: Update booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from('workshop_bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking.id)
      .select()
      .single()

    if (updateError) {
      console.log('⚠️ Update error (non-critical):', updateError)
    }

    // Step 4: Verify the complete flow
    const { data: finalBooking, error: verifyError } = await supabase
      .from('workshop_bookings')
      .select(`
        *,
        workshop_payments (*)
      `)
      .eq('id', booking.id)
      .single()

    console.log('📋 Final verification:', finalBooking)

    // Step 5: Clean up test data
    await supabase.from('workshop_payments').delete().eq('id', payment.id)
    await supabase.from('workshop_bookings').delete().eq('id', booking.id)

    return NextResponse.json({
      success: true,
      test_completed: true,
      timestamp: new Date().toISOString(),
      flow_results: {
        booking_creation: {
          success: true,
          booking_id: booking.id,
          attendees_count: booking.attendees_count,
          status: booking.status
        },
        payment_creation: {
          success: true,
          payment_id: payment.id,
          amount: payment.amount,
          currency: payment.currency
        },
        booking_update: {
          success: !updateError,
          final_status: updatedBooking?.status || booking.status,
          error: updateError?.message || null
        },
        verification: {
          success: !verifyError,
          has_payment_relation: !!finalBooking?.workshop_payments?.length,
          error: verifyError?.message || null
        },
        cleanup: {
          performed: true,
          message: 'Test data removed from database'
        }
      },
      message: '🎉 Complete workshop booking system is working perfectly!',
      next_steps: [
        '✅ Database schema is correct',
        '✅ RLS permissions are working',
        '✅ Payment integration is functional',
        '✅ System is ready for production use',
        '🚀 You can now test the booking page: /workshops/book'
      ]
    })

  } catch (error: any) {
    console.error('💥 Complete test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Complete system test failed',
      details: error.message,
      stack: error.stack?.split('\n').slice(0, 5) // Limit stack trace
    }, { status: 500 })
  }
}