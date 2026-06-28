
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
  const { data, error } = await supabase
    .from('job_assignments')
    .select('id, order_id, status, notes, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error(error)
    return
  }
  
  console.log('Recent Job Assignments:')
  console.log(JSON.stringify(data, null, 2))
}

check()
