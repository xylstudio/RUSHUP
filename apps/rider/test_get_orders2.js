const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const visitorId = 'a73f8ca7-8868-44d6-be1c-ecb94885d2f3'; // Another user
  const { data: collabHouses } = await supabaseAdmin
    .from('house_collaborators')
    .select('house_id')
    .eq('user_id', visitorId);
    
  const houseIds = collabHouses?.map(c => c.house_id) || [];
  console.log('House IDs for visitor 2:', houseIds);
  
  if (houseIds.length > 0) {
    const { data: orders, error: oErr } = await supabaseAdmin
      .from('orders')
      .select('id, scheduled_date')
      .in('house_id', houseIds)
      .order('created_at', { ascending: false });
    console.log('Orders found for houses:', orders);
  }
}
run();
