import type { Nutrients } from '../types';

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function formatNutrients(n: Nutrients): string {
  return (
    `${round1(n.calories)} kcal · ` +
    `P ${round1(n.protein)} · ` +
    `C ${round1(n.carbs)} · ` +
    `F ${round1(n.fat)}`
  );
}
