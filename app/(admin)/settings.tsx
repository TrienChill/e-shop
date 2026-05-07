import { useAuth } from "@/src/auth/AuthContext";
import type {
  ColorSchemeId,
  DensityMode,
  ThemeMode,
} from "@/src/context/AppearanceContext";
import {
  COLOR_MAP,
  DENSITY_PADDING,
  useAppearance,
} from "@/src/context/AppearanceContext";
import { supabase } from "@/src/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  AlignJustify,
  CheckCircle,
  ChevronRight,
  Circle,
  Maximize2,
  Monitor,
  Moon,
  Save,
  StretchHorizontal,
  Sun,
  Upload,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Kiểu Tab ──────────────────────────────────────────────────────────────
type TabId = "profile" | "appearance";
const TABS: { id: TabId; label: string }[] = [
  { id: "profile", label: "Hồ sơ" },
  { id: "appearance", label: "Giao diện" },
];

// ─── Kiểu dữ liệu Form ─────────────────────────────────────────────────────
interface ProfileForm {
  full_name: string;
  phone: string;
  email: string;
  avatar_url: string | null;
}

// ─── Toast nội tuyến ───────────────────────────────────────────────────────
type ToastType = "success" | "error";
interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
}

function InlineToast({ toast }: { toast: ToastState }) {
  if (!toast.visible) return null;
  const isSuccess = toast.type === "success";
  return (
    <View
      style={[
        toastStyles.container,
        isSuccess ? toastStyles.success : toastStyles.error,
      ]}
    >
      {isSuccess ? (
        <CheckCircle size={16} color="#065F46" />
      ) : (
        <XCircle size={16} color="#991B1B" />
      )}
      <Text
        style={[
          toastStyles.text,
          isSuccess ? toastStyles.successText : toastStyles.errorText,
        ]}
      >
        {toast.message}
      </Text>
    </View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  success: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  error: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  text: { fontSize: 14, fontWeight: "600", flex: 1 },
  successText: { color: "#065F46" },
  errorText: { color: "#991B1B" },
});

// ─── FormInput có focus style ───────────────────────────────────────────────
function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
  editable = true,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
  keyboardType?: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={formStyles.fieldWrapper}>
      <Text style={formStyles.label}>{label}</Text>
      <TextInput
        style={[
          formStyles.input,
          multiline && formStyles.textarea,
          focused && formStyles.inputFocused,
          !editable && formStyles.inputDisabled,
        ]}
        value={value}
        onChangeText={editable ? onChangeText : undefined}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? "top" : "center"}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        keyboardType={keyboardType}
      />
      {!editable && (
        <Text style={formStyles.disabledHint}>Không thể chỉnh sửa</Text>
      )}
    </View>
  );
}

