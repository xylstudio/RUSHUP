
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('Fetching latest work report...');
  const { data, error } = await supabase
    .from('work_reports')
    .select('*, profiles:staff_id(display_name)')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching work report:', error);
    return;
  }

  console.log('Latest Report:', JSON.stringify(data[0], null, 2));
}

checkData();
