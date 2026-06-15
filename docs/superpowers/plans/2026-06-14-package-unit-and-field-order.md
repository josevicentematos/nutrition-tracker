# Separate Package Unit + Macro Field Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give products a separate `package_unit` (so a serving in pieces can pair with a package in grams), and reorder macros so carbs come before protein in the form and in every macro summary.

**Architecture:** Same React + Vite + TypeScript + Supabase app. Add a nullable `package_unit` column/field next to the existing `package_size`/`package_price`; reorder `formatNutrients` output and the `ProductForm` inputs. Cost/budgeting stays deferred.

**Tech Stack:** React, TypeScript, Vitest, @testing-library/react, Supabase (Postgres).

**Reference spec:** `docs/superpowers/specs/2026-06-14-package-unit-and-field-order-design.md`

> **Note on verification:** Adding `package_unit` to the `Product` type (Task 2) leaves `ProductForm.tsx` type-incomplete until Task 3, so `npm run build` is deferred to Task 5. Vitest does not type-check, so each task is verified with its **targeted** `npx vitest run <name>`. Task 1 leaves the FULL suite green; the full `npm run build` + `npm test` + `npm run lint` run in Task 5.

---

## File Structure

| File | Change |
|------|--------|
| `src/lib/format.ts` | `formatNutrients`: carbs before protein |
| `src/lib/format.test.ts` | new expected order |
| `src/components/NutrientBadge.test.tsx` | new expected string |
| `src/components/MyDayScreen.test.tsx` | subtotal/grand-total strings reordered |
| `src/types.ts` | add `Product.package_unit` |
| `src/data/products.ts` | add `ProductInput.package_unit` |
| `src/lib/nutrition.test.ts`, `src/components/AddPlanItem.test.tsx`, `src/components/ProductsScreen.test.tsx` | add `package_unit` to `Product` fixtures |
| `src/components/ProductForm.tsx` | relabel serving unit, add package unit, reorder carbs/protein, submit `package_unit` |
| `src/components/ProductForm.test.tsx` | cover new field, label, order, validation |
| `supabase/schema.sql` | add `package_unit` column |
| `supabase/migrations/2026-06-14-package-unit.sql` | new migration |
| `CLAUDE.md` | two units + C·P·F order |

---

## Task 1: Reorder macro summary to carbs-before-protein (TDD)

**Files:**
- Modify: `src/lib/format.ts`
- Modify: `src/lib/format.test.ts`
- Modify: `src/components/NutrientBadge.test.tsx`
- Modify: `src/components/MyDayScreen.test.tsx`

- [ ] **Step 1: Update `src/lib/format.test.ts` (red)** — replace the `formatNutrients` test's expected string. Change the line:

```tsx
    ).toBe('300 kcal · P 10.1 · C 20 · F 5 · Na 120mg');
```

to:

```tsx
    ).toBe('300 kcal · C 20 · P 10.1 · F 5 · Na 120mg');
```

(Leave the `round1`, `unitLabel`, and `formatAmount` tests unchanged. The `·` is U+00B7.)

- [ ] **Step 2: Run `npx vitest run format`** — expect FAIL on `formatNutrients`.

- [ ] **Step 3: Update `src/lib/format.ts`** — in `formatNutrients`, swap the carbs and protein lines so carbs is first. The function becomes:

```ts
export function formatNutrients(n: Nutrients): string {
  return (
    `${round1(n.calories)} kcal · ` +
    `C ${round1(n.carbs)} · ` +
    `P ${round1(n.protein)} · ` +
    `F ${round1(n.fat)} · ` +
    `Na ${round1(n.sodium)}mg`
  );
}
```

(`round1`, `unitLabel`, `formatAmount` unchanged.)

- [ ] **Step 4: Run `npx vitest run format`** — expect PASS.

- [ ] **Step 5: Update `src/components/NutrientBadge.test.tsx`** — change the expected string. Replace:

```tsx
    expect(screen.getByText('300 kcal · P 10 · C 20 · F 5 · Na 120mg')).toBeInTheDocument();
```

with:

```tsx
    expect(screen.getByText('300 kcal · C 20 · P 10 · F 5 · Na 120mg')).toBeInTheDocument();
```

- [ ] **Step 6: Update `src/components/MyDayScreen.test.tsx`** — in the "shows section subtotal and grand total" test there are TWO assertions with the same string. Replace both occurrences of:

```tsx
      .toHaveTextContent('200 kcal · P 20 · C 40 · F 10 · Na 100mg');
```

with:

