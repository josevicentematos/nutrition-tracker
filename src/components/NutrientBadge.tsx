import type { Nutrients } from '../types';
import { formatNutrients } from '../lib/format';

export function NutrientBadge({ label, nutrients }: { label: string; nutrients: Nutrients }) {
  return (
    <div className="nutrient-badge">
      <span className="nutrient-badge__label">{label}</span>
      <span className="nutrient-badge__values">{formatNutrients(nutrients)}</span>
    </div>
  );
}
