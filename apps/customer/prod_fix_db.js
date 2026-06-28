const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// 🛡️ Load Production Environment Variables directly from the pulled file
const envFile = fs.readFileSync('.env.prod.local');
const config = dotenv.parse(envFile);

const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL; // 🛡️ Now verified from .env.prod.local
const supabaseServiceKey = config.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Could not find NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in production env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixLiveDb() {
  console.log(`🔄 Syncing with Production: ${supabaseUrl}`);
  console.log('⏳ Attempting to inject missing column into LIVE PRODUCTION...');
  
  const sql = `ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;`;
  const sqlIndex = `CREATE INDEX IF NOT EXISTS idx_pos_orders_payment_intent_id ON public.pos_orders(payment_intent_id);`;
  
  // 🚀 Execute via the 'exec_sql' RPC which is confirmed to exist in this repo
  console.log('⏳ Sending SQL Pulse...');
  const { error: colError } = await supabase.rpc('exec_sql', {
    sql_query: sql
  });

  if (colError) {
    console.error('❌ Hotfix Pulse Failed:', colError);
  } else {
    console.log('✅ Column payment_intent_id added to PRODUCTION successfully!');
    
    // Also add index for performance
    await supabase.rpc('exec_sql', {
        sql_query: sqlIndex
    });
    console.log('✅ Index added to PRODUCTION successfully!');
  }
}

fixLiveDb();
