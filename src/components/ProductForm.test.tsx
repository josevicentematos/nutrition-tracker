import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm } from './ProductForm';

describe('ProductForm', () => {
  it('submits entered values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Oats');
    await userEvent.type(screen.getByLabelText('Calories per 100g'), '380');
    await userEvent.type(screen.getByLabelText('Protein per 100g'), '13');
    await userEvent.type(screen.getByLabelText('Carbs per 100g'), '67');
    await userEvent.type(screen.getByLabelText('Fat per 100g'), '7');
    await userEvent.type(screen.getByLabelText('Default serving (g, optional)'), '40');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Oats',
      calories_per_100g: 380,
      protein_per_100g: 13,
      carbs_per_100g: 67,
      fat_per_100g: 7,
      default_serving_g: 40,
    });
  });

  it('blocks submit when name is empty', async () => {
    const onSubmit = vi.fn();
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
  });

  it('sends null default_serving_g when left blank', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Water');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Water', default_serving_g: null }),
    );
  });
});
