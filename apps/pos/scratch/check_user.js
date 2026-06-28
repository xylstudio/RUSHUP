const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.from('profiles').select('*').eq('id', 'f0f7c298-fc8e-4547-a654-1a46d10b9b2d').maybeSingle();
  console.log('Profile:', data);
  console.log('Error:', error);
}

check();
