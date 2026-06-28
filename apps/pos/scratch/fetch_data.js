
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: menu, error: menuErr } = await supabase.from('pos_menu_items').select('id, name');
    const { data: inv, error: invErr } = await supabase.from('inventory_items').select('id, name');
    
    if (menuErr) console.error('Menu Error:', menuErr);
    if (invErr) console.error('Inv Error:', invErr);
    
    console.log(JSON.stringify({ menu, inv }, null, 2));
}

run();
