const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: orders } = await supabaseAdmin.from('orders').select('*').eq('house_id', 'd5bff015-5124-4811-94c7-abec606e5319');
  console.log('Orders:', orders.map(o => ({ id: o.id, date: o.scheduled_date, status: o.status })));
}
run();
