import type { Product, Nutrients } from '../types';

export const EMPTY_NUTRIENTS: Nutrients = {
  calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0,
};

export function scalePortion(product: Product, amount: number): Nutrients {
  const factor = amount / product.serving_size;
  return {
    calories: product.calories * factor,
    protein: product.protein * factor,
    carbs: product.carbs * factor,
    fat: product.fat * factor,
    sodium: product.sodium_mg * factor,
  };
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    sodium: a.sodium + b.sodium,
  };
}

export function sumPortions(
  portions: { product: Product; amount: number }[],
): Nutrients {
  return portions.reduce(
    (acc, p) => addNutrients(acc, scalePortion(p.product, p.amount)),
    EMPTY_NUTRIENTS,
  );
}
