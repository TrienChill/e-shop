// src/lib/supabase.ts hoặc src/services/product.ts
import { supabase } from '../lib/supabase'; // Chỉnh đường dẫn import cho đúng

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Lỗi lấy sản phẩm:', error);
    return [];
  }
  return data;
}