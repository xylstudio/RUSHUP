const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users, error } = await supabaseAdmin.from('profiles').select('id, display_name').in('display_name', ['biw', 'p', 'P']);
  console.log('Users:', users);
  
  const { data: collabs } = await supabaseAdmin.from('house_collaborators').select('*');
  console.log('Collabs:', collabs);
}
run();
