const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testTypes() {
  const { data: users } = await supabase.from('profiles').select('*').eq('role', 'staff').limit(1);
  const user = users[0];

  const typesToTest = ['monthy', 'montly', 'monthly ', ' monthly'];

  for (const type of typesToTest) {
    const payload = { salary_type: type };
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
    console.log(`Testing '${type}':`, error ? error.message : 'SUCCESS');
  }
}

testTypes();
