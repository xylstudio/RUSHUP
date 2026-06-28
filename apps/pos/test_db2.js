const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabaseAdmin.from('orders').select('id, status, pricing_period, total_sessions').eq('id', '70d35c8f-da26-430b-8082-3612d8975a82').single();
  console.log(data);
}
run();
