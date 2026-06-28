const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const houseId = '24cee20d-3af5-4590-9a1a-8373637f9ac6'; // Biw's house
  const { data: orders, error } = await supabaseAdmin.from('orders').select('*').eq('house_id', houseId);
  console.log('Orders for Biw house:', orders?.length, orders);
}
run();
