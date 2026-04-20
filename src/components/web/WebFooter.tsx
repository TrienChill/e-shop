import { View, Text, Platform, useWindowDimensions, TouchableOpacity, Image } from "react-native";
import React from "react";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

export default function WebFooter() {
  const { width } = useWindowDimensions();
  const isWebDesktop = Platform.OS === "web" && width >= 768;

  // Golden Rule: Tuyệt đối KHÔNG hiển thị trên Mobile (App hoặc Web mobile màn hình nhỏ)
  if (!isWebDesktop) return null;

  return (
    <View className="w-full bg-[#111827] pt-16 pb-8 border-t border-gray-800">
      <View className="max-w-[1200px] w-full mx-auto px-6">
        {/* Lưới 4 Cột */}
        <View className="flex-row flex-wrap justify-between">
          
          {/* Cột 1: Về E-Shop */}
          <View className="w-1/4 pr-4">
            <Text className="text-white text-3xl font-bold mb-6 tracking-wider">E-SHOP<Text className="text-blue-500">.</Text></Text>
            
            <View className="mb-3 flex-row items-start">
              <MaterialIcons name="location-on" size={20} color="#9ca3af" style={{ marginTop: 2, marginRight: 8 }} />
              <Text className="text-gray-400 text-sm flex-1 leading-6">Tầng 12, Tòa nhà ABC, 123 Đường XYZ, Quận 1, TP. Hồ Chí Minh</Text>
            </View>
            
            <View className="mb-3 flex-row items-center">
              <MaterialIcons name="phone" size={20} color="#9ca3af" style={{ marginRight: 8 }} />
              <Text className="text-gray-400 text-sm">Hotline: <Text className="text-white font-medium">1900 1234</Text></Text>
            </View>
            
            <View className="flex-row items-center">
              <MaterialIcons name="email" size={20} color="#9ca3af" style={{ marginRight: 8 }} />
              <Text className="text-gray-400 text-sm">Email: <Text className="text-white font-medium">support@eshop.vn</Text></Text>
            </View>
          </View>

          {/* Cột 2: Hỗ trợ khách hàng */}
          <View className="w-1/4 px-4">
            <Text className="text-white text-lg font-semibold mb-6">Hỗ trợ khách hàng</Text>
            <View className="space-y-4">
              <TouchableOpacity className="mb-3"><Text className="text-gray-400 text-sm hover:text-blue-400 transition-colors">Trung tâm trợ giúp</Text></TouchableOpacity>
              <TouchableOpacity className="mb-3"><Text className="text-gray-400 text-sm hover:text-blue-400 transition-colors">Chính sách bảo mật</Text></TouchableOpacity>
              <TouchableOpacity className="mb-3"><Text className="text-gray-400 text-sm hover:text-blue-400 transition-colors">Điều khoản dịch vụ</Text></TouchableOpacity>
              <TouchableOpacity className="mb-3"><Text className="text-gray-400 text-sm hover:text-blue-400 transition-colors">Chính sách đổi trả</Text></TouchableOpacity>
              <TouchableOpacity><Text className="text-gray-400 text-sm hover:text-blue-400 transition-colors">Theo dõi đơn hàng</Text></TouchableOpacity>
            </View>
          </View>

          {/* Cột 3: Tải ứng dụng */}
          <View className="w-1/4 px-4">
            <Text className="text-white text-lg font-semibold mb-6">Tải ứng dụng</Text>
            <Text className="text-gray-400 text-sm mb-4">Mua sắm tiện lợi hơn trên ứng dụng E-Shop.</Text>
            <View className="flex-col space-y-3">
              <TouchableOpacity className="bg-gray-800 rounded-lg p-2 flex-row items-center mb-3 hover:bg-gray-700 transition-colors w-[140px]">
                <FontAwesome5 name="apple" size={24} color="white" style={{ marginRight: 10, marginLeft: 4 }} />
                <View>
                  <Text className="text-gray-400 text-[10px]">Download on the</Text>
                  <Text className="text-white font-semibold text-sm">App Store</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity className="bg-gray-800 rounded-lg p-2 flex-row items-center hover:bg-gray-700 transition-colors w-[140px]">
                <FontAwesome5 name="google-play" size={20} color="white" style={{ marginRight: 10, marginLeft: 4 }} />
                <View>
                  <Text className="text-gray-400 text-[10px]">GET IT ON</Text>
                  <Text className="text-white font-semibold text-sm">Google Play</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cột 4: Thanh toán & Kết nối */}
          <View className="w-1/4 pl-4">
            <Text className="text-white text-lg font-semibold mb-6">Kết nối với chúng tôi</Text>
            <View className="flex-row space-x-4 mb-8">
              <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-800 items-center justify-center hover:bg-blue-600 transition-colors mr-3">
                <FontAwesome5 name="facebook-f" size={18} color="white" />
              </TouchableOpacity>
              <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-800 items-center justify-center hover:bg-pink-600 transition-colors mr-3">
                <FontAwesome5 name="instagram" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-800 items-center justify-center hover:bg-blue-400 transition-colors">
                <FontAwesome5 name="twitter" size={18} color="white" />
              </TouchableOpacity>
            </View>

            <Text className="text-white text-lg font-semibold mb-4">Phương thức thanh toán</Text>
            <View className="flex-row space-x-2 flex-wrap">
              <View className="bg-white rounded p-1 mb-2 mr-2 w-12 h-8 items-center justify-center">
                <Text className="text-blue-800 font-bold text-xs italic">VISA</Text>
              </View>
              <View className="bg-white rounded p-1 mb-2 mr-2 w-12 h-8 items-center justify-center flex-row">
                <View className="w-4 h-4 rounded-full bg-red-500 absolute left-1 opacity-80" />
                <View className="w-4 h-4 rounded-full bg-yellow-500 absolute right-1 opacity-80" />
              </View>
              <View className="bg-white rounded p-1 mb-2 w-12 h-8 items-center justify-center">
                <Text className="text-blue-500 font-bold text-[10px]">VN<Text className="text-red-500">PAY</Text></Text>
              </View>
            </View>
          </View>
        </View>

        {/* Copyright */}
        <View className="mt-12 pt-6 border-t border-gray-800 flex-row justify-between items-center">
          <Text className="text-gray-500 text-sm">© 2026 E-Shop. Tất cả các quyền được bảo lưu.</Text>
          <Text className="text-gray-500 text-sm">Phiên bản 1.0.0</Text>
        </View>
      </View>
    </View>
  );
}
