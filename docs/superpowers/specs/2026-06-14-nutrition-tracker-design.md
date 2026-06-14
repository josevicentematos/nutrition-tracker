# Nutrition Tracker — Design Spec

**Date:** 2026-06-14
**Status:** Approved (initial v1 scope)

## Summary

A simple, English-only web app for tracking a standing daily meal plan and its
nutrition totals. The user manually registers products (as they buy them) with
per-100g nutrition info, then assigns those products with gram portions into
meal sections (Breakfast, Lunch, Snack, Intra-workout, Dinner). The app shows
per-section subtotals and a grand daily total for calories, protein, carbs, and
fat. Data syncs across devices via a free backend.

This is the **core initial feature**. Everything else is explicitly deferred
until this works.

## Goals

- Register products manually with per-100g nutrition and an optional default
  serving size.
- Place products with gram portions into meal sections.
- See per-section subtotals and a grand total (calories + protein/carbs/fat).
- Edit the plan over time (one standing plan, not dated history).
- Multi-device access with sync (log in from phone and laptop, same data).
- Hosted entirely for free.
- Simple UI, English only, no localization.

## Non-Goals (out of scope for v1, YAGNI)

- Date-based history / daily logging over time.
- Barcode scanning.
- External food databases (USDA, Open Food Facts).
- Nutrition goals / targets / remaining-budget tracking.
- Charts and analytics.
- Sharing / multi-user collaboration.
- Offline mode (online connection required for v1).

## Architecture

- **Frontend:** Vite + React single-page app. Plain, simple UI. English only,
  no i18n.
- **Backend:** Supabase — managed Postgres + Auth + auto-generated REST/realtime
  API. The React app talks directly to Supabase via its JS client; there is no
  custom server to build or maintain.
- **Security:** Row Level Security (RLS) enabled on every table, with policies
  scoping all rows to `auth.uid()`. The Supabase anon key ships in the frontend;
  this is safe because RLS enforces per-user isolation.
- **Hosting:** Static frontend on a free host (Cloudflare Pages or Vercel).
  Supabase free tier for database + auth. Entirely free.
  - Known caveat: a free Supabase project pauses after ~7 days of zero activity
    and must be resumed with one click in the dashboard.

### Configuration

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` provided as build-time env
  vars. Safe to expose given RLS.

## Data Model

All tables include `id` (uuid, primary key), `user_id` (uuid, references the
authenticated user), and timestamps (`created_at`, `updated_at`). RLS policy on
each table: `user_id = auth.uid()` for select/insert/update/delete.

### `products`
The user's manually-registered catalog of products.

| Column              | Type    | Notes                                   |
|---------------------|---------|-----------------------------------------|
| `name`              | text    | Required.                               |
| `calories_per_100g` | numeric | kcal per 100g. >= 0.                    |
| `protein_per_100g`  | numeric | grams per 100g. >= 0.                   |
| `carbs_per_100g`    | numeric | grams per 100g. >= 0.                   |
| `fat_per_100g`      | numeric | grams per 100g. >= 0.                   |
| `default_serving_g` | numeric | Optional. Pre-fills grams when adding.  |

### `meal_sections`
The named categories of the standing daily plan.

| Column       | Type    | Notes                                         |
|--------------|---------|-----------------------------------------------|
| `name`       | text    | Required. e.g. "Breakfast".                   |
| `sort_order` | integer | Controls display order.                       |

Seeded per user on first use with: **Breakfast, Lunch, Snack, Intra-workout,
Dinner**. User can rename, add, remove, and reorder sections.

### `plan_items`
A product placed into a meal section with a portion size. The heart of "what I
eat every day."

| Column       | Type    | Notes                                          |
|--------------|---------|------------------------------------------------|
| `section_id` | uuid    | References `meal_sections`. On delete cascade. |
| `product_id` | uuid    | References `products`. Delete is blocked at the UI by a warning (see Error Handling). |
| `grams`      | numeric | Portion in grams. > 0.                          |
| `sort_order` | integer | Order within the section.                       |

There is exactly one standing plan per user (no date dimension).

## Macro Calculation

Pure, standalone functions (no I/O), so the math is trivially unit-testable.

- For each `plan_item`: `factor = grams / 100`. Each nutrient total =
  `product.<nutrient>_per_100g * factor`.
- **Section subtotal:** sum of its items' nutrient totals.
- **Grand total:** sum of all section subtotals.
- Calories are stored and entered explicitly (matching product labels), not
  derived from macros.

## Screens

### My Day (default screen)
- Lists each meal section in `sort_order`.
- Under each section: its `plan_items` (product name + grams), a per-section
  subtotal (cal / P / C / F).
- A grand total for the whole day.
- Actions: add a product to a section (pick from catalog; grams pre-filled from
  `default_serving_g` when present), edit grams, remove an item.
- Section management: rename, add, remove, reorder.

### Products
- List of products with their per-100g values.
- Add / edit / delete a product. Form fields: name, calories/protein/carbs/fat
  per 100g, optional default serving (g).

### Login
- Supabase auth — email + password (or magic link). Single user per account.

## Error Handling

- **Validation:** `name` required; numeric fields non-negative; `grams` > 0.
- Supabase errors surfaced inline near the relevant action.
- Loading states on data fetches.
- Deleting a product that is referenced by plan items: the app warns the user
  that it is used in N meal item(s) and offers to remove those plan items as
  part of the delete. The delete does not proceed silently.

## Testing

- **Tooling:** Vitest + React Testing Library.
- **Heaviest coverage:** the pure macro-total functions (factor scaling,
  section subtotals, grand total, edge cases like zero/empty sections).
- **Component tests:** product add/edit form validation; adding/editing/removing
  plan items.
- Supabase client mocked in tests; no live network calls in the test suite.

## Open Questions / Future

None blocking v1. Future features (history, goals, external food DBs, barcode
scanning) each get their own spec → plan → implementation cycle later.
