const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: user } = await supabaseAdmin.from('profiles').select('id').eq('email', 'U5dc61bfebbeea5efed07f0847ff92371@line.xylemlandscape.com').single();
  if (user) {
    const { data } = await supabaseAdmin.from('orders').select('id, status, order_code, scheduled_date').eq('customer_id', user.id);
    console.log(data);
  }
}
run();
