
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables')
  if (error) {
    // If RPC doesn't exist, try querying pg_catalog
    const { data: tables, error: pgError } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public')
    if (pgError) {
      console.error('Error listing tables:', pgError)
      
      // Try a simple query to a known table to see if it works
      const { data: profiles, error: pError } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
      console.log('Profiles count:', profiles, pError)
    } else {
      console.log('Tables:', tables.map(t => t.tablename))
    }
  } else {
    console.log('Tables:', data)
  }
}

listTables()
