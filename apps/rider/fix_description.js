const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fix() {
    console.log("Fixing points history table: adding description column...");
    const { data, error } = await supabase.rpc('run_migration', {
        migration_sql: "ALTER TABLE public.pos_points_history ADD COLUMN IF NOT EXISTS description TEXT;",
        migration_name: "fix_missing_description_column_v3"
    });
    if (error) {
        console.error("Error executing RPC:", error);
    } else {
        console.log("Success:", data);
    }
}
fix();
