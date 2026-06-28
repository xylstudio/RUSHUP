const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('audit_logs').insert({
    action: 'line_push_api_failed',
    details: {
      test: true
    }
  }).select();
  console.log("Insert result:", error ? error.message : "Success", data);
}

main();
