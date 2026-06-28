const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const adminId = '38868aec-cef5-4080-8260-bebe10bc5a13';
  const { data } = await supabase.from('profiles').select('id, email, role').eq('id', adminId);
  console.log(data);
}
run();
