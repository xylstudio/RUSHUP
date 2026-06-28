const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabaseAdmin.from('house_collaborators').select('*').limit(1);
  console.log("house_collaborators:", data, error);
  const { data: hu, error: he } = await supabaseAdmin.from('house_users').select('*').limit(1);
  console.log("house_users:", hu, he);
}
run();
