const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const houseId = "68fe4bfb-b8bc-4673-8a0f-622dc3c3c13f"; // Need a valid house ID
  const { data: house } = await supabase.from('houses').select('id, user_id').limit(1).single();
  if (!house) return console.log("No house found");
  
  const { data, error } = await supabase
      .from('house_invites')
      .insert({
        house_id: house.id,
        created_by: house.user_id,
        role: 'editor'
      })
      .select('*')
      .single();
      
  console.log("Insert result:", data, error);
}
run();
