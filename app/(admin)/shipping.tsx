import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Modal, Switch, ScrollView } from "react-native";
import { Edit, X } from "lucide-react-native";
import { supabase } from "@/src/lib/supabase"; 

interface ShippingMethod {
  id: string;
  name: string;
  code: string;
  min_time: string;
  max_time: string;
  price: number;
  is_active: boolean;
}

export default function AdminShippingScreen() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);

  const fetchMethods = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("shipping_methods").select("*").order("created_at");
    if (!error && data) {
      setMethods(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const handleUpdate = async () => {
    if (!editingMethod) return;
    try {
      const { error } = await supabase.from("shipping_methods").update({
        price: editingMethod.price,
        min_time: editingMethod.min_time,
        max_time: editingMethod.max_time,
        is_active: editingMethod.is_active,
      }).eq("id", editingMethod.id);
      
      if (error) throw error;

      setEditingMethod(null);
      fetchMethods();
      alert("Cập nhật phương thức thành công!");
    } catch (e) {
      console.error(e);
      alert("Lỗi cập nhật!");
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 80 }} color="#3B82F6" />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F9FAFB", padding: 24 }}>
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 30, fontWeight: "bold", color: "#111827" }}>Phương thức Vận chuyển</Text>
        <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8 }}>
          Cấu hình giá mặc định và thời gian giao dự kiến (Áp dụng Fallback API)
        </Text>
      </View>

      <View style={{ backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" }}>
        <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
          <Text style={{ flex: 2, fontWeight: "bold", color: "#374151" }}>Tên / Code</Text>
          <Text style={{ flex: 1, fontWeight: "bold", color: "#374151", textAlign: "right" }}>Phí cơ bản</Text>
          <Text style={{ flex: 1, fontWeight: "bold", color: "#374151", textAlign: "center" }}>Thời Gian</Text>
          <Text style={{ width: 80, fontWeight: "bold", color: "#374151", textAlign: "center" }}>Status</Text>
          <Text style={{ width: 80, fontWeight: "bold", color: "#374151", textAlign: "center" }}>Hành động</Text>
        </View>

        {methods.map((item) => (
          <View key={item.id} style={{ flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            <View style={{ flex: 2 }}>
              <Text style={{ fontWeight: "600", fontSize: 15, color: "#111827" }}>{item.name}</Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4, textTransform: "uppercase" }}>Mã: {item.code}</Text>
            </View>
            <Text style={{ flex: 1, textAlign: "right", fontWeight: "bold", color: "#2563EB" }}>
               {Number(item.price).toLocaleString("vi-VN")}₫
            </Text>
            <Text style={{ flex: 1, textAlign: "center", color: "#4B5563" }}>
               {item.min_time} - {item.max_time} ngày
            </Text>
            <View style={{ width: 80, alignItems: "center" }}>
              <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: item.is_active ? "#D1FAE5" : "#FEE2E2" }}>
                 <Text style={{ fontSize: 12, fontWeight: "bold", color: item.is_active ? "#065F46" : "#991B1B" }}>
                   {item.is_active ? "Bật" : "Tắt"}
                 </Text>
              </View>
            </View>
            <View style={{ width: 80, alignItems: "center" }}>
              <Pressable onPress={() => setEditingMethod(item)} style={{ padding: 8, backgroundColor: "#F3F4F6", borderRadius: 8 }}>
                <Edit size={16} color="#4B5563" />
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      {/* Modal Chỉnh sửa */}
      <Modal visible={!!editingMethod} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 16 }}>
          <View style={{ backgroundColor: "white", width: "100%", maxWidth: 450, borderRadius: 16, padding: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#111827" }}>Sửa {editingMethod?.name}</Text>
              <Pressable onPress={() => setEditingMethod(null)}><X size={24} color="#6B7280" /></Pressable>
            </View>

            <View style={{ flexGap: 16 } as any}>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>Giá cố định (VNĐ)</Text>
                <TextInput
                  keyboardType="numeric"
                  style={{ borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, fontSize: 15, color: "#111827" }}
                  value={editingMethod?.price ? String(editingMethod.price) : "0"}
                  onChangeText={(val) => editingMethod && setEditingMethod({...editingMethod, price: Number(val)})}
                />
                <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>*Chỉ áp dụng nếu API cước phí lỗi</Text>
              </View>

              <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>Min (Ngày)</Text>
                  <TextInput
                    keyboardType="numeric"
                    style={{ borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, fontSize: 15, color: "#111827" }}
                    value={editingMethod?.min_time}
                    onChangeText={(val) => editingMethod && setEditingMethod({...editingMethod, min_time: val})}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>Max (Ngày)</Text>
                  <TextInput
                    keyboardType="numeric"
                    style={{ borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, fontSize: 15, color: "#111827" }}
                    value={editingMethod?.max_time}
                    onChangeText={(val) => editingMethod && setEditingMethod({...editingMethod, max_time: val})}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 16 }}>
                <Text style={{ fontWeight: "600", color: "#374151" }}>Trạng thái hoạt động</Text>
                <Switch
                  value={editingMethod?.is_active}
                  onValueChange={(val) => { if (editingMethod) setEditingMethod({...editingMethod, is_active: val}) }}
                  trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            <Pressable onPress={handleUpdate} style={{ backgroundColor: "#2563EB", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 32 }}>
              <Text style={{ color: "white", fontWeight: "bold", fontSize: 15 }}>Lưu Thay Đổi</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
