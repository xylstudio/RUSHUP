const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function run() {
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: 'test_delete_me@example.com',
    password: 'password123',
    email_confirm: true
  });
  if (createError) { console.log(createError); return; }
  console.log('Created user:', newUser.user.id);
  
  // Try deleting from auth.users
  const { data: delUser, error: delError } = await supabase.auth.admin.deleteUser(newUser.user.id);
  console.log('Delete error:', delError);
  console.log('Delete success:', !!delUser);
}
run();
