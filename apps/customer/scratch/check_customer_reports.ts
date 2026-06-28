
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
  
  const { data, error } = await supabase
    .from('work_reports')
    .select('id, order_id, customer_id, updated_at, created_at')
    .eq('customer_id', customerId)
    .order('updated_at', { ascending: false })
  
  if (error) {
    console.error(error)
    return
  }
  
  console.log(`Reports for customer ${customerId}:`)
  console.log(JSON.stringify(data, null, 2))
}

check()
