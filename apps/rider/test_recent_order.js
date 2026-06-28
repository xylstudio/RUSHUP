const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: orders } = await supabaseAdmin.from('orders').select('id, house_id, customer_id, order_code').order('created_at', { ascending: false }).limit(3);
  for (const o of orders) {
    console.log('Order:', o);
    const { data: collabs } = await supabaseAdmin.from('house_collaborators').select('user_id').eq('house_id', o.house_id);
    console.log('  Collabs:', collabs);
  }
}
run();
