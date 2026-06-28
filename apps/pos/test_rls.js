const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const staffId = '1e34ff60-e4b9-4700-aa1d-ff141ee1fce7'; // prom@xylstudio.com
  const supabaseStaff = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const { data: sessionData } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'prom@xylstudio.com'
  });
  console.log('Use service role to query house_collaborators directly?');
}
run();
