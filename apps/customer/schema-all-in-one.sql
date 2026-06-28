-- XYLEM LANDSCAPE: ALL-IN-ONE DATABASE SCHEMA / MIGRATION
-- Safe to run multiple times in Supabase SQL Editor
--
-- Scope consolidated from:
-- - create-bookings-and-schedules.sql
-- - create-workshop-bookings.sql
-- - create-payments-table.sql
-- - create-notifications-table.sql
-- - complete-database-migration.sql
-- - add-client-token-to-workshop-payments.sql
--
-- Notes:
-- 1) This script includes a core bootstrap for fresh DBs (profiles/orders/branches/services/houses).
-- 2) Emergency scripts that grant overly broad access are intentionally NOT included.
-- 3) Workshop APIs are expected to run with service_role on server routes.

create extension if not exists pgcrypto;

-- =========================================================
-- CODE GENERATION HELPERS
-- =========================================================
CREATE OR REPLACE FUNCTION public.next_profile_code_number(code_column text, code_prefix text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  next_no integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('profiles:' || code_column || ':' || code_prefix));

  EXECUTE format(
    'SELECT COALESCE(MAX(NULLIF(substring(%I from 2), '''')::int), 0) + 1
       FROM public.profiles
      WHERE %I ~ %L',
    code_column,
    code_column,
    '^' || code_prefix || '[0-9]+$'
  ) INTO next_no;

  RETURN COALESCE(next_no, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_profile_codes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  running_no integer;
BEGIN
  IF NEW.role = 'customer' THEN
    IF NEW.customer_base_code IS NULL OR btrim(NEW.customer_base_code) = '' THEN
      running_no := public.next_profile_code_number('customer_base_code', 'C');
      NEW.customer_base_code := 'C' || lpad(running_no::text, 4, '0');
    END IF;
  ELSIF NEW.role = 'staff' THEN
    IF NEW.staff_code IS NULL OR btrim(NEW.staff_code) = '' THEN
      running_no := public.next_profile_code_number('staff_code', 'S');
      NEW.staff_code := 'S' || lpad(running_no::text, 4, '0');
    END IF;
  ELSIF NEW.role = 'admin' THEN
    IF NEW.staff_code IS NULL OR btrim(NEW.staff_code) = '' THEN
      running_no := public.next_profile_code_number('staff_code', 'A');
      NEW.staff_code := 'A' || lpad(running_no::text, 4, '0');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_house_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owner_id uuid;
  owner_code text;
  branch_digits text;
  branch_part text;
  house_running integer;
BEGIN
  IF NEW.house_code IS NOT NULL AND btrim(NEW.house_code) <> '' THEN
    RETURN NEW;
  END IF;

  owner_id := COALESCE(NEW.user_id, NEW.customer_id);

  IF owner_id IS NOT NULL THEN
    SELECT customer_base_code INTO owner_code
    FROM public.profiles
    WHERE id = owner_id;
  END IF;

  IF owner_code IS NULL OR btrim(owner_code) = '' THEN
    owner_code := 'C0000';
  END IF;

  branch_digits := regexp_replace(COALESCE(NEW.branch_code, ''), '[^0-9]', '', 'g');
  branch_part := right(lpad(CASE WHEN branch_digits = '' THEN '0' ELSE branch_digits END, 2, '0'), 2);

  SELECT COALESCE(count(*), 0) + 1
    INTO house_running
  FROM public.houses h
  WHERE (h.user_id = owner_id OR h.customer_id = owner_id);

  NEW.house_code := owner_code || '-' || lpad(house_running::text, 2, '0') || '-' || branch_part;

  RETURN NEW;
END;
$$;

-- Role helpers (define early because policies below depend on these)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_my_role() IN ('admin', 'staff'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_my_role() = 'admin', false);
$$;

CREATE OR REPLACE FUNCTION public.is_house_owner(target_house_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.houses
    WHERE id = target_house_id
    AND (user_id = auth.uid() OR customer_id = auth.uid())
  );
$$;

-- NEW: Break recursion by querying houses table directly as superuser
CREATE OR REPLACE FUNCTION public.is_house_owner(target_house_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.houses
    WHERE id = target_house_id
    AND (user_id = auth.uid() OR customer_id = auth.uid())
  );
$$;

-- =========================================================
-- 0) CORE BOOTSTRAP (for fresh DBs without base tables)
-- =========================================================
-- Keep this minimal so this file can run end-to-end even when core schema
-- (profiles/orders/branches) has not been created yet.

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  branch_code text,
  branch_name text,
  name text,
  code text,
  address text,
  phone text,
  email text,
  service_zip_codes text[] not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.branches
  add column if not exists branch_code text;

alter table public.branches
  add column if not exists branch_name text;

alter table public.branches
  add column if not exists name text;

alter table public.branches
  add column if not exists code text;

alter table public.branches
  add column if not exists address text;

alter table public.branches
  add column if not exists phone text;

alter table public.branches
  add column if not exists email text;

alter table public.branches  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists service_zip_codes text[] not null default '{}',
  add column if not exists branch_type text not null default 'both';

alter table public.branches
  add column if not exists updated_at timestamptz not null default now();

update public.branches
set service_zip_codes = '{}'
where service_zip_codes is null;

CREATE OR REPLACE FUNCTION public.update_branches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_branches_updated_at_trigger ON public.branches;
CREATE TRIGGER update_branches_updated_at_trigger
  BEFORE UPDATE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_branches_updated_at();

create table if not exists public.profiles (
  id uuid primary key,
  email text,
  role text,
  display_name text,
  timezone text default 'Asia/Bangkok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_base_code text,
  staff_code text,
  phone text,
  address text,
  zip_code text,
  branch_code text,
  daily_wage numeric default 0,
  overtime_rate_per_hour numeric default 0,
  target_working_days integer default 26,
  salary_type text default 'daily' check (salary_type in ('daily', 'monthly')),
  staff_type text check (staff_type in ('cafe', 'garden')),
  shift_start text default '08:30',
  shift_end text default '17:30'
);

alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists role text;

alter table public.profiles
  add column if not exists display_name text;

alter table public.profiles
  add column if not exists timezone text default 'Asia/Bangkok';

alter table public.profiles
  add column if not exists updated_at timestamptz default now();

alter table public.profiles
  add column if not exists customer_base_code text;

alter table public.profiles
  add column if not exists staff_code text;

alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  add column if not exists address text;

alter table public.profiles
  add column if not exists zip_code text;

alter table public.profiles
  add column if not exists branch_code text;

alter table public.profiles
  add column if not exists daily_wage numeric default 0;

alter table public.profiles
  add column if not exists overtime_rate_per_hour numeric default 0;

alter table public.profiles
  add column if not exists target_working_days integer default 26;

alter table public.profiles
  add column if not exists salary_type text default 'daily';

alter table public.profiles
  add column if not exists staff_type text;

alter table public.profiles
  add column if not exists shift_start text default '08:30';

alter table public.profiles
  add column if not exists shift_end text default '17:30';

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  service_id uuid,
  house_id uuid,
  house_code text,
  price_template_id uuid,
  order_code text,
  status text not null default 'pending',
  service_area numeric,
  base_price numeric,
  calculated_price numeric,
  additional_services_price numeric,
  total numeric not null default 0,
  total_price numeric,
  pricing_period text,
  scheduled_date date,
  preferred_time_start time,
  preferred_time_end time,
  priority text,
  notes text,
  special_instructions text,
  sessions_per_period int4 default 1,
  total_sessions int4 default 1,
  completed_sessions int4 default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists customer_id uuid;
alter table public.orders add column if not exists service_id uuid;
alter table public.orders add column if not exists house_id uuid;
alter table public.orders add column if not exists house_code text;
alter table public.orders add column if not exists price_template_id uuid;
alter table public.orders add column if not exists order_code text;
alter table public.orders add column if not exists status text default 'pending';
alter table public.orders add column if not exists service_area numeric;
alter table public.orders add column if not exists base_price numeric;
alter table public.orders add column if not exists calculated_price numeric;
alter table public.orders add column if not exists additional_services_price numeric;
alter table public.orders add column if not exists total numeric not null default 0;
alter table public.orders add column if not exists total_price numeric;
alter table public.orders add column if not exists pricing_period text;
alter table public.orders add column if not exists scheduled_date date;
alter table public.orders add column if not exists preferred_time_start time;
alter table public.orders add column if not exists preferred_time_end time;
alter table public.orders add column if not exists sessions_per_period int4 default 1;
alter table public.orders add column if not exists total_sessions int4 default 1;
alter table public.orders add column if not exists completed_sessions int4 default 0;
alter table public.orders add column if not exists priority text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists special_instructions text;
alter table public.orders add column if not exists completed_at timestamptz;
alter table public.orders add column if not exists created_at timestamptz not null default now();
alter table public.orders add column if not exists updated_at timestamptz not null default now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_status_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_status_check
      CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_priority_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_priority_check
      CHECK (priority IS NULL OR priority IN ('low','normal','high','urgent'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_pricing_period_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_pricing_period_check
      CHECK (pricing_period IS NULL OR pricing_period IN ('one-time','monthly','yearly'))
      NOT VALID;
  END IF;
END $$;

create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_house_id on public.orders(house_id);
create index if not exists idx_orders_service_id on public.orders(service_id);
create index if not exists idx_orders_status_created on public.orders(status, created_at desc);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_order_code on public.orders(order_code);

CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.completed_at = COALESCE(NEW.completed_at, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_orders_updated_at_trigger ON public.orders;
CREATE TRIGGER update_orders_updated_at_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_orders_updated_at();

alter table public.orders enable row level security;

DROP POLICY IF EXISTS "Customers can read own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can delete own orders" ON public.orders;
DROP POLICY IF EXISTS "Staff/Admin can read orders" ON public.orders;
DROP POLICY IF EXISTS "Staff/Admin can write orders" ON public.orders;

CREATE POLICY "Customers can read own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can delete own orders"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Staff/Admin can read orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

CREATE POLICY "Staff/Admin can write orders"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO authenticated;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  service_name text,
  name text,
  service_code text,
  description text,
  category text,
  base_price numeric,
  price numeric,
  has_estimated_duration boolean default false,
  estimated_duration integer,
  estimated_duration_unit text,
  billing_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services add column if not exists service_name text;
alter table public.services add column if not exists name text;
alter table public.services add column if not exists service_code text;
alter table public.services add column if not exists description text;
alter table public.services add column if not exists category text;
alter table public.services add column if not exists base_price numeric;
alter table public.services add column if not exists price numeric;
alter table public.services add column if not exists has_estimated_duration boolean default false;
alter table public.services add column if not exists estimated_duration integer;
alter table public.services add column if not exists estimated_duration_unit text;
alter table public.services add column if not exists billing_type text;
alter table public.services add column if not exists is_active boolean not null default true;
alter table public.services add column if not exists created_at timestamptz not null default now();
alter table public.services add column if not exists updated_at timestamptz not null default now();

create table if not exists public.price_templates (
  id uuid primary key default gen_random_uuid(),
  service_id uuid,
  template_name text,
  area_min numeric,
  area_max numeric,
  price_per_unit numeric,
  base_price numeric,
  pricing_period text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.price_templates add column if not exists service_id uuid;
alter table public.price_templates add column if not exists template_name text;
alter table public.price_templates add column if not exists area_min numeric;
alter table public.price_templates add column if not exists area_max numeric;
alter table public.price_templates add column if not exists price_per_unit numeric;
alter table public.price_templates add column if not exists base_price numeric;
alter table public.price_templates add column if not exists pricing_period text;
alter table public.price_templates add column if not exists description text;
alter table public.price_templates add column if not exists is_active boolean not null default true;
alter table public.price_templates add column if not exists created_at timestamptz not null default now();
alter table public.price_templates add column if not exists updated_at timestamptz not null default now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'price_templates_pricing_period_check'
  ) THEN
    ALTER TABLE public.price_templates
      ADD CONSTRAINT price_templates_pricing_period_check
      CHECK (pricing_period IS NULL OR pricing_period IN ('one-time','monthly','yearly'));
  END IF;
END $$;

create table if not exists public.additional_services (
  id uuid primary key default gen_random_uuid(),
  service_name text,
  description text,
  price numeric,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.additional_services add column if not exists service_name text;
alter table public.additional_services add column if not exists description text;
alter table public.additional_services add column if not exists price numeric;
alter table public.additional_services add column if not exists category text;
alter table public.additional_services add column if not exists is_active boolean not null default true;
alter table public.additional_services add column if not exists created_at timestamptz not null default now();
alter table public.additional_services add column if not exists updated_at timestamptz not null default now();

create table if not exists public.order_additional_services (
  id uuid primary key default gen_random_uuid(),
  order_id uuid,
  additional_service_id uuid,
  quantity integer,
  unit_price numeric,
  total_price numeric,
  created_at timestamptz not null default now()
);

alter table public.order_additional_services add column if not exists order_id uuid;
alter table public.order_additional_services add column if not exists additional_service_id uuid;
alter table public.order_additional_services add column if not exists quantity integer;
alter table public.order_additional_services add column if not exists unit_price numeric;
alter table public.order_additional_services add column if not exists total_price numeric;
alter table public.order_additional_services add column if not exists created_at timestamptz not null default now();

DO $$
BEGIN
  IF to_regclass('public.services') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'price_templates_service_id_fkey') THEN
      ALTER TABLE public.price_templates
        ADD CONSTRAINT price_templates_service_id_fkey
        FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.orders') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_additional_services_order_id_fkey') THEN
      ALTER TABLE public.order_additional_services
        ADD CONSTRAINT order_additional_services_order_id_fkey
        FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.additional_services') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_additional_services_additional_service_id_fkey') THEN
      ALTER TABLE public.order_additional_services
        ADD CONSTRAINT order_additional_services_additional_service_id_fkey
        FOREIGN KEY (additional_service_id) REFERENCES public.additional_services(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

create index if not exists idx_services_is_active on public.services(is_active);
create index if not exists idx_services_created_at on public.services(created_at);
create index if not exists idx_price_templates_service_id on public.price_templates(service_id);
create index if not exists idx_price_templates_is_active on public.price_templates(is_active);
create index if not exists idx_additional_services_is_active on public.additional_services(is_active);
create index if not exists idx_order_additional_services_order_id on public.order_additional_services(order_id);

CREATE OR REPLACE FUNCTION public.update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_services_updated_at_trigger ON public.services;
CREATE TRIGGER update_services_updated_at_trigger
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_services_updated_at();

CREATE OR REPLACE FUNCTION public.update_price_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_price_templates_updated_at_trigger ON public.price_templates;
CREATE TRIGGER update_price_templates_updated_at_trigger
  BEFORE UPDATE ON public.price_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_price_templates_updated_at();

CREATE OR REPLACE FUNCTION public.update_additional_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_additional_services_updated_at_trigger ON public.additional_services;
CREATE TRIGGER update_additional_services_updated_at_trigger
  BEFORE UPDATE ON public.additional_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_additional_services_updated_at();

alter table public.services enable row level security;
alter table public.price_templates enable row level security;
alter table public.additional_services enable row level security;
alter table public.order_additional_services enable row level security;

DROP POLICY IF EXISTS "Authenticated can read services" ON public.services;
DROP POLICY IF EXISTS "Authenticated can write services" ON public.services;
DROP POLICY IF EXISTS "Authenticated can read price templates" ON public.price_templates;
DROP POLICY IF EXISTS "Authenticated can write price templates" ON public.price_templates;
DROP POLICY IF EXISTS "Authenticated can read additional services" ON public.additional_services;
DROP POLICY IF EXISTS "Authenticated can write additional services" ON public.additional_services;
DROP POLICY IF EXISTS "Authenticated can read order additional services" ON public.order_additional_services;
DROP POLICY IF EXISTS "Authenticated can write order additional services" ON public.order_additional_services;

CREATE POLICY "Authenticated can read services"
  ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write services"
  ON public.services FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read price templates"
  ON public.price_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write price templates"
  ON public.price_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read additional services"
  ON public.additional_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write additional services"
  ON public.additional_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read order additional services"
  ON public.order_additional_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write order additional services"
  ON public.order_additional_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.price_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.additional_services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.order_additional_services TO authenticated;

create table if not exists public.houses (
  id uuid primary key default gen_random_uuid(),
  house_code text,
  user_id uuid,
  customer_id uuid,
  name text,
  address text,
  image_url text,
  latitude numeric,
  longitude numeric,
  zip_code text,
  branch_code text,
  house_type text,
  area_size numeric,
  phone_number text,
  contact_person text,
  service_days text[],
  key_location text,
  special_notes text,
  operating_hour_start time,
  operating_hour_end time,
  parking_available boolean default false,
  parking_spaces integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.houses
  add column if not exists house_code text;
alter table public.houses
  add column if not exists user_id uuid;
alter table public.houses
  add column if not exists customer_id uuid;
alter table public.houses
  add column if not exists name text;
alter table public.houses
  add column if not exists address text;
alter table public.houses
  add column if not exists image_url text;
alter table public.houses
  add column if not exists latitude numeric;
alter table public.houses
  add column if not exists longitude numeric;
alter table public.houses
  add column if not exists zip_code text;
alter table public.houses
  add column if not exists branch_code text;
alter table public.houses
  add column if not exists house_type text;
alter table public.houses
  add column if not exists area_size numeric;
alter table public.houses
  add column if not exists phone_number text;
alter table public.houses
  add column if not exists contact_person text;
alter table public.houses
  add column if not exists service_days text[];
alter table public.houses
  add column if not exists key_location text;
alter table public.houses
  add column if not exists special_notes text;
alter table public.houses
  add column if not exists operating_hour_start time;
alter table public.houses
  add column if not exists operating_hour_end time;
alter table public.houses
  add column if not exists parking_available boolean default false;
alter table public.houses
  add column if not exists parking_spaces integer;
alter table public.houses
  add column if not exists created_at timestamptz not null default now();
alter table public.houses
  add column if not exists updated_at timestamptz not null default now();

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'houses_user_id_fkey'
    ) THEN
      ALTER TABLE public.houses
        ADD CONSTRAINT houses_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'houses_customer_id_fkey'
    ) THEN
      ALTER TABLE public.houses
        ADD CONSTRAINT houses_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    IF to_regclass('public.profiles') IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_customer_id_fkey') THEN
        ALTER TABLE public.orders
          ADD CONSTRAINT orders_customer_id_fkey
          FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
      END IF;
    END IF;

    IF to_regclass('public.services') IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_service_id_fkey') THEN
        ALTER TABLE public.orders
          ADD CONSTRAINT orders_service_id_fkey
          FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;
      END IF;
    END IF;

    IF to_regclass('public.houses') IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_house_id_fkey') THEN
        ALTER TABLE public.orders
          ADD CONSTRAINT orders_house_id_fkey
          FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE SET NULL;
      END IF;
    END IF;

    IF to_regclass('public.price_templates') IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_price_template_id_fkey') THEN
        ALTER TABLE public.orders
          ADD CONSTRAINT orders_price_template_id_fkey
          FOREIGN KEY (price_template_id) REFERENCES public.price_templates(id) ON DELETE SET NULL;
      END IF;
    END IF;
  END IF;
END $$;

create index if not exists idx_houses_user_id on public.houses(user_id);
create index if not exists idx_houses_customer_id on public.houses(customer_id);
create index if not exists idx_houses_house_code on public.houses(house_code);

CREATE OR REPLACE FUNCTION public.update_houses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_houses_updated_at_trigger ON public.houses;
CREATE TRIGGER update_houses_updated_at_trigger
  BEFORE UPDATE ON public.houses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_houses_updated_at();

alter table public.houses enable row level security;

DROP TRIGGER IF EXISTS assign_house_code_trigger ON public.houses;
CREATE TRIGGER assign_house_code_trigger
  BEFORE INSERT OR UPDATE ON public.houses
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_house_code();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'houses_house_code_key'
      AND conrelid = 'public.houses'::regclass
  ) THEN
    ALTER TABLE public.houses
      ADD CONSTRAINT houses_house_code_key UNIQUE (house_code);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_houses_house_code ON public.houses(house_code) WHERE house_code IS NOT NULL;

DROP POLICY IF EXISTS "Users can read own houses" ON public.houses;
DROP POLICY IF EXISTS "Users can insert own houses" ON public.houses;
DROP POLICY IF EXISTS "Users can update own houses" ON public.houses;
DROP POLICY IF EXISTS "Users can delete own houses" ON public.houses;
DROP POLICY IF EXISTS "Staff/Admin can read houses" ON public.houses;

CREATE POLICY "Users can read own houses"
  ON public.houses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = customer_id);

CREATE POLICY "Users can insert own houses"
  ON public.houses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = customer_id);

CREATE POLICY "Users can update own houses"
  ON public.houses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = customer_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = customer_id);

CREATE POLICY "Users can delete own houses"
  ON public.houses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = customer_id);

CREATE POLICY "Staff/Admin can read houses"
  ON public.houses
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.houses TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_house_delete_if_linked()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  linked_orders integer := 0;
  linked_measurements integer := 0;
  has_orders_house_id boolean := false;
  has_orders_house_code boolean := false;
  has_measurements_house_code boolean := false;
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'house_id'
    ) INTO has_orders_house_id;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'house_code'
    ) INTO has_orders_house_code;

    IF has_orders_house_id AND has_orders_house_code THEN
      EXECUTE 'SELECT count(*) FROM public.orders WHERE house_id = $1 OR ($2 IS NOT NULL AND house_code = $2)'
        INTO linked_orders
        USING OLD.id, OLD.house_code;
    ELSIF has_orders_house_id THEN
      EXECUTE 'SELECT count(*) FROM public.orders WHERE house_id = $1'
        INTO linked_orders
        USING OLD.id;
    ELSIF has_orders_house_code AND OLD.house_code IS NOT NULL THEN
      EXECUTE 'SELECT count(*) FROM public.orders WHERE house_code = $1'
        INTO linked_orders
        USING OLD.house_code;
    END IF;
  END IF;

  IF to_regclass('public.measurement_requests') IS NOT NULL AND OLD.house_code IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'measurement_requests'
        AND column_name = 'house_code'
    ) INTO has_measurements_house_code;

    IF has_measurements_house_code THEN
      EXECUTE 'SELECT count(*) FROM public.measurement_requests WHERE house_code = $1'
        INTO linked_measurements
        USING OLD.house_code;
    END IF;
  END IF;

  IF linked_orders > 0 OR linked_measurements > 0 THEN
    RAISE EXCEPTION 'Cannot delete house %, linked orders: %, linked measurement requests: %',
      COALESCE(OLD.house_code, OLD.id::text), linked_orders, linked_measurements;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_house_delete_if_linked_trigger ON public.houses;
CREATE TRIGGER prevent_house_delete_if_linked_trigger
  BEFORE DELETE ON public.houses
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_house_delete_if_linked();

CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at_trigger ON public.profiles;
CREATE TRIGGER update_profiles_updated_at_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();

alter table public.profiles enable row level security;

DROP TRIGGER IF EXISTS assign_profile_codes_trigger ON public.profiles;
CREATE TRIGGER assign_profile_codes_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_profile_codes();

CREATE UNIQUE INDEX IF NOT EXISTS uniq_profiles_customer_base_code ON public.profiles(customer_base_code) WHERE customer_base_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_profiles_staff_code ON public.profiles(staff_code) WHERE staff_code IS NOT NULL;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff/Admin can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff/Admin can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff/Admin can delete profiles" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.get_my_role() IN ('admin', 'staff'));

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.get_my_role() IN ('admin', 'staff'))
  WITH CHECK (auth.uid() = id OR public.get_my_role() IN ('admin', 'staff'));

CREATE POLICY "Admin/Staff can delete profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'staff'));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_role text;
  resolved_name text;
BEGIN
  resolved_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  resolved_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'display_name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    email,
    role,
    display_name,
    timezone,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    resolved_role,
    NULLIF(resolved_name, ''),
    'Asia/Bangkok',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
      ) THEN
        EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()';
      END IF;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping auth.users trigger creation: insufficient privilege';
    END;
  END IF;
END $$;

-- Backfill codes for existing records
UPDATE public.profiles
SET customer_base_code = NULL
WHERE role = 'customer' AND (customer_base_code IS NULL OR btrim(customer_base_code) = '');

UPDATE public.profiles
SET staff_code = NULL
WHERE role IN ('staff', 'admin') AND (staff_code IS NULL OR btrim(staff_code) = '');

UPDATE public.houses
SET house_code = NULL
WHERE house_code IS NULL OR btrim(house_code) = '';

DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    INSERT INTO public.profiles (
      id,
      email,
      role,
      display_name,
      timezone,
      created_at,
      updated_at
    )
    SELECT
      u.id,
      u.email,
      COALESCE(u.raw_user_meta_data->>'role', 'customer') AS role,
      COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'display_name',
        split_part(COALESCE(u.email, ''), '@', 1)
      ) AS display_name,
      'Asia/Bangkok',
      NOW(),
      NOW()
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL;
  END IF;
END $$;

-- Baseline grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- =========================================================
-- STORAGE (WORK REPORT PHOTOS)
-- =========================================================
-- Best-effort: create a public bucket for work report photos.
-- If your Supabase project restricts storage DDL from SQL editor, create it in Dashboard instead.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    BEGIN
      PERFORM storage.create_bucket('work-reports', public := true);
    EXCEPTION WHEN undefined_function THEN
      -- Older projects may not expose create_bucket(); ignore.
      NULL;
    WHEN OTHERS THEN
      -- Ignore errors like duplicate bucket.
      NULL;
    END;
  END IF;
END $$;

-- =========================================================
-- STORAGE (MARKETPLACE IMAGES)
-- =========================================================
-- Admin uploads plant images to this bucket from dashboard UI.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    BEGIN
      PERFORM storage.create_bucket('marketplace-images', public := true);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    DROP POLICY IF EXISTS "Public read marketplace images" ON storage.objects;
    DROP POLICY IF EXISTS "Admin upload marketplace images" ON storage.objects;
    DROP POLICY IF EXISTS "Admin update marketplace images" ON storage.objects;
    DROP POLICY IF EXISTS "Admin delete marketplace images" ON storage.objects;

    CREATE POLICY "Public read marketplace images"
      ON storage.objects
      FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'marketplace-images');

    CREATE POLICY "Admin upload marketplace images"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'marketplace-images' AND public.is_admin());

    CREATE POLICY "Admin update marketplace images"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'marketplace-images' AND public.is_admin())
      WITH CHECK (bucket_id = 'marketplace-images' AND public.is_admin());

    CREATE POLICY "Admin delete marketplace images"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'marketplace-images' AND public.is_admin());
  END IF;
END $$;

-- =========================================================
-- 1) SCHEDULES
-- =========================================================
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.profiles(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_schedules_date_branch on public.schedules(date, branch_id);
create index if not exists idx_schedules_staff_date on public.schedules(staff_id, date);

alter table public.schedules enable row level security;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='schedules' AND policyname='Select schedules'
  ) THEN
    CREATE POLICY "Select schedules"
      ON public.schedules
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

GRANT SELECT ON TABLE public.schedules TO authenticated;

-- =========================================================
-- 3) PAYMENTS (SERVICE ORDERS)
-- =========================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'test',
  provider_charge_id text,
  amount numeric(12,2) not null default 0,
  currency text not null default 'THB',
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_payments_user_created on public.payments(user_id, created_at desc);
create index if not exists idx_payments_order on public.payments(order_id);

alter table public.payments enable row level security;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='payments' AND policyname='Select own payments'
  ) THEN
    CREATE POLICY "Select own payments"
      ON public.payments
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='payments' AND policyname='Insert own payments'
  ) THEN
    CREATE POLICY "Insert own payments"
      ON public.payments
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='payments' AND policyname='Update own payments'
  ) THEN
    CREATE POLICY "Update own payments"
      ON public.payments
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON TABLE public.payments TO authenticated;

-- =========================================================
-- 4) NOTIFICATIONS
-- =========================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text,
  title text,
  message text not null,
  data jsonb,
  related_order_id uuid,
  related_measurement_id uuid,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications (user_id) where read = false;

alter table public.notifications enable row level security;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications' AND policyname='Select own notifications'
  ) THEN
    CREATE POLICY "Select own notifications"
      ON public.notifications
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications' AND policyname='Insert own notifications'
  ) THEN
    CREATE POLICY "Insert own notifications"
      ON public.notifications
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications' AND policyname='Update own notifications'
  ) THEN
    CREATE POLICY "Update own notifications"
      ON public.notifications
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications' AND policyname='Staff/Admin can insert notifications'
  ) THEN
    CREATE POLICY "Staff/Admin can insert notifications"
      ON public.notifications
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin_or_staff());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON TABLE public.notifications TO authenticated;

-- =========================================================
-- 4.5) MISSING CORE TABLES USED BY APP
-- =========================================================

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read branches" ON public.branches;
DROP POLICY IF EXISTS "Staff/Admin can write branches" ON public.branches;

CREATE POLICY "Authenticated can read branches"
  ON public.branches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff/Admin can write branches"
  ON public.branches
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.branches TO authenticated;

CREATE TABLE IF NOT EXISTS public.measurement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_code text,
  customer_id uuid NOT NULL,
  request_type text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  priority_level text NOT NULL DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
  assigned_staff_id uuid,
  preferred_date date,
  preferred_time_start time,
  preferred_time_end time,
  special_instructions text,
  measurement_notes text,
  measured_area_sqm numeric,
  measurement_photos text[],
  branch_code text,
  assigned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'measurement_requests_customer_id_fkey') THEN
    ALTER TABLE public.measurement_requests
      ADD CONSTRAINT measurement_requests_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'measurement_requests_assigned_staff_id_fkey') THEN
    ALTER TABLE public.measurement_requests
      ADD CONSTRAINT measurement_requests_assigned_staff_id_fkey
      FOREIGN KEY (assigned_staff_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'measurement_requests_house_code_fkey') THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'houses_house_code_key'
        AND conrelid = 'public.houses'::regclass
    ) THEN
      ALTER TABLE public.measurement_requests
        ADD CONSTRAINT measurement_requests_house_code_fkey
        FOREIGN KEY (house_code) REFERENCES public.houses(house_code) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_measurement_requests_customer_status ON public.measurement_requests(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_measurement_requests_staff_status ON public.measurement_requests(assigned_staff_id, status);
CREATE INDEX IF NOT EXISTS idx_measurement_requests_house_code ON public.measurement_requests(house_code);

CREATE OR REPLACE FUNCTION public.update_measurement_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_measurement_requests_updated_at_trigger ON public.measurement_requests;
CREATE TRIGGER update_measurement_requests_updated_at_trigger
  BEFORE UPDATE ON public.measurement_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_measurement_requests_updated_at();

ALTER TABLE public.measurement_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can read own measurement requests" ON public.measurement_requests;
DROP POLICY IF EXISTS "Customers can insert own measurement requests" ON public.measurement_requests;
DROP POLICY IF EXISTS "Customers can update own measurement requests" ON public.measurement_requests;
DROP POLICY IF EXISTS "Staff/Admin can read measurement requests" ON public.measurement_requests;
DROP POLICY IF EXISTS "Staff/Admin can update measurement requests" ON public.measurement_requests;

CREATE POLICY "Customers can read own measurement requests"
  ON public.measurement_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own measurement requests"
  ON public.measurement_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own measurement requests"
  ON public.measurement_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Staff/Admin can read measurement requests"
  ON public.measurement_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

CREATE POLICY "Staff/Admin can update measurement requests"
  ON public.measurement_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE ON TABLE public.measurement_requests TO authenticated;

CREATE TABLE IF NOT EXISTS public.job_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  staff_id uuid,
  assigned_date date,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'in_progress', 'completed', 'declined')),
  notes text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- 4.6) WORK REPORTS (CUSTOMER-FACING)
-- =========================================================
-- Staff fills these after servicing a garden. Customers can read reports for their own orders.

CREATE TABLE IF NOT EXISTS public.work_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_assignment_id uuid NOT NULL,
  order_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  work_done text,
  problems_found text,
  recommendations text,
  next_visit_date date,
  next_visit_time_start time,
  next_visit_time_end time,
  next_visit_notes text,
  before_photos text[] NOT NULL DEFAULT '{}',
  after_photos text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_reports_job_assignment_id_key') THEN
    ALTER TABLE public.work_reports
      ADD CONSTRAINT work_reports_job_assignment_id_key UNIQUE (job_assignment_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_reports_job_assignment_id_fkey') THEN
    ALTER TABLE public.work_reports
      ADD CONSTRAINT work_reports_job_assignment_id_fkey
      FOREIGN KEY (job_assignment_id) REFERENCES public.job_assignments(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_reports_order_id_fkey') THEN
    ALTER TABLE public.work_reports
      ADD CONSTRAINT work_reports_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_reports_staff_id_fkey') THEN
    ALTER TABLE public.work_reports
      ADD CONSTRAINT work_reports_staff_id_fkey
      FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_reports_customer_id_fkey') THEN
    ALTER TABLE public.work_reports
      ADD CONSTRAINT work_reports_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_reports_order_id_updated ON public.work_reports(order_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_reports_customer_id_updated ON public.work_reports(customer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_reports_staff_id_updated ON public.work_reports(staff_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.update_work_reports_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_work_reports_updated_at_trigger ON public.work_reports;
CREATE TRIGGER update_work_reports_updated_at_trigger
  BEFORE UPDATE ON public.work_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_work_reports_updated_at();

ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can read own work reports" ON public.work_reports;
DROP POLICY IF EXISTS "Staff can read own work reports" ON public.work_reports;
DROP POLICY IF EXISTS "Staff can insert own work reports" ON public.work_reports;
DROP POLICY IF EXISTS "Staff can update own work reports" ON public.work_reports;
DROP POLICY IF EXISTS "Staff/Admin can read all work reports" ON public.work_reports;
DROP POLICY IF EXISTS "Admin can write all work reports" ON public.work_reports;

CREATE POLICY "Customers can read own work reports"
  ON public.work_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Staff can read own work reports"
  ON public.work_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = staff_id);

CREATE POLICY "Staff can insert own work reports"
  ON public.work_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Staff can update own work reports"
  ON public.work_reports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = staff_id)
  WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Staff/Admin can read all work reports"
  ON public.work_reports
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

CREATE POLICY "Admin can write all work reports"
  ON public.work_reports
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.work_reports TO authenticated;

-- =========================================================
-- 4.7) CUSTOMER ORDER FEEDBACK
-- =========================================================

CREATE TABLE IF NOT EXISTS public.customer_order_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
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
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_order_feedback_order_id_fkey') THEN
    ALTER TABLE public.customer_order_feedback
      ADD CONSTRAINT customer_order_feedback_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_order_feedback_customer_id_fkey') THEN
    ALTER TABLE public.customer_order_feedback
      ADD CONSTRAINT customer_order_feedback_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_order_feedback_order_created ON public.customer_order_feedback(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_order_feedback_customer_created ON public.customer_order_feedback(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_order_feedback_type_status ON public.customer_order_feedback(feedback_type, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_order_feedback_unique_rating_once ON public.customer_order_feedback(order_id, customer_id, feedback_type) WHERE feedback_type = 'rating';

CREATE OR REPLACE FUNCTION public.update_customer_order_feedback_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_customer_order_feedback_updated_at_trigger ON public.customer_order_feedback;
CREATE TRIGGER update_customer_order_feedback_updated_at_trigger
  BEFORE UPDATE ON public.customer_order_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_order_feedback_updated_at();

ALTER TABLE public.customer_order_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can read own order feedback" ON public.customer_order_feedback;
DROP POLICY IF EXISTS "Customers can insert own order feedback" ON public.customer_order_feedback;
DROP POLICY IF EXISTS "Admins can read all order feedback" ON public.customer_order_feedback;
DROP POLICY IF EXISTS "Admins can update all order feedback" ON public.customer_order_feedback;

CREATE POLICY "Customers can read own order feedback"
  ON public.customer_order_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own order feedback"
  ON public.customer_order_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can read all order feedback"
  ON public.customer_order_feedback
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update all order feedback"
  ON public.customer_order_feedback
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON TABLE public.customer_order_feedback TO authenticated;

-- =========================================================
-- 4.7.1) WORK REPORT FEEDBACK
-- =========================================================

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_assignments_order_id_fkey') THEN
    ALTER TABLE public.job_assignments
      ADD CONSTRAINT job_assignments_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_assignments_staff_id_fkey') THEN
    ALTER TABLE public.job_assignments
      ADD CONSTRAINT job_assignments_staff_id_fkey
      FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_job_assignments_staff_status ON public.job_assignments(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_job_assignments_order_id ON public.job_assignments(order_id);

CREATE OR REPLACE FUNCTION public.update_job_assignments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_job_assignments_updated_at_trigger ON public.job_assignments;
CREATE TRIGGER update_job_assignments_updated_at_trigger
  BEFORE UPDATE ON public.job_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_job_assignments_updated_at();

ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read own job assignments" ON public.job_assignments;
DROP POLICY IF EXISTS "Staff can update own job assignments" ON public.job_assignments;
DROP POLICY IF EXISTS "Staff/Admin can read job assignments" ON public.job_assignments;
DROP POLICY IF EXISTS "Staff/Admin can write job assignments" ON public.job_assignments;

CREATE POLICY "Staff can read own job assignments"
  ON public.job_assignments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = staff_id);

CREATE POLICY "Staff can update own job assignments"
  ON public.job_assignments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = staff_id)
  WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Staff/Admin can read job assignments"
  ON public.job_assignments
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

CREATE POLICY "Staff/Admin can write job assignments"
  ON public.job_assignments
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_assignments TO authenticated;

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'other',
  document_code text,
  file_url text,
  file_name text,
  file_size bigint,
  description text,
  status text,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_created ON public.documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_order_id ON public.documents(order_id);

CREATE OR REPLACE FUNCTION public.update_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_documents_updated_at_trigger ON public.documents;
CREATE TRIGGER update_documents_updated_at_trigger
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_documents_updated_at();

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Staff/Admin can read documents" ON public.documents;
DROP POLICY IF EXISTS "Staff/Admin can write documents" ON public.documents;

CREATE POLICY "Users can read own documents"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff/Admin can read documents"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

CREATE POLICY "Staff/Admin can write documents"
  ON public.documents
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.documents TO authenticated;

-- =========================================================
-- 4.7) DOCUMENT INTEGRITY + CUSTOMER REGISTRY
-- =========================================================

CREATE OR REPLACE FUNCTION public.normalize_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(trim(coalesce(input, '')), '\\s+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(input, ''), '\\D', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.try_parse_jsonb(input text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input IS NULL OR btrim(input) = '' THEN
    RETURN NULL;
  END IF;

  RETURN input::jsonb;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_parse_uuid(input text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input IS NULL OR btrim(input) = '' THEN
    RETURN NULL;
  END IF;

  RETURN input::uuid;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_parse_numeric(input text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input IS NULL OR btrim(input) = '' THEN
    RETURN NULL;
  END IF;

  RETURN input::numeric;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.document_customer_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_customer_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NULL,
  address text NULL,
  normalized_name text NOT NULL,
  normalized_phone text NOT NULL DEFAULT '',
  normalized_address text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_document_customer_registry_name_non_empty CHECK (btrim(normalized_name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_document_customer_registry_source_customer_id
  ON public.document_customer_registry(source_customer_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_document_customer_registry_identity
  ON public.document_customer_registry(normalized_name, normalized_phone, normalized_address);

CREATE OR REPLACE FUNCTION public.update_document_customer_registry_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_document_customer_registry_updated_at ON public.document_customer_registry;
CREATE TRIGGER trg_document_customer_registry_updated_at
BEFORE UPDATE ON public.document_customer_registry
FOR EACH ROW
EXECUTE FUNCTION public.update_document_customer_registry_updated_at();

ALTER TABLE public.document_customer_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff/Admin can read document customer registry" ON public.document_customer_registry;
DROP POLICY IF EXISTS "Staff/Admin can write document customer registry" ON public.document_customer_registry;

CREATE POLICY "Staff/Admin can read document customer registry"
  ON public.document_customer_registry
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

CREATE POLICY "Staff/Admin can write document customer registry"
  ON public.document_customer_registry
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.document_customer_registry TO authenticated;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS manual_kind text,
  ADD COLUMN IF NOT EXISTS source_document_id uuid,
  ADD COLUMN IF NOT EXISTS source_customer_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_phone text,
  ADD COLUMN IF NOT EXISTS recipient_address text,
  ADD COLUMN IF NOT EXISTS customer_snapshot_id uuid;

UPDATE public.documents
SET total = COALESCE(
  (public.try_parse_jsonb(description) ->> 'total')::numeric,
  0
)
WHERE description IS NOT NULL
  AND description LIKE '%"kind":"manual_document"%'
  AND (total IS NULL OR total = 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_documents_source_document'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT fk_documents_source_document
      FOREIGN KEY (source_document_id)
      REFERENCES public.documents(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_documents_source_customer'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT fk_documents_source_customer
      FOREIGN KEY (source_customer_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_documents_customer_snapshot'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT fk_documents_customer_snapshot
      FOREIGN KEY (customer_snapshot_id)
      REFERENCES public.document_customer_registry(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_source_document_id ON public.documents(source_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_source_customer_id ON public.documents(source_customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer_snapshot_id ON public.documents(customer_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_documents_recipient_name ON public.documents(recipient_name);

CREATE OR REPLACE FUNCTION public.upsert_document_customer_registry(
  p_source_customer_id uuid,
  p_name text,
  p_phone text,
  p_address text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_address text := nullif(btrim(coalesce(p_address, '')), '');
  v_n_name text;
  v_n_phone text;
  v_n_address text;
  v_id uuid;
BEGIN
  IF v_name = '' THEN
    RETURN NULL;
  END IF;

  v_n_name := public.normalize_text(v_name);
  v_n_phone := public.normalize_phone(v_phone);
  v_n_address := public.normalize_text(v_address);

  IF p_source_customer_id IS NOT NULL THEN
    INSERT INTO public.document_customer_registry (
      source_customer_id,
      name,
      phone,
      address,
      normalized_name,
      normalized_phone,
      normalized_address
    ) VALUES (
      p_source_customer_id,
      v_name,
      v_phone,
      v_address,
      v_n_name,
      coalesce(v_n_phone, ''),
      coalesce(v_n_address, '')
    )
    ON CONFLICT (source_customer_id) DO UPDATE
      SET name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          normalized_name = EXCLUDED.normalized_name,
          normalized_phone = EXCLUDED.normalized_phone,
          normalized_address = EXCLUDED.normalized_address,
          updated_at = now()
    RETURNING id INTO v_id;

    RETURN v_id;
  END IF;

  INSERT INTO public.document_customer_registry (
    source_customer_id,
    name,
    phone,
    address,
    normalized_name,
    normalized_phone,
    normalized_address
  ) VALUES (
    NULL,
    v_name,
    v_phone,
    v_address,
    v_n_name,
    coalesce(v_n_phone, ''),
    coalesce(v_n_address, '')
  )
  ON CONFLICT (normalized_name, normalized_phone, normalized_address) DO UPDATE
    SET name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_documents_manual_metadata()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  payload jsonb;
  kind text;
  v_recipient_name text;
  v_recipient_phone text;
  v_recipient_address text;
  v_source_customer_id uuid;
  v_idempotency_key text;
  v_total numeric;
BEGIN
  payload := public.try_parse_jsonb(NEW.description);
  kind := payload ->> 'kind';

  IF kind = 'manual_document' THEN
    NEW.manual_kind := kind;
    NEW.source_document_id := public.try_parse_uuid(payload ->> 'source_document_id');
    NEW.source_customer_id := public.try_parse_uuid(payload ->> 'source_customer_id');
    v_idempotency_key := nullif(btrim(coalesce(payload ->> 'idempotency_key', '')), '');
    NEW.idempotency_key := v_idempotency_key;

    v_recipient_name := nullif(btrim(coalesce(payload #>> '{recipient,name}', '')), '');
    v_recipient_phone := nullif(btrim(coalesce(payload #>> '{recipient,phone}', '')), '');
    v_recipient_address := nullif(btrim(coalesce(payload #>> '{recipient,address}', '')), '');

    NEW.recipient_name := v_recipient_name;
    NEW.recipient_phone := v_recipient_phone;
    NEW.recipient_address := v_recipient_address;

    v_total := (payload ->> 'total')::numeric;
    IF v_total IS NOT NULL AND v_total > 0 THEN
      NEW.total := v_total;
    END IF;

    v_source_customer_id := NEW.source_customer_id;
    NEW.customer_snapshot_id := public.upsert_document_customer_registry(
      v_source_customer_id,
      v_recipient_name,
      v_recipient_phone,
      v_recipient_address
    );
  ELSE
    NEW.manual_kind := NULL;
    NEW.source_document_id := NULL;
    NEW.source_customer_id := NULL;
    NEW.idempotency_key := NULL;
    NEW.recipient_name := NULL;
    NEW.recipient_phone := NULL;
    NEW.recipient_address := NULL;
    NEW.customer_snapshot_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_documents_10_sync_metadata ON public.documents;
CREATE TRIGGER trg_documents_10_sync_metadata
BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.sync_documents_manual_metadata();

DROP TRIGGER IF EXISTS trg_documents_20_validate_chain ON public.documents;

UPDATE public.documents
SET description = description
WHERE description IS NOT NULL
  AND description LIKE '%"kind":"manual_document"%';

DO $$
DECLARE
  unresolved_legacy_contracts integer;
BEGIN
  WITH contract_invoice_candidates AS (
    SELECT
      c.id AS contract_id,
      i.id AS invoice_id,
      i.document_code AS invoice_code,
      i.created_at AS invoice_created_at,
      count(i.id) OVER (PARTITION BY c.id) AS invoice_count,
      row_number() OVER (
        PARTITION BY c.id
        ORDER BY i.created_at DESC NULLS LAST, i.id DESC
      ) AS invoice_rank
    FROM public.documents c
    JOIN public.documents q
      ON q.id = c.source_document_id
     AND q.type = 'quotation'
    LEFT JOIN public.documents i
      ON i.type = 'invoice'
     AND i.source_document_id = q.id
    WHERE c.type = 'contract'
      AND c.manual_kind = 'manual_document'
      AND c.source_document_id IS NOT NULL
  ),
  fixable_contracts AS (
    SELECT
      contract_id,
      invoice_id,
      invoice_code,
      invoice_created_at
    FROM contract_invoice_candidates
    WHERE invoice_count = 1
      AND invoice_id IS NOT NULL
      AND invoice_rank = 1
  )
  UPDATE public.documents d
  SET description = jsonb_set(
    jsonb_set(
      jsonb_set(
        public.try_parse_jsonb(d.description),
        '{source_document_id}',
        to_jsonb(f.invoice_id::text),
        true
      ),
      '{source_document_code}',
      to_jsonb(f.invoice_code),
      true
    ),
    '{source_document_created_at}',
    to_jsonb(f.invoice_created_at),
    true
  )::text
  FROM fixable_contracts f
  WHERE d.id = f.contract_id;

  SELECT count(*)
  INTO unresolved_legacy_contracts
  FROM public.documents c
  JOIN public.documents src
    ON src.id = c.source_document_id
  WHERE c.type = 'contract'
    AND c.manual_kind = 'manual_document'
    AND src.type = 'quotation';

  IF unresolved_legacy_contracts > 0 THEN
    RAISE EXCEPTION
      'Found % legacy contract document(s) still referencing quotation. Create or link an invoice for each source quotation before re-running this schema.',
      unresolved_legacy_contracts
      USING ERRCODE = '23514';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.documents
    WHERE document_code IS NOT NULL
      AND btrim(document_code) <> ''
    GROUP BY document_code
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create unique index: duplicate document_code exists in public.documents';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.documents
    WHERE type = 'receipt'
      AND manual_kind = 'manual_document'
      AND source_document_id IS NOT NULL
    GROUP BY source_document_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create unique index: duplicate receipt per source_document_id exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.documents
    WHERE type = 'plant_material'
      AND manual_kind = 'manual_document'
      AND source_document_id IS NOT NULL
    GROUP BY source_document_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create unique index: duplicate plant_material per source_document_id exists';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_documents_document_code
  ON public.documents(document_code)
  WHERE document_code IS NOT NULL AND btrim(document_code) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS ux_documents_user_idempotency_key
  ON public.documents(user_id, idempotency_key)
  WHERE manual_kind = 'manual_document'
    AND idempotency_key IS NOT NULL
    AND btrim(idempotency_key) <> '';

DROP INDEX IF EXISTS ux_documents_invoice_per_source;

CREATE UNIQUE INDEX IF NOT EXISTS ux_documents_receipt_per_source
  ON public.documents(source_document_id)
  WHERE type = 'receipt' AND manual_kind = 'manual_document' AND source_document_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_documents_plant_material_per_source
  ON public.documents(source_document_id)
  WHERE type = 'plant_material' AND manual_kind = 'manual_document' AND source_document_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_documents_business_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  payload jsonb;
  src_type text;
  src_payload jsonb;
  installment_count int;
  existing_invoice_count int;
  v_payload_total numeric;
  v_zone_subtotal numeric := 0;
  v_overhead_rate numeric := 0;
  v_vat_rate numeric := 0;
  v_withholding_rate numeric := 0;
  v_discount_type text;
  v_discount_value numeric := 0;
  v_discount_amount numeric := 0;
  v_subtotal_with_overhead numeric := 0;
  v_discounted_subtotal numeric := 0;
  v_show_overhead boolean := false;
  v_show_vat boolean := false;
  v_show_withholding boolean := false;
  v_calc_total numeric := 0;
  v_installments_total numeric := 0;
  v_paid_amount numeric;
BEGIN
  IF NEW.document_code IS NOT NULL AND btrim(NEW.document_code) <> '' THEN
    IF EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.document_code = NEW.document_code
        AND (NEW.id IS NULL OR d.id <> NEW.id)
    ) THEN
      RAISE EXCEPTION 'duplicate document_code: %', NEW.document_code
        USING ERRCODE = '23505';
    END IF;
  END IF;

  IF coalesce(NEW.manual_kind, '') <> 'manual_document' THEN
    RETURN NEW;
  END IF;

  payload := public.try_parse_jsonb(NEW.description);
  IF payload IS NULL THEN
    RAISE EXCEPTION 'manual_document must include valid JSON payload'
      USING ERRCODE = '23514';
  END IF;

  v_payload_total := public.try_parse_numeric(payload ->> 'total');
  IF v_payload_total IS NULL OR v_payload_total < 0 THEN
    RAISE EXCEPTION 'manual_document total must be a non-negative number'
      USING ERRCODE = '23514';
  END IF;

  SELECT coalesce(sum(
    coalesce(public.try_parse_numeric(item ->> 'quantity'), 0)
    * (
      coalesce(public.try_parse_numeric(item ->> 'unit_price_material'), 0)
      + coalesce(public.try_parse_numeric(item ->> 'unit_price_labor'), 0)
    )
  ), 0)
  INTO v_zone_subtotal
  FROM jsonb_array_elements(coalesce(payload -> 'zones', '[]'::jsonb)) AS zone
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(zone -> 'categories', '[]'::jsonb)) AS category
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(category -> 'items', '[]'::jsonb)) AS item;

  v_overhead_rate := coalesce(public.try_parse_numeric(payload ->> 'overhead_rate'), 0);
  v_vat_rate := coalesce(public.try_parse_numeric(payload ->> 'vat_rate'), 0);
  v_withholding_rate := coalesce(public.try_parse_numeric(payload ->> 'withholding_tax_rate'), 0);
  v_discount_type := lower(nullif(btrim(coalesce(payload ->> 'discount_type', '')), ''));
  v_show_overhead := lower(coalesce(payload ->> 'show_overhead', 'false')) IN ('1', 't', 'true', 'yes', 'y');
  v_show_vat := lower(coalesce(payload ->> 'show_vat', 'false')) IN ('1', 't', 'true', 'yes', 'y');
  v_show_withholding := lower(coalesce(payload ->> 'show_withholding_tax', 'false')) IN ('1', 't', 'true', 'yes', 'y');
  
  -- NEW: support for global_labor
  v_show_global_labor := lower(coalesce(payload ->> 'show_global_labor', 'false')) IN ('1', 't', 'true', 'yes', 'y');
  v_global_labor_rate := coalesce(public.try_parse_numeric(payload ->> 'global_labor_rate'), 0);

  v_calc_total := v_zone_subtotal;
  IF v_show_overhead THEN
    v_calc_total := v_calc_total + (v_zone_subtotal * v_overhead_rate / 100.0);
  END IF;
  
  -- NEW: calculate global labor amount
  IF v_show_global_labor THEN
    v_calc_total := v_calc_total + (v_zone_subtotal * v_global_labor_rate / 100.0);
  END IF;

  v_subtotal_with_overhead := v_calc_total;

  IF v_discount_type = 'percent' THEN
    v_discount_value := least(greatest(coalesce(public.try_parse_numeric(payload ->> 'discount_value'), 0), 0), 100);
    v_discount_amount := least(v_subtotal_with_overhead * v_discount_value / 100.0, v_subtotal_with_overhead);
  ELSE
    v_discount_value := greatest(
      coalesce(
        public.try_parse_numeric(payload ->> 'discount_value'),
        public.try_parse_numeric(payload ->> 'discount_amount'),
        0
      ),
      0
    );
    v_discount_amount := least(v_discount_value, v_subtotal_with_overhead);
  END IF;

  v_discounted_subtotal := greatest(v_subtotal_with_overhead - v_discount_amount, 0);
  v_calc_total := v_discounted_subtotal;

  IF v_show_vat THEN
    v_calc_total := v_calc_total + (v_calc_total * v_vat_rate / 100.0);
  END IF;
  IF v_show_withholding THEN
    v_calc_total := v_calc_total - (v_calc_total * v_withholding_rate / 100.0);
  END IF;

  IF NEW.type = 'receipt' THEN
    IF v_payload_total <= 0 THEN
      RAISE EXCEPTION 'receipt total must be greater than 0'
        USING ERRCODE = '23514';
    END IF;

    IF v_calc_total > 0 AND v_payload_total > v_calc_total + 0.05 THEN
      RAISE EXCEPTION 'receipt total exceeds calculated source amount: payload=% calculated=%', v_payload_total, v_calc_total
        USING ERRCODE = '23514';
    END IF;
  ELSE
    IF v_calc_total > 0 AND abs(v_payload_total - v_calc_total) > 0.05 THEN
      RAISE EXCEPTION 'manual_document total mismatch: payload=% calculated=%', v_payload_total, v_calc_total
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.type = 'invoice' AND jsonb_typeof(payload -> 'installments') = 'array' THEN
    SELECT coalesce(sum(coalesce(public.try_parse_numeric(it ->> 'amount'), 0)), 0)
    INTO v_installments_total
    FROM jsonb_array_elements(payload -> 'installments') AS it;

    IF v_installments_total > 0 AND abs(v_installments_total - v_payload_total) > 0.05 THEN
      RAISE EXCEPTION 'installment sum mismatch: installments=% total=%', v_installments_total, v_payload_total
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.type IN ('invoice', 'receipt') THEN
    v_paid_amount := public.try_parse_numeric(payload ->> 'paid_amount');
    IF v_paid_amount IS NOT NULL THEN
      IF v_paid_amount < 0 THEN
        RAISE EXCEPTION 'paid_amount must be non-negative'
          USING ERRCODE = '23514';
      END IF;

      IF NEW.type = 'receipt' AND abs(v_paid_amount - v_payload_total) > 0.05 THEN
        RAISE EXCEPTION 'receipt paid_amount must match receipt total: paid=% total=%', v_paid_amount, v_payload_total
          USING ERRCODE = '23514';
      END IF;

      IF v_paid_amount > v_payload_total + 0.05 THEN
        RAISE EXCEPTION 'paid_amount exceeds total: paid=% total=%', v_paid_amount, v_payload_total
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  IF NEW.type = 'quotation' THEN
    IF NEW.source_document_id IS NOT NULL THEN
      RAISE EXCEPTION 'quotation must not reference source_document_id'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.type = 'invoice' THEN
    IF NEW.source_document_id IS NULL THEN
      RAISE EXCEPTION 'invoice must reference source quotation'
        USING ERRCODE = '23514';
    END IF;

    SELECT d.type, public.try_parse_jsonb(d.description)
    INTO src_type, src_payload
    FROM public.documents d
    WHERE d.id = NEW.source_document_id;

    IF src_type IS NULL THEN
      RAISE EXCEPTION 'source document not found for invoice'
        USING ERRCODE = '23503';
    END IF;

    IF src_type <> 'quotation' THEN
      RAISE EXCEPTION 'invoice source must be quotation, got %', src_type
        USING ERRCODE = '23514';
    END IF;

    installment_count := coalesce(jsonb_array_length(src_payload -> 'installments'), 0);

    SELECT count(*) INTO existing_invoice_count
    FROM public.documents d
    WHERE d.type = 'invoice'
      AND d.source_document_id = NEW.source_document_id
      AND (NEW.id IS NULL OR d.id <> NEW.id);

    IF installment_count > 0 THEN
      IF existing_invoice_count >= installment_count THEN
        RAISE EXCEPTION 'all % installment invoices already issued for quotation %',
          installment_count, NEW.source_document_id
          USING ERRCODE = '23505';
      END IF;
    ELSE
      IF existing_invoice_count > 0 THEN
        RAISE EXCEPTION 'duplicate invoice for quotation source_document_id=%', NEW.source_document_id
          USING ERRCODE = '23505';
      END IF;
    END IF;

  ELSIF NEW.type = 'receipt' THEN
    IF NEW.source_document_id IS NULL THEN
      RAISE EXCEPTION 'receipt must reference source invoice'
        USING ERRCODE = '23514';
    END IF;

    SELECT d.type INTO src_type
    FROM public.documents d
    WHERE d.id = NEW.source_document_id;

    IF src_type IS NULL THEN
      RAISE EXCEPTION 'source document not found for receipt'
        USING ERRCODE = '23503';
    END IF;

    IF src_type <> 'invoice' THEN
      RAISE EXCEPTION 'receipt source must be invoice, got %', src_type
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.type = 'receipt'
        AND d.source_document_id = NEW.source_document_id
        AND (NEW.id IS NULL OR d.id <> NEW.id)
    ) THEN
      RAISE EXCEPTION 'duplicate receipt for invoice source_document_id=%', NEW.source_document_id
        USING ERRCODE = '23505';
    END IF;
  ELSIF NEW.type = 'plant_material' THEN
    IF NEW.source_document_id IS NULL THEN
      RAISE EXCEPTION 'plant_material must reference source quotation'
        USING ERRCODE = '23514';
    END IF;

    SELECT d.type INTO src_type
    FROM public.documents d
    WHERE d.id = NEW.source_document_id;

    IF src_type IS NULL THEN
      RAISE EXCEPTION 'source document not found for plant_material'
        USING ERRCODE = '23503';
    END IF;

    IF src_type <> 'quotation' THEN
      RAISE EXCEPTION 'plant_material source must be quotation, got %', src_type
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.type = 'plant_material'
        AND d.source_document_id = NEW.source_document_id
        AND (NEW.id IS NULL OR d.id <> NEW.id)
    ) THEN
      RAISE EXCEPTION 'duplicate plant_material for quotation source_document_id=%', NEW.source_document_id
        USING ERRCODE = '23505';
    END IF;
  ELSIF NEW.type = 'contract' THEN
    IF NEW.source_document_id IS NULL THEN
      RAISE EXCEPTION 'contract must reference source invoice'
        USING ERRCODE = '23514';
    END IF;

    SELECT d.type INTO src_type
    FROM public.documents d
    WHERE d.id = NEW.source_document_id;

    IF src_type IS NULL THEN
      RAISE EXCEPTION 'source document not found for contract'
        USING ERRCODE = '23503';
    END IF;

    IF src_type <> 'invoice' THEN
      RAISE EXCEPTION 'contract source must be invoice, got %', src_type
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_documents_20_validate_chain ON public.documents;
CREATE TRIGGER trg_documents_20_validate_chain
BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.validate_documents_business_rules();

CREATE OR REPLACE FUNCTION public.prevent_delete_referenced_documents()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.source_document_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'cannot delete document %: referenced by downstream documents', OLD.id
      USING ERRCODE = '23503';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_documents_30_prevent_delete_referenced ON public.documents;
CREATE TRIGGER trg_documents_30_prevent_delete_referenced
BEFORE DELETE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.prevent_delete_referenced_documents();

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff/Admin can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;

CREATE POLICY "Staff/Admin can read audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

CREATE POLICY "Authenticated can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;

-- =========================================================
-- 5) WORKSHOP BOOKINGS + PAYMENTS
-- =========================================================
create table if not exists public.workshop_bookings (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  topic text,
  attendees_count int not null default 1,
  date date not null,
  start_time time not null,
  end_time time not null,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Keep workshop_bookings aligned with latest migration (safe if columns already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workshop_bookings' AND column_name='attendees_count'
  ) THEN
    ALTER TABLE public.workshop_bookings ADD COLUMN attendees_count INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workshop_bookings' AND column_name='status'
  ) THEN
    ALTER TABLE public.workshop_bookings ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workshop_bookings' AND column_name='topic'
  ) THEN
    ALTER TABLE public.workshop_bookings ADD COLUMN topic TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workshop_bookings' AND column_name='notes'
  ) THEN
    ALTER TABLE public.workshop_bookings ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workshop_bookings' AND column_name='phone'
  ) THEN
    ALTER TABLE public.workshop_bookings ADD COLUMN phone TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name='workshop_bookings_attendees_count_positive'
  ) THEN
    ALTER TABLE public.workshop_bookings
      ADD CONSTRAINT workshop_bookings_attendees_count_positive
      CHECK (attendees_count > 0);
  END IF;
END $$;

UPDATE public.workshop_bookings
SET attendees_count = 1
WHERE attendees_count IS NULL;

UPDATE public.workshop_bookings
SET status = 'pending'
WHERE status IS NULL;

create index if not exists idx_workshop_bookings_date on public.workshop_bookings(date, start_time);
create index if not exists idx_workshop_bookings_status on public.workshop_bookings(status);

create table if not exists public.workshop_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.workshop_bookings(id) on delete cascade,
  provider text not null default 'unknown',
  provider_charge_id text,
  amount decimal(10,2) not null,
  currency text default 'THB',
  status text default 'pending',
  payer_email text,
  paid_at timestamptz,
  payment_data jsonb,
  client_token text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workshop_payments' AND column_name='client_token'
  ) THEN
    ALTER TABLE public.workshop_payments ADD COLUMN client_token TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workshop_payments' AND column_name='updated_at'
  ) THEN
    ALTER TABLE public.workshop_payments ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workshop_payments' AND column_name='payment_data'
  ) THEN
    ALTER TABLE public.workshop_payments ADD COLUMN payment_data jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name='workshop_payments_amount_positive'
  ) THEN
    ALTER TABLE public.workshop_payments
      ADD CONSTRAINT workshop_payments_amount_positive
      CHECK (amount > 0);
  END IF;
END $$;

create index if not exists idx_workshop_payments_booking_id on public.workshop_payments(booking_id);
create index if not exists idx_workshop_payments_status on public.workshop_payments(status);
create index if not exists idx_workshop_payments_provider_charge_id on public.workshop_payments(provider_charge_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename='workshop_payments' AND indexname='uniq_workshop_payments_client_token'
  ) THEN
    CREATE UNIQUE INDEX uniq_workshop_payments_client_token
      ON public.workshop_payments(client_token)
      WHERE client_token IS NOT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_workshop_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_workshop_payments_updated_at_trigger ON public.workshop_payments;
CREATE TRIGGER update_workshop_payments_updated_at_trigger
  BEFORE UPDATE ON public.workshop_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workshop_payments_updated_at();

alter table public.workshop_bookings enable row level security;
alter table public.workshop_payments enable row level security;

DROP POLICY IF EXISTS "Allow public access to workshop_bookings" ON public.workshop_bookings;
DROP POLICY IF EXISTS "Allow public access to workshop_payments" ON public.workshop_payments;
DROP POLICY IF EXISTS "Allow all operations on workshop_bookings" ON public.workshop_bookings;
DROP POLICY IF EXISTS "Allow all operations on workshop_payments" ON public.workshop_payments;

DROP POLICY IF EXISTS "Anon can insert bookings" ON public.workshop_bookings;
DROP POLICY IF EXISTS "Authenticated can insert workshop bookings" ON public.workshop_bookings;
DROP POLICY IF EXISTS "Anon can insert workshop payments" ON public.workshop_payments;
DROP POLICY IF EXISTS "Authenticated can insert workshop payments" ON public.workshop_payments;
DROP POLICY IF EXISTS "Anon can select workshop bookings" ON public.workshop_bookings;
DROP POLICY IF EXISTS "Anon can update workshop bookings" ON public.workshop_bookings;
DROP POLICY IF EXISTS "Authenticated can read workshop bookings" ON public.workshop_bookings;
DROP POLICY IF EXISTS "Staff/Admin can read workshop bookings" ON public.workshop_bookings;
DROP POLICY IF EXISTS "Anon can select workshop payments" ON public.workshop_payments;
DROP POLICY IF EXISTS "Anon can update workshop payments" ON public.workshop_payments;
DROP POLICY IF EXISTS "Authenticated can read workshop payments" ON public.workshop_payments;
DROP POLICY IF EXISTS "Staff/Admin can read workshop payments" ON public.workshop_payments;
DROP POLICY IF EXISTS "Staff/Admin can update workshop bookings" ON public.workshop_bookings;
DROP POLICY IF EXISTS "Staff/Admin can update workshop payments" ON public.workshop_payments;

REVOKE ALL ON TABLE public.workshop_bookings FROM anon;
REVOKE ALL ON TABLE public.workshop_payments FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.workshop_bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.workshop_payments TO authenticated;

-- Public booking should go through server APIs using service_role.
-- Keep authenticated insert for internal/manual operations.
CREATE POLICY "Staff/Admin can read workshop bookings"
  ON public.workshop_bookings
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

CREATE POLICY "Staff/Admin can read workshop payments"
  ON public.workshop_payments
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

-- Optional: authenticated insert for internal flows
CREATE POLICY "Authenticated can insert workshop bookings"
  ON public.workshop_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert workshop payments"
  ON public.workshop_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff/Admin can update workshop bookings"
  ON public.workshop_bookings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Staff/Admin can update workshop payments"
  ON public.workshop_payments
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- =========================================================
-- 6) MARKETPLACE PLANTS
-- =========================================================
create table if not exists public.marketplace_plants (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  common_name text,
  scientific_name text,
  plant_family text,
  category text not null,
  description text,
  size_label text,
  height_cm numeric(10,2),
  canopy_width_cm numeric(10,2),
  trunk_diameter_inch numeric(10,2),
  tree_height_label text,
  shrub_spacing_cm numeric(10,2),
  sunlight_requirement text,
  watering_requirement text,
  soil_requirement text,
  maintenance_level text,
  growth_rate text,
  pet_friendly boolean not null default false,
  care_tips text,
  notes text,
  feature_tags text[] not null default '{}',
  price numeric(12,2) not null default 0,
  stock_quantity integer not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketplace_plants add column if not exists sku text;
alter table public.marketplace_plants add column if not exists name text;
alter table public.marketplace_plants add column if not exists common_name text;
alter table public.marketplace_plants add column if not exists scientific_name text;
alter table public.marketplace_plants add column if not exists plant_family text;
alter table public.marketplace_plants add column if not exists category text;
alter table public.marketplace_plants add column if not exists description text;
alter table public.marketplace_plants add column if not exists size_label text;
alter table public.marketplace_plants add column if not exists height_cm numeric(10,2);
alter table public.marketplace_plants add column if not exists canopy_width_cm numeric(10,2);
alter table public.marketplace_plants add column if not exists trunk_diameter_inch numeric(10,2);
alter table public.marketplace_plants add column if not exists tree_height_label text;
alter table public.marketplace_plants add column if not exists shrub_spacing_cm numeric(10,2);
alter table public.marketplace_plants add column if not exists sunlight_requirement text;
alter table public.marketplace_plants add column if not exists watering_requirement text;
alter table public.marketplace_plants add column if not exists soil_requirement text;
alter table public.marketplace_plants add column if not exists maintenance_level text;
alter table public.marketplace_plants add column if not exists growth_rate text;
alter table public.marketplace_plants add column if not exists pet_friendly boolean not null default false;
alter table public.marketplace_plants add column if not exists care_tips text;
alter table public.marketplace_plants add column if not exists notes text;
alter table public.marketplace_plants add column if not exists feature_tags text[] not null default '{}';
alter table public.marketplace_plants add column if not exists price numeric(12,2) not null default 0;
alter table public.marketplace_plants add column if not exists stock_quantity integer not null default 0;
alter table public.marketplace_plants add column if not exists image_url text;
alter table public.marketplace_plants add column if not exists is_active boolean not null default true;
alter table public.marketplace_plants add column if not exists created_at timestamptz not null default now();
alter table public.marketplace_plants add column if not exists updated_at timestamptz not null default now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'marketplace_plants_category_check'
      AND conrelid = 'public.marketplace_plants'::regclass
  ) THEN
    ALTER TABLE public.marketplace_plants
      ADD CONSTRAINT marketplace_plants_category_check
      CHECK (category IN ('PALMS', 'TREES', 'SHRUBS', 'ALL'))
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'marketplace_plants_maintenance_level_check'
      AND conrelid = 'public.marketplace_plants'::regclass
  ) THEN
    ALTER TABLE public.marketplace_plants
      ADD CONSTRAINT marketplace_plants_maintenance_level_check
      CHECK (maintenance_level IS NULL OR maintenance_level IN ('low', 'medium', 'high'))
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'marketplace_plants_growth_rate_check'
      AND conrelid = 'public.marketplace_plants'::regclass
  ) THEN
    ALTER TABLE public.marketplace_plants
      ADD CONSTRAINT marketplace_plants_growth_rate_check
      CHECK (growth_rate IS NULL OR growth_rate IN ('slow', 'moderate', 'fast'))
      NOT VALID;
  END IF;
END $$;

create index if not exists idx_marketplace_plants_category on public.marketplace_plants(category);
create index if not exists idx_marketplace_plants_active on public.marketplace_plants(is_active);
create index if not exists idx_marketplace_plants_name on public.marketplace_plants(name);

CREATE OR REPLACE FUNCTION public.update_marketplace_plants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_marketplace_plants_updated_at_trigger ON public.marketplace_plants;
CREATE TRIGGER update_marketplace_plants_updated_at_trigger
  BEFORE UPDATE ON public.marketplace_plants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketplace_plants_updated_at();

alter table public.marketplace_plants enable row level security;

DROP POLICY IF EXISTS "Authenticated can read active marketplace plants" ON public.marketplace_plants;
DROP POLICY IF EXISTS "Admin can read all marketplace plants" ON public.marketplace_plants;
DROP POLICY IF EXISTS "Staff/Admin can write marketplace plants" ON public.marketplace_plants;
DROP POLICY IF EXISTS "Admin can write marketplace plants" ON public.marketplace_plants;

CREATE POLICY "Authenticated can read active marketplace plants"
  ON public.marketplace_plants
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin can read all marketplace plants"
  ON public.marketplace_plants
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin can write marketplace plants"
  ON public.marketplace_plants
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.marketplace_plants TO authenticated;

insert into public.marketplace_plants (
  sku,
  name,
  common_name,
  category,
  size_label,
  price,
  stock_quantity,
  image_url,
  is_active
)
values
  ('PALM-001', 'WASHINGTONIA ROBUSTA', 'MEXICAN FAN PALM', 'PALMS', 'H 2.0-3.0 M / Ø 30-50 CM', 12500, 12, 'https://images.unsplash.com/photo-1596223575327-99a5ae4f17ee?q=80&w=600&auto=format&fit=crop', true),
  ('PALM-002', 'JUBAEA CHILENSIS', 'CHILEAN WINE PALM', 'PALMS', 'H 1.0-2.5 M / Ø 10-150 CM', 27500, 6, 'https://images.unsplash.com/photo-1497250681558-472018890259?q=80&w=600&auto=format&fit=crop', true),
  ('PALM-003', 'SYAGRUS ROMANZOFFIANA', 'QUEEN PALM', 'PALMS', 'H 1.5-2.0 M / Ø 30-50 CM', 17500, 9, 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=600&auto=format&fit=crop', true),
  ('SHRB-001', 'DIOON EDULE', 'MEXICAN CYCAD', 'SHRUBS', 'H 1.8-2.5 M', 7950, 15, 'https://images.unsplash.com/photo-1508344928928-7137b29de216?q=80&w=600&auto=format&fit=crop', true)
on conflict (sku) do update
set
  name = excluded.name,
  common_name = excluded.common_name,
  category = excluded.category,
  size_label = excluded.size_label,
  price = excluded.price,
  stock_quantity = excluded.stock_quantity,
  image_url = excluded.image_url,
  is_active = excluded.is_active,
  updated_at = now();

-- =========================================================
-- 6.5) MARKETPLACE CART
-- =========================================================
create table if not exists public.marketplace_cart_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  plant_id uuid not null,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketplace_cart_items add column if not exists customer_id uuid;
alter table public.marketplace_cart_items add column if not exists plant_id uuid;
alter table public.marketplace_cart_items add column if not exists quantity integer not null default 1;
alter table public.marketplace_cart_items add column if not exists created_at timestamptz not null default now();
alter table public.marketplace_cart_items add column if not exists updated_at timestamptz not null default now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'marketplace_cart_items_quantity_check'
      AND conrelid = 'public.marketplace_cart_items'::regclass
  ) THEN
    ALTER TABLE public.marketplace_cart_items
      ADD CONSTRAINT marketplace_cart_items_quantity_check
      CHECK (quantity > 0)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'marketplace_cart_items_customer_id_fkey'
  ) THEN
    ALTER TABLE public.marketplace_cart_items
      ADD CONSTRAINT marketplace_cart_items_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'marketplace_cart_items_plant_id_fkey'
  ) THEN
    ALTER TABLE public.marketplace_cart_items
      ADD CONSTRAINT marketplace_cart_items_plant_id_fkey
      FOREIGN KEY (plant_id) REFERENCES public.marketplace_plants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'marketplace_cart_items_customer_plant_key'
      AND conrelid = 'public.marketplace_cart_items'::regclass
  ) THEN
    ALTER TABLE public.marketplace_cart_items
      ADD CONSTRAINT marketplace_cart_items_customer_plant_key
      UNIQUE (customer_id, plant_id);
  END IF;
END $$;

create index if not exists idx_marketplace_cart_customer on public.marketplace_cart_items(customer_id, updated_at desc);
create index if not exists idx_marketplace_cart_plant on public.marketplace_cart_items(plant_id);

CREATE OR REPLACE FUNCTION public.update_marketplace_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_marketplace_cart_items_updated_at_trigger ON public.marketplace_cart_items;
CREATE TRIGGER update_marketplace_cart_items_updated_at_trigger
  BEFORE UPDATE ON public.marketplace_cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketplace_cart_items_updated_at();

alter table public.marketplace_cart_items enable row level security;

DROP POLICY IF EXISTS "Customers can read own marketplace cart" ON public.marketplace_cart_items;
DROP POLICY IF EXISTS "Customers can insert own marketplace cart" ON public.marketplace_cart_items;
DROP POLICY IF EXISTS "Customers can update own marketplace cart" ON public.marketplace_cart_items;
DROP POLICY IF EXISTS "Customers can delete own marketplace cart" ON public.marketplace_cart_items;
DROP POLICY IF EXISTS "Staff/Admin can read marketplace carts" ON public.marketplace_cart_items;

CREATE POLICY "Customers can read own marketplace cart"
  ON public.marketplace_cart_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own marketplace cart"
  ON public.marketplace_cart_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own marketplace cart"
  ON public.marketplace_cart_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can delete own marketplace cart"
  ON public.marketplace_cart_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Staff/Admin can read marketplace carts"
  ON public.marketplace_cart_items
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.marketplace_cart_items TO authenticated;


-- Create system_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Init default settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
(
  'company_info', 
  '{
    "name_th": "บริษัท เอ็กซ์วายแอล แลนด์สเคป จำกัด",
    "name_en": "XYLEM LANDSCAPE CO., LTD.",
    "address": "158/13-14 หมู่บ้าน บ้านสวนพรีเมียร์ หมู่ที่ 6 ต.หนองจ๊อม อ.สันทราย จ.เชียงใหม่",
    "tax_id": "0505567008779",
    "phone": "02-123-4567",
    "email": "contact@xylem.co.th",
    "logo_url": ""
  }',
  'Basic company information for documents'
),
(
  'financial_info', 
  '{
    "bank_name": "ธนาคารกสิกรไทย",
    "account_no": "180-3-31959-5",
    "account_name": "บจก. เอ็กซ์วายแอล แลนด์สเคป",
    "branch": "สาขาสันทราย",
    "promptpay_id": ""
  }',
  'Bank account details for invoices/receipts'
),
(
  'features', 
  '{
    "marketplace_enabled": true,
    "service_booking_enabled": true,
    "new_user_registration": true,
    "maintenance_mode": false
  }',
  'System feature toggles'
)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings (public info)
DROP POLICY IF EXISTS "Public read settings" ON public.system_settings;
CREATE POLICY "Public read settings" ON public.system_settings
  FOR SELECT USING (true);

-- Allow admins full access
DROP POLICY IF EXISTS "Admins full access" ON public.system_settings;
CREATE POLICY "Admins full access" ON public.system_settings
  USING (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- =========================================================
-- 8) DOCUMENT ITEM CATALOG (Reusable scientific name/size/pricing)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.document_item_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  english_name text NOT NULL DEFAULT '',
  scientific_name text NOT NULL DEFAULT '',
  size_label text NOT NULL DEFAULT '',
  main_category text NOT NULL DEFAULT 'other',
  subcategory text NOT NULL DEFAULT 'general',
  item_category text NOT NULL DEFAULT 'other',
  size_mode text NOT NULL DEFAULT 'other',
  unit text NOT NULL DEFAULT 'หน่วย',
  material_price numeric(12,2) NOT NULL DEFAULT 0,
  labor_price numeric(12,2) NOT NULL DEFAULT 0,
  image_url text,
  normalized_name text NOT NULL DEFAULT '',
  normalized_english_name text NOT NULL DEFAULT '',
  normalized_scientific_name text NOT NULL DEFAULT '',
  normalized_size_label text NOT NULL DEFAULT '',
  normalized_unit text NOT NULL DEFAULT '',
  last_total_price numeric(12,2) NOT NULL DEFAULT 0,
  usage_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_item_catalog
  ADD COLUMN IF NOT EXISTS english_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS main_category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS subcategory text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS item_category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS size_mode text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS normalized_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS normalized_english_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS normalized_scientific_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS normalized_size_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS normalized_unit text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_item_catalog_size_mode_check'
      AND conrelid = 'public.document_item_catalog'::regclass
  ) THEN
    ALTER TABLE public.document_item_catalog
      ADD CONSTRAINT document_item_catalog_size_mode_check
      CHECK (size_mode IN ('tree', 'shrub', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_item_catalog_main_category_check'
      AND conrelid = 'public.document_item_catalog'::regclass
  ) THEN
    ALTER TABLE public.document_item_catalog
      ADD CONSTRAINT document_item_catalog_main_category_check
      CHECK (main_category IN ('softscape', 'hardscape', 'service', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_item_catalog_subcategory_check'
      AND conrelid = 'public.document_item_catalog'::regclass
  ) THEN
    ALTER TABLE public.document_item_catalog
      ADD CONSTRAINT document_item_catalog_subcategory_check
      CHECK (subcategory IN ('tree', 'palm', 'shrub', 'groundcover', 'grass', 'pathway', 'stone', 'decor', 'structure', 'planting', 'maintenance', 'installation', 'general_service', 'general'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_item_catalog_item_category_check'
      AND conrelid = 'public.document_item_catalog'::regclass
  ) THEN
    ALTER TABLE public.document_item_catalog
      ADD CONSTRAINT document_item_catalog_item_category_check
      CHECK (item_category IN ('tree', 'palm', 'shrub', 'material', 'other'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_document_item_catalog_lookup
  ON public.document_item_catalog (item_name, scientific_name, size_label, unit);

DROP INDEX IF EXISTS public.uq_document_item_catalog_variant_norm;
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_item_catalog_variant_norm_v2
  ON public.document_item_catalog (
    normalized_name,
    normalized_english_name,
    normalized_scientific_name,
    item_category,
    size_mode,
    normalized_size_label,
    normalized_unit
  );

CREATE INDEX IF NOT EXISTS idx_document_item_catalog_species_norm
  ON public.document_item_catalog (normalized_name, normalized_english_name, normalized_scientific_name);

CREATE INDEX IF NOT EXISTS idx_document_item_catalog_updated_at
  ON public.document_item_catalog (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_item_catalog_item_category
  ON public.document_item_catalog (item_category, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_item_catalog_main_category
  ON public.document_item_catalog (main_category, subcategory, updated_at DESC);

CREATE OR REPLACE FUNCTION public.sync_document_item_catalog_on_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.item_name := btrim(coalesce(NEW.item_name, ''));
  NEW.english_name := btrim(coalesce(NEW.english_name, ''));
  NEW.scientific_name := btrim(coalesce(NEW.scientific_name, ''));
  NEW.size_label := btrim(coalesce(NEW.size_label, ''));
  NEW.unit := btrim(coalesce(NEW.unit, 'หน่วย'));
  NEW.main_category := lower(btrim(coalesce(NEW.main_category, 'other')));
  NEW.subcategory := lower(btrim(coalesce(NEW.subcategory, 'general')));
  NEW.item_category := lower(btrim(coalesce(NEW.item_category, 'other')));
  NEW.size_mode := lower(btrim(coalesce(NEW.size_mode, 'other')));

  IF NEW.item_category NOT IN ('tree', 'palm', 'shrub', 'material', 'other') THEN
    NEW.item_category := CASE
      WHEN NEW.size_mode = 'tree' THEN 'tree'
      WHEN NEW.size_mode = 'shrub' THEN 'shrub'
      ELSE 'other'
    END;
  END IF;

  IF NEW.size_mode NOT IN ('tree', 'shrub', 'other') THEN
    NEW.size_mode := 'other';
  END IF;

  IF NEW.main_category NOT IN ('softscape', 'hardscape', 'service', 'other') THEN
    NEW.main_category := CASE
      WHEN NEW.item_category IN ('tree', 'palm', 'shrub') OR NEW.size_mode IN ('tree', 'shrub') THEN 'softscape'
      WHEN NEW.item_category = 'material' THEN 'hardscape'
      ELSE 'other'
    END;
  END IF;

  IF NEW.subcategory NOT IN ('tree', 'palm', 'shrub', 'groundcover', 'grass', 'pathway', 'stone', 'decor', 'structure', 'planting', 'maintenance', 'installation', 'general_service', 'general') THEN
    NEW.subcategory := CASE
      WHEN NEW.main_category = 'softscape' AND NEW.item_category = 'palm' THEN 'palm'
      WHEN NEW.main_category = 'softscape' AND (NEW.item_category = 'tree' OR NEW.size_mode = 'tree') THEN 'tree'
      WHEN NEW.main_category = 'softscape' AND (NEW.item_category = 'shrub' OR NEW.size_mode = 'shrub') THEN 'shrub'
      WHEN NEW.main_category = 'hardscape' AND NEW.item_category = 'material' THEN 'stone'
      WHEN NEW.main_category = 'service' THEN 'general_service'
      ELSE 'general'
    END;
  END IF;

  NEW.normalized_name := public.normalize_text(NEW.item_name);
  NEW.normalized_english_name := public.normalize_text(NEW.english_name);
  NEW.normalized_scientific_name := public.normalize_text(NEW.scientific_name);
  NEW.normalized_size_label := public.normalize_text(NEW.size_label);
  NEW.normalized_unit := public.normalize_text(NEW.unit);

  NEW.updated_at = now();
  IF TG_OP = 'INSERT' THEN
    NEW.usage_count = GREATEST(COALESCE(NEW.usage_count, 1), 1);
  ELSE
    NEW.usage_count = COALESCE(OLD.usage_count, 0) + 1;
  END IF;
  NEW.last_total_price = COALESCE(NEW.material_price, 0) + COALESCE(NEW.labor_price, 0);
  RETURN NEW;
END;
$$;

UPDATE public.document_item_catalog
SET
  english_name = btrim(coalesce(english_name, '')),
  scientific_name = btrim(coalesce(scientific_name, '')),
  size_label = btrim(coalesce(size_label, '')),
  main_category = CASE
    WHEN lower(btrim(coalesce(main_category, ''))) IN ('softscape', 'hardscape', 'service', 'other') THEN lower(btrim(coalesce(main_category, '')))
    WHEN lower(btrim(coalesce(item_category, ''))) IN ('tree', 'palm', 'shrub') OR lower(btrim(coalesce(size_mode, 'other'))) IN ('tree', 'shrub') THEN 'softscape'
    WHEN lower(btrim(coalesce(item_category, ''))) = 'material' THEN 'hardscape'
    ELSE 'other'
  END,
  subcategory = CASE
    WHEN lower(btrim(coalesce(subcategory, ''))) IN ('tree', 'palm', 'shrub', 'groundcover', 'grass', 'pathway', 'stone', 'decor', 'structure', 'planting', 'maintenance', 'installation', 'general_service', 'general') THEN lower(btrim(coalesce(subcategory, '')))
    WHEN lower(btrim(coalesce(main_category, ''))) = 'service' THEN 'general_service'
    WHEN lower(btrim(coalesce(item_category, ''))) = 'palm' THEN 'palm'
    WHEN lower(btrim(coalesce(item_category, ''))) = 'tree' OR lower(btrim(coalesce(size_mode, 'other'))) = 'tree' THEN 'tree'
    WHEN lower(btrim(coalesce(item_category, ''))) = 'shrub' OR lower(btrim(coalesce(size_mode, 'other'))) = 'shrub' THEN 'shrub'
    WHEN lower(btrim(coalesce(item_category, ''))) = 'material' THEN 'stone'
    ELSE 'general'
  END,
  item_category = CASE
    WHEN lower(btrim(coalesce(item_category, ''))) IN ('tree', 'palm', 'shrub', 'material', 'other') THEN lower(btrim(coalesce(item_category, '')))
    WHEN lower(btrim(coalesce(size_mode, 'other'))) = 'tree' THEN 'tree'
    WHEN lower(btrim(coalesce(size_mode, 'other'))) = 'shrub' THEN 'shrub'
    ELSE 'other'
  END,
  size_mode = lower(btrim(coalesce(size_mode, 'other'))),
  unit = btrim(coalesce(unit, 'หน่วย')),
  normalized_name = public.normalize_text(item_name),
  normalized_english_name = public.normalize_text(english_name),
  normalized_scientific_name = public.normalize_text(scientific_name),
  normalized_size_label = public.normalize_text(size_label),
  normalized_unit = public.normalize_text(unit);

DROP TRIGGER IF EXISTS trg_document_item_catalog_on_update ON public.document_item_catalog;
CREATE TRIGGER trg_document_item_catalog_on_update
BEFORE INSERT OR UPDATE ON public.document_item_catalog
FOR EACH ROW
EXECUTE FUNCTION public.sync_document_item_catalog_on_write();

ALTER TABLE public.document_item_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read item catalog" ON public.document_item_catalog;
CREATE POLICY "Authenticated read item catalog" ON public.document_item_catalog
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated upsert item catalog" ON public.document_item_catalog;
CREATE POLICY "Authenticated upsert item catalog" ON public.document_item_catalog
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update item catalog" ON public.document_item_catalog;
CREATE POLICY "Authenticated update item catalog" ON public.document_item_catalog
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins delete item catalog" ON public.document_item_catalog;
CREATE POLICY "Admins delete item catalog" ON public.document_item_catalog
  FOR DELETE TO authenticated
  USING (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE ON TABLE public.document_item_catalog TO authenticated;
GRANT DELETE ON TABLE public.document_item_catalog TO authenticated;

-- =========================================================
-- 8.5) UNIFIED PLANT LIBRARY (Shared source for quotation + marketplace)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.plant_library_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_name text NOT NULL,
  english_name text NOT NULL DEFAULT '',
  scientific_name text NOT NULL DEFAULT '',
  plant_family text,
  category text NOT NULL DEFAULT 'ALL',
  description text,
  sunlight_requirement text,
  watering_requirement text,
  soil_requirement text,
  maintenance_level text,
  growth_rate text,
  pet_friendly boolean NOT NULL DEFAULT false,
  care_tips text,
  notes text,
  feature_tags text[] NOT NULL DEFAULT '{}',
  normalized_primary_name text NOT NULL DEFAULT '',
  normalized_english_name text NOT NULL DEFAULT '',
  normalized_scientific_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plant_library_entries
  ADD COLUMN IF NOT EXISTS primary_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS english_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS scientific_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS plant_family text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS sunlight_requirement text,
  ADD COLUMN IF NOT EXISTS watering_requirement text,
  ADD COLUMN IF NOT EXISTS soil_requirement text,
  ADD COLUMN IF NOT EXISTS maintenance_level text,
  ADD COLUMN IF NOT EXISTS growth_rate text,
  ADD COLUMN IF NOT EXISTS pet_friendly boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS care_tips text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS feature_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS normalized_primary_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS normalized_english_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS normalized_scientific_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plant_library_entries_category_check'
      AND conrelid = 'public.plant_library_entries'::regclass
  ) THEN
    ALTER TABLE public.plant_library_entries
      ADD CONSTRAINT plant_library_entries_category_check
      CHECK (category IN ('PALMS', 'TREES', 'SHRUBS', 'ALL'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plant_library_entries_maintenance_level_check'
      AND conrelid = 'public.plant_library_entries'::regclass
  ) THEN
    ALTER TABLE public.plant_library_entries
      ADD CONSTRAINT plant_library_entries_maintenance_level_check
      CHECK (maintenance_level IS NULL OR maintenance_level IN ('low', 'medium', 'high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plant_library_entries_growth_rate_check'
      AND conrelid = 'public.plant_library_entries'::regclass
  ) THEN
    ALTER TABLE public.plant_library_entries
      ADD CONSTRAINT plant_library_entries_growth_rate_check
      CHECK (growth_rate IS NULL OR growth_rate IN ('slow', 'moderate', 'fast'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_plant_library_entries_primary_name
  ON public.plant_library_entries(normalized_primary_name);

CREATE INDEX IF NOT EXISTS idx_plant_library_entries_scientific_name
  ON public.plant_library_entries(normalized_scientific_name);

CREATE INDEX IF NOT EXISTS idx_plant_library_entries_category
  ON public.plant_library_entries(category);

CREATE TABLE IF NOT EXISTS public.plant_library_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_entry_id uuid NOT NULL REFERENCES public.plant_library_entries(id) ON DELETE CASCADE,
  size_label text NOT NULL DEFAULT '',
  item_category text NOT NULL DEFAULT 'other',
  size_mode text NOT NULL DEFAULT 'other',
  unit text NOT NULL DEFAULT 'ต้น',
  height_cm numeric(10,2),
  canopy_width_cm numeric(10,2),
  trunk_diameter_inch numeric(10,2),
  tree_height_label text,
  shrub_spacing_cm numeric(10,2),
  material_price numeric(12,2) NOT NULL DEFAULT 0,
  labor_price numeric(12,2) NOT NULL DEFAULT 0,
  marketplace_price numeric(12,2) NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  image_url text,
  is_marketplace_enabled boolean NOT NULL DEFAULT false,
  marketplace_active boolean NOT NULL DEFAULT false,
  marketplace_plant_id uuid,
  document_item_catalog_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plant_library_variants
  ADD COLUMN IF NOT EXISTS plant_entry_id uuid,
  ADD COLUMN IF NOT EXISTS size_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS item_category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS size_mode text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'ต้น',
  ADD COLUMN IF NOT EXISTS height_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS canopy_width_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS trunk_diameter_inch numeric(10,2),
  ADD COLUMN IF NOT EXISTS tree_height_label text,
  ADD COLUMN IF NOT EXISTS shrub_spacing_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS material_price numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_price numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketplace_price numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS is_marketplace_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketplace_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketplace_plant_id uuid,
  ADD COLUMN IF NOT EXISTS document_item_catalog_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plant_library_variants_item_category_check'
      AND conrelid = 'public.plant_library_variants'::regclass
  ) THEN
    ALTER TABLE public.plant_library_variants
      ADD CONSTRAINT plant_library_variants_item_category_check
      CHECK (item_category IN ('tree', 'palm', 'shrub', 'material', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plant_library_variants_size_mode_check'
      AND conrelid = 'public.plant_library_variants'::regclass
  ) THEN
    ALTER TABLE public.plant_library_variants
      ADD CONSTRAINT plant_library_variants_size_mode_check
      CHECK (size_mode IN ('tree', 'shrub', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plant_library_variants_marketplace_plant_id_fkey'
  ) THEN
    ALTER TABLE public.plant_library_variants
      ADD CONSTRAINT plant_library_variants_marketplace_plant_id_fkey
      FOREIGN KEY (marketplace_plant_id) REFERENCES public.marketplace_plants(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plant_library_variants_document_item_catalog_id_fkey'
  ) THEN
    ALTER TABLE public.plant_library_variants
      ADD CONSTRAINT plant_library_variants_document_item_catalog_id_fkey
      FOREIGN KEY (document_item_catalog_id) REFERENCES public.document_item_catalog(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP INDEX IF EXISTS public.uq_plant_library_variant_identity;
CREATE UNIQUE INDEX IF NOT EXISTS uq_plant_library_variant_identity_v2
  ON public.plant_library_variants(plant_entry_id, item_category, size_mode, size_label, unit);

CREATE UNIQUE INDEX IF NOT EXISTS uq_plant_library_variant_marketplace_source
  ON public.plant_library_variants(marketplace_plant_id)
  WHERE marketplace_plant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_plant_library_variant_document_source
  ON public.plant_library_variants(document_item_catalog_id)
  WHERE document_item_catalog_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plant_library_variants_entry
  ON public.plant_library_variants(plant_entry_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_plant_library_variants_item_category
  ON public.plant_library_variants(item_category, updated_at DESC);

CREATE OR REPLACE FUNCTION public.update_plant_library_entries_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plant_library_entries_updated_at ON public.plant_library_entries;
CREATE TRIGGER trg_plant_library_entries_updated_at
BEFORE UPDATE ON public.plant_library_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_plant_library_entries_updated_at();

CREATE OR REPLACE FUNCTION public.update_plant_library_variants_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plant_library_variants_updated_at ON public.plant_library_variants;
CREATE TRIGGER trg_plant_library_variants_updated_at
BEFORE UPDATE ON public.plant_library_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_plant_library_variants_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_plant_library_entry(
  p_primary_name text,
  p_english_name text,
  p_scientific_name text,
  p_plant_family text,
  p_category text,
  p_description text,
  p_sunlight_requirement text,
  p_watering_requirement text,
  p_soil_requirement text,
  p_maintenance_level text,
  p_growth_rate text,
  p_pet_friendly boolean,
  p_care_tips text,
  p_notes text,
  p_feature_tags text[]
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_primary_name text := btrim(coalesce(p_primary_name, ''));
  v_english_name text := btrim(coalesce(p_english_name, ''));
  v_scientific_name text := btrim(coalesce(p_scientific_name, ''));
  v_plant_family text := nullif(btrim(coalesce(p_plant_family, '')), '');
  v_category text := upper(nullif(btrim(coalesce(p_category, '')), ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_sunlight_requirement text := nullif(btrim(coalesce(p_sunlight_requirement, '')), '');
  v_watering_requirement text := nullif(btrim(coalesce(p_watering_requirement, '')), '');
  v_soil_requirement text := nullif(btrim(coalesce(p_soil_requirement, '')), '');
  v_maintenance_level text := lower(nullif(btrim(coalesce(p_maintenance_level, '')), ''));
  v_growth_rate text := lower(nullif(btrim(coalesce(p_growth_rate, '')), ''));
  v_care_tips text := nullif(btrim(coalesce(p_care_tips, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_feature_tags text[] := coalesce(p_feature_tags, '{}');
  v_entry_id uuid;
  v_normalized_primary_name text;
  v_normalized_english_name text;
  v_normalized_scientific_name text;
BEGIN
  IF v_primary_name = '' THEN
    v_primary_name := COALESCE(NULLIF(v_english_name, ''), NULLIF(v_scientific_name, ''), 'Unnamed Plant');
  END IF;

  IF v_category NOT IN ('PALMS', 'TREES', 'SHRUBS', 'ALL') THEN
    v_category := 'ALL';
  END IF;

  IF v_maintenance_level NOT IN ('low', 'medium', 'high') THEN
    v_maintenance_level := NULL;
  END IF;

  IF v_growth_rate NOT IN ('slow', 'moderate', 'fast') THEN
    v_growth_rate := NULL;
  END IF;

  v_normalized_primary_name := public.normalize_text(v_primary_name);
  v_normalized_english_name := public.normalize_text(v_english_name);
  v_normalized_scientific_name := public.normalize_text(v_scientific_name);

  IF v_normalized_scientific_name <> '' THEN
    SELECT id INTO v_entry_id
    FROM public.plant_library_entries
    WHERE normalized_scientific_name = v_normalized_scientific_name
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  IF v_entry_id IS NULL THEN
    SELECT id INTO v_entry_id
    FROM public.plant_library_entries
    WHERE normalized_primary_name = v_normalized_primary_name
      AND (
        v_normalized_english_name = ''
        OR normalized_english_name = v_normalized_english_name
        OR normalized_english_name = ''
      )
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  IF v_entry_id IS NULL THEN
    INSERT INTO public.plant_library_entries (
      primary_name,
      english_name,
      scientific_name,
      plant_family,
      category,
      description,
      sunlight_requirement,
      watering_requirement,
      soil_requirement,
      maintenance_level,
      growth_rate,
      pet_friendly,
      care_tips,
      notes,
      feature_tags,
      normalized_primary_name,
      normalized_english_name,
      normalized_scientific_name
    ) VALUES (
      v_primary_name,
      v_english_name,
      v_scientific_name,
      v_plant_family,
      v_category,
      v_description,
      v_sunlight_requirement,
      v_watering_requirement,
      v_soil_requirement,
      v_maintenance_level,
      v_growth_rate,
      coalesce(p_pet_friendly, false),
      v_care_tips,
      v_notes,
      v_feature_tags,
      v_normalized_primary_name,
      v_normalized_english_name,
      v_normalized_scientific_name
    )
    RETURNING id INTO v_entry_id;
  ELSE
    UPDATE public.plant_library_entries
    SET
      primary_name = COALESCE(NULLIF(v_primary_name, ''), primary_name),
      english_name = CASE WHEN v_english_name <> '' THEN v_english_name ELSE english_name END,
      scientific_name = CASE WHEN v_scientific_name <> '' THEN v_scientific_name ELSE scientific_name END,
      plant_family = COALESCE(v_plant_family, plant_family),
      category = CASE WHEN v_category <> 'ALL' OR category = 'ALL' THEN v_category ELSE category END,
      description = COALESCE(v_description, description),
      sunlight_requirement = COALESCE(v_sunlight_requirement, sunlight_requirement),
      watering_requirement = COALESCE(v_watering_requirement, watering_requirement),
      soil_requirement = COALESCE(v_soil_requirement, soil_requirement),
      maintenance_level = COALESCE(v_maintenance_level, maintenance_level),
      growth_rate = COALESCE(v_growth_rate, growth_rate),
      pet_friendly = COALESCE(p_pet_friendly, pet_friendly),
      care_tips = COALESCE(v_care_tips, care_tips),
      notes = COALESCE(v_notes, notes),
      feature_tags = CASE WHEN coalesce(array_length(v_feature_tags, 1), 0) > 0 THEN v_feature_tags ELSE feature_tags END,
      normalized_primary_name = v_normalized_primary_name,
      normalized_english_name = v_normalized_english_name,
      normalized_scientific_name = v_normalized_scientific_name,
      updated_at = now()
    WHERE id = v_entry_id;
  END IF;

  RETURN v_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_document_item_catalog_to_plant_library(p_document_item_catalog_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.document_item_catalog%ROWTYPE;
  v_entry_id uuid;
  v_variant_id uuid;
BEGIN
  SELECT * INTO v_row
  FROM public.document_item_catalog
  WHERE id = p_document_item_catalog_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_entry_id := public.ensure_plant_library_entry(
    v_row.item_name,
    v_row.english_name,
    v_row.scientific_name,
    NULL,
    CASE
      WHEN v_row.item_category = 'tree' THEN 'TREES'
      WHEN v_row.item_category = 'palm' THEN 'PALMS'
      WHEN v_row.item_category = 'shrub' THEN 'SHRUBS'
      WHEN v_row.size_mode = 'tree' THEN 'TREES'
      WHEN v_row.size_mode = 'shrub' THEN 'SHRUBS'
      ELSE 'ALL'
    END,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  );

  SELECT id INTO v_variant_id
  FROM public.plant_library_variants
  WHERE document_item_catalog_id = v_row.id
  LIMIT 1;

  IF v_variant_id IS NULL THEN
    SELECT id INTO v_variant_id
    FROM public.plant_library_variants
    WHERE plant_entry_id = v_entry_id
      AND size_mode = coalesce(v_row.size_mode, 'other')
      AND size_label = coalesce(v_row.size_label, '')
      AND unit = coalesce(v_row.unit, 'ต้น')
    LIMIT 1;
  END IF;

  IF v_variant_id IS NULL THEN
    INSERT INTO public.plant_library_variants (
      plant_entry_id,
      size_label,
      item_category,
      size_mode,
      unit,
      material_price,
      labor_price,
      image_url,
      document_item_catalog_id
    ) VALUES (
      v_entry_id,
      coalesce(v_row.size_label, ''),
      coalesce(v_row.item_category, 'other'),
      coalesce(v_row.size_mode, 'other'),
      coalesce(nullif(v_row.unit, ''), 'ต้น'),
      coalesce(v_row.material_price, 0),
      coalesce(v_row.labor_price, 0),
      v_row.image_url,
      v_row.id
    )
    RETURNING id INTO v_variant_id;
  ELSE
    UPDATE public.plant_library_variants
    SET
      plant_entry_id = v_entry_id,
      size_label = coalesce(v_row.size_label, ''),
      item_category = coalesce(v_row.item_category, 'other'),
      size_mode = coalesce(v_row.size_mode, 'other'),
      unit = coalesce(nullif(v_row.unit, ''), 'ต้น'),
      material_price = coalesce(v_row.material_price, 0),
      labor_price = coalesce(v_row.labor_price, 0),
      image_url = COALESCE(v_row.image_url, image_url),
      document_item_catalog_id = v_row.id,
      updated_at = now()
    WHERE id = v_variant_id;
  END IF;

  RETURN v_variant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_marketplace_plant_to_plant_library(p_marketplace_plant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.marketplace_plants%ROWTYPE;
  v_entry_id uuid;
  v_variant_id uuid;
  v_item_category text;
  v_size_mode text;
BEGIN
  SELECT * INTO v_row
  FROM public.marketplace_plants
  WHERE id = p_marketplace_plant_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_item_category := CASE
    WHEN v_row.category = 'TREES' THEN 'tree'
    WHEN v_row.category = 'PALMS' THEN 'palm'
    WHEN v_row.category = 'SHRUBS' THEN 'shrub'
    ELSE 'other'
  END;

  v_size_mode := CASE
    WHEN v_row.category = 'TREES' THEN 'tree'
    WHEN v_row.category = 'SHRUBS' THEN 'shrub'
    ELSE 'other'
  END;

  v_entry_id := public.ensure_plant_library_entry(
    v_row.name,
    v_row.common_name,
    v_row.scientific_name,
    v_row.plant_family,
    v_row.category,
    v_row.description,
    v_row.sunlight_requirement,
    v_row.watering_requirement,
    v_row.soil_requirement,
    v_row.maintenance_level,
    v_row.growth_rate,
    v_row.pet_friendly,
    v_row.care_tips,
    v_row.notes,
    v_row.feature_tags
  );

  SELECT id INTO v_variant_id
  FROM public.plant_library_variants
  WHERE marketplace_plant_id = v_row.id
  LIMIT 1;

  IF v_variant_id IS NULL THEN
    SELECT id INTO v_variant_id
    FROM public.plant_library_variants
    WHERE plant_entry_id = v_entry_id
      AND size_mode = v_size_mode
      AND size_label = coalesce(v_row.size_label, '')
      AND unit = 'ต้น'
    LIMIT 1;
  END IF;

  IF v_variant_id IS NULL THEN
    INSERT INTO public.plant_library_variants (
      plant_entry_id,
      size_label,
      item_category,
      size_mode,
      unit,
      height_cm,
      canopy_width_cm,
      trunk_diameter_inch,
      tree_height_label,
      shrub_spacing_cm,
      marketplace_price,
      stock_quantity,
      image_url,
      is_marketplace_enabled,
      marketplace_active,
      marketplace_plant_id
    ) VALUES (
      v_entry_id,
      coalesce(v_row.size_label, ''),
      v_item_category,
      v_size_mode,
      'ต้น',
      v_row.height_cm,
      v_row.canopy_width_cm,
      v_row.trunk_diameter_inch,
      v_row.tree_height_label,
      v_row.shrub_spacing_cm,
      coalesce(v_row.price, 0),
      coalesce(v_row.stock_quantity, 0),
      v_row.image_url,
      true,
      coalesce(v_row.is_active, false),
      v_row.id
    )
    RETURNING id INTO v_variant_id;
  ELSE
    UPDATE public.plant_library_variants
    SET
      plant_entry_id = v_entry_id,
      size_label = coalesce(v_row.size_label, ''),
      item_category = v_item_category,
      size_mode = v_size_mode,
      unit = 'ต้น',
      height_cm = COALESCE(v_row.height_cm, height_cm),
      canopy_width_cm = COALESCE(v_row.canopy_width_cm, canopy_width_cm),
      trunk_diameter_inch = COALESCE(v_row.trunk_diameter_inch, trunk_diameter_inch),
      tree_height_label = COALESCE(v_row.tree_height_label, tree_height_label),
      shrub_spacing_cm = COALESCE(v_row.shrub_spacing_cm, shrub_spacing_cm),
      marketplace_price = coalesce(v_row.price, 0),
      stock_quantity = coalesce(v_row.stock_quantity, 0),
      image_url = COALESCE(v_row.image_url, image_url),
      is_marketplace_enabled = true,
      marketplace_active = coalesce(v_row.is_active, false),
      marketplace_plant_id = v_row.id,
      updated_at = now()
    WHERE id = v_variant_id;
  END IF;

  RETURN v_variant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_document_item_catalog_to_plant_library()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.sync_document_item_catalog_to_plant_library(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_document_item_catalog_to_plant_library ON public.document_item_catalog;
CREATE TRIGGER trg_sync_document_item_catalog_to_plant_library
AFTER INSERT OR UPDATE ON public.document_item_catalog
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_document_item_catalog_to_plant_library();

CREATE OR REPLACE FUNCTION public.trg_sync_marketplace_plant_to_plant_library()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.sync_marketplace_plant_to_plant_library(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_marketplace_plant_to_plant_library ON public.marketplace_plants;
CREATE TRIGGER trg_sync_marketplace_plant_to_plant_library
AFTER INSERT OR UPDATE ON public.marketplace_plants
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_marketplace_plant_to_plant_library();

ALTER TABLE public.plant_library_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_library_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read plant library entries" ON public.plant_library_entries;
CREATE POLICY "Authenticated read plant library entries"
  ON public.plant_library_entries
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin write plant library entries" ON public.plant_library_entries;
CREATE POLICY "Admin write plant library entries"
  ON public.plant_library_entries
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated read plant library variants" ON public.plant_library_variants;
CREATE POLICY "Authenticated read plant library variants"
  ON public.plant_library_variants
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin write plant library variants" ON public.plant_library_variants;
CREATE POLICY "Admin write plant library variants"
  ON public.plant_library_variants
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON TABLE public.plant_library_entries TO authenticated;
GRANT SELECT ON TABLE public.plant_library_variants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.plant_library_entries TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.plant_library_variants TO authenticated;

-- Safe softscape reseed: clear old catalog/library rows, then repopulate the
-- quotation item source of truth without tripping sync-time unique constraints.
CREATE TEMP TABLE tmp_softscape_seed_items (
  item_name text NOT NULL,
  english_name text NOT NULL,
  scientific_name text NOT NULL,
  main_category text NOT NULL,
  subcategory text NOT NULL,
  size_label text NOT NULL,
  item_category text NOT NULL,
  size_mode text NOT NULL,
  unit text NOT NULL,
  material_price numeric(12,2) NOT NULL,
  labor_price numeric(12,2) NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_softscape_seed_items (
  item_name,
  english_name,
  scientific_name,
  main_category,
  subcategory,
  size_label,
  item_category,
  size_mode,
  unit,
  material_price,
  labor_price
)
VALUES
  ('มั่งมี', 'Auspicious Tree (Mung Mee)', 'Carallia brachiata', 'softscape', 'tree', '', 'tree', 'tree', 'ต้น', 0, 0),
  ('พุดกังหัน', 'Windmill Jasmine', 'Tabernaemontana pandacaqui', 'softscape', 'tree', '', 'tree', 'tree', 'ต้น', 0, 0),
  ('จิกเศรษฐี', 'Jik Setthi', 'Barringtonia macrostachya', 'softscape', 'tree', '', 'tree', 'tree', 'ต้น', 0, 0),
  ('หลิวลู่ลม', 'Weeping Willow', 'Salix babylonica', 'softscape', 'tree', '', 'tree', 'tree', 'ต้น', 0, 0),
  ('สนหอม', 'Lawson Cypress / Ellwood''s Gold', 'Chamaecyparis lawsoniana', 'softscape', 'shrub', '', 'shrub', 'shrub', 'ต้น', 0, 0),
  ('หนวดปลาหมึกแคระ', 'Dwarf Umbrella Tree', 'Schefflera arboricola', 'softscape', 'shrub', '', 'shrub', 'shrub', 'ต้น', 0, 0),
  ('หลิวน้ำตก', 'Ceylon Myrtle', 'Phyllanthus myrtifolius', 'softscape', 'shrub', '', 'shrub', 'shrub', 'ต้น', 0, 0),
  ('สนเลื้อย', 'Creeping Juniper', 'Juniperus procumbens', 'softscape', 'groundcover', '', 'shrub', 'shrub', 'ต้น', 0, 0),
  ('สนผม', 'Pom-pom Pine', 'Juniperus chinensis', 'softscape', 'shrub', '', 'shrub', 'shrub', 'ต้น', 0, 0),
  ('หนวดปลาดุก', 'Mondo Grass / Dwarf Lilyturf', 'Ophiopogon japonicus', 'softscape', 'grass', '', 'other', 'other', 'ต้น', 0, 0),
  ('หญ้าถอดปล้อง', 'Horsetail', 'Equisetum hyemale', 'softscape', 'grass', '', 'other', 'other', 'ต้น', 0, 0),
  ('เฟิร์นใบมะขาม', 'Tuber Ladder Fern', 'Nephrolepis cordifolia', 'softscape', 'groundcover', '', 'other', 'other', 'ต้น', 0, 0),
  ('ปริกหางกระรอก', 'Foxtail Fern', 'Asparagus densiflorus ''Myersii''', 'softscape', 'groundcover', '', 'other', 'other', 'ต้น', 0, 0),
  ('ยี่โถดอกขาว', 'White Oleander', 'Nerium oleander', 'softscape', 'shrub', '', 'shrub', 'shrub', 'ต้น', 0, 0),
  ('ซุ้มกระต่ายเขียว', 'Jaburan Lily / White Lilyturf', 'Ophiopogon jaburan', 'softscape', 'grass', '', 'other', 'other', 'ต้น', 0, 0),
  ('ไทรคอมแพคดัดฟอร์ม', 'Compact Ficus (Topiary form)', 'Ficus microcarpa ''Compacta''', 'softscape', 'shrub', '', 'shrub', 'shrub', 'ต้น', 0, 0),
  ('ไทรคอมแพคดัดกลม', 'Compact Ficus (Round topiary)', 'Ficus microcarpa ''Compacta''', 'softscape', 'shrub', '', 'shrub', 'shrub', 'ต้น', 0, 0),
  ('ประยงค์กลม', 'Chinese Rice Flower (Round)', 'Aglaia odorata', 'softscape', 'shrub', '', 'shrub', 'shrub', 'ต้น', 0, 0),
  ('หงส์ฟู่กลม', 'Chinese Fringe Flower (Round)', 'Loropetalum chinense', 'softscape', 'shrub', '', 'shrub', 'shrub', 'ต้น', 0, 0),
  ('ม่วงเจริญ', 'Linh Sam / Vietnam Cherry', 'Desmodium unifoliatum', 'softscape', 'groundcover', '', 'other', 'other', 'ต้น', 0, 0),
  ('หลิวดอกขาว', 'White False Heather', 'Cuphea hyssopifolia', 'softscape', 'shrub', '', 'shrub', 'shrub', 'ต้น', 0, 0),
  ('หลิวดอกเหลือง', 'Yellow False Heather', 'Cuphea hyssopifolia (Yellow var.)', 'softscape', 'shrub', '', 'shrub', 'shrub', 'ต้น', 0, 0),
  ('ไทรปัตตาเวีย', 'Peregrina / Spicy Jatropha', 'Jatropha integerrima', 'softscape', 'shrub', '', 'shrub', 'shrub', 'ต้น', 0, 0),
  ('เฟิร์นกนกนารี', 'Spike Moss / Peacock Fern', 'Selaginella spp.', 'softscape', 'groundcover', '', 'other', 'other', 'ต้น', 0, 0);

