
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkZones() {
  const houseId = '19f15e6e-248c-4322-b61f-de707b0a0471'
  const { data, error } = await supabase
    .from('house_plans')
    .select('*')
    .eq('house_id', houseId)
    .single()

  if (error) {
    console.error('Error fetching plan:', error)
    return
  }

  console.log('Plan Data:', JSON.stringify(data.plan_data, null, 2))
}

checkZones()
