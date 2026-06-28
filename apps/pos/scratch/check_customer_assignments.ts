
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function check() {
  if (!url || !key) {
    console.error('Missing env vars')
    return
  }
  const supabase = createClient(url, key)
  const customerId = 'f0f7c298-fc8e-4547-a654-1a46d10b9b2d'
  
  // Find orders for this customer
  const { data: orders } = await supabase.from('orders').select('id, order_code').eq('customer_id', customerId)
  const orderIds = orders?.map(o => o.id) || []
  
  if (orderIds.length === 0) {
    console.log('No orders found for this customer')
    return
  }

  const { data: assignments, error } = await supabase
    .from('job_assignments')
    .select('id, order_id, status, updated_at')
    .in('order_id', orderIds)
    .order('updated_at', { ascending: false })
  
  if (error) {
    console.error(error)
    return
  }
  
  console.log(`Assignments for customer ${customerId}:`)
  console.log(JSON.stringify(assignments, null, 2))
}

check()
