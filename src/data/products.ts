import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export type ProductInput = {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  default_serving_g: number | null;
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
