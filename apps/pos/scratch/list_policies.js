
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listPolicies() {
  console.log('Fetching RLS policies for house_collaborators...');
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'house_collaborators' });
  
  if (error) {
    // If RPC doesn't exist, try raw SQL if possible, but I can't.
    // I'll try to query pg_policies via a generic query if it's allowed (usually not for anon/authenticated)
    // But I'm using service_role!
    const { data: policies, error: sqlError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'house_collaborators');

    if (sqlError) {
      console.error('Error fetching policies:', sqlError.message);
      return;
    }
    console.log('Policies:', JSON.stringify(policies, null, 2));
  } else {
    console.log('Policies:', JSON.stringify(data, null, 2));
  }
}

listPolicies();
