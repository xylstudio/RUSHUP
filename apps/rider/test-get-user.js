const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.auth.admin.getUserById("a05ee6f1-9ef3-4e1f-a24e-3f380b374b28");
  console.log('Error:', error);
  console.log('Data user ID:', data?.user?.id);
  console.log('Data itself ID:', data?.id);
}
run();
