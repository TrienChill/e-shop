import React, { useState } from 'react';
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
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '@/src/lib/supabase';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#0F0F1A',
  surface: '#1A1A2E',
  card: '#16213E',
  accent: '#6C63FF',
  accentLight: '#8B85FF',
  accentGlow: 'rgba(108, 99, 255, 0.25)',
  text: '#FFFFFF',
  textSub: '#A0A8C0',
  textMuted: '#5A6282',
  border: '#2A2D4A',
  borderFocus: '#6C63FF',
  inputBg: '#1E2240',
  success: '#4ADE80',
  error: '#F87171',
};

type Step = 'input' | 'sent';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('input');
  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendReset = async () => {
    setErrorMsg('');
    if (!email.trim()) {
      setErrorMsg('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Địa chỉ email không hợp lệ.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'eshop://reset-password',
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setStep('sent');
    } catch (e) {
      setErrorMsg('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // ── INPUT STEP ──────────────────────────────────────────────────────────────
  const renderInputStep = () => (
    <>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Icon name="arrow-left" size={22} color={COLORS.textSub} />
      </TouchableOpacity>

      {/* Illustration */}
      <View style={styles.illustrationContainer}>
        <View style={styles.illustrationGlow} />
        <View style={styles.illustrationBox}>
          <View style={styles.dotTR} />
          <View style={styles.dotBL} />
          <View style={styles.iconStack}>
            <Icon name="lock-reset" size={64} color={COLORS.accentLight} />
          </View>
        </View>
      </View>

      {/* Text */}
      <View style={styles.textSection}>
        <Text style={styles.title}>Quên Mật Khẩu?</Text>
        <Text style={styles.subtitle}>
          Đừng lo! Hãy nhập email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
        </Text>
      </View>

      {/* Form */}
      <View style={styles.card}>
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Icon name="alert-circle-outline" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Địa chỉ Email</Text>
          <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
            <Icon
              name="email-outline"
              size={20}
              color={isFocused ? COLORS.accentLight : COLORS.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="ten@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
          onPress={handleSendReset}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="send-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Gửi Liên Kết Đặt Lại</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <TouchableOpacity
        style={styles.backToLogin}
        onPress={() => router.push('/login')}
        activeOpacity={0.7}
      >
        <Icon name="arrow-left" size={16} color={COLORS.textSub} />
        <Text style={styles.backToLoginText}>Quay lại Đăng nhập</Text>
      </TouchableOpacity>
    </>
  );

  // ── SENT STEP ───────────────────────────────────────────────────────────────
  const renderSentStep = () => (
    <View style={styles.sentContainer}>
      <View style={styles.sentOrb} />

      {/* Success Icon */}
      <View style={styles.sentIconContainer}>
        <View style={styles.sentIconGlow} />
        <View style={styles.sentIconBox}>
          <Icon name="email-fast-outline" size={56} color={COLORS.success} />
        </View>
      </View>

      <Text style={styles.sentTitle}>Email Đã Được Gửi! ✉️</Text>

      <View style={styles.sentInfoCard}>
        <Text style={styles.sentInfoText}>
          Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến:
        </Text>
        <View style={styles.sentEmailBadge}>
          <Icon name="email-check-outline" size={16} color={COLORS.accentLight} />
          <Text style={styles.sentEmail}>{email}</Text>
        </View>
        <View style={styles.sentDivider} />
        <View style={styles.sentTips}>
          <View style={styles.sentTip}>
            <Icon name="clock-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.sentTipText}>Liên kết có hiệu lực trong <Text style={{ color: COLORS.accentLight, fontWeight: '600' }}>15 phút</Text></Text>
          </View>
          <View style={styles.sentTip}>
            <Icon name="inbox" size={14} color={COLORS.textMuted} />
            <Text style={styles.sentTipText}>Kiểm tra cả thư mục <Text style={{ color: COLORS.accentLight, fontWeight: '600' }}>Spam</Text> nếu không thấy</Text>
          </View>
        </View>
      </View>

      {/* Resend */}
      <View style={styles.resendSection}>
        <Text style={styles.resendText}>Không nhận được email?</Text>
        <TouchableOpacity
          onPress={() => {
            setStep('input');
            setErrorMsg('');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.resendLink}>Thử địa chỉ email khác</Text>
        </TouchableOpacity>
      </View>

      {/* Back to Login */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => router.replace('/login')}
        activeOpacity={0.85}
      >
        <Icon name="login" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.primaryBtnText}>Quay lại Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Background Orbs */}
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
          {step === 'input' && renderInputStep()}
          {step === 'sent' && renderSentStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    top: -width * 0.3,
    right: -width * 0.2,
  },
  orb2: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
    bottom: 0,
    left: -width * 0.2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // Back button
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
    marginBottom: 24,
  },

  // Illustration
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  illustrationGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
  },
  illustrationBox: {
    width: 150,
    height: 150,
    backgroundColor: COLORS.card,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  dotTR: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(108, 99, 255, 0.4)',
  },
  dotBL: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(108, 99, 255, 0.25)',
  },
  iconStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text section
  textSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSub,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Form card
  card: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
  },

  inputGroup: {
    marginBottom: 20,
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
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: COLORS.borderFocus,
    backgroundColor: '#1C1F3C',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    fontSize: 16,
    color: COLORS.text,
    height: '100%',
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
    shadowOpacity: 0.4,
    shadowRadius: 12,
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

  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSub,
  },

  // ── SENT STEP ──
  sentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
    width: '100%',
  },
  sentOrb: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(74, 222, 128, 0.06)',
    top: 0,
  },
  sentIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  sentIconGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  sentIconBox: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 222, 128, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  sentTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 24,
    textAlign: 'center',
  },
  sentInfoCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  sentInfoText: {
    fontSize: 14,
    color: COLORS.textSub,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  sentEmailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  sentEmail: {
    fontSize: 15,
    color: COLORS.accentLight,
    fontWeight: '700',
  },
  sentDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  sentTips: {
    gap: 8,
  },
  sentTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  sentTipText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 4,
  },
  resendText: {
    fontSize: 13,
    color: COLORS.textSub,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accentLight,
  },
});
