const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// 🛡️ Load Environment Variables
let config = {};
if (fs.existsSync('.env.prod.local')) {
  const envFile = fs.readFileSync('.env.prod.local');
  config = dotenv.parse(envFile);
} else if (fs.existsSync('.env')) {
  const envFile = fs.readFileSync('.env');
  config = dotenv.parse(envFile);
}

const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = config.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Could not find NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCascadingDeletes() {
  console.log(`🔄 Target Database: ${supabaseUrl}`);
  
  const sql = `
    DELETE FROM public.notifications 
    WHERE related_order_id IS NOT NULL 
    AND related_order_id NOT IN (SELECT id FROM public.orders);

    DELETE FROM public.notifications 
    WHERE related_measurement_id IS NOT NULL 
    AND related_measurement_id NOT IN (SELECT id FROM public.measurement_requests);

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_related_order_id_fkey') THEN
        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_related_order_id_fkey
        FOREIGN KEY (related_order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_related_measurement_id_fkey') THEN
        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_related_measurement_id_fkey
        FOREIGN KEY (related_measurement_id) REFERENCES public.measurement_requests(id) ON DELETE CASCADE;
      END IF;
    END $$;

    DELETE FROM public.work_reports 
    WHERE order_id NOT IN (SELECT id FROM public.orders);
  `;

  const rpcCandidates = [
    { name: 'run_sql', param: 'sql' },
    { name: 'run_migration', param: 'migration_sql' },
    { name: 'exec_sql', param: 'sql_query' },
    { name: 'execute_sql', param: 'sql_query' }
  ];

  for (const candidate of rpcCandidates) {
    console.log(`⏳ Trying ${candidate.name}...`);
    const payload = {};
    payload[candidate.param] = sql;
    if (candidate.name === 'run_migration') {
      payload.migration_name = 'fix_cascading_deletes_hotfix';
    }

    const { data, error } = await supabase.rpc(candidate.name, payload);

    if (!error) {
      console.log(`✅ Success via ${candidate.name}!`);
      process.exit(0);
    } else {
      console.log(`❌ ${candidate.name} failed:`, error.message);
    }
  }

  console.error('🚫 All SQL execution methods failed. Please check Supabase RPC permissions.');
  process.exit(1);
}

fixCascadingDeletes();
