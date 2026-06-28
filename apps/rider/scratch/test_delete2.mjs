import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testSql() {
  const userId = 'f0f7c298-fc8e-4547-a654-1a46d10b9b2d';
  
  // What if we delete measurement requests first?
  const { error: err1 } = await supabase.from('measurement_requests').delete().eq('customer_id', userId);
  console.log('mr err:', err1?.message);
  
  // Delete houses
  const { error: err2 } = await supabase.from('houses').delete().eq('customer_id', userId);
  console.log('houses err:', err2?.message);

  // Delete document_customer_registry
  const { error: err3 } = await supabase.from('document_customer_registry').delete().eq('source_customer_id', userId);
  console.log('doc reg err:', err3?.message);
  
  // Now try to delete profile again
  const { error: err4 } = await supabase.from('profiles').delete().eq('id', userId);
  console.log('profile err:', err4?.message);
}

testSql()
