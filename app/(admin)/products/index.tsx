import { supabase } from "@/src/lib/supabase";
import { router } from "expo-router";
import { Edit, Plus, Search, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

export default function AdminProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    // Lấy sản phẩm kèm theo tổng tồn kho từ bảng variants
    const { data, error } = await supabase
      .from("products")
      .select(`
        id, name, price, is_active,
        product_variants ( stock )
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Xử lý Ẩn/Hiện sản phẩm (Soft Delete)
  const toggleActiveStatus = async (id: number, currentStatus: boolean) => {
    const confirmMessage = currentStatus
      ? "Bạn có chắc muốn NGƯNG BÁN sản phẩm này?"
      : "Bạn có muốn MỞ BÁN LẠI sản phẩm này?";

    // alert trên web, Alert trên mobile
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) return;
    }

    const { error } = await supabase
      .from("products")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (!error) {
      fetchProducts(); // Reload lại danh sách
    } else {
      alert("Lỗi khi cập nhật trạng thái!");
    }
  };

  const filteredProducts = products.filter((p) =>
    String(p.name).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header & Thanh tìm kiếm */}
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý Sản phẩm</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push("/(admin)/products/new")}>
          <Plus color="white" size={20} />
          <Text style={styles.addBtnText}>Thêm Sản phẩm</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Search color="#9CA3AF" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm tên sản phẩm..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Danh sách */}
      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => {
            // Tính tổng tồn kho của tất cả các biến thể (size/màu)
            const totalStock = item.product_variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;

            return (
              <View style={styles.row}>
                <View style={styles.infoCol}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productMeta}>
                    Giá: {item.price.toLocaleString("vi-VN")}đ | Tồn kho: {totalStock}
                  </Text>
                  <Text style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
                    {item.is_active ? "Đang bán" : "Ngưng bán"}
                  </Text>
                </View>

                <View style={styles.actionCol}>
                  <Pressable onPress={() => router.push(`/(admin)/products/${item.id}` as any)} style={styles.iconBtn}>
                    <Edit size={20} color="#4B5563" />
                  </Pressable>
                  <Pressable onPress={() => toggleActiveStatus(item.id, item.is_active)} style={styles.iconBtn}>
                    <Trash2 size={20} color={item.is_active ? "#EF4444" : "#10B981"} />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6", padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  addBtn: { flexDirection: "row", backgroundColor: "#2563EB", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8, alignItems: "center" },
  addBtnText: { color: "white", fontWeight: "600" },
  searchBox: { flexDirection: "row", backgroundColor: "white", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, alignItems: "center", gap: 10, marginBottom: 20 },
  searchInput: { flex: 1, outlineStyle: 'none' } as any,
  row: { flexDirection: "row", backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 12, alignItems: "center", justifyContent: "space-between" },
  infoCol: { flex: 1 },
  productName: { fontSize: 16, fontWeight: "bold", color: "#111827", marginBottom: 4 },
  productMeta: { color: "#6B7280", fontSize: 14, marginBottom: 8 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: "600" },
  statusActive: { backgroundColor: "#DEF7EC", color: "#03543F" },
  statusInactive: { backgroundColor: "#FDE8E8", color: "#9B1C1C" },
  actionCol: { flexDirection: "row", gap: 12 },
  iconBtn: { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 8 },
});