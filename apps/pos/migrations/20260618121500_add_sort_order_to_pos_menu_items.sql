ALTER TABLE public.pos_menu_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

WITH ranked_items AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY branch_id, category_id
      ORDER BY created_at ASC, name ASC, id ASC
    ) - 1 AS next_sort_order
  FROM public.pos_menu_items
)
UPDATE public.pos_menu_items AS items
SET sort_order = ranked_items.next_sort_order
FROM ranked_items
WHERE items.id = ranked_items.id
  AND items.sort_order IS NULL;

ALTER TABLE public.pos_menu_items
  ALTER COLUMN sort_order SET DEFAULT 0;

UPDATE public.pos_menu_items
SET sort_order = 0
WHERE sort_order IS NULL;

CREATE INDEX IF NOT EXISTS idx_pos_menu_items_branch_category_sort
  ON public.pos_menu_items (branch_id, category_id, sort_order, created_at);
