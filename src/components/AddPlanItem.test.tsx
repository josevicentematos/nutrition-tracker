import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddPlanItem } from './AddPlanItem';
import type { Product } from '../types';

const products: Product[] = [
  { id: 'p1', user_id: 'u1', name: 'Oats', calories_per_100g: 380, protein_per_100g: 13,
    carbs_per_100g: 67, fat_per_100g: 7, default_serving_g: 40, created_at: '', updated_at: '' },
  { id: 'p2', user_id: 'u1', name: 'Milk', calories_per_100g: 60, protein_per_100g: 3,
    carbs_per_100g: 5, fat_per_100g: 3, default_serving_g: null, created_at: '', updated_at: '' },
];

describe('AddPlanItem', () => {
  it('pre-fills grams from the selected product default serving', async () => {
    render(<AddPlanItem products={products} onAdd={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p1');
    expect(screen.getByLabelText('Grams')).toHaveValue(40);
  });

  it('calls onAdd with product id and grams', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<AddPlanItem products={products} onAdd={onAdd} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p2');
    await userEvent.clear(screen.getByLabelText('Grams'));
    await userEvent.type(screen.getByLabelText('Grams'), '200');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledWith('p2', 200);
  });

  it('does not call onAdd when grams is zero or empty', async () => {
    const onAdd = vi.fn();
    render(<AddPlanItem products={products} onAdd={onAdd} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p2');
    await userEvent.clear(screen.getByLabelText('Grams'));
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).not.toHaveBeenCalled();
  });
});
