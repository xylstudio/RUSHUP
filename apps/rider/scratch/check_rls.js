require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function run() {
  console.log('Checking RLS policies for work_reports...');
  
  const { data, error } = await supabase.rpc('get_table_privileges', { t_name: 'work_reports' });
  // If RPC doesn't exist, try direct query
  
  const { data: policies, error: polErr } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'work_reports');

  console.log('Policies:', JSON.stringify(policies || polErr, null, 2));
}

run().catch(console.error);
