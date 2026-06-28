import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cdjbzyrflzckjgxbqjqb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs'
)

async function run() {
  const { data: users, error: userError } = await supabase.from('profiles').select('*').limit(5)
  console.log('Users:', users?.length)
  const { data: houses, error: houseError } = await supabase.from('houses').select('*').limit(5)
  console.log('Houses:', houses?.length)
  const { data: collaborators, error: collError } = await supabase.from('house_collaborators').select('*')
  console.log('Collaborators count:', collaborators?.length, collaborators, collError)
}
run()
