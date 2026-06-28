import { supabase } from './lib/supabaseClient'

async function test() {
  const { data, error } = await supabase.from('pos_menu_categories').insert({ name: 'TestCat', color: '#000000', branch_id: null })
  console.log('Error:', error)
}
test()
