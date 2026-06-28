const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=["']?(https?:\/\/[^\s"']+)["']?/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=["']?([^\s"']+)["']?/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: tables } = await supabase.from('pos_tables').select('*');
  console.log('Tables:', tables);
  const { data: members } = await supabase.from('pos_members').select('*');
  console.log('Members:', members ? members.length : 0);
}
run();
