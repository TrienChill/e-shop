import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// 1. Lấy biến từ môi trường
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// 2. Kiểm tra an toàn (Tránh lỗi crash app nếu quên cấu hình)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Thiếu cấu hình Supabase trong file .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ... phần code AppState lắng nghe trạng thái (giữ nguyên)