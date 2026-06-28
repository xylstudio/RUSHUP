BEGIN;

-- Ensure canonical recipe_data columns exist before migrating legacy recipe rows.
ALTER TABLE public.pos_menu_items
  ADD COLUMN IF NOT EXISTS recipe_data JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.pos_menu_modifiers
  ADD COLUMN IF NOT EXISTS recipe_data JSONB DEFAULT '[]'::jsonb;

-- Migrate legacy jobs rows into job_assignments if they have not already been represented.
INSERT INTO public.job_assignments (
  order_id,
  staff_id,
  assigned_date,
  status,
  notes,
  assigned_at,
  started_at,
  completed_at,
  created_at,
  updated_at
)
SELECT
  legacy.order_id,
  legacy.staff_id,
  COALESCE(legacy.completed_at::date, legacy.created_at::date, CURRENT_DATE),
  CASE legacy.status
    WHEN 'pending' THEN 'assigned'
    WHEN 'active' THEN 'in_progress'
    WHEN 'completed' THEN 'completed'
    WHEN 'cancelled' THEN 'declined'
    ELSE 'assigned'
  END,
  'Migrated from legacy jobs table',
  COALESCE(legacy.created_at, NOW()),
  CASE WHEN legacy.status IN ('active', 'completed') THEN COALESCE(legacy.created_at, NOW()) ELSE NULL END,
  legacy.completed_at,
  COALESCE(legacy.created_at, NOW()),
  COALESCE(legacy.completed_at, legacy.created_at, NOW())
FROM public.jobs AS legacy
WHERE NOT EXISTS (
  SELECT 1
  FROM public.job_assignments AS current_assignments
  WHERE current_assignments.order_id IS NOT DISTINCT FROM legacy.order_id
    AND current_assignments.staff_id IS NOT DISTINCT FROM legacy.staff_id
    AND current_assignments.created_at = legacy.created_at
);

-- Migrate legacy POS customers into pos_members and remap orders.
CREATE TEMP TABLE legacy_pos_customer_map (
  old_id UUID PRIMARY KEY,
  new_id UUID NOT NULL
) ON COMMIT DROP;

INSERT INTO legacy_pos_customer_map (old_id, new_id)
SELECT legacy.id, canonical.id
FROM public.pos_customers AS legacy
JOIN public.pos_members AS canonical
  ON (legacy.line_user_id IS NOT NULL AND canonical.line_user_id = legacy.line_user_id)
  OR (legacy.phone IS NOT NULL AND canonical.phone = legacy.phone);

UPDATE public.pos_members AS canonical
SET
  points = GREATEST(COALESCE(canonical.points, 0), COALESCE(legacy.points, 0)),
  total_spent = GREATEST(COALESCE(canonical.total_spent, 0), COALESCE(legacy.total_spent, 0)),
  full_name = COALESCE(canonical.full_name, legacy.name),
  display_name = COALESCE(canonical.display_name, legacy.name),
  phone = COALESCE(canonical.phone, legacy.phone),
  member_tier = COALESCE(NULLIF(canonical.member_tier, ''), NULLIF(legacy.tier, ''), canonical.member_tier),
  updated_at = NOW()
FROM public.pos_customers AS legacy
WHERE canonical.id IN (
  SELECT new_id FROM legacy_pos_customer_map WHERE old_id = legacy.id
);

DO $$
DECLARE
  legacy_customer RECORD;
  migrated_member_id UUID;
BEGIN
  FOR legacy_customer IN
    SELECT *
    FROM public.pos_customers AS legacy
    WHERE NOT EXISTS (
      SELECT 1 FROM legacy_pos_customer_map AS mapping WHERE mapping.old_id = legacy.id
    )
  LOOP
    INSERT INTO public.pos_members (
      line_user_id,
      display_name,
      full_name,
      phone,
      points,
      total_spent,
      member_tier,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      legacy_customer.line_user_id,
      COALESCE(NULLIF(legacy_customer.name, ''), NULLIF(legacy_customer.email, ''), NULLIF(legacy_customer.phone, ''), 'Legacy POS Customer'),
      legacy_customer.name,
      legacy_customer.phone,
      COALESCE(legacy_customer.points, 0),
      COALESCE(legacy_customer.total_spent, 0),
      COALESCE(NULLIF(legacy_customer.tier, ''), 'general'),
      TRUE,
      COALESCE(legacy_customer.created_at, NOW()),
      NOW()
    )
    RETURNING id INTO migrated_member_id;

    INSERT INTO legacy_pos_customer_map (old_id, new_id)
    VALUES (legacy_customer.id, migrated_member_id);
  END LOOP;
END $$;

ALTER TABLE public.pos_orders DROP CONSTRAINT IF EXISTS pos_orders_customer_id_fkey;

UPDATE public.pos_orders AS pos_order
SET customer_id = mapping.new_id
FROM legacy_pos_customer_map AS mapping
WHERE pos_order.customer_id = mapping.old_id;

ALTER TABLE public.pos_orders
  ADD CONSTRAINT pos_orders_customer_id_fkey
  FOREIGN KEY (customer_id)
  REFERENCES public.pos_members(id)
  ON DELETE SET NULL;

