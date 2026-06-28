const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const userId = "8af985c3-af7f-4ad5-bf46-0db129a17998";
  
  // Try deleting children first
  const { error: err1 } = await supabase
    .from('documents')
    .delete()
    .eq('user_id', userId)
    .not('source_document_id', 'is', null);
  console.log("Delete children error:", err1);

  // Try deleting parents
  const { error: err2 } = await supabase
    .from('documents')
    .delete()
    .eq('user_id', userId);
  console.log("Delete parents error:", err2);
}
run();
