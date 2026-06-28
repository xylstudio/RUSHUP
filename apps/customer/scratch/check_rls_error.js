
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkPolicies() {
  // We can't query pg_policies via standard Supabase client usually
  // but let's try a trick to see if we can get anything
  console.log("Checking house_collaborators count...")
  const { count, error } = await supabase.from('house_collaborators').select('*', { count: 'exact', head: true })
  console.log(`Count: ${count}, Error: ${error?.message}`)
  
  console.log("Checking houses count...")
  const { count: hCount, error: hError } = await supabase.from('houses').select('*', { count: 'exact', head: true })
  console.log(`Houses Count: ${hCount}, Error: ${hError?.message}`)
}

checkPolicies()
