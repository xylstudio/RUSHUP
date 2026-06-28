const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const key = fs.readFileSync('.env.local', 'utf8').split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY')).split('=')[1].replace(/"/g, '');
const supabase = createClient("https://cdjbzyrflzckjgxbqjqb.supabase.co", key);
async function run() {
  const { data, error } = await supabase.from('customer_order_feedback').select('*').limit(1);
  console.log(JSON.stringify(data, null, 2), error);
}
run();
