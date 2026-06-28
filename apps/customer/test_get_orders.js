const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const visitorId = '65ef7d07-8d90-4c0c-97a0-1ba119aa9be4'; // From check_biw_collab.js output
  const { data: userOrders, error } = await supabaseAdmin.from('orders').select('*').eq('customer_id', visitorId);
  console.log('User orders direct:', userOrders?.length);

  // Re-implement the logic of `/api/customer/orders`
  const { data: collabHouses } = await supabaseAdmin
    .from('house_collaborators')
    .select('house_id')
    .eq('user_id', visitorId);
    
  const houseIds = collabHouses?.map(c => c.house_id) || [];
  console.log('House IDs for visitor:', houseIds);
  
  if (houseIds.length > 0) {
    const { data: orders, error: oErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .in('house_id', houseIds)
      .order('created_at', { ascending: false });
    console.log('Orders found for houses:', orders?.length, oErr);
  }
}
run();
