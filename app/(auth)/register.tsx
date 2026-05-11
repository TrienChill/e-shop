import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/src/lib/supabase';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#F9FAFB',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  accent: '#2563EB',
  accentLight: '#3B82F6',
  accentGlow: 'rgba(37, 99, 235, 0.15)',
  text: '#111827',
  textSub: '#4B5563',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderFocus: '#2563EB',
  inputBg: '#F3F4F6',
  success: '#10B981',
  error: '#EF4444',
  googleRed: '#EA4335',
  facebookBlue: '#1877F2',
};

// ─── OTP Input Component ──────────────────────────────────────────────────────
interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
}

const OTPInput: React.FC<OTPInputProps> = ({ length = 6, value, onChange }) => {
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const clean = text.replace(/[^0-9]/g, '');
    if (clean.length > 1) {
      // Handle paste
      const newVal = (value + clean).slice(0, length);
      onChange(newVal);
      const nextIndex = Math.min(newVal.length, length - 1);
      inputs.current[nextIndex]?.focus();
      return;
    }
    const arr = value.split('');
    arr[index] = clean;
    const newVal = arr.join('').slice(0, length);
    onChange(newVal);
    if (clean && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const arr = value.split('');
      arr[index - 1] = '';
      onChange(arr.join(''));
    }
  };

  return (
    <View style={otpStyles.row}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={[
            otpStyles.box,
            value[i] ? otpStyles.boxFilled : null,
          ]}
        >
          <TextInput
            ref={(r) => { inputs.current[i] = r; }}
            style={otpStyles.boxText}
            keyboardType="number-pad"
            maxLength={1}
            value={value[i] || ''}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            selectTextOnFocus
            caretHidden
          />
        </View>
      ))}
    </View>
  );
};

const otpStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 8,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: '#6C63FF',
    backgroundColor: '#FFFFFF',
  },
  boxText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
type Step = 'form' | 'otp' | 'success';

