import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkRecentReports() {
  const supabase = createClient(url!, key!)
  
  const { data: reports, error } = await supabase
    .from('work_reports')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error(error)
    return
  }

  reports.forEach(r => {
    console.log(`Report ID: ${r.id}`)
    console.log(`Updated At: ${r.updated_at}`)
    console.log(`Zones Count: ${r.zones?.length || 0}`)
    console.log(`Before Photos: ${r.before_photos?.length || 0}`)
    console.log(`After Photos: ${r.after_photos?.length || 0}`)
    console.log(`Work Done: ${r.work_done?.length || 0} chars`)
    console.log('---')
  })
}

checkRecentReports()
