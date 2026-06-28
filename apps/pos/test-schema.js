const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'profiles' });
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
