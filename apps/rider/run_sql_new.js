const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Environment variables missing.');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const sqlFile = process.argv[2];
    if (!sqlFile) {
        console.error('❌ Please provide a SQL file path.');
        process.exit(1);
    }

    const sql = fs.readFileSync(path.join(__dirname, sqlFile), 'utf8');
    const migrationName = path.basename(sqlFile);

    console.log('🚀 Executing ' + sqlFile + ' via run_migration RPC...');
    
    const { data, error } = await supabase.rpc('run_migration', {
        migration_sql: sql,
        migration_name: migrationName
    });

    if (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    } else {
        console.log('✅ Success!', data);
    }
}
run();
