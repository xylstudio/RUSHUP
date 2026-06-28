const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
ALTER TABLE public.house_collaborators ADD COLUMN IF NOT EXISTS receive_notifications BOOLEAN NOT NULL DEFAULT true;

-- Update the role constraint to allow manager, editor, viewer
-- First drop the old constraints (we don't know the exact name, so we'll query for them if needed, but wait, PostgreSQL requires constraint name to drop it)
-- An alternative is to just drop and recreate if there are no dependencies, but house_collaborators has data.

DO $$ 
DECLARE 
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.house_collaborators'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%';
    
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.house_collaborators DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE public.house_collaborators ADD CONSTRAINT house_collaborators_role_check CHECK (role IN ('owner', 'manager', 'editor', 'viewer', 'co-owner'));

`;

async function run() {
  const { data, error } = await supabase.rpc('run_sql', { sql_query: sql });
  if (error) {
    console.error("Migration failed:", error);
  } else {
    console.log("Migration succeeded:", data);
  }
}
run();
