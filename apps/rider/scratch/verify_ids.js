require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function run() {
  const customerId = 'f0f7c298-fc8e-4547-a654-1a46d10b9b2d';
  
  console.log('--- ORDERS ---');
  const { data: orders } = await supabase.from('orders').select('id, status, completed_sessions').eq('customer_id', customerId);
  console.log(JSON.stringify(orders, null, 2));

  console.log('\n--- REPORTS ---');
  const { data: reports } = await supabase.from('work_reports').select('id, order_id, customer_id, work_done').eq('customer_id', customerId);
  console.log(JSON.stringify(reports, null, 2));
}

run().catch(console.error);
