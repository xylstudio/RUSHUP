const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const token = '917ffb66-7ccf-4de8-9ee8-a09b0c68f54e';
  const houseId = '24cee20d-3af5-4590-9a1a-8373637f9ac6';
  const userId = '16ca5962-62a6-42e5-969d-1942b42467a8'; // mock user
  
  const { data: invite } = await supabase
      .from('house_invites')
      .select('*')
      .eq('id', token)
      .eq('house_id', houseId)
      .maybeSingle();
      
  console.log("Found invite:", invite);

  const roleToInsert = (invite && invite.role) ? invite.role : 'viewer';
  console.log("Role to insert:", roleToInsert);
  
  const { data, error } = await supabase
        .from('house_collaborators')
        .insert({
          house_id: houseId,
          user_id: userId,
          role: roleToInsert
        }).select().single();
        
  console.log("Collaborator inserted:", data, error);
}
run();
