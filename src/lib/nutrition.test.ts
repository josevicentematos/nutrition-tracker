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
    package_unit: null,
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
    expect(
      scalePortion(product({ unit: 'ml', serving_size: 200, calories: 88, sodium_mg: 40 }), 100),
    ).toEqual({ calories: 44, protein: 5, carbs: 10, fat: 2.5, sodium: 20 });
  });

  it('handles a piece-based product', () => {
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
