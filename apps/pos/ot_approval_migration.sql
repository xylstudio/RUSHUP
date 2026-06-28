-- 1. Add OT approval columns to attendance_logs
ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS ot_status TEXT DEFAULT 'pending' CHECK (ot_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS ot_approved_minutes INTEGER DEFAULT 0;

-- 2. Create salary_adjustments table for manual deductions (e.g. unpaid leaves for monthly staff)
CREATE TABLE IF NOT EXISTS public.salary_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- e.g. '2026-06'
  amount NUMERIC NOT NULL, -- positive for bonuses, negative for deductions
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for salary_adjustments
ALTER TABLE public.salary_adjustments ENABLE ROW LEVEL SECURITY;

-- Allow only admins to manage salary adjustments
DROP POLICY IF EXISTS "Allow admins to manage salary adjustments" ON public.salary_adjustments;
CREATE POLICY "Allow admins to manage salary adjustments" ON public.salary_adjustments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Allow staff to view their own adjustments
DROP POLICY IF EXISTS "Allow staff to read own salary adjustments" ON public.salary_adjustments;
CREATE POLICY "Allow staff to read own salary adjustments" ON public.salary_adjustments
  FOR SELECT USING (auth.uid() = profile_id);
