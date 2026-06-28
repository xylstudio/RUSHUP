import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const sql = `
ALTER TABLE public.pos_menu_items ADD COLUMN IF NOT EXISTS platform_prices JSONB DEFAULT '{}';
`

async function run() {
  console.log('Running SQL Migration...')
  const { data, error } = await supabase.rpc('run_migration', {
    migration_sql: sql,
    migration_name: 'add_platform_prices'
  })
  
  if (error) {
    console.error('Error applying migration via RPC:', error)
  } else {
    console.log('Migration Applied Successfully!')
  }
}

run()
