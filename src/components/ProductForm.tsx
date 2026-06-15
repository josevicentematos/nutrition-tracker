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
