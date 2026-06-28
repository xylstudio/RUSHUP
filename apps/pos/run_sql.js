import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const sql = fs.readFileSync('migrations/20260612144700_add_receipt_story_columns.sql', 'utf8')

async function run() {
    const { error } = await supabase.rpc('run_migration', {
          migration_sql: sql,
          migration_name: '20260612144700_add_receipt_story_columns.sql',
    })
    if (error) {
        console.error('Failed using RPC:', error)
        // Try direct SQL execution if possible, but PostgREST only exposes RPCs.
        // Wait, 'run_migration' RPC exists? Let's see.
    } else {
        console.log('Success!')
    }
}
run()
