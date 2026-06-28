ALTER TABLE public.pos_menu_items
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_zh TEXT;
