require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await supabase.rpc('execute_sql', { sql: 'ALTER TABLE pos_orders ADD COLUMN queue_number INTEGER;' });
  console.log('Result:', JSON.stringify({ data, error }));
})();
