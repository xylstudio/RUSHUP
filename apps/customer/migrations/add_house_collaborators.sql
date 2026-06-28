-- Migration: Create house_collaborators table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.house_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'manager', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(house_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_house_collaborators_house_id ON public.house_collaborators(house_id);
CREATE INDEX IF NOT EXISTS idx_house_collaborators_user_id ON public.house_collaborators(user_id);

ALTER TABLE public.house_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collaborators can read own collaborations" ON public.house_collaborators;
CREATE POLICY "Collaborators can read own collaborations"
  ON public.house_collaborators FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_staff());

DROP POLICY IF EXISTS "Owners can manage collaborators" ON public.house_collaborators;
CREATE POLICY "Owners can manage collaborators"
  ON public.house_collaborators FOR ALL TO authenticated
  USING (public.is_admin_or_staff() OR EXISTS (
    SELECT 1 FROM public.houses h
    WHERE h.id = house_id AND (h.user_id = auth.uid() OR h.customer_id = auth.uid())
  ))
  WITH CHECK (public.is_admin_or_staff() OR EXISTS (
    SELECT 1 FROM public.houses h
    WHERE h.id = house_id AND (h.user_id = auth.uid() OR h.customer_id = auth.uid())
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.house_collaborators TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'house_collaborators table created successfully' AS message;
