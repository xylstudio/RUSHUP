const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkFollowUp() {
  const { data: original } = await supabase
    .from('orders')
    .select('customer_id, house_id, service_id')
    .eq('id', '3b868299-45cf-464d-accf-c5f23e736885')
    .single()

  if (!original) return

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, scheduled_date, total_sessions, completed_sessions, pricing_period, created_at')
    .eq('customer_id', original.customer_id)
    .eq('house_id', original.house_id)
    .eq('service_id', original.service_id)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching orders:', error)
    return
  }

  console.log('Recent orders:', JSON.stringify(orders, null, 2))
}

checkFollowUp()
