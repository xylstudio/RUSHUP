
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
  const reportId = 'a9376672-005f-4a00-9831-419b16892305'
  
  const { data, error } = await supabase
    .from('work_reports')
    .select('*')
    .eq('id', reportId)
    .single()
  
  if (error) {
    console.error(error)
    return
  }
  
  console.log(`Detail for report ${reportId}:`)
  console.log(JSON.stringify(data, null, 2))
}

check()
