require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function run() {
  const customerId = 'f0f7c298-fc8e-4547-a654-1a46d10b9b2d';
  
  const { data, error } = await supabase
    .from('work_reports')
    .select('*, profiles(display_name)')
    .eq('customer_id', customerId);

  if (error) {
    console.error('Query Error:', error);
  } else {
    console.log('Query Result:', JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
