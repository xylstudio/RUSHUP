const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { error: err1 } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS platform_gp_fee NUMERIC DEFAULT 0;' });
    console.log("Add fee:", err1 ? err1.message : 'Success');
    const { error: err2 } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS platform_gp_rate NUMERIC DEFAULT 0;' });
    console.log("Add rate:", err2 ? err2.message : 'Success');
}
run();