```tsx
      .toHaveTextContent('200 kcal · C 40 · P 20 · F 10 · Na 100mg');
```

- [ ] **Step 7: Run the full suite** `npm test` — expect ALL tests PASS (format, NutrientBadge, MyDayScreen now green; everything else unaffected).

- [ ] **Step 8: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts src/components/NutrientBadge.test.tsx src/components/MyDayScreen.test.tsx
git commit -m "feat: order macro summary as carbs before protein"
```

---

## Task 2: Add package_unit to the data model and fixtures

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/products.ts`
- Modify: `src/lib/nutrition.test.ts`
- Modify: `src/components/AddPlanItem.test.tsx`
- Modify: `src/components/ProductsScreen.test.tsx`

`package_unit` is a `Unit | null` on `Product`. Adding it makes existing `Product`
fixtures incomplete, so they are updated here too. (Vitest does not type-check, so
its run stays green; `ProductForm.tsx` is completed in Task 3, after which
`npm run build` passes — see the note at the top.)

- [ ] **Step 1: Add the field to `src/types.ts`** — in the `Product` interface, add `package_unit` between `package_size` and `package_price`:

```ts
  package_size: number | null;
  package_unit: Unit | null;
  package_price: number | null;
```

- [ ] **Step 2: Add the field to `ProductInput` in `src/data/products.ts`** — between `package_size` and `package_price`:

```ts
  package_size: number | null;
  package_unit: import('../types').Unit | null;
  package_price: number | null;
```

- [ ] **Step 3: Update the `product()` factory in `src/lib/nutrition.test.ts`** — add `package_unit: null,` immediately after the `package_size: null,` line:

```ts
    package_size: null,
    package_unit: null,
    package_price: null,
```

- [ ] **Step 4: Update both fixtures in `src/components/AddPlanItem.test.tsx`** — each of the two product objects has `package_size: …, package_price: …`. Add `package_unit` between them. For `p1` (which has `package_size: null`): add `package_unit: null,`. For `p2` (which has `package_size: 1000`): add `package_unit: 'ml',`. After editing, `p1` reads `… package_size: null, package_unit: null, package_price: null, …` and `p2` reads `… package_size: 1000, package_unit: 'ml', package_price: 1.5, …`.

- [ ] **Step 5: Update the `sample` fixture in `src/components/ProductsScreen.test.tsx`** — it has `package_size: 1000, package_price: 1.5`. Insert `package_unit: 'ml',` between them so it reads:

```tsx
  package_size: 1000, package_unit: 'ml', package_price: 1.5, created_at: '', updated_at: '',
```

- [ ] **Step 6: Run targeted suites** `npx vitest run nutrition AddPlanItem ProductsScreen MyDayScreen` — expect PASS (fixtures still valid at runtime).

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/data/products.ts src/lib/nutrition.test.ts src/components/AddPlanItem.test.tsx src/components/ProductsScreen.test.tsx
git commit -m "feat: add package_unit to Product model and fixtures"
```

---

## Task 3: ProductForm — package unit, relabel, reorder, validation (TDD)

**Files:**
- Modify: `src/components/ProductForm.tsx`
- Modify: `src/components/ProductForm.test.tsx`

- [ ] **Step 1: Replace `src/components/ProductForm.test.tsx` ENTIRELY with:**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm } from './ProductForm';

describe('ProductForm', () => {
  it('submits entered values including serving unit, package unit, and sodium', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Bread');
    await userEvent.selectOptions(screen.getByLabelText('Serving unit'), 'piece');
    await userEvent.type(screen.getByLabelText('Serving size'), '2');
    await userEvent.type(screen.getByLabelText('Calories per serving'), '160');
    await userEvent.type(screen.getByLabelText('Carbs per serving'), '30');
    await userEvent.type(screen.getByLabelText('Protein per serving'), '6');
    await userEvent.type(screen.getByLabelText('Fat per serving'), '2');
    await userEvent.type(screen.getByLabelText('Sodium per serving (mg)'), '300');
    await userEvent.type(screen.getByLabelText('Package size (optional)'), '500');
    await userEvent.selectOptions(screen.getByLabelText('Package unit'), 'g');
    await userEvent.type(screen.getByLabelText('Package price (optional)'), '1.2');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Bread',
      unit: 'piece',
      serving_size: 2,
      calories: 160,
      carbs: 30,
      protein: 6,
      fat: 2,
      sodium_mg: 300,
      package_size: 500,
      package_unit: 'g',
      package_price: 1.2,
    });
  });

  it('orders carbs before protein in the form', () => {
    render(<ProductForm onSubmit={vi.fn()} onCancel={() => {}} />);
    const carbs = screen.getByLabelText('Carbs per serving');
    const protein = screen.getByLabelText('Protein per serving');
    expect(carbs.compareDocumentPosition(protein) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('blocks submit when name is empty', async () => {
    const onSubmit = vi.fn();
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Serving size'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
  });

  it('blocks submit when serving size is zero or blank', async () => {
    const onSubmit = vi.fn();
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Oats');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Serving size must be greater than 0');
  });

  it('blocks submit when only one of package size/price is filled', async () => {
    const onSubmit = vi.fn();
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Oats');
    await userEvent.type(screen.getByLabelText('Serving size'), '40');
    await userEvent.type(screen.getByLabelText('Package price (optional)'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter both package size and price, or leave both blank');
  });

  it('sends null package fields when both blank', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Oats');
    await userEvent.type(screen.getByLabelText('Serving size'), '40');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ package_size: null, package_unit: null, package_price: null }),
    );
  });
});
```

