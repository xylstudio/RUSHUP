-- Add reason column to attendance_logs
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS reason text;

-- Add comment to the column
COMMENT ON COLUMN public.attendance_logs.reason IS 'Reason for early clock out or other notes';
