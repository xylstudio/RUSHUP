const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', 'line_push_api_failed')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (error) {
    console.error("Error fetching logs:", error);
    return;
  }
  
  console.log("Recent LINE push errors:");
  data.forEach(log => {
    console.log(log.created_at);
    console.dir(log.details, { depth: null });
  });
}

main();
