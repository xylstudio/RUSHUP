const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const supabaseUrl = 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const sqlFile = process.argv[2] || 'refactor_members.sql';
    const sql = fs.readFileSync(path.join(__dirname, sqlFile), 'utf8');

    console.log('🚀 Executing migration via exec_sql RPC...');
    
    // Split the SQL into individual statements if necessary, 
    // but usually exec_sql can handle multiple statements if they are separated by semicolons.
    const { error } = await supabase.rpc('exec_sql', {
        sql_query: sql
    });

    if (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } else {
        console.log('✅ Migration applied successfully!');
    }
}

run();
