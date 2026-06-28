
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findReport() {
  console.log('Searching for report with text: ควรพ่นยารอบต่อไป');
  const { data, error } = await supabase
    .from('work_reports')
    .select('*, profiles:staff_id(display_name)')
    .or('recommendations.ilike.%ควรพ่นยารอบต่อไป%,work_done.ilike.%ควรพ่นยารอบต่อไป%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} reports.`);
  if (data.length > 0) {
    console.log('Match:', JSON.stringify(data[0], null, 2));
  }
}

findReport();
