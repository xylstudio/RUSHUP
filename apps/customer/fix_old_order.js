const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: order } = await supabaseAdmin.from('orders').select('id, status, total_sessions, completed_sessions').eq('id', '58403cca-523a-4680-a0d5-1679c7846e7d').single();
  if (order) {
    const { error } = await supabaseAdmin.from('orders').update({ status: 'completed' }).eq('id', '58403cca-523a-4680-a0d5-1679c7846e7d');
    console.log("Updated:", error);
  }
}
run();
