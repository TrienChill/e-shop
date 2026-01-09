import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

/**
 * Hàm mở thư viện ảnh và upload lên Supabase
 * @returns {Promise<string | null>} Trả về Public URL của ảnh hoặc null nếu lỗi
 */
export const uploadImageToSupabase = async () => {
  try {
    // 1. Mở thư viện ảnh trên điện thoại
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Cho phép user cắt/crop ảnh
      aspect: [1, 1],      // Tỷ lệ vuông (phù hợp làm Avatar)
      quality: 0.8,        // Giảm chất lượng chút cho nhẹ
      base64: true,        // QUAN TRỌNG: Cần base64 để upload
    });

    // Nếu user bấm hủy không chọn ảnh
    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('User cancelled image picker');
      return null;
    }

    const image = result.assets[0];
    
    if (!image.base64) {
        console.error('Không có dữ liệu base64');
        return null;
    }

    // 2. Tạo tên file ngẫu nhiên (tránh trùng tên)
    const fileExt = 'jpg';
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // 3. Upload lên Supabase Storage
    // Lưu ý: Bucket tên là 'avatars'. Bạn phải tạo bucket này trên Dashboard rồi nhé!
    const { error: uploadError } = await supabase.storage
      .from('avatars') 
      .upload(filePath, decode(image.base64), {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // 4. Lấy đường dẫn công khai (Public URL)
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;

  } catch (error) {
    console.error('Lỗi upload ảnh:', error);
    return null;
  }
};