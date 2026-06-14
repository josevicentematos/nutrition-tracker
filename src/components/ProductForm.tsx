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
