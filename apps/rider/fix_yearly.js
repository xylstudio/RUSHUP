const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Update yearly order to next appointment
  await supabaseAdmin.from('orders').update({ scheduled_date: '2026-07-22' }).eq('id', '70d35c8f-da26-430b-8082-3612d8975a82');
  
  // Delete the wrongly created follow-up order
  await supabaseAdmin.from('orders').delete().eq('id', '6bf44c0d-7215-4acb-a691-ad4d85e7ed5a');
  
  console.log("Fixed yearly order schedule and deleted duplicate follow-up.");
}
run();
