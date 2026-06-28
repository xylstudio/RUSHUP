const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const supabaseUrl = 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const sql = fs.readFileSync(path.join(__dirname, 'refactor_members.sql'), 'utf8');

    console.log('🚀 Executing refactor_members.sql via exec_sql RPC...');
    
    const { error } = await supabase.rpc('exec_sql', {
        sql_query: sql
    });

    if (error) {
        console.error('❌ Refactor failed:', error);
        process.exit(1);
    } else {
        console.log('✅ Refactor applied successfully!');
    }
}

run();
