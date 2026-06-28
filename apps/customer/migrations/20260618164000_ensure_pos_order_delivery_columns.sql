ALTER TABLE public.pos_orders
  ADD COLUMN IF NOT EXISTS delivery_platform TEXT,
  ADD COLUMN IF NOT EXISTS delivery_gp_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference_name TEXT;

CREATE INDEX IF NOT EXISTS idx_pos_orders_delivery_platform
  ON public.pos_orders (delivery_platform);

CREATE INDEX IF NOT EXISTS idx_pos_orders_reference_name
  ON public.pos_orders (reference_name);
