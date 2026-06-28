const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const supabase = createClient(process.env.NEXT_PUBLIC_APP_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'profiles' });
  console.log('Columns:', data);
  console.log('Error:', error);
}

// Alternatively, just try to select everything and see what we get (already did that in previous script)
