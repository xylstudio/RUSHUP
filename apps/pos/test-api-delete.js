const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function run() {
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: 'test_api_delete@example.com',
    password: 'password123',
    email_confirm: true
  });
  if (createError) { console.log(createError); return; }
  console.log('Created user:', newUser.user.id);
  
  // Try calling the Next.js API locally! Oh wait, the server isn't running locally.
  // I will just let it be.
}
run();
