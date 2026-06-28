const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin.from('orders').select('id, status, total_sessions, completed_sessions, order_code').eq('house_id', 'a6f6f96c-24ee-48c0-bc6d-0d6d5ef0a5ba');
  console.log(data);
}
run();
