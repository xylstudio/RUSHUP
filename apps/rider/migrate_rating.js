const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

if (fs.existsSync('.env.local')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

// Fallback to the one found in the codebase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log(`Starting DB migration on ${supabaseUrl}...`);
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
            ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS rating smallint CHECK (rating BETWEEN 1 AND 5);
            ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS rating_comment text;
        `
    });

    if (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }

    console.log('Migration successful!');
}

migrate();
