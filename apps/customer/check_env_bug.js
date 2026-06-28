const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://cdjbzyrflzckjgxbqjqb.supabase.co \r\n";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs \r\n";

try {
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  supabaseAdmin.from('profiles').select('*').limit(1).then(res => {
    console.log("Result:", res);
  });
} catch(e) {
  console.log("Error:", e.message);
}
