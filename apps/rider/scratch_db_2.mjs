import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: users } = await supabase.from('profiles').select('*');
  console.log('Profiles:', users.map(u => ({ id: u.id, name: u.display_name, email: u.email })));
  const { data: houses } = await supabase.from('houses').select('id, name, user_id, customer_id');
  console.log('Houses:', houses);
}
run();
