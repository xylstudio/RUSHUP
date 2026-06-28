const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
create table if not exists public.house_collaborators (
  id uuid primary key default gen_random_uuid(),
  house_id uuid references public.houses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer', 'editor', 'co-owner')),
  created_at timestamptz not null default now()
);

-- Unique constraint so a user can't be added to the same house twice
create unique index if not exists uniq_house_collaborators_house_user on public.house_collaborators(house_id, user_id);

alter table public.house_collaborators enable row level security;

-- Drop existing policies first if they exist
drop policy if exists "Admin/Staff can manage house_collaborators" on public.house_collaborators;
drop policy if exists "Users can read house_collaborators for own houses" on public.house_collaborators;

-- Admin/staff can read/write
create policy "Admin/Staff can manage house_collaborators" on public.house_collaborators
  for all to authenticated using (public.is_admin_or_staff()) with check (public.is_admin_or_staff());

-- Users can see collaborators for houses they own
create policy "Users can read house_collaborators for own houses" on public.house_collaborators
  for select to authenticated
  using (
    exists (
      select 1 from public.houses h
      where h.id = house_collaborators.house_id and (h.user_id = auth.uid() or h.customer_id = auth.uid())
    )
    or user_id = auth.uid()
  );

-- Update houses RLS to allow collaborators to view/edit
drop policy if exists "Users can read own houses" on public.houses;
create policy "Users can read own houses" on public.houses
  for select to authenticated
  using (
    auth.uid() = user_id 
    or auth.uid() = customer_id 
    or exists (select 1 from public.house_collaborators hc where hc.house_id = id and hc.user_id = auth.uid())
  );

drop policy if exists "Users can update own houses" on public.houses;
create policy "Users can update own houses" on public.houses
  for update to authenticated
  using (
    auth.uid() = user_id 
    or auth.uid() = customer_id 
    or exists (select 1 from public.house_collaborators hc where hc.house_id = id and hc.user_id = auth.uid() and hc.role in ('editor', 'co-owner'))
  )
  with check (
    auth.uid() = user_id 
    or auth.uid() = customer_id 
    or exists (select 1 from public.house_collaborators hc where hc.house_id = id and hc.user_id = auth.uid() and hc.role in ('editor', 'co-owner'))
  );
`;

async function run() {
  // Use run_sql rpc
  const { data, error } = await supabase.rpc('run_sql', { sql_query: sql });
  if (error) {
    console.error("Migration failed:", error);
  } else {
    console.log("Migration succeeded:", data);
  }
}
run();
