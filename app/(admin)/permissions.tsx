import {
  CheckCircle2,
  Lock,
  Search,
  Shield,
  User as UserIcon,
  UserPlus,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { listProfiles, updateUserRole, createStaffAccount, toggleLockUser } from "@/src/services/admin/profiles";

const ROLES = [
  {
    id: "admin",
    name: "Quản trị viên",
    color: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
  },
  {
    id: "staff",
    name: "Nhân viên",
    color: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  {
    id: "user",
    name: "Khách hàng",
    color: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
  },
];

const formatVND = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

export default function AdminPermissionsScreen() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "staff",
  });

  // Edit State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const data = await listProfiles();
      setProfiles(data);
      console.log("Fetched profiles:", data); // Debug
    } catch (e: any) {
      if (Platform.OS === "web") alert("Lỗi: " + e.message);
      else Alert.alert("Lỗi", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      showToast("Cập nhật quyền thành công!");
      fetchProfiles();
      setEditingUserId(null);
    } catch (e: any) {
      if (Platform.OS === "web") alert("Lỗi cập nhật: " + e.message);
      else Alert.alert("Lỗi", e.message);
    }
  };

  const handleLockAccount = async (
    userId: string,
    isCurrentlyLocked: boolean,
  ) => {
    try {
      await toggleLockUser(userId, !isCurrentlyLocked);
      showToast(
        isCurrentlyLocked
          ? "Đã mở khóa tài khoản!"
          : "Đã khóa tài khoản thành công!",
      );
    } catch (e: any) {
      if (Platform.OS === "web") alert("Lỗi khóa tài khoản: " + e.message);
      else Alert.alert("Lỗi", e.message);
    }
  };

  const handleCreateAccount = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      if (Platform.OS === "web") alert("Vui lòng điền đủ thông tin.");
      else Alert.alert("Lỗi", "Vui lòng điền đủ thông tin.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createStaffAccount(formData);
      showToast("Tạo tài khoản " + formData.role + " thành công!");
      setIsModalVisible(false);
      setFormData({ email: "", password: "", full_name: "", role: "staff" });
      fetchProfiles();
    } catch (e: any) {
      if (Platform.OS === "web") alert("Lỗi tạo user: " + e.message);
      else Alert.alert("Lỗi tạo user", e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchSearch =
      p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === "all" || p.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <View className="flex-1 bg-gray-50 p-6 md:p-10">
      {/* TOAST */}
      {toastMessage ? (
        <View className="absolute top-10 mx-auto left-0 right-0 z-50 flex-row justify-center pointer-events-none">
          <View className="bg-emerald-500 rounded-full px-6 py-3 flex-row items-center shadow-lg">
            <CheckCircle2 color="white" size={20} />
            <Text className="text-white font-bold ml-2">{toastMessage}</Text>
          </View>
        </View>
      ) : null}

      {/* HEADER SECTION */}
      <View className="flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
        <View>
          <Text className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Phân quyền người dùng
          </Text>
          <Text className="text-gray-500 mt-1">
            Quản lý vai trò và quyền truy cập của nhân viên
          </Text>
        </View>

        <TouchableOpacity
          className="bg-indigo-600 flex-row flex-none items-center self-start md:self-auto px-5 py-3 rounded-xl shadow-sm"
          onPress={() => setIsModalVisible(true)}
        >
          <UserPlus size={18} color="white" />
          <Text className="text-white font-bold ml-2">Tạo tài khoản</Text>
        </TouchableOpacity>
      </View>

      {/* FILTER & SEARCH */}
      <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-col md:flex-row items-center gap-4 mb-6">
        <View className="flex-1 flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <Search size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 outline-none text-gray-800"
            placeholder="Tìm theo tên hoặc email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl p-1 shrink-0 overflow-hidden overflow-x-auto w-full md:w-auto">
          <TouchableOpacity
            onPress={() => setRoleFilter("all")}
            className={`px-4 py-2 rounded-lg ${roleFilter === "all" ? "bg-white shadow-sm" : ""}`}
          >
            <Text
              className={`font-semibold ${roleFilter === "all" ? "text-gray-900" : "text-gray-500"}`}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          {ROLES.map((role) => (
            <TouchableOpacity
              key={role.id}
              onPress={() => setRoleFilter(role.id)}
              className={`px-4 py-2 rounded-lg flex-row items-center ${roleFilter === role.id ? "bg-white shadow-sm" : ""}`}
            >
              <Text
                className={`font-semibold ${roleFilter === role.id ? role.text : "text-gray-500"}`}
              >
                {role.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* DATA TABLE */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text className="text-gray-400 mt-4 font-semibold">
            Đang tải dữ liệu...
          </Text>
        </View>
      ) : (
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1">
          {/* Table Header */}
          <View className="flex-row bg-gray-50 border-b border-gray-200 px-6 py-4">
            <Text className="flex-[2] font-semibold text-gray-500 text-sm uppercase tracking-wider">
              Người dùng
            </Text>
            <Text className="flex-[1] font-semibold text-gray-500 text-sm uppercase tracking-wider text-center">
              Vai trò
            </Text>
            <Text className="flex-[1.5] font-semibold text-gray-500 text-sm uppercase tracking-wider text-right">
              Tổng chi tiêu
            </Text>
            <Text className="flex-[1.5] font-semibold text-gray-500 text-sm uppercase tracking-wider text-right">
              Thao tác
            </Text>
          </View>

          {/* Table Body */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredProfiles.length === 0 ? (
              <View className="py-20 justify-center items-center">
                <Text className="text-gray-400 italic">
                  Không tìm thấy người dùng phù hợp.
                </Text>
              </View>
            ) : (
              filteredProfiles.map((user) => {
                const userRoleInfo =
                  ROLES.find((r) => r.id === user.role) || ROLES[2];
                const isEditing = editingUserId === user.id;

                return (
                  <View
                    key={user.id}
                    className="flex-row items-center border-b border-gray-50 px-6 py-4 hover:bg-gray-50"
                  >
                    {/* INFO COLUMN */}
                    <View className="flex-[2] flex-row items-center">
                      <View className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 items-center justify-center mr-3 overflow-hidden">
                        {user.avatar_url ? (
                          <Image
                            source={{ uri: user.avatar_url }}
                            className="w-full h-full"
                          />
                        ) : (
                          <UserIcon size={20} color="#4f46e5" />
                        )}
                      </View>
                      <View className="flex-1 pr-2">
                        <Text
                          className="font-bold text-gray-900"
                          numberOfLines={1}
                        >
                          {user.full_name || "Chưa có tên"}
                        </Text>
                        <Text
                          className="text-gray-400 text-xs mt-0.5"
                          numberOfLines={1}
                        >
                          {user.email || user.id}
                        </Text>
                      </View>
                    </View>

                    {/* ROLE COLUMN */}
                    <View className="flex-[1] items-center">
                      {isEditing ? (
                        <View className="flex-row border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <TouchableOpacity
                            onPress={() => handleUpdateRole(user.id, "user")}
                            className={`px-2 py-1 ${user.role === "user" ? "bg-blue-50" : ""}`}
                          >
                            <Text className="text-xs font-semibold text-blue-700">
                              Khách
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleUpdateRole(user.id, "staff")}
                            className={`px-2 py-1 border-l border-r border-gray-200 ${user.role === "staff" ? "bg-purple-50" : ""}`}
                          >
                            <Text className="text-xs font-semibold text-purple-700">
                              Staff
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleUpdateRole(user.id, "admin")}
                            className={`px-2 py-1 ${user.role === "admin" ? "bg-red-50" : ""}`}
                          >
                            <Text className="text-xs font-semibold text-red-700">
                              Admin
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View
                          className={`px-3 py-1 rounded-full border ${userRoleInfo.color} ${userRoleInfo.border}`}
                        >
                          <Text
                            className={`text-xs font-bold ${userRoleInfo.text}`}
                          >
                            {userRoleInfo.name}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* SPENDING COLUMN */}
                    <View className="flex-[1.5] flex-row justify-end items-center">
                      <Text className="font-semibold text-gray-800">
                        {formatVND(user.total_spending || 0)}
                      </Text>
                    </View>

                    {/* ACTIONS COLUMN */}
                    <View className="flex-[1.5] flex-row justify-end items-center gap-2">
                      <TouchableOpacity
                        onPress={() =>
                          setEditingUserId(isEditing ? null : user.id)
                        }
                        className={`p-2 rounded-lg border ${isEditing ? "bg-indigo-50 border-indigo-200" : "bg-white border-gray-200"} hover:bg-gray-50`}
                      >
                        <Shield
                          size={16}
                          color={isEditing ? "#4f46e5" : "#6b7280"}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleLockAccount(user.id, false)}
                        className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-red-50"
                      >
                        <Lock size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* CREATE ACCOUNT MODAL */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-extrabold text-gray-900">
                Tạo tài khoản nội bộ
              </Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                className="p-2 bg-gray-100 rounded-full"
              >
                <X size={18} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Họ và tên
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Vd: Nguyễn Văn A"
                  value={formData.full_name}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, full_name: text }))
                  }
                />
              </View>

              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Email đăng nhập
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="admin@domain.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={formData.email}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, email: text }))
                  }
                />
              </View>

              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Mật khẩu
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Phải có ít nhất 6 ký tự"
                  secureTextEntry
                  value={formData.password}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, password: text }))
                  }
                />
              </View>

              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Vai trò (Role)
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, role: "staff" }))
                    }
                    className={`flex-1 py-3 items-center border rounded-xl ${formData.role === "staff" ? "bg-purple-50 border-purple-400" : "bg-white border-gray-200"}`}
                  >
                    <Text
                      className={`font-bold ${formData.role === "staff" ? "text-purple-700" : "text-gray-500"}`}
                    >
                      Nhân viên
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, role: "admin" }))
                    }
                    className={`flex-1 py-3 items-center border rounded-xl ${formData.role === "admin" ? "bg-red-50 border-red-400" : "bg-white border-gray-200"}`}
                  >
                    <Text
                      className={`font-bold ${formData.role === "admin" ? "text-red-700" : "text-gray-500"}`}
                    >
                      Quản trị
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCreateAccount}
              disabled={isSubmitting}
              className={`mt-8 py-4 rounded-xl flex-row justify-center items-center ${isSubmitting ? "bg-indigo-400" : "bg-indigo-600"}`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Khởi tạo tài khoản
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
