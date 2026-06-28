const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const currentOrderId = '58403cca-523a-4680-a0d5-1679c7846e7d';
  
  const { data: freshOrder, error } = await supabaseAdmin.from('orders').select('*').eq('id', currentOrderId).single();
  if (error) { console.error('Fetch error:', error); return; }
  
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const followUpOrderCodeValue = `ORD${timestamp}${random}`;
  
  console.log("Attempting insert...");
  const res = await supabaseAdmin.from('orders').insert({
          customer_id: freshOrder.customer_id,
          house_id: freshOrder.house_id,
          service_id: freshOrder.service_id,
          order_code: followUpOrderCodeValue,
          service_area: freshOrder.service_area || 0,
          base_price: freshOrder.base_price || 0,
          calculated_price: freshOrder.calculated_price || 0,
          additional_services_price: freshOrder.additional_services_price || 0,
          total: freshOrder.total || freshOrder.total_price || 0,
          total_price: freshOrder.total_price || freshOrder.total || 0,
          pricing_period: freshOrder.pricing_period,
          notes: 'Test note',
          special_instructions: 'test',
          priority: 'normal',
          status: 'confirmed',
          scheduled_date: '2026-06-30',
          total_sessions: freshOrder.total_sessions || null,
          completed_sessions: freshOrder.completed_sessions + 1,
        });
        
  console.log('Insert response:', res);
}
run();
