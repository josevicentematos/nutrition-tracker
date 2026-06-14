import { describe, it, expect } from 'vitest';
import { scalePortion, addNutrients, sumPortions, EMPTY_NUTRIENTS } from './nutrition';
import type { Product } from '../types';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    user_id: 'u1',
    name: 'Test',
    calories_per_100g: 100,
    protein_per_100g: 10,
    carbs_per_100g: 20,
    fat_per_100g: 5,
    default_serving_g: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('scalePortion', () => {
  it('scales per-100g values by grams/100', () => {
    expect(scalePortion(product(), 200)).toEqual({
      calories: 200, protein: 20, carbs: 40, fat: 10,
    });
  });

  it('handles fractional grams', () => {
    expect(scalePortion(product(), 50)).toEqual({
      calories: 50, protein: 5, carbs: 10, fat: 2.5,
    });
  });
});

describe('addNutrients', () => {
  it('adds two nutrient sets field by field', () => {
    expect(
      addNutrients(
        { calories: 1, protein: 2, carbs: 3, fat: 4 },
        { calories: 10, protein: 20, carbs: 30, fat: 40 },
      ),
    ).toEqual({ calories: 11, protein: 22, carbs: 33, fat: 44 });
  });
});

describe('sumPortions', () => {
  it('returns EMPTY_NUTRIENTS for no portions', () => {
    expect(sumPortions([])).toEqual(EMPTY_NUTRIENTS);
  });

  it('sums multiple scaled portions', () => {
    const result = sumPortions([
      { product: product(), grams: 100 },
      { product: product({ calories_per_100g: 200, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 0 }), grams: 100 },
    ]);
    expect(result).toEqual({ calories: 300, protein: 10, carbs: 20, fat: 5 });
  });
});
