
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load Environment Variables
let config = {};
if (fs.existsSync('.env.local')) {
  const envFile = fs.readFileSync('.env.local');
  config = dotenv.parse(envFile);
} else if (fs.existsSync('.env')) {
  const envFile = fs.readFileSync('.env');
  config = dotenv.parse(envFile);
}

const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = config.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Could not find NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFixes() {
  console.log(`🔄 Target Database: ${supabaseUrl}`);
  
  const sql = `
    -- 1. Fix RLS Recursion by ensuring functions are SECURITY DEFINER
    CREATE OR REPLACE FUNCTION public.current_user_role()
    RETURNS text
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT p.role::text
      FROM public.profiles p
      WHERE p.id = auth.uid()
      LIMIT 1;
    $$;

    CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT COALESCE(public.current_user_role() IN ('admin', 'staff'), false);
    $$;

    CREATE OR REPLACE FUNCTION public.is_admin()
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT COALESCE(public.current_user_role() = 'admin', false);
    $$;

    -- 2. Clean up orphaned records (Ghost Data)
    -- Delete reports that belong to non-existent orders
    DELETE FROM public.work_reports 
    WHERE order_id IS NOT NULL 
    AND order_id NOT IN (SELECT id FROM public.orders);

    -- Delete notifications that belong to non-existent orders
    DELETE FROM public.notifications 
    WHERE related_order_id IS NOT NULL 
    AND related_order_id NOT IN (SELECT id FROM public.orders);

    -- 3. Ensure ON DELETE CASCADE constraints are in place
    DO $$
    BEGIN
      -- work_reports -> orders
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_reports_order_id_fkey') THEN
        ALTER TABLE public.work_reports DROP CONSTRAINT work_reports_order_id_fkey;
      END IF;
      ALTER TABLE public.work_reports
        ADD CONSTRAINT work_reports_order_id_fkey
        FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

      -- notifications -> orders
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_related_order_id_fkey') THEN
        ALTER TABLE public.notifications DROP CONSTRAINT notifications_related_order_id_fkey;
      END IF;
      ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_related_order_id_fkey
        FOREIGN KEY (related_order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
        
      -- notifications -> measurement_requests
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_related_measurement_id_fkey') THEN
        ALTER TABLE public.notifications DROP CONSTRAINT notifications_related_measurement_id_fkey;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'measurement_requests') THEN
        ALTER TABLE public.notifications
          ADD CONSTRAINT notifications_related_measurement_id_fkey
          FOREIGN KEY (related_measurement_id) REFERENCES public.measurement_requests(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `;

  const rpcCandidates = [
    { name: 'run_sql', param: 'sql' },
    { name: 'run_migration', param: 'migration_sql' },
    { name: 'exec_sql', param: 'sql_query' },
    { name: 'execute_sql', param: 'sql_query' }
  ];

  for (const candidate of rpcCandidates) {
    console.log(`⏳ Trying ${candidate.name}...`);
    const payload = {};
    payload[candidate.param] = sql;
    if (candidate.name === 'run_migration') {
      payload.migration_name = 'fix_ghost_logs_hotfix';
    }

    try {
      const { data, error } = await supabase.rpc(candidate.name, payload);

      if (!error) {
        console.log(`✅ Success via ${candidate.name}!`);
        process.exit(0);
      } else {
        console.log(`❌ ${candidate.name} failed:`, error.message);
      }
    } catch (e) {
      console.log(`❌ ${candidate.name} threw error:`, e.message);
    }
  }

  console.error('🚫 All SQL execution methods failed. Please run the SQL manually in Supabase SQL Editor.');
  process.exit(1);
}

applyFixes();
