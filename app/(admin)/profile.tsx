import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Calendar,
  ChevronRight,
  Globe,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Settings,
  Share2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/auth/AuthContext';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// ─── Kiểu dữ liệu Profile ───────────────────────────────────────────────────
interface ProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: string | null;
  email: string | null;
  created_at: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return 'AD';
}

function formatRole(role: string | null): string {
  if (!role) return 'Thành viên';
  if (role === 'admin') return 'Quản trị viên';
  if (role === 'staff') return 'Nhân viên';
  return role;
}

function formatJoinedDate(dateStr: string | null): string {
  if (!dateStr) return 'Không rõ';
  try {
    return 'Tham gia từ ' + format(new Date(dateStr), 'MMMM yyyy', { locale: vi });
  } catch {
    return 'Không rõ';
  }
}

// ─── Component: Skeleton placeholder ────────────────────────────────────────
function SkeletonBlock({ width, height, borderRadius = 6, style }: any) {
  return (
    <View
      style={[
        { width, height, borderRadius, backgroundColor: '#E5E7EB' },
        style,
      ]}
    />
  );
}

// ─── Component: ContactItem ──────────────────────────────────────────────────
function ContactItem({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<any>;
  label: string;
}) {
  if (!label) return null;
  return (
    <View style={styles.contactItem}>
      <Icon size={15} color="#9CA3AF" strokeWidth={2} />
      <Text style={styles.contactText}>{label}</Text>
    </View>
  );
}

// ─── Component: OutlineButton ────────────────────────────────────────────────
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
        ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
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
  const { session } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch dữ liệu từ Supabase ──────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Không thể lấy thông tin người dùng');

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, role, created_at')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setProfile({
        id: user.id,
        full_name: data?.full_name ?? null,
        avatar_url: data?.avatar_url ?? null,
        phone: data?.phone ?? null,
        role: data?.role ?? null,
        email: user.email ?? null,
        created_at: data?.created_at ?? user.created_at ?? null,
      });
    } catch (err: any) {
      console.error('[Profile] fetchProfile error:', err);
      setError(err?.message ?? 'Không thể tải thông tin hồ sơ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchProfile();
  }, [session, fetchProfile]);

  // ── Tính toán các giá trị hiển thị ────────────────────────────────────
  const initials = getInitials(profile?.full_name, profile?.email);
  const displayName = profile?.full_name || profile?.email || 'Admin';
  const roleLabel = formatRole(profile?.role ?? null);
  const joinedLabel = formatJoinedDate(profile?.created_at ?? null);

  // ── Skeleton khi đang tải ──────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.pageHeader}>
          <SkeletonBlock width={180} height={14} style={{ marginBottom: 8 }} />
          <SkeletonBlock width={100} height={28} style={{ marginBottom: 6 }} />
          <SkeletonBlock width={260} height={14} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroCard}>
            <View style={[styles.coverBanner, { opacity: 0.4 }]} />
            <View style={styles.heroBody}>
              <SkeletonBlock width={80} height={80} borderRadius={40} />
              <View style={{ flex: 1, paddingTop: 42, gap: 8 }}>
                <SkeletonBlock width={200} height={22} />
                <SkeletonBlock width={120} height={16} />
              </View>
            </View>
            <View style={styles.divider} />
            <View style={[styles.contactRow, { gap: 16 }]}>
              {[160, 120, 140, 100, 180].map((w, i) => (
                <SkeletonBlock key={i} width={w} height={14} />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Trạng thái lỗi ────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Hồ sơ</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
            <RefreshCw size={16} color="white" />
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header Page ── */}
      <View style={styles.pageHeader}>
        <View style={styles.breadcrumb}>
          <Text
            style={styles.breadcrumbLink}
            onPress={() => router.push('/(admin)/dashboard' as any)}
          >
            Bảng điều khiển
          </Text>
          <ChevronRight size={14} color="#9CA3AF" />
          <Text style={styles.breadcrumbCurrent}>Hồ sơ</Text>
        </View>
        <View style={styles.pageTitleRow}>
          <View>
            <Text style={styles.pageTitle}>Hồ sơ</Text>
            <Text style={styles.pageSubtitle}>Xem và quản lý thông tin hồ sơ của bạn</Text>
          </View>
          {/* Nút làm mới */}
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchProfile}>
            <RefreshCw size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          {/* Cover Banner */}
          <View style={styles.coverBanner} />

          {/* Body: Avatar + Info + Actions */}
          <View style={styles.heroBody}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            </View>

            {/* Tên + Badge + Role */}
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{displayName}</Text>
                <View style={[
                  styles.roleBadge,
                  profile?.role === 'admin' && styles.roleBadgeAdmin,
                ]}>
                  <Text style={[
                    styles.roleBadgeText,
                    profile?.role === 'admin' && styles.roleBadgeTextAdmin,
                  ]}>
                    {roleLabel}
                  </Text>
                </View>
              </View>
              {profile?.email && (
                <Text style={styles.department}>{profile.email}</Text>
              )}
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
            {profile?.email && <ContactItem icon={Mail} label={profile.email} />}
            {profile?.phone && <ContactItem icon={Phone} label={profile.phone} />}
            <ContactItem icon={Calendar} label={joinedLabel} />
          </View>
        </View>

        {/* ── Thông tin chi tiết ── */}
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>Thông tin tài khoản</Text>
          <View style={styles.cardDivider} />

          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Họ và tên</Text>
              <Text style={styles.detailValue}>{profile?.full_name || '—'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{profile?.email || '—'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Số điện thoại</Text>
              <Text style={styles.detailValue}>{profile?.phone || 'Chưa cập nhật'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Vai trò</Text>
              <View style={[
                styles.rolePill,
                profile?.role === 'admin' && styles.rolePillAdmin,
              ]}>
                <Text style={[
                  styles.rolePillText,
                  profile?.role === 'admin' && styles.rolePillTextAdmin,
                ]}>
                  {roleLabel}
                </Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Ngày tham gia</Text>
              <Text style={styles.detailValue}>{joinedLabel}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // ── Page Header
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
    marginBottom: 10,
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
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },

  // ── Scroll
  scrollContent: { padding: 24, gap: 20 },

  // ── Hero Card
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
  coverBanner: {
    height: 140,
    backgroundColor: '#059669',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
    marginTop: -40,
  },
  avatarWrapper: {},
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
  },
  avatarFallback: {
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
  profileInfo: {
    flex: 1,
    minWidth: 200,
    paddingTop: 44,
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
  roleBadgeAdmin: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  roleBadgeTextAdmin: {
    color: '#065F46',
  },
  department: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 44,
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
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 24,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 20,
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

  // ── Detail Card
  detailCard: {
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
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 14,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  detailGrid: {
    padding: 24,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    minWidth: 140,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  rolePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rolePillAdmin: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  rolePillTextAdmin: {
    color: '#065F46',
  },

  // ── Error / Retry
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 40,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});
