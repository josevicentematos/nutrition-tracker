# Nutrition Tracker

A simple web app to register products (per-100g nutrition) and build a standing
daily meal plan with per-section and total macros + calories. React + Supabase.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a free Supabase project at https://supabase.com.
3. In the Supabase SQL editor, run the contents of `supabase/schema.sql`.
4. In Authentication → Providers, enable Email. For a personal single-user app
   you may disable "Confirm email".
5. Copy `.env.example` to `.env.local` and fill in your project URL and anon key:
   ```bash
   cp .env.example .env.local
   ```
6. Run the dev server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — start the dev server
- `npm test` — run the test suite once
- `npm run test:watch` — watch mode
- `npm run build` — type-check and production build
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint

## Architecture

- **Frontend:** Vite + React (TypeScript), single-page app, two screens (My Day,
  Products) with state-based tab navigation.
- **Backend:** Supabase (Postgres + Auth). The app talks directly to Supabase
  via its JS client; there is no custom server.
- **Security:** Row Level Security scopes every row to the logged-in user; the
  anon key is safe to ship because RLS enforces isolation.
- **Macro math:** pure functions in `src/lib/nutrition.ts`, unit-tested.

See `docs/superpowers/specs/` and `docs/superpowers/plans/` for the design spec
and implementation plan.

## Deploy (free)

Frontend (static) on Cloudflare Pages or Vercel:
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The Supabase project hosts the database and auth on its free tier. Note: a free
Supabase project pauses after ~7 days of inactivity and can be resumed from the
dashboard.
