const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://cdjbzyrflzckjgxbqjqb.supabase.co \r\n";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs \r\n";

async function run() {
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  const targetId = '65ef7d07-8d90-4c0c-97a0-1ba119aa9be4';
  const { data: orders, error } = await supabaseAdmin.from('orders').select('*, services(service_name)').eq('customer_id', targetId).order('created_at', { ascending: false });
  console.log("Orders:", orders);
  console.log("Error:", error);
}
run();
