const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// 🛡️ Load Environment Variables
let config = {};
if (fs.existsSync('.env.prod.local')) {
  const envFile = fs.readFileSync('.env.prod.local');
  config = dotenv.parse(envFile);
} else if (fs.existsSync('.env')) {
  const envFile = fs.readFileSync('.env');
  config = dotenv.parse(envFile);
}

const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = config.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Could not find NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
  console.log(`🔍 Diagnosing data for: ${supabaseUrl}`);

  // 1. Check notifications
  const { data: notifications } = await supabase.from('notifications').select('id, title, message, related_order_id, user_id');
  console.log(`\n--- Notifications (${notifications?.length || 0}) ---`);
  for (const n of (notifications || [])) {
    let orderStatus = 'N/A';
    if (n.related_order_id) {
        const { data: order } = await supabase.from('orders').select('id, status').eq('id', n.related_order_id).maybeSingle();
        orderStatus = order ? `Valid (${order.status})` : 'ORPHAN';
    }
    console.log(`ID: ${n.id} | Title: ${n.title} | Order: ${n.related_order_id} (${orderStatus}) | User: ${n.user_id}`);
  }

  // 2. Check work_reports
  const { data: reports } = await supabase.from('work_reports').select('id, work_done, order_id, customer_id');
  console.log(`\n--- Work Reports (${reports?.length || 0}) ---`);
  for (const r of (reports || [])) {
    let orderStatus = 'N/A';
    if (r.order_id) {
        const { data: order } = await supabase.from('orders').select('id, status').eq('id', r.order_id).maybeSingle();
        orderStatus = order ? `Valid (${order.status})` : 'ORPHAN';
    }
    console.log(`ID: ${r.id} | Work: ${r.work_done?.substring(0, 20)}... | Order: ${r.order_id} (${orderStatus}) | Customer: ${r.customer_id}`);
  }

  // 3. Check orders
  const { data: orders } = await supabase.from('orders').select('id, order_code, status, customer_id');
  console.log(`\n--- Orders (${orders?.length || 0}) ---`);
  for (const o of (orders || [])) {
    console.log(`ID: ${o.id} | Code: ${o.order_code} | Status: ${o.status} | Customer: ${o.customer_id}`);
  }
}

diagnose();
