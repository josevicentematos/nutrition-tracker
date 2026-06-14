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
