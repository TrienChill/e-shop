import { Check, SlidersHorizontal } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface FilterSidebarWebProps {
  onFilterChange: (filters: any) => void;
  initialFilters?: any;
}

const SORT_OPTIONS = [
  { id: "popular", label: "Phổ biến" },
  { id: "newest", label: "Mới nhất" },
  { id: "price_high_low", label: "Giá Cao → Thấp" },
  { id: "price_low_high", label: "Giá Thấp → Cao" },
];

const PRICE_PRESETS = [
  { label: "Dưới 200K", min: 0, max: 200000 },
  { label: "200K – 500K", min: 200000, max: 500000 },
  { label: "500K – 1Tr", min: 500000, max: 1000000 },
  { label: "Trên 1Tr", min: 1000000, max: 99999999 },
];

export const FilterSidebarWeb: React.FC<FilterSidebarWebProps> = ({ onFilterChange, initialFilters }) => {
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>(initialFilters?.categories || []);
  const [sortBy, setSortBy] = useState(initialFilters?.sortBy || "popular");
  const [minPrice, setMinPrice] = useState(initialFilters?.minPrice?.toString() || "");
  const [maxPrice, setMaxPrice] = useState(initialFilters?.maxPrice?.toString() || "");
  const [activePricePreset, setActivePricePreset] = useState<number | null>(null);

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

  // Trigger onFilterChange whenever any filter state changes
  useEffect(() => {
    onFilterChange({
      categories: selectedCats,
      minPrice: minPrice ? parseInt(minPrice, 10) : null,
      maxPrice: maxPrice ? parseInt(maxPrice, 10) : null,
      sortBy,
    });
  }, [selectedCats, minPrice, maxPrice, sortBy]);

  const toggleCategory = (id: string) => {
    setSelectedCats(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handlePricePreset = (index: number) => {
    if (activePricePreset === index) {
      setActivePricePreset(null);
      setMinPrice("");
      setMaxPrice("");
    } else {
      setActivePricePreset(index);
      const preset = PRICE_PRESETS[index];
      setMinPrice(preset.min === 0 ? "" : preset.min.toString());
      setMaxPrice(preset.max === 99999999 ? "" : preset.max.toString());
    }
  };

  const handleMinPriceChange = (val: string) => {
    setMinPrice(val.replace(/[^0-9]/g, ""));
    setActivePricePreset(null);
  };

  const handleMaxPriceChange = (val: string) => {
    setMaxPrice(val.replace(/[^0-9]/g, ""));
    setActivePricePreset(null);
  };

  const handleClear = () => {
    setSelectedCats([]);
    setSortBy("popular");
    setMinPrice("");
    setMaxPrice("");
    setActivePricePreset(null);
  };

  const activeFilterCount =
    selectedCats.length +
    (minPrice || maxPrice ? 1 : 0) +
    (sortBy !== "popular" ? 1 : 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SlidersHorizontal size={18} color="#111" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Bộ lọc</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleClear}>
          <Text style={styles.clearText}>Xóa tất cả</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Categories ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Danh mục</Text>
          <View style={styles.catGrid}>
            {dbCategories.map(cat => {
              const isSelected = selectedCats.includes(cat.id.toString());
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => toggleCategory(cat.id.toString())}
                  style={styles.catCard}
                  activeOpacity={0.75}
                >
                  <View style={[styles.catImgWrapper, isSelected && styles.catImgWrapperActive]}>
                    <Image
                      source={{ uri: cat.image_url || "https://via.placeholder.com/200" }}
                      style={styles.catImage}
                    />
                    {isSelected && (
                      <View style={styles.catCheckBadge}>
                        <Check size={8} color="#fff" strokeWidth={4} />
                      </View>
                    )}
                  </View>
                  <Text
                    style={[styles.catName, isSelected && styles.catNameActive]}
                    numberOfLines={1}
                  >
                    {cat.name_vi || cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Price Range ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Khoảng giá</Text>

          {/* Preset chips */}
          <View style={styles.presetCol}>
            {PRICE_PRESETS.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handlePricePreset(idx)}
                style={[styles.presetChip, activePricePreset === idx && styles.presetChipActive]}
                activeOpacity={0.75}
              >
                <Text style={[styles.presetText, activePricePreset === idx && styles.presetTextActive]}>
                  {preset.label}
                </Text>
                {activePricePreset === idx && (
                  <View style={styles.presetCheck}>
                    <Check size={9} color="#fff" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Manual inputs */}
          <View style={styles.priceInputRow}>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.priceInputLabel}>Từ (đ)</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={minPrice ? parseInt(minPrice).toLocaleString("vi-VN") : ""}
                onChangeText={handleMinPriceChange}
              />
            </View>
            <View style={styles.priceSeparator} />
            <View style={styles.priceInputWrapper}>
              <Text style={styles.priceInputLabel}>Đến (đ)</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={maxPrice ? parseInt(maxPrice).toLocaleString("vi-VN") : ""}
                onChangeText={handleMaxPriceChange}
              />
            </View>
          </View>
        </View>

        {/* ── Sort ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sắp xếp</Text>
          <View style={styles.sortWrapper}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setSortBy(opt.id)}
                style={[styles.sortBtn, sortBy === opt.id && styles.sortBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.sortText, sortBy === opt.id && styles.sortTextActive]}>
                  {opt.label}
                </Text>
                {sortBy === opt.id && (
                  <View style={styles.sortBadge}>
                    <Check size={9} color="#fff" strokeWidth={4} />
                  </View>
                )}
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
    width: 240,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#F3F4F6",
    paddingRight: 16,
    height: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#111" },
  filterBadge: {
    marginLeft: 7,
    backgroundColor: "#3B82F6",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  clearText: { fontSize: 13, color: "#3B82F6", fontWeight: "600" },
  scrollContent: { paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 12 },

  // Categories – icon grid
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catCard: {
    alignItems: "center",
    width: 52,
  },
  catImgWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    marginBottom: 5,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "visible",
  },
  catImgWrapperActive: { borderColor: "#3B82F6" },
  catImage: { width: 48, height: 48, borderRadius: 24 },
  catCheckBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#3B82F6",
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  catName: { fontSize: 10, fontWeight: "500", color: "#6B7280", textAlign: "center" },
  catNameActive: { color: "#3B82F6", fontWeight: "700" },

  // Price
  presetCol: { gap: 6, marginBottom: 14 },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  presetChipActive: { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" },
  presetText: { fontSize: 13, color: "#4B5563", fontWeight: "500" },
  presetTextActive: { color: "#3B82F6", fontWeight: "600" },
  presetCheck: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 3,
  },
  priceInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceInputWrapper: { flex: 1 },
  priceInputLabel: { fontSize: 11, color: "#9CA3AF", marginBottom: 5, fontWeight: "500" },
  priceInput: {
    height: 40,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    color: "#111",
    fontWeight: "600",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  priceSeparator: { width: 14, height: 2, backgroundColor: "#D1D5DB", marginTop: 12 },

  // Sort
  sortWrapper: { gap: 6 },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  sortBtnActive: { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" },
  sortText: { fontSize: 13, color: "#4B5563", fontWeight: "500" },
  sortTextActive: { color: "#3B82F6", fontWeight: "600" },
  sortBadge: { backgroundColor: "#3B82F6", borderRadius: 7, padding: 3 },
});
