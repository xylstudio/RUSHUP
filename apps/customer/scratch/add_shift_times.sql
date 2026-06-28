-- Add shift start and end times to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS shift_start TEXT DEFAULT '08:30',
ADD COLUMN IF NOT EXISTS shift_end TEXT DEFAULT '17:30';
