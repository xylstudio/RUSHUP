const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.prod.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
    console.log("Syncing Chiang Mai coordinates...");
    const { data, error } = await supabase
        .from('pos_shop_settings')
        .update({ 
            latitude: 18.7810149, 
            longitude: 99.0927032 
        })
        .eq('branch_id', '1f3fc496-d89e-4323-a66e-4fcd555444e9');
    
    if (error) {
        console.error("Update error:", error);
    } else {
        console.log("Successfully updated pos_shop_settings to Chiang Mai coordinates.");
    }
}

fix();
