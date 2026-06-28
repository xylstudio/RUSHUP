const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTriggers() {
  // 1. Create temporary debug table and insert trigger info
  const sql = `
    CREATE TABLE IF NOT EXISTS public.temp_triggers_debug (name TEXT, statement TEXT);
    TRUNCATE public.temp_triggers_debug;
    INSERT INTO public.temp_triggers_debug (name, statement)
    SELECT trigger_name, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'pos_order_items';
  `;

  const { error: runErr } = await supabase.rpc('run_migration', {
    migration_sql: sql,
    migration_name: 'debug_triggers_inspection'
  });

  if (runErr) {
    console.error('run_migration failed:', runErr);
    return;
  }

  // 2. Fetch the data from the debug table
  const { data, error: fetchErr } = await supabase.from('temp_triggers_debug').select('*');
  if (fetchErr) {
    console.error('Fetch failed:', fetchErr);
  } else {
    console.log('Triggers on pos_order_items:', data);
  }

  // 3. Clean up the debug table
  await supabase.rpc('run_migration', {
    migration_sql: 'DROP TABLE IF EXISTS public.temp_triggers_debug;',
    migration_name: 'debug_triggers_cleanup'
  });
}

listTriggers();
