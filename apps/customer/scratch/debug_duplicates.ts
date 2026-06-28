import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkOrders() {
  const supabase = createClient(url!, key!)
  const customerId = 'f0f7c298-fc8e-4547-a654-1a46d10b9b2d'
  
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return
  }

  console.log('Orders count:', orders.length)
  orders.forEach(o => {
    console.log(`ID: ${o.id}, Status: ${o.status}, Sessions: ${o.completed_sessions}/${o.total_sessions}, Created: ${o.created_at}`)
  })
}

checkOrders()
