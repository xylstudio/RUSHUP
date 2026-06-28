
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function nuclearCleanup() {
  console.log("Starting Nuclear Cleanup of all activity-related data...")
  
  // 1. Delete all work reports
  const { error: err1 } = await supabase.from('work_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log("Deleted all work_reports:", err1 ? err1.message : "Success")
  
  // 2. Delete all notifications
  const { error: err2 } = await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log("Deleted all notifications:", err2 ? err2.message : "Success")
  
  // 3. Delete all job assignments
  const { error: err3 } = await supabase.from('job_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log("Deleted all job_assignments:", err3 ? err3.message : "Success")

  // 4. Double check orders
  const { data: orders } = await supabase.from('orders').select('id')
  console.log(`Remaining orders in DB: ${orders?.length || 0}`)
}

nuclearCleanup()
