-- Enable pg_cron and pg_net extensions in Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;

-- Safely unschedule any existing remind-attendance-cron job to prevent duplicate task registrations
SELECT cron.unschedule('remind-attendance-cron');

-- Schedule the job to run every 15 minutes.
-- It triggers our Vercel remind-attendance API using pg_net HTTP GET.
SELECT cron.schedule(
  'remind-attendance-cron',
  '*/15 * * * *',
  $$
  SELECT net.http_get(
    'https://xylem-landscape.vercel.app/api/line/remind-attendance?secret=xyl-attendance-cron-secret'
  );
  $$
);
