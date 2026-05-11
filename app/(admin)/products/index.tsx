import { useSupabaseRealtime } from "@/src/services/useSupabaseRealtime";
import { supabase } from "@/src/lib/supabase";
import { exportProductsToExcel } from "@/src/utils/excel";
import ImportExcelModal from "@/src/components/admin/ImportExcelModal";
import { AdminDataWrapper } from "@/src/components/admin/AdminDataWrapper";
import { router } from "expo-router";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Download,
  Edit,
  Eye,
  EyeOff,
  Plus,
  Search,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function AdminProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "inactive">("all");
  const [exporting, setExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc" | null;
  }>({
    key: null,
    direction: null,
  });

  // Pagination State
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRowsMenu, setShowRowsMenu] = useState(false);

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    name: true,
    categories: true,
    is_active: true,
    stock: true,
    price: true,
    created_at: true,
    actions: true,
  });
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = (currentPageProducts: any[]) => {
    if (selectedIds.size > 0 && currentPageProducts.every(p => selectedIds.has(p.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentPageProducts.map(p => p.id)));
    }
  };

  const deleteSelectedProducts = async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    const confirmMessage = `Bạn có chắc muốn XOÁ VĨNH VIỄN ${count} sản phẩm đã chọn?`;
    
    if (Platform.OS === "web") {
      if (!window.confirm(confirmMessage)) return;
    } else {
      // For mobile, we'd use Alert.alert, but assuming Web focus for this dashboard
    }

    setLoading(true);
    const { error } = await supabase
      .from("products")
      .delete()
      .in("id", Array.from(selectedIds));

    if (!error) {
      setSelectedIds(new Set());
      fetchProducts();
    } else {
      alert("Lỗi khi xoá sản phẩm: " + error.message);
      setLoading(false);
    }
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select(`
        id, name, price, is_active, created_at,
        categories ( name, name_vi ),
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
            },
          },
         ]
      );
    };

    if (Platform.OS === "web") {
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

  useSupabaseRealtime({
    table: "products",
    onUpdate: fetchProducts,
  });

  const toggleActiveStatus = async (id: number, currentStatus: boolean) => {
    const confirmMessage = currentStatus
      ? "Bạn có chắc muốn NGƯNG BÁN sản phẩm này?"
      : "Bạn có muốn MỞ BÁN LẠI sản phẩm này?";

    if (Platform.OS === "web") {
      if (!window.confirm(confirmMessage)) return;
    }

    const { error } = await supabase
      .from("products")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (!error) {
      fetchProducts();
    } else {
      alert("Lỗi khi cập nhật trạng thái!");
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportProductsToExcel();
    } catch {
      alert("Xuất file thất bại, vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (key: string) => {
    let newKey: string | null = key;
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = null;
      newKey = null;
    }
    setSortConfig({ key: newKey, direction });
    setCurrentPage(1);
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} color="#94A3B8" />;
    return sortConfig.direction === "asc" ? (
      <ArrowUp size={14} color="#10B981" />
    ) : (
      <ArrowDown size={14} color="#10B981" />
    );
  };

  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = String(p.name).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      filterTab === "all" ? true : filterTab === "active" ? p.is_active : !p.is_active;
    return matchesSearch && matchesTab;
  });

  const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;

    let aValue, bValue;
    if (sortConfig.key === "stock") {
      aValue = a.product_variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
      bValue = b.product_variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
    } else if (sortConfig.key === "categories") {
      aValue = a.categories?.name_vi || a.categories?.name || "";
      bValue = b.categories?.name_vi || b.categories?.name || "";
    } else {
      aValue = a[sortConfig.key];
      bValue = b[sortConfig.key];
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination Logic
  const totalResults = sortedProducts.length;
  const totalPages = Math.ceil(totalResults / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalResults);
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={true}
    >
      {/* ── Header & Subtitle ──────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sản phẩm</Text>
          <Text style={styles.subtitle}>Quản lý và duyệt danh mục sản phẩm của bạn.</Text>
        </View>
        <View style={styles.headerRight}>
          {selectedIds.size > 0 && (
            <Pressable style={styles.bulkDeleteBtn} onPress={deleteSelectedProducts}>
              <Trash2 color="white" size={16} />
              <Text style={styles.bulkDeleteText}>Xoá ({selectedIds.size})</Text>
            </Pressable>
          )}
          <Pressable style={styles.addBtn} onPress={() => router.push("/(admin)/products/new")}>
            <Plus color="white" size={18} />
            <Text style={styles.addBtnText}>Thêm Sản phẩm</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Thanh Filter Tabs ──────────────────── */}
      <View style={styles.filterTabs}>
        {(["all", "active", "inactive"] as const).map((tab) => {
          const labels = { all: "Tất cả", active: "Đang bán", inactive: "Ngưng bán" };
          const isActive = filterTab === tab;
          return (
            <Pressable
              key={tab}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => {
                setFilterTab(tab);
                setCurrentPage(1); // Reset to first page on tab change
                setSelectedIds(new Set()); // Clear selection on tab change
              }}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {labels[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── TableCard ──────────────────────────── */}
      <View style={styles.tableCard}>
        {/* Thanh tìm kiếm + nút Export / Import + Cột */}
        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Search color="#64748B" size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setCurrentPage(1); // Reset to first page on search
                setSelectedIds(new Set()); // Clear selection on search
              }}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.toolbarActions}>
            <View style={{ position: 'relative', zIndex: 50 }}>
              <Pressable
                style={styles.outlineBtn}
                onPress={() => setShowColumnsMenu(!showColumnsMenu)}
              >
                <Settings2 size={16} color="#475569" />
                <Text style={styles.outlineBtnText}>Hiển thị cột</Text>
              </Pressable>

              {showColumnsMenu && (
                <View style={styles.columnsDropdown}>
                  <Text style={styles.dropdownTitle}>Tùy chỉnh cột</Text>
                  {[
                    { id: 'name', label: 'Sản phẩm' },
                    { id: 'categories', label: 'Danh mục' },
                    { id: 'is_active', label: 'Trạng thái' },
                    { id: 'stock', label: 'Kho' },
                    { id: 'price', label: 'Giá' },
                    { id: 'created_at', label: 'Ngày tạo' },
                    { id: 'actions', label: 'Thao tác' },
                  ].map((col) => (
                    <Pressable
                      key={col.id}
                      style={styles.dropdownItem}
                      onPress={() => toggleColumn(col.id)}
                    >
                      <View style={[styles.checkbox, visibleColumns[col.id] && styles.checkboxActive]}>
                        {visibleColumns[col.id] && <View style={styles.checkboxInner} />}
                      </View>
                      <Text style={[styles.dropdownText, !visibleColumns[col.id] && styles.dropdownTextInactive]}>
                        {col.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <Pressable
              style={styles.outlineBtn}
              onPress={() => setShowImportModal(true)}
            >
              <Upload size={16} color="#475569" />
              <Text style={styles.outlineBtnText}>Nhập Excel</Text>
            </Pressable>

            <Pressable
              style={[styles.outlineBtn, exporting && styles.btnDisabled]}
              onPress={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#475569" />
              ) : (
                <Download size={16} color="#475569" />
              )}
              <Text style={styles.outlineBtnText}>
                {exporting ? "Đang xuất..." : "Xuất Excel"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Hàng Tiêu đề cột */}
        <View style={styles.tableHeader}>
          {/* Cột Checkbox Select All */}
          <View style={styles.colCheckbox}>
            <Pressable 
              style={[styles.checkbox, paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.has(p.id)) && styles.checkboxActive]} 
              onPress={() => toggleSelectAll(paginatedProducts)}
            >
              {paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.has(p.id)) && <View style={styles.checkboxInner} />}
            </Pressable>
          </View>

          {visibleColumns.name && (
            <Pressable style={[styles.columnHeaderBtn, { flex: 2.5 }]} onPress={() => handleSort("name")}>
              <Text style={styles.columnHeader}>SẢN PHẨM</Text>
              {renderSortIcon("name")}
            </Pressable>
          )}

          {visibleColumns.categories && (
            <Pressable style={[styles.columnHeaderBtn, { flex: 1.5 }]} onPress={() => handleSort("categories")}>
              <Text style={styles.columnHeader}>DANH MỤC</Text>
              {renderSortIcon("categories")}
            </Pressable>
          )}
          
          {visibleColumns.is_active && (
            <Pressable style={[styles.columnHeaderBtn, { flex: 1.2 }]} onPress={() => handleSort("is_active")}>
              <Text style={styles.columnHeader}>TRẠNG THÁI</Text>
              {renderSortIcon("is_active")}
            </Pressable>
          )}

          {visibleColumns.stock && (
            <Pressable style={[styles.columnHeaderBtn, { flex: 0.8 }]} onPress={() => handleSort("stock")}>
              <Text style={styles.columnHeader}>KHO</Text>
              {renderSortIcon("stock")}
            </Pressable>
          )}

          {visibleColumns.price && (
            <Pressable style={[styles.columnHeaderBtn, { flex: 1.2 }]} onPress={() => handleSort("price")}>
              <Text style={styles.columnHeader}>GIÁ</Text>
              {renderSortIcon("price")}
            </Pressable>
          )}

          {visibleColumns.created_at && (
            <Pressable style={[styles.columnHeaderBtn, { flex: 1.2 }]} onPress={() => handleSort("created_at")}>
              <Text style={styles.columnHeader}>NGÀY TẠO</Text>
              {renderSortIcon("created_at")}
            </Pressable>
          )}

          {visibleColumns.actions && (
            <View style={[styles.columnHeaderBtn, { flex: 1.2 }]}>
              <Text style={styles.columnHeader}>THAO TÁC</Text>
            </View>
          )}
        </View>

        {/* Danh sách sản phẩm */}
        {loading ? (
          <ActivityIndicator size="large" color="#10B981" style={{ paddingVertical: 60 }} />
        ) : (
          <View>
            <FlatList
              data={paginatedProducts}
              keyExtractor={(item) => String(item.id)}
              scrollEnabled={false} // Disable internal scroll
              contentContainerStyle={paginatedProducts.length === 0 ? { paddingBottom: 0 } : { paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {searchQuery ? "Không tìm thấy sản phẩm phù hợp." : "Chưa có sản phẩm nào."}
                  </Text>
                </View>
              }
              renderItem={({ item, index }) => {
                const isSelected = selectedIds.has(item.id);
                const totalStock =
                  item.product_variants?.reduce(
                    (sum: number, v: any) => sum + (v.stock || 0),
                    0
                  ) || 0;

                const thumbnail =
                  item.product_images?.find((img: any) => img.is_thumbnail)?.url ||
                  item.product_images?.[0]?.url ||
                  "https://via.placeholder.com/150";

                const categoryName = item.categories?.name_vi || item.categories?.name || "Chưa phân loại";
                const createdAt = new Date(item.created_at).toLocaleDateString("vi-VN");

                const isLastItem = index === paginatedProducts.length - 1;

                return (
                  <AdminDataWrapper 
                    onPress={() => router.push(`/(admin)/products/${item.id}` as any)}
                    style={[styles.tableRow, isLastItem && styles.tableRowLast, isSelected && styles.tableRowSelected]}
                  >
                    {/* Cột Checkbox */}
                    <View style={styles.colCheckbox}>
                      <Pressable 
                        style={[styles.checkbox, isSelected && styles.checkboxActive]} 
                        onPress={() => toggleSelect(item.id)}
                      >
                        {isSelected && <View style={styles.checkboxInner} />}
                      </Pressable>
                    </View>

                    {/* Cột Sản phẩm */}
                    {visibleColumns.name && (
                      <View style={[styles.colProduct, { flex: 2.5 }]}>
                        <Image source={{ uri: thumbnail }} style={styles.productImg} />
                        <View style={styles.infoCol}>
                          <Text style={styles.productName} numberOfLines={2}>
                            {item.name}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Cột Danh mục */}
                    {visibleColumns.categories && (
                      <View style={[styles.colBase, { flex: 1.5 }]}>
                        <Text style={styles.categoryText} numberOfLines={1}>{categoryName}</Text>
                      </View>
                    )}

                    {/* Cột Trạng thái */}
                    {visibleColumns.is_active && (
                      <View style={[styles.colBase, { flex: 1.2 }]}>
                        <View
                          style={[
                            styles.statusBadge,
                            item.is_active ? styles.statusActive : styles.statusInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              item.is_active ? styles.statusActiveText : styles.statusInactiveText,
                            ]}
                          >
                            {item.is_active ? "Đang bán" : "Ngưng bán"}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Cột Kho */}
                    {visibleColumns.stock && (
                      <View style={[styles.colBase, { flex: 0.8 }]}>
                        <Text style={styles.stockText}>{totalStock}</Text>
                      </View>
                    )}

                    {/* Cột Giá */}
                    {visibleColumns.price && (
                      <View style={[styles.colBase, { flex: 1.2 }]}>
                        <Text style={styles.priceText}>
                          {item.price.toLocaleString("vi-VN")} đ
                        </Text>
                      </View>
                    )}

                    {/* Cột Ngày tạo */}
                    {visibleColumns.created_at && (
                      <View style={[styles.colBase, { flex: 1.2 }]}>
                        <Text style={styles.dateText}>{createdAt}</Text>
                      </View>
                    )}

                    {/* Cột Thao tác */}
                    {visibleColumns.actions && (
                      <View style={[styles.actionCol, { flex: 1.2 }]}>
                        <Pressable
                          onPress={() => toggleActiveStatus(item.id, item.is_active)}
                          style={styles.iconBtn}
                        >
                          {item.is_active ? (
                            <Eye size={16} color="#64748B" />
                          ) : (
                            <EyeOff size={16} color="#64748B" />
                          )}
                        </Pressable>

                        <Pressable
                          onPress={() => router.push(`/(admin)/products/${item.id}` as any)}
                          style={styles.iconBtn}
                        >
                          <Edit size={16} color="#64748B" />
                        </Pressable>

                        <Pressable
                          onPress={() => deleteProductPermanently(item.id)}
                          style={styles.iconBtn}
                        >
                          <Trash2 size={16} color="#64748B" />
                        </Pressable>
                      </View>
                    )}
                  </AdminDataWrapper>
                );
              }}
            />

            {/* ── Table Footer (Pagination) ── */}
            <View style={styles.tableFooter}>
              <Text style={styles.footerInfo}>
                Hiển thị {totalResults === 0 ? 0 : startIndex + 1}-{endIndex} trong tổng số {totalResults} kết quả
              </Text>

              <View style={styles.footerRight}>
                <View style={styles.rowsSelectorContainer}>
                  <Pressable 
                    style={styles.rowsSelector} 
                    onPress={() => setShowRowsMenu(!showRowsMenu)}
                  >
                    <Text style={styles.footerLabel}>Số dòng</Text>
                    <View style={styles.selectBox}>
                      <Text style={styles.selectText}>{itemsPerPage}</Text>
                      <ChevronDown size={14} color="#64748B" />
                    </View>
                  </Pressable>

                  {showRowsMenu && (
                    <View style={styles.rowsMenu}>
                      {[10, 20, 50].map((val) => (
                        <Pressable
                          key={val}
                          style={styles.rowsMenuItem}
                          onPress={() => {
                            setItemsPerPage(val);
                            setCurrentPage(1);
                            setShowRowsMenu(false);
                          }}
                        >
                          <Text style={[styles.rowsMenuText, itemsPerPage === val && styles.rowsMenuTextActive]}>
                            {val}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.pagination}>
                  <Pressable
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <Text style={styles.pageBtnText}>Trước</Text>
                  </Pressable>

                  <View style={[styles.pageNumber, styles.pageNumberActive]}>
                    <Text style={styles.pageNumberTextActive}>{currentPage}</Text>
                  </View>

                  <Pressable
                    style={[
                      styles.pageBtn,
                      (currentPage === totalPages || totalPages === 0) && styles.pageBtnDisabled,
                    ]}
                    onPress={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <Text style={styles.pageBtnText}>Sau</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ── Import Modal ───────────────────────── */}
      <ImportExcelModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false);
          fetchProducts();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContainer: { padding: 24, paddingBottom: 100 },

  // Header & Subtitle
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#64748B" },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bulkDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  bulkDeleteText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  addBtn: {
    flexDirection: "row",
    backgroundColor: "#10B981", // Apex primary color
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
    alignItems: "center",
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },

  // Filter Tabs
  filterTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "transparent",
  },
  tabBtnActive: {
    backgroundColor: "#F1F5F9",
  },
  tabText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#0F172A",
    fontWeight: "600",
  },

  // TableCard
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    zIndex: 1,
  },

  // Toolbar
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    gap: 16,
    zIndex: 100, // Đảm bảo dropdown hiện trên cùng
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    maxWidth: 320,
  },
  searchInput: { flex: 1, outlineStyle: "none", fontSize: 14, color: "#0F172A" } as any,

  toolbarActions: {
    flexDirection: "row",
    gap: 12,
  },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  outlineBtnText: { color: "#475569", fontWeight: "500", fontSize: 13 },
  btnDisabled: { opacity: 0.65 },

  // Table Header
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  columnHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },

  // Table Row
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowSelected: {
    backgroundColor: "#F0FDF4", // Very light green for selection
  },

  // Columns Layout
  colCheckbox: {
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  colProduct: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 16,
  },
  colBase: {
    justifyContent: "center",
    paddingRight: 16,
  },

  // Product Info
  productImg: { width: 44, height: 44, borderRadius: 6, backgroundColor: "#F1F5F9" },
  infoCol: { flex: 1, justifyContent: "center" },
  productName: { fontSize: 14, fontWeight: "600", color: "#0F172A", lineHeight: 20 },

  categoryText: { fontSize: 13, color: "#64748B" },
  priceText: { fontSize: 14, color: "#334155", fontWeight: "500" },
  stockText: { fontSize: 14, color: "#334155" },
  dateText: { fontSize: 13, color: "#64748B" },

  // Status Badge
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusActive: { backgroundColor: "#DCFCE7" },
  statusInactive: { backgroundColor: "#F1F5F9" },
  statusText: { fontSize: 12, fontWeight: "600" },
  statusActiveText: { color: "#166534" },
  statusInactiveText: { color: "#475569" },

  // Actions
  actionCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  // Table Footer (Pagination)
  tableFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  footerInfo: {
    fontSize: 13,
    color: "#64748B",
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  rowsSelectorContainer: {
    position: "relative",
    zIndex: 10,
  },
  rowsSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowsMenu: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rowsMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rowsMenuText: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
  },
  rowsMenuTextActive: {
    color: "#10B981",
    fontWeight: "600",
  },
  footerLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectText: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "500",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  pageNumber: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  pageNumberActive: {
    backgroundColor: "#059669",
  },
  pageNumberTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },

  // Column Toggle Dropdown
  columnsDropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    backgroundColor: "#FFFFFF", // Đảm bảo nền trắng đục
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 8,
    width: 200,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 999,
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 10,
  },
  dropdownText: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "500",
  },
  dropdownTextInactive: {
    color: "#94A3B8",
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    borderColor: "#10B981",
    backgroundColor: "#10B981",
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor: "#FFFFFF",
  },

  // Empty state
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
  },
});