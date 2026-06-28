import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()

    console.log('🔍 Debug Payment API Called')
    
    // Parse request body
    const body = await request.json()
    console.log('📝 Request Body:', JSON.stringify(body, null, 2))
    
    // Test database connection - no need to call createClient()
    
    // Test simple query first
    const { data: testData, error: testError } = await supabase
      .from('workshop_bookings')
      .select('count')
      .single()
    
    console.log('🗄️ Database Test:', { testData, testError })
    
    // Test insert with the actual data
    const bookingData = {
      full_name: body.fullName || 'Test User',
      email: body.email || 'test@example.com',
      phone: body.phone || '0123456789',
      topic: body.topic || 'Tray Garden',
      attendees_count: body.attendeesCount || 1,
      date: body.date || '2024-12-20',
      start_time: body.startTime || '10:00',
      end_time: body.endTime || '12:00',
      notes: body.notes || 'Debug test',
      status: 'pending'
    }
    
    console.log('📋 Booking Data to Insert:', bookingData)
    
    const { data: bookingResult, error: bookingError } = await supabase
      .from('workshop_bookings')
      .insert(bookingData)
      .select()
      .single()
    
    console.log('✅ Booking Insert Result:', { bookingResult, bookingError })
    
    if (bookingError) {
      return NextResponse.json({
        success: false,
        error: 'Booking insert failed',
        details: bookingError,
        debug: {
          body,
          bookingData,
          testData,
          testError
        }
      }, { status: 400 })
    }
    
    // Test payment insert
    const paymentData = {
      booking_id: bookingResult.id,
      provider: body.paymentMethod || 'mock',
      amount: parseFloat(body.amount || '800'),
      currency: 'THB',
      status: 'pending',
      payer_email: body.email || 'test@example.com'
    }
    
    console.log('💳 Payment Data to Insert:', paymentData)
    
    const { data: paymentResult, error: paymentError } = await supabase
      .from('workshop_payments')
      .insert(paymentData)
      .select()
      .single()
    
    console.log('💰 Payment Insert Result:', { paymentResult, paymentError })
    
    // Clean up test data
    if (bookingResult?.id) {
      await supabase.from('workshop_payments').delete().eq('booking_id', bookingResult.id)
      await supabase.from('workshop_bookings').delete().eq('id', bookingResult.id)
      console.log('🧹 Test data cleaned up')
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debug test completed successfully',
      results: {
        booking: { data: bookingResult, error: bookingError },
        payment: { data: paymentResult, error: paymentError }
      },
      debug: {
        originalBody: body,
        processedBooking: bookingData,
        processedPayment: paymentData
      }
    })
    
  } catch (error) {
    console.error('🚨 Debug Payment Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Debug Payment API is working',
    timestamp: new Date().toISOString(),
    usage: 'POST to this endpoint with booking data to debug payment issues'
  })
}