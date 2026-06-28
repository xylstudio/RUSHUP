import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkLatestReport() {
  const supabase = createClient(url!, key!)
  
  const { data: reports, error } = await supabase
    .from('work_reports')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error(error)
    return
  }

  const r = reports[0]
  console.log(`Report ID: ${r.id}`)
  console.log(`Before Photos: ${JSON.stringify(r.before_photos)}`)
  console.log(`After Photos: ${JSON.stringify(r.after_photos)}`)
}

checkLatestReport()
