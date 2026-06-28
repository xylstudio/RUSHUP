
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAllTables() {
  const { data: tables, error } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public')
  // Since pg_catalog might fail, let's just try a bunch of common ones
  const candidates = [
    'profiles', 'houses', 'orders', 'work_reports', 'job_assignments', 'documents',
    'workshop_bookings', 'pos_orders', 'activity_logs', 'notifications', 'payments'
  ]
  
  for (const table of candidates) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (!error) {
      console.log(`${table}: ${count} rows`)
    } else {
      // console.log(`${table}: error ${error.message}`)
    }
  }
}

checkAllTables()