ALTER TABLE public.document_item_catalog DISABLE TRIGGER trg_sync_document_item_catalog_to_plant_library;

CREATE TEMP TABLE tmp_existing_softscape_catalog_ids (
  id uuid PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO tmp_existing_softscape_catalog_ids (id)
SELECT DISTINCT dic.id
FROM public.document_item_catalog dic
WHERE dic.main_category = 'softscape'
   OR dic.subcategory IN ('tree', 'palm', 'shrub', 'groundcover', 'grass')
   OR dic.item_category IN ('tree', 'palm', 'shrub')
   OR dic.item_name IN (SELECT item_name FROM tmp_softscape_seed_items)
   OR dic.scientific_name IN (
     SELECT scientific_name
     FROM tmp_softscape_seed_items
     WHERE scientific_name <> ''
   );

CREATE TEMP TABLE tmp_target_entry_ids (
  id uuid PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO tmp_target_entry_ids (id)
SELECT DISTINCT pe.id
FROM public.plant_library_entries pe
WHERE pe.primary_name IN (SELECT item_name FROM tmp_softscape_seed_items)
   OR pe.scientific_name IN (
     SELECT scientific_name
     FROM tmp_softscape_seed_items
     WHERE scientific_name <> ''
   );

INSERT INTO tmp_target_entry_ids (id)
SELECT DISTINCT pv.plant_entry_id
FROM public.plant_library_variants pv
WHERE pv.document_item_catalog_id IN (SELECT id FROM tmp_existing_softscape_catalog_ids)
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.plant_library_variants
WHERE document_item_catalog_id IN (SELECT id FROM tmp_existing_softscape_catalog_ids)
   OR plant_entry_id IN (SELECT id FROM tmp_target_entry_ids);

DELETE FROM public.plant_library_entries
WHERE id IN (SELECT id FROM tmp_target_entry_ids);

DELETE FROM public.document_item_catalog
WHERE id IN (SELECT id FROM tmp_existing_softscape_catalog_ids);

INSERT INTO public.document_item_catalog (
  item_name,
  english_name,
  scientific_name,
  main_category,
  subcategory,
  size_label,
  item_category,
  size_mode,
  unit,
  material_price,
  labor_price
)
SELECT
  item_name,
  english_name,
  scientific_name,
  main_category,
  subcategory,
  size_label,
  item_category,
  size_mode,
  unit,
  material_price,
  labor_price
FROM tmp_softscape_seed_items
ON CONFLICT (item_name, scientific_name, size_label, unit)
DO UPDATE SET
  english_name = EXCLUDED.english_name,
  main_category = EXCLUDED.main_category,
  subcategory = EXCLUDED.subcategory,
  item_category = EXCLUDED.item_category,
  size_mode = EXCLUDED.size_mode,
  material_price = EXCLUDED.material_price,
  labor_price = EXCLUDED.labor_price,
  updated_at = now();

ALTER TABLE public.document_item_catalog ENABLE TRIGGER trg_sync_document_item_catalog_to_plant_library;

CREATE OR REPLACE VIEW public.v_plant_library_variants
WITH (security_invoker = true)
AS
SELECT
  pv.id,
  pv.plant_entry_id,
  pe.primary_name AS item_name,
  NULLIF(pe.english_name, '') AS english_name,
  NULLIF(pe.scientific_name, '') AS scientific_name,
  pe.plant_family,
  pe.category,
  pe.description,
  pv.size_label,
  pv.size_mode,
  pv.unit,
  pv.height_cm,
  pv.canopy_width_cm,
  pv.trunk_diameter_inch,
  pv.tree_height_label,
  pv.shrub_spacing_cm,
  pe.sunlight_requirement,
  pe.watering_requirement,
  pe.soil_requirement,
  pe.maintenance_level,
  pe.growth_rate,
  pe.pet_friendly,
  pe.care_tips,
  pe.notes,
  pe.feature_tags,
  pv.material_price,
  pv.labor_price,
  pv.marketplace_price,
  CASE
    WHEN coalesce(pv.material_price, 0) > 0 THEN pv.material_price
    WHEN coalesce(pv.marketplace_price, 0) > 0 THEN pv.marketplace_price
    ELSE 0
  END AS preferred_price,
  pv.stock_quantity,
  pv.image_url,
  pv.is_marketplace_enabled,
  pv.marketplace_active,
  pv.marketplace_plant_id,
  pv.document_item_catalog_id,
  pe.normalized_primary_name,
  pe.normalized_english_name,
  pe.normalized_scientific_name,
  public.normalize_text(pv.size_label) AS normalized_size_label,
  public.normalize_text(pv.unit) AS normalized_unit,
  pv.created_at,
  greatest(pe.updated_at, pv.updated_at) AS updated_at,
  pv.item_category
FROM public.plant_library_variants pv
JOIN public.plant_library_entries pe ON pe.id = pv.plant_entry_id;

GRANT SELECT ON TABLE public.v_plant_library_variants TO authenticated;

DO $$
DECLARE
  v_catalog_id uuid;
  v_marketplace_id uuid;
BEGIN
  FOR v_catalog_id IN SELECT id FROM public.document_item_catalog LOOP
    PERFORM public.sync_document_item_catalog_to_plant_library(v_catalog_id);
  END LOOP;

  FOR v_marketplace_id IN SELECT id FROM public.marketplace_plants LOOP
    PERFORM public.sync_marketplace_plant_to_plant_library(v_marketplace_id);
  END LOOP;
END $$;

-- =========================================================
-- 9) PLANTING SPACING REFERENCE (for quantity calculations)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.planting_spacing_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spacing_meter numeric(6,2) NOT NULL,
  plants_per_sqm numeric(10,2) NOT NULL,
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_planting_spacing_meter UNIQUE (spacing_meter)
);

