require('dotenv').config({ path: '.env.prod.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    const sql = fs.readFileSync('schema-all-in-one.sql', 'utf8');
    console.log('🚀 Attempting to apply migration via run_migration RPC...');
    
    const { error } = await supabase.rpc('run_migration', {
        migration_sql: sql,
        migration_name: 'schema-all-in-one.sql'
    });

    if (error) {
        console.error('❌ Migration failed:', error);
        
        console.log('🔄 Trying fallback: exec_sql...');
        const { error: error2 } = await supabase.rpc('exec_sql', {
            sql_query: sql
        });
        
        if (error2) {
            console.error('❌ Fallback failed:', error2);
        } else {
            console.log('✅ Fallback success!');
        }
    } else {
        console.log('✅ Migration success!');
    }
}

run();
