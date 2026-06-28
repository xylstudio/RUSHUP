const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + " \r\n";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY + " \r\n";

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data, error } = await supabaseAdmin.from('orders').select('*');
  console.log("Orders count with trailing space:", data ? data.length : 0);
  console.log("Error:", error);
}
run();
