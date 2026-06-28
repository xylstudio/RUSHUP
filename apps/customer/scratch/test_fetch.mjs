import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testSql() {
  const userId = 'f0f7c298-fc8e-4547-a654-1a46d10b9b2d';
  // We can't directly execute SQL from the JS client easily without RPC, 
  // but we can check if there are other rows in document_customer_registry
  
  const { data: rows } = await supabase.from('document_customer_registry').select('*').eq('source_customer_id', userId);
  console.log('Registry rows for user:', rows);
  
  // Let's check measurement requests
  const { data: mr } = await supabase.from('measurement_requests').select('*').eq('customer_id', userId);
  console.log('Measurement requests for user:', mr);

}

testSql()
