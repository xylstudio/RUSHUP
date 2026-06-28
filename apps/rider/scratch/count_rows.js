
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTotalData() {
  const tables = ['profiles', 'houses', 'orders', 'work_reports', 'job_assignments', 'documents']
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    console.log(`${table}: ${count} rows (error: ${error?.message || 'none'})`)
  }
}

checkTotalData()
