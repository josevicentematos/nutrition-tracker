import { describe, it, expect } from 'vitest';
import { round1, formatNutrients } from './format';

describe('round1', () => {
  it('rounds to one decimal place', () => {
    expect(round1(2.5)).toBe(2.5);
    expect(round1(2.04)).toBe(2);
    expect(round1(2.06)).toBe(2.1);
  });
});

describe('formatNutrients', () => {
  it('formats a one-line summary with rounded values', () => {
    expect(
      formatNutrients({ calories: 300.04, protein: 10.06, carbs: 20, fat: 5 }),
    ).toBe('300 kcal · P 10.1 · C 20 · F 5');
  });
});
