
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
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
// Note: Ensure you have installed lucide-react-native and react-native-svg
// npm install lucide-react-native react-native-svg
import { supabase } from '@/src/lib/supabase';
import { router } from 'expo-router';
import { Check, Eye, EyeOff } from 'lucide-react-native';


// --- Constants & Types ---
const COLORS = {
  primary: '#1a1a1a',
  background: '#f7f7f7', // background-light
  cardBg: '#ffffff',
  border: '#e5e7eb', // gray-200
  textPrimary: '#1a1a1a',
  textSecondary: '#737373', // neutral-500
  placeholder: '#9ca3af', // gray-400
  blue: '#2563EB',
};

const SOCIAL_LOGOS = {
  google: 'https://cdn-icons-png.flaticon.com/512/300/300221.png',
  facebook: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/1024px-Facebook_Logo_%282019%29.png',
};

// --- Reusable Components ---

interface InputFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  isPassword?: boolean;
  keyboardType?: 'default' | 'email-address';
}

const InputField: React.FC<InputFieldProps> = ({
  placeholder,
  value,
  onChangeText,
  isPassword = false,
  keyboardType = 'default',
}) => {
  const [isSecure, setIsSecure] = useState(isPassword);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[
      styles.inputContainer,
      isFocused && styles.inputContainerFocused
    ]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isSecure}
        keyboardType={keyboardType}
        autoCapitalize="none"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {isPassword && (
        <TouchableOpacity 
          onPress={() => setIsSecure(!isSecure)} 
          style={styles.iconContainer}
          activeOpacity={0.7}
        >
          {isSecure ? (
            <EyeOff size={20} color={COLORS.placeholder} />
          ) : (
            <Eye size={20} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

interface SocialButtonProps {
  label: string;
  iconUri: string;
  onPress?: () => void;
}

const SocialButton: React.FC<SocialButtonProps> = ({ label, iconUri, onPress }) => (
  <TouchableOpacity style={styles.socialButton} onPress={onPress} activeOpacity={0.8}>
    <Image source={{ uri: iconUri }} style={styles.socialIcon} resizeMode="contain" />
    <Text style={styles.socialButtonText}>{label}</Text>
  </TouchableOpacity>
);

// --- Main Screen ---

const App = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async () => {
    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to the Terms & Privacy Policy to continue.');
      return;
    }
    if (!formData.email || !formData.password || !formData.fullName) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
        },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Registration Error', error.message);
    } else if (data.session) {
      // Nếu tắt xác thực email, Supabase trả về session ngay -> Đăng nhập thành công
      // Chuyển hướng về trang chủ (hoặc trang profile)
      router.replace('/(shop)/(tabs)/profile'); 
    } else {
      // Nếu vẫn bật xác thực email, session sẽ là null
      Alert.alert('Success', 'Account created successfully! Please check your email for verification.', [
        { text: 'OK', onPress: () => router.push('/login') }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Container */}
          <View style={styles.card}>
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Unlock your personal AI stylist.</Text>
            </View>

            {/* Form Section */}
            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <InputField
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChangeText={(t) => setFormData({ ...formData, fullName: t })}
                />
              </View>

              <View style={styles.inputWrapper}>
                <InputField
                  placeholder="Email Address"
                  value={formData.email}
                  onChangeText={(t) => setFormData({ ...formData, email: t })}
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputWrapper}>
                <InputField
                  placeholder="Password"
                  value={formData.password}
                  onChangeText={(t) => setFormData({ ...formData, password: t })}
                  isPassword
                />
              </View>

              {/* Terms & Conditions */}
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  onPress={() => setAgreedToTerms(!agreedToTerms)}
                  style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
                  activeOpacity={0.8}
                >
                  {agreedToTerms && <Check size={14} color="#FFF" strokeWidth={3} />}
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.linkText}>Terms</Text> &{' '}
                  <Text style={styles.linkText}>Privacy Policy</Text>
                </Text>
              </View>

              {/* Primary Action Button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                onPress={handleCreateAccount}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerTextContainer}>
                <Text style={styles.dividerText}>Or sign up with</Text>
              </View>
            </View>

            {/* Social Actions */}
            <View style={styles.socialContainer}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <SocialButton label="Google" iconUri={SOCIAL_LOGOS.google} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <SocialButton label="Facebook" iconUri={SOCIAL_LOGOS.facebook} />
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Text style={styles.linkTextBold} onPress={() => router.push('/login')}>
                  Log In
                </Text>
              </Text>
            </View>

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
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 24, // sm:p-10 equivalent approx
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    // Shadow equivalent to shadow-sm
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800', // ExtraBold equivalent
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '400',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999, // Full rounded
    height: 56, // py-4 equivalent roughly
    paddingHorizontal: 24,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: 15, // sm:text-sm
    color: COLORS.textPrimary,
    height: '100%',
  },
  iconContainer: {
    padding: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 24,
    paddingLeft: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB', // gray-300
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  linkText: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    position: 'relative',
    marginTop: 24,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerTextContainer: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 24,
  },
  dividerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB', // gray-300
    borderRadius: 999,
    height: 52,
    paddingHorizontal: 16,
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  linkTextBold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});

export default App;
