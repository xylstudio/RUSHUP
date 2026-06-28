const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  const targetId = '65ef7d07-8d90-4c0c-97a0-1ba119aa9be4';
  const { data: orders, error } = await supabaseAdmin.from('orders').select('*, services(service_name)').eq('customer_id', targetId).order('created_at', { ascending: false });
  console.log("Orders:", orders);
  console.log("Error:", error);
}
run();
