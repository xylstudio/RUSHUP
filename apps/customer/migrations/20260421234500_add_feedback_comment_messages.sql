ALTER TABLE IF EXISTS public.customer_order_feedback
  ADD COLUMN IF NOT EXISTS comment_message text;

ALTER TABLE IF EXISTS public.work_report_feedback
  ADD COLUMN IF NOT EXISTS comment_message text;