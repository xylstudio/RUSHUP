const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const userId = 'a05ee6f1-9ef3-4e1f-a24e-3f380b374b28';
  
  // 1. Get all documents for this user
  const { data: userDocs } = await supabase.from('documents').select('id').eq('user_id', userId);
  if (userDocs && userDocs.length > 0) {
    const docIds = userDocs.map(d => d.id);
    
    // 2. Delete any documents that reference these documents (Admin created ones)
    const { error: childErr } = await supabase.from('documents').delete().in('source_document_id', docIds);
    console.log("Deleted children of user docs:", childErr);
  }

  // 3. Delete the user's documents
  const { error: parentErr } = await supabase.from('documents').delete().eq('user_id', userId);
  console.log("Deleted user docs:", parentErr);

  // 4. Delete the profile
  const { error: profErr } = await supabase.from('profiles').delete().eq('id', userId);
  console.log("Deleted profile:", profErr);
}
run();
