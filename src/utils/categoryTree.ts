// src/utils/categoryTree.ts
// Logic xử lý cây danh mục đa cấp — chỉ gọi DB 1 lần, xử lý ở client

import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  name_vi: string | null;
  slug: string | null;
  parent_id: number | null;
  display_order: number;
  is_active: boolean;
  image_url: string | null;
  group: string | null;
  created_at: string;
}

// Kiểu đệ quy: mỗi node có thể có children là CategoryNode[]
export interface CategoryNode extends Category {
  children: CategoryNode[];
  depth: number; // Cấp độ: 0 = gốc, 1 = con, 2 = cháu...
}

// ─── Fetch toàn bộ từ DB (1 lần duy nhất) ───────────────────────────────────

export const fetchAllCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data as Category[];
};

// ─── Hàm biến flat array → Nested Tree ──────────────────────────────────────

export const buildTree = (
  flatList: Category[],
  parentId: number | null = null,
  depth: number = 0
): CategoryNode[] => {
  return flatList
    .filter((cat) => cat.parent_id === parentId)
    .sort((a, b) => a.display_order - b.display_order)
    .map((cat) => ({
      ...cat,
      depth,
      children: buildTree(flatList, cat.id, depth + 1),
    }));
};

// ─── Flatten tree → mảng phẳng có thứ tự DFS (dùng cho Dropdown) ────────────

export const flattenTree = (
  nodes: CategoryNode[],
  result: CategoryNode[] = []
): CategoryNode[] => {
  for (const node of nodes) {
    result.push(node);
    if (node.children.length > 0) {
      flattenTree(node.children, result);
    }
  }
  return result;
};

// ─── Lấy tất cả descendant IDs của một node (dùng khi xóa) ─────────────────

export const getDescendantIds = (
  nodeId: number,
  flatList: Category[]
): number[] => {
  const directChildren = flatList.filter((c) => c.parent_id === nodeId);
  const result: number[] = [];
  for (const child of directChildren) {
    result.push(child.id);
    result.push(...getDescendantIds(child.id, flatList));
  }
  return result;
};

// ─── CRUD Operations ─────────────────────────────────────────────────────────

export const createCategory = async (payload: {
  name: string;
  name_vi: string;
  slug: string;
  parent_id: number | null;
  display_order: number;
  is_active: boolean;
  image_url?: string;
  group?: string;
}) => {
  const { data, error } = await supabase
    .from('categories')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data as Category;
};

export const updateCategory = async (
  id: number,
  payload: Partial<Omit<Category, 'id' | 'created_at'>>
) => {
  const { error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
};

// Cập nhật display_order hàng loạt (batch update)
export const batchUpdateOrder = async (
  updates: { id: number; display_order: number }[]
) => {
  const promises = updates.map(({ id, display_order }) =>
    supabase.from('categories').update({ display_order }).eq('id', id)
  );
  const results = await Promise.all(promises);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
};

// Xóa theo danh sách IDs
export const deleteCategoriesByIds = async (ids: number[]) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .in('id', ids);
  if (error) throw error;
};

// Chuyển danh mục con sang cha mới (re-parent)
export const reparentChildren = async (
  fromParentId: number,
  toParentId: number | null
) => {
  const { error } = await supabase
    .from('categories')
    .update({ parent_id: toParentId })
    .eq('parent_id', fromParentId);
  if (error) throw error;
};

// Tạo slug tự động từ tên tiếng Việt
export const generateSlug = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
