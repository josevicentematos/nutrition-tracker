-- Add a separate package unit so a product's package can be measured in a
-- different unit than its serving. Run once in the Supabase SQL editor.

alter table public.products add column package_unit text
  check (package_unit is null or package_unit in ('g','ml','piece'));

-- Existing package_size values were implicitly in the serving unit, so backfill
-- package_unit = unit for rows that have a package (lossless).
update public.products set package_unit = unit where package_size is not null;
