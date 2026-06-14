import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm } from './ProductForm';

describe('ProductForm', () => {
  it('submits entered values including unit, serving, sodium, and package', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Milk');
    await userEvent.selectOptions(screen.getByLabelText('Unit'), 'ml');
    await userEvent.type(screen.getByLabelText('Serving size'), '200');
    await userEvent.type(screen.getByLabelText('Calories per serving'), '88');
    await userEvent.type(screen.getByLabelText('Protein per serving'), '6');
    await userEvent.type(screen.getByLabelText('Carbs per serving'), '10');
    await userEvent.type(screen.getByLabelText('Fat per serving'), '3');
    await userEvent.type(screen.getByLabelText('Sodium per serving (mg)'), '50');
    await userEvent.type(screen.getByLabelText('Package size (optional)'), '1000');
    await userEvent.type(screen.getByLabelText('Package price (optional)'), '1.5');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Milk',
      unit: 'ml',
      serving_size: 200,
      calories: 88,
      protein: 6,
      carbs: 10,
      fat: 3,
      sodium_mg: 50,
      package_size: 1000,
      package_price: 1.5,
    });
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
      expect.objectContaining({ name: 'Oats', unit: 'g', serving_size: 40, package_size: null, package_price: null }),
    );
  });
});
