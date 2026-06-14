import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SectionManager } from './SectionManager';
import type { MealSection } from '../types';

const sections: MealSection[] = [
  { id: 's1', user_id: 'u1', name: 'Breakfast', sort_order: 0, created_at: '', updated_at: '' },
];

describe('SectionManager', () => {
  it('adds a section', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<SectionManager sections={sections} onAdd={onAdd} onRename={vi.fn()} onDelete={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('New section name'), 'Pre-bed');
    await userEvent.click(screen.getByRole('button', { name: 'Add section' }));
    expect(onAdd).toHaveBeenCalledWith('Pre-bed');
  });

  it('deletes a section', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<SectionManager sections={sections} onAdd={vi.fn()} onRename={vi.fn()} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete Breakfast' }));
    expect(onDelete).toHaveBeenCalledWith('s1');
  });
});
