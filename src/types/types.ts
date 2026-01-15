// src/types/types.ts

// 1. Enums (Dựa trên USER-DEFINED types trong SQL)
export type UserRole = 'admin' | 'user';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type DiscountType = 'percentage' | 'fixed_amount';

// 2. JSONB Structures (Định nghĩa cấu trúc cho cột JSONB)
export interface ProductVariant {
  id: string; // FE tự generate hoặc dùng SKU
  size?: string;
  color?: string;
  stock: number;
  price_adjustment?: number; // Giá cộng thêm nếu có
}

// 3. Database Entities (Ánh xạ 1-1 với bảng Supabase)

export interface Profile {
  id: string; // UUID liên kết với auth.users
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  image_url: string | null;
  created_at: string;
}

export interface Collection {
  id: number;
  collection_name: string | null;
  created_at: string;
}

export interface Product {
  id: number;
  category_id: number | null;
  collection_id: number | null;
  name: string;
  description: string | null;
  price: number;
  images: string[] | null; // SQL là ARRAY -> TS là string[]
  variants: ProductVariant[] | null; // SQL là JSONB
  stock: number;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: number;
  user_id: string | null;
  status: OrderStatus;
  total_amount: number;
  shipping_address: string;
  phone_contact: string;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price_at_purchase: number;
  selected_variant: ProductVariant | null; // SQL là JSONB
}

// 4. Cart State (Dành cho Frontend - Zustand/Redux)
// Cart không lưu trong DB bảng riêng (trừ khi sync), tạm thời ta dùng state local
export interface CartItemState {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}