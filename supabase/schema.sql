-- Nutrition Tracker schema. Run once in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- PRODUCTS -----------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  unit text not null check (unit in ('g','ml','piece')),
  serving_size numeric not null check (serving_size > 0),
  calories numeric not null default 0 check (calories >= 0),
  protein  numeric not null default 0 check (protein >= 0),
  carbs    numeric not null default 0 check (carbs >= 0),
  fat      numeric not null default 0 check (fat >= 0),
  sodium_mg numeric not null default 0 check (sodium_mg >= 0),
  package_size  numeric check (package_size is null or package_size > 0),
  package_price numeric check (package_price is null or package_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MEAL SECTIONS ------------------------------------------------------------
create table public.meal_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PLAN ITEMS ---------------------------------------------------------------
create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  section_id uuid not null references public.meal_sections (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  amount numeric not null check (amount > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plan_items_section_idx on public.plan_items (section_id);
create index plan_items_product_idx on public.plan_items (product_id);

-- ROW LEVEL SECURITY -------------------------------------------------------
alter table public.products enable row level security;
alter table public.meal_sections enable row level security;
alter table public.plan_items enable row level security;

create policy "own products" on public.products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own meal_sections" on public.meal_sections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own plan_items" on public.plan_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
