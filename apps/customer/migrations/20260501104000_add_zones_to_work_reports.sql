-- Migration: Add zones column to work_reports
-- Created At: 2026-05-01

ALTER TABLE public.work_reports ADD COLUMN IF NOT EXISTS zones jsonb DEFAULT '[]'::jsonb;

-- Update existing reports to have an empty array if null
UPDATE public.work_reports SET zones = '[]'::jsonb WHERE zones IS NULL;
