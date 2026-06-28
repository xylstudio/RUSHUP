const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('work_reports')
    .select(`
      id,
      orders!fk_work_reports_order_id(id)
    `)
    .limit(1);
  console.log("Error:", error);
}
run();
