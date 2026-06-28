import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOrder() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, scheduled_date')
    .eq('id', '3b868299-45cf-464d-accf-c5f23e736885')
    .single()

  if (error) {
    console.error('Error fetching order:', error)
    return
  }

  console.log('Order data:', data)
}

checkOrder()
