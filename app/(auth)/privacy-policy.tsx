import React, { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  warning: '#F59E0B',
  error: '#EF4444',
  googleRed: '#EA4335',
  facebookBlue: '#1877F2',
};

interface Section {
  id: string;
  icon: string;
  title: string;
  content: string[];
}

const SECTIONS: Section[] = [
  {
    id: 'collect',
    icon: 'database-outline',
    title: 'Thông Tin Chúng Tôi Thu Thập',
    content: [
      'Thông tin cá nhân: Họ tên, địa chỉ email, số điện thoại khi bạn đăng ký tài khoản.',
      'Thông tin giao dịch: Lịch sử mua hàng, sản phẩm yêu thích, giỏ hàng.',
      'Thông tin thiết bị: Loại thiết bị, hệ điều hành, địa chỉ IP, mã nhận dạng thiết bị.',
      'Thông tin vị trí: Địa chỉ giao hàng và vị trí gần đúng (nếu bạn cấp quyền).',
    ],
  },
  {
    id: 'use',
    icon: 'cog-outline',
    title: 'Mục Đích Sử Dụng Thông Tin',
    content: [
      'Xử lý đơn hàng, thanh toán và giao vận sản phẩm đến bạn.',
      'Cá nhân hóa trải nghiệm mua sắm và đề xuất sản phẩm phù hợp.',
      'Gửi thông báo về trạng thái đơn hàng, khuyến mãi và cập nhật dịch vụ.',
      'Cải thiện ứng dụng, phân tích hành vi người dùng và phát triển tính năng mới.',
      'Phát hiện và ngăn chặn gian lận, bảo vệ tài khoản của bạn.',
    ],
  },
  {
    id: 'share',
    icon: 'share-variant-outline',
    title: 'Chia Sẻ Thông Tin',
    content: [
      'Đối tác vận chuyển (GHN, GHTK...): Để thực hiện giao hàng đến tay bạn.',
      'Cổng thanh toán (VNPay, Momo...): Để xử lý giao dịch tài chính an toàn.',
      'Chúng tôi KHÔNG bán thông tin cá nhân của bạn cho bên thứ ba vì mục đích thương mại.',
      'Thông tin có thể được tiết lộ khi có yêu cầu pháp lý từ cơ quan nhà nước có thẩm quyền.',
    ],
  },
  {
    id: 'security',
    icon: 'shield-lock-outline',
    title: 'Bảo Mật Dữ Liệu',
    content: [
      'Dữ liệu được mã hóa bằng chuẩn TLS/SSL trong quá trình truyền tải.',
      'Mật khẩu được mã hóa một chiều (hashing) và không ai có thể đọc được, kể cả nhân viên chúng tôi.',
      'Hệ thống xác thực hai yếu tố (2FA) có thể được kích hoạt để bảo vệ tài khoản.',
      'Chúng tôi thường xuyên kiểm tra và cập nhật các biện pháp bảo mật.',
    ],
  },
  {
    id: 'rights',
    icon: 'account-check-outline',
    title: 'Quyền Của Bạn',
    content: [
      'Truy cập & Chỉnh sửa: Bạn có thể xem và cập nhật thông tin cá nhân bất cứ lúc nào.',
      'Xóa tài khoản: Yêu cầu xóa tất cả dữ liệu cá nhân của bạn khỏi hệ thống của chúng tôi.',
      'Rút lại đồng ý: Hủy đăng ký nhận email marketing hoặc thông báo khuyến mãi.',
      'Khiếu nại: Liên hệ với chúng tôi nếu bạn cho rằng dữ liệu của mình bị xử lý sai.',
    ],
  },
  {
    id: 'cookies',
    icon: 'cookie-outline',
    title: 'Cookie & Dữ Liệu Phiên',
    content: [
      'Chúng tôi sử dụng cookie và bộ nhớ cục bộ để lưu trạng thái đăng nhập và giỏ hàng.',
      'Dữ liệu phiên được sử dụng để cải thiện hiệu suất và trải nghiệm người dùng.',
      'Bạn có thể xóa cookie và dữ liệu ứng dụng bất cứ lúc nào trong cài đặt thiết bị.',
    ],
  },
  {
    id: 'retention',
    icon: 'calendar-clock-outline',
    title: 'Thời Gian Lưu Trữ',
    content: [
      'Dữ liệu tài khoản được lưu trữ trong suốt thời gian bạn sử dụng dịch vụ.',
      'Sau khi xóa tài khoản, dữ liệu sẽ được xóa vĩnh viễn trong vòng 30 ngày.',
      'Một số dữ liệu giao dịch có thể được giữ lại để tuân thủ quy định pháp lý (tối đa 5 năm).',
    ],
  },
  {
    id: 'contact',
    icon: 'email-outline',
    title: 'Liên Hệ & Khiếu Nại',
    content: [
      'Email: privacy@eshop.vn',
      'Hotline: 1800-xxx-xxx (miễn phí, 8:00 - 22:00)',
      'Địa chỉ: Tầng X, Tòa nhà ABC, Quận Y, TP. Hồ Chí Minh.',
      'Chúng tôi cam kết phản hồi trong vòng 72 giờ làm việc.',
    ],
  },
];

