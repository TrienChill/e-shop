// Đây là file app/index.tsx (Màn hình điều hướng gốc)
import { useAuth } from "@/src/auth/AuthContext"; // Đổi lại đường dẫn cho đúng với file context của bạn
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { role, loading } = useAuth();

  // BƯỚC 1: QUAN TRỌNG NHẤT - Bắt buộc đợi Supabase check xong Role
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        {/* Hiện vòng xoay loading trong lúc đợi 0.5s */}
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // BƯỚC 2: Lúc này loading đã là false, role đã có dữ liệu chính xác
  if (role === "admin" || role === "staff") {
    // Nếu là admin/staff -> đẩy vào Dashboard
    return <Redirect href="/(admin)/dashboard" />;
  }

  // BƯỚC 3: Nếu là user bình thường hoặc chưa đăng nhập -> đẩy về Web mua hàng
  return <Redirect href="/(shop)/(tabs)" />;
}