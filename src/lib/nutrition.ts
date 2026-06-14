import type { Product, Nutrients } from '../types';

export const EMPTY_NUTRIENTS: Nutrients = {
  calories: 0, protein: 0, carbs: 0, fat: 0,
};

export function scalePortion(product: Product, grams: number): Nutrients {
  const factor = grams / 100;
  return {
    calories: product.calories_per_100g * factor,
    protein: product.protein_per_100g * factor,
    carbs: product.carbs_per_100g * factor,
    fat: product.fat_per_100g * factor,
  };
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

export function sumPortions(
  portions: { product: Product; grams: number }[],
): Nutrients {
  return portions.reduce(
    (acc, p) => addNutrients(acc, scalePortion(p.product, p.grams)),
    EMPTY_NUTRIENTS,
  );
}
