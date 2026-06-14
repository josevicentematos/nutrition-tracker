import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductsScreen } from './ProductsScreen';
import type { Product } from '../types';

const sample: Product = {
  id: 'p1', user_id: 'u1', name: 'Oats',
  calories_per_100g: 380, protein_per_100g: 13, carbs_per_100g: 67, fat_per_100g: 7,
  default_serving_g: 40, created_at: '', updated_at: '',
};

const hoisted = vi.hoisted(() => ({
  listProducts: vi.fn(),
  deleteProduct: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  countPlanItemsForProduct: vi.fn(),
  deletePlanItemsForProduct: vi.fn(),
}));

vi.mock('../data/products', () => ({
  listProducts: hoisted.listProducts,
  deleteProduct: hoisted.deleteProduct,
  createProduct: hoisted.createProduct,
  updateProduct: hoisted.updateProduct,
}));
vi.mock('../data/planItems', () => ({
  countPlanItemsForProduct: hoisted.countPlanItemsForProduct,
  deletePlanItemsForProduct: hoisted.deletePlanItemsForProduct,
}));

describe('ProductsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.listProducts.mockResolvedValue([sample]);
    hoisted.deleteProduct.mockResolvedValue(undefined);
    hoisted.deletePlanItemsForProduct.mockResolvedValue(undefined);
  });

  it('lists products', async () => {
    render(<ProductsScreen userId="u1" />);
    expect(await screen.findByText('Oats')).toBeInTheDocument();
  });

  it('deletes directly when product is unused', async () => {
    hoisted.countPlanItemsForProduct.mockResolvedValue(0);
    render(<ProductsScreen userId="u1" />);
    await screen.findByText('Oats');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Oats' }));
    await waitFor(() => expect(hoisted.deleteProduct).toHaveBeenCalledWith('p1'));
    expect(hoisted.deletePlanItemsForProduct).not.toHaveBeenCalled();
  });

  it('warns and removes plan items when product is in use', async () => {
    hoisted.countPlanItemsForProduct.mockResolvedValue(3);
    render(<ProductsScreen userId="u1" />);
    await screen.findByText('Oats');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Oats' }));

    const warning = await screen.findByRole('alertdialog');
    expect(warning).toHaveTextContent('used in 3 meal item');

    await userEvent.click(screen.getByRole('button', { name: 'Remove anyway' }));
    await waitFor(() => expect(hoisted.deletePlanItemsForProduct).toHaveBeenCalledWith('p1'));
    expect(hoisted.deleteProduct).toHaveBeenCalledWith('p1');
  });
});
