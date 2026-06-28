const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: dbEntry } = await supabaseAdmin.from('line_users').select('line_user_id').eq('user_id', 'a73f8ca7-8868-44d6-be1c-ecb94885d2f3').maybeSingle();
  console.log("From line_users:", dbEntry);
  
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById('a73f8ca7-8868-44d6-be1c-ecb94885d2f3');
  console.log("From auth user metadata:", authUser?.user?.user_metadata);
}
run();
