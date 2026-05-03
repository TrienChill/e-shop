import { supabase } from "@/src/lib/supabase";
import {
  MembershipLevel,
  MembershipLevelWithStats,
  formatVND,
  formatPercentage,
  TIER_COLORS,
} from "@/src/types/membership";
import {
  Award,
  Edit2,
  Plus,
  Search,
  Trash2,
  Users,
  TrendingUp,
  ChevronRight,
  X,
  Phone,
} from "lucide-react-native";
import { AdminDataWrapper } from "@/src/components/admin/AdminDataWrapper";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

interface LevelMember {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  total_spending: number;
}

interface LevelStats {
  level_id: string;
  level_name: string;
  member_count: number;
  total_spending_sum: number;
}

// Helper format tiền
const formatInputVND = (value: string): string => {
  const num = value.replace(/[^\d]/g, "");
  return num ? parseInt(num, 10).toLocaleString("vi-VN") : "";
};

// Helper parse VND input về number
const parseVND = (value: string): number => {
  return parseInt(value.replace(/[^\d]/g, ""), 10) || 0;
};

export default function AdminMembershipScreen() {
  const router = useRouter();
  const [levels, setLevels] = useState<MembershipLevelWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingLevel, setEditingLevel] = useState<MembershipLevel | null>(null);

  // Members modal state
  const [isMembersModalVisible, setIsMembersModalVisible] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<MembershipLevelWithStats | null>(null);
  const [members, setMembers] = useState<LevelMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersSearchQuery, setMembersSearchQuery] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    level_name: "",
    min_spending: "",
    benefit_percentage: "",
    description: "",
  });

  // Toast state
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Fetch membership levels with stats
  const fetchLevels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all levels
      const { data: levelsData, error: levelsError } = await supabase
        .from("membership_levels")
        .select("*")
        .order("min_spending", { ascending: true });

      if (levelsError) throw levelsError;

      // Fetch stats for each level
      const { data: statsData, error: statsError } = await supabase.rpc(
        "get_membership_stats"
      );

      const statsMap = new Map<string, LevelStats>();
      if (!statsError && statsData) {
        (statsData as LevelStats[]).forEach((stat) => {
          statsMap.set(stat.level_id, stat);
        });
      }

      // Combine levels with stats
      const levelsWithStats: MembershipLevelWithStats[] = (levelsData || []).map(
        (level) => ({
          ...level,
          member_count: statsMap.get(level.id)?.member_count || 0,
        })
      );

      setLevels(levelsWithStats);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  // Fetch members for a specific level
  const fetchMembers = useCallback(async (levelId: string) => {
    try {
      setLoadingMembers(true);

      // Query profiles for this level (email is in auth.users, not profiles)
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url, total_spending, membership_level_id")
        .eq("membership_level_id", levelId)
        .order("total_spending", { ascending: false });

      if (fetchError) throw fetchError;
      setMembers(data || []);
    } catch (e: any) {
      Alert.alert("Lỗi", e.message);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  // Open members modal
  const openMembersModal = (level: MembershipLevelWithStats) => {
    setSelectedLevel(level);
    setMembersSearchQuery("");
    setIsMembersModalVisible(true);
    fetchMembers(level.id);
  };

  // Navigate to user detail
  const navigateToUser = (userId: string) => {
    setIsMembersModalVisible(false);
    router.push(`/(admin)/users?highlight=${userId}`);
  };

  // Open modal for create/edit
  const openModal = (level?: MembershipLevel) => {
    if (level) {
      setEditingLevel(level);
      setFormData({
        level_name: level.level_name,
        min_spending: level.min_spending.toLocaleString("vi-VN"),
        benefit_percentage: level.benefit_percentage.toString(),
        description: level.description || "",
      });
    } else {
      setEditingLevel(null);
      setFormData({
        level_name: "",
        min_spending: "",
        benefit_percentage: "",
        description: "",
      });
    }
    setIsModalVisible(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.level_name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên hạng thành viên.");
      return false;
    }

    const minSpending = parseVND(formData.min_spending);
    const benefit = parseInt(formData.benefit_percentage, 10);

    if (minSpending < 0) {
      Alert.alert("Lỗi", "Số tiền tối thiểu không được âm.");
      return false;
    }

    if (isNaN(benefit) || benefit < 0 || benefit > 100) {
      Alert.alert("Lỗi", "Phần trăm giảm giá phải từ 0 đến 100.");
      return false;
    }

    // Check min_spending order - CHỈ kiểm tra khi TẠO MỚI
    // Hạng mới phải có min_spending LỚN HƠN tất cả các hạng hiện có
    if (!editingLevel) {
      const existingLevels = levels;
      for (const level of existingLevels) {
        if (level.min_spending >= minSpending) {
          Alert.alert(
            "Lỗi",
            `Số tiền tối thiểu phải lớn hơn hạng "${level.level_name}" (${formatVND(level.min_spending)}).`
          );
          return false;
        }
      }
    }

    return true;
  };

  // Save level
  const handleSave = async () => {
    console.log("=== handleSave START ===");
    console.log("editingLevel:", editingLevel);
    console.log("formData:", formData);

    if (!validateForm()) {
      console.log("validateForm failed");
      return;
    }
    console.log("validateForm passed");

    try {
      const payload: any = {
        level_name: formData.level_name.trim(),
        min_spending: parseVND(formData.min_spending),
        benefit_percentage: parseInt(formData.benefit_percentage, 10),
        description: formData.description.trim() || null,
      };

      console.log("payload:", payload);

      if (editingLevel) {
        console.log("=== UPDATE MODE ===");
        const { error, data } = await supabase
          .from("membership_levels")
          .update(payload)
          .eq("id", editingLevel.id)
          .select()
          .single();

        console.log("Update result:", { error, data });

        if (error) {
          console.log("Update error:", error);
          throw error;
        }

        // Recalculate all memberships (bắt lỗi riêng vì function có thể chưa được tạo)
        try {
          await supabase.rpc("recalculate_all_membership_levels");
        } catch (rpcError) {
          console.log("RPC recalculate_all_membership_levels chưa được tạo:", rpcError);
        }
        showToast("Đã cập nhật hạng thành viên!");
      } else {
        console.log("=== INSERT MODE ===");
        const { error, data } = await supabase
          .from("membership_levels")
          .insert(payload)
          .select()
          .single();

        console.log("Insert result:", { error, data });

        if (error) {
          console.log("Insert error:", error);
          throw error;
        }
        showToast("Đã tạo hạng thành viên mới!");
      }

      console.log("Closing modal...");
      setIsModalVisible(false);
      fetchLevels();
      console.log("=== handleSave END ===");
    } catch (e: any) {
      console.log("=== CATCH ERROR ===");
      console.log("Error object:", e);
      console.log("Error message:", e.message);
      Alert.alert("Lỗi", e.message);
    }
  };

  // Delete level
  const handleDelete = (level: MembershipLevelWithStats) => {
    if (level.member_count > 0) {
      Alert.alert(
        "Không thể xóa",
        `Hạng "${level.level_name}" đang có ${level.member_count} thành viên. Vui lòng chuyển họ sang hạng khác trước.`
      );
      return;
    }

    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc muốn xóa hạng "${level.level_name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("membership_levels")
                .delete()
                .eq("id", level.id);

              if (error) throw error;
              showToast("Đã xóa hạng thành viên!");
              fetchLevels();
            } catch (e: any) {
              Alert.alert("Lỗi", e.message);
            }
          },
        },
      ]
    );
  };

  // Render level card
  const renderLevelCard = ({ item }: { item: MembershipLevelWithStats }) => {
    const tierStyle = TIER_COLORS[item.level_name] || TIER_COLORS["Đồng"];
    const isHighest = item.id === levels[levels.length - 1]?.id;

    return (
      <AdminDataWrapper
        className={`bg-white rounded-2xl p-5 mb-4 border-2 ${tierStyle.border} shadow-sm flex-col items-stretch`}
      >
        {/* Header */}
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-row items-center">
            <View
              className={`w-12 h-12 rounded-full ${tierStyle.bg} items-center justify-center mr-3`}
            >
              <Text className="text-2xl">{tierStyle.icon}</Text>
            </View>
            <View>
              <Text className={`text-lg font-bold ${tierStyle.text}`}>
                {item.level_name}
              </Text>
              <Text className="text-gray-500 text-sm">
                {item.min_spending === 0
                  ? "Hạng mặc định"
                  : `Từ ${formatVND(item.min_spending)}`}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => openModal(item)}
              className="p-2 bg-blue-50 rounded-lg"
            >
              <Edit2 size={18} color="#3b82f6" />
            </TouchableOpacity>
            {!isHighest && (
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                className="p-2 bg-red-50 rounded-lg"
              >
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1 bg-gray-50 rounded-xl p-3">
            <View className="flex-row items-center mb-1">
              <TrendingUp size={14} color="#6b7280" />
              <Text className="text-gray-500 text-xs ml-1">Ưu đãi</Text>
            </View>
            <Text className="text-xl font-bold text-emerald-600">
              {formatPercentage(item.benefit_percentage)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => openMembersModal(item)}
            className="flex-1 bg-gray-50 rounded-xl p-3"
          >
            <View className="flex-row items-center mb-1">
              <Users size={14} color="#6b7280" />
              <Text className="text-gray-500 text-xs ml-1">Thành viên</Text>
              <ChevronRight size={12} color="#6b7280" className="ml-auto" />
            </View>
            <Text className="text-xl font-bold text-gray-900">
              {item.member_count.toLocaleString("vi-VN")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        {item.description && (
          <Text className="text-gray-600 text-sm">{item.description}</Text>
        )}

        {/* Badge */}
        {isHighest && (
          <View className="absolute top-4 right-4">
            <View className="bg-amber-100 px-2 py-1 rounded-full">
              <Text className="text-amber-700 text-xs font-semibold">
                Cao nhất
              </Text>
            </View>
          </View>
        )}
      </AdminDataWrapper>
    );
  };

  // Filtered levels
  const filteredLevels = levels.filter((level) =>
    level.level_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtered members
  const filteredMembers = members.filter((member) => {
    const query = membersSearchQuery.toLowerCase();
    return (
      member.full_name?.toLowerCase().includes(query) ||
      member.phone?.includes(query)
    );
  });

  // Total stats
  const totalMembers = levels.reduce((sum, l) => sum + l.member_count, 0);

  return (
    <View className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-2">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-900">
            Hạng thành viên
          </Text>
          <TouchableOpacity
            onPress={() => openModal()}
            className="bg-indigo-600 px-4 py-2 rounded-xl flex-row items-center"
          >
            <Plus size={18} color="white" />
            <Text className="text-white font-semibold ml-1">Thêm hạng</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 mb-4">
          <Search size={20} color="#9ca3af" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm kiếm hạng..."
            className="flex-1 py-3 px-2 text-gray-900"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Summary Stats */}
      <View className="px-4 py-3">
        <View className="bg-indigo-600 rounded-2xl p-4 flex-row items-center">
          <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
            <Award size={24} color="white" />
          </View>
          <View className="ml-3">
            <Text className="text-white/80 text-sm">Tổng thành viên</Text>
            <Text className="text-white text-2xl font-bold">
              {totalMembers.toLocaleString("vi-VN")}
            </Text>
          </View>
          <View className="ml-auto">
            <Text className="text-white/80 text-sm">{levels.length} hạng</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text className="text-gray-500 mt-2">Đang tải...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-red-500 text-center">{error}</Text>
          <TouchableOpacity
            onPress={fetchLevels}
            className="mt-4 bg-indigo-600 px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-semibold">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredLevels}
          renderItem={renderLevelCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center py-10">
              <Award size={48} color="#d1d5db" />
              <Text className="text-gray-400 mt-2">Chưa có hạng thành viên</Text>
            </View>
          }
        />
      )}

      {/* CREATE/EDIT MODAL */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[90%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-900">
                {editingLevel ? "Sửa hạng" : "Thêm hạng mới"}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text className="text-gray-500 text-lg">Đóng</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Level Name */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">
                  Tên hạng <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={formData.level_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, level_name: text })
                  }
                  placeholder="Ví dụ: Đồng, Bạc, Vàng"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                />
              </View>

              {/* Min Spending */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">
                  Chi tiêu tối thiểu (VNĐ) <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={formData.min_spending}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      min_spending: formatInputVND(text),
                    })
                  }
                  placeholder="0"
                  keyboardType="numeric"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                />
                <Text className="text-gray-400 text-xs mt-1">
                  Số tiền tối thiểu khách phải chi để đạt hạng này
                </Text>
              </View>

              {/* Benefit Percentage */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">
                  % Giảm giá mặc định <Text className="text-red-500">*</Text>
                </Text>
                <View className="flex-row items-center">
                  <TextInput
                    value={formData.benefit_percentage}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        benefit_percentage: text.replace(/[^\d]/g, ""),
                      })
                    }
                    placeholder="0"
                    keyboardType="numeric"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  />
                  <Text className="ml-2 text-gray-700 font-semibold">%</Text>
                </View>
                <Text className="text-gray-400 text-xs mt-1">
                  Phần trăm giảm giá mặc định khi áp dụng hạng này
                </Text>
              </View>

              {/* Description */}
              <View className="mb-6">
                <Text className="text-gray-700 font-semibold mb-2">
                  Mô tả
                </Text>
                <TextInput
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholder="Mô tả thêm về hạng thành viên..."
                  multiline
                  numberOfLines={3}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                className="bg-indigo-600 py-4 rounded-xl items-center mb-4"
              >
                <Text className="text-white font-bold text-base">
                  {editingLevel ? "Cập nhật" : "Tạo mới"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MEMBERS LIST MODAL */}
      <Modal
        visible={isMembersModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMembersModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                {selectedLevel && (
                  <View
                    className={`w-10 h-10 rounded-full ${TIER_COLORS[selectedLevel.level_name]?.bg || "bg-gray-100"} items-center justify-center mr-3`}
                  >
                    <Text className="text-xl">
                      {TIER_COLORS[selectedLevel.level_name]?.icon || "👤"}
                    </Text>
                  </View>
                )}
                <View>
                  <Text className="text-xl font-bold text-gray-900">
                    Thành viên hạng {selectedLevel?.level_name}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {members.length} thành viên
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsMembersModalVisible(false)}
                className="p-2"
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View className="flex-row items-center bg-gray-100 rounded-xl px-3 mb-4">
              <Search size={20} color="#9ca3af" />
              <TextInput
                value={membersSearchQuery}
                onChangeText={setMembersSearchQuery}
                placeholder="Tìm kiếm thành viên..."
                className="flex-1 py-3 px-2 text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Members List */}
            {loadingMembers ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text className="text-gray-500 mt-2">Đang tải...</Text>
              </View>
            ) : filteredMembers.length === 0 ? (
              <View className="items-center py-10">
                <Users size={48} color="#d1d5db" />
                <Text className="text-gray-400 mt-2">
                  {membersSearchQuery
                    ? "Không tìm thấy thành viên"
                    : "Chưa có thành viên nào"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredMembers}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 400 }}
                renderItem={({ item }) => (
                  <AdminDataWrapper
                    onPress={() => navigateToUser(item.id)}
                    className="flex-row items-center p-3 bg-gray-50 rounded-xl mb-2"
                  >
                    {/* Avatar */}
                    {item.avatar_url ? (
                      <Image
                        source={{ uri: item.avatar_url }}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <View className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center">
                        <Text className="text-indigo-600 font-bold text-lg">
                          {item.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </Text>
                      </View>
                    )}

                    {/* Info */}
                    <View className="flex-1 ml-3">
                      <Text className="text-gray-900 font-semibold">
                        {item.full_name || "Chưa có tên"}
                      </Text>
                      {item.phone && (
                        <View className="flex-row items-center mt-1">
                          <Phone size={12} color="#9ca3af" />
                          <Text className="text-gray-400 text-xs ml-1">
                            {item.phone}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Spending */}
                    <View className="items-end">
                      <Text className="text-emerald-600 font-semibold">
                        {formatVND(item.total_spending || 0)}
                      </Text>
                      <Text className="text-gray-400 text-xs">Tổng chi tiêu</Text>
                    </View>
                  </AdminDataWrapper>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Toast */}
      {toastMessage ? (
        <View className="absolute bottom-10 left-4 right-4 z-50">
          <View
            className={`rounded-xl px-4 py-3 flex-row items-center ${
              toastType === "success" ? "bg-emerald-500" : "bg-red-500"
            }`}
          >
            <Text className="text-white font-semibold flex-1">
              {toastMessage}
            </Text>
            <TouchableOpacity onPress={() => setToastMessage("")}>
              <Text className="text-white/80 text-sm">Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}
