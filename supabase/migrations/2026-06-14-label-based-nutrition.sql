-- Migrate products from per-100g to label-based per-serving, add sodium + price.
-- Run once in the Supabase SQL editor on an existing v1 database.

-- 1. Rename nutrition columns (values are unchanged; they become per-serving).
alter table public.products rename column calories_per_100g to calories;
alter table public.products rename column protein_per_100g  to protein;
alter table public.products rename column carbs_per_100g    to carbs;
alter table public.products rename column fat_per_100g      to fat;

-- 2. Add new columns.
alter table public.products add column unit text not null default 'g';
alter table public.products add column serving_size numeric;
alter table public.products add column sodium_mg numeric not null default 0
  check (sodium_mg >= 0);
alter table public.products add column package_size numeric
  check (package_size is null or package_size > 0);
alter table public.products add column package_price numeric
  check (package_price is null or package_price >= 0);

-- 3. Existing per-100g rows: serving size 100 g keeps the math identical.
update public.products set serving_size = 100 where serving_size is null;

-- 4. Lock down the new required columns.
alter table public.products alter column serving_size set not null;
alter table public.products add constraint products_serving_size_check
  check (serving_size > 0);
alter table public.products add constraint products_unit_check
  check (unit in ('g','ml','piece'));
alter table public.products alter column unit drop default;

-- 5. Drop the obsolete UI default.
alter table public.products drop column default_serving_g;

-- 6. Plan items: grams becomes amount (amount/serving_size == old grams/100).
alter table public.plan_items rename column grams to amount;
