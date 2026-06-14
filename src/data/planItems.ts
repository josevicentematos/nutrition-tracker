import { supabase } from '../lib/supabase';
import type { PlanItem } from '../types';

export async function listPlanItems(): Promise<PlanItem[]> {
  const { data, error } = await supabase
    .from('plan_items')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as PlanItem[];
}

export async function addPlanItem(
  userId: string,
  sectionId: string,
  productId: string,
  amount: number,
  sortOrder: number,
): Promise<PlanItem> {
  const { data, error } = await supabase
    .from('plan_items')
    .insert({
      user_id: userId,
      section_id: sectionId,
      product_id: productId,
      amount,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PlanItem;
}

export async function updatePlanItemAmount(id: string, amount: number): Promise<void> {
  const { error } = await supabase
    .from('plan_items')
    .update({ amount, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deletePlanItem(id: string): Promise<void> {
  const { error } = await supabase.from('plan_items').delete().eq('id', id);
  if (error) throw error;
}

/** Used by the product-delete warning flow. */
export async function countPlanItemsForProduct(productId: string): Promise<number> {
  const { count, error } = await supabase
    .from('plan_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);
  if (error) throw error;
  return count ?? 0;
}

export async function deletePlanItemsForProduct(productId: string): Promise<void> {
  const { error } = await supabase.from('plan_items').delete().eq('product_id', productId);
  if (error) throw error;
}
