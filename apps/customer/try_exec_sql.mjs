import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.trim()
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim()

const supabase = createClient(supabaseUrl, supabaseKey)

const sql = `
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS platform_gp_fee NUMERIC DEFAULT 0;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS platform_gp_rate NUMERIC DEFAULT 0;
ALTER TABLE public.pos_shop_settings ADD COLUMN IF NOT EXISTS delivery_gp JSONB DEFAULT '{"grab": 32.1, "lineman": 32.1, "shopee": 32.1, "foodpanda": 32.1, "robinhood": 0}'::jsonb;
`

async function run() {
  console.log('Running SQL Migration via exec_sql...')
  const { data, error } = await supabase.rpc('exec_sql', { query: sql })
  
  if (error) {
    console.error('Error applying migration via exec_sql:', error)
  } else {
    console.log('Migration Applied Successfully!')
  }
}

run()
