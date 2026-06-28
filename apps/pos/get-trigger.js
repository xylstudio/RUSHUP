const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('run_sql', { query: `
    SELECT pg_get_functiondef(oid)
    FROM pg_proc
    WHERE proname = 'prevent_delete_referenced_documents';
  ` });
  if (error) {
    // If run_sql is not available, try to query via PostgREST if we have a table with triggers, but we don't.
    console.log("No RPC available to run arbitrary SQL.");
  } else {
    console.log(data);
  }
}
run();
