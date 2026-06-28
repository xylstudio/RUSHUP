require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function run() {
  const newOrderId = 'dda18350-5fc9-4bc1-a836-eea62848ef4b';
  console.log(`Migrating ALL reports for customer to ${newOrderId}...`);
  
  const customerId = 'f0f7c298-fc8e-4547-a654-1a46d10b9b2d';

  const { data, error } = await supabase
    .from('work_reports')
    .update({ order_id: newOrderId })
    .eq('customer_id', customerId);

  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log('Migration successful!');
  }

  // Also ensure the counter is 2
  await supabase.from('orders').update({ completed_sessions: 2 }).eq('id', newOrderId);
}

run().catch(console.error);
