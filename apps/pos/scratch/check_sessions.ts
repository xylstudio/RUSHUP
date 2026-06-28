import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOrder(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, completed_sessions, total_sessions')
    .eq('id', orderId)
    .single()
  
  if (error) console.error(error)
  else console.log('Order Data:', data)
}

// Replace with an actual order ID from the user's screenshot if possible, or a known one
checkOrder('f4b6a9d1-3c4e-4f5a-8b2c-9d1e3a5b7c9d') 
