# Label-Based Nutrition + Sodium & Price Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-100g nutrition model with a label-based per-serving model (unit g/ml/piece + serving size), add sodium tracking, and add optional package price/size fields stored for future budgeting.

**Architecture:** Same React + Vite + TypeScript + Supabase app. Products store label values per serving; `scalePortion` scales by `amount / serving_size` instead of `grams / 100`. Plan amounts are entered in each product's unit. Existing data is migrated with a SQL script so resulting numbers are identical.

**Tech Stack:** React, TypeScript, Vitest, @testing-library/react, Supabase (Postgres).

**Reference spec:** `docs/superpowers/specs/2026-06-14-label-based-nutrition-design.md`

> **Refactor note:** Changing the `Product`/`PlanItem`/`Nutrients` types in Task 1 breaks every consumer until Tasks 2–8 land. Therefore verify each task with the **targeted Vitest command shown** (`npx vitest run <name>`), NOT `npm run build` — the full type-check/build is intentionally deferred to Task 10, which is where integration is verified.

---

## File Structure

| File | Change |
|------|--------|
| `src/types.ts` | Add `Unit`; reshape `Product` (unit, serving_size, per-serving fields, sodium_mg, package_*); rename `PlanItem.grams`→`amount`; add `sodium` to `Nutrients` |
| `src/lib/nutrition.ts` | `scalePortion` uses `serving_size`; carry `sodium`; `sumPortions` takes `amount` |
| `src/lib/format.ts` | `formatNutrients` includes sodium; add `unitLabel` + `formatAmount` |
| `src/data/products.ts` | New `ProductInput` shape |
| `src/data/planItems.ts` | `addPlanItem(amount)`; `updatePlanItemGrams`→`updatePlanItemAmount` |
| `src/components/ProductForm.tsx` | Unit, serving size, per-serving labels, sodium, package size/price + paired validation |
| `src/components/AddPlanItem.tsx` | Amount pre-fills from `serving_size`; show unit |
| `src/components/ProductsScreen.tsx` | Display per-serving values + serving; new fixture in test |
| `src/components/MyDayScreen.tsx` | Use `amount`; show unit; sodium in totals |
| `src/components/NutrientBadge.test.tsx` | Assert sodium in output (component unchanged) |
| `supabase/schema.sql` | Rewrite to new shape (fresh installs) |
| `supabase/migrations/2026-06-14-label-based-nutrition.sql` | New migration (existing installs) |
| `CLAUDE.md` | Update model description |

---

## Task 1: Reshape domain types and macro math (TDD)

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/nutrition.ts`
- Test: `src/lib/nutrition.test.ts`

- [ ] **Step 1: Update the types**

Replace `src/types.ts` with:

```ts
export type Unit = 'g' | 'ml' | 'piece';

export interface Product {
  id: string;
  user_id: string;
  name: string;
  unit: Unit;
  serving_size: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium_mg: number;
  package_size: number | null;
  package_price: number | null;
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
  amount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium: number;
}
```

- [ ] **Step 2: Rewrite the nutrition tests (red)**

Replace `src/lib/nutrition.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { scalePortion, addNutrients, sumPortions, EMPTY_NUTRIENTS } from './nutrition';
import type { Product } from '../types';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    user_id: 'u1',
    name: 'Test',
    unit: 'g',
    serving_size: 100,
    calories: 100,
    protein: 10,
    carbs: 20,
    fat: 5,
    sodium_mg: 50,
    package_size: null,
    package_price: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('scalePortion', () => {
  it('scales per-serving values by amount/serving_size', () => {
    expect(scalePortion(product(), 200)).toEqual({
      calories: 200, protein: 20, carbs: 40, fat: 10, sodium: 100,
    });
  });

  it('handles a non-100 serving size', () => {
    // serving 200ml, drink 100ml => factor 0.5
    expect(
      scalePortion(product({ unit: 'ml', serving_size: 200, calories: 88, sodium_mg: 40 }), 100),
    ).toEqual({ calories: 44, protein: 5, carbs: 10, fat: 2.5, sodium: 20 });
  });

  it('handles a piece-based product', () => {
    // 1 egg per serving, eat 2 => factor 2
    expect(
      scalePortion(product({ unit: 'piece', serving_size: 1, calories: 70, protein: 6, carbs: 0, fat: 5, sodium_mg: 65 }), 2),
    ).toEqual({ calories: 140, protein: 12, carbs: 0, fat: 10, sodium: 130 });
  });
});

