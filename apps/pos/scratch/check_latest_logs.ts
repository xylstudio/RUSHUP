import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkRecentAuditLogs() {
  const supabase = createClient(url!, key!)
  
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error(error)
    return
  }

  logs.forEach(l => {
    console.log(`[${l.created_at}] Action: ${l.action}`)
    if (l.details) {
       console.log(`Details: ${JSON.stringify(l.details)}`)
    }
    console.log('---')
  })
}

checkRecentAuditLogs()
