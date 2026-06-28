const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Fetch work_report schema via pg
  const { data, error } = await supabaseAdmin.rpc('get_work_report_columns').limit(1);
  console.log('rpc:', data, error);
  
  // Try inserting a dummy to see columns
  const { data: wr, error: e } = await supabaseAdmin.from('work_reports').select('id, created_at, updated_at').limit(1);
  console.log('work_reports basic:', wr, e);
}
run();
