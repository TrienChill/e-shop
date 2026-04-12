// src/components/admin/CategoryProductsModal.tsx
// Modal quản lý sản phẩm trong danh mục: xem, thêm, xóa, sửa nhanh giá/stock

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ExternalLink,
  Layers,
  PackageMinus,
  PackagePlus,
  Save,
  Search,
  X,
} from "lucide-react-native";
import { supabase } from "@/src/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryProduct {
  id: number;
  name: string;
  price: number;
  stock: number | null;
  images: string[];
  is_active: boolean;
  category_id: number | null;
  // inline edit state
  editingPrice?: boolean;
  editingStock?: boolean;
  draftPrice?: string;
  draftStock?: string;
}

interface Props {
  visible: boolean;
  categoryId: number;
  categoryName: string;
  onClose: () => void;
}

// ─── Toast helper ─────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const show = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, show };
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <View style={skeleton.row}>
      <View style={skeleton.img} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={[skeleton.line, { width: "60%" }]} />
        <View style={[skeleton.line, { width: "40%" }]} />
      </View>
      <View style={[skeleton.line, { width: 60 }]} />
      <View style={[skeleton.line, { width: 50 }]} />
    </View>
  );
}

const skeleton = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  img: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#E5E7EB" },
  line: { height: 12, backgroundColor: "#E5E7EB", borderRadius: 6 },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CategoryProductsModal({ visible, categoryId, categoryName, onClose }: Props) {
  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Thêm sản phẩm
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [unlinkedProducts, setUnlinkedProducts] = useState<CategoryProduct[]>([]);
  const [loadingUnlinked, setLoadingUnlinked] = useState(false);
  const [addSearch, setAddSearch] = useState("");

  // Saving state
  const [savingId, setSavingId] = useState<number | null>(null);

  const { toast, show: showToast } = useToast();

  // ─── Fetch sản phẩm trong danh mục ─────────────────────────────────────────

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, stock, images, is_active, category_id")
        .eq("category_id", categoryId)
        .order("name", { ascending: true });
      if (error) throw error;
      setProducts((data || []).map(p => ({ ...p, editingPrice: false, editingStock: false })));
    } catch (err: any) {
      showToast("❌ Lỗi tải sản phẩm: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch sản phẩm chưa có danh mục (để thêm) ──────────────────────────────

  const fetchUnlinked = async () => {
    setLoadingUnlinked(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, stock, images, is_active, category_id")
        .is("category_id", null)
        .order("name", { ascending: true });
      if (error) throw error;
      setUnlinkedProducts(data || []);
    } catch (err: any) {
      showToast("❌ " + err.message, "error");
    } finally {
      setLoadingUnlinked(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchProducts();
      setSearchQuery("");
      setShowAddPanel(false);
    }
  }, [visible, categoryId]);

  useEffect(() => {
    if (showAddPanel) fetchUnlinked();
  }, [showAddPanel]);

  // ─── Xóa sản phẩm khỏi danh mục (set category_id = null) ───────────────────

  const handleRemove = async (product: CategoryProduct) => {
    const ok = typeof window !== "undefined"
      ? window.confirm(`Gỡ "${product.name}" khỏi danh mục này?`)
      : true;
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("products")
        .update({ category_id: null })
        .eq("id", product.id);
      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== product.id));
      showToast(`✅ Đã gỡ "${product.name}" khỏi danh mục`);
    } catch (err: any) {
      showToast("❌ " + err.message, "error");
    }
  };

  // ─── Thêm sản phẩm vào danh mục ─────────────────────────────────────────────

  const handleAdd = async (product: CategoryProduct) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ category_id: categoryId })
        .eq("id", product.id);
      if (error) throw error;

      setUnlinkedProducts(prev => prev.filter(p => p.id !== product.id));
      setProducts(prev => [...prev, { ...product, category_id: categoryId }]);
      showToast(`✅ Đã thêm "${product.name}" vào danh mục`);
    } catch (err: any) {
      showToast("❌ " + err.message, "error");
    }
  };

  // ─── Sửa nhanh Giá / Stock ───────────────────────────────────────────────────

  const toggleEdit = (id: number, field: "editingPrice" | "editingStock") => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      return {
        ...p,
        [field]: !p[field],
        draftPrice: field === "editingPrice" ? String(p.price) : p.draftPrice,
        draftStock: field === "editingStock" ? String(p.stock ?? 0) : p.draftStock,
      };
    }));
  };

  const saveEdit = async (product: CategoryProduct) => {
    const newPrice = parseInt(product.draftPrice || "0");
    const newStock = parseInt(product.draftStock || "0");

    if (isNaN(newPrice) || newPrice < 0) {
      showToast("❌ Giá không hợp lệ", "error"); return;
    }

    setSavingId(product.id);
    try {
      const { error } = await supabase
        .from("products")
        .update({ price: newPrice, stock: newStock })
        .eq("id", product.id);
      if (error) throw error;

      setProducts(prev => prev.map(p =>
        p.id === product.id
          ? { ...p, price: newPrice, stock: newStock, editingPrice: false, editingStock: false }
          : p
      ));
      showToast(`✅ Cập nhật "${product.name}" thành công`);
    } catch (err: any) {
      showToast("❌ " + err.message, "error");
    } finally {
      setSavingId(null);
    }
  };

  // ─── Filter ──────────────────────────────────────────────────────────────────

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUnlinked = unlinkedProducts.filter(p =>
    p.name.toLowerCase().includes(addSearch.toLowerCase())
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  const renderProductRow = (p: CategoryProduct) => {
    const isEditing = p.editingPrice || p.editingStock;
    const isSaving = savingId === p.id;
    const imgUri = p.images?.[0] || "https://via.placeholder.com/48";

    return (
      <View key={p.id} style={[styles.tableRow, !p.is_active && styles.tableRowInactive]}>
        {/* Thumbnail */}
        <Image source={{ uri: imgUri }} style={styles.thumb} />

        {/* Tên */}
        <View style={styles.nameCell}>
          <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, { backgroundColor: p.is_active ? "#10B981" : "#9CA3AF" }]} />
            <Text style={styles.statusText}>{p.is_active ? "Đang bán" : "Ẩn"}</Text>
          </View>
        </View>

        {/* Giá */}
        <View style={styles.editCell}>
          {p.editingPrice ? (
            <TextInput
              style={styles.inlineInput}
              value={p.draftPrice}
              onChangeText={v => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, draftPrice: v } : x))}
              keyboardType="numeric"
              autoFocus
            />
          ) : (
            <Pressable onPress={() => toggleEdit(p.id, "editingPrice")}>
              <Text style={styles.cellValue}>{p.price.toLocaleString("vi-VN")}đ</Text>
            </Pressable>
          )}
        </View>

        {/* Stock */}
        <View style={styles.editCell}>
          {p.editingStock ? (
            <TextInput
              style={styles.inlineInput}
              value={p.draftStock}
              onChangeText={v => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, draftStock: v } : x))}
              keyboardType="numeric"
              autoFocus
            />
          ) : (
            <Pressable onPress={() => toggleEdit(p.id, "editingStock")}>
              <Text style={[styles.cellValue, (p.stock ?? 0) === 0 && { color: "#EF4444" }]}>
                {p.stock ?? 0}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionCell}>
          {isEditing && (
            <Pressable
              style={[styles.iconBtn, styles.iconBtnSave]}
              onPress={() => saveEdit(p)}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={14} color="#fff" />}
            </Pressable>
          )}
          <Pressable
            style={[styles.iconBtn, styles.iconBtnDanger]}
            onPress={() => handleRemove(p)}
          >
            <PackageMinus size={14} color="#EF4444" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>

          {/* ── Header ── */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Layers size={20} color="#2563EB" />
              <View>
                <Text style={styles.modalTitle}>Sản phẩm trong danh mục</Text>
                <Text style={styles.modalSubtitle}>{categoryName} · {products.length} sản phẩm</Text>
              </View>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* ── Toast ── */}
          {toast && (
            <View style={[styles.toast, toast.type === "error" ? styles.toastError : styles.toastSuccess]}>
              <Text style={styles.toastText}>{toast.msg}</Text>
            </View>
          )}

          {/* ── Toolbar ── */}
          <View style={styles.toolbar}>
            {/* Tìm kiếm */}
            <View style={styles.searchBox}>
              <Search size={15} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm sản phẩm..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")}>
                  <X size={14} color="#9CA3AF" />
                </Pressable>
              ) : null}
            </View>

            {/* Nút Thêm sản phẩm */}
            <Pressable
              style={[styles.addBtn, showAddPanel && styles.addBtnActive]}
              onPress={() => setShowAddPanel(v => !v)}
            >
              <PackagePlus size={16} color={showAddPanel ? "#fff" : "#2563EB"} />
              <Text style={[styles.addBtnText, showAddPanel && { color: "#fff" }]}>
                Thêm sản phẩm
              </Text>
            </Pressable>
          </View>

          {/* ── Hint: click ô giá/stock để sửa ── */}
          <View style={styles.hint}>
            <Text style={styles.hintText}>💡 Nhấn vào ô <Text style={{ fontWeight: "700" }}>Giá</Text> hoặc <Text style={{ fontWeight: "700" }}>Tồn kho</Text> để chỉnh sửa nhanh, sau đó nhấn 💾 để lưu.</Text>
          </View>

          {/* ── Table header ── */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>SẢN PHẨM</Text>
            <Text style={styles.tableHeaderCell}>GIÁ</Text>
            <Text style={styles.tableHeaderCell}>TỒN KHO</Text>
            <Text style={styles.tableHeaderCell}>THAO TÁC</Text>
          </View>

          {/* ── Product list ── */}
          <ScrollView style={styles.tableBody} nestedScrollEnabled>
            {loading ? (
              <>
                <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
              </>
            ) : filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {searchQuery ? "Không tìm thấy sản phẩm" : "Danh mục chưa có sản phẩm nào"}
                </Text>
              </View>
            ) : (
              filtered.map(renderProductRow)
            )}
          </ScrollView>

          {/* ── Add Panel (sản phẩm chưa có danh mục) ── */}
          {showAddPanel && (
            <View style={styles.addPanel}>
              <View style={styles.addPanelHeader}>
                <Text style={styles.addPanelTitle}>Sản phẩm chưa có danh mục</Text>
                <Pressable onPress={() => setShowAddPanel(false)}>
                  <X size={18} color="#6B7280" />
                </Pressable>
              </View>

              <View style={styles.searchBox}>
                <Search size={15} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm nhanh..."
                  placeholderTextColor="#9CA3AF"
                  value={addSearch}
                  onChangeText={setAddSearch}
                />
              </View>

              <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                {loadingUnlinked ? (
                  <ActivityIndicator color="#2563EB" style={{ marginTop: 20 }} />
                ) : filteredUnlinked.length === 0 ? (
                  <Text style={styles.emptyStateText}>Không có sản phẩm nào chưa có danh mục</Text>
                ) : (
                  filteredUnlinked.map(p => (
                    <View key={p.id} style={styles.unlinkedRow}>
                      <Image source={{ uri: p.images?.[0] || "https://via.placeholder.com/40" }} style={styles.unlinkedImg} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.unlinkedName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.unlinkedPrice}>{p.price.toLocaleString("vi-VN")}đ</Text>
                      </View>
                      <Pressable style={styles.addRowBtn} onPress={() => handleAdd(p)}>
                        <PackagePlus size={15} color="#fff" />
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Thêm</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 700,
    maxHeight: "90%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },

  // Header
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#F8FAFF",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  modalSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center",
  },

  // Toast
  toast: { marginHorizontal: 20, marginTop: 8, padding: 10, borderRadius: 8 },
  toastSuccess: { backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#A7F3D0" },
  toastError: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  toastText: { fontSize: 13, fontWeight: "600", color: "#374151" },

  // Toolbar
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", outlineStyle: "none" } as any,
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  addBtnActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  addBtnText: { fontSize: 13, fontWeight: "700", color: "#2563EB" },

  // Hint
  hint: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: "#FFFBEB",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  hintText: { fontSize: 12, color: "#92400E" },

  // Table
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableBody: { maxHeight: 320 },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tableRowInactive: { backgroundColor: "#FAFAFA" },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  nameCell: { flex: 2, gap: 3 },
  productName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, color: "#6B7280" },
  editCell: { flex: 1, alignItems: "center" },
  cellValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    textAlign: "center",
  },
  inlineInput: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    borderWidth: 2,
    borderColor: "#2563EB",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "#EFF6FF",
    textAlign: "center",
    minWidth: 70,
    outlineStyle: "none",
  } as any,
  actionCell: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  iconBtn: {
    width: 30, height: 30,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnSave: { backgroundColor: "#2563EB" },
  iconBtnDanger: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },

  // Add Panel
  addPanel: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#F8FAFF",
    padding: 16,
    gap: 10,
  },
  addPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addPanelTitle: { fontSize: 14, fontWeight: "700", color: "#1D4ED8" },
  unlinkedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  unlinkedImg: {
    width: 40, height: 40, borderRadius: 6,
    backgroundColor: "#E5E7EB",
  },
  unlinkedName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  unlinkedPrice: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  addRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
});
