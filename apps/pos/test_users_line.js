const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) { console.error(error); return; }
  for (const u of users.users) {
    const lineUserId = u.user_metadata?.line_user_id || u.user_metadata?.lineUserId || u.app_metadata?.line_user_id || u.identities?.find(i => i.provider === 'line')?.identity_data?.sub;
    console.log(`User: ${u.email} | Line: ${lineUserId ? 'YES' : 'NO'}`);
  }
}
run();
