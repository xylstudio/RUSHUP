ALTER TABLE public.pos_orders
  ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_pos_orders_delivery_coordinates
  ON public.pos_orders (delivery_latitude, delivery_longitude);