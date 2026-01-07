import { supabase } from '@/src/lib/supabase';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking // <-- Đã thêm Linking để mở trình duyệt xác thực
  ,

  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Constants for colors to match the design exactly
const COLORS = {
  background: '#FFFFFF',
  textMain: '#1A1A1A',
  textSecondary: '#6B7280',
  textPlaceholder: '#9CA3AF',
  primary: '#1A1A1A',
  accent: '#6467f2',
  border: '#E5E7EB',
  inputBg: '#FFFFFF',
  googleBlue: '#4285F4',
  facebookBlue: '#1877F2',
};

const SOCIAL_LOGOS = {
  google: 'https://cdn-icons-png.flaticon.com/512/300/300221.png',
  facebook: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/1024px-Facebook_Logo_%282019%29.png',
};

const App = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Xử lý đăng nhập bằng Email/Password
  async function handleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        Alert.alert('Chưa xác thực email', 'Vui lòng kiểm tra hộp thư đến (hoặc Spam) để xác thực tài khoản trước khi đăng nhập.');
      } else {
        Alert.alert('Đăng nhập thất bại', error.message);
      }
    } else {
      router.replace('/');
    }
  }

  // --- MỚI THÊM: Xử lý đăng nhập bằng Google/Facebook ---
  async function handleOAuthLogin(provider: 'google' | 'facebook') {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // Quan trọng: Phải khớp với scheme bạn khai báo trong app.json (eshop)
          redirectTo: 'eshop://', 
        },
      });

      if (error) throw error;

      // Mở trình duyệt để người dùng đăng nhập
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (error) {
      Alert.alert('Đăng nhập thất bại', (error as Error).message);
    } finally {
      // Lưu ý: setLoading(false) ở đây chỉ tắt loading ban đầu. 
      // Khi quay lại app từ trình duyệt, app sẽ reload lại state auth.
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* --- Header Section --- */}
          <View style={styles.headerContainer}>
            <View style={styles.imageContainer}>
              <View style={styles.imageBlurBg} />
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCunnHZlV4LRZKgfNaut1VmCRHTb3xKqHXS75uXE-An1Jg6C6yyIgHcLW7Nd8qwn5JZjg32Hb5DUkol0ybSlCnki0EIkC5OnvhcFlc3idFugb5rL9G-jisY0zbW0WkQJ0Jxh4KgSjeI6CW8gOJgwWLVJhroNzHlHcTjzHZtzeizBWnN0Dnse4H6SZx-Fx8ZChRUp0OQxTtKduIjM8aHevel3SPFMw-lFpSytHXqhrDxnuF4I5DkWKZ5FYq_d8YAnFIgXuGHXBOIU_g',
                }}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </View>
            
            <Text style={styles.title}>Welcome to E-Shop</Text>
            <Text style={styles.subtitle}>Your personal AI stylist awaits</Text>
          </View>

          {/* --- Form Section --- */}
          <View style={styles.formContainer}>
            
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'email' && styles.inputFocused
                ]}
                placeholder="name@example.com"
                placeholderTextColor={COLORS.textPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[
                styles.passwordContainer,
                focusedInput === 'password' && styles.inputFocused
              ]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="•••••••••"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  style={styles.eyeIcon}
                >
                  <Icon
                    name={isPasswordVisible ? 'eye-off' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.textPlaceholder}
                  />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.forgotPasswordContainer}
                onPress={() => router.push('/forgot-password')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInButton, loading && { opacity: 0.7 }]}
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.signInButtonText}>Sign In</Text>}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons (Đã cập nhật onPress) */}
            <View style={styles.socialRow}>
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => handleOAuthLogin('google')} // <-- Gọi hàm Google
                disabled={loading}
              >
                <Image source={{ uri: SOCIAL_LOGOS.google }} style={styles.socialIcon} resizeMode="contain" />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => handleOAuthLogin('facebook')} // <-- Gọi hàm Facebook
                disabled={loading}
              >
                <Image source={{ uri: SOCIAL_LOGOS.facebook }} style={styles.socialIcon} resizeMode="contain" />
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* --- Footer --- */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Dont have an account?{' '}
              <Text style={styles.signUpLink} onPress={() => router.push('/register')}>
                Sign Up</Text>
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  
  // Header Styles
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  imageContainer: {
    width: 128,
    height: 128,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageBlurBg: {
    position: 'absolute',
    width: 100,
    height: 100,
    backgroundColor: 'rgba(100, 103, 242, 0.2)', // Primary color low opacity
    borderRadius: 50,
    transform: [{ scale: 1.5 }],
  },
  heroImage: {
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', 
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Form Styles
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMain,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textMain,
  },
  passwordContainer: {
    width: '100%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: COLORS.accent,
    borderWidth: 1.5,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: COLORS.textMain,
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // Button Styles
  signInButton: {
    width: '100%',
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },

  // Divider Styles
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Social Buttons Styles
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  socialButton: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMain,
  },
  socialIcon: {
    width: 20,
    height: 20,
  },

  // Footer Styles
  footer: {
    marginTop: 'auto',
    paddingTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signUpLink: {
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
});

export default App;