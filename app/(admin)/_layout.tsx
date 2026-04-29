import { useAuth } from "@/src/auth/AuthContext";
import { Link, Redirect, Slot, usePathname, useRouter } from "expo-router";
import {
  Award,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Shield,
  ShoppingBag,
  Store,
  Ticket,
  TrendingUp,
  Truck,
  Bell,
} from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function AdminLayout() {
  // BƯỚC 1: Lấy state từ AuthContext (Chỉ khai báo 1 lần)
  const { session, role, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Khẳng định quyền kiểm soát: Khi vào Admin, đánh dấu admin_mode = "admin"
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem("admin_mode", "admin");
    }
  }, []);

  // BƯỚC 2: Màn hình chờ khi đang load
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // BƯỚC 3: Lá chắn bảo mật - Đẩy User/Khách vãng lai ra ngoài
  if (!session || (role !== "admin" && role !== "staff")) {
    return <Redirect href="/(shop)/(tabs)" />;
  }

  // BƯỚC 4: Xử lý hiển thị trên Mobile (Không hiện Sidebar ngang)
  if (Platform.OS !== "web") {
    return <Slot />;
  }

  // BƯỚC 5: Thiết lập Menu cho Admin/Staff trên Web
  const menuItems = [
    { href: "/(admin)/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/(admin)/orders", label: "Đơn hàng", icon: ShoppingBag },
    { href: "/(admin)/products", label: "Sản phẩm", icon: Package },
    { href: "/(admin)/categories", label: "Danh mục", icon: Layers },
    { href: "/(admin)/vouchers", label: "Mã giảm giá", icon: Ticket },
    { href: "/(admin)/membership", label: "Hạng thành viên", icon: Award },
    { href: "/(admin)/revenue", label: "Doanh thu", icon: TrendingUp },
    { href: "/(admin)/reviews", label: "Đánh giá", icon: MessageSquare },
    { href: "/(admin)/returns", label: "Trả hàng", icon: Truck },
    { href: "/(admin)/banners", label: "Banner", icon: ImageIcon },
    { href: "/(admin)/users", label: "Người dùng & Quyền", icon: Shield },
    { href: "/(admin)/notifications", label: "Thông báo", icon: Bell },
  ];

  // BƯỚC 6: Render Giao diện chính cho Web Admin
  return (
    <View style={styles.container}>
      {/* SIDEBAR */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <View style={styles.logoBadge}>
            <Store size={20} color="white" />
          </View>
          <Text style={styles.sidebarTitle}>E-Shop Admin</Text>
        </View>

        <ScrollView 
          style={styles.menuScroll} 
          contentContainerStyle={styles.menu}
          showsVerticalScrollIndicator={false}
        >
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive}
              />
            );
          })}
        </ScrollView>

        <View style={styles.sidebarFooter}>
          <Pressable style={styles.footerLink} onPress={() => signOut()}>
            <LogOut size={18} color="#9CA3AF" />
            <Text style={styles.footerLinkText}>Đăng xuất</Text>
          </Pressable>

          <Pressable
            style={styles.footerLink}
            onPress={() => {
              if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem("admin_mode", "shop");
              }
              router.replace("/(shop)/(tabs)");
            }}
          >
            <Store size={18} color="#9CA3AF" />
            <Text style={styles.footerLinkText}>Về cửa hàng</Text>
          </Pressable>
        </View>
      </View>

      {/* MAIN CONTENT */}
      <View style={styles.content}>
        {/* Nơi nội dung của dashboard, orders, products... sẽ được render */}
        <Slot />
      </View>
    </View>
  );
}

// === COMPONENT CON & STYLES ===
function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: any;
  active: boolean;
}) {
  return (
    <Link href={href as any} asChild>
      <Pressable style={StyleSheet.flatten([styles.menuItem, active && styles.menuItemActive])}>
        <Icon size={20} color={active ? "#FFF" : "#9CA3AF"} />
        <Text style={StyleSheet.flatten([styles.menuItemText, active && styles.menuItemTextActive])}>
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, flexDirection: "row", backgroundColor: "#F9FAFB", minHeight: "100vh" as any },
  sidebar: {
    width: 280,
    backgroundColor: "#111827",
    padding: 24,
    justifyContent: "space-between",
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
    gap: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  sidebarTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  menuScroll: { flex: 1 },
  menu: { gap: 4, paddingBottom: 20 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: "#2563EB",
  },
  menuItemText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "600",
  },
  menuItemTextActive: {
    color: "white",
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 20,
    gap: 16,
  },
  footerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  footerLinkText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: 40,
  },
});