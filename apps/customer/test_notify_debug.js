const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Get the latest order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, customer_id, order_code, service_id, house_id, houses(name)')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (orderError) {
    console.error('Order error:', orderError);
    return;
  }
  
  console.log('Order house_id:', order.house_id);
  console.log('Order customer_id:', order.customer_id);
  console.log('Order houses:', order.houses);

  // Check collaborators for this house
  const { data: collaborators, error: colError } = await supabaseAdmin
    .from('house_collaborators')
    .select('user_id, role')
    .eq('house_id', order.house_id);

  console.log('\nCollaborators:', collaborators, colError);
  
  // For each collaborator, check their LINE link
  for (const c of (collaborators || [])) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(c.user_id);
    const metadata = authUser?.user?.user_metadata || {};
    const appMetadata = authUser?.user?.app_metadata || {};
    const identities = authUser?.user?.identities || [];
    
    const lineFromMeta = metadata.line_user_id || metadata.lineUserId;
    const lineFromApp = appMetadata.line_user_id;
    const lineFromIdentity = identities.find(i => i.provider === 'line')?.identity_data?.sub;
    
    // Check line_users table
    const { data: lineUser } = await supabaseAdmin.from('line_users').select('line_user_id').eq('user_id', c.user_id).maybeSingle();
    
    console.log(`\nCollaborator ${c.user_id} (${c.role}):`);
    console.log('  line_user_id from meta:', lineFromMeta);
    console.log('  line_user_id from app_meta:', lineFromApp);
    console.log('  line_user_id from identity:', lineFromIdentity);
    console.log('  line_users table:', lineUser?.line_user_id);
    console.log('  email:', authUser?.user?.email);
  }
}
run();
