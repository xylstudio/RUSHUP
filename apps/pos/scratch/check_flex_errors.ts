import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkDetailedLogs() {
  const supabase = createClient(url!, key!)
  
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', 'line_push_api_failed')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error(error)
    return
  }

  logs.forEach(l => {
    console.log(`[${l.created_at}] Status: ${l.details.status}`)
    console.log(`Error: ${l.details.error}`)
    console.log(`AltText: ${l.details.altText}`)
    console.log('---')
  })
}

checkDetailedLogs()
