# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm test` — run the full Vitest suite once
- `npm run test:watch` — Vitest in watch mode
- `npx vitest run <pattern>` — run a single test file by name fragment, e.g. `npx vitest run nutrition` or `npx vitest run MyDayScreen`
- `npm run build` — `tsc -b` (type-check, all of `src/`) then `vite build`
- `npm run lint` — ESLint
- `npm run preview` — serve the production build

There is no separate type-check script; `npm run build` is the type-check gate. Components are tree-shaken out of the bundle until `App.tsx` imports them, but `tsc -b` still type-checks every file in `src/`.

## Running the app locally

The app talks directly to Supabase and **will not start without env vars**: `src/lib/supabase.ts` throws at import time if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing. Setup: create a Supabase project, run `supabase/schema.sql` in its SQL editor, then `cp .env.example .env.local` and fill in the URL + anon key. The anon key is meant to ship in the client; Row Level Security is what protects data.

Tests do **not** need env vars — they mock the data layer (see Testing).

## Architecture

React + Vite + TypeScript single-page app with **no custom backend**. The browser talks straight to Supabase (Postgres + Auth) via `@supabase/supabase-js`. Three layers:

- **`src/data/*`** — the only modules that touch Supabase. `products.ts`, `sections.ts`, `planItems.ts` each export thin async CRUD functions. Anything needing persistence goes through here; components never import `supabase` directly.
- **`src/lib/nutrition.ts`** — pure macro math (`scalePortion`, `addNutrients`, `sumPortions`), no I/O. All calorie/macro totals are computed **client-side** from fetched rows; totals scale by `amount / serving_size` and `Nutrients` includes `sodium` (from each product's `sodium_mg`). This is the highest-value code to unit-test. The one-line macro summary (`formatNutrients`) renders carbs before protein: `… · C · P · F · Na …`.
- **`src/components/*`, `src/auth/*`** — components fetch via the data layer into local `useState`, then render totals using the pure functions. `AuthProvider` exposes the Supabase session; `App.tsx` gates on it and switches between the two screens with local tab state (no router).

### Domain model (see `src/types.ts` and `supabase/schema.sql`)

- The user keeps **one standing daily plan** — there is no date/history dimension. `plan_items` (a product + amount + section) is the core table.
- Nutrition is entered **per the product's label serving**: each product has a `unit` (`g`/`ml`/`piece`), a `serving_size`, and per-serving `calories`/`protein`/`carbs`/`fat`/`sodium_mg`. Portions scale by `amount / serving_size` (see `scalePortion`).
- `plan_items` stores `amount` (the quantity eaten, in the product's unit). Plan amounts pre-fill from the product's `serving_size`.
- Products also carry an optional package (`package_size` + `package_unit` + `package_price`). `package_unit` may differ from the serving `unit` (e.g. serving in `piece`, package in `g`). These are **stored but not yet displayed** — a future weekly-budget feature will use them, and will need a cross-unit conversion when `package_unit` differs from `unit`. There is no cost math in the app today.
- Meal sections (Breakfast, Lunch, Snack, Intra-workout, Dinner) are seeded **client-side** by `ensureDefaultSections()` on first load — not by a DB trigger — and are user-editable.
- Every table has a `user_id` and an RLS policy `auth.uid() = user_id`. Any new table must follow this pattern or data will leak across users.
- Deleting a product that is used in plan items is **blocked by a UI warning** (`ProductsScreen`) that offers to remove those items first; the schema also enforces this with `on delete restrict` on `plan_items.product_id`.

## Testing conventions

- Pure functions (`nutrition`, `format`) are tested by direct calls.
- Component tests mock the data layer with `vi.hoisted(() => ({...}))` + `vi.mock('../data/...')` so Supabase is never loaded. Follow this pattern rather than mocking `@supabase/supabase-js`.
- Querying caveat: product names appear both in list rows and in `<select>` options — prefer role/label queries (e.g. the `Remove X from Y` button) over `getByText(name)`, which will be ambiguous.

## Gotchas

- ESLint runs the React 19 rule `react-hooks/set-state-in-effect`. The fetch-on-mount effects in `MyDayScreen`/`ProductsScreen` set state after an `await` and are disabled per-line with a comment — keep that pattern if you add similar effects.
- The design spec and implementation plan live in `docs/superpowers/`; consult them for intended scope before adding features (date history, goals, barcode, external food DBs are explicitly out of scope for v1).
