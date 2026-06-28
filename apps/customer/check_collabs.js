const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const houseId = 'c02821a7-6d6f-4fb0-ba12-d812c3eebfd3'; // Example houseId
  const { data, error } = await supabaseAdmin.from('house_collaborators').select('*').limit(5);
  console.log('House collaborators:', data, error);
}
run();
