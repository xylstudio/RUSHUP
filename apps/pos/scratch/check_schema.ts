import { createClient } from '@supabase/supabase-js'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(url, key)

async function check() {
  const { data, error } = await supabase.from('houses').select('branch_code').limit(1)
  console.log(data, error)
  const { data: d2, error: e2 } = await supabase.rpc('get_schema_info') || {}
}
check()
