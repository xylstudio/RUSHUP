import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testDelete() {
  const userId = 'f0f7c298-fc8e-4547-a654-1a46d10b9b2d'; // from screenshot
  
  // Try to delete documents
  const { error: err1 } = await supabase.from('documents').delete().eq('user_id', userId)
  console.log('docs err:', err1?.message)

  const { error: err2 } = await supabase.from('orders').delete().eq('customer_id', userId)
  console.log('orders err:', err2?.message)

  const { error: err3 } = await supabase.from('houses').delete().eq('customer_id', userId)
  console.log('houses err:', err3?.message)
  
  const { error: err4 } = await supabase.from('document_customer_registry').delete().eq('source_customer_id', userId)
  console.log('doc reg err:', err4?.message)
  
  const { error: err5 } = await supabase.from('profiles').delete().eq('id', userId)
  console.log('profile err:', err5?.message)
}

testDelete()
