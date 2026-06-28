const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres' // This is wrong, I need the actual Supabase URL.
);
