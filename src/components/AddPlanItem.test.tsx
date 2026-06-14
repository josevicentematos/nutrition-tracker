import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddPlanItem } from './AddPlanItem';
import type { Product } from '../types';

const products: Product[] = [
  { id: 'p1', user_id: 'u1', name: 'Oats', unit: 'g', serving_size: 40,
    calories: 152, protein: 5, carbs: 27, fat: 3, sodium_mg: 2,
    package_size: null, package_price: null, created_at: '', updated_at: '' },
  { id: 'p2', user_id: 'u1', name: 'Milk', unit: 'ml', serving_size: 200,
    calories: 88, protein: 6, carbs: 10, fat: 3, sodium_mg: 50,
    package_size: 1000, package_price: 1.5, created_at: '', updated_at: '' },
];

describe('AddPlanItem', () => {
  it('pre-fills amount from the selected product serving size', async () => {
    render(<AddPlanItem products={products} onAdd={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p1');
    expect(screen.getByLabelText('Amount')).toHaveValue(40);
  });

  it('shows the selected product unit', async () => {
    render(<AddPlanItem products={products} onAdd={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p2');
    expect(screen.getByTestId('amount-unit')).toHaveTextContent('ml');
  });

  it('calls onAdd with product id and amount', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<AddPlanItem products={products} onAdd={onAdd} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p2');
    await userEvent.clear(screen.getByLabelText('Amount'));
    await userEvent.type(screen.getByLabelText('Amount'), '250');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledWith('p2', 250);
  });

  it('does not call onAdd when amount is zero or empty', async () => {
    const onAdd = vi.fn();
    render(<AddPlanItem products={products} onAdd={onAdd} />);
    await userEvent.selectOptions(screen.getByLabelText('Product'), 'p2');
    await userEvent.clear(screen.getByLabelText('Amount'));
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).not.toHaveBeenCalled();
  });
});
