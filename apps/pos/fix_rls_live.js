const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load env
const envFile = fs.readFileSync('.env.local');
const config = dotenv.parse(envFile);

const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = config.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRlsRecursion() {
  console.log('⏳ Fixing RLS recursion...');

  const sql = `
    -- Drop the offending FOR ALL policy on house_collaborators
    DROP POLICY IF EXISTS "Owners can manage collaborators" ON public.house_collaborators;
    DROP POLICY IF EXISTS "Collaborators can read own collaborations" ON public.house_collaborators;
    DROP POLICY IF EXISTS "Anyone can read house collaborators" ON public.house_collaborators;
    DROP POLICY IF EXISTS "Owners can insert collaborators" ON public.house_collaborators;
    DROP POLICY IF EXISTS "Owners can update collaborators" ON public.house_collaborators;
    DROP POLICY IF EXISTS "Owners can delete collaborators" ON public.house_collaborators;

    -- Replace with non-recursive SELECT
    CREATE POLICY "Anyone can read house collaborators"
      ON public.house_collaborators FOR SELECT TO authenticated
      USING (true);

    -- Separate policies for INSERT, UPDATE, DELETE to avoid triggering recursion during SELECTs
    CREATE POLICY "Owners can insert collaborators"
      ON public.house_collaborators FOR INSERT TO authenticated
      WITH CHECK (
        public.is_admin_or_staff() OR 
        EXISTS (
          SELECT 1 FROM public.houses h WHERE h.id = house_id AND (h.user_id = auth.uid() OR h.customer_id = auth.uid())
        )
      );

    CREATE POLICY "Owners can update collaborators"
      ON public.house_collaborators FOR UPDATE TO authenticated
      USING (
        public.is_admin_or_staff() OR 
        EXISTS (
          SELECT 1 FROM public.houses h WHERE h.id = house_id AND (h.user_id = auth.uid() OR h.customer_id = auth.uid())
        )
      );

    CREATE POLICY "Owners can delete collaborators"
      ON public.house_collaborators FOR DELETE TO authenticated
      USING (
        public.is_admin_or_staff() OR 
        EXISTS (
          SELECT 1 FROM public.houses h WHERE h.id = house_id AND (h.user_id = auth.uid() OR h.customer_id = auth.uid())
        )
      );

    -- Let's also make sure houses uses the check_house_access function correctly, which is already set
  `;

  const { error } = await supabase.rpc('exec_sql', {
    sql_query: sql
  });

  if (error) {
    console.error('❌ Failed to fix RLS:', error);
  } else {
    console.log('✅ RLS recursion fixed!');
  }
}

fixRlsRecursion();