CREATE INDEX IF NOT EXISTS idx_planting_spacing_meter
  ON public.planting_spacing_reference (spacing_meter);

CREATE OR REPLACE FUNCTION public.update_planting_spacing_reference_on_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planting_spacing_reference_on_update ON public.planting_spacing_reference;
CREATE TRIGGER trg_planting_spacing_reference_on_update
BEFORE UPDATE ON public.planting_spacing_reference
FOR EACH ROW
EXECUTE FUNCTION public.update_planting_spacing_reference_on_update();

INSERT INTO public.planting_spacing_reference (spacing_meter, plants_per_sqm, label)
VALUES
  (0.10, 100.00, '@0.10 m.'),
  (0.15, 45.00, '@0.15 m.'),
  (0.20, 25.00, '@0.20 m.'),
  (0.25, 16.00, '@0.25 m.'),
  (0.30, 11.00, '@0.30 m.'),
  (0.40, 6.25, '@0.40 m.'),
  (0.50, 4.00, '@0.50 m.'),
  (0.60, 3.00, '@0.60 m.'),
  (0.75, 2.00, '@0.75 m.'),
  (0.80, 1.50, '@0.80 m.')
ON CONFLICT (spacing_meter) DO UPDATE
SET
  plants_per_sqm = EXCLUDED.plants_per_sqm,
  label = EXCLUDED.label,
  updated_at = now();

