import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkOrders() {
  const supabase = createClient(url!, key!)
  
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_code, pricing_period, total_sessions, completed_sessions, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error(error)
    return
  }

  console.log(JSON.stringify(data, null, 2))
}

checkOrders()
