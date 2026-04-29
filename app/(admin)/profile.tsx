import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Settings,
  Share2,
  Mail,
  MapPin,
  Phone,
  Globe,
  Calendar,
  ChevronRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

// ─── Dữ liệu tĩnh (có thể thay bằng API sau) ──────────────────────────────
const PROFILE = {
  initials: 'AS',
  name: 'Aigars Silkalns',
  role: 'Quản trị viên',
  department: 'Phòng Kỹ thuật',
  email: 'aigars@colorlib.com',
  location: 'Riga, Latvia',
  phone: '+371 2000 0000',
  website: 'colorlib.com',
  joinedDate: 'Tham gia từ tháng 3, 2020',
};

// ─── Component Item Liên hệ ─────────────────────────────────────────────────
function ContactItem({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<any>;
  label: string;
}) {
  return (
    <View style={styles.contactItem}>
      <Icon size={15} color="#9CA3AF" strokeWidth={2} />
      <Text style={styles.contactText}>{label}</Text>
    </View>
  );
}

// ─── Component Nút hành động (Outline) ─────────────────────────────────────
function OutlineButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: React.ComponentType<any>;
  label: string;
  onPress?: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <TouchableOpacity
      style={[styles.outlineButton, hovered && styles.outlineButtonHover]}
      onPress={onPress}
      activeOpacity={0.8}
      {...(Platform.OS === 'web'
        ? {
            onMouseEnter: () => setHovered(true),
            onMouseLeave: () => setHovered(false),
          }
        : {})}
    >
      <Icon size={15} color={hovered ? '#059669' : '#374151'} strokeWidth={2} />
      <Text style={[styles.outlineButtonText, hovered && styles.outlineButtonTextHover]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Màn hình chính ─────────────────────────────────────────────────────────
export default function AdminProfileView() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* ── Header Page ── */}
      <View style={styles.pageHeader}>
        {/* Breadcrumb */}
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbLink}>Bảng điều khiển</Text>
          <ChevronRight size={14} color="#9CA3AF" />
          <Text style={styles.breadcrumbCurrent}>Hồ sơ</Text>
        </View>
        <Text style={styles.pageTitle}>Hồ sơ</Text>
        <Text style={styles.pageSubtitle}>Xem và quản lý thông tin hồ sơ của bạn</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          {/* Cover Banner */}
          <View style={styles.coverBanner} />

          {/* Body: Avatar + Info + Actions */}
          <View style={styles.heroBody}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{PROFILE.initials}</Text>
              </View>
            </View>

            {/* Tên + Badge + Phòng ban */}
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{PROFILE.name}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{PROFILE.role}</Text>
                </View>
              </View>
              <Text style={styles.department}>{PROFILE.department}</Text>
            </View>

            {/* Nút hành động */}
            <View style={styles.actionButtons}>
              <OutlineButton
                icon={Settings}
                label="Chỉnh sửa hồ sơ"
                onPress={() => router.push('/(admin)/settings' as any)}
              />
              <OutlineButton icon={Share2} label="Chia sẻ" />
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Footer: Thông tin liên hệ */}
          <View style={styles.contactRow}>
            <ContactItem icon={Mail} label={PROFILE.email} />
            <ContactItem icon={MapPin} label={PROFILE.location} />
            <ContactItem icon={Phone} label={PROFILE.phone} />
            <ContactItem icon={Globe} label={PROFILE.website} />
            <ContactItem icon={Calendar} label={PROFILE.joinedDate} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Header Page
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
  },

  // Hero Card
  heroCard: {
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

  // Banner
  coverBanner: {
    height: 140,
    backgroundColor: '#059669',
    // Gradient giả bằng overlay sẽ được xử lý qua LinearGradient nếu cần,
    // dùng màu đặc cho đơn giản & nhất quán
  },

  // Hero Body
  heroBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
    // Avatar nằm đè lên banner
    marginTop: -40,
  },

  // Avatar
  avatarWrapper: {
    // Tạo viền trắng xung quanh avatar
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#059669',
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },

  // Profile info
  profileInfo: {
    flex: 1,
    minWidth: 200,
    paddingTop: 42, // đẩy text xuống dưới avatar
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  roleBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  department: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 3,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 42,
    flexWrap: 'wrap',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  outlineButtonHover: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  outlineButtonTextHover: {
    color: '#059669',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 24,
  },

  // Contact Row
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 20,
    justifyContent: 'flex-start',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});
