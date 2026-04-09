import { useAuth } from "@/src/auth/AuthContext";
import { Link, Redirect, Slot, usePathname } from "expo-router";
import {
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  Ticket,
  TrendingUp,
} from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function AdminLayout() {
  // BƯỚC 1: Lấy state từ AuthContext (Chỉ khai báo 1 lần)
  const { session, role, loading, signOut } = useAuth();
  const pathname = usePathname();

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
    { href: "/(admin)/vouchers", label: "Mã giảm giá", icon: Ticket },
    { href: "/(admin)/revenue", label: "Doanh thu", icon: TrendingUp },
  ];

  if (role === "admin") {
    menuItems.push({
      href: "/(admin)/users",
      label: "Phân quyền",
      icon: ShieldCheck,
    });
  }

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

        <View style={styles.menu}>
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
        </View>

        <View style={styles.sidebarFooter}>
          <Pressable style={styles.footerLink} onPress={() => signOut()}>
            <LogOut size={18} color="#9CA3AF" />
            <Text style={styles.footerLinkText}>Đăng xuất</Text>
          </Pressable>

          <Link href="/(shop)/(tabs)" asChild>
            <Pressable style={styles.footerLink}>
              <Store size={18} color="#9CA3AF" />
              <Text style={styles.footerLinkText}>Về cửa hàng</Text>
            </Pressable>
          </Link>
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
  menu: { flex: 1, gap: 4 },
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