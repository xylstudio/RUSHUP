const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const houseId = 'd5bff015-5124-4811-94c7-abec606e5319'; // The house from the previous tests
  const orderId = '58403cca-523a-4680-a0d5-1679c7846e7d'; // The order from previous tests
  
  // Get order
  const { data: order } = await supabaseAdmin.from('orders').select('customer_id, house_id').eq('id', orderId).single();
  console.log('Order:', order);
  
  // Get collaborators
  const { data: collaborators } = await supabaseAdmin.from('house_collaborators').select('user_id').eq('house_id', order.house_id);
  console.log('Collaborators:', collaborators);
  
  const targetUserIds = Array.from(new Set([order.customer_id, ...(collaborators || []).map(c => c.user_id)].filter(Boolean)));
  console.log('Target User IDs:', targetUserIds);
  
  for (const userId of targetUserIds) {
    // Check line linking
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    console.log(`User ${userId} Auth Error:`, authError);
    if (authUser?.user) {
      const metadata = authUser.user.user_metadata || {};
      const identities = authUser.user.identities || [];
      const lineIdentity = identities.find(i => String(i.provider).toLowerCase() === 'line');
      console.log(`User ${userId} LINE linked:`, lineIdentity ? 'YES' : 'NO');
      
      // Fallback
      const { data: dbEntry } = await supabaseAdmin.from('line_users').select('line_user_id').eq('user_id', userId).maybeSingle();
      console.log(`User ${userId} LINE DB Entry:`, dbEntry?.line_user_id || 'NONE');
    }
  }
}
run();
