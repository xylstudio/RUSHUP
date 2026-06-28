const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.vercel.local' }); // 🛡️ Use Vercel local secrets

const supabaseUrl = 'https://cdjbzyrflzckjgxqjqb.supabase.co'; // 📍 Extracted from JWT
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.vercel.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDb() {
  console.log('🔄 Attempting to add missing column to LIVE Supabase...');
  
  const sql = `ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;`;
  const sqlIndex = `CREATE INDEX IF NOT EXISTS idx_pos_orders_payment_intent_id ON public.pos_orders(payment_intent_id);`;
  
  console.log('⏳ Running Column Update...');
  const { error: colError } = await supabase.rpc('run_migration', {
    migration_sql: sql,
    migration_name: 'manual_patch_payment_intent_v2'
  });

  if (colError) {
    console.error('❌ Failed to apply patch via RPC:', colError);
  } else {
    console.log('✅ Column payment_intent_id added successfully!');
    
    console.log('⏳ Running Indexing...');
    const { error: idxError } = await supabase.rpc('run_migration', {
        migration_sql: sqlIndex,
        migration_name: 'manual_patch_payment_intent_index'
    });
    if (idxError) console.error('❌ Failed to create index:', idxError);
    else console.log('✅ Index created successfully!');
  }
}

fixDb();
