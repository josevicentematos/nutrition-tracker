import { supabase } from '../lib/supabase';
import type { MealSection } from '../types';

export const DEFAULT_SECTION_NAMES = [
  'Breakfast',
  'Lunch',
  'Snack',
  'Intra-workout',
  'Dinner',
];

export async function listSections(): Promise<MealSection[]> {
  const { data, error } = await supabase
    .from('meal_sections')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as MealSection[];
}

/** Inserts the default sections if the user has none yet. Returns current sections. */
export async function ensureDefaultSections(userId: string): Promise<MealSection[]> {
  const existing = await listSections();
  if (existing.length > 0) return existing;

  const rows = DEFAULT_SECTION_NAMES.map((name, i) => ({
    user_id: userId,
    name,
    sort_order: i,
  }));
  const { error } = await supabase.from('meal_sections').insert(rows);
  if (error) throw error;
  return listSections();
}

export async function createSection(userId: string, name: string, sortOrder: number): Promise<MealSection> {
  const { data, error } = await supabase
    .from('meal_sections')
    .insert({ user_id: userId, name, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as MealSection;
}

export async function renameSection(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('meal_sections')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSection(id: string): Promise<void> {
  const { error } = await supabase.from('meal_sections').delete().eq('id', id);
  if (error) throw error;
}
