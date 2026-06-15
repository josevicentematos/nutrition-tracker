import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export type ProductInput = {
  name: string;
  unit: import('../types').Unit;
  serving_size: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium_mg: number;
  package_size: number | null;
  package_unit: import('../types').Unit | null;
  package_price: number | null;
};

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data as Product[];
}

export async function createProduct(userId: string, input: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}
