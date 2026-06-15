import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm } from './ProductForm';

describe('ProductForm', () => {
  it('submits entered values including serving unit, package unit, and sodium', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Bread');
    await userEvent.selectOptions(screen.getByLabelText('Serving unit'), 'piece');
    await userEvent.type(screen.getByLabelText('Serving size'), '2');
    await userEvent.type(screen.getByLabelText('Calories per serving'), '160');
    await userEvent.type(screen.getByLabelText('Carbs per serving'), '30');
    await userEvent.type(screen.getByLabelText('Protein per serving'), '6');
    await userEvent.type(screen.getByLabelText('Fat per serving'), '2');
    await userEvent.type(screen.getByLabelText('Sodium per serving (mg)'), '300');
    await userEvent.type(screen.getByLabelText('Package size (optional)'), '500');
    await userEvent.selectOptions(screen.getByLabelText('Package unit'), 'g');
    await userEvent.type(screen.getByLabelText('Package price (optional)'), '1.2');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Bread',
      unit: 'piece',
      serving_size: 2,
      calories: 160,
      carbs: 30,
      protein: 6,
      fat: 2,
      sodium_mg: 300,
      package_size: 500,
      package_unit: 'g',
      package_price: 1.2,
    });
  });

  it('orders carbs before protein in the form', () => {
    render(<ProductForm onSubmit={vi.fn()} onCancel={() => {}} />);
    const carbs = screen.getByLabelText('Carbs per serving');
    const protein = screen.getByLabelText('Protein per serving');
    expect(carbs.compareDocumentPosition(protein) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('blocks submit when name is empty', async () => {
    const onSubmit = vi.fn();
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Serving size'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
  });

  it('blocks submit when serving size is zero or blank', async () => {
    const onSubmit = vi.fn();
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Oats');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Serving size must be greater than 0');
  });

  it('blocks submit when only one of package size/price is filled', async () => {
    const onSubmit = vi.fn();
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Oats');
    await userEvent.type(screen.getByLabelText('Serving size'), '40');
    await userEvent.type(screen.getByLabelText('Package price (optional)'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter both package size and price, or leave both blank');
  });

  it('sends null package fields when both blank', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Oats');
    await userEvent.type(screen.getByLabelText('Serving size'), '40');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ package_size: null, package_unit: null, package_price: null }),
    );
  });
});
