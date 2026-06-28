const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  await supabaseAdmin.from('orders').delete().eq('id', 'c323caa5-7cd4-445b-8cf3-ea6190e68625');
  console.log('Deleted mock order');
}
run();
