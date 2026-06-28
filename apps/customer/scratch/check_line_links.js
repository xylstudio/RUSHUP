const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Check line_users table
  const { data: lineUsers, error: luErr } = await supabase
    .from('line_users')
    .select('*')
    .limit(20);

  if (luErr) {
    console.log('line_users table error:', luErr.message);
  } else {
    console.log(`line_users table rows: ${lineUsers.length}`);
    lineUsers.forEach(u => console.log(' -', JSON.stringify(u)));
  }

  // Check auth user metadata for line_user_id
  const { data: customers } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .eq('role', 'customer')
    .limit(10);

  console.log('\nChecking auth metadata for each customer:');
  for (const c of (customers || [])) {
    const { data: authData } = await supabase.auth.admin.getUserById(c.id);
    const metadata = authData?.user?.user_metadata || {};
    const appMeta = authData?.user?.app_metadata || {};
    const identities = authData?.user?.identities || [];
    const hasLineId = !!(metadata.line_user_id || metadata.lineUserId || appMeta.line_user_id);
    const hasLineIdentity = identities.some(i => i.provider === 'line');
    const email = authData?.user?.email || '';
    const hasLineEmail = email.endsWith('@line.xylemlandscape.com');
    
    const status = (hasLineId || hasLineIdentity || hasLineEmail) ? '✅ HAS LINE ID' : '❌ NO LINE ID';
    console.log(`  ${status} | ${c.display_name || c.email}`);
    if (hasLineId) console.log('    → metadata.line_user_id:', metadata.line_user_id || metadata.lineUserId);
  }
}

main();
