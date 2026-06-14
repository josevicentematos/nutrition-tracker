import { useState } from 'react';
import type { MealSection } from '../types';

interface Props {
  sections: MealSection[];
  onAdd: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function SectionManager({ sections, onAdd, onRename, onDelete }: Props) {
  const [newName, setNewName] = useState('');

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    await onAdd(name);
    setNewName('');
  }

  return (
    <div className="section-manager">
      <h3>Manage sections</h3>
      <ul>
        {sections.map((s) => (
          <li key={s.id}>
            <input
              aria-label={`Rename ${s.name}`}
              defaultValue={s.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== s.name) void onRename(s.id, v);
              }}
            />
            <button aria-label={`Delete ${s.name}`} onClick={() => onDelete(s.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <label>New section name
        <input value={newName} onChange={(e) => setNewName(e.target.value)} />
      </label>
      <button onClick={handleAdd}>Add section</button>
    </div>
  );
}
