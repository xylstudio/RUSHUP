const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data: mods } = await supabase.from('pos_menu_modifiers').select('*').limit(1);
  console.log("Current modifier recipe_data:", mods[0].recipe_data);
}
run();
