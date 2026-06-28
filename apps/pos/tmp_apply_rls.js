require('dotenv').config({ path: '.env.prod.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('Applying RLS Policies to Live DB...');
  
  const sql = `
    -- Enable RLS and add public SELECT policies
    ALTER TABLE public.pos_menu_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public read on pos_menu_items" ON public.pos_menu_items;
    CREATE POLICY "Allow public read on pos_menu_items" ON public.pos_menu_items FOR SELECT USING (true);

    ALTER TABLE public.pos_menu_categories ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public read on pos_menu_categories" ON public.pos_menu_categories;
    CREATE POLICY "Allow public read on pos_menu_categories" ON public.pos_menu_categories FOR SELECT USING (true);

    ALTER TABLE public.pos_banners ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public read on pos_banners" ON public.pos_banners;
    CREATE POLICY "Allow public read on pos_banners" ON public.pos_banners FOR SELECT USING (true);
    
    -- Ensure pos_members is also readable for own data (simplified for now to ensure it works)
    ALTER TABLE public.pos_members ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public access to members" ON public.pos_members;
    CREATE POLICY "Allow public access to members" ON public.pos_members FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow public insert to members" ON public.pos_members;
    CREATE POLICY "Allow public insert to members" ON public.pos_members FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Allow public update to members" ON public.pos_members;
    CREATE POLICY "Allow public update to members" ON public.pos_members FOR UPDATE USING (true);
  `;

  try {
    const { error } = await supabase.rpc('run_sql', { sql });
    if (error) {
        console.error('RPC run_sql failed. You might need to run this SQL manually in the Supabase Dashboard SQL Editor.');
        console.error('Error:', error.message);
        process.exit(1);
    }
    console.log('✅ RLS Policies Applied Successfully');
  } catch (e) {
    console.error('Failed to apply RLS:', e.message);
    process.exit(1);
  }
}

run();
