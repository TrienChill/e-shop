import { useAuth } from "@/src/auth/AuthContext";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { session, role, loading } = useAuth();

  // 1. CHẶN KHI ĐANG TẢI: Đảm bảo không redirect nhầm khi chưa có dữ liệu Role
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // 2. LUỒNG ADMIN: Nếu Admin xóa "/dashboard" để về "/", code này sẽ đẩy họ quay lại ngay
  if (session && (role === "admin" || role === "staff")) {
    return <Redirect href="/(admin)/dashboard" />;
  }

  // 3. LUỒNG USER/GUEST: Nếu là khách hoặc chưa đăng nhập thì mới về trang chủ bán hàng
  return <Redirect href="/(shop)/(tabs)" />;
}