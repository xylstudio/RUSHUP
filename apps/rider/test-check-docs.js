const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const userId = 'a05ee6f1-9ef3-4e1f-a24e-3f380b374b28';
  const { data } = await supabase.from('documents').select('id, source_document_id').eq('user_id', userId);
  console.log(data);
}
run();
