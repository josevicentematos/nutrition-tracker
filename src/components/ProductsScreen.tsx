import { useEffect, useState, useCallback } from 'react';
import type { Product } from '../types';
import { listProducts, deleteProduct, createProduct, updateProduct, type ProductInput } from '../data/products';
import { countPlanItemsForProduct, deletePlanItemsForProduct } from '../data/planItems';
import { ProductForm } from './ProductForm';
import { formatNutrients, formatAmount } from '../lib/format';

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

  // Async fetch-on-mount: state is set after an await, not synchronously in the effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
                calories: p.calories, protein: p.protein,
                carbs: p.carbs, fat: p.fat, sodium: p.sodium_mg,
              })} per {formatAmount(p.serving_size, p.unit)}
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
