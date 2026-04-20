import { useAuth } from "@/src/auth/AuthContext";
import CommonHeader from "@/src/components/layout/Header";
import { supabase } from "@/src/lib/supabase";
import { router, usePathname } from "expo-router";
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  CreditCard, 
  LogOut, 
  Globe, 
  Info, 
  Shield,
  ChevronRight 
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SIDEBAR_WIDTH = 280;
const BREAKPOINT = 1024;

// ========================================
// Sidebar Component (for Web Desktop)
// ========================================
interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  group: string;
  onPress?: () => void;
  isDestructive?: boolean;
}

const SettingsSidebar = ({ 
  activeKey, 
  onSelect,
  onLogout,
  isAdmin 
}: { 
  activeKey: string; 
  onSelect: (key: string) => void;
  onLogout: () => void;
  isAdmin: boolean;
}) => {
  const insets = useSafeAreaInsets();

  const navItems: NavItem[] = [
    { key: "profile", label: "Hồ sơ", icon: User, group: "Cá nhân", onPress: () => router.push("/edit-profile") },
    { key: "address", label: "Địa chỉ nhận hàng", icon: MapPin, group: "Cá nhân", onPress: () => router.push("/edit-address") },
    { key: "payment", label: "Phương thức thanh toán", icon: CreditCard, group: "Cá nhân", onPress: () => router.push("/payment-methods") },
    { key: "language", label: "Ngôn ngữ", icon: Globe, group: "Tài khoản" },
    { key: "about", label: "Về E-Shop", icon: Info, group: "Tài khoản" },
    ...(isAdmin ? [{ 
      key: "admin", 
      label: "Trang quản trị", 
      icon: Shield, 
      group: "Tài khoản", 
      onPress: () => {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem("admin_mode", "admin");
        }
        router.push("/(admin)/dashboard");
      }
    }] : []),
  ];

  const groups = ["Cá nhân", "Tài khoản"];

  return (
    <View style={sidebarStyles.sidebar}>
      <View style={[sidebarStyles.sidebarHeader, { paddingTop: Math.max(insets.top, 20) }]}>
        <Text style={sidebarStyles.sidebarTitle}>Cài đặt</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={sidebarStyles.sidebarNav}>
        {groups.map((group) => (
          <View key={group} style={sidebarStyles.navGroup}>
            <Text style={sidebarStyles.navGroupLabel}>{group}</Text>
            {navItems.filter(item => item.group === group).map((item) => {
              const Icon = item.icon;
              const isActive = activeKey === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[sidebarStyles.navItem, isActive && sidebarStyles.navItemActive]}
                  activeOpacity={0.7}
                  onPress={() => item.onPress ? item.onPress() : onSelect(item.key)}
                >
                  <Icon size={18} color={isActive ? "#0055FF" : "#6B7280"} />
                  <Text style={[sidebarStyles.navLabel, isActive && sidebarStyles.navLabelActive]}>
                    {item.label}
                  </Text>
                  {item.onPress && <ChevronRight size={16} color="#9CA3AF" style={sidebarStyles.navChevron} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={sidebarStyles.navGroup}>
          <Text style={sidebarStyles.navGroupLabel}>Hành động</Text>
          <TouchableOpacity
            style={[sidebarStyles.navItem, sidebarStyles.navItemDestructive]}
            activeOpacity={0.7}
            onPress={onLogout}
          >
            <LogOut size={18} color="#EF4444" />
            <Text style={sidebarStyles.navLabelDestructive}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={sidebarStyles.sidebarFooter}>
        <Text style={sidebarStyles.versionText}>E-Shop v1.0</Text>
      </View>
    </View>
  );
};

// ========================================
// Web Desktop Content Component
// ========================================
const WebSettingsContent = ({ onLogout, isAdmin }: { onLogout: () => void; isAdmin: boolean }) => {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView 
      style={webContentStyles.contentArea}
      contentContainerStyle={[webContentStyles.contentInner, { paddingTop: insets.top + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={webContentStyles.settingsHome}>
        <Text style={webContentStyles.pageTitle}>Cài đặt</Text>
        <Text style={webContentStyles.pageSubtitle}>Quản lý tài khoản và cài đặt ứng dụng của bạn</Text>

        <View style={webContentStyles.quickLinks}>
          <TouchableOpacity style={webContentStyles.quickLinkCard} onPress={() => router.push("/edit-profile")}>
            <View style={webContentStyles.quickLinkIcon}>
              <User size={24} color="#0055FF" />
            </View>
            <Text style={webContentStyles.quickLinkTitle}>Hồ sơ</Text>
            <Text style={webContentStyles.quickLinkDesc}>Cập nhật thông tin cá nhân</Text>
          </TouchableOpacity>

          <TouchableOpacity style={webContentStyles.quickLinkCard} onPress={() => router.push("/edit-address")}>
            <View style={webContentStyles.quickLinkIcon}>
              <MapPin size={24} color="#0055FF" />
            </View>
            <Text style={webContentStyles.quickLinkTitle}>Địa chỉ</Text>
            <Text style={webContentStyles.quickLinkDesc}>Quản lý địa chỉ giao hàng</Text>
          </TouchableOpacity>

          <TouchableOpacity style={webContentStyles.quickLinkCard} onPress={() => router.push("/payment-methods")}>
            <View style={webContentStyles.quickLinkIcon}>
              <CreditCard size={24} color="#0055FF" />
            </View>
            <Text style={webContentStyles.quickLinkTitle}>Thanh toán</Text>
            <Text style={webContentStyles.quickLinkDesc}>Phương thức thanh toán</Text>
          </TouchableOpacity>
        </View>

        <View style={webContentStyles.accountSection}>
          <Text style={webContentStyles.sectionTitle}>Tài khoản</Text>
          
          <TouchableOpacity style={webContentStyles.accountItem}>
            <View style={webContentStyles.accountItemLeft}>
              <Globe size={20} color="#6B7280" />
              <Text style={webContentStyles.accountItemLabel}>Ngôn ngữ</Text>
            </View>
            <View style={webContentStyles.accountItemRight}>
              <Text style={webContentStyles.accountItemValue}>Tiếng Việt</Text>
              <ChevronRight size={18} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={webContentStyles.accountItem}>
            <View style={webContentStyles.accountItemLeft}>
              <Info size={20} color="#6B7280" />
              <Text style={webContentStyles.accountItemLabel}>Về E-Shop</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity 
              style={webContentStyles.accountItem}
              onPress={() => {
                if (typeof window !== 'undefined' && window.localStorage) {
                  window.localStorage.setItem("admin_mode", "admin");
                }
                router.push("/(admin)/dashboard");
              }}
            >
              <View style={webContentStyles.accountItemLeft}>
                <Shield size={20} color="#0055FF" />
                <Text style={[webContentStyles.accountItemLabel, { color: '#0055FF' }]}>Trang quản trị</Text>
              </View>
              <ChevronRight size={18} color="#0055FF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[webContentStyles.accountItem, webContentStyles.accountItemDestructive]} onPress={onLogout}>
            <View style={webContentStyles.accountItemLeft}>
              <LogOut size={20} color="#EF4444" />
              <Text style={[webContentStyles.accountItemLabel, { color: '#EF4444' }]}>Đăng xuất</Text>
            </View>
            <ChevronRight size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

// ========================================
// Setting Item Component
// ========================================
interface SettingItemProps {
  label: string;
  value?: string;
  onPress: () => void;
  isRed?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  label,
  value,
  onPress,
  isRed = false,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={styles.settingItem}
    >
      <Text style={[styles.label, isRed && styles.redText]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.itemRight}>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        <Text style={[styles.chevron, isRed && styles.chevronRed]}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

const SectionHeader = ({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ========================================
// Main Settings Screen
// ========================================
const SettingsScreen = () => {
  const { width } = useWindowDimensions();
  const { role } = useAuth();
  const pathname = usePathname();
  const IS_WEB_DESKTOP = Platform.OS === "web" && width >= BREAKPOINT;
  const isAdminOrStaff = role === 'admin' || role === 'staff';

  const [activeNav, setActiveNav] = useState("profile");

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.replace("/(auth)/login");
    }
  };

  const appName = "E-Shop";

  // Web Desktop Layout
  if (IS_WEB_DESKTOP) {
    return (
      <View style={webStyles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={webStyles.layout}>
          <SettingsSidebar 
            activeKey={activeNav} 
            onSelect={setActiveNav} 
            onLogout={logout}
            isAdmin={isAdminOrStaff}
          />
          <WebSettingsContent onLogout={logout} isAdmin={isAdminOrStaff} />
        </View>
      </View>
    );
  }

  // Mobile Layout
  return (
    <View style={styles.container}>
      {Platform.OS !== "web" && <StatusBar barStyle="dark-content" />}

      <CommonHeader
        renderLeft={() => <Text style={styles.headerTitle}>Cài đặt</Text>}
        renderRight={() => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color="#2563EB" />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        <SectionHeader title="Cá nhân" />
        <View style={styles.sectionContainer}>
          <SettingItem
            label="Hồ sơ"
            onPress={() => router.push("/edit-profile")}
          />
          <SettingItem
            label="Địa chỉ nhận hàng"
            onPress={() => router.push("/edit-address")}
          />
          <SettingItem
            label="Phương thức thanh toán"
            onPress={() => router.push("/payment-methods")}
          />
        </View>

        <SectionHeader title="Tài khoản" />
        <View style={styles.sectionContainer}>
          {isAdminOrStaff && (
            <SettingItem 
              label="Trang quản trị (Admin)" 
              onPress={() => {
                if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                  window.localStorage.setItem("admin_mode", "admin");
                }
                router.push("/(admin)/dashboard");
              }} 
            />
          )}
          <SettingItem label="Ngôn ngữ" value="Tiếng Việt" onPress={() => { }} />
          <SettingItem label="Về E-Shop" onPress={() => { }} />
          <SettingItem label="Đăng xuất" onPress={logout} />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.6}>
            <Text style={styles.deleteText}>Xóa tài khoản của tôi</Text>
          </TouchableOpacity>

          <View style={styles.versionInfo}>
            <Text style={styles.brandName}>{appName}</Text>
            <Text style={styles.appVersion}>Phiên bản 1.0 Tháng 4, 2026</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ========================================
// Styles - Mobile/Main
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0F172A",
  },
  backBtn: {
    width: 44,
    height: 44,
    backgroundColor: "#EFF6FF",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0F172A",
  },
  sectionContainer: {
    paddingHorizontal: 24,
  },
  settingItem: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  label: {
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "500",
    flex: 1,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    marginLeft: 8,
  },
  chevron: {
    fontSize: 22,
    color: "#94A3B8",
    fontWeight: "300",
    lineHeight: 26,
  },
  chevronRed: {
    color: "#F87171",
  },
  value: {
    fontSize: 16,
    color: "#64748B",
    marginRight: 8,
  },
  footer: {
    marginTop: 40,
    paddingHorizontal: 24,
  },
  deleteBtn: {
    paddingVertical: 12,
  },
  deleteText: {
    fontSize: 15,
    color: "#FCA3A3",
    fontWeight: "500",
  },
  versionInfo: {
    marginTop: 24,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: "#94A3B8",
  },
  redText: {
    color: "#FCA3A3",
  },
});

// ========================================
// Styles - Sidebar
// ========================================
const sidebarStyles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    height: "100%",
  },
  sidebarHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  sidebarNav: {
    flex: 1,
    paddingTop: 16,
  },
  navGroup: {
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  navGroupLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: "#EFF6FF",
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  navLabelActive: {
    color: "#0055FF",
    fontWeight: "600",
  },
  navChevron: {
    marginLeft: "auto",
  },
  navItemDestructive: {
    marginTop: 8,
  },
  navLabelDestructive: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#EF4444",
  },
  sidebarFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  versionText: {
    fontSize: 13,
    color: "#9CA3B8",
  },
});

// ========================================
// Styles - Web Layout
// ========================================
const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    height: "100%",
  },
  layout: {
    flex: 1,
    flexDirection: "row",
  },
});

// ========================================
// Styles - Web Content
// ========================================
const webContentStyles = StyleSheet.create({
  contentArea: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 48,
    paddingBottom: 48,
  },
  settingsHome: {
    maxWidth: 800,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 40,
  },
  quickLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 48,
  },
  quickLinkCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#FAFBFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 24,
  },
  quickLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  quickLinkTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  quickLinkDesc: {
    fontSize: 13,
    color: "#6B7280",
  },
  accountSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FAFBFB",
    borderRadius: 12,
    marginBottom: 8,
  },
  accountItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accountItemLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  accountItemValue: {
    fontSize: 15,
    color: "#6B7280",
  },
  accountItemDestructive: {
    backgroundColor: "#FEF2F2",
    marginTop: 8,
  },
});

export default SettingsScreen;
