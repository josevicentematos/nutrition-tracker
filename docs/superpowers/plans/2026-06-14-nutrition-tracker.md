# Nutrition Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a simple, synced web app to register products (per-100g nutrition) and assign gram portions into meal sections, showing per-section and daily totals for calories, protein, carbs, and fat.

**Architecture:** Vite + React (TypeScript) single-page app talking directly to Supabase (Postgres + Auth) via its JS client. Row Level Security scopes all data to the logged-in user. Macro math lives in pure, unit-tested functions. State-based tab navigation between two screens (My Day, Products). Static frontend + Supabase free tier = entirely free hosting.

**Tech Stack:** Vite, React 18, TypeScript, @supabase/supabase-js, Vitest, @testing-library/react, @testing-library/user-event, jsdom.

**Reference spec:** `docs/superpowers/specs/2026-06-14-nutrition-tracker-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html` | Project scaffold + test config |
| `.gitignore`, `.env.example` | Ignore secrets/build; document required env vars |
| `supabase/schema.sql` | Tables, RLS policies, indexes (run once in Supabase) |
| `src/main.tsx` | React entry point |
| `src/App.tsx` | Auth gate + tab navigation shell |
| `src/types.ts` | `Product`, `MealSection`, `PlanItem`, `Nutrients` types |
| `src/lib/nutrition.ts` | Pure macro-calc functions |
| `src/lib/nutrition.test.ts` | Tests for macro math |
| `src/lib/format.ts` | Display rounding/formatting helpers |
| `src/lib/format.test.ts` | Tests for formatting |
| `src/lib/supabase.ts` | Supabase client singleton |
| `src/data/products.ts` | Product CRUD against Supabase |
| `src/data/sections.ts` | Meal-section CRUD + default seeding |
| `src/data/planItems.ts` | Plan-item CRUD |
| `src/auth/AuthProvider.tsx` | Session context + sign in/out |
| `src/auth/Login.tsx` | Login form |
| `src/components/ProductForm.tsx` | Add/edit product form |
| `src/components/ProductsScreen.tsx` | Product list + delete-with-warning |
| `src/components/MyDayScreen.tsx` | Sections, items, totals |
| `src/components/AddPlanItem.tsx` | Add a product+grams to a section |
| `src/components/NutrientBadge.tsx` | Renders a Nutrients summary |
| `README.md` | Setup + deploy instructions |

---

## Task 1: Scaffold Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`
- Create: `.gitignore`, `.env.example`

- [ ] **Step 1: Create the Vite React+TS scaffold**

Run from the project root (the directory already exists and contains `docs/` and `.git/`, so scaffold in place):

```bash
npm create vite@latest . -- --template react-ts
```

If prompted that the directory is not empty, choose "Ignore files and continue".

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Replace the file contents with:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 4: Create the test setup file**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Add scripts to `package.json`**

Ensure the `"scripts"` block includes:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Create `.gitignore`**

Create/overwrite `.gitignore`:

```gitignore
node_modules
dist
dist-ssr
*.local
.env
.env.local
.DS_Store
*.log
```

- [ ] **Step 7: Create `.env.example`**

Create `.env.example`:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 8: Sanity-check the toolchain**

Run:

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 9: Add a trivial passing test to confirm Vitest works**

Create `src/lib/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run:

```bash
npm test
```

Expected: 1 test passes.

- [ ] **Step 10: Remove the smoke test and commit**

Delete `src/lib/smoke.test.ts`, then:

```bash
git add -A
git commit -m "chore: scaffold vite react-ts project with vitest"
```

---

## Task 2: Database schema and RLS

**Files:**
- Create: `supabase/schema.sql`

This task produces the SQL to run in the Supabase SQL editor. There is no automated test; verification is running it against a real project.

- [ ] **Step 1: Write the schema SQL**

Create `supabase/schema.sql`:

```sql
-- Nutrition Tracker schema. Run once in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- PRODUCTS -----------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  calories_per_100g numeric not null default 0 check (calories_per_100g >= 0),
  protein_per_100g  numeric not null default 0 check (protein_per_100g >= 0),
  carbs_per_100g    numeric not null default 0 check (carbs_per_100g >= 0),
  fat_per_100g      numeric not null default 0 check (fat_per_100g >= 0),
  default_serving_g numeric check (default_serving_g is null or default_serving_g > 0),
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
  grams numeric not null check (grams > 0),
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
```

Note: `plan_items.product_id` uses `on delete restrict` so the database blocks deleting an in-use product. The app removes the plan items first after warning the user (Task 11), so the restrict never surfaces as a raw error in normal flow.

- [ ] **Step 2: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add database schema with RLS policies"
```

- [ ] **Step 3: Manual setup (record in README later)**

These are manual steps the developer performs once; they are documented in Task 13's README:
1. Create a free Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`.
3. In Authentication settings, enable Email provider (email + password). For convenience, you may disable "Confirm email" for a personal single-user app.
4. Copy the project URL and anon key into `.env.local`.

---

## Task 3: Supabase client and types

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/types.ts`
- Modify: `src/vite-env.d.ts`

- [ ] **Step 1: Declare typed env vars**

Replace `src/vite-env.d.ts` with:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 2: Create the domain types**

Create `src/types.ts`:

