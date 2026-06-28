const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const visitorId = 'a73f8ca7-8868-44d6-be1c-ecb94885d2f3'; // User 2

async function run() {
  const { data: collabHouses } = await supabaseAdmin.from('house_collaborators').select('house_id').eq('user_id', visitorId);
  const houseIds = collabHouses?.map(c => c.house_id) || [];
  
  const { data: orders } = await supabaseAdmin.from('orders').select('id, created_at, scheduled_date').in('house_id', houseIds);
  const orderIds = orders?.map(o => o.id) || [];
  console.log('Orders:', orders);
  
  const { data: reports } = await supabaseAdmin.from('work_reports').select('id, created_at, updated_at').in('order_id', orderIds);
  console.log('Reports:', reports);
}
run();
