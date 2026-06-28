const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: logs, error } = await supabaseAdmin
    .from('audit_logs')
    .select('action, details, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log("Recent audit logs:", JSON.stringify(logs, null, 2));
}
run();