// ─── Tab Hồ sơ ─────────────────────────────────────────────────────────────
function ProfileTab({ userId }: { userId: string }) {
  const [form, setForm] = useState<ProfileForm>({
    full_name: "",
    phone: "",
    email: "",
    avatar_url: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [saveHovered, setSaveHovered] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "success",
    message: "",
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: ToastType, message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, type, message });
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3500);
  };

  // ── Fetch profile từ Supabase ──────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user)
        throw new Error("Không lấy được thông tin người dùng");

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      setForm({
        full_name: data?.full_name ?? "",
        phone: data?.phone ?? "",
        email: user.email ?? "",
        avatar_url: data?.avatar_url ?? null,
      });
    } catch (err: any) {
      console.error("[Settings] fetchProfile error:", err);
      showToast(
        "error",
        "Không thể tải thông tin hồ sơ: " +
          (err?.message ?? "Lỗi không xác định"),
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [fetchProfile]);

  // ── Upload avatar ──────────────────────────────────────────────────────
  const handlePickAvatar = async () => {
    try {
      // Yêu cầu quyền truy cập ảnh (mobile)
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Cần quyền truy cập",
            "Vui lòng cấp quyền truy cập thư viện ảnh.",
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];

      // Kiểm tra kích thước (tối đa 2MB)
      if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
        showToast("error", "Ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB.");
        return;
      }

      setUploadingAvatar(true);

      // Tạo tên file duy nhất
      const ext = asset.uri.split(".").pop() ?? "jpg";
      const fileName = `avatar_${userId}_${Date.now()}.${ext}`;
      const filePath = `${userId}/${fileName}`;

      // Đọc file dưới dạng blob (web) hoặc base64 (mobile)
      let uploadData: Blob | ArrayBuffer;
      let contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);
        uploadData = await response.blob();
      } else {
        // Trên mobile, đọc base64 rồi convert
        const response = await fetch(asset.uri);
        uploadData = await response.blob();
      }

      // Upload lên Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, uploadData, { contentType, upsert: true });

      if (uploadError) throw uploadError;

      // Lấy public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Cập nhật avatar_url vào bảng profiles
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (updateError) throw updateError;

      setForm((prev) => ({ ...prev, avatar_url: publicUrl }));
      showToast("success", "Đã cập nhật ảnh đại diện thành công!");
    } catch (err: any) {
      console.error("[Settings] handlePickAvatar error:", err);
      showToast(
        "error",
        "Không thể tải ảnh lên: " + (err?.message ?? "Lỗi không xác định"),
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Lưu thông tin ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.full_name.trim()) {
      showToast("error", "Vui lòng nhập họ và tên.");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      showToast("success", "Đã lưu thay đổi thành công!");
    } catch (err: any) {
      console.error("[Settings] handleSave error:", err);
      showToast(
        "error",
        "Lưu thất bại: " + (err?.message ?? "Lỗi không xác định"),
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Lấy initials ──────────────────────────────────────────────────────
  const initials = (() => {
    const name = form.full_name.trim();
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2)
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    return form.email.slice(0, 2).toUpperCase() || "AD";
  })();

  if (loading) {
    return (
      <View style={styles.formCard}>
        <View
          style={{
            padding: 48,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <ActivityIndicator size="large" color="#059669" />
          <Text style={{ fontSize: 14, color: "#6B7280" }}>
            Đang tải thông tin...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.formCard}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Hồ sơ</Text>
        <Text style={styles.cardSubtitle}>
          Cập nhật thông tin cá nhân của bạn
        </Text>
      </View>
      <View style={styles.cardDivider} />

      <View style={styles.formBody}>
        {/* Toast */}
        <InlineToast toast={toast} />

        {/* Section Ảnh đại diện */}
        <View style={styles.avatarSection}>
          {/* Avatar */}
          {form.avatar_url ? (
            <Image
              source={{ uri: form.avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}

          {/* Meta: nút + chú thích */}
          <View style={styles.avatarMeta}>
            <TouchableOpacity
              style={[
                styles.changeAvatarBtn,
                avatarHovered && styles.changeAvatarBtnHover,
              ]}
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
              activeOpacity={0.8}
              {...(Platform.OS === "web"
                ? {
                    onMouseEnter: () => setAvatarHovered(true),
                    onMouseLeave: () => setAvatarHovered(false),
                  }
                : {})}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Upload
                  size={14}
                  color={avatarHovered ? "#059669" : "#374151"}
                  strokeWidth={2}
                />
              )}
              <Text
                style={[
                  styles.changeAvatarText,
                  avatarHovered && styles.changeAvatarTextHover,
                ]}
              >
                {uploadingAvatar ? "Đang tải lên..." : "Đổi ảnh đại diện"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>
              JPG, PNG hoặc GIF. Tối đa 2MB.
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Form Fields */}
        <View style={styles.fieldsWrapper}>
          {/* Họ và tên */}
          <FormInput
            label="Họ và tên"
            value={form.full_name}
            onChangeText={(t) => setForm((prev) => ({ ...prev, full_name: t }))}
            placeholder="Nhập họ và tên..."
          />

          {/* Email (read-only) */}
          <FormInput
            label="Email"
            value={form.email}
            placeholder="email@example.com"
            editable={false}
          />

          {/* Số điện thoại */}
          <FormInput
            label="Số điện thoại"
            value={form.phone}
            onChangeText={(t) => setForm((prev) => ({ ...prev, phone: t }))}
            placeholder="Nhập số điện thoại..."
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Footer: Nút lưu */}
      <View style={styles.cardDivider} />
      <View style={styles.formFooter}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            saveHovered && styles.saveButtonHover,
            (saving || uploadingAvatar) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving || uploadingAvatar}
          activeOpacity={0.85}
          {...(Platform.OS === "web"
            ? {
                onMouseEnter: () => setSaveHovered(true),
                onMouseLeave: () => setSaveHovered(false),
              }
            : {})}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Save size={16} color="white" strokeWidth={2.5} />
          )}
          <Text style={styles.saveButtonText}>
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Tab Giao diện ────────────────────────────────────────────────────────
function AppearanceTab() {
  // Lấy state + setters từ context (tự động lưu localStorage và áp dụng ngay)
  const {
    theme,
    colorScheme,
    density,
    primaryColor,
    setTheme,
    setColorScheme,
    setDensity,
  } = useAppearance();
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "success",
    message: "",
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, type: "success", message });
    toastTimer.current = setTimeout(
      () => setToast((p) => ({ ...p, visible: false })),
      2500,
    );
  };

  const handleTheme = (t: ThemeMode) => {
    setTheme(t);
    showToast("Chủ đề đã được cập nhật");
  };
  const handleColor = (c: ColorSchemeId) => {
    setColorScheme(c);
    showToast("Bảng màu đã được cập nhật");
  };
  const handleDensity = (d: DensityMode) => {
    setDensity(d);
    showToast("Mật độ hiển thị đã được cập nhật");
  };

  const THEMES: { id: ThemeMode; label: string; icon: any }[] = [
    { id: "light", label: "Sáng", icon: Sun },
    { id: "dark", label: "Tối", icon: Moon },
    { id: "system", label: "Hệ thống", icon: Monitor },
  ];

  const COLOR_SCHEMES: { id: ColorSchemeId; label: string; color: string }[] = [
    { id: "emerald", label: "Lục bảo", color: COLOR_MAP.emerald.primary },
    { id: "blue", label: "Xanh dương", color: COLOR_MAP.blue.primary },
    { id: "violet", label: "Tím", color: COLOR_MAP.violet.primary },
    { id: "rose", label: "Hồng", color: COLOR_MAP.rose.primary },
    { id: "orange", label: "Cam", color: COLOR_MAP.orange.primary },
    { id: "slate", label: "Xám", color: COLOR_MAP.slate.primary },
  ];

  const DENSITIES: {
    id: DensityMode;
    label: string;
    icon: any;
    desc: string;
  }[] = [
    {
      id: "compact",
      label: "Gọn gàng",
      icon: AlignJustify,
      desc: `${DENSITY_PADDING.compact}px`,
    },
    {
      id: "comfortable",
      label: "Thoải mái",
      icon: Maximize2,
      desc: `${DENSITY_PADDING.comfortable}px`,
    },
    {
      id: "spacious",
      label: "Rộng rãi",
      icon: StretchHorizontal,
      desc: `${DENSITY_PADDING.spacious}px`,
    },
  ];

  return (
    <View style={styles.formCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Giao diện</Text>
        <Text style={styles.cardSubtitle}>
          Tùy chỉnh giao diện và cảm nhận của bảng điều khiển
        </Text>
      </View>
      <View style={styles.cardDivider} />

      <View style={{ padding: 24 }}>
        {/* Toast */}
        <InlineToast toast={toast} />

        {/* Chủ đề */}
        <Text style={appearanceStyles.sectionTitle}>Chủ đề</Text>
        <View style={appearanceStyles.grid}>
          {THEMES.map((item) => {
            const isActive = theme === item.id;
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  appearanceStyles.card,
                  isActive && {
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}08`,
                  },
                ]}
                onPress={() => handleTheme(item.id)}
              >
                <Icon size={24} color={isActive ? primaryColor : "#6B7280"} />
                <Text
                  style={[
                    appearanceStyles.cardLabel,
                    isActive && { color: primaryColor },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bảng màu */}
        <Text style={[appearanceStyles.sectionTitle, { marginTop: 32 }]}>
          Bảng màu
        </Text>
        <View style={appearanceStyles.grid}>
          {COLOR_SCHEMES.map((item) => {
            const isActive = colorScheme === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  appearanceStyles.card,
                  isActive && {
                    borderColor: item.color,
                    backgroundColor: `${item.color}0D`,
                  },
                ]}
                onPress={() => handleColor(item.id)}
              >
                <Circle size={20} color={item.color} fill={item.color} />
                <Text
                  style={[
                    appearanceStyles.cardLabel,
                    isActive && { color: item.color, fontWeight: "700" },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Mật độ hiển thị */}
        <Text style={[appearanceStyles.sectionTitle, { marginTop: 32 }]}>
          Mật độ hiển thị
        </Text>
        <View style={appearanceStyles.grid}>
          {DENSITIES.map((item) => {
            const isActive = density === item.id;
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  appearanceStyles.card,
                  isActive && {
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}08`,
                  },
                ]}
                onPress={() => handleDensity(item.id)}
              >
                <Icon size={24} color={isActive ? primaryColor : "#6B7280"} />
                <Text
                  style={[
                    appearanceStyles.cardLabel,
                    isActive && { color: primaryColor },
                  ]}
                >
                  {item.label}
                </Text>
                <Text style={appearanceStyles.cardDesc}>{item.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Placeholder Tab ────────────────────────────────────────────────────────
function PlaceholderTab({ title }: { title: string }) {
  return (
    <View style={styles.formCard}>
      <View
        style={{ padding: 48, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: 16, color: "#9CA3AF", fontWeight: "500" }}>
          Tab &quot;{title}&quot; đang được phát triển
        </Text>
      </View>
    </View>
  );
}

// ─── Màn hình chính ─────────────────────────────────────────────────────────
export default function ProfileSettings() {
  const router = useRouter();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const userId = session?.user?.id;

  return (
    <View style={styles.container}>
      {/* ── Header Page ── */}
      <View style={styles.pageHeader}>
        <View style={styles.breadcrumb}>
          <Text
            style={styles.breadcrumbLink}
            onPress={() => router.push("/(admin)/profile" as any)}
          >
            Hồ sơ
          </Text>
          <ChevronRight size={14} color="#9CA3AF" />
          <Text style={styles.breadcrumbCurrent}>Cài đặt</Text>
        </View>
        <Text style={styles.pageTitle}>Cài đặt</Text>
        <Text style={styles.pageSubtitle}>
          Quản lý cài đặt tài khoản và tùy chọn của bạn
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Navigation Tabs ── */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab Content ── */}
        {activeTab === "profile" && userId && <ProfileTab userId={userId} />}
        {activeTab === "profile" && !userId && (
          <View style={styles.formCard}>
            <View style={{ padding: 48, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#059669" />
            </View>
          </View>
        )}
        {activeTab === "appearance" && <AppearanceTab />}
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  // Header
  pageHeader: {
    backgroundColor: "white",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  breadcrumbLink: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  breadcrumbCurrent: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },

  // Scroll
  scrollContent: { padding: 24, gap: 20 },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 4,
    alignSelf: "flex-start",
    gap: 2,
  },
  tabItem: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 7,
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  tabItemActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#111827" },

  // Form Card
  formCard: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 14,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  cardSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: "#E5E7EB" },

  // Form Body
  formBody: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 4 },
  fieldsWrapper: { gap: 18, paddingTop: 20 },

  // Avatar Section
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingBottom: 20,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "white",
    letterSpacing: 1,
  },
  avatarMeta: { gap: 6 },
  changeAvatarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "white",
    alignSelf: "flex-start",
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  changeAvatarBtnHover: { borderColor: "#059669", backgroundColor: "#F0FDF4" },
  changeAvatarText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  changeAvatarTextHover: { color: "#059669" },
  avatarHint: { fontSize: 12, color: "#9CA3AF" },

  // Footer
  formFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#059669",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    ...Platform.select({ web: { cursor: "pointer" } as any }),
  },
  saveButtonHover: { backgroundColor: "#047857" },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: "white", fontSize: 14, fontWeight: "700" },
});

// ─── Styles cho FormInput ────────────────────────────────────────────────────
const formStyles = StyleSheet.create({
  fieldWrapper: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "white",
    ...Platform.select({ web: { outlineStyle: "none" } as any }),
  },
  inputFocused: {
    borderColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    ...Platform.select({
      web: { boxShadow: "0 0 0 3px rgba(5, 150, 105, 0.15)" } as any,
    }),
  },
  inputDisabled: {
    backgroundColor: "#F9FAFB",
    color: "#9CA3AF",
  },
  textarea: { minHeight: 100, paddingTop: 10 },
  disabledHint: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
});

// ─── Styles cho AppearanceTab ────────────────────────────────────────────────
const appearanceStyles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    flex: 1,
    flexBasis: "30%",
    minWidth: 140,
    aspectRatio: 2.2,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    ...Platform.select({
      web: { cursor: "pointer" } as any,
    }),
  },
  cardActive: {
    borderColor: "#059669",
    backgroundColor: "rgba(5, 150, 105, 0.04)",
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  cardDesc: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: -4,
  },
});
