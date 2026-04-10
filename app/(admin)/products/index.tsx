import { supabase } from "@/src/lib/supabase";
import { router } from "expo-router";
import { Edit, Eye, EyeOff, Plus, Search, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
        product_variants ( stock ),
        product_images ( url, is_thumbnail )
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const deleteProductPermanently = async (id: number) => {
    const confirmDelete = () => {
      Alert.alert(
        "Xoá vĩnh viễn",
        "Bạn có chắc muốn XOÁ HOÀN TOÀN sản phẩm này? Thao tác này sẽ xoá toàn bộ biến thể và hình ảnh liên quan.",
        [
          { text: "Huỷ", style: "cancel" },
          {
            text: "Xác nhận Xoá",
            style: "destructive",
            onPress: async () => {
              const { error } = await supabase.from("products").delete().eq("id", id);
              if (!error) {
                fetchProducts();
              } else {
                Alert.alert("Lỗi", "Không thể xoá sản phẩm: " + error.message);
              }
            }
          }
        ]
      );
    };

    if (Platform.OS === 'web') {
      if (window.confirm("BẠN CÓ CHẮC MUỐN XOÁ VĨNH VIỄN SẢN PHẨM NÀY?")) {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (!error) fetchProducts();
        else alert("Lỗi: " + error.message);
      }
    } else {
      confirmDelete();
    }
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

            // Lấy ảnh bìa
            const thumbnail = item.product_images?.find((img: any) => img.is_thumbnail)?.url
              || item.product_images?.[0]?.url
              || "https://via.placeholder.com/150";

            return (
              <View style={styles.row}>
                <Image source={{ uri: thumbnail }} style={styles.productImg} />

                <View style={styles.infoCol}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productMeta}>
                    {item.price.toLocaleString("vi-VN")}đ | Kho: {totalStock}
                  </Text>
                  <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
                    <Text style={[styles.statusText, item.is_active ? styles.statusActiveText : styles.statusInactiveText]}>
                      {item.is_active ? "Đang bán" : "Ngưng bán"}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionCol}>
                  <Pressable
                    onPress={() => toggleActiveStatus(item.id, item.is_active)}
                    style={[styles.iconBtn, { backgroundColor: item.is_active ? "#EFF6FF" : "#F3F4F6" }]}
                  >
                    {item.is_active ? <Eye size={18} color="#2563EB" /> : <EyeOff size={18} color="#9CA3AF" />}
                  </Pressable>

                  <Pressable onPress={() => router.push(`/(admin)/products/${item.id}` as any)} style={styles.iconBtn}>
                    <Edit size={18} color="#4B5563" />
                  </Pressable>

                  <Pressable onPress={() => deleteProductPermanently(item.id)} style={[styles.iconBtn, { backgroundColor: "#FDE8E8" }]}>
                    <Trash2 size={18} color="#EF4444" />
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
  row: { flexDirection: "row", backgroundColor: "white", padding: 12, borderRadius: 12, marginBottom: 12, alignItems: "center", gap: 12 },
  productImg: { width: 60, height: 60, borderRadius: 8, backgroundColor: "#F3F4F6" },
  infoCol: { flex: 1 },
  productName: { fontSize: 16, fontWeight: "bold", color: "#111827", marginBottom: 2 },
  productMeta: { color: "#6B7280", fontSize: 13, marginBottom: 6 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusActive: { backgroundColor: "#DEF7EC" },
  statusInactive: { backgroundColor: "#FDE8E8" },
  statusText: { fontSize: 11, fontWeight: "700" },
  statusActiveText: { color: "#03543F" },
  statusInactiveText: { color: "#9B1C1C" },
  actionCol: { flexDirection: "row", gap: 8 },
  iconBtn: { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 8, justifyContent: "center", alignItems: "center" },
});