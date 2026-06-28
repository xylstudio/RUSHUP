require('dotenv').config({ path: '.env.prod.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('--- REALTIME STATUS CHECK ---');
  
  // 1. Check tables in the supabase_realtime publication
  const { data: realtimeTables, error: rtErr } = await supabase.rpc('run_sql', { 
    sql: "SELECT table_name FROM pg_publication_tables WHERE pubname = 'supabase_realtime'" 
  });
  
  if (rtErr) {
    console.error('Failed to check realtime publication (RPC might be disabled):', rtErr.message);
  } else {
    console.log('Tables with Realtime ENABLED:', realtimeTables.map(t => t.table_name));
  }

  // 2. Check RLS for essential tables
  const tables = ['pos_orders', 'pos_shop_settings', 'pos_shifts'];
  for (const table of tables) {
    const { data: policies, error: polErr } = await supabase.rpc('run_sql', { 
      sql: `SELECT policyname, cmd FROM pg_policies WHERE tablename = '${table}'` 
    });
    if (policies) {
      console.log(`\nRLS Policies for ${table}:`, policies);
    }
  }
}

run();
