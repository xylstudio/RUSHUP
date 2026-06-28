CREATE TABLE IF NOT EXISTS public.work_report_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  order_id uuid NOT NULL,
  job_assignment_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('rating', 'issue')),
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  comment_message text,
  issue_message text,
  source text NOT NULL DEFAULT 'web',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_report_feedback_report_id_fkey') THEN
    ALTER TABLE public.work_report_feedback
      ADD CONSTRAINT work_report_feedback_report_id_fkey
      FOREIGN KEY (report_id) REFERENCES public.work_reports(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_report_feedback_order_id_fkey') THEN
    ALTER TABLE public.work_report_feedback
      ADD CONSTRAINT work_report_feedback_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_report_feedback_job_assignment_id_fkey') THEN
    ALTER TABLE public.work_report_feedback
      ADD CONSTRAINT work_report_feedback_job_assignment_id_fkey
      FOREIGN KEY (job_assignment_id) REFERENCES public.job_assignments(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_report_feedback_staff_id_fkey') THEN
    ALTER TABLE public.work_report_feedback
      ADD CONSTRAINT work_report_feedback_staff_id_fkey
      FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_report_feedback_customer_id_fkey') THEN
    ALTER TABLE public.work_report_feedback
      ADD CONSTRAINT work_report_feedback_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_report_feedback_report_created ON public.work_report_feedback(report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_report_feedback_order_created ON public.work_report_feedback(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_report_feedback_staff_created ON public.work_report_feedback(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_report_feedback_customer_created ON public.work_report_feedback(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_report_feedback_type_status ON public.work_report_feedback(feedback_type, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_report_feedback_unique_rating_once ON public.work_report_feedback(report_id, customer_id, feedback_type) WHERE feedback_type = 'rating';

CREATE OR REPLACE FUNCTION public.update_work_report_feedback_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_work_report_feedback_updated_at_trigger ON public.work_report_feedback;
CREATE TRIGGER update_work_report_feedback_updated_at_trigger
  BEFORE UPDATE ON public.work_report_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_work_report_feedback_updated_at();

ALTER TABLE public.work_report_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can read own work report feedback" ON public.work_report_feedback;
DROP POLICY IF EXISTS "Customers can insert own work report feedback" ON public.work_report_feedback;
DROP POLICY IF EXISTS "Admins can read all work report feedback" ON public.work_report_feedback;
DROP POLICY IF EXISTS "Admins can update all work report feedback" ON public.work_report_feedback;
DROP POLICY IF EXISTS "Staff can read assigned work report feedback" ON public.work_report_feedback;

CREATE POLICY "Customers can read own work report feedback"
  ON public.work_report_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own work report feedback"
  ON public.work_report_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can read all work report feedback"
  ON public.work_report_feedback
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update all work report feedback"
  ON public.work_report_feedback
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Staff can read assigned work report feedback"
  ON public.work_report_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.work_reports
      WHERE work_reports.id = work_report_feedback.report_id
        AND work_reports.staff_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON TABLE public.work_report_feedback TO authenticated;
