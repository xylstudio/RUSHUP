const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.prod.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: addrs, error } = await supabase.from('saved_addresses').select('id, full_address, latitude, longitude').limit(10);
    if (error) {
        console.error(error);
    } else {
        console.log(JSON.stringify(addrs, null, 2));
    }
}

check();
