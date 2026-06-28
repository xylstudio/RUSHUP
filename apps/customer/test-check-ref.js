const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const docId = '8af985c3-af7f-4ad5-bf46-0db129a17998';
  const { data } = await supabase.from('documents').select('id, user_id').eq('source_document_id', docId);
  console.log(data);
}
run();