describe('addNutrients', () => {
  it('adds two nutrient sets field by field including sodium', () => {
    expect(
      addNutrients(
        { calories: 1, protein: 2, carbs: 3, fat: 4, sodium: 5 },
        { calories: 10, protein: 20, carbs: 30, fat: 40, sodium: 50 },
      ),
    ).toEqual({ calories: 11, protein: 22, carbs: 33, fat: 44, sodium: 55 });
  });
});

describe('sumPortions', () => {
  it('returns EMPTY_NUTRIENTS for no portions', () => {
    expect(sumPortions([])).toEqual(EMPTY_NUTRIENTS);
  });

  it('sums scaled portions, including across different units', () => {
    const result = sumPortions([
      { product: product(), amount: 100 },
      { product: product({ unit: 'ml', serving_size: 200, calories: 200, protein: 0, carbs: 0, fat: 0, sodium_mg: 0 }), amount: 200 },
    ]);
    expect(result).toEqual({ calories: 300, protein: 10, carbs: 20, fat: 5, sodium: 50 });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run nutrition`
Expected: FAIL (old `scalePortion` ignores `serving_size`, no `sodium`).

- [ ] **Step 4: Rewrite `src/lib/nutrition.ts`**

```ts
import type { Product, Nutrients } from '../types';

export const EMPTY_NUTRIENTS: Nutrients = {
  calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0,
};

export function scalePortion(product: Product, amount: number): Nutrients {
  const factor = amount / product.serving_size;
  return {
    calories: product.calories * factor,
    protein: product.protein * factor,
    carbs: product.carbs * factor,
    fat: product.fat * factor,
    sodium: product.sodium_mg * factor,
  };
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    sodium: a.sodium + b.sodium,
  };
}

export function sumPortions(
  portions: { product: Product; amount: number }[],
): Nutrients {
  return portions.reduce(
    (acc, p) => addNutrients(acc, scalePortion(p.product, p.amount)),
    EMPTY_NUTRIENTS,
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run nutrition`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/lib/nutrition.ts src/lib/nutrition.test.ts
git commit -m "feat: label-based per-serving scaling with sodium"
```

---

## Task 2: Formatting helpers — sodium, unit label, amount (TDD)

**Files:**
- Modify: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

- [ ] **Step 1: Rewrite the format tests (red)**

Replace `src/lib/format.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { round1, formatNutrients, unitLabel, formatAmount } from './format';

describe('round1', () => {
  it('rounds to one decimal place', () => {
    expect(round1(2.5)).toBe(2.5);
    expect(round1(2.04)).toBe(2);
    expect(round1(2.06)).toBe(2.1);
  });
});

describe('formatNutrients', () => {
  it('formats a one-line summary including sodium in mg', () => {
    expect(
      formatNutrients({ calories: 300.04, protein: 10.06, carbs: 20, fat: 5, sodium: 120 }),
    ).toBe('300 kcal · P 10.1 · C 20 · F 5 · Na 120mg');
  });
});

describe('unitLabel', () => {
  it('renders piece as pcs and passes g/ml through', () => {
    expect(unitLabel('g')).toBe('g');
    expect(unitLabel('ml')).toBe('ml');
    expect(unitLabel('piece')).toBe('pcs');
  });
});

describe('formatAmount', () => {
  it('formats an amount with its unit label', () => {
    expect(formatAmount(90, 'g')).toBe('90 g');
    expect(formatAmount(250, 'ml')).toBe('250 ml');
    expect(formatAmount(2, 'piece')).toBe('2 pcs');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run format`
Expected: FAIL (`unitLabel`/`formatAmount` not exported; sodium missing).

- [ ] **Step 3: Rewrite `src/lib/format.ts`**

```ts
import type { Nutrients, Unit } from '../types';

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function formatNutrients(n: Nutrients): string {
  return (
    `${round1(n.calories)} kcal · ` +
    `P ${round1(n.protein)} · ` +
    `C ${round1(n.carbs)} · ` +
    `F ${round1(n.fat)} · ` +
    `Na ${round1(n.sodium)}mg`
  );
}

export function unitLabel(unit: Unit): string {
  return unit === 'piece' ? 'pcs' : unit;
}

export function formatAmount(amount: number, unit: Unit): string {
  return `${round1(amount)} ${unitLabel(unit)}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run format`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: format sodium and amount-with-unit"
```

---

## Task 3: Data layer — ProductInput and plan-item amount

**Files:**
- Modify: `src/data/products.ts`
- Modify: `src/data/planItems.ts`

These are thin Supabase wrappers exercised through mocked component tests. No standalone unit test; they are type-checked in Task 10's full build.

- [ ] **Step 1: Update `ProductInput` in `src/data/products.ts`**

Replace the `ProductInput` type (top of the file) with:

```ts
export type ProductInput = {
  name: string;
  unit: import('../types').Unit;
  serving_size: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium_mg: number;
  package_size: number | null;
  package_price: number | null;
};
```

The bodies of `listProducts`, `createProduct`, `updateProduct`, `deleteProduct`
are unchanged (they spread `input` and use `select('*')`).

- [ ] **Step 2: Update `src/data/planItems.ts` for `amount`**

In `addPlanItem`, rename the `grams` parameter to `amount` and the inserted
column accordingly. Replace the function with:

```ts
export async function addPlanItem(
  userId: string,
  sectionId: string,
  productId: string,
  amount: number,
  sortOrder: number,
): Promise<PlanItem> {
  const { data, error } = await supabase
    .from('plan_items')
    .insert({
      user_id: userId,
      section_id: sectionId,
      product_id: productId,
      amount,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PlanItem;
}
```

Rename `updatePlanItemGrams` to `updatePlanItemAmount` and its column:

```ts
export async function updatePlanItemAmount(id: string, amount: number): Promise<void> {
  const { error } = await supabase
    .from('plan_items')
    .update({ amount, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
```

`listPlanItems`, `deletePlanItem`, `countPlanItemsForProduct`, and
`deletePlanItemsForProduct` are unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/data/products.ts src/data/planItems.ts
git commit -m "feat: data layer for label-based products and plan amount"
```

---

## Task 4: NutrientBadge test — assert sodium (TDD)

**Files:**
- Test: `src/components/NutrientBadge.test.tsx`

The `NutrientBadge` component renders `formatNutrients` and needs no code change;
its test must assert the new sodium output.

- [ ] **Step 1: Update the test (red)**

Replace `src/components/NutrientBadge.test.tsx` with:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NutrientBadge } from './NutrientBadge';

describe('NutrientBadge', () => {
  it('renders a labeled, formatted nutrient summary with sodium', () => {
    render(
      <NutrientBadge label="Total" nutrients={{ calories: 300, protein: 10, carbs: 20, fat: 5, sodium: 120 }} />,
    );
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('300 kcal · P 10 · C 20 · F 5 · Na 120mg')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run NutrientBadge`
Expected: PASS (component already renders `formatNutrients`, which now includes sodium).

- [ ] **Step 3: Commit**

```bash
git add src/components/NutrientBadge.test.tsx
git commit -m "test: assert sodium in NutrientBadge"
```

---

## Task 5: ProductForm — new fields and validation (TDD)

**Files:**
- Modify: `src/components/ProductForm.tsx`
- Test: `src/components/ProductForm.test.tsx`

- [ ] **Step 1: Rewrite the tests (red)**

Replace `src/components/ProductForm.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm } from './ProductForm';

describe('ProductForm', () => {
  it('submits entered values including unit, serving, sodium, and package', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Milk');
    await userEvent.selectOptions(screen.getByLabelText('Unit'), 'ml');
    await userEvent.type(screen.getByLabelText('Serving size'), '200');
    await userEvent.type(screen.getByLabelText('Calories per serving'), '88');
    await userEvent.type(screen.getByLabelText('Protein per serving'), '6');
    await userEvent.type(screen.getByLabelText('Carbs per serving'), '10');
    await userEvent.type(screen.getByLabelText('Fat per serving'), '3');
    await userEvent.type(screen.getByLabelText('Sodium per serving (mg)'), '50');
    await userEvent.type(screen.getByLabelText('Package size (optional)'), '1000');
    await userEvent.type(screen.getByLabelText('Package price (optional)'), '1.5');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Milk',
      unit: 'ml',
      serving_size: 200,
      calories: 88,
      protein: 6,
      carbs: 10,
      fat: 3,
      sodium_mg: 50,
      package_size: 1000,
      package_price: 1.5,
    });
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
      expect.objectContaining({ name: 'Oats', unit: 'g', serving_size: 40, package_size: null, package_price: null }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run ProductForm`
Expected: FAIL (form lacks Unit/Serving size/Sodium/Package inputs).

- [ ] **Step 3: Rewrite `src/components/ProductForm.tsx`**

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
  const [protein, setProtein] = useState(String(initial?.protein ?? ''));
  const [carbs, setCarbs] = useState(String(initial?.carbs ?? ''));
  const [fat, setFat] = useState(String(initial?.fat ?? ''));
  const [sodium, setSodium] = useState(String(initial?.sodium_mg ?? ''));
  const [packageSize, setPackageSize] = useState(
    initial?.package_size != null ? String(initial.package_size) : '',
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
        protein: num(protein),
        carbs: num(carbs),
        fat: num(fat),
        sodium_mg: num(sodium),
        package_size: hasSize ? num(packageSize) : null,
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
      <label>Unit
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
      <label>Protein per serving
        <input type="number" min="0" step="any" value={protein}
          onChange={(e) => setProtein(e.target.value)} />
      </label>
      <label>Carbs per serving
        <input type="number" min="0" step="any" value={carbs}
          onChange={(e) => setCarbs(e.target.value)} />
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run ProductForm`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductForm.tsx src/components/ProductForm.test.tsx
git commit -m "feat: ProductForm with unit, serving, sodium, and package fields"
```

---

## Task 6: AddPlanItem — amount in unit, pre-fill from serving (TDD)

**Files:**
- Modify: `src/components/AddPlanItem.tsx`
- Test: `src/components/AddPlanItem.test.tsx`

- [ ] **Step 1: Rewrite the tests (red)**

Replace `src/components/AddPlanItem.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddPlanItem } from './AddPlanItem';
import type { Product } from '../types';

const products: Product[] = [
  { id: 'p1', user_id: 'u1', name: 'Oats', unit: 'g', serving_size: 40,
    calories: 152, protein: 5, carbs: 27, fat: 3, sodium_mg: 2,
    package_size: null, package_price: null, created_at: '', updated_at: '' },
  { id: 'p2', user_id: 'u1', name: 'Milk', unit: 'ml', serving_size: 200,
    calories: 88, protein: 6, carbs: 10, fat: 3, sodium_mg: 50,
    package_size: 1000, package_price: 1.5, created_at: '', updated_at: '' },
];

describe('AddPlanItem', () => {
  it('pre-fills amount from the selected product serving size', async () => {
    render(<AddPlanItem products={products} onAdd={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p1');
    expect(screen.getByLabelText('Amount')).toHaveValue(40);
  });

  it('shows the selected product unit', async () => {
    render(<AddPlanItem products={products} onAdd={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p2');
    expect(screen.getByTestId('amount-unit')).toHaveTextContent('ml');
  });

  it('calls onAdd with product id and amount', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<AddPlanItem products={products} onAdd={onAdd} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p2');
    await userEvent.clear(screen.getByLabelText('Amount'));
    await userEvent.type(screen.getByLabelText('Amount'), '250');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledWith('p2', 250);
  });

  it('does not call onAdd when amount is zero or empty', async () => {
    const onAdd = vi.fn();
    render(<AddPlanItem products={products} onAdd={onAdd} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p2');
    await userEvent.clear(screen.getByLabelText('Amount'));
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run AddPlanItem`
Expected: FAIL (no `Amount` label / `amount-unit` testid; old `Grams`).

- [ ] **Step 3: Rewrite `src/components/AddPlanItem.tsx`**

```tsx
import { useState } from 'react';
import type { Product } from '../types';
import { unitLabel } from '../lib/format';

interface Props {
  products: Product[];
  onAdd: (productId: string, amount: number) => Promise<void>;
}

export function AddPlanItem({ products, onAdd }: Props) {
  const [productId, setProductId] = useState('');
  const [amount, setAmount] = useState('');
  const selected = products.find((p) => p.id === productId);

  function onSelect(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) setAmount(String(p.serving_size));
  }

  async function handleAdd() {
    const a = parseFloat(amount);
    if (!productId || !Number.isFinite(a) || a <= 0) return;
    await onAdd(productId, a);
    setProductId('');
    setAmount('');
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
      <label>Amount
        <input type="number" min="0" step="any" value={amount}
          onChange={(e) => setAmount(e.target.value)} />
      </label>
      {selected && <span data-testid="amount-unit">{unitLabel(selected.unit)}</span>}
      <button type="button" onClick={handleAdd}>Add</button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run AddPlanItem`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AddPlanItem.tsx src/components/AddPlanItem.test.tsx
git commit -m "feat: AddPlanItem amount in product unit"
```

---

## Task 7: ProductsScreen — new product fixture and display (TDD)

**Files:**
- Modify: `src/components/ProductsScreen.tsx`
- Test: `src/components/ProductsScreen.test.tsx`

- [ ] **Step 1: Update the test fixture and add a serving-display assertion (red)**

Replace the `sample` constant and the first test in
`src/components/ProductsScreen.test.tsx`. Change the `sample` declaration to:

```tsx
const sample: Product = {
  id: 'p1', user_id: 'u1', name: 'Milk',
  unit: 'ml', serving_size: 200,
  calories: 88, protein: 6, carbs: 10, fat: 3, sodium_mg: 50,
  package_size: 1000, package_price: 1.5, created_at: '', updated_at: '',
};
```

Then replace the `'lists products'` test with:

```tsx
  it('lists products with their serving', async () => {
    render(<ProductsScreen userId="u1" />);
    expect(await screen.findByText('Milk')).toBeInTheDocument();
    expect(screen.getByText(/per 200 ml/)).toBeInTheDocument();
  });
```

The other tests (`'deletes directly when product is unused'`,
`'warns and removes plan items when product is in use'`) reference the button
`Delete Milk` — update their button names from `Delete Oats` to `Delete Milk`
and the `findByText('Oats')` calls to `findByText('Milk')`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run ProductsScreen`
Expected: FAIL (`per 200 ml` not rendered; old per-100g display).

- [ ] **Step 3: Update the product row rendering in `src/components/ProductsScreen.tsx`**

Add `formatAmount` to the format import:

```tsx
import { formatNutrients, formatAmount } from '../lib/format';
```

Replace the `<span className="product-macros">…</span>` block inside the list
item with:

```tsx
            <span className="product-macros">
              {formatNutrients({
                calories: p.calories, protein: p.protein,
                carbs: p.carbs, fat: p.fat, sodium: p.sodium_mg,
              })} per {formatAmount(p.serving_size, p.unit)}
            </span>
```

No other changes to this file (the delete-warning flow is unchanged).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run ProductsScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductsScreen.tsx src/components/ProductsScreen.test.tsx
git commit -m "feat: ProductsScreen shows per-serving values with serving"
```

---

## Task 8: MyDayScreen — amounts, units, sodium totals (TDD)

**Files:**
- Modify: `src/components/MyDayScreen.tsx`
- Test: `src/components/MyDayScreen.test.tsx`

- [ ] **Step 1: Rewrite the tests (red)**

Replace `src/components/MyDayScreen.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyDayScreen } from './MyDayScreen';
import type { Product, MealSection, PlanItem } from '../types';

const products: Product[] = [
  { id: 'p1', user_id: 'u1', name: 'Oats', unit: 'g', serving_size: 100,
    calories: 100, protein: 10, carbs: 20, fat: 5, sodium_mg: 50,
    package_size: null, package_price: null, created_at: '', updated_at: '' },
];
const sections: MealSection[] = [
  { id: 's1', user_id: 'u1', name: 'Breakfast', sort_order: 0, created_at: '', updated_at: '' },
  { id: 's2', user_id: 'u1', name: 'Dinner', sort_order: 1, created_at: '', updated_at: '' },
];
const planItems: PlanItem[] = [
  { id: 'i1', user_id: 'u1', section_id: 's1', product_id: 'p1', amount: 200, sort_order: 0,
    created_at: '', updated_at: '' },
];

const hoisted = vi.hoisted(() => ({
  listProducts: vi.fn(),
  ensureDefaultSections: vi.fn(),
  createSection: vi.fn(),
  renameSection: vi.fn(),
  deleteSection: vi.fn(),
  listPlanItems: vi.fn(),
  addPlanItem: vi.fn(),
  updatePlanItemAmount: vi.fn(),
  deletePlanItem: vi.fn(),
}));

vi.mock('../data/products', () => ({ listProducts: hoisted.listProducts }));
vi.mock('../data/sections', () => ({
  ensureDefaultSections: hoisted.ensureDefaultSections,
  createSection: hoisted.createSection,
  renameSection: hoisted.renameSection,
  deleteSection: hoisted.deleteSection,
  DEFAULT_SECTION_NAMES: [],
}));
vi.mock('../data/planItems', () => ({
  listPlanItems: hoisted.listPlanItems,
  addPlanItem: hoisted.addPlanItem,
  updatePlanItemAmount: hoisted.updatePlanItemAmount,
  deletePlanItem: hoisted.deletePlanItem,
}));

describe('MyDayScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.listProducts.mockResolvedValue(products);
    hoisted.ensureDefaultSections.mockResolvedValue(sections);
    hoisted.listPlanItems.mockResolvedValue(planItems);
  });

  it('shows section subtotal and grand total with sodium, scaled by amount', async () => {
    render(<MyDayScreen userId="u1" />);
    // 200g of Oats (serving 100g) => factor 2 => 200 kcal, P20, C40, F10, Na100
    expect(await screen.findByTestId('subtotal-s1'))
      .toHaveTextContent('200 kcal · P 20 · C 40 · F 10 · Na 100mg');
    expect(screen.getByTestId('grand-total'))
      .toHaveTextContent('200 kcal · P 20 · C 40 · F 10 · Na 100mg');
  });

  it('shows the amount with its unit', async () => {
    render(<MyDayScreen userId="u1" />);
    expect(await screen.findByText('200 g')).toBeInTheDocument();
  });

  it('removes a plan item', async () => {
    hoisted.deletePlanItem.mockResolvedValue(undefined);
    render(<MyDayScreen userId="u1" />);
    const removeBtn = await screen.findByRole('button', { name: 'Remove Oats from Breakfast' });
    await userEvent.click(removeBtn);
    await waitFor(() => expect(hoisted.deletePlanItem).toHaveBeenCalledWith('i1'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run MyDayScreen`
Expected: FAIL (`amount` field, sodium in totals, `200 g` display, `updatePlanItemAmount` mock).

- [ ] **Step 3: Update `src/components/MyDayScreen.tsx`**

Add `formatAmount` to the format import (add this import near the other lib imports):

```tsx
import { formatAmount } from '../lib/format';
```

Replace `portionsFor`, `allPortions`, and `onAdd` with versions that use
`amount`:

```tsx
  function portionsFor(sectionId: string) {
    return items
      .filter((i) => i.section_id === sectionId)
      .map((i) => ({ item: i, product: productById(i.product_id) }))
      .filter((x): x is { item: PlanItem; product: Product } => !!x.product);
  }

  const allPortions = items
    .map((i) => ({ product: productById(i.product_id), amount: i.amount }))
    .filter((x): x is { product: Product; amount: number } => !!x.product);

  async function onAdd(sectionId: string, productId: string, amount: number) {
    const order = items.filter((i) => i.section_id === sectionId).length;
    await addPlanItem(userId, sectionId, productId, amount, order);
    await refresh();
  }
```

Inside the section's `subtotal` computation, change the mapping to use `amount`:

```tsx
        const subtotal = sumPortions(rows.map((r) => ({ product: r.product, amount: r.item.amount })));
```

In the plan item `<li>`, replace `<span>{r.item.grams} g</span>` with:

```tsx
                  <span>{formatAmount(r.item.amount, r.product.unit)}</span>
```

No other changes (section management, totals layout, the `AddPlanItem` wiring
via `onAdd` remain the same).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run MyDayScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/MyDayScreen.tsx src/components/MyDayScreen.test.tsx
git commit -m "feat: MyDayScreen shows amounts with units and sodium totals"
```

---

## Task 9: Database schema and migration

**Files:**
- Modify: `supabase/schema.sql`
- Create: `supabase/migrations/2026-06-14-label-based-nutrition.sql`

No automated test; verification is running the migration in Supabase (manual,
recorded in Task 10's doc note).

- [ ] **Step 1: Rewrite `supabase/schema.sql` to the new shape**

Replace the `products` table definition and the `plan_items` `grams` column.
The full file becomes:

```sql
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
```

- [ ] **Step 2: Create the migration `supabase/migrations/2026-06-14-label-based-nutrition.sql`**

```sql
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
```

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql supabase/migrations/2026-06-14-label-based-nutrition.sql
git commit -m "feat: schema + migration for label-based nutrition and price"
```

---

## Task 10: Docs, full verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the domain-model section of `CLAUDE.md`**

In the "Domain model" bullet list, replace the bullet that begins
"Nutrition is entered **per 100g**…" with:

```markdown
- Nutrition is entered **per the product's label serving**: each product has a `unit` (`g`/`ml`/`piece`), a `serving_size`, and per-serving `calories`/`protein`/`carbs`/`fat`/`sodium_mg`. Portions scale by `amount / serving_size` (see `scalePortion`).
- `plan_items` stores `amount` (the quantity eaten, in the product's unit). Plan amounts pre-fill from the product's `serving_size`.
- Products also carry optional `package_size` + `package_price`; these are **stored but not yet displayed** — a future weekly-budget feature will use them. There is no cost math in the app today.
```

Also update the earlier bullet that mentions `grams / 100` and per-100g in the
**Architecture** paragraph for `src/lib/nutrition.ts` so it reads "scaled by
`amount / serving_size`" and notes sodium is part of `Nutrients`.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all test files PASS (nutrition, format, NutrientBadge, ProductForm,
AddPlanItem, ProductsScreen, MyDayScreen, SectionManager).

- [ ] **Step 3: Run the full type-check/build**

Run: `npm run build`
Expected: `tsc -b` passes (every consumer updated) and `vite build` succeeds.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for label-based model"
```

- [ ] **Step 6: Manual Supabase step (perform before using the app)**

Run `supabase/migrations/2026-06-14-label-based-nutrition.sql` in the Supabase
SQL editor against the existing project (or `supabase/schema.sql` for a fresh
project). Then verify in the running app: add a product with a unit + serving,
add it to a day, confirm totals (incl. sodium) scale by the amount entered.

---

## Self-Review Notes (addressed)

- **Spec coverage:** label model with unit/serving (Tasks 1, 5, 9) · g/ml/piece (Tasks 1, 2, 5, 6) · sodium tracked (Tasks 1, 2, 4, 8) · price stored, not shown (Tasks 1, 3, 5, 9) · plan amount in unit, pre-filled (Tasks 6, 8) · scaling `amount/serving_size` (Task 1) · transparent migration (Task 9) · docs (Task 10). Cost/budget display and currency are explicitly deferred.
- **Type consistency:** `Unit`, `Product`, `PlanItem`, `Nutrients` defined in Task 1 and used everywhere; `ProductInput` (Task 3) matches the object built in `ProductForm` (Task 5); `addPlanItem(amount)`/`updatePlanItemAmount` (Task 3) match `MyDayScreen` usage and its mock (Task 8); `unitLabel`/`formatAmount`/`formatNutrients` (Task 2) consumed by Tasks 6, 7, 8.
- **Placeholders:** none — every code step shows complete code or an exact, unambiguous edit.
- **Build sequencing:** intermediate tasks verified via targeted `npx vitest run`; full `npm run build` deferred to Task 10 by design (noted at top).