const RegisterScreen = () => {
  const [step, setStep] = useState<Step>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [otp, setOtp] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    setErrorMsg('');
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMsg('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMsg('Bạn cần đồng ý với Chính sách bảo mật để tiếp tục.');
      return;
    }

    setLoading(true);
    try {
      // Send OTP via Supabase signUp (will send confirmation email)
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      startResendCooldown();
      setStep('otp');
    } catch {
      setErrorMsg('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setErrorMsg('');
    if (otp.length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số OTP.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: 'signup',
      });

      if (error) {
        setErrorMsg('Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
        setLoading(false);
        return;
      }

      setStep('success');
    } catch {
      setErrorMsg('Đã xảy ra lỗi khi xác thực. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      if (error) {
        setErrorMsg('Không thể gửi lại OTP. Vui lòng thử lại sau.');
      } else {
        setSuccessMsg('Đã gửi lại mã OTP!');
        startResendCooldown();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderInputWrapper = (
    inputKey: string,
    icon: string,
    placeholder: string,
    value: string,
    onChange: (t: string) => void,
    options?: {
      isPassword?: boolean;
      isVisible?: boolean;
      onToggleVisible?: () => void;
      keyboardType?: 'default' | 'email-address';
    }
  ) => (
    <View
      style={[
        styles.inputWrapper,
        focusedInput === inputKey && styles.inputWrapperFocused,
      ]}
    >
      <Icon
        name={icon}
        size={20}
        color={focusedInput === inputKey ? COLORS.accentLight : COLORS.textMuted}
        style={styles.inputIcon}
      />
      <TextInput
        style={[styles.input, { flex: 1 }]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChange}
        secureTextEntry={options?.isPassword ? !options.isVisible : false}
        keyboardType={options?.keyboardType || 'default'}
        autoCapitalize="none"
        onFocus={() => setFocusedInput(inputKey)}
        onBlur={() => setFocusedInput(null)}
      />
      {options?.isPassword && (
        <TouchableOpacity onPress={options.onToggleVisible} style={styles.eyeBtn}>
          <Icon
            name={options.isVisible ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  // ── STEP: FORM ──────────────────────────────────────────────────────────────
  const renderForm = () => (
    <>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Icon name="arrow-left" size={22} color={COLORS.textSub} />
      </TouchableOpacity>

      <View style={styles.headerContainer}>
        <View style={styles.logoCircle}>
          <Icon name="account-plus-outline" size={34} color={COLORS.accentLight} />
        </View>
        <Text style={styles.title}>Tạo Tài Khoản</Text>
        <Text style={styles.subtitle}>Đăng ký để bắt đầu mua sắm</Text>
      </View>

      <View style={styles.card}>
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Icon name="alert-circle-outline" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Họ và Tên</Text>
          {renderInputWrapper('name', 'account-outline', 'Nguyễn Văn A', fullName, setFullName)}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Địa chỉ Email</Text>
          {renderInputWrapper('email', 'email-outline', 'ten@example.com', email, setEmail, {
            keyboardType: 'email-address',
          })}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mật khẩu</Text>
          {renderInputWrapper('password', 'lock-outline', '••••••••', password, setPassword, {
            isPassword: true,
            isVisible: isPasswordVisible,
            onToggleVisible: () => setIsPasswordVisible(!isPasswordVisible),
          })}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Xác nhận Mật khẩu</Text>
          {renderInputWrapper(
            'confirm',
            'shield-check-outline',
            '••••••••',
            confirmPassword,
            setConfirmPassword,
            {
              isPassword: true,
              isVisible: isConfirmVisible,
              onToggleVisible: () => setIsConfirmVisible(!isConfirmVisible),
            }
          )}
        </View>

        {/* Terms */}
        <View style={styles.termsRow}>
          <TouchableOpacity
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
            activeOpacity={0.8}
          >
            {agreedToTerms && <Icon name="check" size={13} color="#FFFFFF" />}
          </TouchableOpacity>
          <Text style={styles.termsText}>
            Tôi đồng ý với{' '}
            <Text
              style={styles.termsLink}
              onPress={() => router.push('/privacy-policy' as any)}
            >
              Chính sách bảo mật
            </Text>
            {' '}và{' '}
            <Text style={styles.termsLink}>Điều khoản sử dụng</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
          onPress={handleSendOTP}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="send-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Gửi Mã OTP</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Đã có tài khoản?{' '}
          <Text style={styles.footerLink} onPress={() => router.push('/login')}>
            Đăng nhập
          </Text>
        </Text>
      </View>
    </>
  );

  // ── STEP: OTP ───────────────────────────────────────────────────────────────
  const renderOTP = () => (
    <>
      <TouchableOpacity style={styles.backBtn} onPress={() => setStep('form')}>
        <Icon name="arrow-left" size={22} color={COLORS.textSub} />
      </TouchableOpacity>

      <View style={styles.headerContainer}>
        <View style={[styles.logoCircle, { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: COLORS.success }]}>
          <Icon name="email-check-outline" size={34} color={COLORS.success} />
        </View>
        <Text style={styles.title}>Xác Thực Email</Text>
        <Text style={styles.subtitle}>
          Chúng tôi đã gửi mã OTP đến
        </Text>
        <Text style={[styles.subtitle, { color: COLORS.accentLight, fontWeight: '600', marginTop: 2 }]}>
          {email}
        </Text>
      </View>

      <View style={styles.card}>
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Icon name="alert-circle-outline" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View style={styles.successBox}>
            <Icon name="check-circle-outline" size={16} color={COLORS.success} />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

        <Text style={[styles.label, { textAlign: 'center', marginBottom: 16 }]}>
          NHẬP MÃ 6 CHỮ SỐ
        </Text>

        <OTPInput value={otp} onChange={setOtp} />

        <View style={styles.otpInfo}>
          <Icon name="information-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.otpInfoText}>
            Mã có hiệu lực trong 10 phút. Kiểm tra cả hộp thư Spam.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, (loading || otp.length < 6) && { opacity: 0.6 }, { marginTop: 20 }]}
          onPress={handleVerifyOTP}
          activeOpacity={0.85}
          disabled={loading || otp.length < 6}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="shield-check-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Xác Nhận OTP</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.footerText}>Không nhận được mã? </Text>
          <TouchableOpacity
            onPress={handleResendOTP}
            disabled={resendCooldown > 0 || loading}
          >
            <Text
              style={[
                styles.footerLink,
                (resendCooldown > 0 || loading) && { color: COLORS.textMuted },
              ]}
            >
              {resendCooldown > 0 ? `Gửi lại (${resendCooldown}s)` : 'Gửi lại'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  // ── STEP: SUCCESS ────────────────────────────────────────────────────────────
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successOrb} />
      <View style={[styles.logoCircle, {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderColor: COLORS.success,
        marginBottom: 24,
      }]}>
        <Icon name="check-circle" size={52} color={COLORS.success} />
      </View>
      <Text style={[styles.title, { fontSize: 26, marginBottom: 10 }]}>
        Đăng Ký Thành Công! 🎉
      </Text>
      <Text style={[styles.subtitle, { textAlign: 'center', paddingHorizontal: 24, lineHeight: 22 }]}>
        Chào mừng bạn đến với E-Shop!{'\n'}Tài khoản của bạn đã được xác thực.
      </Text>

      <TouchableOpacity
        style={[styles.primaryBtn, { marginTop: 40, paddingHorizontal: 48 }]}
        onPress={() => router.replace('/login')}
        activeOpacity={0.85}
      >
        <Icon name="login" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.primaryBtnText}>Đăng Nhập Ngay</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'form' && renderForm()}
          {step === 'otp' && renderOTP()}
          {step === 'success' && renderSuccess()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  orb1: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    top: -width * 0.3,
    right: -width * 0.2,
  },
  orb2: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    bottom: 0,
    left: -width * 0.2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1.5,
    borderColor: COLORS.borderFocus,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSub,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSub,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 54,
  },
  inputWrapperFocused: {
    borderColor: COLORS.borderFocus,
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    fontSize: 15,
    color: COLORS.text,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSub,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.accentLight,
    fontWeight: '600',
  },
  primaryBtn: {
    height: 54,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
    lineHeight: 18,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.success,
  },
  otpInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 6,
  },
  otpInfoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footer: {
    marginTop: 4,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSub,
    textAlign: 'center',
  },
  footerLink: {
    fontWeight: '700',
    color: COLORS.accentLight,
  },
  // Success screen
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  successOrb: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    top: '20%',
  },
});

export default RegisterScreen;
