const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOrder() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, scheduled_date, total_sessions, completed_sessions, pricing_period')
    .eq('id', '3b868299-45cf-464d-accf-c5f23e736885')
    .single()

  if (error) {
    console.error('Error fetching order:', error)
    return
  }

  console.log('Order data:', JSON.stringify(data, null, 2))
}

checkOrder()
