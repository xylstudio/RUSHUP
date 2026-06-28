const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const userId = 'a05ee6f1-9ef3-4e1f-a24e-3f380b374b28';
  
  const { error: err1 } = await supabase.from('documents').delete().eq('user_id', userId).not('source_document_id', 'is', null);
  console.log('Docs child error:', err1);
  const { error: err2 } = await supabase.from('documents').delete().eq('user_id', userId);
  console.log('Docs parent error:', err2);
  
  const { error: err3 } = await supabase.from('profiles').delete().eq('id', userId);
  console.log('Profile delete error:', err3);
}
run();
