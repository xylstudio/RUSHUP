const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.rpc('get_policies', { table_name: 'orders' });
  console.log(error || data);
  
  // if no rpc, just query pg_policies
  const { data: policies, error: err2 } = await supabaseAdmin.from('pg_policies').select('*').eq('tablename', 'orders');
  console.log("Policies:", policies);
}
run();
