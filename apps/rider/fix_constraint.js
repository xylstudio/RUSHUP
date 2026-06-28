const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDb() {
  console.log('🔄 Attempting to update check constraint...');
  
  const sql = `
    ALTER TABLE public.pos_orders DROP CONSTRAINT IF EXISTS pos_orders_status_check;
    ALTER TABLE public.pos_orders ADD CONSTRAINT pos_orders_status_check 
    CHECK (status IN ('pending', 'payment_pending', 'paid', 'confirmed', 'in_progress', 'accepted', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled'));
  `;
  
  // Try using RPC if it exists
  const { error } = await supabase.rpc('run_migration', {
    migration_sql: sql,
    migration_name: 'manual_patch_status_check_v3'
  });

  if (error) {
    console.error('❌ Failed to apply patch via RPC:', error);
  } else {
    console.log('✅ Status check constraint updated successfully via RPC!');
  }
}

fixDb();
