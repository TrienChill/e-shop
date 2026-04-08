import { deleteProduct, listAdminProducts } from "@/src/services/admin/products";
import { Edit3, Package, Plus, Search, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function AdminProductsList() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await listAdminProducts();
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;
    try {
      await deleteProduct(id);
      fetchProducts();
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (Platform.OS !== "web") {
    return <View style={styles.p10}><Text>Vui lòng dùng trình duyệt Web.</Text></View>;
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Quản lý Sản phẩm</Text>
          <Text style={styles.subtitle}>
            Chỉnh sửa thông tin, giá bán và quản lý tồn kho cho từng biến thể.
          </Text>
        </View>

        <View style={styles.rightHeader}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Tìm theo tên sản phẩm..."
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <Pressable 
            style={({ hovered }: any) => [
              styles.addButton,
              hovered && styles.addButtonHover
            ]}
            onPress={() => alert("Chức năng thêm sản phẩm đang hoàn thiện")}
          >
            <Plus size={20} color="white" />
            <Text style={styles.addButtonText}>Thêm mới</Text>
          </Pressable>
        </View>
      </View>

      {/* TABLE */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <View style={styles.tableCard}>
          {/* TABLE HEADER */}
          <View style={styles.tableHeader}>
            <Text style={StyleSheet.flatten([styles.columnProduct, styles.headerText])}>Sản phẩm</Text>
            <Text style={StyleSheet.flatten([styles.columnCategory, styles.headerText])}>Phân loại</Text>
            <Text style={StyleSheet.flatten([styles.columnPrice, styles.headerText, styles.textRight])}>Giá bán</Text>
            <Text style={StyleSheet.flatten([styles.columnStock, styles.headerText, styles.textCenter])}>Kho</Text>
            <Text style={StyleSheet.flatten([styles.columnStatus, styles.headerText, styles.textCenter])}>Trạng thái</Text>
            <Text style={StyleSheet.flatten([styles.columnActions, styles.headerText, styles.textRight])}>Thao tác</Text>
          </View>

          {/* TABLE BODY */}
          <View>
            {filteredProducts.map((product) => {
              const variants = product.product_variants || [];
              const totalStock = variants.reduce((s: number, v: any) => s + (v.stock || 0), 0);
              const prices = variants.map((v: any) => v.price).filter(Boolean);
              const minPrice = prices.length ? Math.min(...prices) : product.price;
              const maxPrice = prices.length ? Math.max(...prices) : product.price;

              return (
                <View key={product.id} style={styles.row}>
                  <View style={StyleSheet.flatten([styles.columnProduct, styles.rowItem])}>
                    <Image
                      source={{ uri: product.images?.[0] || 'https://via.placeholder.com/100' }}
                      style={styles.productImage}
                    />
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={styles.productId}>ID: {product.id}</Text>
                    </View>
                  </View>

                  <View style={styles.columnCategory}>
                    <View style={styles.variantBadge}>
                      <Text style={styles.variantBadgeText}>
                        {variants.length} biến thể
                      </Text>
                    </View>
                  </View>

                  <View style={styles.columnPrice}>
                    <Text style={styles.priceText}>
                      {minPrice === maxPrice 
                        ? `${minPrice?.toLocaleString()}₫`
                        : `${minPrice?.toLocaleString()} - ${maxPrice?.toLocaleString()}₫`}
                    </Text>
                  </View>

                  <View style={StyleSheet.flatten([styles.columnStock, styles.itemsCenter])}>
                    <Text style={StyleSheet.flatten([
                      styles.stockText,
                      totalStock < 10 && styles.lowStock
                    ])}>
                      {totalStock}
                    </Text>
                  </View>

                  <View style={StyleSheet.flatten([styles.columnStatus, styles.itemsCenter])}>
                    <View style={StyleSheet.flatten([
                      styles.statusBadge,
                      product.is_active ? styles.statusActive : styles.statusInactive
                    ])}>
                      <Text style={StyleSheet.flatten([
                        styles.statusText,
                        product.is_active ? styles.statusTextActive : styles.statusTextInactive
                      ])}>
                        {product.is_active ? 'ĐANG BÁN' : 'ẨN'}
                      </Text>
                    </View>
                  </View>

                  <View style={StyleSheet.flatten([styles.columnActions, styles.actionsContainer])}>
                    <Pressable style={({ hovered }: any) => StyleSheet.flatten([styles.iconButton, hovered && styles.editButtonHover])}>
                      <Edit3 size={18} color="#2563EB" />
                    </Pressable>
                    <Pressable 
                      style={({ hovered }: any) => StyleSheet.flatten([styles.iconButton, hovered && styles.deleteButtonHover])}
                      onPress={() => handleDelete(product.id)}
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 40 },
  p10: { padding: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "between" as any,
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  rightHeader: {
    flexDirection: "row",
    gap: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    height: 48,
    width: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    outlineStyle: "none" as any,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    borderRadius: 12,
    height: 48,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonHover: {
    backgroundColor: "#1D4ED8",
  },
  addButtonText: {
    color: "white",
    fontWeight: "700",
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  tableCard: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerText: {
    fontWeight: "700",
    color: "#4B5563",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  columnProduct: { flex: 3 },
  columnCategory: { flex: 1 },
  columnPrice: { flex: 1 },
  columnStock: { flex: 1 },
  columnStatus: { flex: 1 },
  columnActions: { flex: 1 },
  textRight: { textAlign: "right" },
  textCenter: { textAlign: "center" },
  itemsCenter: { alignItems: "center" },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  productInfo: {
    marginLeft: 16,
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  productId: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  variantBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  variantBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "uppercase",
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textAlign: "right",
  },
  stockText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  lowStock: {
    color: "#EF4444",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusActive: {
    backgroundColor: "#DCFCE7",
  },
  statusInactive: {
    backgroundColor: "#F3F4F6",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statusTextActive: {
    color: "#15803D",
  },
  statusTextInactive: {
    color: "#6B7280",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonHover: {
    backgroundColor: "#EFF6FF",
  },
  deleteButtonHover: {
    backgroundColor: "#FEF2F2",
  }
});
