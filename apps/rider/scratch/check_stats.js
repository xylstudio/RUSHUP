const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const start = new Date();
  start.setHours(0,0,0,0);
  const end = new Date();
  end.setHours(24,0,0,0);
  const { data } = await supabase.from('pos_orders')
    .select('id, status, net_total, total_amount, payment_method, discount_amount, paid_at, branch_id, pos_order_payments(amount, payment_method)')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());
  console.log(JSON.stringify(data, null, 2));
}
check();