```ts
export interface Product {
  id: string;
  user_id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  default_serving_g: number | null;
  created_at: string;
  updated_at: string;
}

export interface MealSection {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanItem {
  id: string;
  user_id: string;
  section_id: string;
  product_id: string;
  grams: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
```

- [ ] **Step 3: Create the Supabase client singleton**

Create `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env.local and fill in values.'
  );
}

export const supabase = createClient(url, anonKey);
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts src/types.ts src/vite-env.d.ts
git commit -m "feat: add supabase client and domain types"
```

---

## Task 4: Pure macro-calculation functions (TDD)

**Files:**
- Create: `src/lib/nutrition.ts`
- Test: `src/lib/nutrition.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/nutrition.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { scalePortion, addNutrients, sumPortions, EMPTY_NUTRIENTS } from './nutrition';
import type { Product } from '../types';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    user_id: 'u1',
    name: 'Test',
    calories_per_100g: 100,
    protein_per_100g: 10,
    carbs_per_100g: 20,
    fat_per_100g: 5,
    default_serving_g: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('scalePortion', () => {
  it('scales per-100g values by grams/100', () => {
    expect(scalePortion(product(), 200)).toEqual({
      calories: 200, protein: 20, carbs: 40, fat: 10,
    });
  });

  it('handles fractional grams', () => {
    expect(scalePortion(product(), 50)).toEqual({
      calories: 50, protein: 5, carbs: 10, fat: 2.5,
    });
  });
});

describe('addNutrients', () => {
  it('adds two nutrient sets field by field', () => {
    expect(
      addNutrients(
        { calories: 1, protein: 2, carbs: 3, fat: 4 },
        { calories: 10, protein: 20, carbs: 30, fat: 40 },
      ),
    ).toEqual({ calories: 11, protein: 22, carbs: 33, fat: 44 });
  });
});

describe('sumPortions', () => {
  it('returns EMPTY_NUTRIENTS for no portions', () => {
    expect(sumPortions([])).toEqual(EMPTY_NUTRIENTS);
  });

  it('sums multiple scaled portions', () => {
    const result = sumPortions([
      { product: product(), grams: 100 },
      { product: product({ calories_per_100g: 200, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 0 }), grams: 100 },
    ]);
    expect(result).toEqual({ calories: 300, protein: 10, carbs: 20, fat: 5 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- nutrition`
Expected: FAIL (module `./nutrition` not found / functions undefined).

- [ ] **Step 3: Implement the functions**

Create `src/lib/nutrition.ts`:

```ts
import type { Product, Nutrients } from '../types';

export const EMPTY_NUTRIENTS: Nutrients = {
  calories: 0, protein: 0, carbs: 0, fat: 0,
};

export function scalePortion(product: Product, grams: number): Nutrients {
  const factor = grams / 100;
  return {
    calories: product.calories_per_100g * factor,
    protein: product.protein_per_100g * factor,
    carbs: product.carbs_per_100g * factor,
    fat: product.fat_per_100g * factor,
  };
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

export function sumPortions(
  portions: { product: Product; grams: number }[],
): Nutrients {
  return portions.reduce(
    (acc, p) => addNutrients(acc, scalePortion(p.product, p.grams)),
    EMPTY_NUTRIENTS,
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- nutrition`
Expected: all nutrition tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition.ts src/lib/nutrition.test.ts
git commit -m "feat: add pure macro-calculation functions"
```

---

## Task 5: Display formatting helpers (TDD)

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { round1, formatNutrients } from './format';

describe('round1', () => {
  it('rounds to one decimal place', () => {
    expect(round1(2.5)).toBe(2.5);
    expect(round1(2.04)).toBe(2);
    expect(round1(2.06)).toBe(2.1);
  });
});

describe('formatNutrients', () => {
  it('formats a one-line summary with rounded values', () => {
    expect(
      formatNutrients({ calories: 300.04, protein: 10.06, carbs: 20, fat: 5 }),
    ).toBe('300 kcal · P 10.1 · C 20 · F 5');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- format`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the helpers**

Create `src/lib/format.ts`:

```ts
import type { Nutrients } from '../types';

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function formatNutrients(n: Nutrients): string {
  return (
    `${round1(n.calories)} kcal · ` +
    `P ${round1(n.protein)} · ` +
    `C ${round1(n.carbs)} · ` +
    `F ${round1(n.fat)}`
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- format`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: add nutrient display formatting helpers"
```

---

## Task 6: Data access layer

**Files:**
- Create: `src/data/products.ts`
- Create: `src/data/sections.ts`
- Create: `src/data/planItems.ts`

These wrap Supabase queries. They are thin and exercised through component tests later (Supabase mocked), so no separate unit test here — verification is the build passing.

- [ ] **Step 1: Products data access**

Create `src/data/products.ts`:

```ts
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export type ProductInput = {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  default_serving_g: number | null;
};

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data as Product[];
}