- [ ] **Step 2: Run `npx vitest run ProductForm`** — expect FAIL (no "Serving unit"/"Package unit" labels; old field order/shape).

- [ ] **Step 3: Replace `src/components/ProductForm.tsx` ENTIRELY with:**

```tsx
import { useState, type FormEvent } from 'react';
import type { Product, Unit } from '../types';
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
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'g');
  const [serving, setServing] = useState(initial ? String(initial.serving_size) : '');
  const [calories, setCalories] = useState(String(initial?.calories ?? ''));
  const [carbs, setCarbs] = useState(String(initial?.carbs ?? ''));
  const [protein, setProtein] = useState(String(initial?.protein ?? ''));
  const [fat, setFat] = useState(String(initial?.fat ?? ''));
  const [sodium, setSodium] = useState(String(initial?.sodium_mg ?? ''));
  const [packageSize, setPackageSize] = useState(
    initial?.package_size != null ? String(initial.package_size) : '',
  );
  const [packageUnit, setPackageUnit] = useState<Unit>(
    initial?.package_unit ?? initial?.unit ?? 'g',
  );
  const [packagePrice, setPackagePrice] = useState(
    initial?.package_price != null ? String(initial.package_price) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (num(serving) <= 0) { setError('Serving size must be greater than 0'); return; }
    const hasSize = packageSize.trim() !== '';
    const hasPrice = packagePrice.trim() !== '';
    if (hasSize !== hasPrice) {
      setError('Enter both package size and price, or leave both blank');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        unit,
        serving_size: num(serving),
        calories: num(calories),
        carbs: num(carbs),
        protein: num(protein),
        fat: num(fat),
        sodium_mg: num(sodium),
        package_size: hasSize ? num(packageSize) : null,
        package_unit: hasSize ? packageUnit : null,
        package_price: hasPrice ? num(packagePrice) : null,
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
      <label>Serving unit
        <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
          <option value="g">g</option>
          <option value="ml">ml</option>
          <option value="piece">piece</option>
        </select>
      </label>
      <label>Serving size
        <input type="number" min="0" step="any" value={serving}
          onChange={(e) => setServing(e.target.value)} />
      </label>
      <label>Calories per serving
        <input type="number" min="0" step="any" value={calories}
          onChange={(e) => setCalories(e.target.value)} />
      </label>
      <label>Carbs per serving
        <input type="number" min="0" step="any" value={carbs}
          onChange={(e) => setCarbs(e.target.value)} />
      </label>
      <label>Protein per serving
        <input type="number" min="0" step="any" value={protein}
          onChange={(e) => setProtein(e.target.value)} />
      </label>
      <label>Fat per serving
        <input type="number" min="0" step="any" value={fat}
          onChange={(e) => setFat(e.target.value)} />
      </label>
      <label>Sodium per serving (mg)
        <input type="number" min="0" step="any" value={sodium}
          onChange={(e) => setSodium(e.target.value)} />
      </label>
      <label>Package size (optional)
        <input type="number" min="0" step="any" value={packageSize}
          onChange={(e) => setPackageSize(e.target.value)} />
      </label>
      <label>Package unit
        <select value={packageUnit} onChange={(e) => setPackageUnit(e.target.value as Unit)}>
          <option value="g">g</option>
          <option value="ml">ml</option>
          <option value="piece">piece</option>
        </select>
      </label>
      <label>Package price (optional)
        <input type="number" min="0" step="any" value={packagePrice}
          onChange={(e) => setPackagePrice(e.target.value)} />
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

- [ ] **Step 4: Run `npx vitest run ProductForm`** — expect PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductForm.tsx src/components/ProductForm.test.tsx
git commit -m "feat: ProductForm separate package unit, carbs-before-protein order"
```

