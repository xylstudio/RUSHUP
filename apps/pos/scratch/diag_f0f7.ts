import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(url, key)

async function checkCustomer(id: string) {
  console.log(`Checking customer: ${id}`)
  
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_code, completed_sessions, total_sessions, status')
    .eq('customer_id', id)
  
  console.log('Orders:', orders)

  const { data: reports } = await supabase
    .from('work_reports')
    .select('id, order_id, created_at, work_done')
    .eq('customer_id', id)
  
  console.log('Reports:', reports)
}

checkCustomer('f0f7c298-fc8e-4547-a654-1a46d10b9b2d')
