import { createClient } from '@supabase/supabase-js'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(url, key)

async function testUpdate() {
  const { data: houses, error: e1 } = await supabase.from('houses').select('*').limit(1)
  if (!houses || houses.length === 0) return console.log("No house", e1)
  
  const house = houses[0]
  
  const { error } = await supabase.from('houses').update({
    branch_code: ""
  }).eq('id', house.id)
  
  console.log("Empty branch code:", error)

  const { error: err2 } = await supabase.from('houses').update({
    branch_code: "invalid_format_???"
  }).eq('id', house.id)

  console.log("Invalid branch code:", err2)

  const { error: err3 } = await supabase.from('houses').update({
    name: "Test"
  }).eq('id', "not-a-uuid")
  
  console.log("Bad UUID:", err3)
}
testUpdate()
