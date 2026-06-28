-- Add wage and attendance related fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_wage NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_rate_per_hour NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_working_days INTEGER DEFAULT 26,
ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'daily' CHECK (salary_type IN ('daily', 'monthly'));

-- Ensure staff_type exists as it's used in the logic
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS staff_type TEXT CHECK (staff_type IN ('cafe', 'garden'));
