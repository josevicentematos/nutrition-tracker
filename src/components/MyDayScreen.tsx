import { useEffect, useState, useCallback } from 'react';
import type { Product, MealSection, PlanItem } from '../types';
import { listProducts } from '../data/products';
import { ensureDefaultSections, createSection, renameSection, deleteSection } from '../data/sections';
import { listPlanItems, addPlanItem, deletePlanItem } from '../data/planItems';
import { sumPortions } from '../lib/nutrition';
import { NutrientBadge } from './NutrientBadge';
import { AddPlanItem } from './AddPlanItem';
import { SectionManager } from './SectionManager';

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

  // Async fetch-on-mount: state is set after an await, not synchronously in the effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return (
    <div className="my-day">
      <div className="screen-header">
        <h2>My Day</h2>
        <div data-testid="grand-total">
          <NutrientBadge label="Total" nutrients={sumPortions(allPortions)} />
        </div>
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

      <SectionManager
        sections={sections}
        onAdd={onAddSection}
        onRename={onRenameSection}
        onDelete={onDeleteSection}
      />
    </div>
  );
}
