
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditPolicies() {
  const { data, error } = await supabase.rpc('get_policies'); // This might not exist, use raw query if possible
  
  // Since I can't easily run RPCs that don't exist, I'll use a standard query to check for access
  console.log('Checking house_collaborators access...');
  const { data: collaborators, error: collError } = await supabase
    .from('house_collaborators')
    .select('*')
    .limit(1);
  
  if (collError) {
    console.error('Error fetching house_collaborators:', collError.message);
    if (collError.message.includes('recursion')) {
      console.log('CONFIRMED: Infinite recursion in house_collaborators policy.');
    }
  } else {
    console.log('house_collaborators access OK');
  }

  console.log('Checking profiles access...');
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profError) {
    console.error('Error fetching profiles:', profError.message);
  } else {
    console.log('profiles access OK');
  }
}

auditPolicies();
