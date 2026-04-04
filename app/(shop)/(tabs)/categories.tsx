import { FilterModal } from "@/src/components/search/FilterModal";
import { supabase } from "@/src/lib/supabase";
import { calculateDiscountedPrice } from "@/src/services/product";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { ArrowLeft, Check, Filter, Grid, Heart, List, Minus, Plus, Search, ShoppingBag, ShoppingCart, X } from "lucide-react-native";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

interface Category {
  id: number;
  name: string;
  name_vi: string;
  image_url: string | null;
  parent_id: number | null;
  display_order: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  images: string[];
  created_at: string;
  category_id: number;
  variants?: any;
  finalPrice?: number;
  is_new?: boolean;
  is_sale?: boolean;
  is_out_of_stock?: boolean;
}

const SORT_OPTIONS = [
  { id: "newest", label: "Mới nhất", icon: "new-releases" },
  { id: "price_low_high", label: "Giá: Thấp đến Cao", icon: "vertical-align-top" },
  { id: "price_high_low", label: "Giá: Cao đến Thấp", icon: "vertical-align-bottom" },
  { id: "best_selling", label: "Bán chạy nhất", icon: "trending-up" },
];

export default function CategoriesScreen() {
  const router = useRouter();

  // States cho Danh mục
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedRootId, setSelectedRootId] = useState<number | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);

  // States cho Sản phẩm
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [viewType, setViewType] = useState<"grid" | "list">("grid");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isSortVisible, setIsSortVisible] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [activeFilters, setActiveFilters] = useState<any>(null);

  // Quick Add State
  const [selectedQuickProduct, setSelectedQuickProduct] = useState<Product | null>(null);
  const [quickSize, setQuickSize] = useState<string | null>(null);
  const [quickColor, setQuickColor] = useState<any>(null);
  const [quickQty, setQuickQty] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  // Wishlist State
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());

  // Cart Count State
  const [cartCount, setCartCount] = useState(0);

  // Infinite Scroll
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  useEffect(() => {
    fetchCategories();
    fetchWishlist();
  }, []);

  // Hàm lấy tổng số lượng sản phẩm trong giỏ
  const fetchCartCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCartCount(0);
        return;
      }

      const { data, error } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("user_id", user.id);

      if (error) throw error;

      const total = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
      setCartCount(total);
    } catch (error) {
      console.error("Lỗi lấy số lượng giỏ hàng:", error);
    }
  };

  // Cập nhật mỗi khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      fetchCartCount();
    }, [])
  );

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setAllCategories(data || []);

      const roots = data?.filter(cat => cat.parent_id === null) || [];
      if (roots.length > 0) {
        setSelectedRootId(roots[0].id);
      }
    } catch (error) {
      console.error("Lỗi lấy danh mục:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("wishlist").select("product_id").eq("user_id", user.id);
      if (data) {
        setWishlistIds(new Set(data.map(i => i.product_id)));
      }
    } catch (e) { }
  };

  const toggleWishlist = async (productId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để lưu sản phẩm yêu thích");
        return;
      }

      const isFav = wishlistIds.has(productId);
      const newIds = new Set(wishlistIds);
      if (isFav) {
        newIds.delete(productId);
        await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", productId);
      } else {
        newIds.add(productId);
        await supabase.from("wishlist").insert([{ user_id: user.id, product_id: productId }]);
      }
      setWishlistIds(newIds);
    } catch (err) {
      console.error("Quick wishlist error:", err);
    }
  };

  const fetchProducts = async (isNewSearch = false) => {
    if (!selectedSubId) return;

    // Ngăn chặn gọi đè lúc đang tải
    if (!isNewSearch && (!hasMore || loadingProducts)) return;

    try {
      setLoadingProducts(true);

      if (isNewSearch) {
        setPage(0);
        setProducts([]);
        setHasMore(true);
      }

      const currentPage = isNewSearch ? 0 : page;

      // Lấy thêm danh sách ID của các danh mục con (Level 3) nằm dưới danh mục hiện tại (Level 2)
      const childCategoryIds = allCategories
        .filter(cat => cat.parent_id === selectedSubId)
        .map(cat => cat.id);

      const categoryIdsToQuery = [selectedSubId, ...childCategoryIds];

      let query = supabase
        .from("products")
        .select(`
          *,
          product_discounts (
            id, discount_type, discount_value, is_active, start_date, end_date
          ),
          product_variants (
            stock
          )
        `)
        .in("category_id", categoryIdsToQuery)
        .eq("is_active", true);

      // Sắp xếp ưu tiên
      const sortToUse = activeFilters?.sortBy || sortBy;
      if (sortToUse === "price_low_high") query = query.order("price", { ascending: true });
      else if (sortToUse === "price_high_low") query = query.order("price", { ascending: false });
      else query = query.order("created_at", { ascending: false }); // including "newest" and "best_selling" wrapper

      const { data, error } = await query
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      let processed = (data || []).map(item => {
        const prod = calculateDiscountedPrice(item);
        const totalStock = item.product_variants?.reduce((acc: number, v: any) => acc + (v.stock || 0), 0) || 0;
        const isNew = new Date(item.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const isSale = item.product_discounts && item.product_discounts.length > 0;

        return {
          ...prod,
          is_new: isNew,
          is_sale: isSale,
          is_out_of_stock: totalStock === 0
        };
      });

      // Filter theo Modal (Size, Color)
      if (activeFilters) {
        if (activeFilters.size) {
          processed = processed.filter((p: any) => p.variants?.sizes?.includes(activeFilters.size));
        }
        if (activeFilters.color) {
          processed = processed.filter((p: any) =>
            p.variants?.options?.some((opt: any) =>
              opt.color.toLowerCase() === activeFilters.color.toLowerCase()
            )
          );
        }
      }

      if (isNewSearch) {
        setProducts(processed);
      } else {
        // Fix duplicate key: Lọc bỏ các sản phẩm trùng lặp lỡ bị fetch chồng chéo
        setProducts(prev => {
          const newItems = processed.filter(p => !prev.some(existing => existing.id === p.id));
          return [...prev, ...newItems];
        });
      }

      setHasMore((data || []).length === PAGE_SIZE);
      setPage(currentPage + 1);
    } catch (error) {
      console.error("Lỗi lấy sản phẩm:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (selectedSubId) fetchProducts(true);
  }, [selectedSubId, sortBy, activeFilters]);

  const addToCart = async () => {
    if (!selectedQuickProduct) return;

    const hasSizes = selectedQuickProduct.variants?.sizes?.length > 0;
    const hasColors = selectedQuickProduct.variants?.options?.length > 0;

    if ((hasSizes && !quickSize) || (hasColors && !quickColor)) {
      Alert.alert("Thông báo", "Vui lòng chọn đầy đủ phân loại");
      return;
    }

    try {
      setAddingToCart(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để mua sắm");
        return;
      }

      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", selectedQuickProduct.id)
        .eq("size", quickSize || null)
        .eq("color", quickColor?.color || null)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + quickQty, updated_at: new Date() })
          .eq("id", existing.id);
      } else {
        await supabase.from("cart_items").insert([{
          user_id: user.id,
          product_id: selectedQuickProduct.id,
          quantity: quickQty,
          size: quickSize || null,
          color: quickColor?.color || null,
          is_selected: true
        }]);
      }

      // Cập nhật lại số lượng badge sau khi thêm thành công
      fetchCartCount();

      Alert.alert("Thành công", "Đã thêm vào giỏ hàng");
      setSelectedQuickProduct(null);
    } catch (e) {
      console.error("Cart error:", e);
    } finally {
      setAddingToCart(false);
    }
  };

  const rootCategories = allCategories.filter(cat => cat.parent_id === null);
  const subCategories = selectedRootId
    ? allCategories.filter(cat => cat.parent_id === selectedRootId)
    : [];

  const getBreadcrumbs = () => {
    const root = rootCategories.find(c => c.id === selectedRootId);
    const sub = subCategories.find(c => c.id === selectedSubId);
    let path = "Trang chủ";
    if (root) path += ` > ${root.name_vi || root.name}`;
    if (sub) path += ` > ${sub.name_vi || sub.name}`;
    return path;
  };

  const renderRootItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.rootTab, selectedRootId === item.id && styles.rootTabActive]}
      onPress={() => {
        setSelectedRootId(item.id);
        setSelectedSubId(null);
      }}
    >
      <Text style={[styles.rootTabText, selectedRootId === item.id && styles.rootTabTextActive]}>
        {item.name_vi || item.name}
      </Text>
      {selectedRootId === item.id && <View style={styles.rootTabIndicator} />}
    </TouchableOpacity>
  );

  const renderSubCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.subCatCard}
      onPress={() => setSelectedSubId(item.id)}
    >
      <Image source={{ uri: item.image_url || "https://via.placeholder.com/150" }} style={styles.subCatImg} />
      <Text style={styles.subCatName} numberOfLines={2}>{item.name_vi || item.name}</Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }: { item: Product }) => {
    const isGrid = viewType === "grid";
    const isFav = wishlistIds.has(item.id);

    return (
      <TouchableOpacity
        style={isGrid ? styles.productGridCard : styles.productListCard}
        onPress={() => router.push({ pathname: "/(shop)/product/[id]", params: { id: item.id } } as any)}
      >
        <View style={isGrid ? styles.productGridImgWrapper : styles.productListImgWrapper}>
          <Image source={{ uri: item.images?.[0] || "https://via.placeholder.com/300" }} style={styles.productImg} />
          <View style={styles.badgeContainer}>
            {item.is_new && <View style={[styles.badgeItem, { backgroundColor: "#10B981" }]}><Text style={styles.badgeTextSmall}>NEW</Text></View>}
            {item.is_sale && <View style={[styles.badgeItem, { backgroundColor: "#EF4444" }]}><Text style={styles.badgeTextSmall}>SALE</Text></View>}
            {item.is_out_of_stock && <View style={[styles.badgeItem, { backgroundColor: "#6B7280" }]}><Text style={styles.badgeTextSmall}>HẾT HÀNG</Text></View>}
          </View>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => toggleWishlist(item.id)}
            >
              <Heart size={18} color={isFav ? "#EF4444" : "#111"} fill={isFav ? "#EF4444" : "transparent"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setSelectedQuickProduct(item);
                setQuickSize(null);
                setQuickColor(null);
                setQuickQty(1);
              }}
            >
              <ShoppingCart size={18} color="#111" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={isGrid ? styles.productGridInfo : styles.productListInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>{(item.finalPrice || item.price).toLocaleString('vi-VN')} đ</Text>
            {item.is_sale && <Text style={styles.oldPrice}>{item.price.toLocaleString('vi-VN')} đ</Text>}
          </View>
          {!isGrid && <Text style={styles.productDesc} numberOfLines={2}>Khám phá ngay sản phẩm cao cấp, chất lượng đảm bảo...</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {selectedSubId && (
            <TouchableOpacity onPress={() => setSelectedSubId(null)} style={{ marginRight: 15 }}>
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>{selectedSubId ? "Sản phẩm" : "Danh mục"}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => router.push("/(shop)/search" as any)} style={styles.iconBtn}>
            <Search size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(shop)/cart" as any)} style={styles.iconBtn}>
            <ShoppingBag size={22} color="#000" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartCount > 99 ? "99+" : cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {!selectedSubId && (
        <View style={styles.rootTabsContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={rootCategories}
            keyExtractor={item => item.id.toString()}
            renderItem={renderRootItem}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        </View>
      )}

      <View style={styles.breadcrumbContainer}>
        <Text style={styles.breadcrumbText}>{getBreadcrumbs()}</Text>
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#0055FF" /></View>
        ) : !selectedSubId ? (
          <FlatList
            data={subCategories}
            keyExtractor={item => item.id.toString()}
            renderItem={renderSubCategoryItem}
            numColumns={2}
            contentContainerStyle={styles.subCatList}
            ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>Chưa có danh mục con</Text></View>}
          />
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.toolBar}>
              <View style={styles.toolBarLeft}>
                <TouchableOpacity style={styles.toolBtn} onPress={() => setIsFilterVisible(true)}>
                  <Filter size={18} color="#000" /><Text style={styles.toolBtnText}>Lọc</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => setIsSortVisible(true)}>
                  <MaterialIcons name="sort" size={20} color="#000" /><Text style={styles.toolBtnText}>Sắp xếp</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.toolBarRight}>
                <TouchableOpacity onPress={() => setViewType("grid")} style={styles.viewToggleBtn}>
                  <Grid size={18} color={viewType === "grid" ? "#0055FF" : "#9CA3AF"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setViewType("list")} style={styles.viewToggleBtn}>
                  <List size={18} color={viewType === "list" ? "#0055FF" : "#9CA3AF"} />
                </TouchableOpacity>
              </View>
            </View>
            <FlatList
              data={products}
              keyExtractor={item => item.id.toString()}
              renderItem={renderProductItem}
              numColumns={viewType === "grid" ? 2 : 1}
              key={viewType}
              contentContainerStyle={styles.productList}
              onEndReached={() => fetchProducts()}
              onEndReachedThreshold={0.5}
              ListFooterComponent={loadingProducts ? <ActivityIndicator size="small" color="#0055FF" style={{ marginVertical: 20 }} /> : null}
              ListEmptyComponent={!loadingProducts ? <View style={styles.emptyContainer}><Text style={styles.emptyText}>Không tìm thấy sản phẩm</Text></View> : null}
            />
          </View>
        )}
      </View>

      {/* Sort Modal */}
      <Modal visible={isSortVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsSortVisible(false)}>
          <View style={styles.sortModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sắp xếp theo</Text>
              <TouchableOpacity onPress={() => setIsSortVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
            </View>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.sortOpt, sortBy === opt.id && styles.sortOptActive]}
                onPress={() => { setSortBy(opt.id); setIsSortVisible(false); }}
              >
                <MaterialIcons name={opt.icon as any} size={24} color={sortBy === opt.id ? "#0055FF" : "#4B5563"} />
                <Text style={[styles.sortOptText, sortBy === opt.id && styles.sortOptTextActive]}>{opt.label}</Text>
                {sortBy === opt.id && <Ionicons name="checkmark-circle" size={24} color="#0055FF" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Quick Add Modal */}
      <Modal visible={!!selectedQuickProduct} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedQuickProduct(null)}>
          <View style={styles.quickAddContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tùy chọn sản phẩm</Text>
              <TouchableOpacity onPress={() => setSelectedQuickProduct(null)}><X size={24} color="#000" /></TouchableOpacity>
            </View>

            {selectedQuickProduct && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.quickProdInfo}>
                  <Image source={{ uri: selectedQuickProduct.images?.[0] }} style={styles.quickProdImg} />
                  <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.quickProdName} numberOfLines={2}>{selectedQuickProduct.name}</Text>
                    <Text style={styles.quickProdPrice}>{(selectedQuickProduct.finalPrice || selectedQuickProduct.price).toLocaleString('vi-VN')} đ</Text>
                  </View>
                </View>

                {selectedQuickProduct.variants?.sizes?.length > 0 && (
                  <View style={styles.variantSection}>
                    <Text style={styles.variantLabel}>Kích thước</Text>
                    <View style={styles.variantGrid}>
                      {selectedQuickProduct.variants.sizes.map((s: string) => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.sizeBtn, quickSize === s && styles.variantBtnActive]}
                          onPress={() => setQuickSize(s)}
                        >
                          <Text style={[styles.variantBtnText, quickSize === s && styles.variantBtnTextActive]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {selectedQuickProduct.variants?.options?.length > 0 && (
                  <View style={styles.variantSection}>
                    <Text style={styles.variantLabel}>Màu sắc</Text>
                    <View style={styles.variantGrid}>
                      {selectedQuickProduct.variants.options.map((o: any) => (
                        <TouchableOpacity
                          key={o.color}
                          style={[styles.colorCircle, { backgroundColor: o.hex }, quickColor?.color === o.color && styles.colorCircleActive]}
                          onPress={() => setQuickColor(o)}
                        >
                          {quickColor?.color === o.color && <Check size={16} color={o.hex === "#FFFFFF" ? "#000" : "#fff"} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.qtySection}>
                  <Text style={styles.variantLabel}>Số lượng</Text>
                  <View style={styles.qtyStepper}>
                    <TouchableOpacity onPress={() => setQuickQty(Math.max(1, quickQty - 1))} style={styles.qtyBtn}><Minus size={20} color="#000" /></TouchableOpacity>
                    <Text style={styles.qtyText}>{quickQty}</Text>
                    <TouchableOpacity onPress={() => setQuickQty(quickQty + 1)} style={styles.qtyBtn}><Plus size={20} color="#000" /></TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.addToCartBtn} onPress={addToCart} disabled={addingToCart}>
                  {addingToCart ? <ActivityIndicator color="#fff" /> : <Text style={styles.addToCartText}>Thêm vào giỏ hàng</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <FilterModal
        isVisible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        onApply={(f) => {
          console.log("Filters applied:", f);
          setActiveFilters(f);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#000" },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  iconBtn: { marginLeft: 15, position: "relative" },
  cartBadge: { position: "absolute", top: -5, right: -5, backgroundColor: "#FF3B30", width: 16, height: 16, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  rootTabsContainer: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6", paddingBottom: 5 },
  rootTab: { paddingHorizontal: 20, paddingVertical: 10, marginRight: 10, position: 'relative' },
  rootTabActive: {},
  rootTabText: { fontSize: 16, fontWeight: "600", color: "#9CA3AF" },
  rootTabTextActive: { color: "#000", fontWeight: "800" },
  rootTabIndicator: { position: 'absolute', bottom: 0, left: 20, right: 20, height: 3, backgroundColor: '#0055FF', borderRadius: 3 },
  breadcrumbContainer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#F9FAFB' },
  breadcrumbText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  subCatList: { padding: 15 },
  subCatCard: { flex: 1, margin: 5, backgroundColor: '#fff', borderRadius: 15, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  subCatImg: { width: width * 0.35, height: width * 0.35, borderRadius: 12, marginBottom: 10, backgroundColor: '#F3F4F6' },
  subCatName: { fontSize: 14, fontWeight: "700", color: "#111", textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  toolBarLeft: { flexDirection: 'row', gap: 15 },
  toolBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 },
  toolBtnText: { fontSize: 14, fontWeight: '600', color: '#000' },
  toolBarRight: { flexDirection: 'row', gap: 10 },
  viewToggleBtn: { padding: 6, backgroundColor: '#F3F4F6', borderRadius: 8 },
  productList: { padding: 10 },
  productGridCard: { flex: 1, margin: 5, backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  productListCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, marginBottom: 15, padding: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  productGridImgWrapper: { width: '100%', aspectRatio: 0.85, position: 'relative' },
  productListImgWrapper: { width: 110, height: 130, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  productImg: { width: '100%', height: '100%', backgroundColor: '#F5F5F5' },
  badgeContainer: { position: 'absolute', top: 8, left: 8, gap: 4 },
  badgeItem: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeTextSmall: { color: '#fff', fontSize: 9, fontWeight: '900' },
  quickActions: { position: 'absolute', bottom: 8, right: 8, gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.9)', justifyContent: 'center', alignItems: 'center' },
  productGridInfo: { padding: 12 },
  productListInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  productName: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productPrice: { fontSize: 16, fontWeight: '800', color: '#000' },
  oldPrice: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through' },
  productDesc: { fontSize: 12, color: '#6B7280', marginTop: 8, lineHeight: 18 },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: '#9CA3AF' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sortModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#000' },
  sortOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sortOptActive: { backgroundColor: '#F0F7FF', borderRadius: 15, paddingHorizontal: 15, borderBottomWidth: 0 },
  sortOptText: { flex: 1, fontSize: 16, marginLeft: 15, color: '#4B5563', fontWeight: '600' },
  sortOptTextActive: { color: '#0055FF', fontWeight: '800' },

  quickAddContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: height * 0.8 },
  quickProdInfo: { flexDirection: 'row', marginBottom: 25, alignItems: 'center' },
  quickProdImg: { width: 80, height: 80, borderRadius: 15, backgroundColor: '#F3F4F6' },
  quickProdName: { fontSize: 16, fontWeight: '700', color: '#111' },
  quickProdPrice: { fontSize: 18, fontWeight: '800', color: '#0055FF', marginTop: 5 },
  variantSection: { marginBottom: 20 },
  variantLabel: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12 },
  variantGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sizeBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: 'transparent' },
  variantBtnActive: { backgroundColor: '#ECF3FF', borderColor: '#0055FF' },
  variantBtnText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  variantBtnTextActive: { color: '#0055FF' },
  colorCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  colorCircleActive: { borderWidth: 3, borderColor: '#0055FF' },
  qtySection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  qtyStepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 15, padding: 5 },
  qtyBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  qtyText: { paddingHorizontal: 15, fontSize: 18, fontWeight: '700', color: '#000' },
  addToCartBtn: { backgroundColor: '#0055FF', height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: "#0055FF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  addToCartText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
