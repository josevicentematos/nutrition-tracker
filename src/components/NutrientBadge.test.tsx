import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NutrientBadge } from './NutrientBadge';

describe('NutrientBadge', () => {
  it('renders a labeled, formatted nutrient summary with sodium', () => {
    render(
      <NutrientBadge label="Total" nutrients={{ calories: 300, protein: 10, carbs: 20, fat: 5, sodium: 120 }} />,
    );
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('300 kcal · P 10 · C 20 · F 5 · Na 120mg')).toBeInTheDocument();
  });
});
