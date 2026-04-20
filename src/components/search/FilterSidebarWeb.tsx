import { Check } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface FilterSidebarWebProps {
  onFilterChange: (filters: any) => void;
  initialFilters?: any;
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

export const FilterSidebarWeb: React.FC<FilterSidebarWebProps> = ({ onFilterChange, initialFilters }) => {
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>(initialFilters?.categories || []);
  const [sizeType, setSizeType] = useState<"clothes" | "shoes">("clothes");
  const [selectedSize, setSelectedSize] = useState(initialFilters?.size || "");
  const [selectedColor, setSelectedColor] = useState(initialFilters?.color || "");
  const [sortBy, setSortBy] = useState(initialFilters?.sortBy || "popular");

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

  // Trigger onFilterChange when any filter changes
  useEffect(() => {
    onFilterChange({
      categories: selectedCats,
      size: selectedSize,
      color: selectedColor,
      sortBy
    });
  }, [selectedCats, selectedSize, selectedColor, sortBy]);

  const toggleCategory = (id: string) => {
    setSelectedCats(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleClear = () => {
    setSelectedCats([]);
    setSelectedSize("");
    setSelectedColor("");
    setSortBy("popular");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bộ lọc</Text>
        <TouchableOpacity onPress={handleClear}>
          <Text style={styles.clearText}>Xóa tất cả</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Danh mục</Text>
          <View style={styles.catList}>
            {dbCategories.map(cat => {
              const isSelected = selectedCats.includes(cat.id.toString());
              return (
                <TouchableOpacity 
                  key={cat.id} 
                  onPress={() => toggleCategory(cat.id.toString())} 
                  style={[styles.catItem, isSelected && styles.catItemActive]}
                >
                  <Text style={[styles.catName, isSelected && styles.catNameActive]}>
                    {cat.name_vi || cat.name}
                  </Text>
                  {isSelected && <Check size={16} color="#3B82F6" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Size */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Kích cỡ</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                onPress={() => setSizeType("clothes")}
                style={[styles.toggleBtn, sizeType === "clothes" && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, sizeType === "clothes" && styles.toggleTextActive]}>Áo/Quần</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.sizeContainer}>
            {SIZES.map(size => (
              <TouchableOpacity
                key={size}
                onPress={() => setSelectedSize(size === selectedSize ? "" : size)}
                style={[styles.sizeItem, selectedSize === size && styles.sizeItemActive]}
              >
                <Text style={[styles.sizeText, selectedSize === size && styles.sizeTextActive]}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Màu sắc</Text>
          <View style={styles.colorList}>
            {COLORS.map(color => (
              <TouchableOpacity
                key={color.id}
                onPress={() => setSelectedColor(color.id === selectedColor ? "" : color.id)}
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
          </View>
        </View>

        {/* Sort */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sắp xếp</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 250,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    paddingRight: 20,
    height: '100%',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  clearText: { fontSize: 14, color: "#3B82F6", fontWeight: "600" },
  scrollContent: { paddingBottom: 40 },
  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 10 },

  // Categories
  catList: { gap: 8 },
  catItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#F9FAFB" },
  catItemActive: { backgroundColor: "#EFF6FF" },
  catName: { fontSize: 14, color: "#4B5563", fontWeight: "500" },
  catNameActive: { color: "#3B82F6", fontWeight: "600" },

  // Size
  toggleContainer: { flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 8, padding: 2 },
  toggleBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  toggleBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  toggleText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  toggleTextActive: { color: "#3B82F6" },
  sizeContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sizeItem: { width: "30%", height: 36, justifyContent: "center", alignItems: "center", borderRadius: 8, backgroundColor: "#F3F4F6" },
  sizeItemActive: { backgroundColor: "#3B82F6" },
  sizeText: { fontSize: 13, fontWeight: "600", color: "#4B5563" },
  sizeTextActive: { color: "#FFF" },

  // Color
  colorList: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  colorBadge: { position: "absolute", top: -2, right: -2, backgroundColor: "#3B82F6", width: 16, height: 16, borderRadius: 8, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" },

  // Sort
  sortWrapper: { gap: 8 },
  sortBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F9FAFB", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  sortBtnActive: { backgroundColor: "#EFF6FF" },
  sortText: { fontSize: 14, color: "#4B5563", fontWeight: "500" },
  sortTextActive: { color: "#3B82F6", fontWeight: "600" },
  sortBadge: { backgroundColor: "#3B82F6", borderRadius: 8, padding: 2 },
});
