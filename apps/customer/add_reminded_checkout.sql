ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS reminded_checkout BOOLEAN DEFAULT false;
