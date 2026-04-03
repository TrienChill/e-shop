import { Check, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface FilterModalProps {
  isVisible: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
}



const SIZES = ["XS", "S", "M", "L", "XL", "2XL"];
const COLORS = [
  { id: "white", hex: "#FFFFFF", border: "#E5E7EB" },
  { id: "black", hex: "#111827" },
  { id: "blue", hex: "#3B82F6" },
  { id: "red", hex: "#EF4444" },
  { id: "teal", hex: "#14B8A6" },
  { id: "yellow", hex: "#F59E0B" },
];

const SORT_OPTIONS = [
  { id: "popular", label: "Phổ biến" },
  { id: "newest", label: "Mới nhất" },
  { id: "price_high_low", label: "Giá từ Cao đến Thấp" },
  { id: "price_low_high", label: "Giá từ Thấp đến Cao" },
];

export const FilterModal: React.FC<FilterModalProps> = ({ isVisible, onClose, onApply }) => {
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [sizeType, setSizeType] = useState<"clothes" | "shoes">("clothes");
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState("white");
  const [sortBy, setSortBy] = useState("popular");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });
        
        if (error) throw error;
        setDbCategories(data || []);
      } catch (err) {
        console.error("Lỗi lấy danh mục:", err);
      }
    };
    fetchCategories();
  }, []);

  const toggleCategory = (id: string) => {
    setSelectedCats(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleClear = () => {
    setSelectedCats([]);
    setSelectedSize("M");
    setSelectedColor("");
    setSortBy("popular");
  };

  const handleApply = () => {
    onApply({
      categories: selectedCats,
      size: selectedSize,
      color: selectedColor,
      sortBy
    });
    onClose();
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bộ lọc</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color="#111" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Categories */}
          <View style={styles.section}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catList}>
              {dbCategories.map(cat => (
                <TouchableOpacity key={cat.id} onPress={() => toggleCategory(cat.id.toString())} style={styles.catItem}>
                  <View style={styles.imageWrapper}>
                    <Image source={{ uri: cat.image_url || 'https://via.placeholder.com/200' }} style={styles.catImage} />
                    {selectedCats.includes(cat.id.toString()) && (
                      <View style={styles.badge}>
                        <Check size={10} color="#fff" strokeWidth={4} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.catName}>{cat.name_vi || cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Size Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Kích cỡ</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  onPress={() => setSizeType("clothes")}
                  style={[styles.toggleBtn, sizeType === "clothes" && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, sizeType === "clothes" && styles.toggleTextActive]}>Quần áo</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sizeContainer}>
              {SIZES.map(size => (
                <TouchableOpacity
                  key={size}
                  onPress={() => setSelectedSize(size)}
                  style={[styles.sizeItem, selectedSize === size && styles.sizeItemActive]}
                >
                  <Text style={[styles.sizeText, selectedSize === size && styles.sizeTextActive]}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Color Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Màu sắc</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorList}>
              {COLORS.map(color => (
                <TouchableOpacity
                  key={color.id}
                  onPress={() => setSelectedColor(color.id)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color.hex },
                    color.border ? { borderWidth: 1, borderColor: color.border } : {}
                  ]}
                >
                  {selectedColor === color.id && (
                    <View style={styles.colorBadge}>
                      <Check size={12} color={color.id === "white" ? "#3B82F6" : "#fff"} strokeWidth={4} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Price Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Giá tiền</Text>
              <Text style={styles.priceLabel}>100.000đ — 2.500.000đ</Text>
            </View>
            {/* Visual Range Slider Mockup */}
            <View style={styles.sliderContainer}>
              <View style={styles.sliderTrack} />
              <View style={[styles.sliderFill, { width: '60%', left: '10%' }]} />
              <View style={[styles.sliderKnob, { left: '10%' }]} />
              <View style={[styles.sliderKnob, { left: '70%' }]} />
            </View>
          </View>

          {/* Sort Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Sắp xếp theo</Text>
            <View style={styles.sortWrapper}>
              {SORT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setSortBy(opt.id)}
                  style={[styles.sortBtn, sortBy === opt.id && styles.sortBtnActive]}
                >
                  <Text style={[styles.sortText, sortBy === opt.id && styles.sortTextActive]}>{opt.label}</Text>
                  {sortBy === opt.id && <View style={styles.sortBadge}><Check size={10} color="#fff" strokeWidth={4} /></View>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>Xóa tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleApply} style={styles.applyBtn}>
            <Text style={styles.applyText}>Áp dụng</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#111" },
  closeBtn: { padding: 5 },
  scrollContent: { paddingBottom: 100 },
  section: { paddingHorizontal: 20, marginBottom: 30 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  sectionLabel: { fontSize: 20, fontWeight: "800", color: "#000" },

  // Categories
  catList: { paddingRight: 20 },
  catItem: { alignItems: "center", marginRight: 20 },
  imageWrapper: { width: 70, height: 70, borderRadius: 35, overflow: "visible", backgroundColor: "#F3F4F6", marginBottom: 8 },
  catImage: { width: "100%", height: "100%", borderRadius: 35 },
  badge: { position: "absolute", top: 0, right: 0, backgroundColor: "#3B82F6", width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" },
  catName: { fontSize: 13, fontWeight: "500", color: "#4B5563" },

  // Size
  toggleContainer: { flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 12, padding: 3 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  toggleBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  toggleTextActive: { color: "#3B82F6" },
  sizeContainer: { flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 25, padding: 5, justifyContent: "space-between" },
  sizeItem: { flex: 1, height: 40, justifyContent: "center", alignItems: "center", borderRadius: 20 },
  sizeItemActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 3 },
  sizeText: { fontSize: 14, fontWeight: "700", color: "#A5B4FC" },
  sizeTextActive: { color: "#3B82F6" },

  // Color
  colorList: { paddingVertical: 5 },
  colorCircle: { width: 44, height: 44, borderRadius: 22, marginRight: 15, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  colorBadge: { position: "absolute", top: -2, right: -2, backgroundColor: "#3B82F6", width: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" },

  // Price
  priceLabel: { fontSize: 16, fontWeight: "600", color: "#111" },
  sliderContainer: { height: 60, justifyContent: "center", paddingHorizontal: 10 },
  sliderTrack: { height: 4, backgroundColor: "#E5E7EB", borderRadius: 2 },
  sliderFill: { position: "absolute", height: 4, backgroundColor: "#3B82F6" },
  sliderKnob: { position: "absolute", width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5, borderWidth: 1, borderColor: "#E5E7EB" },

  // Sort
  sortWrapper: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sortBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
  sortBtnActive: { backgroundColor: "#EFF6FF" },
  sortText: { fontSize: 14, color: "#4B5563", fontWeight: "600" },
  sortTextActive: { color: "#3B82F6" },
  sortBadge: { marginLeft: 8, backgroundColor: "#3B82F6", borderRadius: 10, padding: 2 },

  // Footer
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", paddingHorizontal: 20, paddingVertical: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#F3F4F6", gap: 15 },
  clearBtn: { flex: 1, height: 56, borderRadius: 20, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#3B82F6" },
  clearText: { color: "#3B82F6", fontSize: 16, fontWeight: "700" },
  applyBtn: { flex: 2, height: 56, backgroundColor: "#3B82F6", borderRadius: 20, justifyContent: "center", alignItems: "center" },
  applyText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
