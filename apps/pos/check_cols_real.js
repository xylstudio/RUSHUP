const { createClient } = require('@supabase/supabase-js');
async function run() {
    const supabaseUrl = 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs';
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('pos_menu_items').select('*').limit(1);
    if (data && data[0]) {
        console.log('Columns in pos_menu_items:', Object.keys(data[0]));
    }
}
run();
