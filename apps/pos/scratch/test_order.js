require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data } = await supabase.from('pos_orders').select('order_number, delivery_fee').eq('order_number', 'DEL#20260620-0041').single();
  console.log('Order DEL#20260620-0041 delivery_fee is:', data ? data.delivery_fee : 'Not found');
}
run();
