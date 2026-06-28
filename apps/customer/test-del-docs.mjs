import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const userId = '849a53e0-c055-4329-af03-1bd6419dadad'; // Let's try to fetch docs for a random user, wait no, let's not delete real docs.
  console.log('Script is ready. Not running on real data without care.');
}
test()
