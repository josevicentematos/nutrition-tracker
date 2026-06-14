# Label-Based Nutrition + Sodium & Price — Design Spec

**Date:** 2026-06-14
**Status:** Approved
**Builds on:** `2026-06-14-nutrition-tracker-design.md` (v1 core)

## Summary

Replace the per-100g nutrition model with a **label-based** one: each product
stores its nutrition exactly as printed for its own serving size, in its own
unit (g / ml / piece). Add **sodium** to the tracked nutrients, and add optional
**price** fields (package price + package size) stored now for a future weekly
budgeting feature. Plan amounts are entered in each food's unit and scaled by
`amount / serving_size`.

Existing data is migrated automatically and transparently.

## Motivation

Entering nutrition per 100g forces mental math, because real labels print values
for varying serving sizes (milk 200 ml, pasta 80 g, tuna 60 g, eggs per piece).
Storing values exactly as the label shows them makes adding foods faster and less
error-prone.

## Goals

- Enter nutrition as printed on the label, for the food's own serving size.
- Support three serving units: grams, milliliters, pieces.
- Track sodium (mg) alongside calories/protein/carbs/fat.
- Store price as package price + package size (optional), for future budgeting.
- Enter plan amounts in the food's unit; totals scale correctly.
- Migrate existing data with no loss and identical resulting numbers.

## Non-Goals (deferred to later PRs)

- Cost/weekly-budget computation or display.
- Currency formatting / selection.
- Per-piece weight (a "piece" has no gram weight in this model; it is counted).

## Data Model

### `products` (changed)

| Column          | Type    | Notes                                                |
|-----------------|---------|------------------------------------------------------|
| `name`          | text    | Required.                                            |
| `unit`          | text    | Required. One of `g`, `ml`, `piece`.                 |
| `serving_size`  | numeric | Required, > 0. Label serving amount, in `unit`.      |
| `calories`      | numeric | >= 0. Per serving.                                   |
| `protein`       | numeric | >= 0. Per serving (grams).                           |
| `carbs`         | numeric | >= 0. Per serving (grams).                           |
| `fat`           | numeric | >= 0. Per serving (grams).                           |
| `sodium_mg`     | numeric | >= 0. Per serving (milligrams).                      |
| `package_size`  | numeric | Optional, > 0 when set. Package amount, in `unit`.   |
| `package_price` | numeric | Optional, >= 0 when set. What the package cost.      |

Removed from v1: `calories_per_100g`, `protein_per_100g`, `carbs_per_100g`,
`fat_per_100g`, `default_serving_g`.

`serving_size` doubles as the default plan amount (pre-fill), replacing the old
`default_serving_g`. `serving_size` and `package_size` are independent numbers.

### `plan_items` (changed)

- `grams` renamed to **`amount`** (numeric, > 0): quantity eaten, in the
  product's `unit`.

Unchanged: `section_id`, `product_id`, `sort_order`, `user_id`, timestamps, RLS.

### `meal_sections`

Unchanged.

## Scaling Math

In `src/lib/nutrition.ts`:

- `Nutrients` gains a `sodium` field (mg).
- `scalePortion(product, amount)`: `factor = amount / product.serving_size`;
  each of `calories/protein/carbs/fat/sodium_mg` is multiplied by `factor`.
- `sumPortions` and `addNutrients` extend to carry `sodium`.
- Macro/sodium totals are unit-agnostic numbers, so a section mixing products of
  different units sums correctly. Amounts themselves are never summed across
  products.
- **No cost math in this PR.**

## UI Changes

### ProductForm
- Add a **unit** dropdown (`g` / `ml` / `piece`) and a **serving size** input.
- Relabel nutrition inputs to "per serving": Calories, Protein, Carbs, Fat.
- Add **Sodium (mg)** input.
- Add optional **Package size** and **Package price** inputs.
- Validation: `name` required; `unit` required; `serving_size` > 0; nutrition
  fields >= 0; `package_size`/`package_price` either both blank or valid (a price
  without a package size cannot be scaled — treated as incomplete, see Error
  Handling).

### AddPlanItem
- The amount input is labeled/suffixed with the selected product's unit.
- Selecting a product pre-fills the amount with that product's `serving_size`
  (replaces old `default_serving_g` behavior).

### MyDayScreen / ProductsScreen
- Plan rows and product rows display amounts with their unit (`250 ml`, `90 g`,
  `2 pcs`). `piece` renders as `pcs`.
- Per-section subtotals and the grand total include **sodium**.
- ProductsScreen list shows per-serving nutrition and the serving (e.g.
  `per 200 ml`).
- Delete-with-warning flow unchanged.

## Migration

A new file `supabase/migrations/2026-06-14-label-based-nutrition.sql`, run once
in the Supabase SQL editor:

1. `products`: rename `calories_per_100g`→`calories`, `protein_per_100g`→
   `protein`, `carbs_per_100g`→`carbs`, `fat_per_100g`→`fat` (values unchanged).
2. `products`: add `unit text not null default 'g'`, `serving_size numeric`,
   `sodium_mg numeric not null default 0`, `package_size numeric`,
   `package_price numeric`.
3. `products`: set `serving_size = 100` where null (so existing per-100g values
   become per-serving with serving 100 g — math identical); then add
   `not null` + `check (serving_size > 0)` and
   `check (unit in ('g','ml','piece'))`.
4. `products`: drop `default_serving_g`.
5. `plan_items`: rename `grams`→`amount` (existing values unchanged; with
   serving_size 100 the factor `amount/serving_size` equals the old
   `grams/100`).

`supabase/schema.sql` is also rewritten to the new shape so fresh projects get
the final schema directly (no migration needed for new setups).

## Error Handling

- A `package_price` set without a `package_size` (or vice versa) is incomplete —
  the form blocks save with a clear message, since price cannot be scaled without
  a package size. Both blank is fine (price simply omitted).
- Existing validation patterns (inline errors, non-negative numbers) carry over.

## Testing

- **`nutrition`:** update for `serving_size`-based scaling and the new `sodium`
  field; cover a non-100 serving size and a `piece` product.
- **`format`:** `formatNutrients` includes sodium (e.g. `… · Na 120mg`).
- **`ProductForm`:** new fields, unit selection, the package price/size paired
  validation.
- **`AddPlanItem`:** amount pre-fills from `serving_size`; unit shown.
- **`MyDayScreen` / `ProductsScreen`:** `amount` field, unit display, sodium in
  totals.
- **`NutrientBadge`:** sodium rendered.
- Supabase remains mocked via `vi.hoisted` + `vi.mock`.

## Docs

Update `CLAUDE.md`: change the domain-model description from per-100g to
per-serving + unit, note `plan_items.amount`, sodium, and the deferred price
fields.