-- Move legacy recipe rows into the recipe_data JSON source used by the live UI.
UPDATE public.pos_menu_items AS menu_item
SET recipe_data = aggregated.recipe_data
FROM (
  SELECT
    recipe.menu_item_id,
    jsonb_agg(
      jsonb_build_object(
        'ingredient_id', inventory.id,
        'name', inventory.name,
        'quantity', recipe.quantity,
        'base_unit', inventory.unit,
        'recipe_unit', inventory.unit,
        'factor', 1
      )
      ORDER BY recipe.created_at, recipe.id
    ) AS recipe_data
  FROM public.pos_menu_recipes AS recipe
  JOIN public.inventory_items AS inventory ON inventory.id = recipe.ingredient_id
  GROUP BY recipe.menu_item_id
) AS aggregated
WHERE menu_item.id = aggregated.menu_item_id
  AND (menu_item.recipe_data IS NULL OR menu_item.recipe_data = '[]'::jsonb);

UPDATE public.pos_menu_modifiers AS modifier
SET recipe_data = aggregated.recipe_data
FROM (
  SELECT
    recipe.modifier_id,
    jsonb_agg(
      jsonb_build_object(
        'ingredient_id', inventory.id,
        'name', inventory.name,
        'quantity', recipe.quantity,
        'base_unit', inventory.unit,
        'recipe_unit', COALESCE(recipe.unit, inventory.unit),
        'factor', 1
      )
      ORDER BY recipe.created_at, recipe.id
    ) AS recipe_data
  FROM public.pos_modifier_recipes AS recipe
  JOIN public.inventory_items AS inventory ON inventory.id = recipe.ingredient_id
  GROUP BY recipe.modifier_id
) AS aggregated
WHERE modifier.id = aggregated.modifier_id
  AND (modifier.recipe_data IS NULL OR modifier.recipe_data = '[]'::jsonb);

CREATE OR REPLACE FUNCTION public.deduct_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
  recipe_row JSONB;
  modifier_row JSONB;
  selected_modifier JSONB;
  ingredient_id UUID;
  quantity_input NUMERIC;
  conversion_factor NUMERIC;
  total_deduct NUMERIC;
BEGIN
  SELECT recipe_data INTO recipe_row
  FROM public.pos_menu_items
  WHERE id = COALESCE(NEW.menu_item_id, NEW.item_id);

  IF recipe_row IS NOT NULL AND jsonb_typeof(recipe_row) = 'array' AND jsonb_array_length(recipe_row) > 0 THEN
    FOR ingredient_id, quantity_input, conversion_factor IN
      SELECT
        (entry->>'ingredient_id')::UUID,
        COALESCE(NULLIF(entry->>'quantity', '')::NUMERIC, 0),
        COALESCE(NULLIF(entry->>'factor', '')::NUMERIC, 1)
      FROM jsonb_array_elements(recipe_row) AS entry
    LOOP
      total_deduct := quantity_input * conversion_factor * NEW.quantity;
      IF ingredient_id IS NOT NULL AND total_deduct <> 0 THEN
        UPDATE public.inventory_items
        SET stock_quantity = stock_quantity - total_deduct
        WHERE id = ingredient_id;
      END IF;
    END LOOP;
  END IF;

  IF NEW.selected_modifiers IS NOT NULL AND jsonb_typeof(NEW.selected_modifiers) = 'array' AND jsonb_array_length(NEW.selected_modifiers) > 0 THEN
    FOR selected_modifier IN
      SELECT entry FROM jsonb_array_elements(NEW.selected_modifiers) AS entry
    LOOP
      IF selected_modifier->>'id' IS NULL THEN
        CONTINUE;
      END IF;

      SELECT recipe_data INTO modifier_row
      FROM public.pos_menu_modifiers
      WHERE id = (selected_modifier->>'id')::UUID;

      IF modifier_row IS NULL OR jsonb_typeof(modifier_row) <> 'array' OR jsonb_array_length(modifier_row) = 0 THEN
        CONTINUE;
      END IF;

      FOR ingredient_id, quantity_input, conversion_factor IN
        SELECT
          (entry->>'ingredient_id')::UUID,
          COALESCE(NULLIF(entry->>'quantity', '')::NUMERIC, 0),
          COALESCE(NULLIF(entry->>'factor', '')::NUMERIC, 1)
        FROM jsonb_array_elements(modifier_row) AS entry
      LOOP
        total_deduct := quantity_input * conversion_factor * NEW.quantity;
        IF ingredient_id IS NOT NULL AND total_deduct <> 0 THEN
          UPDATE public.inventory_items
          SET stock_quantity = stock_quantity - total_deduct
          WHERE id = ingredient_id;
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_deduct_stock_on_order ON public.pos_order_items;
CREATE TRIGGER tr_deduct_stock_on_order
AFTER INSERT ON public.pos_order_items
FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_order();

-- Drop tables retired after the runtime/schema consolidation.
DROP POLICY IF EXISTS "Staff/Admin can read jobs" ON public.jobs;
DROP POLICY IF EXISTS "Staff/Admin can write jobs" ON public.jobs;
DROP TABLE IF EXISTS public.jobs;

DROP POLICY IF EXISTS "Select own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Insert own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Update own bookings" ON public.bookings;
DROP TABLE IF EXISTS public.bookings;

DROP FUNCTION IF EXISTS public.deduct_stock_on_waste() CASCADE;
DROP TABLE IF EXISTS public.inventory_waste;

DROP TABLE IF EXISTS public.pos_promotions;
DROP TABLE IF EXISTS public.pos_menu_recipes;
DROP TABLE IF EXISTS public.pos_modifier_recipes;
DROP TABLE IF EXISTS public.pos_customers;

COMMIT;