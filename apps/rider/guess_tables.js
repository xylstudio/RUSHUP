const { createClient } = require('@supabase/supabase-js');
async function run() {
    const supabaseUrl = 'https://cdjbzyrflzckjgxbqjqb.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Direct SQL check through an alternative if possible? No.
    // Try joining different possible table names
    const tables = ['pos_menu_item_modifiers', 'pos_item_modifiers', 'modifiers', 'modifier_links', 'item_modifiers'];
    for (const t of tables) {
        const { error } = await supabase.from('pos_menu_items').select('id, ' + t + '(group_id)').limit(1);
        if (!error) {
            console.log('✅ Found mapping table:', t);
        } else {
            console.log('❌ ' + t + ' failed:', error.message);
        }
    }
}
run();
