require('dotenv').config({ path: '.env.prod.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const tables = ['inventory_items', 'pos_menu_items', 'pos_inventory_audit_sessions', 'pos_inventory_audit_details'];
  console.log('--- ACTUAL LIVE DATABASE SCHEMA ---');
  
  for (const table of tables) {
    console.log(`\nTABLE: ${table}`);
    const { data, error } = await supabase.from(table).select('*').limit(1).maybeSingle();
    if (error) {
      console.error(`Error querying ${table}:`, error.message);
      continue;
    }
    if (data) {
      console.log('COLUMNS:', Object.keys(data).join(', '));
      console.log('SAMPLE ROW:', JSON.stringify(data, null, 2));
    } else {
      console.log('Table found but it is EMPTY.');
    }
  }
}

run();
