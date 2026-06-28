const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('Key:', supabaseKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🔄 Running measurement_requests table migration...');
    
    // Read the SQL file
    const sql = fs.readFileSync('./create-measurement-requests-table.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try alternative approach - execute step by step
      console.log('🔄 Trying alternative approach...');
      
      const statements = sql.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log('Executing:', statement.trim().substring(0, 50) + '...');
          const { error: stmtError } = await supabase.rpc('exec_sql', { 
            sql_query: statement.trim() + ';' 
          });
          
          if (stmtError) {
            console.error('Statement error:', stmtError);
          }
        }
      }
    } else {
      console.log('✅ Migration completed successfully!');
    }
    
    // Test if table exists
    const { data: tables, error: tableError } = await supabase
      .from('measurement_requests')
      .select('*')
      .limit(1);
      
    if (tableError) {
      console.error('❌ Table verification failed:', tableError);
    } else {
      console.log('✅ Table measurement_requests is accessible');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

runMigration();
