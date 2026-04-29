import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { ChevronRight, Upload, Save } from 'lucide-react-native';
import { useRouter } from 'expo-router';

// ─── Kiểu Tab ─────────────────────────────────────────────────────────────
type TabId = 'profile' | 'preferences' | 'appearance';

const TABS: { id: TabId; label: string }[] = [
  { id: 'profile', label: 'Hồ sơ' },
  { id: 'preferences', label: 'Tùy chọn' },
  { id: 'appearance', label: 'Giao diện' },
];

// ─── Input có focus style ───────────────────────────────────────────────────
function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
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
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

// ─── Tab Hồ sơ (Form chính) ─────────────────────────────────────────────────
function ProfileTab() {
  const [firstName, setFirstName] = useState('Aigars');
  const [lastName, setLastName] = useState('Silkalns');
  const [email, setEmail] = useState('aigars@colorlib.com');
  const [bio, setBio] = useState(
    'Nhà sáng lập tại Colorlib. Xây dựng các mẫu web đẹp.'
  );
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [saveHovered, setSaveHovered] = useState(false);

  const handleSave = () => {
    if (Platform.OS === 'web') {
      alert('Đã lưu thay đổi thành công!');
    } else {
      Alert.alert('Thành công', 'Đã lưu thay đổi thành công!');
    }
  };

  return (
    <View style={styles.formCard}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Hồ sơ</Text>
        <Text style={styles.cardSubtitle}>Cập nhật thông tin cá nhân của bạn</Text>
      </View>
      <View style={styles.cardDivider} />

      {/* Section Ảnh đại diện */}
      <View style={styles.avatarSection}>
        {/* Avatar tròn */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AS</Text>
        </View>
        {/* Nút đổi + chú thích */}
        <View style={styles.avatarMeta}>
          <TouchableOpacity
            style={[styles.changeAvatarBtn, avatarHovered && styles.changeAvatarBtnHover]}
            activeOpacity={0.8}
            {...(Platform.OS === 'web'
              ? {
                  onMouseEnter: () => setAvatarHovered(true),
                  onMouseLeave: () => setAvatarHovered(false),
                }
              : {})}
          >
            <Upload size={14} color={avatarHovered ? '#059669' : '#374151'} strokeWidth={2} />
            <Text style={[styles.changeAvatarText, avatarHovered && styles.changeAvatarTextHover]}>
              Đổi ảnh đại diện
            </Text>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>JPG, PNG hoặc GIF. Tối đa 2MB.</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Form Fields */}
      <View style={styles.formBody}>
        {/* Hàng 1: Tên + Họ */}
        <View style={styles.gridRow}>
          <View style={styles.gridCell}>
            <FormInput label="Tên" value={firstName} onChangeText={setFirstName} placeholder="Nhập tên..." />
          </View>
          <View style={styles.gridCell}>
            <FormInput label="Họ" value={lastName} onChangeText={setLastName} placeholder="Nhập họ..." />
          </View>
        </View>

        {/* Hàng 2: Email */}
        <FormInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
        />

        {/* Hàng 3: Tiểu sử */}
        <FormInput
          label="Tiểu sử"
          value={bio}
          onChangeText={setBio}
          placeholder="Viết vài dòng giới thiệu về bạn..."
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Footer: Nút lưu */}
      <View style={styles.cardDivider} />
      <View style={styles.formFooter}>
        <TouchableOpacity
          style={[styles.saveButton, saveHovered && styles.saveButtonHover]}
          onPress={handleSave}
          activeOpacity={0.85}
          {...(Platform.OS === 'web'
            ? {
                onMouseEnter: () => setSaveHovered(true),
                onMouseLeave: () => setSaveHovered(false),
              }
            : {})}
        >
          <Save size={16} color="white" strokeWidth={2.5} />
          <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Placeholder Tab ────────────────────────────────────────────────────────
function PlaceholderTab({ title }: { title: string }) {
  return (
    <View style={styles.formCard}>
      <View style={{ padding: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, color: '#9CA3AF', fontWeight: '500' }}>
          Nội dung tab "{title}" đang được phát triển
        </Text>
      </View>
    </View>
  );
}

// ─── Màn hình chính ─────────────────────────────────────────────────────────
export default function ProfileSettings() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  return (
    <View style={styles.container}>
      {/* ── Header Page ── */}
      <View style={styles.pageHeader}>
        <View style={styles.breadcrumb}>
          <Text
            style={styles.breadcrumbLink}
            onPress={() => router.push('/(admin)/profile' as any)}
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab Content ── */}
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'preferences' && <PlaceholderTab title="Tùy chọn" />}
        {activeTab === 'appearance' && <PlaceholderTab title="Giao diện" />}
      </ScrollView>
    </View>
  );
}

// ─── Styles chính ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Header
  pageHeader: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  breadcrumbLink: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  breadcrumbCurrent: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },

  // Scroll
  scrollContent: {
    padding: 24,
    gap: 20,
  },

  // Tab Bar (pill style)
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    alignSelf: 'flex-start',
    gap: 2,
  },
  tabItem: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 7,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  tabItemActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#111827',
  },

  // Form Card
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
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
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  // Avatar Section
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
  avatarMeta: {
    gap: 6,
  },
  changeAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  changeAvatarBtnHover: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  changeAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  changeAvatarTextHover: {
    color: '#059669',
  },
  avatarHint: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // Form Body
  formBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 18,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  gridCell: {
    flex: 1,
  },

  // Footer
  formFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  saveButtonHover: {
    backgroundColor: '#047857',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});

// ─── Styles riêng cho FormInput ──────────────────────────────────────────────
const formStyles = StyleSheet.create({
  fieldWrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#111827',
    backgroundColor: 'white',
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  inputFocused: {
    borderColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 3px rgba(5, 150, 105, 0.15)',
      } as any,
    }),
  },
  textarea: {
    minHeight: 100,
    paddingTop: 10,
  },
});