ALTER TABLE public.planting_spacing_reference ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read planting spacing" ON public.planting_spacing_reference;
CREATE POLICY "Authenticated read planting spacing" ON public.planting_spacing_reference
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins write planting spacing" ON public.planting_spacing_reference;
CREATE POLICY "Admins write planting spacing" ON public.planting_spacing_reference
  FOR ALL TO authenticated
  USING (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  )
  WITH CHECK (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

GRANT SELECT ON TABLE public.planting_spacing_reference TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.planting_spacing_reference TO authenticated;

-- =========================================================
-- 10) CUSTOMER HOUSE DOMAIN (DETAIL / ZONING / MONITORING)
-- =========================================================

CREATE OR REPLACE FUNCTION public.can_read_house_data(p_house_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.houses h
    WHERE h.id = p_house_id
      AND (
        auth.uid() = h.user_id
        OR auth.uid() = h.customer_id
        OR public.is_admin_or_staff()
      )
  );
$$;

ALTER TABLE public.houses
  ADD COLUMN IF NOT EXISTS garden_image_url text,
  ADD COLUMN IF NOT EXISTS layout_plan_url text,
  ADD COLUMN IF NOT EXISTS irrigation_mode text DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS irrigation_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_service_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_service_at timestamptz,
  ADD COLUMN IF NOT EXISTS overall_health_status text DEFAULT 'unknown';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'houses_irrigation_mode_check'
      AND conrelid = 'public.houses'::regclass
  ) THEN
    ALTER TABLE public.houses
      ADD CONSTRAINT houses_irrigation_mode_check
      CHECK (irrigation_mode IN ('auto', 'manual', 'off'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'houses_overall_health_status_check'
      AND conrelid = 'public.houses'::regclass
  ) THEN
    ALTER TABLE public.houses
      ADD CONSTRAINT houses_overall_health_status_check
      CHECK (overall_health_status IN ('good', 'watch', 'critical', 'unknown'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_houses_irrigation_mode ON public.houses(irrigation_mode);
CREATE INDEX IF NOT EXISTS idx_houses_next_service_at ON public.houses(next_service_at);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS admin_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS admin_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_confirmation_note text;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'orders_admin_confirmed_by_fkey'
     ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_admin_confirmed_by_fkey
      FOREIGN KEY (admin_confirmed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_admin_confirmed_at ON public.orders(admin_confirmed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_house_status_schedule ON public.orders(house_id, status, scheduled_date);

CREATE OR REPLACE FUNCTION public.sync_order_admin_confirmation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF lower(coalesce(NEW.status, '')) IN ('confirmed', 'in_progress', 'completed') THEN
    IF NEW.admin_confirmed_at IS NULL THEN
      NEW.admin_confirmed_at := now();
    END IF;

    IF NEW.admin_confirmed_by IS NULL AND auth.uid() IS NOT NULL THEN
      NEW.admin_confirmed_by := auth.uid();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_admin_confirmation ON public.orders;
CREATE TRIGGER trg_sync_order_admin_confirmation
BEFORE INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_admin_confirmation();

CREATE TABLE IF NOT EXISTS public.house_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  zone_code text NOT NULL,
  display_name text NOT NULL,
  summary text,
  sunlight_level text,
  moisture_target text,
  health_status text NOT NULL DEFAULT 'unknown',
  zone_polygon jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_house_zones_house_code UNIQUE (house_id, zone_code)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_zones_zone_code_check'
      AND conrelid = 'public.house_zones'::regclass
  ) THEN
    ALTER TABLE public.house_zones
      ADD CONSTRAINT house_zones_zone_code_check
      CHECK (zone_code ~ '^[A-Z0-9_-]{1,10}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_zones_health_status_check'
      AND conrelid = 'public.house_zones'::regclass
  ) THEN
    ALTER TABLE public.house_zones
      ADD CONSTRAINT house_zones_health_status_check
      CHECK (health_status IN ('good', 'watch', 'critical', 'unknown'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_house_zones_house_sort ON public.house_zones(house_id, sort_order, zone_code);

CREATE OR REPLACE FUNCTION public.update_house_zones_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_house_zones_updated_at ON public.house_zones;
CREATE TRIGGER trg_house_zones_updated_at
BEFORE UPDATE ON public.house_zones
FOR EACH ROW
EXECUTE FUNCTION public.update_house_zones_updated_at();

ALTER TABLE public.house_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "House zones read by house access" ON public.house_zones;
DROP POLICY IF EXISTS "House zones write by staff admin" ON public.house_zones;

CREATE POLICY "House zones read by house access"
  ON public.house_zones
  FOR SELECT TO authenticated
  USING (public.can_read_house_data(house_id));

CREATE POLICY "House zones write by staff admin"
  ON public.house_zones
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.house_zones TO authenticated;

CREATE TABLE IF NOT EXISTS public.house_zone_plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES public.house_zones(id) ON DELETE CASCADE,
  plant_name text NOT NULL,
  scientific_name text,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  health_status text NOT NULL DEFAULT 'unknown',
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_zone_plants_health_status_check'
      AND conrelid = 'public.house_zone_plants'::regclass
  ) THEN
    ALTER TABLE public.house_zone_plants
      ADD CONSTRAINT house_zone_plants_health_status_check
      CHECK (health_status IN ('excellent', 'good', 'watch', 'critical', 'unknown'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_zone_plants_quantity_check'
      AND conrelid = 'public.house_zone_plants'::regclass
  ) THEN
    ALTER TABLE public.house_zone_plants
      ADD CONSTRAINT house_zone_plants_quantity_check
      CHECK (quantity >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_house_zone_plants_zone_id ON public.house_zone_plants(zone_id);

CREATE OR REPLACE FUNCTION public.update_house_zone_plants_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_house_zone_plants_updated_at ON public.house_zone_plants;
CREATE TRIGGER trg_house_zone_plants_updated_at
BEFORE UPDATE ON public.house_zone_plants
FOR EACH ROW
EXECUTE FUNCTION public.update_house_zone_plants_updated_at();

ALTER TABLE public.house_zone_plants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Zone plants read by house access" ON public.house_zone_plants;
DROP POLICY IF EXISTS "Zone plants write by staff admin" ON public.house_zone_plants;

CREATE POLICY "Zone plants read by house access"
  ON public.house_zone_plants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.house_zones hz
      WHERE hz.id = zone_id
        AND public.can_read_house_data(hz.house_id)
    )
  );

CREATE POLICY "Zone plants write by staff admin"
  ON public.house_zone_plants
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.house_zone_plants TO authenticated;

CREATE TABLE IF NOT EXISTS public.house_environment_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES public.house_zones(id) ON DELETE SET NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  temperature_c numeric(5,2),
  soil_moisture_pct numeric(5,2),
  soil_ph numeric(4,2),
  sunlight_pct numeric(5,2),
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_environment_source_check'
      AND conrelid = 'public.house_environment_readings'::regclass
  ) THEN
    ALTER TABLE public.house_environment_readings
      ADD CONSTRAINT house_environment_source_check
      CHECK (source IN ('manual', 'sensor', 'integration'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_environment_soil_moisture_check'
      AND conrelid = 'public.house_environment_readings'::regclass
  ) THEN
    ALTER TABLE public.house_environment_readings
      ADD CONSTRAINT house_environment_soil_moisture_check
      CHECK (soil_moisture_pct IS NULL OR (soil_moisture_pct >= 0 AND soil_moisture_pct <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_environment_soil_ph_check'
      AND conrelid = 'public.house_environment_readings'::regclass
  ) THEN
    ALTER TABLE public.house_environment_readings
      ADD CONSTRAINT house_environment_soil_ph_check
      CHECK (soil_ph IS NULL OR (soil_ph >= 0 AND soil_ph <= 14));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_environment_sunlight_check'
      AND conrelid = 'public.house_environment_readings'::regclass
  ) THEN
    ALTER TABLE public.house_environment_readings
      ADD CONSTRAINT house_environment_sunlight_check
      CHECK (sunlight_pct IS NULL OR (sunlight_pct >= 0 AND sunlight_pct <= 100));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_house_env_house_captured ON public.house_environment_readings(house_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_house_env_zone_captured ON public.house_environment_readings(zone_id, captured_at DESC);

ALTER TABLE public.house_environment_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "House env read by house access" ON public.house_environment_readings;
DROP POLICY IF EXISTS "House env write by staff admin" ON public.house_environment_readings;

CREATE POLICY "House env read by house access"
  ON public.house_environment_readings
  FOR SELECT TO authenticated
  USING (public.can_read_house_data(house_id));

CREATE POLICY "House env write by staff admin"
  ON public.house_environment_readings
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.house_environment_readings TO authenticated;

CREATE TABLE IF NOT EXISTS public.house_irrigation_settings (
  house_id uuid PRIMARY KEY REFERENCES public.houses(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'auto',
  is_enabled boolean NOT NULL DEFAULT true,
  moisture_threshold_low numeric(5,2),
  moisture_threshold_high numeric(5,2),
  last_changed_at timestamptz NOT NULL DEFAULT now(),
  last_changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_irrigation_mode_check'
      AND conrelid = 'public.house_irrigation_settings'::regclass
  ) THEN
    ALTER TABLE public.house_irrigation_settings
      ADD CONSTRAINT house_irrigation_mode_check
      CHECK (mode IN ('auto', 'manual', 'off'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_irrigation_threshold_low_check'
      AND conrelid = 'public.house_irrigation_settings'::regclass
  ) THEN
    ALTER TABLE public.house_irrigation_settings
      ADD CONSTRAINT house_irrigation_threshold_low_check
      CHECK (moisture_threshold_low IS NULL OR (moisture_threshold_low >= 0 AND moisture_threshold_low <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_irrigation_threshold_high_check'
      AND conrelid = 'public.house_irrigation_settings'::regclass
  ) THEN
    ALTER TABLE public.house_irrigation_settings
      ADD CONSTRAINT house_irrigation_threshold_high_check
      CHECK (moisture_threshold_high IS NULL OR (moisture_threshold_high >= 0 AND moisture_threshold_high <= 100));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_house_irrigation_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.last_changed_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_house_irrigation_settings_updated_at ON public.house_irrigation_settings;
CREATE TRIGGER trg_house_irrigation_settings_updated_at
BEFORE UPDATE ON public.house_irrigation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_house_irrigation_settings_updated_at();

INSERT INTO public.house_irrigation_settings (house_id, mode, is_enabled)
SELECT h.id, COALESCE(h.irrigation_mode, 'auto'), COALESCE(h.irrigation_enabled, true)
FROM public.houses h
ON CONFLICT (house_id) DO NOTHING;

ALTER TABLE public.house_irrigation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Irrigation settings read by house access" ON public.house_irrigation_settings;
DROP POLICY IF EXISTS "Irrigation settings write by staff admin" ON public.house_irrigation_settings;

CREATE POLICY "Irrigation settings read by house access"
  ON public.house_irrigation_settings
  FOR SELECT TO authenticated
  USING (public.can_read_house_data(house_id));

CREATE POLICY "Irrigation settings write by staff admin"
  ON public.house_irrigation_settings
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.house_irrigation_settings TO authenticated;

CREATE TABLE IF NOT EXISTS public.house_irrigation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES public.house_zones(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  trigger_source text NOT NULL DEFAULT 'system',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_irrigation_events_type_check'
      AND conrelid = 'public.house_irrigation_events'::regclass
  ) THEN
    ALTER TABLE public.house_irrigation_events
      ADD CONSTRAINT house_irrigation_events_type_check
      CHECK (event_type IN ('start', 'stop', 'pause', 'resume', 'schedule_update', 'mode_change'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_irrigation_events_trigger_check'
      AND conrelid = 'public.house_irrigation_events'::regclass
  ) THEN
    ALTER TABLE public.house_irrigation_events
      ADD CONSTRAINT house_irrigation_events_trigger_check
      CHECK (trigger_source IN ('auto', 'manual', 'admin', 'staff', 'system'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.compute_irrigation_event_duration()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL THEN
    NEW.duration_seconds := GREATEST(0, EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::int);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_irrigation_event_duration ON public.house_irrigation_events;
CREATE TRIGGER trg_compute_irrigation_event_duration
BEFORE INSERT OR UPDATE ON public.house_irrigation_events
FOR EACH ROW
EXECUTE FUNCTION public.compute_irrigation_event_duration();

CREATE INDEX IF NOT EXISTS idx_irrigation_events_house_started ON public.house_irrigation_events(house_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_irrigation_events_zone_started ON public.house_irrigation_events(zone_id, started_at DESC);

ALTER TABLE public.house_irrigation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Irrigation events read by house access" ON public.house_irrigation_events;
DROP POLICY IF EXISTS "Irrigation events write by staff admin" ON public.house_irrigation_events;

CREATE POLICY "Irrigation events read by house access"
  ON public.house_irrigation_events
  FOR SELECT TO authenticated
  USING (public.can_read_house_data(house_id));

CREATE POLICY "Irrigation events write by staff admin"
  ON public.house_irrigation_events
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.house_irrigation_events TO authenticated;

CREATE TABLE IF NOT EXISTS public.house_maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES public.house_zones(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  title text NOT NULL,
  detail text,
  task_type text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  assigned_staff_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_maintenance_tasks_priority_check'
      AND conrelid = 'public.house_maintenance_tasks'::regclass
  ) THEN
    ALTER TABLE public.house_maintenance_tasks
      ADD CONSTRAINT house_maintenance_tasks_priority_check
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'house_maintenance_tasks_status_check'
      AND conrelid = 'public.house_maintenance_tasks'::regclass
  ) THEN
    ALTER TABLE public.house_maintenance_tasks
      ADD CONSTRAINT house_maintenance_tasks_status_check
      CHECK (status IN ('pending', 'scheduled', 'in_progress', 'done', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_house_tasks_house_status_due ON public.house_maintenance_tasks(house_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_house_tasks_assigned_status ON public.house_maintenance_tasks(assigned_staff_id, status);

CREATE OR REPLACE FUNCTION public.update_house_maintenance_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_house_maintenance_tasks_updated_at ON public.house_maintenance_tasks;
CREATE TRIGGER trg_house_maintenance_tasks_updated_at
BEFORE UPDATE ON public.house_maintenance_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_house_maintenance_tasks_updated_at();

ALTER TABLE public.house_maintenance_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "House tasks read by house access" ON public.house_maintenance_tasks;
DROP POLICY IF EXISTS "House tasks write by staff admin" ON public.house_maintenance_tasks;

CREATE POLICY "House tasks read by house access"
  ON public.house_maintenance_tasks
  FOR SELECT TO authenticated
  USING (public.can_read_house_data(house_id));

CREATE POLICY "House tasks write by staff admin"
  ON public.house_maintenance_tasks
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.house_maintenance_tasks TO authenticated;

CREATE OR REPLACE VIEW public.v_house_dashboard_summary
WITH (security_invoker = true)
AS
SELECT
  h.id AS house_id,
  h.house_code,
  h.name AS house_name,
  h.address,
  h.user_id,
  h.customer_id,
  hs.mode AS irrigation_mode,
  hs.is_enabled AS irrigation_enabled,
  wr_stats.latest_report_at,
  wr_stats.reports_total,
  wr_stats.next_visit_date,
  env_stats.avg_soil_moisture_pct,
  env_stats.avg_temperature_c,
  env_stats.avg_soil_ph,
  ord_stats.next_confirmed_schedule,
  ord_stats.open_orders
FROM public.houses h
LEFT JOIN public.house_irrigation_settings hs
  ON hs.house_id = h.id
LEFT JOIN LATERAL (
  SELECT
    max(wr.updated_at) AS latest_report_at,
    count(*)::int AS reports_total,
    min(wr.next_visit_date) FILTER (WHERE wr.next_visit_date IS NOT NULL) AS next_visit_date
  FROM public.work_reports wr
  JOIN public.orders o ON o.id = wr.order_id
  WHERE o.house_id = h.id OR (h.house_code IS NOT NULL AND o.house_code = h.house_code)
) wr_stats ON true
LEFT JOIN LATERAL (
  SELECT
    round(avg(er.soil_moisture_pct)::numeric, 2) AS avg_soil_moisture_pct,
    round(avg(er.temperature_c)::numeric, 2) AS avg_temperature_c,
    round(avg(er.soil_ph)::numeric, 2) AS avg_soil_ph
  FROM public.house_environment_readings er
  WHERE er.house_id = h.id
    AND er.captured_at >= now() - interval '7 days'
) env_stats ON true
LEFT JOIN LATERAL (
  SELECT
    min(o.scheduled_date) FILTER (
      WHERE lower(coalesce(o.status, '')) IN ('confirmed', 'in_progress')
        AND o.scheduled_date IS NOT NULL
    ) AS next_confirmed_schedule,
    count(*) FILTER (
      WHERE lower(coalesce(o.status, '')) IN ('pending', 'confirmed', 'in_progress')
    )::int AS open_orders
  FROM public.orders o
  WHERE o.house_id = h.id OR (h.house_code IS NOT NULL AND o.house_code = h.house_code)
) ord_stats ON true;

CREATE OR REPLACE VIEW public.v_house_service_timeline
WITH (security_invoker = true)
AS
SELECT
  wr.id AS work_report_id,
  wr.order_id,
  o.house_id,
  o.house_code,
  o.customer_id,
  wr.staff_id,
  wr.created_at,
  wr.updated_at,
  wr.work_done,
  wr.problems_found,
  wr.recommendations,
  wr.next_visit_date,
  wr.next_visit_time_start,
  wr.next_visit_time_end,
  wr.before_photos,
  wr.after_photos,
  s.service_name
FROM public.work_reports wr
JOIN public.orders o ON o.id = wr.order_id
LEFT JOIN public.services s ON s.id = o.service_id;

GRANT SELECT ON TABLE public.v_house_dashboard_summary TO authenticated;
GRANT SELECT ON TABLE public.v_house_service_timeline TO authenticated;

-- =========================================================
-- CONSOLIDATED MIGRATION HELPERS / DEPLOYMENT METADATA / SEEDS
-- =========================================================

-- Consolidated from migrations/001_create_migrations_table.sql
CREATE TABLE IF NOT EXISTS _migrations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::TEXT, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_migrations_name ON _migrations(name);

GRANT ALL ON _migrations TO authenticated;
GRANT ALL ON _migrations TO service_role;

-- Consolidated from migrations/002_add_deployment_metadata.sql
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    BEGIN
      EXECUTE $auth_users$
        ALTER TABLE auth.users
        ADD COLUMN IF NOT EXISTS deployment_version TEXT DEFAULT '1.0.0',
        ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::TEXT, NOW())
      $auth_users$;

      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_last_activity ON auth.users(last_activity_at DESC)';
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping auth.users deployment metadata changes: insufficient privilege';
    END;
  END IF;
END $$;

-- Consolidated from migrations/010_create_product_events.sql
CREATE TABLE IF NOT EXISTS product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_events_created_at ON product_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_event_name ON product_events(event_name);
CREATE INDEX IF NOT EXISTS idx_product_events_user_id ON product_events(user_id);

ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_events'
      AND policyname = 'product_events_insert_own'
  ) THEN
    CREATE POLICY product_events_insert_own
      ON product_events
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_events'
      AND policyname = 'product_events_admin_read'
  ) THEN
    CREATE POLICY product_events_admin_read
      ON product_events
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;
END$$;

-- Consolidated from seed-admin-garden-services.sql
-- This seed is idempotent and updates/inserts by service_code/template_name.
BEGIN;

WITH service_seed AS (
  SELECT *
  FROM (
    VALUES
      (
        'GDN-CARE-01',
        'ดูแลสวน',
        'บริการดูแลสวนแบบต่อเนื่อง ครอบคลุมตัดแต่ง ใส่ปุ๋ย กำจัดวัชพืช และตรวจสุขภาพพืช',
        'maintenance',
        2200::numeric,
        'recurring',
        true,
        4,
        'hours'
      ),
      (
        'GDN-DESIGN-01',
        'ออกแบบสวน',
        'บริการออกแบบสวนตามคอนเซปต์พื้นที่จริง พร้อมแบบร่างโซนปลูกและงานระบบเบื้องต้น',
        'design',
        4800::numeric,
        'one-time',
        true,
        1,
        'days'
      ),
      (
        'GDN-CONTRACT-01',
        'รับเหมาจัดสวน',
        'บริการรับเหมาจัดสวนครบวงจร ตั้งแต่งานปรับพื้นที่ ปลูกพืช วัสดุตกแต่ง และงานโครงสร้างสวน',
        'construction',
        9000::numeric,
        'one-time',
        true,
        3,
        'days'
      ),
      (
        'GDN-IRRIG-01',
        'ติดตั้งระบบน้ำ',
        'บริการติดตั้งระบบน้ำหยดและสปริงเกอร์ พร้อมทดสอบแรงดันและจัดโซนการให้น้ำตามพื้นที่',
        'treatment',
        5200::numeric,
        'one-time',
        true,
        2,
        'days'
      )
  ) AS v(
    service_code,
    service_name,
    description,
    category,
    base_price,
    billing_type,
    has_estimated_duration,
    estimated_duration,
    estimated_duration_unit
  )
),
updated_services AS (
  UPDATE public.services s
  SET
    service_name = ss.service_name,
    name = ss.service_name,
    description = ss.description,
    category = ss.category,
    base_price = ss.base_price,
    price = ss.base_price,
    billing_type = ss.billing_type,
    has_estimated_duration = ss.has_estimated_duration,
    estimated_duration = ss.estimated_duration,
    estimated_duration_unit = ss.estimated_duration_unit,
    is_active = true,
    updated_at = now()
  FROM service_seed ss
  WHERE s.service_code = ss.service_code
  RETURNING s.id, s.service_code
)
INSERT INTO public.services (
  service_name,
  name,
  service_code,
  description,
  category,
  base_price,
  price,
  billing_type,
  has_estimated_duration,
  estimated_duration,
  estimated_duration_unit,
  is_active
)
SELECT
  ss.service_name,
  ss.service_name,
  ss.service_code,
  ss.description,
  ss.category,
  ss.base_price,
  ss.base_price,
  ss.billing_type,
  ss.has_estimated_duration,
  ss.estimated_duration,
  ss.estimated_duration_unit,
  true
FROM service_seed ss
WHERE NOT EXISTS (
  SELECT 1
  FROM public.services s
  WHERE s.service_code = ss.service_code
);

WITH template_seed AS (
  SELECT *
  FROM (
    VALUES
      ('GDN-CARE-01', 'Starter 0-100 ตร.ม.', 0::numeric, 100::numeric, 14::numeric, 1200::numeric, 'เหมาะสำหรับสวนบ้านขนาดเล็ก', true),
      ('GDN-CARE-01', 'Standard 101-220 ตร.ม.', 101::numeric, 220::numeric, 13::numeric, 1700::numeric, 'เหมาะกับบ้านเดี่ยวทั่วไป', true),
      ('GDN-CARE-01', 'Plus 221-450 ตร.ม.', 221::numeric, 450::numeric, 12::numeric, 2500::numeric, 'เหมาะกับสวนหลายโซน', true),
      ('GDN-CARE-01', 'Estate 451-900 ตร.ม.', 451::numeric, 900::numeric, 10::numeric, 3600::numeric, 'สำหรับพื้นที่สวนขนาดใหญ่', true),
      ('GDN-DESIGN-01', 'Concept 0-120 ตร.ม.', 0::numeric, 120::numeric, 22::numeric, 2800::numeric, 'แบบแนวคิดและผังโซนปลูกเบื้องต้น', true),
      ('GDN-DESIGN-01', 'Masterplan 121-280 ตร.ม.', 121::numeric, 280::numeric, 20::numeric, 4200::numeric, 'ออกแบบพื้นที่หลักและวัสดุตกแต่ง', true),
      ('GDN-DESIGN-01', 'Premium 281-500 ตร.ม.', 281::numeric, 500::numeric, 18::numeric, 6200::numeric, 'แบบละเอียดพร้อมรายการแนะนำ', true),
      ('GDN-DESIGN-01', 'Estate 501-1000 ตร.ม.', 501::numeric, 1000::numeric, 16::numeric, 9200::numeric, 'เหมาะกับโครงการขนาดใหญ่', true),
      ('GDN-CONTRACT-01', 'Starter 0-120 ตร.ม.', 0::numeric, 120::numeric, 45::numeric, 5200::numeric, 'งานปรับพื้นที่และปลูกพื้นฐาน', true),
      ('GDN-CONTRACT-01', 'Standard 121-300 ตร.ม.', 121::numeric, 300::numeric, 42::numeric, 8200::numeric, 'รวมงานฮาร์ดสเคปเบื้องต้น', true),
      ('GDN-CONTRACT-01', 'Plus 301-600 ตร.ม.', 301::numeric, 600::numeric, 39::numeric, 12200::numeric, 'รองรับพื้นที่หลายฟังก์ชัน', true),
      ('GDN-CONTRACT-01', 'Estate 601-1200 ตร.ม.', 601::numeric, 1200::numeric, 36::numeric, 17800::numeric, 'เหมาะกับโครงการและรีสอร์ท', true),
      ('GDN-IRRIG-01', 'Starter 0-150 ตร.ม.', 0::numeric, 150::numeric, 24::numeric, 2600::numeric, 'ระบบน้ำหยดพื้นฐาน', true),
      ('GDN-IRRIG-01', 'Standard 151-320 ตร.ม.', 151::numeric, 320::numeric, 22::numeric, 4200::numeric, 'น้ำหยด/สปริงเกอร์แบบผสม', true),
      ('GDN-IRRIG-01', 'Plus 321-650 ตร.ม.', 321::numeric, 650::numeric, 20::numeric, 6400::numeric, 'เพิ่มโซนควบคุมและตั้งเวลา', true),
      ('GDN-IRRIG-01', 'Estate 651-1300 ตร.ม.', 651::numeric, 1300::numeric, 18::numeric, 9800::numeric, 'ระบบน้ำหลายโซนสำหรับพื้นที่ใหญ่', true)
  ) AS v(
    service_code,
    template_name,
    area_min,
    area_max,
    price_per_unit,
    base_price,
    description,
    is_active
  )
),
service_map AS (
  SELECT s.id AS service_id, s.service_code
  FROM public.services s
  JOIN (
    SELECT DISTINCT service_code FROM template_seed
  ) t ON t.service_code = s.service_code
),
updated_templates AS (
  UPDATE public.price_templates pt
  SET
    area_min = ts.area_min,
    area_max = ts.area_max,
    price_per_unit = ts.price_per_unit,
    base_price = ts.base_price,
    description = ts.description,
    is_active = ts.is_active,
    updated_at = now()
  FROM template_seed ts
  JOIN service_map sm ON sm.service_code = ts.service_code
  WHERE pt.service_id = sm.service_id
    AND pt.template_name = ts.template_name
  RETURNING pt.id
)
INSERT INTO public.price_templates (
  service_id,
  template_name,
  area_min,
  area_max,
  price_per_unit,
  base_price,
  description,
  is_active
)
SELECT
  sm.service_id,
  ts.template_name,
  ts.area_min,
  ts.area_max,
  ts.price_per_unit,
  ts.base_price,
  ts.description,
  ts.is_active
FROM template_seed ts
JOIN service_map sm ON sm.service_code = ts.service_code
WHERE NOT EXISTS (
  SELECT 1
  FROM public.price_templates pt
  WHERE pt.service_id = sm.service_id
    AND pt.template_name = ts.template_name
);

COMMIT;

-- Rollback reference consolidated from migration rollback files.
-- Keep these commented for manual use; they are not executed by this master file.
-- DROP TABLE IF EXISTS _migrations CASCADE;
-- ALTER TABLE auth.users
-- DROP COLUMN IF EXISTS deployment_version,
-- DROP COLUMN IF EXISTS first_login_at,
-- DROP COLUMN IF EXISTS last_activity_at;
-- DROP INDEX IF EXISTS idx_users_last_activity;
-- DROP POLICY IF EXISTS product_events_admin_read ON product_events;
-- DROP POLICY IF EXISTS product_events_insert_own ON product_events;
-- DROP TABLE IF EXISTS product_events;

-- =========================================================
-- 12) XYL STUDIO POS SYSTEM (PRO-OPS & SYNCED)
-- =========================================================

-- STAFF PROFILES ENHANCEMENT
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_type TEXT DEFAULT 'cafe';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_level TEXT DEFAULT 'staff' CHECK (staff_level IN ('staff', 'manager', 'admin'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- INVENTORY & RAW MATERIALS (SYNCED TO POS CODE)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit TEXT DEFAULT 'unit',
    stock_quantity DECIMAL(12,4) DEFAULT 0,
    min_stock_level DECIMAL(12,4) DEFAULT 0,
    cost_price DECIMAL(12,2) DEFAULT 0, -- Used for Catalogue/POS margin
    last_restock_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ENSURE COLUMNS EXIST (SAFE MIGRATION)
DO $$
BEGIN
    -- Rename if old columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='current_stock') THEN
        ALTER TABLE public.inventory_items RENAME COLUMN current_stock TO stock_quantity;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='min_stock') THEN
        ALTER TABLE public.inventory_items RENAME COLUMN min_stock TO min_stock_level;
    END IF;

    -- Add columns if they don't exist yet (for fresh tables)
    ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(12,4) DEFAULT 0;
    ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS min_stock_level DECIMAL(12,4) DEFAULT 0;
END $$;


-- POS TABLES & ZONES
CREATE TABLE IF NOT EXISTS public.pos_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number TEXT NOT NULL,
    zone TEXT DEFAULT 'General',
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'billing', 'dirty')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- MENU CATEGORIES
CREATE TABLE IF NOT EXISTS public.pos_menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- MENU ITEMS
CREATE TABLE IF NOT EXISTS public.pos_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.pos_menu_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(12,2) DEFAULT 0, -- ADDED: For margin calculation
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_out_of_stock BOOLEAN DEFAULT false,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pos_menu_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12,2) DEFAULT 0;

-- MODIFIERS & GROUPS
CREATE TABLE IF NOT EXISTS public.pos_menu_modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    min_selection INTEGER DEFAULT 0,
    max_selection INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_menu_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.pos_menu_modifier_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    extra_price DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_item_modifier_links (
    item_id UUID REFERENCES public.pos_menu_items(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.pos_menu_modifier_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, group_id)
);

-- SHIFT MANAGEMENT
CREATE TABLE IF NOT EXISTS public.pos_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.profiles(id),
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    start_cash DECIMAL(12,2) DEFAULT 0,
    end_cash DECIMAL(12,2),
    actual_cash DECIMAL(12,2),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- SHOP SETTINGS (SYNCED TO LIFF & POS)
CREATE TABLE IF NOT EXISTS public.pos_shop_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_open BOOLEAN DEFAULT true, -- Emergency Toggle
    opening_hours JSONB DEFAULT '{
        "monday": {"open": "08:00", "close": "20:00", "closed": false},
        "tuesday": {"open": "08:00", "close": "20:00", "closed": false},
        "wednesday": {"open": "08:00", "close": "20:00", "closed": false},
        "thursday": {"open": "08:00", "close": "20:00", "closed": false},
        "friday": {"open": "08:00", "close": "22:00", "closed": false},
        "saturday": {"open": "09:00", "close": "22:00", "closed": false},
        "sunday": {"open": "09:00", "close": "20:00", "closed": false}
    }',
    status_message TEXT DEFAULT 'ร้านปิดรับออเดอร์ชั่วคราว ขออภัยในความไม่สะดวกครับ',
    status TEXT DEFAULT 'open', -- 'open', 'paused', 'closed'
    status_expiry TIMESTAMPTZ, -- For timed pauses
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_shift_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES public.pos_shifts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('pay_in', 'pay_out')),
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ADVANCED INVENTORY: MODIFIER INGREDIENT LINKAGE
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

-- RE-ATTACH TRIGGER
DROP TRIGGER IF EXISTS tr_deduct_stock_on_order ON public.pos_order_items;
CREATE TRIGGER tr_deduct_stock_on_order
AFTER INSERT ON public.pos_order_items
FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_order();

-- ORDERS & HOLD BILL SYSTEM
CREATE TABLE IF NOT EXISTS public.pos_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    staff_id UUID REFERENCES public.profiles(id),
  customer_id UUID REFERENCES public.pos_members(id) ON DELETE SET NULL,
    table_id UUID REFERENCES public.pos_tables(id) ON DELETE SET NULL,
    table_number TEXT,
    queue_number INTEGER,
    total_amount DECIMAL(12,2) NOT NULL,
    net_total DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    service_charge_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_type TEXT DEFAULT 'fixed',
    promo_code TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'paid', 
    paid_at TIMESTAMPTZ,
    reference_name TEXT,
    shift_id UUID REFERENCES public.pos_shifts(id),
    order_type TEXT DEFAULT 'dine_in',
    line_user_id TEXT,
    delivery_address TEXT,
    delivery_latitude DOUBLE PRECISION,
    delivery_longitude DOUBLE PRECISION,
    delivery_fee DECIMAL(12,2) DEFAULT 0,
    stripe_session_id TEXT,
    order_source TEXT DEFAULT 'pos',
    customer_name TEXT,
    customer_image TEXT,
    points_earned INTEGER DEFAULT 0,
    points_redeemed INTEGER DEFAULT 0,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- SAFE MIGRATION FOR EXISTING TABLES
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS customer_image TEXT;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS line_user_id TEXT;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS queue_number INTEGER;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'pos';
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS points_redeemed INTEGER DEFAULT 0;

-- RE-AFFIRM LIFECYCLE CONSTRAINTS
ALTER TABLE public.pos_orders DROP CONSTRAINT IF EXISTS pos_orders_status_check;
ALTER TABLE public.pos_orders ADD CONSTRAINT pos_orders_status_check 
CHECK (status IN ('pending', 'paid', 'accepted', 'preparing', 'shipping', 'completed', 'cancelled'));

-- REFRESH SCHEMA CACHE FOR POSTGREST
NOTIFY pgrst, 'reload schema';

-- IDENTITY RLS & PERMISSIONS
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Write" ON public.pos_orders;
CREATE POLICY "Public Write" ON public.pos_orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update" ON public.pos_orders;
CREATE POLICY "Public Update" ON public.pos_orders FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Public Read" ON public.pos_orders;
CREATE POLICY "Public Read" ON public.pos_orders FOR SELECT USING (true);

-- ENSURE STATUS COLUMN EXISTS IN ORDER ITEMS
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.pos_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.pos_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.pos_menu_items(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    cost_price DECIMAL(12,2) DEFAULT 0, -- Tracks cost for profit reporting
    subtotal DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    selected_modifiers JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- MULTI-PAYMENT SUPPORT
CREATE TABLE IF NOT EXISTS public.pos_order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.pos_orders(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL, -- cash, promptpay, credit_card
    amount DECIMAL(12,2) NOT NULL,
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ENSURE COLUMNS EXIST IN CASE OF PRE-EXISTING TABLE
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12,2) DEFAULT 0;

-- FORCE RECREATE FOREIGN KEY WITH SAFE SET NULL (Ensures no FK violations on item deletion)
ALTER TABLE public.pos_order_items DROP CONSTRAINT IF EXISTS pos_order_items_item_id_fkey;
ALTER TABLE public.pos_order_items 
ADD CONSTRAINT pos_order_items_item_id_fkey 
FOREIGN KEY (item_id) 
REFERENCES public.pos_menu_items(id) 
ON DELETE SET NULL;


-- ORDER NUMBER GENERATION (Centralized Sequence to prevent collisions)
CREATE SEQUENCE IF NOT EXISTS public.pos_order_seq;

-- HARDENED ORDER NUMBER GENERATION (With collision detection)
CREATE OR REPLACE FUNCTION public.generate_unique_order_number(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    new_order_no TEXT;
    done BOOLEAN DEFAULT FALSE;
    seq_val INTEGER;
    attempts INTEGER DEFAULT 0;
BEGIN
    WHILE NOT done LOOP
        attempts := attempts + 1;
        -- Get next sequence value from centralized sequence
        SELECT nextval('public.pos_order_seq') INTO seq_val;
        
        -- Short Unique Format: #240413-0001 (Unique per day and year-safe)
        new_order_no := '#' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '-' || LPAD(seq_val::TEXT, 4, '0');

        -- If collision occurs (e.g. legacy data), add a random suffix after few attempts
        IF attempts > 1 THEN
            new_order_no := new_order_no || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 3));
        END IF;

        -- Final Unique check against target table
        IF NOT EXISTS (SELECT 1 FROM public.pos_orders WHERE order_number = new_order_no) THEN
            done := TRUE;
        END IF;

        -- Security break
        IF attempts > 10 THEN
            new_order_no := prefix || '-ERR-' || seq_val || '-' || floor(random() * 9999);
            done := TRUE;
        END IF;
    END LOOP;
    
    RETURN new_order_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ATOMIC INVENTORY UPDATE FUNCTION (Used via RPC)
CREATE OR REPLACE FUNCTION public.decrement_inventory_stock(target_id UUID, deduction_amount DECIMAL)
RETURNS VOID AS $$
BEGIN
    UPDATE public.inventory_items
    SET stock_quantity = stock_quantity - deduction_amount
    WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURITY POLICIES (RLS MASTER SECTION)
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view all orders" ON public.pos_orders;
CREATE POLICY "Staff can view all orders" ON public.pos_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage orders" ON public.pos_orders;
CREATE POLICY "Staff can manage orders" ON public.pos_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to POS tables" ON public.pos_tables;
CREATE POLICY "Allow all access to POS tables" ON public.pos_tables FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to POS menu" ON public.pos_menu_items;
CREATE POLICY "Allow all access to POS menu" ON public.pos_menu_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to POS categories" ON public.pos_menu_categories;
CREATE POLICY "Allow all access to POS categories" ON public.pos_menu_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to POS items" ON public.pos_order_items;
CREATE POLICY "Allow all access to POS items" ON public.pos_order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to POS shifts" ON public.pos_shifts;
CREATE POLICY "Allow all access to POS shifts" ON public.pos_shifts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to POS inventory" ON public.inventory_items;
CREATE POLICY "Allow all access to POS inventory" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to POS modifiers" ON public.pos_menu_modifiers;
CREATE POLICY "Allow all access to POS modifiers" ON public.pos_menu_modifiers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to POS groups" ON public.pos_menu_modifier_groups;
CREATE POLICY "Allow all access to POS groups" ON public.pos_menu_modifier_groups FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to POS links" ON public.pos_item_modifier_links;
CREATE POLICY "Allow all access to POS links" ON public.pos_item_modifier_links FOR ALL USING (true) WITH CHECK (true);


-- STORAGE BUCKET & POLICIES (SYNCED TO POSMenuManager)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pos_menu_images', 'pos_menu_images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id = 'pos_menu_images');

DROP POLICY IF EXISTS "Staff Upload Access" ON storage.objects;
CREATE POLICY "Staff Upload Access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pos_menu_images');

-- SEED DATA
INSERT INTO public.pos_tables (table_number, zone, status) 
VALUES ('Parked', 'System', 'available')
ON CONFLICT DO NOTHING;

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_pos_order_number ON public.pos_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_pos_staff_id ON public.pos_orders(staff_id);
CREATE INDEX IF NOT EXISTS idx_item_category_id ON public.pos_menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_pos_orders_customer_id ON public.pos_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_orders_paid_at ON public.pos_orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_pos_orders_stripe_session ON public.pos_orders(stripe_session_id);

-- ADDITIONAL RLS FOR NEW TABLES
ALTER TABLE public.pos_order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to POS order payments" ON public.pos_order_payments;
CREATE POLICY "Allow all access to POS order payments" ON public.pos_order_payments FOR ALL USING (true) WITH CHECK (true);

-- BUSINESS LOGIC TRIGGERS

-- Trigger: Update Customer Points on Payment
CREATE OR REPLACE FUNCTION public.update_customer_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'paid' AND NEW.customer_id IS NOT NULL AND (OLD.status IS DISTINCT FROM 'paid') THEN
        UPDATE public.pos_members
        SET points = points + NEW.points_earned - NEW.points_redeemed,
        total_spent = total_spent + NEW.total_amount,
        updated_at = now()
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_customer_on_payment ON public.pos_orders;
CREATE TRIGGER tr_update_customer_on_payment
AFTER UPDATE ON public.pos_orders
FOR EACH ROW EXECUTE FUNCTION public.update_customer_on_payment();


-- =========================================================
-- MODERN ENHANCEMENTS & MIGRATIONS (APRIL 2026 CONSOLIDATED)
-- =========================================================


-- 1. LOYALTY & CUSTOMER SYSTEM
CREATE TABLE IF NOT EXISTS public.pos_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_user_id TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    points INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    member_tier TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    address TEXT,
    phone TEXT,
    full_name TEXT,
    marketing_preferences JSONB DEFAULT '{}',
    customer_tier TEXT DEFAULT 'Standard',
    date_of_birth DATE,
    gender TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 🛡️ PATCH: Update status constraint to allow full LIFF + POS lifecycle
ALTER TABLE public.pos_orders DROP CONSTRAINT IF EXISTS pos_orders_status_check;
ALTER TABLE public.pos_orders ADD CONSTRAINT pos_orders_status_check 
CHECK (status IN ('pending', 'payment_pending', 'paid', 'accepted', 'preparing', 'shipping', 'out_for_delivery', 'completed', 'delivered', 'cancelled', 'confirmed', 'in_progress'));

ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.pos_members(id) ON DELETE SET NULL;
ALTER TABLE public.pos_orders DROP CONSTRAINT IF EXISTS pos_orders_customer_id_fkey;
ALTER TABLE public.pos_orders
  ADD CONSTRAINT pos_orders_customer_id_fkey
  FOREIGN KEY (customer_id)
  REFERENCES public.pos_members(id)
  ON DELETE SET NULL;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS points_redeemed INTEGER DEFAULT 0;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS line_user_id TEXT;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS queue_number INTEGER;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'pos'; -- 'pos' or 'liff'
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS customer_image TEXT;
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS payment_intent_id TEXT; -- Critical for webhooks/PromptPay

-- 2. MULTI-PAYMENT SUPPORT
CREATE TABLE IF NOT EXISTS public.pos_order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.pos_orders(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL, -- cash, promptpay, credit_card
    amount DECIMAL(12,2) NOT NULL,
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. HARDENED ORDER NUMBER GENERATION (With collision detection)
CREATE OR REPLACE FUNCTION public.generate_unique_order_number(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    new_order_no TEXT;
    done BOOLEAN DEFAULT FALSE;
    seq_val INTEGER;
    attempts INTEGER DEFAULT 0;
BEGIN
    WHILE NOT done LOOP
        attempts := attempts + 1;
        -- Get next sequence value
        SELECT nextval('public.pos_order_seq') INTO seq_val;
        
        -- Generate number (Prefix + Date + Sequence + Random Fallback if too many attempts)
        IF attempts < 5 THEN
            new_order_no := prefix || '#' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(seq_val::TEXT, 4, '0');
        ELSE
            -- If we keep hitting duplicates (sequence reset?), add a random hash
            new_order_no := prefix || '#' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(seq_val::TEXT, 4, '0') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 3));
        END IF;

        -- Check if it exists
        IF NOT EXISTS (SELECT 1 FROM public.pos_orders WHERE order_number = new_order_no) THEN
            done := TRUE;
        END IF;

        -- Hard break to prevent infinite loops (should never happen)
        IF attempts > 10 THEN
            new_order_no := prefix || '-ERR-' || seq_val || '-' || floor(random() * 9999);
            done := TRUE;
        END IF;
    END LOOP;
    
    RETURN new_order_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.generate_unique_order_number(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.generate_unique_order_number(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_unique_order_number(TEXT) TO service_role;

-- 5. RECENT PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_pos_orders_payment_intent_id ON public.pos_orders(payment_intent_id);

-- 6. MENU & SHOP OPERATIONAL SETTINGS
-- Ensure pos_menu_items has the description column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pos_menu_items' AND column_name='description') THEN
        ALTER TABLE pos_menu_items ADD COLUMN description TEXT;
    END IF;
END $$;

-- Create pos_shop_settings table for operational control
CREATE TABLE IF NOT EXISTS pos_shop_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_open BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'open',
    status_expiry TIMESTAMPTZ,
    opening_hours JSONB DEFAULT '{
      "monday": {"open": "08:00", "close": "18:00", "closed": false},
      "tuesday": {"open": "08:00", "close": "18:00", "closed": false},
      "wednesday": {"open": "08:00", "close": "18:00", "closed": false},
      "thursday": {"open": "08:00", "close": "18:00", "closed": false},
      "friday": {"open": "08:00", "close": "18:00", "closed": false},
      "saturday": {"open": "08:00", "close": "18:00", "closed": false},
      "sunday": {"open": "08:00", "close": "18:00", "closed": false}
    }'::jsonb,
    status_message TEXT DEFAULT 'ขออภัย ขณะนี้ร้านปิดให้บริการชั่วคราว',
    latitude NUMERIC,
    longitude NUMERIC,
    pricing_tiers JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings if not exists
INSERT INTO pos_shop_settings (id, is_open)
SELECT uuid_generate_v4(), true
WHERE NOT EXISTS (SELECT 1 FROM pos_shop_settings)
LIMIT 1;

-- Set RLS for pos_shop_settings (Allow read for all, update for authenticated)
ALTER TABLE pos_shop_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on shop settings" ON pos_shop_settings;
CREATE POLICY "Allow public read on shop settings" 
ON pos_shop_settings FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated update on shop settings" ON pos_shop_settings;
CREATE POLICY "Allow authenticated update on shop settings" 
ON pos_shop_settings FOR UPDATE 
TO authenticated 
USING (true);

-- 6.5 MENU CATEGORIES & ITEMS
CREATE TABLE IF NOT EXISTS public.pos_menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.pos_menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sale_price NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_out_of_stock BOOLEAN DEFAULT false,
    is_recommended BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pos_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on categories" ON public.pos_menu_categories;
CREATE POLICY "Allow public read on categories" ON public.pos_menu_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read on items" ON public.pos_menu_items;
CREATE POLICY "Allow public read on items" ON public.pos_menu_items FOR SELECT USING (true);


-- POS BANNERS SYSTEM
CREATE TABLE IF NOT EXISTS public.pos_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    title TEXT,
    subtitle TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for pos_banners
ALTER TABLE public.pos_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on pos_banners" ON public.pos_banners;
CREATE POLICY "Allow public read on pos_banners" ON public.pos_banners FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated write on pos_banners" ON public.pos_banners;
CREATE POLICY "Allow authenticated write on pos_banners" ON public.pos_banners FOR ALL TO authenticated USING (true);

-- POS MENU SYSTEM RLS
ALTER TABLE public.pos_menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on pos_menu_items" ON public.pos_menu_items;
CREATE POLICY "Allow public read on pos_menu_items" ON public.pos_menu_items FOR SELECT USING (true);

ALTER TABLE public.pos_menu_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on pos_menu_categories" ON public.pos_menu_categories;
CREATE POLICY "Allow public read on pos_menu_categories" ON public.pos_menu_categories FOR SELECT USING (true);

-- =========================================================
-- CANONICAL MERGE OF RETIRED SQL PATCH FILES
-- Sources folded into this schema:
-- - add_modifier_sort.sql
-- - add_shop_location_and_tiers.sql
-- - advanced_inventory_system.sql
-- - create_qr_reward_table.sql
-- - expand_customer_crm.sql
-- - fix_modifiers_rls.sql
-- - fix_pos_members_rls.sql
-- - fix_pos_settings_rls.sql
-- - pos_multi_branch_settings.sql
-- - setup_loyalty_system.sql
-- - supabase_rls_hardening.sql
-- - supabase_realtime_setup.sql
-- - migrations/20260407153500_add_description_to_points_history.sql
-- - migrations/20260408111000_short_order_numbers.sql
-- - migrations/20260408233500_add_unit_conversion_to_inventory.sql
-- =========================================================

ALTER TABLE public.pos_menu_modifier_groups
  ADD COLUMN IF NOT EXISTS min_select INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_select INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.pos_menu_modifiers
  ADD COLUMN IF NOT EXISTS recipe_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_adjustment NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.pos_menu_items
  ADD COLUMN IF NOT EXISTS recipe_data JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS purchase_unit VARCHAR(50),
  ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS display_unit VARCHAR(50);

UPDATE public.inventory_items
SET conversion_factor = COALESCE(conversion_factor, 1),
  purchase_unit = COALESCE(purchase_unit, unit),
  display_unit = COALESCE(display_unit, unit)
WHERE conversion_factor IS NULL
   OR purchase_unit IS NULL
   OR display_unit IS NULL;

ALTER TABLE public.pos_shop_settings
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT 13.7431,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT 100.5638,
  ADD COLUMN IF NOT EXISTS pricing_tiers JSONB DEFAULT '[{"max_dist": 2, "fee": 40}, {"max_dist": 5, "fee": 60}, {"max_dist": 10, "fee": 90}, {"max_dist": 999, "fee": 120}]'::jsonb,
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS check_in_radius DOUBLE PRECISION DEFAULT 50.0,
  ADD COLUMN IF NOT EXISTS delivery_fee_rules JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.pos_members(id) ON DELETE CASCADE,
  line_user_id TEXT,
  label TEXT,
  full_address TEXT NOT NULL,
  address_detail TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_addresses_member_id ON public.saved_addresses(member_id);
CREATE INDEX IF NOT EXISTS idx_saved_addresses_line_user_id ON public.saved_addresses(line_user_id);

ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow SELECT for own addresses" ON public.saved_addresses;
CREATE POLICY "Allow SELECT for own addresses" ON public.saved_addresses
FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow INSERT for mixed access" ON public.saved_addresses;
CREATE POLICY "Allow INSERT for mixed access" ON public.saved_addresses
FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow UPDATE for own addresses" ON public.saved_addresses;
CREATE POLICY "Allow UPDATE for own addresses" ON public.saved_addresses
FOR UPDATE USING (true);

CREATE TABLE IF NOT EXISTS public.pos_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in_at TIMESTAMPTZ DEFAULT now(),
  check_out_at TIMESTAMPTZ,
  check_in_lat DOUBLE PRECISION,
  check_in_lng DOUBLE PRECISION,
  check_out_lat DOUBLE PRECISION,
  check_out_lng DOUBLE PRECISION,
  distance_from_branch DOUBLE PRECISION,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'late', 'outside_radius')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_attendance_staff_id ON public.pos_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_pos_attendance_branch_id ON public.pos_attendance(branch_id);

ALTER TABLE public.pos_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read attendance" ON public.pos_attendance;
CREATE POLICY "Allow authenticated read attendance" ON public.pos_attendance
FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert attendance" ON public.pos_attendance;
CREATE POLICY "Allow authenticated insert attendance" ON public.pos_attendance
FOR INSERT TO authenticated WITH CHECK (auth.uid() = staff_id);
DROP POLICY IF EXISTS "Allow authenticated update attendance" ON public.pos_attendance;
CREATE POLICY "Allow authenticated update attendance" ON public.pos_attendance
FOR UPDATE TO authenticated USING (auth.uid() = staff_id);

CREATE TABLE IF NOT EXISTS public.pos_points_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id TEXT NOT NULL,
  order_id UUID REFERENCES public.pos_orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'earn' CHECK (type IN ('earn', 'redeem', 'reset', 'adjustment')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.pos_points_history
  ADD COLUMN IF NOT EXISTS member_id TEXT,
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.pos_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'earn',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_pos_points_history_member_id ON public.pos_points_history(member_id);
CREATE INDEX IF NOT EXISTS idx_pos_points_history_order_id ON public.pos_points_history(order_id);

CREATE OR REPLACE FUNCTION public.increment_member_points(user_id TEXT, points_to_add INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.pos_members
  SET points = COALESCE(points, 0) + points_to_add,
    updated_at = now()
  WHERE line_user_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_member_points(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_member_points(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_member_points(TEXT, INTEGER) TO service_role;

CREATE TABLE IF NOT EXISTS public.pos_qr_reward_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by TEXT,
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_token ON public.pos_qr_reward_tokens(token);

ALTER TABLE public.pos_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow SELECT for all" ON public.pos_members;
CREATE POLICY "Allow SELECT for all" ON public.pos_members
FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow UPDATE for own record" ON public.pos_members;
CREATE POLICY "Allow UPDATE for own record" ON public.pos_members
FOR UPDATE USING (true)
WITH CHECK (true);
DROP POLICY IF EXISTS "Allow INSERT for all" ON public.pos_members;
CREATE POLICY "Allow INSERT for all" ON public.pos_members
FOR INSERT WITH CHECK (true);

ALTER TABLE public.pos_qr_reward_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role has full access to qr_tokens" ON public.pos_qr_reward_tokens;
CREATE POLICY "Service role has full access to qr_tokens"
ON public.pos_qr_reward_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
DROP POLICY IF EXISTS "Staff can read qr_tokens" ON public.pos_qr_reward_tokens;
CREATE POLICY "Staff can read qr_tokens"
ON public.pos_qr_reward_tokens
FOR SELECT
TO authenticated
USING (true);

ALTER TABLE public.pos_points_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role has full access to points_history" ON public.pos_points_history;
CREATE POLICY "Service role has full access to points_history"
ON public.pos_points_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
DROP POLICY IF EXISTS "Users can read their own points_history" ON public.pos_points_history;
CREATE POLICY "Users can read their own points_history"
ON public.pos_points_history
FOR SELECT
TO authenticated, anon
USING (true);

ALTER TABLE public.pos_shop_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated insert on shop settings" ON public.pos_shop_settings;
CREATE POLICY "Allow authenticated insert on shop settings"
ON public.pos_shop_settings FOR INSERT TO authenticated
WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated delete on shop settings" ON public.pos_shop_settings;
CREATE POLICY "Allow authenticated delete on shop settings"
ON public.pos_shop_settings FOR DELETE TO authenticated
USING (true);

ALTER TABLE public.pos_menu_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_menu_modifiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on modifier groups" ON public.pos_menu_modifier_groups;
CREATE POLICY "Allow public select on modifier groups" ON public.pos_menu_modifier_groups
FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public select on modifiers" ON public.pos_menu_modifiers;
CREATE POLICY "Allow public select on modifiers" ON public.pos_menu_modifiers
FOR SELECT USING (true);

DO $$
DECLARE
  realtime_table TEXT;
  realtime_tables TEXT[] := ARRAY['pos_orders', 'pos_shop_settings', 'pos_shifts', 'pos_menu_items', 'pos_attendance'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH realtime_table IN ARRAY realtime_tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', realtime_table);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END $$;

ALTER TABLE public.pos_orders REPLICA IDENTITY FULL;
ALTER TABLE public.pos_shop_settings REPLICA IDENTITY FULL;
ALTER TABLE public.pos_shifts REPLICA IDENTITY FULL;
ALTER TABLE public.pos_attendance REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF to_regclass('public.jobs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Staff/Admin can read jobs" ON public.jobs';
    EXECUTE 'DROP POLICY IF EXISTS "Staff/Admin can write jobs" ON public.jobs';
    EXECUTE 'DROP TABLE IF EXISTS public.jobs';
  END IF;
END $$;

DROP TABLE IF EXISTS public.pos_menu_recipes;
DROP TABLE IF EXISTS public.pos_modifier_recipes;

DO $$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Select own bookings" ON public.bookings';
    EXECUTE 'DROP POLICY IF EXISTS "Insert own bookings" ON public.bookings';
    EXECUTE 'DROP POLICY IF EXISTS "Update own bookings" ON public.bookings';
    EXECUTE 'DROP TABLE IF EXISTS public.bookings';
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.deduct_stock_on_waste() CASCADE;
DROP TABLE IF EXISTS public.inventory_waste;

DROP TABLE IF EXISTS public.pos_promotions;

ALTER TABLE public.pos_orders DROP CONSTRAINT IF EXISTS pos_orders_customer_id_fkey;
DROP TABLE IF EXISTS public.pos_customers;
ALTER TABLE public.pos_orders
  ADD CONSTRAINT pos_orders_customer_id_fkey
  FOREIGN KEY (customer_id)
  REFERENCES public.pos_members(id)
  ON DELETE SET NULL;

GRANT SELECT ON public.pos_orders TO anon, authenticated;
GRANT SELECT ON public.pos_shop_settings TO anon, authenticated;
GRANT SELECT ON public.pos_shifts TO anon, authenticated;
GRANT SELECT ON public.pos_menu_items TO anon, authenticated;
GRANT SELECT ON public.pos_attendance TO authenticated;

NOTIFY pgrst, 'reload schema';

-- FINAL VERIFICATION
SELECT 'schema-all-in-one.sql is now the canonical active schema' AS message;
