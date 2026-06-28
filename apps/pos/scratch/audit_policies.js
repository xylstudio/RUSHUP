
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function auditPolicies() {
  console.log("Auditing RLS Policies for house_collaborators and profiles...")
  
  // Query pg_policies to see the actual logic in the database
  const { data, error } = await supabase.rpc('run_sql', {
    sql_query: `
      SELECT 
        schemaname, 
        tablename, 
        policyname, 
        permissive, 
        roles, 
        cmd, 
        qual, 
        with_check 
      FROM pg_policies 
      WHERE tablename IN ('house_collaborators', 'profiles', 'houses');
    `
  })

  if (error) {
    console.error("Error fetching policies:", error.message)
    // Fallback: Try to query using a simple select if rpc fails
    console.log("RPC 'run_sql' might be missing. Trying alternative diagnostic...")
    return
  }

  console.table(data)
}

auditPolicies()
