const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { sendLinePushToSupabaseUser } = require('./lib/server/lineMessaging'); // Can't easily require ts

async function run() {
  const { data: cols } = await supabaseAdmin.from('house_collaborators').select('user_id').eq('house_id', 'd5bff015-5124-4811-94c7-abec606e5319');
  console.log('Cols:', cols);
}
run();
