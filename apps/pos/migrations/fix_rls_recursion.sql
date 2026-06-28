
-- Migration: Fix RLS Recursion for Houses and Collaborators
-- Run this in Supabase SQL Editor

-- 1. Create a security definer function to break the recursion
CREATE OR REPLACE FUNCTION public.check_house_access(target_house_id UUID, target_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if owner or customer
    SELECT 1 FROM public.houses
    WHERE id = target_house_id
    AND (user_id = target_user_id OR customer_id = target_user_id)
    UNION
    -- Check if collaborator
    SELECT 1 FROM public.house_collaborators
    WHERE house_id = target_house_id
    AND user_id = target_user_id
  );
$$;

-- 2. Update Houses policies
DROP POLICY IF EXISTS "Users can read own houses" ON public.houses;
CREATE POLICY "Users can read own houses"
  ON public.houses
  FOR SELECT
  TO authenticated
  USING (public.check_house_access(id, auth.uid()) OR public.is_admin_or_staff());

-- 3. Update House Collaborators policies
DROP POLICY IF EXISTS "Collaborators can read own collaborations" ON public.house_collaborators;
CREATE POLICY "Collaborators can read own collaborations"
  ON public.house_collaborators FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_staff());

DROP POLICY IF EXISTS "Owners can manage collaborators" ON public.house_collaborators;
CREATE POLICY "Owners can manage collaborators"
  ON public.house_collaborators FOR ALL TO authenticated
  USING (
    public.is_admin_or_staff() OR 
    EXISTS (
      -- Use a direct check here or the helper if appropriate, 
      -- but to manage collaborators you must be the house OWNER/CUSTOMER, not just a collaborator
      SELECT 1 FROM public.houses h
      WHERE h.id = house_id 
      AND (h.user_id = auth.uid() OR h.customer_id = auth.uid())
    )
  );

-- 4. Fix potential recursion in profiles if any (just in case)
-- (Profiles policies are already using SECURITY DEFINER helper functions)

NOTIFY pgrst, 'reload schema';
