ALTER TABLE public.pos_menu_items ADD COLUMN IF NOT EXISTS platform_prices JSONB DEFAULT '{}';
