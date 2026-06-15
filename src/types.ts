export type Unit = 'g' | 'ml' | 'piece';

export interface Product {
  id: string;
  user_id: string;
  name: string;
  unit: Unit;
  serving_size: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium_mg: number;
  package_size: number | null;
  package_unit: Unit | null;
  package_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface MealSection {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanItem {
  id: string;
  user_id: string;
  section_id: string;
  product_id: string;
  amount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium: number;
}
