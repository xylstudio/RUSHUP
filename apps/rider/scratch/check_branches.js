require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
async function run() {
  const t1 = await supabase.from('pos_shop_settings').select('id, name, branch_id')
  console.log('Shop Settings:', t1.data)
  
  const t2 = await supabase.from('inventory_items').select('id, name, branch_id').limit(1)
  console.log('Inventory Items Sample:', t2.data)
  
  const t3 = await supabase.from('pos_menu_items').select('id, name, branch_id').limit(1)
  console.log('Menu Items Sample:', t3.data)
}
run()
