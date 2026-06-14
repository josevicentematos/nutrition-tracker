import type { Nutrients, Unit } from '../types';

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function formatNutrients(n: Nutrients): string {
  return (
    `${round1(n.calories)} kcal · ` +
    `P ${round1(n.protein)} · ` +
    `C ${round1(n.carbs)} · ` +
    `F ${round1(n.fat)} · ` +
    `Na ${round1(n.sodium)}mg`
  );
}

export function unitLabel(unit: Unit): string {
  return unit === 'piece' ? 'pcs' : unit;
}

export function formatAmount(amount: number, unit: Unit): string {
  return `${round1(amount)} ${unitLabel(unit)}`;
}
