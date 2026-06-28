require('dotenv').config({ path: '.env.prod.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('--- DATABASE DIAGNOSTICS ---');
  
  // 1. Check for PostGIS extension
  const { data: ext, error: extErr } = await supabase.rpc('run_sql', { 
    sql: "SELECT extname FROM pg_extension WHERE extname = 'postgis'" 
  });
  console.log('PostGIS Enabled:', ext && ext.length > 0 ? 'YES' : 'NO');
  if (extErr) {
    // Fallback if rpc is not available
    const { data: pgExt, error: pgErr } = await supabase.from('pg_extension').select('extname').eq('extname', 'postgis');
    console.log('PostGIS Enabled (Fallback):', pgExt && pgExt.length > 0 ? 'YES' : 'NO');
  }

  // 2. Check for Rider-related tables
  const { data: tables, error: tableErr } = await supabase.rpc('run_sql', { 
    sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%rider%'" 
  });
  console.log('Rider Tables found:', tables);

  // 3. Check pos_members for coords column
  const { data: cols, error: colErr } = await supabase.rpc('run_sql', { 
    sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pos_members'" 
  });
  if (cols) {
    const hasCoords = cols.some(c => c.column_name === 'coords');
    console.log('pos_members has coords column:', hasCoords ? 'YES' : 'NO');
  }
}

run();
