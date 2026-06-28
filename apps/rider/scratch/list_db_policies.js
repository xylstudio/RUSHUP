
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllPolicies() {
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'houses' });
  if (error) {
    // If RPC doesn't exist, try a raw query via a temporary function or just check metadata if possible
    console.log('RPC get_policies_for_table not found, trying manual audit...');
    
    const { data: policies, error: polError } = await supabase.from('pg_policies').select('*').or('tablename.eq.houses,tablename.eq.house_collaborators');
    if (polError) {
        // pg_policies might not be accessible via anon/service role without permissions
        console.error('Cannot access pg_policies:', polError.message);
    } else {
        console.log('Policies found:', policies);
    }
  } else {
    console.log('Houses Policies:', data);
  }
}

listAllPolicies();