---

## Task 4: Database schema and migration

**Files:**
- Modify: `supabase/schema.sql`
- Create: `supabase/migrations/2026-06-14-package-unit.sql`

No automated test; verification is reading the SQL and (manually, later) running it.

- [ ] **Step 1: Add `package_unit` to `supabase/schema.sql`** — in the `products` table, insert a `package_unit` line between `package_size` and `package_price` so that block reads:

```sql
  package_size  numeric check (package_size is null or package_size > 0),
  package_unit  text check (package_unit is null or package_unit in ('g','ml','piece')),
  package_price numeric check (package_price is null or package_price >= 0),
```

Leave the rest of the file (other columns, `meal_sections`, `plan_items`, indexes, RLS policies) unchanged.

- [ ] **Step 2: Create `supabase/migrations/2026-06-14-package-unit.sql` with EXACTLY:**

```sql
-- Add a separate package unit so a product's package can be measured in a
-- different unit than its serving. Run once in the Supabase SQL editor.

alter table public.products add column package_unit text
  check (package_unit is null or package_unit in ('g','ml','piece'));

-- Existing package_size values were implicitly in the serving unit, so backfill
-- package_unit = unit for rows that have a package (lossless).
update public.products set package_unit = unit where package_size is not null;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql supabase/migrations/2026-06-14-package-unit.sql
git commit -m "feat: schema + migration for separate package_unit"
```

---

## Task 5: Docs and full verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update `CLAUDE.md`** — first READ it. Make two edits in the domain-model / nutrition area:

(a) Replace the bullet describing the package fields (currently noting `package_size` + `package_price` stored-but-not-displayed) with:

```markdown
- Products also carry an optional package (`package_size` + `package_unit` + `package_price`). `package_unit` may differ from the serving `unit` (e.g. serving in `piece`, package in `g`). These are **stored but not yet displayed** — a future weekly-budget feature will use them, and will need a cross-unit conversion when `package_unit` differs from `unit`. There is no cost math in the app today.
```

(b) In the `src/lib/nutrition.ts` architecture bullet (or the nutrition area), add a sentence noting display order:

```markdown
  The one-line macro summary (`formatNutrients`) renders carbs before protein: `… · C · P · F · Na …`.
```

Make only documentation wording changes; keep the file's structure.

- [ ] **Step 2: Run the full suite** `npm test` — expect all test files PASS.

- [ ] **Step 3: Run the build** `npm run build` — expect `tsc -b` (every consumer now provides `package_unit`) and `vite build` to succeed. If a TypeScript error names `package_unit` as missing in a `Product` literal or `ProductInput`, add `package_unit: null` (or the correct unit) to that literal; do not change anything else. Any other error → STOP and report.

- [ ] **Step 4: Run lint** `npm run lint` — expect clean.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for package_unit and macro order"
```

- [ ] **Step 6: Manual Supabase step (before using the app)** — run `supabase/migrations/2026-06-14-package-unit.sql` in the Supabase SQL editor on the existing project (or `supabase/schema.sql` for a fresh project). Then verify a product with a serving unit of `piece` and a package unit of `g` saves correctly.

---

## Self-Review Notes (addressed)

- **Spec coverage:** separate `package_unit` (Tasks 2, 3, 4) · serving-unit relabel + package-unit select + paired validation + all-null-when-blank (Task 3) · carbs-before-protein in form (Task 3) and in `formatNutrients`/all summaries (Task 1) · lossless migration backfill `package_unit = unit` (Task 4) · schema for fresh installs (Task 4) · tests for order and new field (Tasks 1, 3) · docs (Task 5). `scalePortion`/`plan_items` unchanged, per spec. Cost/budget + cross-unit bridge remain out of scope.
- **Type consistency:** `package_unit: Unit | null` defined on `Product` (Task 2) and `ProductInput` (Task 2), provided by `ProductForm` (Task 3), present in all `Product` fixtures (Tasks 2 + existing). `formatNutrients` signature unchanged; only output order changes (Task 1) — consumers unaffected.
- **Placeholders:** none — every code step shows complete code or an exact, unambiguous edit.
- **Sequencing:** Task 1 leaves the full suite green; Tasks 2–3 verified by targeted Vitest (no type-check); full `npm run build` in Task 5 (noted at top).
