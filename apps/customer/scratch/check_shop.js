require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
async function run() {
  const { data, error } = await supabase.from('pos_shop_settings').select('id, name, opening_hours')
  console.log(JSON.stringify(data, null, 2))
}
run()
