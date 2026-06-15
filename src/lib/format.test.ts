import { describe, it, expect } from 'vitest';
import { round1, formatNutrients, unitLabel, formatAmount } from './format';

describe('round1', () => {
  it('rounds to one decimal place', () => {
    expect(round1(2.5)).toBe(2.5);
    expect(round1(2.04)).toBe(2);
    expect(round1(2.06)).toBe(2.1);
  });
});

describe('formatNutrients', () => {
  it('formats a one-line summary including sodium in mg', () => {
    expect(
      formatNutrients({ calories: 300.04, protein: 10.06, carbs: 20, fat: 5, sodium: 120 }),
    ).toBe('300 kcal · C 20 · P 10.1 · F 5 · Na 120mg');
  });
});

describe('unitLabel', () => {
  it('renders piece as pcs and passes g/ml through', () => {
    expect(unitLabel('g')).toBe('g');
    expect(unitLabel('ml')).toBe('ml');
    expect(unitLabel('piece')).toBe('pcs');
  });
});

describe('formatAmount', () => {
  it('formats an amount with its unit label', () => {
    expect(formatAmount(90, 'g')).toBe('90 g');
    expect(formatAmount(250, 'ml')).toBe('250 ml');
    expect(formatAmount(2, 'piece')).toBe('2 pcs');
  });
});
