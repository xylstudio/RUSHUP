const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Check job_assignments columns
  const { data: ja } = await supabaseAdmin.from('job_assignments').select('*').limit(1);
  console.log('job_assignments columns:', ja?.[0] ? Object.keys(ja[0]) : 'no data');
  
  // Check additional_services columns
  const { data: as } = await supabaseAdmin.from('additional_services').select('*').limit(1);
  console.log('additional_services columns:', as?.[0] ? Object.keys(as[0]) : 'no data');
}
run();
