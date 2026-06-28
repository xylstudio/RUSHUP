-- Migration: Update house_collaborators for notifications and roles
-- Note: Please execute this in the Supabase Dashboard SQL Editor

-- 1. Add receive_notifications column
ALTER TABLE public.house_collaborators ADD COLUMN IF NOT EXISTS receive_notifications BOOLEAN NOT NULL DEFAULT true;

-- 2. Update the role constraint
-- Drop the existing role constraint. PostgreSQL automatically names it if it wasn't named.
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

-- Add the new constraint
ALTER TABLE public.house_collaborators ADD CONSTRAINT house_collaborators_role_check CHECK (role IN ('owner', 'manager', 'editor', 'viewer', 'co-owner'));

-- 3. Update RLS policies to allow users to update their own receive_notifications status
-- Currently owners can manage all. Let's make sure collaborators can update their own row.
DROP POLICY IF EXISTS "Collaborators can update own notifications" ON public.house_collaborators;
CREATE POLICY "Collaborators can update own notifications"
  ON public.house_collaborators FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

SELECT 'Migration completed successfully' as result;
