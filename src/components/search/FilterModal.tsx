import { Check, X, SlidersHorizontal } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

export const FilterModal: React.FC<FilterModalProps> = ({ isVisible, onClose, onApply }) => {
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("popular");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
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

  const toggleCategory = (id: string) => {
    setSelectedCats(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handlePricePreset = (index: number) => {
    if (activePricePreset === index) {
      // Bỏ chọn nếu bấm lại
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

  const handleApply = () => {
    onApply({
      categories: selectedCats,
      minPrice: minPrice ? parseInt(minPrice, 10) : null,
      maxPrice: maxPrice ? parseInt(maxPrice, 10) : null,
      sortBy,
    });
    onClose();
  };

  const activeFilterCount =
    selectedCats.length +
    (minPrice || maxPrice ? 1 : 0) +
    (sortBy !== "popular" ? 1 : 0);

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <SlidersHorizontal size={22} color="#111" style={{ marginRight: 10 }} />
            <Text style={styles.headerTitle}>Bộ lọc</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color="#111" />
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
                    style={[styles.catCard, isSelected && styles.catCardActive]}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.catImgWrapper, isSelected && styles.catImgWrapperActive]}>
                      <Image
                        source={{ uri: cat.image_url || "https://via.placeholder.com/200" }}
                        style={styles.catImage}
                      />
                      {isSelected && (
                        <View style={styles.catCheckBadge}>
                          <Check size={10} color="#fff" strokeWidth={4} />
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
            <View style={styles.presetRow}>
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
                  placeholder="Tối đa"
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
            <Text style={styles.sectionLabel}>Sắp xếp theo</Text>
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
                      <Check size={10} color="#fff" strokeWidth={4} />
                    </View>
                  )}
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
            <Text style={styles.applyText}>Áp dụng {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}</Text>
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
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111" },
  filterBadge: {
    marginLeft: 8,
    backgroundColor: "#3B82F6",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  closeBtn: { padding: 6, backgroundColor: "#F3F4F6", borderRadius: 20 },
  scrollContent: { paddingBottom: 120 },
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionLabel: { fontSize: 18, fontWeight: "800", color: "#000", marginBottom: 16 },

  // Categories grid
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  catCard: {
    alignItems: "center",
    width: (width - 40 - 36) / 4, // 4 cột, gap 12×3=36, padding 20×2=40
  },
  catCardActive: {},
  catImgWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "visible",
    backgroundColor: "#F3F4F6",
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "transparent",
  },
  catImgWrapperActive: {
    borderColor: "#3B82F6",
  },
  catImage: { width: 64, height: 64, borderRadius: 32 },
  catCheckBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#3B82F6",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  catName: { fontSize: 11, fontWeight: "500", color: "#6B7280", textAlign: "center" },
  catNameActive: { color: "#3B82F6", fontWeight: "700" },

  // Price
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  presetChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  presetText: { fontSize: 13, color: "#4B5563", fontWeight: "600" },
  presetTextActive: { color: "#3B82F6" },
  priceInputRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  priceInputWrapper: { flex: 1 },
  priceInputLabel: { fontSize: 12, color: "#9CA3AF", marginBottom: 6, fontWeight: "500" },
  priceInput: {
    height: 48,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111",
    fontWeight: "600",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  priceSeparator: {
    width: 20,
    height: 2,
    backgroundColor: "#D1D5DB",
    borderRadius: 1,
    marginTop: 18,
  },

  // Sort
  sortWrapper: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  sortBtnActive: { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" },
  sortText: { fontSize: 14, color: "#4B5563", fontWeight: "600" },
  sortTextActive: { color: "#3B82F6" },
  sortBadge: { marginLeft: 8, backgroundColor: "#3B82F6", borderRadius: 10, padding: 3 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#3B82F6",
  },
  clearText: { color: "#3B82F6", fontSize: 15, fontWeight: "700" },
  applyBtn: {
    flex: 2,
    height: 54,
    backgroundColor: "#3B82F6",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  applyText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
