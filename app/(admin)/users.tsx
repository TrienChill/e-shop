import { supabase } from "@/src/lib/supabase";
import {
  CreditCard,
  Mail,
  Shield,
  User as UserIcon,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function AdminUsersScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Chưa đăng nhập");
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      console.log("Current user profile:", data); // Debug
    } catch (e: any) {
      console.error("Error fetching profile:", e);
      Alert.alert("Lỗi", e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-gray-400 mt-4 font-semibold">
          Đang tải thông tin...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
          <View className="flex-row items-center mb-6">
            <View className="w-24 h-24 rounded-full bg-indigo-50 border-4 border-indigo-100 items-center justify-center mr-6 overflow-hidden">
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  className="w-full h-full"
                />
              ) : (
                <UserIcon size={48} color="#4f46e5" />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                {profile?.full_name || "Chưa có tên"}
              </Text>
              <Text className="text-gray-500 flex-row items-center">
                <Mail size={14} color="#9ca3af" className="mr-1" />
                {profile?.email || "Chưa có email"}
              </Text>
            </View>
          </View>

          <View className="border-t border-gray-100 pt-6">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Thông tin tài khoản
            </Text>

            <View className="space-y-5">
              {/* Role */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Shield size={20} color="#6b7280" />
                  <Text className="ml-3 text-gray-600 font-medium">
                    Vai trò
                  </Text>
                </View>
                <View className="px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100">
                  <Text className="text-sm font-bold text-indigo-700 capitalize">
                    {profile?.role === "admin"
                      ? "Quản trị viên"
                      : profile?.role === "staff"
                        ? "Nhân viên"
                        : "Khách hàng"}
                  </Text>
                </View>
              </View>

              {/* Total Spending */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <CreditCard size={20} color="#6b7280" />
                  <Text className="ml-3 text-gray-600 font-medium">
                    Tổng chi tiêu
                  </Text>
                </View>
                <Text className="text-lg font-bold text-emerald-600">
                  {formatVND(profile?.total_spending || 0)}
                </Text>
              </View>

              {/* User ID */}
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-600 font-medium">Mã người dùng</Text>
                <Text className="text-gray-900 font-mono text-sm">
                  {profile?.id?.substring(0, 8)}...
                </Text>
              </View>

              {/* Created At */}
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-600 font-medium">Ngày tạo</Text>
                <Text className="text-gray-900">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString("vi-VN")
                    : "N/A"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View className="flex-row gap-4 mb-6">
          <View className="flex-1 bg-white rounded-xl p-4 border border-gray-100">
            <Text className="text-gray-500 text-sm mb-1">Vai trò</Text>
            <Text className="text-xl font-bold text-gray-900 capitalize">
              {profile?.role || "N/A"}
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 border border-gray-100">
            <Text className="text-gray-500 text-sm mb-1">Trạng thái</Text>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
              <Text className="text-xl font-bold text-emerald-600">
                Hoạt động
              </Text>
            </View>
          </View>
        </View>

        {/* Info Box */}
        <View className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <Text className="text-sm text-blue-800">
            <Text className="font-bold">Lưu ý:</Text> Đây là thông tin cá nhân
            của tài khoản hiện tại. Bạn chỉ có thể xem thông tin của chính mình.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
