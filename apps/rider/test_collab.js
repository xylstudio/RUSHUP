const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Fetching a house with collaborators...");
  const { data: cols, error } = await supabaseAdmin.from('house_collaborators').select('house_id, user_id, profiles(display_name, email)');
  if (error) console.error("Error fetching cols:", error);
  console.log("Total collaborators:", cols?.length);
  
  if (cols && cols.length > 0) {
    const col = cols[0];
    console.log("Sample collab:", col);
    const houseId = col.house_id;
    
    // Check line linking
    const { data: userLine } = await supabaseAdmin.from('user_line_mapping').select('*').eq('user_id', col.user_id);
    console.log("Collab line linking:", userLine);
    
    // Test the logic I used
    const targetUserIds = new Set();
    const { data: collaborators } = await supabaseAdmin
          .from('house_collaborators')
          .select('user_id')
          .eq('house_id', houseId);
    
    console.log("Collaborators for house", houseId, ":", collaborators);
  } else {
    console.log("No house collaborators found in DB?!");
  }
}
run();
