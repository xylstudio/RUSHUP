import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('run_migration', {
    migration_sql: `
      ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS platform_gp_fee NUMERIC DEFAULT 0;
      ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS platform_gp_rate NUMERIC DEFAULT 0;
      ALTER TABLE pos_branches ADD COLUMN IF NOT EXISTS platform_gp_rates JSONB DEFAULT '{"grab": 32.1, "lineman": 32.1, "shopee": 32.1, "foodpanda": 32.1, "robinhood": 0}'::jsonb;
    `,
    migration_name: 'add_gp_columns'
  });
  console.log(error || 'Success', data);
}
run();
