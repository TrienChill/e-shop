import {
  authLogger,
  getCurrentPlatform,
  getRolePlatformErrorMessage,
  isRoleAllowedOnPlatform,
} from "@/src/auth/authLogger";
import type { UserRole } from "@/src/auth/types";
import { AlertButton, AlertDialog } from "@/src/components/AlertDialog";
import { supabase } from "@/src/lib/supabase";
import { mergeGuestCartToDb } from "@/src/services/guestCart";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const { width } = Dimensions.get("window");

const COLORS = {
  bg: "#F9FAFB",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  accent: "#2563EB",
  accentLight: "#3B82F6",
  accentGlow: "rgba(37, 99, 235, 0.15)",
  text: "#111827",
  textSub: "#4B5563",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  borderFocus: "#2563EB",
  inputBg: "#F3F4F6",
  success: "#10B981",
  error: "#EF4444",
  googleRed: "#EA4335",
  facebookBlue: "#1877F2",
};

const App = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertButtons, setAlertButtons] = useState<AlertButton[]>([]);
  const [onAlertClose, setOnAlertClose] = useState<(() => void) | null>(null);

  const showAlert = (
    title: string,
    message: string,
    buttons: AlertButton[],
    onClose?: () => void,
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertButtons(buttons);
    setOnAlertClose(() => onClose || (() => {}));
    setTimeout(() => setAlertVisible(true), 0);
  };

  async function handleLogin() {
    const platform = getCurrentPlatform();
    authLogger.loginAttempt({ email, platform });
    setLoading(true);

    try {
      const { data: lockStatus, error: rpcError } = await supabase.rpc(
        "check_user_lock_status",
        { p_email: email.trim().toLowerCase() },
      );

      if (rpcError) {
        console.error("🚨 Lỗi RPC check_user_lock_status:", rpcError);
      }

      if (lockStatus && lockStatus.is_locked === true) {
        authLogger.loginError({
          email,
          reason: "Account locked (pre-check)",
          errorCode: "account_locked",
          errorMessage: `Account locked: ${lockStatus.lock_reason || "No reason provided"}`,
          platform,
        });
        setLoading(false);
        InteractionManager.runAfterInteractions(() => {
          setTimeout(() => {
            showAlert(
              "Tài khoản đã bị khóa",
              lockStatus.lock_reason ||
                "Tài khoản của bạn đã bị khóa bởi Quản trị viên.",
              [
                {
                  text: "Đã hiểu",
                  style: "default",
                  onPress: () => {
                    setAlertVisible(false);
                    router.push({
                      pathname: "/locked-account",
                      params: {
                        reason:
                          lockStatus.lock_reason ||
                          "Tài khoản của bạn đã bị khóa.",
                        locked_at: lockStatus.locked_at || "",
                      },
                    });
                  },
                },
              ],
              () => {},
            );
          }, 300);
        });
        return;
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        authLogger.loginError({
          email,
          reason: error.message,
          errorCode: (error as any).code ?? null,
          errorMessage: error.message,
          platform,
        });
        setLoading(false);
        if (error.message.includes("Email not confirmed")) {
          showAlert(
            "Chưa xác thực email",
            "Vui lòng kiểm tra hộp thư (hoặc Spam) để xác thực tài khoản trước khi đăng nhập.",
            [{ text: "Đã hiểu", style: "default" }],
          );
        } else {
          showAlert("Đăng nhập thất bại", error.message, [
            { text: "Đã hiểu", style: "default" },
          ]);
        }
        return;
      }

      const userId = authData.user?.id;
      if (userId) {
        try {
          const { data: fullProfileData } = await supabase
            .from("profiles")
            .select("role, is_locked, lock_reason, locked_at")
            .eq("id", userId)
            .maybeSingle();

          if (fullProfileData?.is_locked) {
            authLogger.loginError({
              email,
              reason: "Account locked (post-check)",
              errorCode: "account_locked",
              errorMessage: `Account locked: ${fullProfileData.lock_reason || "No reason provided"}`,
              platform,
            });
            InteractionManager.runAfterInteractions(() => {
              setTimeout(() => {
                showAlert(
                  "Tài khoản đã bị khóa",
                  fullProfileData.lock_reason ||
                    "Tài khoản của bạn đã bị khóa.",
                  [
                    {
                      text: "Đã hiểu",
                      style: "default",
                      onPress: async () => {
                        setAlertVisible(false);
                        await supabase.auth.signOut();
                        router.replace({
                          pathname: "/locked-account",
                          params: {
                            reason:
                              fullProfileData.lock_reason ||
                              "Tài khoản của bạn đã bị khóa.",
                            locked_at: fullProfileData.locked_at || "",
                          },
                        });
                      },
                    },
                  ],
                  () => {},
                );
              }, 300);
            });
            setLoading(false);
            return;
          }

          const role = (fullProfileData?.role as UserRole | null) ?? null;
          if (!isRoleAllowedOnPlatform(role, platform)) {
            authLogger.rolePolicyViolation({
              userId,
              role: role!,
              email,
              platform,
            });
            await supabase.auth.signOut();
            setLoading(false);
            showAlert(
              "Không được phép đăng nhập",
              getRolePlatformErrorMessage(role!),
              [{ text: "Đã hiểu", style: "default" }],
            );
            return;
          }

          authLogger.loginSuccess({ userId, role, platform });
        } catch (err) {
          console.error("Error fetching role after login:", err);
          authLogger.loginSuccess({ userId, role: null, platform });
        }

        // Merge giỏ hàng guest vào DB (chạy nền, không block UI)
        mergeGuestCartToDb(supabase, userId).then(({ merged, skipped }) => {
          if (merged > 0) {
            console.log(`[Login] Merged ${merged} guest cart items into DB`);
          }
          if (skipped > 0) {
            console.warn(`[Login] ${skipped} guest cart items failed to merge`);
          }
        }).catch(err => {
          console.warn('[Login] Cart merge error (non-critical):', err);
        });
      }

      setLoading(false);
      router.replace("/");
    } catch (err) {
      console.error("Login error:", err);
      setLoading(false);
      showAlert("Lỗi", "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.", [
        { text: "Đã hiểu", style: "default" },
      ]);
    }
  }

  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  function handleGuestContinue() {
    if (redirect) {
      router.replace(redirect as any);
    } else {
      router.replace("/");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Decorative Background Orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Header */}
          <View style={styles.headerContainer}>
            <View style={styles.logoWrapper}>
              <View style={styles.logoGlow} />
              <View style={styles.logoCircle}>
                <Icon
                  name="cart-outline"
                  size={36}
                  color={COLORS.accentLight}
                />
              </View>
            </View>
            <Text style={styles.appName}>E-Shop</Text>
            <Text style={styles.tagline}>Chào mừng trở lại! 👋</Text>
            <Text style={styles.subtitle}>Đăng nhập để tiếp tục mua sắm</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Địa chỉ Email</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === "email" && styles.inputWrapperFocused,
                ]}
              >
                <Icon
                  name="email-outline"
                  size={20}
                  color={
                    focusedInput === "email"
                      ? COLORS.accentLight
                      : COLORS.textMuted
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="ten@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Mật khẩu</Text>
                <TouchableOpacity
                  onPress={() => router.push("/forgot-password" as any)}
                >
                  <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === "password" && styles.inputWrapperFocused,
                ]}
              >
                <Icon
                  name="lock-outline"
                  size={20}
                  color={
                    focusedInput === "password"
                      ? COLORS.accentLight
                      : COLORS.textMuted
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  style={styles.eyeBtn}
                >
                  <Icon
                    name={isPasswordVisible ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Icon
                    name="login"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.primaryBtnText}>Đăng Nhập</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Guest Button */}
            <TouchableOpacity
              style={styles.guestBtn}
              onPress={handleGuestContinue}
              activeOpacity={0.7}
            >
              <Icon
                name="account-outline"
                size={18}
                color={COLORS.textSub}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.guestBtnText}>
                Tiếp tục với tư cách Khách
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Chưa có tài khoản?{" "}
              <Text
                style={styles.footerLink}
                onPress={() => router.push("/register" as any)}
              >
                Đăng ký ngay
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AlertDialog
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onRequestClose={() => {
          setAlertVisible(false);
          if (onAlertClose) onAlertClose();
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  // Background Orbs
  orb1: {
    position: "absolute",
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    top: -width * 0.3,
    right: -width * 0.2,
  },
  orb2: {
    position: "absolute",
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    bottom: -width * 0.1,
    left: -width * 0.2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: "center",
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },

  // Header
  headerContainer: {
    alignItems: "center",
    marginBottom: 28,
    width: "100%",
  },
  logoWrapper: {
    width: 90,
    height: 90,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlow: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.accentGlow,
    transform: [{ scale: 1.4 }],
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderFocus,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSub,
    fontWeight: "400",
  },

  // Card
  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 10,
  },

  // Inputs
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSub,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  forgotText: {
    fontSize: 13,
    color: COLORS.accentLight,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: COLORS.borderFocus,
    backgroundColor: "#FFFFFF",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    height: "100%",
  },
  eyeBtn: {
    padding: 6,
  },

  // Primary Button
  primaryBtn: {
    height: 56,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Guest Button
  guestBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  guestBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSub,
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },

  // Footer
  footer: {
    marginTop: 24,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 15,
    color: COLORS.textSub,
    textAlign: "center",
  },
  footerLink: {
    fontWeight: "700",
    color: COLORS.accentLight,
  },
});

export default App;
