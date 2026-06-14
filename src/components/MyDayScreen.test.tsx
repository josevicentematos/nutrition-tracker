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
  createSection: vi.fn(),
  renameSection: vi.fn(),
  deleteSection: vi.fn(),
  listPlanItems: vi.fn(),
  addPlanItem: vi.fn(),
  updatePlanItemGrams: vi.fn(),
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
    const removeBtn = await screen.findByRole('button', { name: 'Remove Oats from Breakfast' });
    await userEvent.click(removeBtn);
    await waitFor(() => expect(hoisted.deletePlanItem).toHaveBeenCalledWith('i1'));
  });
});
