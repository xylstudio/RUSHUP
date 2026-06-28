require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
async function run() {
  const t1 = await supabase.from('pos_items').select('*', { count: 'exact', head: true })
  console.log('POS Items Error:', t1.error)
}
run()
