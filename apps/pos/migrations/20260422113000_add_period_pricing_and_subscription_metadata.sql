alter table public.price_templates
  add column if not exists pricing_period text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'price_templates_pricing_period_check'
  ) THEN
    ALTER TABLE public.price_templates
      ADD CONSTRAINT price_templates_pricing_period_check
      CHECK (pricing_period IS NULL OR pricing_period IN ('one-time', 'monthly', 'yearly'));
  END IF;
END $$;