const PrivacyPolicyScreen = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>('collect');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Background Orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={22} color={COLORS.textSub} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chính Sách Bảo Mật</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconContainer}>
            <View style={styles.heroIconGlow} />
            <View style={styles.heroIconBox}>
              <Icon name="shield-account-outline" size={52} color={COLORS.accentLight} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Cam Kết Bảo Mật</Text>
          <Text style={styles.heroSubtitle}>
            E-Shop coi trọng quyền riêng tư của bạn. Chính sách này giải thích cách chúng tôi
            thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn.
          </Text>

          {/* Last updated badge */}
          <View style={styles.updatedBadge}>
            <Icon name="calendar-check-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.updatedText}>Cập nhật lần cuối: 01/05/2026</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Icon name="shield-check" size={22} color={COLORS.success} />
            <Text style={styles.statLabel}>Bảo mật{'\n'}SSL/TLS</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="eye-off-outline" size={22} color={COLORS.accentLight} />
            <Text style={styles.statLabel}>Không bán{'\n'}dữ liệu</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="delete-outline" size={22} color={COLORS.warning} />
            <Text style={styles.statLabel}>Xóa theo{'\n'}yêu cầu</Text>
          </View>
        </View>

        {/* Accordion Sections */}
        {SECTIONS.map((section, index) => (
          <View key={section.id} style={styles.accordionItem}>
            <TouchableOpacity
              style={[
                styles.accordionHeader,
                expandedSection === section.id && styles.accordionHeaderActive,
              ]}
              onPress={() => toggleSection(section.id)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.sectionIconWrapper,
                expandedSection === section.id && styles.sectionIconWrapperActive,
              ]}>
                <Icon
                  name={section.icon}
                  size={20}
                  color={expandedSection === section.id ? COLORS.accentLight : COLORS.textMuted}
                />
              </View>
              <Text style={[
                styles.accordionTitle,
                expandedSection === section.id && styles.accordionTitleActive,
              ]}>
                {section.title}
              </Text>
              <Icon
                name={expandedSection === section.id ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={expandedSection === section.id ? COLORS.accentLight : COLORS.textMuted}
              />
            </TouchableOpacity>

            {expandedSection === section.id && (
              <View style={styles.accordionBody}>
                {section.content.map((item, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Footer acceptance */}
        <View style={styles.footerCard}>
          <Icon name="information-outline" size={18} color={COLORS.accentLight} />
          <Text style={styles.footerCardText}>
            Bằng cách sử dụng E-Shop, bạn đồng ý với Chính sách Bảo mật này. Nếu bạn không đồng ý,
            vui lòng không sử dụng ứng dụng.
          </Text>
        </View>

        {/* Back to Register Button */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Icon name="check-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Đã Hiểu, Quay Lại</Text>
        </TouchableOpacity>
      </ScrollView>
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
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    top: -width * 0.2,
    right: -width * 0.2,
  },
  orb2: {
    position: 'absolute',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    bottom: 0,
    left: -width * 0.1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  heroIconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  heroIconBox: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: 'rgba(108, 99, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textSub,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  updatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  updatedText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSub,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '600',
  },

  // Accordion
  accordionItem: {
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  accordionHeaderActive: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    flexShrink: 0,
  },
  sectionIconWrapperActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderColor: 'rgba(108, 99, 255, 0.4)',
  },
  accordionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSub,
  },
  accordionTitleActive: {
    color: COLORS.text,
  },
  accordionBody: {
    padding: 16,
    paddingTop: 14,
    gap: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginTop: 7,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSub,
    lineHeight: 20,
  },

  // Footer
  footerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.25)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginTop: 16,
    marginBottom: 20,
  },
  footerCardText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSub,
    lineHeight: 20,
  },

  primaryBtn: {
    height: 54,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default PrivacyPolicyScreen;
