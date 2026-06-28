require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function run() {
  const customerId = 'f0f7c298-fc8e-4547-a654-1a46d10b9b2d';
  console.log(`Checking work reports for customer ${customerId}...`);
  
  const { data: reports, error: getErr } = await supabase
    .from('work_reports')
    .select('id, order_id, customer_id, work_done, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (getErr) {
    console.error('Failed to get reports:', getErr);
    return;
  }

  console.log('Reports Found:', JSON.stringify(reports, null, 2));
}

run().catch(console.error);
