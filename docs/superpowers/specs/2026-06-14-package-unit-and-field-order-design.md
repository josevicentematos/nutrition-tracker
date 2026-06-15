# Separate Package Unit + Macro Field Order — Design Spec

**Date:** 2026-06-14
**Status:** Approved
**Builds on:** `2026-06-14-label-based-nutrition-design.md`

## Summary

Two changes to the product model and form:

1. **Separate package unit.** A product's package can be measured in a different
   unit than its serving. Add `package_unit` alongside the existing
   `package_size` and `package_price`, so a serving in `piece` can coexist with a
   package in `g` (e.g. bread: serving 2 slices, package 500 g).
2. **Carbs before protein everywhere.** Reorder the macro fields so carbohydrates
   come before protein in the product form AND in the one-line macro summary
   shown across the app.

Cost/budgeting remains deferred; package fields are still stored, not displayed.

## Motivation

The single-`unit` model forced the package into the serving's unit, which breaks
for foods whose serving is counted (pieces) but whose package is sold by weight.
Giving the package its own unit lets the user enter exactly what the label says.
The cross-unit cost conversion (e.g. grams per piece) is a known, accepted gap
that will be addressed when budgeting is built — not now.

Separately, the user reads labels carbs-first and wants the UI to match.

## Data Model

### `products` (changed)

Unchanged fields: `unit` (the **serving/consumption** unit), `serving_size`,
`calories`, `protein`, `carbs`, `fat`, `sodium_mg`, `package_size`,
`package_price`.

**Added:** `package_unit text` — the **package's own** unit, one of
`g`/`ml`/`piece`, nullable. May differ from `unit`.

**Invariant:** `package_size`, `package_unit`, and `package_price` are either all
set together or all null. (`package_unit` is only meaningful when a package size
is present.)

No other tables change.

## Macro Field Order

Carbs before protein, applied in two places:

- **`formatNutrients`** output changes from
  `{cal} kcal · P {p} · C {c} · F {f} · Na {na}mg`
  to
  `{cal} kcal · C {c} · P {p} · F {f} · Na {na}mg`.
  Example: `200 kcal · C 40 · P 20 · F 10 · Na 100mg`.
  `NutrientBadge`, `ProductsScreen`, and `MyDayScreen` render through
  `formatNutrients`, so they update automatically.
- **`ProductForm`** input order (see below).

The `Nutrients` type and `scalePortion` are unaffected (field math is unchanged;
object key order is irrelevant to behavior).

## ProductForm

- Relabel the existing serving-unit select from **"Unit"** to **"Serving unit"**.
- Add a **"Package unit"** select (`g`/`ml`/`piece`) next to the package size.
- Keep the paired validation on package size/price: if exactly one of
  `package_size` / `package_price` is filled, block submit with
  *"Enter both package size and price, or leave both blank."* When both are
  filled, `package_unit` is taken from its select; when both are blank,
  `package_size`, `package_unit`, and `package_price` are all submitted as `null`.
- `package_unit` select defaults to the current serving `unit` value at form
  init (most products share a unit); the user can change it.
- **Field order (carbs before protein):** Name, Serving unit, Serving size,
  Calories per serving, **Carbs per serving, Protein per serving**, Fat per
  serving, Sodium per serving (mg), Package size (optional), Package unit,
  Package price (optional).

`ProductInput` gains `package_unit: Unit | null`.

## Migration & Schema

Migration file `supabase/migrations/2026-06-14-package-unit.sql`, run once:

```sql
alter table public.products add column package_unit text
  check (package_unit is null or package_unit in ('g','ml','piece'));
update public.products set package_unit = unit where package_size is not null;
```

This is lossless: the old `package_size` was implicitly in the serving `unit`, so
backfilling `package_unit = unit` preserves existing package data with no
re-entry. `supabase/schema.sql` is rewritten to include `package_unit` for fresh
installs.

## Error Handling

Unchanged from current behavior: name required, serving size > 0, the package
size/price pairing, inline `<p role="alert">` errors, non-negative numeric
inputs.

## Testing

- **`format`:** assert the new `C · P` order (with sodium).
- **`NutrientBadge`:** assert the new summary string.
- **`MyDayScreen`:** subtotal/grand-total assert the new order
  (`200 kcal · C 40 · P 20 · F 10 · Na 100mg`).
- **`ProductForm`:** new "Package unit" select captured into `ProductInput`,
  relabeled "Serving unit", carbs-before-protein field order, package pairing
  (including all-null when blank, and `package_unit` populated when a package is
  entered).
- `ProductsScreen` test already queries only `/per … /`, so it is unaffected by
  the order change; verify it still passes.
- Supabase remains mocked via `vi.hoisted` + `vi.mock`.

## Docs

Update `CLAUDE.md`: note the two units (`unit` = serving, `package_unit` =
package, may differ) and the `C·P·F` macro display order.

## Out of Scope (unchanged)

Cost/weekly-budget display, currency formatting, and the cross-unit conversion
bridge (all deferred to the future budgeting feature).
