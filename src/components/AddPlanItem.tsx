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
