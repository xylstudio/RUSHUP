const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Check work_reports columns
  const { data: wr } = await supabaseAdmin.from('work_reports').select('*').limit(1);
  console.log('work_reports columns:', wr?.[0] ? Object.keys(wr[0]) : 'no data');
  
  const { data: wr2, error } = await supabaseAdmin.from('work_reports').select('id').limit(1);
  console.log('work_reports id only:', wr2, error);
}
run();
