import CommonHeader from '@/src/components/layout/Header';
import { supabase } from '@/src/lib/supabase';
import { router } from 'expo-router';
import { ArrowLeft, Pencil, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const EditProfileScreen = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('************');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Focus state for inputs UI
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error("Chưa đăng nhập");

      setEmail(user.email || '');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile) {
        setFullName(profile.full_name || '');
        setAvatarUrl(profile.avatar_url);
      }
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        setNewAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể truy cập thư viện ảnh.");
    }
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!newAvatarUri) return null;
    
    try {
      // Result uri fetch to get blob data or use base64 (already have base64 toggle in picker)
      // Since it's React Native, using base64 with base64-arraybuffer is often more reliable for Supabase
      const base64Str = await fetch(newAvatarUri).then(res => res.blob()).then(blob => {
          return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => resolve(reader.result as string);
          });
      });
      
      const cleanBase64 = base64Str.split('base64,')[1];
      const fileName = `${userId}/${Date.now()}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(cleanBase64), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
        
      return publicUrl;
    } catch (error) {
      console.error('Lỗi upload ảnh:', error);
      throw new Error("Không thể tải ảnh lên máy chủ.");
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Cảnh báo", "Họ và tên không được để trống.");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Vui lòng đăng nhập lại.");

      let finalAvatarUrl = avatarUrl;
      
      // 1. Xử lý Upload ảnh nếu có chọn ảnh mới
      if (newAvatarUri) {
        const uploadedUrl = await uploadAvatar(user.id);
        if (uploadedUrl) finalAvatarUrl = uploadedUrl;
      }

      // 2. Cập nhật Profile Data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 3. Cập nhật mật khẩu nếu có
      if (password !== '************' && password.trim() !== '') {
        if (password.length < 6) {
          throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
        }
        const { error: authError } = await supabase.auth.updateUser({
          password: password,
        });
        if (authError) throw authError;
      }

      Alert.alert("Thành công", "Thông tin hồ sơ của bạn đã được cập nhật!");
      router.back();
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0055FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader
        renderLeft={() => (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#2563EB" />
          </TouchableOpacity>
        )}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Texts */}
          <View style={styles.headerTextGroup}>
            <Text style={styles.mainTitle}>Cài đặt</Text>
            <Text style={styles.subTitle}>Hồ sơ của bạn</Text>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              <Image
                source={newAvatarUri ? { uri: newAvatarUri } : (avatarUrl ? { uri: avatarUrl } : { uri: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop' })}
                style={styles.avatarImage}
              />
              <TouchableOpacity style={styles.editPencil} onPress={pickImage}>
                <Camera size={14} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                focusedField === 'name' && styles.inputFocused
              ]}
              placeholder="Họ và tên"
              value={fullName}
              onChangeText={setFullName}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
            />

            <TextInput
              style={[
                styles.input,
                focusedField === 'email' && styles.inputFocused
              ]}
              placeholder="Email"
              value={email}
              editable={false} // Khách hàng thường không đổi email trực tiếp qua input này mà phải qua Auth flow
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              keyboardType="email-address"
            />

            <TextInput
              style={[
                styles.input,
                focusedField === 'password' && styles.inputFocused
              ]}
              placeholder="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              onFocus={() => {
                if (password === '************') setPassword('');
                setFocusedField('password');
              }}
              onBlur={() => {
                if (password === '') setPassword('************');
                setFocusedField(null);
              }}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#EFF6FF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerTextGroup: {
    marginTop: 20,
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '500',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
    padding: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  editPencil: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0055FF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#F0F4FF', // Light blue tint
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: '#0055FF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0055FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  saveBtn: {
    marginTop: 100, // Move down towards bottom as requested
    backgroundColor: '#0055FF',
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0055FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;