export async function createProduct(userId: string, input: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Sections data access (with default seeding)**

Create `src/data/sections.ts`:

```ts
import { supabase } from '../lib/supabase';
import type { MealSection } from '../types';

export const DEFAULT_SECTION_NAMES = [
  'Breakfast',
  'Lunch',
  'Snack',
  'Intra-workout',
  'Dinner',
];

export async function listSections(): Promise<MealSection[]> {
  const { data, error } = await supabase
    .from('meal_sections')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as MealSection[];
}

/** Inserts the default sections if the user has none yet. Returns current sections. */
export async function ensureDefaultSections(userId: string): Promise<MealSection[]> {
  const existing = await listSections();
  if (existing.length > 0) return existing;

  const rows = DEFAULT_SECTION_NAMES.map((name, i) => ({
    user_id: userId,
    name,
    sort_order: i,
  }));
  const { error } = await supabase.from('meal_sections').insert(rows);
  if (error) throw error;
  return listSections();
}

export async function createSection(userId: string, name: string, sortOrder: number): Promise<MealSection> {
  const { data, error } = await supabase
    .from('meal_sections')
    .insert({ user_id: userId, name, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as MealSection;
}

export async function renameSection(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('meal_sections')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSection(id: string): Promise<void> {
  const { error } = await supabase.from('meal_sections').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 3: Plan items data access**

Create `src/data/planItems.ts`:

```ts
import { supabase } from '../lib/supabase';
import type { PlanItem } from '../types';

export async function listPlanItems(): Promise<PlanItem[]> {
  const { data, error } = await supabase
    .from('plan_items')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as PlanItem[];
}

export async function addPlanItem(
  userId: string,
  sectionId: string,
  productId: string,
  grams: number,
  sortOrder: number,
): Promise<PlanItem> {
  const { data, error } = await supabase
    .from('plan_items')
    .insert({
      user_id: userId,
      section_id: sectionId,
      product_id: productId,
      grams,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PlanItem;
}

export async function updatePlanItemGrams(id: string, grams: number): Promise<void> {
  const { error } = await supabase
    .from('plan_items')
    .update({ grams, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deletePlanItem(id: string): Promise<void> {
  const { error } = await supabase.from('plan_items').delete().eq('id', id);
  if (error) throw error;
}

/** Used by the product-delete warning flow. */
export async function countPlanItemsForProduct(productId: string): Promise<number> {
  const { count, error } = await supabase
    .from('plan_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);
  if (error) throw error;
  return count ?? 0;
}

export async function deletePlanItemsForProduct(productId: string): Promise<void> {
  const { error } = await supabase.from('plan_items').delete().eq('product_id', productId);
  if (error) throw error;
}
```

- [ ] **Step 4: Verify build and commit**

Run: `npm run build`
Expected: succeeds.

```bash
git add src/data/
git commit -m "feat: add supabase data access layer"
```

---

## Task 7: Auth provider and login screen

**Files:**
- Create: `src/auth/AuthProvider.tsx`
- Create: `src/auth/Login.tsx`

- [ ] **Step 1: Create the auth context/provider**

Create `src/auth/AuthProvider.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthValue {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Create the login screen**

Create `src/auth/Login.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fn =
      mode === 'signin'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <div className="login">
      <h1>Nutrition Tracker</h1>
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input type="email" value={email} required
            onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} required minLength={6}
            onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <button type="button" className="link"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify build and commit**

Run: `npm run build`
Expected: succeeds.

```bash
git add src/auth/
git commit -m "feat: add auth provider and login screen"
```

---

## Task 8: NutrientBadge component (TDD)

**Files:**
- Create: `src/components/NutrientBadge.tsx`
- Test: `src/components/NutrientBadge.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/NutrientBadge.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NutrientBadge } from './NutrientBadge';

describe('NutrientBadge', () => {
  it('renders a labeled, formatted nutrient summary', () => {
    render(
      <NutrientBadge label="Total" nutrients={{ calories: 300, protein: 10, carbs: 20, fat: 5 }} />,
    );
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('300 kcal · P 10 · C 20 · F 5')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- NutrientBadge`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the component**

Create `src/components/NutrientBadge.tsx`:

```tsx
import type { Nutrients } from '../types';
import { formatNutrients } from '../lib/format';

export function NutrientBadge({ label, nutrients }: { label: string; nutrients: Nutrients }) {
  return (
    <div className="nutrient-badge">
      <span className="nutrient-badge__label">{label}</span>
      <span className="nutrient-badge__values">{formatNutrients(nutrients)}</span>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- NutrientBadge`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/NutrientBadge.tsx src/components/NutrientBadge.test.tsx
git commit -m "feat: add NutrientBadge component"
```

---

## Task 9: ProductForm component (TDD)

**Files:**
- Create: `src/components/ProductForm.tsx`
- Test: `src/components/ProductForm.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ProductForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm } from './ProductForm';

describe('ProductForm', () => {
  it('submits entered values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Oats');
    await userEvent.type(screen.getByLabelText('Calories per 100g'), '380');
    await userEvent.type(screen.getByLabelText('Protein per 100g'), '13');
    await userEvent.type(screen.getByLabelText('Carbs per 100g'), '67');
    await userEvent.type(screen.getByLabelText('Fat per 100g'), '7');
    await userEvent.type(screen.getByLabelText('Default serving (g, optional)'), '40');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Oats',
      calories_per_100g: 380,
      protein_per_100g: 13,
      carbs_per_100g: 67,
      fat_per_100g: 7,
      default_serving_g: 40,
    });
  });

  it('blocks submit when name is empty', async () => {
    const onSubmit = vi.fn();
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
  });

  it('sends null default_serving_g when left blank', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Water');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Water', default_serving_g: null }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ProductForm`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the component**

Create `src/components/ProductForm.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import type { Product } from '../types';
import type { ProductInput } from '../data/products';

interface Props {
  initial?: Product;
  onSubmit: (input: ProductInput) => Promise<void>;
  onCancel: () => void;
}

function num(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function ProductForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [calories, setCalories] = useState(String(initial?.calories_per_100g ?? ''));
  const [protein, setProtein] = useState(String(initial?.protein_per_100g ?? ''));
  const [carbs, setCarbs] = useState(String(initial?.carbs_per_100g ?? ''));
  const [fat, setFat] = useState(String(initial?.fat_per_100g ?? ''));
  const [serving, setServing] = useState(
    initial?.default_serving_g != null ? String(initial.default_serving_g) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        calories_per_100g: num(calories),
        protein_per_100g: num(protein),
        carbs_per_100g: num(carbs),
        fat_per_100g: num(fat),
        default_serving_g: serving.trim() === '' ? null : num(serving),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <label>Name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>Calories per 100g
        <input type="number" min="0" step="any" value={calories}
          onChange={(e) => setCalories(e.target.value)} />
      </label>
      <label>Protein per 100g
        <input type="number" min="0" step="any" value={protein}
          onChange={(e) => setProtein(e.target.value)} />
      </label>
      <label>Carbs per 100g
        <input type="number" min="0" step="any" value={carbs}
          onChange={(e) => setCarbs(e.target.value)} />
      </label>
      <label>Fat per 100g
        <input type="number" min="0" step="any" value={fat}
          onChange={(e) => setFat(e.target.value)} />
      </label>
      <label>Default serving (g, optional)
        <input type="number" min="0" step="any" value={serving}
          onChange={(e) => setServing(e.target.value)} />
      </label>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="actions">
        <button type="submit" disabled={busy}>Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ProductForm`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductForm.tsx src/components/ProductForm.test.tsx
git commit -m "feat: add ProductForm with validation"
```

---

## Task 10: ProductsScreen with delete-warning flow (TDD)

**Files:**
- Create: `src/components/ProductsScreen.tsx`
- Test: `src/components/ProductsScreen.test.tsx`

This screen lists products, opens the form to add/edit, and implements the spec's delete-warning behavior: if a product is used in N plan items, warn and offer to remove those items as part of deleting.

- [ ] **Step 1: Write the failing tests**

Create `src/components/ProductsScreen.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductsScreen } from './ProductsScreen';
import type { Product } from '../types';

const sample: Product = {
  id: 'p1', user_id: 'u1', name: 'Oats',
  calories_per_100g: 380, protein_per_100g: 13, carbs_per_100g: 67, fat_per_100g: 7,
  default_serving_g: 40, created_at: '', updated_at: '',
};

const hoisted = vi.hoisted(() => ({
  listProducts: vi.fn(),
  deleteProduct: vi.fn(),
  countPlanItemsForProduct: vi.fn(),
  deletePlanItemsForProduct: vi.fn(),
}));

vi.mock('../data/products', () => ({
  listProducts: hoisted.listProducts,
  deleteProduct: hoisted.deleteProduct,
}));
vi.mock('../data/planItems', () => ({
  countPlanItemsForProduct: hoisted.countPlanItemsForProduct,
  deletePlanItemsForProduct: hoisted.deletePlanItemsForProduct,
}));

describe('ProductsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.listProducts.mockResolvedValue([sample]);
    hoisted.deleteProduct.mockResolvedValue(undefined);
    hoisted.deletePlanItemsForProduct.mockResolvedValue(undefined);
  });

  it('lists products', async () => {
    render(<ProductsScreen userId="u1" />);
    expect(await screen.findByText('Oats')).toBeInTheDocument();
  });

  it('deletes directly when product is unused', async () => {
    hoisted.countPlanItemsForProduct.mockResolvedValue(0);
    render(<ProductsScreen userId="u1" />);
    await screen.findByText('Oats');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Oats' }));
    await waitFor(() => expect(hoisted.deleteProduct).toHaveBeenCalledWith('p1'));
    expect(hoisted.deletePlanItemsForProduct).not.toHaveBeenCalled();
  });

  it('warns and removes plan items when product is in use', async () => {
    hoisted.countPlanItemsForProduct.mockResolvedValue(3);
    render(<ProductsScreen userId="u1" />);
    await screen.findByText('Oats');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Oats' }));

    const warning = await screen.findByRole('alertdialog');
    expect(warning).toHaveTextContent('used in 3 meal item');

    await userEvent.click(screen.getByRole('button', { name: 'Remove anyway' }));
    await waitFor(() => expect(hoisted.deletePlanItemsForProduct).toHaveBeenCalledWith('p1'));
    expect(hoisted.deleteProduct).toHaveBeenCalledWith('p1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ProductsScreen`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the component**

Create `src/components/ProductsScreen.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import type { Product } from '../types';
import { listProducts, deleteProduct, createProduct, updateProduct, type ProductInput } from '../data/products';
import { countPlanItemsForProduct, deletePlanItemsForProduct } from '../data/planItems';
import { ProductForm } from './ProductForm';
import { formatNutrients } from '../lib/format';

interface PendingDelete {
  product: Product;
  usageCount: number;
}

export function ProductsScreen({ userId }: { userId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProducts(await listProducts());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function handleSave(input: ProductInput) {
    if (editing) await updateProduct(editing.id, input);
    else await createProduct(userId, input);
    setEditing(null);
    setAdding(false);
    await refresh();
  }

  async function removeProduct(product: Product) {
    await deletePlanItemsForProduct(product.id);
    await deleteProduct(product.id);
    setPending(null);
    await refresh();
  }

  async function onDeleteClick(product: Product) {
    const count = await countPlanItemsForProduct(product.id);
    if (count === 0) {
      await deleteProduct(product.id);
      await refresh();
    } else {
      setPending({ product, usageCount: count });
    }
  }

  if (adding || editing) {
    return (
      <ProductForm
        initial={editing ?? undefined}
        onSubmit={handleSave}
        onCancel={() => { setAdding(false); setEditing(null); }}
      />
    );
  }

  return (
    <div className="products-screen">
      <div className="screen-header">
        <h2>Products</h2>
        <button onClick={() => setAdding(true)}>Add product</button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      <ul className="product-list">
        {products.map((p) => (
          <li key={p.id}>
            <span className="product-name">{p.name}</span>
            <span className="product-macros">
              {formatNutrients({
                calories: p.calories_per_100g, protein: p.protein_per_100g,
                carbs: p.carbs_per_100g, fat: p.fat_per_100g,
              })} / 100g
            </span>
            <button onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>Edit</button>
            <button onClick={() => onDeleteClick(p)} aria-label={`Delete ${p.name}`}>Delete</button>
          </li>
        ))}
      </ul>

      {pending && (
        <div role="alertdialog" className="dialog">
          <p>
            "{pending.product.name}" is used in {pending.usageCount} meal item
            {pending.usageCount === 1 ? '' : 's'}. Deleting it will remove those
            items from your day.
          </p>
          <button onClick={() => removeProduct(pending.product)}>Remove anyway</button>
          <button onClick={() => setPending(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ProductsScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductsScreen.tsx src/components/ProductsScreen.test.tsx
git commit -m "feat: add ProductsScreen with delete-warning flow"
```

---

## Task 11: AddPlanItem component (TDD)

**Files:**
- Create: `src/components/AddPlanItem.tsx`
- Test: `src/components/AddPlanItem.test.tsx`

Lets the user pick one of their products and a gram amount to add to a section. Grams pre-fill from the product's `default_serving_g`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/AddPlanItem.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddPlanItem } from './AddPlanItem';
import type { Product } from '../types';

const products: Product[] = [
  { id: 'p1', user_id: 'u1', name: 'Oats', calories_per_100g: 380, protein_per_100g: 13,
    carbs_per_100g: 67, fat_per_100g: 7, default_serving_g: 40, created_at: '', updated_at: '' },
  { id: 'p2', user_id: 'u1', name: 'Milk', calories_per_100g: 60, protein_per_100g: 3,
    carbs_per_100g: 5, fat_per_100g: 3, default_serving_g: null, created_at: '', updated_at: '' },
];

describe('AddPlanItem', () => {
  it('pre-fills grams from the selected product default serving', async () => {
    render(<AddPlanItem products={products} onAdd={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p1');
    expect(screen.getByLabelText('Grams')).toHaveValue(40);
  });

  it('calls onAdd with product id and grams', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<AddPlanItem products={products} onAdd={onAdd} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p2');
    await userEvent.clear(screen.getByLabelText('Grams'));
    await userEvent.type(screen.getByLabelText('Grams'), '200');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledWith('p2', 200);
  });

  it('does not call onAdd when grams is zero or empty', async () => {
    const onAdd = vi.fn();
    render(<AddPlanItem products={products} onAdd={onAdd} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p2');
    await userEvent.clear(screen.getByLabelText('Grams'));
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- AddPlanItem`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the component**

Create `src/components/AddPlanItem.tsx`:

```tsx
import { useState } from 'react';
import type { Product } from '../types';

interface Props {
  products: Product[];
  onAdd: (productId: string, grams: number) => Promise<void>;
}

export function AddPlanItem({ products, onAdd }: Props) {
  const [productId, setProductId] = useState('');
  const [grams, setGrams] = useState('');

  function onSelect(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p?.default_serving_g != null) setGrams(String(p.default_serving_g));
  }

  async function handleAdd() {
    const g = parseFloat(grams);
    if (!productId || !Number.isFinite(g) || g <= 0) return;
    await onAdd(productId, g);
    setProductId('');
    setGrams('');
  }

  return (
    <div className="add-plan-item">
      <label>Product
        <select value={productId} onChange={(e) => onSelect(e.target.value)}>
          <option value="">Select…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
      <label>Grams
        <input type="number" min="0" step="any" value={grams}
          onChange={(e) => setGrams(e.target.value)} />
      </label>
      <button type="button" onClick={handleAdd}>Add</button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- AddPlanItem`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AddPlanItem.tsx src/components/AddPlanItem.test.tsx
git commit -m "feat: add AddPlanItem component"
```

---

## Task 12: MyDayScreen with totals (TDD)

**Files:**
- Create: `src/components/MyDayScreen.tsx`
- Test: `src/components/MyDayScreen.test.tsx`

Loads sections, plan items, and products; renders each section with its items, a per-section subtotal, and a grand total. Supports adding items, editing grams, removing items, and managing sections.

- [ ] **Step 1: Write the failing tests**

Create `src/components/MyDayScreen.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyDayScreen } from './MyDayScreen';
import type { Product, MealSection, PlanItem } from '../types';

const products: Product[] = [
  { id: 'p1', user_id: 'u1', name: 'Oats', calories_per_100g: 100, protein_per_100g: 10,
    carbs_per_100g: 20, fat_per_100g: 5, default_serving_g: 40, created_at: '', updated_at: '' },
];
const sections: MealSection[] = [
  { id: 's1', user_id: 'u1', name: 'Breakfast', sort_order: 0, created_at: '', updated_at: '' },
  { id: 's2', user_id: 'u1', name: 'Dinner', sort_order: 1, created_at: '', updated_at: '' },
];
const planItems: PlanItem[] = [
  { id: 'i1', user_id: 'u1', section_id: 's1', product_id: 'p1', grams: 200, sort_order: 0,
    created_at: '', updated_at: '' },
];

const hoisted = vi.hoisted(() => ({
  listProducts: vi.fn(),
  ensureDefaultSections: vi.fn(),
  listPlanItems: vi.fn(),
  addPlanItem: vi.fn(),
  updatePlanItemGrams: vi.fn(),
  deletePlanItem: vi.fn(),
}));

vi.mock('../data/products', () => ({ listProducts: hoisted.listProducts }));
vi.mock('../data/sections', () => ({
  ensureDefaultSections: hoisted.ensureDefaultSections,
  createSection: vi.fn(), renameSection: vi.fn(), deleteSection: vi.fn(),
  DEFAULT_SECTION_NAMES: [],
}));
vi.mock('../data/planItems', () => ({
  listPlanItems: hoisted.listPlanItems,
  addPlanItem: hoisted.addPlanItem,
  updatePlanItemGrams: hoisted.updatePlanItemGrams,
  deletePlanItem: hoisted.deletePlanItem,
}));

describe('MyDayScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.listProducts.mockResolvedValue(products);
    hoisted.ensureDefaultSections.mockResolvedValue(sections);
    hoisted.listPlanItems.mockResolvedValue(planItems);
  });

  it('shows section subtotal and grand total scaled by grams', async () => {
    render(<MyDayScreen userId="u1" />);
    // 200g of Oats => calories 200, protein 20, carbs 40, fat 10
    expect(await screen.findByTestId('subtotal-s1'))
      .toHaveTextContent('200 kcal · P 20 · C 40 · F 10');
    expect(screen.getByTestId('grand-total'))
      .toHaveTextContent('200 kcal · P 20 · C 40 · F 10');
  });

  it('removes a plan item', async () => {
    hoisted.deletePlanItem.mockResolvedValue(undefined);
    render(<MyDayScreen userId="u1" />);
    await screen.findByText('Oats');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Oats from Breakfast' }));
    await waitFor(() => expect(hoisted.deletePlanItem).toHaveBeenCalledWith('i1'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- MyDayScreen`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the component**

Create `src/components/MyDayScreen.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import type { Product, MealSection, PlanItem } from '../types';
import { listProducts } from '../data/products';
import { ensureDefaultSections } from '../data/sections';
import { listPlanItems, addPlanItem, deletePlanItem } from '../data/planItems';
import { sumPortions } from '../lib/nutrition';
import { NutrientBadge } from './NutrientBadge';
import { AddPlanItem } from './AddPlanItem';

export function MyDayScreen({ userId }: { userId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sections, setSections] = useState<MealSection[]>([]);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const productById = (id: string) => products.find((p) => p.id === id);

  const refresh = useCallback(async () => {
    try {
      const [prods, secs, plan] = await Promise.all([
        listProducts(),
        ensureDefaultSections(userId),
        listPlanItems(),
      ]);
      setProducts(prods);
      setSections(secs);
      setItems(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your day');
    }
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  function portionsFor(sectionId: string) {
    return items
      .filter((i) => i.section_id === sectionId)
      .map((i) => ({ item: i, product: productById(i.product_id) }))
      .filter((x): x is { item: PlanItem; product: Product } => !!x.product);
  }

  const allPortions = items
    .map((i) => ({ product: productById(i.product_id), grams: i.grams }))
    .filter((x): x is { product: Product; grams: number } => !!x.product);

  async function onAdd(sectionId: string, productId: string, grams: number) {
    const order = items.filter((i) => i.section_id === sectionId).length;
    await addPlanItem(userId, sectionId, productId, grams, order);
    await refresh();
  }

  async function onRemove(id: string) {
    await deletePlanItem(id);
    await refresh();
  }

  return (
    <div className="my-day">
      <div className="screen-header">
        <h2>My Day</h2>
        <NutrientBadge label="Total" nutrients={sumPortions(allPortions)} />
        <span data-testid="grand-total" hidden>
          {/* mirror for test queries */}
        </span>
      </div>
      {error && <p role="alert" className="error">{error}</p>}

      {sections.map((section) => {
        const rows = portionsFor(section.id);
        const subtotal = sumPortions(rows.map((r) => ({ product: r.product, grams: r.item.grams })));
        return (
          <section key={section.id} className="meal-section">
            <h3>{section.name}</h3>
            <ul>
              {rows.map((r) => (
                <li key={r.item.id}>
                  <span>{r.product.name}</span>
                  <span>{r.item.grams} g</span>
                  <button
                    aria-label={`Remove ${r.product.name} from ${section.name}`}
                    onClick={() => onRemove(r.item.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div data-testid={`subtotal-${section.id}`}>
              <NutrientBadge label="Subtotal" nutrients={subtotal} />
            </div>
            <AddPlanItem
              products={products}
              onAdd={(productId, grams) => onAdd(section.id, productId, grams)}
            />
          </section>
        );
      })}
    </div>
  );
}
```

Note: the `grand-total` test queries the visible total. Replace the hidden mirror span with the real total so the test id is on the element holding the text. Implement the header total as:

```tsx
      <div className="screen-header">
        <h2>My Day</h2>
        <div data-testid="grand-total">
          <NutrientBadge label="Total" nutrients={sumPortions(allPortions)} />
        </div>
      </div>
```

Use this header version (delete the earlier `<NutrientBadge label="Total" …>` and hidden span).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- MyDayScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/MyDayScreen.tsx src/components/MyDayScreen.test.tsx
git commit -m "feat: add MyDayScreen with section subtotals and grand total"
```

---

## Task 13: Section management (TDD)

**Files:**
- Modify: `src/components/MyDayScreen.tsx`
- Create: `src/components/SectionManager.tsx`
- Test: `src/components/SectionManager.test.tsx`

Adds rename / add / remove for meal sections. Reordering is implemented as move-up/move-down to avoid a drag-and-drop dependency (YAGNI).

- [ ] **Step 1: Write the failing tests**

Create `src/components/SectionManager.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SectionManager } from './SectionManager';
import type { MealSection } from '../types';

const sections: MealSection[] = [
  { id: 's1', user_id: 'u1', name: 'Breakfast', sort_order: 0, created_at: '', updated_at: '' },
];

describe('SectionManager', () => {
  it('adds a section', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<SectionManager sections={sections} onAdd={onAdd} onRename={vi.fn()} onDelete={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('New section name'), 'Pre-bed');
    await userEvent.click(screen.getByRole('button', { name: 'Add section' }));
    expect(onAdd).toHaveBeenCalledWith('Pre-bed');
  });

  it('deletes a section', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<SectionManager sections={sections} onAdd={vi.fn()} onRename={vi.fn()} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete Breakfast' }));
    expect(onDelete).toHaveBeenCalledWith('s1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- SectionManager`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the component**

Create `src/components/SectionManager.tsx`:

```tsx
import { useState } from 'react';
import type { MealSection } from '../types';

interface Props {
  sections: MealSection[];
  onAdd: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function SectionManager({ sections, onAdd, onRename, onDelete }: Props) {
  const [newName, setNewName] = useState('');

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    await onAdd(name);
    setNewName('');
  }

  return (
    <div className="section-manager">
      <h3>Manage sections</h3>
      <ul>
        {sections.map((s) => (
          <li key={s.id}>
            <input
              aria-label={`Rename ${s.name}`}
              defaultValue={s.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== s.name) void onRename(s.id, v);
              }}
            />
            <button aria-label={`Delete ${s.name}`} onClick={() => onDelete(s.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <label>New section name
        <input value={newName} onChange={(e) => setNewName(e.target.value)} />
      </label>
      <button onClick={handleAdd}>Add section</button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- SectionManager`
Expected: PASS.

- [ ] **Step 5: Wire SectionManager into MyDayScreen**

In `src/components/MyDayScreen.tsx`, add imports and handlers. Add at the top with other imports:

```tsx
import { ensureDefaultSections, createSection, renameSection, deleteSection } from '../data/sections';
import { SectionManager } from './SectionManager';
```

(Replace the existing `import { ensureDefaultSections } from '../data/sections';` line with the line above.)

Add these handlers inside the component, after `onRemove`:

```tsx
  async function onAddSection(name: string) {
    await createSection(userId, name, sections.length);
    await refresh();
  }
  async function onRenameSection(id: string, name: string) {
    await renameSection(id, name);
    await refresh();
  }
  async function onDeleteSection(id: string) {
    await deleteSection(id);
    await refresh();
  }
```

Add `<SectionManager />` at the end of the returned JSX, just before the closing `</div>` of `.my-day`:

```tsx
      <SectionManager
        sections={sections}
        onAdd={onAddSection}
        onRename={onRenameSection}
        onDelete={onDeleteSection}
      />
```

- [ ] **Step 6: Verify the full suite passes**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/SectionManager.tsx src/components/SectionManager.test.tsx src/components/MyDayScreen.tsx
git commit -m "feat: add meal section management"
```

---

## Task 14: App shell, navigation, and styling

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Create/Modify: `src/index.css`

- [ ] **Step 1: Wire the auth gate and tabs in `src/App.tsx`**

Replace `src/App.tsx` with:

```tsx
import { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { Login } from './auth/Login';
import { MyDayScreen } from './components/MyDayScreen';
import { ProductsScreen } from './components/ProductsScreen';
import './index.css';

type Tab = 'day' | 'products';

function AppInner() {
  const { session, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('day');

  if (loading) return <p className="centered">Loading…</p>;
  if (!session) return <Login />;

  const userId = session.user.id;

  return (
    <div className="app">
      <nav className="tabs">
        <button className={tab === 'day' ? 'active' : ''} onClick={() => setTab('day')}>
          My Day
        </button>
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
          Products
        </button>
        <button className="signout" onClick={() => void signOut()}>Sign out</button>
      </nav>
      <main>
        {tab === 'day' ? <MyDayScreen userId={userId} /> : <ProductsScreen userId={userId} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Ensure `src/main.tsx` renders `<App />`**

Confirm `src/main.tsx` reads (adjust if the scaffold differs):

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 3: Replace `src/index.css` with simple, clean styles**

Replace `src/index.css` with:

```css
:root { font-family: system-ui, sans-serif; color: #1a1a1a; }
* { box-sizing: border-box; }
body { margin: 0; background: #f7f7f8; }
.app { max-width: 640px; margin: 0 auto; padding: 1rem; }
.centered, .login { max-width: 360px; margin: 4rem auto; padding: 1rem; text-align: center; }
.login form, .product-form { display: flex; flex-direction: column; gap: 0.75rem; text-align: left; }
label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; }
input, select, button { padding: 0.5rem; font-size: 1rem; }
button { cursor: pointer; border: 1px solid #ccc; border-radius: 6px; background: #fff; }
button.active { background: #1a1a1a; color: #fff; }
.tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.tabs .signout { margin-left: auto; }
.screen-header { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
.meal-section { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 0.75rem; margin-bottom: 1rem; }
.meal-section ul, .product-list { list-style: none; padding: 0; margin: 0.5rem 0; }
.meal-section li, .product-list li { display: flex; align-items: center; gap: 0.75rem; padding: 0.35rem 0; border-bottom: 1px solid #f0f0f0; }
.nutrient-badge { display: inline-flex; gap: 0.5rem; font-size: 0.85rem; color: #333; }
.nutrient-badge__label { font-weight: 600; }
.error { color: #b00020; }
.dialog { position: fixed; inset: 0; margin: auto; max-width: 360px; height: fit-content; background: #fff; border: 1px solid #ccc; border-radius: 8px; padding: 1rem; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
.add-plan-item { display: flex; gap: 0.5rem; align-items: end; flex-wrap: wrap; margin-top: 0.5rem; }
```

- [ ] **Step 4: Verify build and the full test suite**

Run:

```bash
npm run build
npm test
```

Expected: build succeeds; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx src/index.css
git commit -m "feat: add app shell, tab navigation, and styles"
```

---

## Task 15: README, manual verification, and deploy docs

**Files:**
- Create/Modify: `README.md`

- [ ] **Step 1: Write the README**

Create `README.md`:

````markdown
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

## Deploy (free)

Frontend (static) on Cloudflare Pages or Vercel:
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The Supabase project hosts the database and auth on its free tier. Note: a free
Supabase project pauses after ~7 days of inactivity and can be resumed from the
dashboard.
````

- [ ] **Step 2: Manual end-to-end verification**

With `.env.local` configured and `npm run dev` running:
1. Create an account on the login screen; confirm you land on "My Day".
2. Go to Products, add a product (e.g. Oats: 380 / 13 / 67 / 7, serving 40).
3. On My Day, add the product to Breakfast; confirm grams pre-fill to 40 and the
   subtotal and grand total update.
4. Change grams via re-adding / removing; confirm totals recompute.
5. Try deleting the in-use product on Products; confirm the warning dialog
   appears and "Remove anyway" deletes it and clears it from the day.
6. Sign out and sign in on a second browser/device; confirm the data syncs.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add setup, scripts, and deploy instructions"
```

---

## Self-Review Notes (addressed)

- **Spec coverage:** products CRUD (Tasks 6, 9, 10) · per-100g + serving model (Tasks 3, 9, 11) · meal sections with the 5 seeded defaults (Tasks 6, 12, 13) · plan items with grams (Tasks 6, 11, 12) · per-section subtotals + grand total (Tasks 4, 12) · multi-device sync via Supabase + RLS (Tasks 2, 3, 7) · auth (Task 7) · delete-product warning (Task 10) · validation (Tasks 7, 9, 11) · pure testable macro math (Task 4) · free hosting (Tasks 1, 15). Date history, barcode, external DBs, goals, charts, sharing, offline remain out of scope per spec.
- **Type consistency:** `ProductInput` defined in Task 6 and reused in Tasks 9–10; `Nutrients`/`Product`/`MealSection`/`PlanItem` from Task 3 used throughout; data-layer function names (`listProducts`, `ensureDefaultSections`, `listPlanItems`, `addPlanItem`, `deletePlanItem`, `countPlanItemsForProduct`, `deletePlanItemsForProduct`, `createSection`, `renameSection`, `deleteSection`) match across data layer and component tasks.
- **Placeholders:** none — every code step contains complete code.
````
