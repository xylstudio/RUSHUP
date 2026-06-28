require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function run() {
  const oldOrderId = '0091efc4-ab16-4fb6-8ab6-f46f3b4033d9';
  const newOrderId = '9168101a-6c96-4570-b5f0-4aaad853e5ab';
  
  console.log(`Migrating reports from ${oldOrderId} to ${newOrderId}...`);
  
  const { data, error } = await supabase
    .from('work_reports')
    .update({ order_id: newOrderId })
    .eq('order_id', oldOrderId);

  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log('Migration successful!');
  }
}

run().catch(console.error);
