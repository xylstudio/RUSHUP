import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testSql() {
  const userId = 'f0f7c298-fc8e-4547-a654-1a46d10b9b2d';
  
  const { data: docReg } = await supabase.from('document_customer_registry').select('*').eq('source_customer_id', userId);
  console.log('Doc reg:', docReg);
}

testSql()
