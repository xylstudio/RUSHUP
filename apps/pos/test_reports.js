const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');

require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: reports, error } = await supabaseAdmin.from('work_reports').select('id, order_id, created_at').limit(10);
  console.log('Reports:', reports, 'Error:', error);
}
run();
