import { supabase } from "@/src/lib/supabase";
import {
  CheckCircle2,
  Edit3,
  Lock,
  Search,
  Star,
  Unlock,
  User as UserIcon,
  UserPlus,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: "admin" | "staff" | "user" | null;
  total_spending: number;
  loyalty_points: number;
  is_locked: boolean;
  lock_reason: string | null;
  locked_at: string | null;
  locked_by: string | null;
  created_at: string | null;
}

interface RoleOption {
  id: "admin" | "staff" | "user";
  name: string;
  color: string;
  text: string;
  border: string;
}

const ROLES: RoleOption[] = [
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

// ─── Format helpers ───────────────────────────────────────────────────────────

const formatVND = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminUserManagementScreen() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "admin" | "staff" | "user"
  >("all");

  // Modal states
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isLockModalVisible, setIsLockModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [editFormData, setEditFormData] = useState<Partial<UserProfile>>({});
  const [createFormData, setCreateFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "staff" as "admin" | "staff" | "user",
  });
  const [lockReason, setLockReason] = useState("");

  // Toast
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers((data as UserProfile[]) || []);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ─── Filter & Search ─────────────────────────────────────────────────────────

  const filteredUsers = users.filter((user) => {
    const matchSearch =
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === "all" || user.role === roleFilter;
    return matchSearch && matchRole;
  });

  // ─── CRUD Operations ─────────────────────────────────────────────────────────

  const handleUpdateUser = async () => {
    if (!editFormData.id) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editFormData.full_name,
          role: editFormData.role,
          loyalty_points: editFormData.loyalty_points,
        })
        .eq("id", editFormData.id);

      if (error) throw error;

      showToast("Cập nhật người dùng thành công!");
      setIsEditModalVisible(false);
      fetchUsers();
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async () => {
    if (
      !createFormData.email ||
      !createFormData.password ||
      !createFormData.full_name
    ) {
      Alert.alert("Lỗi", "Vui lòng điền đủ thông tin.");
      return;
    }

    try {
      setIsSubmitting(true);
      // TODO: Create auth user first via Supabase Admin API or use RPC
      // For now, we'll just show a message
      Alert.alert(
        "Thông báo",
        "Tính năng tạo tài khoản cần kết nối với Supabase Auth API. Sẽ được implement sau.",
      );
      setIsCreateModalVisible(false);
      setCreateFormData({
        email: "",
        password: "",
        full_name: "",
        role: "staff",
      });
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLockUser = async () => {
    if (!editFormData.id || !lockReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do khóa");
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.rpc("lock_user_account", {
        p_user_id: editFormData.id,
        p_reason: lockReason.trim(),
      });

      if (error) throw error;

      showToast("Đã khóa tài khoản!");
      setIsLockModalVisible(false);
      setLockReason("");
      fetchUsers();
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlockUser = async () => {
    if (!editFormData.id) return;

    Alert.alert("Xác nhận mở khóa", "Bạn có chắc muốn mở khóa tài khoản này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Mở khóa",
        style: "destructive",
        onPress: async () => {
          try {
            setIsSubmitting(true);
            const { error } = await supabase.rpc("unlock_user_account", {
              p_user_id: editFormData.id,
            });

            if (error) throw error;

            showToast("Đã mở khóa tài khoản!");
            fetchUsers();
          } catch (e: any) {
            Alert.alert("Lỗi", e.message);
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  const openEditModal = (user: UserProfile) => {
    setEditFormData(user);
    setIsEditModalVisible(true);
  };

  const openLockModal = (user: UserProfile) => {
    setEditFormData(user);
    if (user.is_locked) {
      // If already locked, show confirmation directly
      handleUnlockUser();
    } else {
      setIsLockModalVisible(true);
    }
  };

  // ─── Render Helpers ──────────────────────────────────────────────────────────

  const getRoleBadge = (role: string | null) => {
    const roleInfo = ROLES.find((r) => r.id === role) || ROLES[2];
    return (
      <View
        className={`px-3 py-1 rounded-full border ${roleInfo.color} ${roleInfo.border}`}
      >
        <Text className={`text-xs font-bold ${roleInfo.text}`}>
          {roleInfo.name}
        </Text>
      </View>
    );
  };

  const renderUserRow = ({ item: user }: { item: UserProfile }) => (
    <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm">
      <View className="flex-row items-start">
        {/* Avatar */}
        <View className="w-14 h-14 rounded-full bg-indigo-50 items-center justify-center mr-4 overflow-hidden">
          {user.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url }}
              className="w-full h-full"
            />
          ) : (
            <UserIcon size={28} color="#4f46e5" />
          )}
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text
              className="text-base font-bold text-gray-900 flex-1"
              numberOfLines={1}
            >
              {user.full_name || "Chưa có tên"}
            </Text>
            {user.is_locked && (
              <View className="flex-row items-center bg-red-100 px-2 py-1 rounded-full ml-2">
                <Lock size={12} color="#dc2626" />
                <Text className="text-red-600 text-xs font-semibold ml-1">
                  Đã khóa
                </Text>
              </View>
            )}
          </View>

          <Text className="text-sm text-gray-500 mb-2" numberOfLines={1}>
            {user.email || "Không có email"}
          </Text>

          <View className="flex-row items-center justify-between">
            {/* Role */}
            {getRoleBadge(user.role)}

            {/* Stats */}
            <View className="flex-row items-center gap-4">
              <View className="items-end">
                <Text className="text-xs text-gray-400">Chi tiêu</Text>
                <Text className="text-sm font-semibold text-emerald-600">
                  {formatVND(user.total_spending || 0)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-gray-400">Điểm</Text>
                <View className="flex-row items-center">
                  <Star size={12} color="#f59e0b" fill="#f59e0b" />
                  <Text className="text-sm font-semibold text-amber-600 ml-1">
                    {user.loyalty_points || 0}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Lock Reason */}
          {user.is_locked && user.lock_reason && (
            <View className="mt-2 bg-red-50 p-2 rounded-lg border border-red-100">
              <View className="flex-row items-start">
                <Lock size={14} color="#dc2626" />
                <Text className="text-red-700 text-xs ml-2 flex-1">
                  {user.lock_reason}
                </Text>
              </View>
            </View>
          )}

          <View className="flex-row items-center mt-2">
            <Text className="text-xs text-gray-400">
              Tham gia:{" "}
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString("vi-VN")
                : "N/A"}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="ml-2 flex-row gap-2">
          <TouchableOpacity
            onPress={() => openEditModal(user)}
            className="bg-blue-100 p-2 rounded-full"
          >
            <Edit3 size={18} color="#2563eb" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openLockModal(user)}
            className={`p-2 rounded-full ${user.is_locked ? "bg-emerald-100" : "bg-red-100"}`}
          >
            {user.is_locked ? (
              <Unlock size={18} color="#059669" />
            ) : (
              <Lock size={18} color="#dc2626" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-gray-400 mt-4 font-semibold">
          Đang tải dữ liệu...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">
              Quản lý Người dùng & Phân quyền
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              Tổng: {users.length} tài khoản | Đã khóa:{" "}
              {users.filter((u) => u.is_locked).length}
            </Text>
          </View>
          <TouchableOpacity
            className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center"
            onPress={() => setIsCreateModalVisible(true)}
          >
            <UserPlus size={18} color="white" />
            <Text className="text-white font-bold ml-2">Tạo tài khoản</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row gap-3 p-4">
        <View className="flex-1 bg-white rounded-xl p-4 border border-gray-100">
          <Text className="text-gray-500 text-sm mb-1">Tổng</Text>
          <Text className="text-2xl font-bold text-gray-900">
            {users.length}
          </Text>
        </View>
        <View className="flex-1 bg-red-50 rounded-xl p-4 border border-red-100">
          <Text className="text-red-600 text-sm mb-1">Đã khóa</Text>
          <Text className="text-2xl font-bold text-red-600">
            {users.filter((u) => u.is_locked).length}
          </Text>
        </View>
        <View className="flex-1 bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <Text className="text-emerald-600 text-sm mb-1">Hoạt động</Text>
          <Text className="text-2xl font-bold text-emerald-600">
            {users.filter((u) => !u.is_locked).length}
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 mx-4">
        {/* Search */}
        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3">
          <Search size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 outline-none text-gray-800"
            placeholder="Tìm theo tên hoặc email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Role Tabs */}
        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl p-1 overflow-x-auto">
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

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserRow}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      />

      {/* ─── EDIT USER MODAL ────────────────────────────────────────────────────── */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white w-full max-w-lg rounded-2xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Chỉnh sửa người dùng
              </Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Avatar */}
            <View className="items-center mb-6">
              <View className="w-20 h-20 rounded-full bg-indigo-50 items-center justify-center overflow-hidden border-4 border-indigo-100">
                {editFormData.avatar_url ? (
                  <Image
                    source={{ uri: editFormData.avatar_url }}
                    className="w-full h-full"
                  />
                ) : (
                  <UserIcon size={40} color="#4f46e5" />
                )}
              </View>
            </View>

            {/* Form */}
            <View className="space-y-4">
              {/* Full Name */}
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Họ và tên
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
                  value={editFormData.full_name || ""}
                  onChangeText={(text) =>
                    setEditFormData({ ...editFormData, full_name: text })
                  }
                  placeholder="Nhập họ tên"
                />
              </View>

              {/* Email (readonly) */}
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Email
                </Text>
                <View className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3">
                  <Text className="text-gray-500">
                    {editFormData.email || "N/A"}
                  </Text>
                </View>
              </View>

              {/* Role Selection */}
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Vai trò
                </Text>
                <View className="flex-row gap-2">
                  {ROLES.map((role) => (
                    <TouchableOpacity
                      key={role.id}
                      onPress={() =>
                        setEditFormData({ ...editFormData, role: role.id })
                      }
                      className={`flex-1 py-3 items-center border rounded-xl ${
                        editFormData.role === role.id
                          ? `${role.color} ${role.border} border-2`
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className={`font-bold ${editFormData.role === role.id ? role.text : "text-gray-500"}`}
                      >
                        {role.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Loyalty Points */}
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Điểm tích lũy (Loyalty Points)
                </Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                  <Star size={20} color="#f59e0b" fill="#f59e0b" />
                  <TextInput
                    className="flex-1 py-3 px-2 text-gray-800"
                    placeholder="0"
                    keyboardType="numeric"
                    value={String(editFormData.loyalty_points || 0)}
                    onChangeText={(text) =>
                      setEditFormData({
                        ...editFormData,
                        loyalty_points: parseInt(text) || 0,
                      })
                    }
                  />
                </View>
              </View>
            </View>

            {/* Actions */}
            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
              >
                <Text className="text-gray-700 font-semibold">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateUser}
                disabled={isSubmitting}
                className={`flex-1 py-3 rounded-xl items-center ${
                  isSubmitting ? "bg-indigo-400" : "bg-indigo-600"
                }`}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold">Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── LOCK USER MODAL ────────────────────────────────────────────────────── */}
      <Modal visible={isLockModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white w-full max-w-md rounded-2xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <Lock size={24} color="#dc2626" />
                <Text className="text-xl font-bold text-gray-900 ml-2">
                  Khóa tài khoản
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsLockModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* User Info */}
            {editFormData && (
              <View className="bg-gray-50 p-4 rounded-xl mb-4">
                <Text className="text-gray-600 text-sm mb-1">Tài khoản:</Text>
                <Text className="text-gray-900 font-semibold">
                  {editFormData.full_name || editFormData.email}
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  Email: {editFormData.email}
                </Text>
              </View>
            )}

            {/* Reason Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">
                Lý do khóa <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={lockReason}
                onChangeText={setLockReason}
                placeholder="Ví dụ: Vi phạm chính sách, gian lận..."
                multiline
                numberOfLines={3}
                className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900"
                autoFocus
              />
              <Text className="text-gray-400 text-xs mt-1">
                Lý do này sẽ hiển thị cho user khi họ đăng nhập
              </Text>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              onPress={handleLockUser}
              disabled={isSubmitting || !lockReason.trim()}
              className={`py-3 rounded-xl items-center ${
                isSubmitting || !lockReason.trim()
                  ? "bg-gray-300"
                  : "bg-red-600"
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">
                  Xác nhận khóa tài khoản
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── CREATE ACCOUNT MODAL ───────────────────────────────────────────────── */}
      <Modal visible={isCreateModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white w-full max-w-md rounded-2xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Tạo tài khoản nội bộ
              </Text>
              <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              {/* Full Name */}
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Họ và tên
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Vd: Nguyễn Văn A"
                  value={createFormData.full_name}
                  onChangeText={(text) =>
                    setCreateFormData({ ...createFormData, full_name: text })
                  }
                />
              </View>

              {/* Email */}
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Email đăng nhập
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="admin@domain.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={createFormData.email}
                  onChangeText={(text) =>
                    setCreateFormData({ ...createFormData, email: text })
                  }
                />
              </View>

              {/* Password */}
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Mật khẩu
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Phải có ít nhất 6 ký tự"
                  secureTextEntry
                  value={createFormData.password}
                  onChangeText={(text) =>
                    setCreateFormData({ ...createFormData, password: text })
                  }
                />
              </View>

              {/* Role Selection */}
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Vai trò
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() =>
                      setCreateFormData({ ...createFormData, role: "staff" })
                    }
                    className={`flex-1 py-3 items-center border rounded-xl ${
                      createFormData.role === "staff"
                        ? "bg-purple-50 border-purple-400"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={`font-bold ${
                        createFormData.role === "staff"
                          ? "text-purple-700"
                          : "text-gray-500"
                      }`}
                    >
                      Nhân viên
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      setCreateFormData({ ...createFormData, role: "admin" })
                    }
                    className={`flex-1 py-3 items-center border rounded-xl ${
                      createFormData.role === "admin"
                        ? "bg-red-50 border-red-400"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={`font-bold ${
                        createFormData.role === "admin"
                          ? "text-red-700"
                          : "text-gray-500"
                      }`}
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
              className={`mt-8 py-4 rounded-xl flex-row justify-center items-center ${
                isSubmitting ? "bg-indigo-400" : "bg-indigo-600"
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Tạo tài khoản
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── TOAST ──────────────────────────────────────────────────────────────── */}
      {toastMessage ? (
        <View className="absolute top-10 left-0 right-0 z-50 flex-row justify-center pointer-events-none">
          <View className="bg-emerald-500 rounded-full px-6 py-3 flex-row items-center shadow-lg">
            <CheckCircle2 color="white" size={20} />
            <Text className="text-white font-bold ml-2">{toastMessage}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
