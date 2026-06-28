const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, profiles:customer_id(display_name), services:service_id(name, service_name), houses:house_id(name)')
    .limit(1);
    
  console.log("Order test:", JSON.stringify(data, null, 2), error);
}
run();
