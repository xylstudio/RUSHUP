import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env
const envLocal = readFileSync('.env.local', 'utf8');
const envVars = {};
envLocal.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
        const [key, ...val] = line.split('=');
        if (key) envVars[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
    }
});

const supabase = createClient(envVars['NEXT_PUBLIC_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY']);

async function run() {
    console.log("Adding columns to pos_orders...");
    
    // Add columns to pos_orders
    const query1 = `ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS platform_gp_fee NUMERIC DEFAULT 0;`;
    const { error: e1 } = await supabase.rpc('exec_sql', { sql: query1 });
    if (e1) {
        console.error("Method 1 failed, trying fallback...", e1);
        // Sometimes exec_sql is not defined. We might need another way or just output SQL
    } else {
        console.log("Success adding platform_gp_fee");
    }

    const query2 = `ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS platform_gp_rate NUMERIC DEFAULT 0;`;
    const { error: e2 } = await supabase.rpc('exec_sql', { sql: query2 });
    if (!e2) console.log("Success adding platform_gp_rate");

    // Add GP settings column to pos_shop_settings or pos_branches?
    console.log("Adding gp_rates to pos_branches...");
    const query3 = `ALTER TABLE pos_branches ADD COLUMN IF NOT EXISTS platform_gp_rates JSONB DEFAULT '{"grab": 32.1, "lineman": 32.1, "shopee": 32.1, "foodpanda": 32.1, "robinhood": 0}'::jsonb;`;
    const { error: e3 } = await supabase.rpc('exec_sql', { sql: query3 });
    if (!e3) console.log("Success adding platform_gp_rates to branches");

    console.log("Done");
}

run();
