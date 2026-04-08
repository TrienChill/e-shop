import { Text, TouchableOpacity, View } from "react-native";

export default function AdminDashboard() {
  return (
    // Ví dụ giao diện Admin đơn giản
    <View className="flex-1 flex-row bg-gray-100">
      {/* Sidebar */}
      <View className="w-64 bg-slate-900 p-4 hidden md:flex">
        <Text className="text-white text-xl font-bold mb-8">E-Shop Admin</Text>
        <TouchableOpacity className="mb-4">
          <Text className="text-gray-300">Đơn hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text className="text-gray-300">Sản phẩm</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View className="flex-1 p-6">
        <Text className="text-2xl font-semibold">Tổng quan doanh thu</Text>
        {/* Thêm biểu đồ và bảng tại đây */}
      </View>
    </View>
  );
}
