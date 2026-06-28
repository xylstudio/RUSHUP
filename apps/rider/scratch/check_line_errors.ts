import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkAuditLogs() {
  const supabase = createClient(url!, key!)
  
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', 'line_customer_report_delivery_failed')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error(error)
    return
  }

  logs.forEach(l => {
    console.log(`Time: ${l.created_at}`)
    console.log(`Reason: ${l.details.reason}`)
    console.log(`Error: ${JSON.stringify(l.details.error)}`)
    console.log('---')
  })
}

checkAuditLogs()
