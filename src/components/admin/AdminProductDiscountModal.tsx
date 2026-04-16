import { ProductDiscountRow } from "@/src/services/admin/vouchers";
import { X, Search, Check } from "lucide-react-native";
import React, { useEffect, useState, useRef } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Image, ActivityIndicator } from "react-native";
import { supabase } from "@/src/lib/supabase";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Partial<ProductDiscountRow>) => void;
  initialData?: ProductDiscountRow | null;
}

export default function AdminProductDiscountModal({ visible, onClose, onSave, initialData }: Props) {
  const [productId, setProductId] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Product Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialData) {
      setProductId(initialData.product_id?.toString() || "");
      setSelectedProduct(initialData.products ? { 
        id: initialData.product_id, 
        name: initialData.products.name, 
        image: initialData.products.images && initialData.products.images[0] 
      } : { id: initialData.product_id, name: `ID: ${initialData.product_id}` });
      setDiscountType((initialData.discount_type as any) || "percentage");
      setDiscountValue(initialData.discount_value?.toString() || "");
      setStartDate(initialData.start_date ? new Date(initialData.start_date).toISOString().split("T")[0] : "");
      setEndDate(initialData.end_date ? new Date(initialData.end_date).toISOString().split("T")[0] : "");
    } else {
      setProductId("");
      setSelectedProduct(null);
      setSearchQuery("");
      setSearchResults([]);
      setDiscountType("percentage");
      setDiscountValue("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
    }
  }, [initialData, visible]);

  // Handle Search Debounce
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, images')
        .ilike('name', `%${text}%`)
        .limit(5);
        
      if (!error && data) {
        setSearchResults(data);
      }
      setIsSearching(false);
    }, 500);
  };

  const selectProduct = (item: any) => {
    setSelectedProduct({
      id: item.id,
      name: item.name,
      image: item.images && item.images[0]
    });
    setProductId(item.id.toString());
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSave = () => {
    onSave({
      product_id: parseInt(productId, 10) || 0,
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
      end_date: endDate ? new Date(endDate).toISOString() : new Date("2099-12-31").toISOString(),
      is_active: initialData ? initialData.is_active : true, // default active
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{initialData ? "Chỉnh sửa Giảm giá SP" : "Thêm Giảm giá SP"}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.scroll}>
            
            {/* PRODUCT SELECTION UI */}
            <View style={styles.productSelectionSection}>
              <Text style={styles.label}>Sản phẩm áp dụng</Text>
              
              {!selectedProduct ? (
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputWrapper}>
                    <Search color="#9CA3AF" size={18} />
                    <TextInput 
                      style={styles.searchInput} 
                      value={searchQuery} 
                      onChangeText={handleSearch} 
                      placeholder="Nhập tên sản phẩm để tìm..." 
                    />
                    {isSearching && <ActivityIndicator size="small" color="#2563EB" />}
                  </View>
                  
                  {searchResults.length > 0 && (
                    <View style={styles.searchResultsContainer}>
                      {searchResults.map((item) => (
                        <Pressable key={item.id} style={styles.searchResultItem} onPress={() => selectProduct(item)}>
                          <Image 
                            source={{ uri: (item.images && item.images[0]) || "https://placehold.co/100" }} 
                            style={styles.searchResultImage} 
                          />
                          <Text style={styles.searchResultName} numberOfLines={2}>{item.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.selectedProductCard}>
                  <View style={styles.selectedProductInfo}>
                    <Image 
                      source={{ uri: selectedProduct.image || "https://placehold.co/100" }} 
                      style={styles.selectedProductImage} 
                    />
                    <Text style={styles.selectedProductName} numberOfLines={2}>{selectedProduct.name}</Text>
                  </View>
                  <Pressable 
                    style={styles.changeProductBtn} 
                    onPress={() => setSelectedProduct(null)}
                  >
                    <Text style={styles.changeProductText}>Đổi</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.rowWrapper}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Loại Giảm</Text>
                <View style={styles.buttonSegment}>
                  <Pressable
                    style={[styles.segmentBtn, discountType === "percentage" && styles.segmentActive]}
                    onPress={() => setDiscountType("percentage")}
                  >
                    <Text style={[styles.segmentText, discountType === "percentage" && styles.segmentTextActive]}>%</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.segmentBtn, discountType === "fixed_amount" && styles.segmentActive]}
                    onPress={() => setDiscountType("fixed_amount")}
                  >
                    <Text style={[styles.segmentText, discountType === "fixed_amount" && styles.segmentTextActive]}>VNĐ</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.label}>Giá trị giảm</Text>
                <TextInput style={styles.input} value={discountValue} onChangeText={setDiscountValue} keyboardType="numeric" placeholder="VD: 10 hay 50000" />
              </View>
            </View>

            <View style={styles.rowWrapper}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Ngày bắt đầu (Y-M-D)</Text>
                <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2026-01-01" />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Ngày kết thúc (Y-M-D)</Text>
                <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="2026-12-31" />
              </View>
            </View>

          </ScrollView>
          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Hủy</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Lưu Cài đặt</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  content: { width: "90%", maxHeight: "80%", backgroundColor: "white", borderRadius: 16, overflow: "hidden" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#E5E7EB" },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  closeBtn: { padding: 4 },
  scroll: { padding: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, fontSize: 14, color: "#111827" },
  rowWrapper: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  halfWidth: { flex: 1 },
  buttonSegment: { flexDirection: "row", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, overflow: "hidden" },
  segmentBtn: { flex: 1, padding: 10, alignItems: "center", backgroundColor: "#F9FAFB" },
  segmentActive: { backgroundColor: "#2563EB" },
  segmentText: { fontSize: 13, fontWeight: "600", color: "#4B5563" },
  segmentTextActive: { color: "white" },
  footer: { flexDirection: "row", padding: 16, borderTopWidth: 1, borderColor: "#E5E7EB", justifyContent: "flex-end", gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  cancelText: { color: "#4B5563", fontWeight: "600" },
  saveBtn: { backgroundColor: "#2563EB", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  saveText: { color: "white", fontWeight: "600" },

  // New UI Styles
  productSelectionSection: { marginBottom: 8 },
  searchContainer: { position: "relative", zIndex: 50 },
  searchInputWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#FFF" },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14, color: "#111827" },
  searchResultsContainer: { backgroundColor: "white", borderWidth: 1, borderColor: "#D1D5DB", borderTopWidth: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, maxHeight: 200, elevation: 5, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { height: 2, width: 0 } },
  searchResultItem: { flexDirection: "row", alignItems: "center", padding: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 12 },
  searchResultImage: { width: 36, height: 36, borderRadius: 6, backgroundColor: "#E5E7EB" },
  searchResultName: { flex: 1, fontSize: 13, fontWeight: "500", color: "#374151" },
  selectedProductCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderWidth: 1, borderColor: "#93C5FD", backgroundColor: "#EFF6FF", borderRadius: 8 },
  selectedProductInfo: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  selectedProductImage: { width: 40, height: 40, borderRadius: 6, backgroundColor: "#FFF", borderWidth: StyleSheet.hairlineWidth, borderColor: "#D1D5DB" },
  selectedProductName: { flex: 1, fontSize: 13, fontWeight: "600", color: "#1E3A8A" },
  changeProductBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#DBEAFE", borderRadius: 6 },
  changeProductText: { fontSize: 12, fontWeight: "600", color: "#1D4ED8" },
});
