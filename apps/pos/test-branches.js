require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: b } = await supabase.from('branches').select('*');
  console.log("Branches:", b);
  const { data: s } = await supabase.from('pos_shop_settings').select('*');
  console.log("Shop settings:", s);
}
test();
