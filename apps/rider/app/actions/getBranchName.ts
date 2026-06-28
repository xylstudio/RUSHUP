'use server'

import { createClient } from '@supabase/supabase-js'

export async function getBranchName(branchId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data, error } = await supabase
    .from('branches')
    .select('branch_name, name')
    .eq('id', branchId)
    .single()
    
  if (error || !data) return null
  return data.branch_name || data.name || null
}
