import { supabase } from "@/src/lib/supabase";
import { calculateDiscountedPrice } from "@/src/services/product";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check, Grid, Heart, List, Minus, Plus, Search, ShoppingBag, ShoppingCart, X } from "lucide-react-native";
import { useSupabaseRealtime } from "@/src/services/useSupabaseRealtime";
import React, { useEffect, useState, useCallback } from "react";
import { Platform, useWindowDimensions } from "react-native";
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

// Sort options dùng cho chips ngang
const SORT_CHIPS = [
  { id: "newest", label: "Mới nhất" },
  { id: "price_low_high", label: "Giá tăng dần" },
  { id: "price_high_low", label: "Giá giảm dần" },
  { id: "best_selling", label: "Bán chạy" },
];

export default function CategoriesScreen() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();

  // States cho Danh mục
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedRootId, setSelectedRootId] = useState<number | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  // Chip lọc danh mục cấp 3 (con của selectedSubId)
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  // States cho Sản phẩm
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [viewType, setViewType] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("newest");

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

  // --- REALTIME HOOKS ---
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useSupabaseRealtime({
    table: 'products',
    onUpdate: (payload) => {
      if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          setProducts(prev => prev.filter(p => p.id !== deletedId));
        }
      } else {
        setRefreshTrigger(prev => prev + 1);
      }
    }
  });
  useSupabaseRealtime({
    table: 'categories',
    onUpdate: () => setRefreshTrigger(prev => prev + 1)
  });
  useSupabaseRealtime({
    table: 'cart_items',
    onUpdate: () => setRefreshTrigger(prev => prev + 1)
  });
  useSupabaseRealtime({
    table: 'wishlist',
    onUpdate: () => setRefreshTrigger(prev => prev + 1)
  });

  useEffect(() => {
    fetchCategories();
    fetchWishlist();
  }, [refreshTrigger]);

  const fetchCartCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCartCount(0); return; }
      const { data, error } = await supabase
        .from("cart_items").select("quantity").eq("user_id", user.id);
      if (error) throw error;
      const total = (data || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
      setCartCount(total);
    } catch (error) {
      console.error("Lỗi lấy số lượng giỏ hàng:", error);
    }
  };

  useFocusEffect(
    useCallback(() => { fetchCartCount(); }, [refreshTrigger])
  );

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories").select("*").eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      setAllCategories(data || []);
    } catch (error) {
      console.error("Lỗi lấy danh mục:", error);
    } finally {
      setLoading(false);
    }
  };

  // Logic đồng bộ categoryId từ banner/route vào state selection
  useEffect(() => {
    if (!allCategories.length) return;

    // Trường hợp 1: Không có categoryId -> mặc định chọn root đầu tiên
    if (!categoryId) {
      const roots = allCategories.filter(cat => cat.parent_id === null);
      if (roots.length > 0 && selectedRootId === null) {
        setSelectedRootId(roots[0].id);
      }
      return;
    }

    // Trường hợp 2: Có categoryId từ banner
    const targetId = parseInt(categoryId, 10);
    const target = allCategories.find(cat => cat.id === targetId);
    if (!target) return;

    if (target.parent_id === null) {
      // Cấp 1 (Root)
      setSelectedRootId(target.id);
      setSelectedSubId(null);
      setSelectedChildId(null);
    } else {
      const parent = allCategories.find(cat => cat.id === target.parent_id);
      if (parent && parent.parent_id === null) {
        // Cấp 2 (Sub)
        setSelectedRootId(parent.id);
        setSelectedSubId(target.id);
        setSelectedChildId(null);
      } else if (parent) {
        // Cấp 3 (Child)
        const grandParent = allCategories.find(cat => cat.id === parent.parent_id);
        if (grandParent) setSelectedRootId(grandParent.id);
        setSelectedSubId(parent.id);
        setSelectedChildId(target.id);
      }
    }
  }, [categoryId, allCategories]);

  const fetchWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("wishlist").select("product_id").eq("user_id", user.id);
      if (data) setWishlistIds(new Set(data.map(i => i.product_id)));
    } catch (e) { }
  };

  const toggleWishlist = async (productId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert("Thông báo", "Vui lòng đăng nhập để lưu sản phẩm yêu thích"); return; }
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
    if (!isNewSearch && (!hasMore || loadingProducts)) return;

    try {
      setLoadingProducts(true);
      if (isNewSearch) { setPage(0); setProducts([]); setHasMore(true); }
      const currentPage = isNewSearch ? 0 : page;

      // Nếu có chip cấp 3 được chọn, chỉ lọc theo nó
      // Nếu không, lấy selectedSubId + tất cả con của nó
      let categoryIdsToQuery: number[];
      if (selectedChildId) {
        categoryIdsToQuery = [selectedChildId];
      } else {
        const childCategoryIds = allCategories
          .filter(cat => cat.parent_id === selectedSubId)
          .map(cat => cat.id);
        categoryIdsToQuery = [selectedSubId, ...childCategoryIds];
      }

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

      if (sortBy === "price_low_high") query = query.order("price", { ascending: true });
      else if (sortBy === "price_high_low") query = query.order("price", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      const { data, error } = await query
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);
      if (error) throw error;

      const processed = (data || []).map(item => {
        const prod = calculateDiscountedPrice(item);
        const totalStock = item.product_variants?.reduce((acc: number, v: any) => acc + (v.stock || 0), 0) || 0;
        const isNew = new Date(item.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const isSale = item.product_discounts && item.product_discounts.length > 0;
        return { ...prod, is_new: isNew, is_sale: isSale, is_out_of_stock: totalStock === 0 };
      });

      if (isNewSearch) {
        setProducts(processed);
      } else {
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

  // Đồng bộ sản phẩm khi selection thay đổi
  useEffect(() => {
    if (selectedSubId) fetchProducts(true);
  }, [selectedSubId, sortBy, selectedChildId, refreshTrigger]);

  const addToCart = async () => {
    if (!selectedQuickProduct) return;
    const hasSizes = selectedQuickProduct.variants?.sizes?.length > 0;
    const hasColors = selectedQuickProduct.variants?.options?.length > 0;
    if ((hasSizes && !quickSize) || (hasColors && !quickColor)) {
      Alert.alert("Thông báo", "Vui lòng chọn đầy đủ phân loại"); return;
    }
    try {
      setAddingToCart(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert("Thông báo", "Vui lòng đăng nhập để mua sắm"); return; }
      const { data: existing } = await supabase
        .from("cart_items").select("id, quantity")
        .eq("user_id", user.id).eq("product_id", selectedQuickProduct.id)
        .eq("size", quickSize || null).eq("color", quickColor?.color || null).maybeSingle();
      if (existing) {
        await supabase.from("cart_items")
          .update({ quantity: existing.quantity + quickQty, updated_at: new Date() })
          .eq("id", existing.id);
      } else {
        await supabase.from("cart_items").insert([{
          user_id: user.id, product_id: selectedQuickProduct.id,
          quantity: quickQty, size: quickSize || null,
          color: quickColor?.color || null, is_selected: true
        }]);
      }
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

  // Danh mục cấp 3 (con của selectedSubId) để hiển thị chip ngang
  const childCategories = selectedSubId
    ? allCategories.filter(cat => cat.parent_id === selectedSubId)
    : [];

  const getBreadcrumbs = () => {
    const root = rootCategories.find(c => c.id === selectedRootId);
    const sub = subCategories.find(c => c.id === selectedSubId);
    const child = childCategories.find(c => c.id === selectedChildId);
    let path = "Trang chủ";
    if (root) path += ` > ${root.name_vi || root.name}`;
    if (sub) path += ` > ${sub.name_vi || sub.name}`;
    if (child) path += ` > ${child.name_vi || child.name}`;
    return path;
  };

  // ─── Renders ─────────────────────────────────────────────────────────────────

  const renderRootItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.rootTab, selectedRootId === item.id && styles.rootTabActive]}
      onPress={() => { 
        setSelectedRootId(item.id); 
        setSelectedSubId(null); 
        setSelectedChildId(null);
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
      onPress={() => {
        setSelectedSubId(item.id);
        setSelectedChildId(null);
      }}
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
            <TouchableOpacity style={styles.actionBtn} onPress={() => toggleWishlist(item.id)}>
              <Heart size={18} color={isFav ? "#EF4444" : "#111"} fill={isFav ? "#EF4444" : "transparent"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setSelectedQuickProduct(item); setQuickSize(null); setQuickColor(null); setQuickQty(1); }}
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

  // ─── Horizontal Chips Bar ─────────────────────────────────────────────────────
  // Hiển thị khi đang xem sản phẩm (selectedSubId != null)
  const renderChipsBar = () => {
    if (!selectedSubId) return null;

    return (
      <View>
        {/* Nếu có danh mục cấp 3 thì hiện chips lọc danh mục */}
        {childCategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScrollView}
            contentContainerStyle={styles.chipsContainer}
          >
            {/* Chip "Tất cả" */}
            <TouchableOpacity
              style={[styles.chip, selectedChildId === null && styles.chipActive]}
              onPress={() => setSelectedChildId(null)}
            >
              <Text style={[styles.chipText, selectedChildId === null && styles.chipTextActive]}>
                Tất cả
              </Text>
            </TouchableOpacity>

            {childCategories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, selectedChildId === cat.id && styles.chipActive]}
                onPress={() => setSelectedChildId(cat.id)}
              >
                <Text style={[styles.chipText, selectedChildId === cat.id && styles.chipTextActive]}>
                  {cat.name_vi || cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Toolbar: Sort chips + View toggle */}
        <View style={styles.toolBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortChipsContainer}
          >
            {SORT_CHIPS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.sortChip, sortBy === opt.id && styles.sortChipActive]}
                onPress={() => setSortBy(opt.id)}
              >
                <Text style={[styles.sortChipText, sortBy === opt.id && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* View toggle */}
          <View style={styles.viewToggleGroup}>
            <TouchableOpacity onPress={() => setViewType("grid")} style={styles.viewToggleBtn}>
              <Grid size={18} color={viewType === "grid" ? "#0055FF" : "#9CA3AF"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewType("list")} style={styles.viewToggleBtn}>
              <List size={18} color={viewType === "list" ? "#0055FF" : "#9CA3AF"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const { width: winWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && winWidth >= 1024;

  // ═══════════════════════════════ WEB LAYOUT ═══════════════════════════════
  if (isWeb) {
    const selectedRootCat = rootCategories.find(c => c.id === selectedRootId);
    const selectedSubCat = subCategories.find(c => c.id === selectedSubId);

    return (
      <View style={webS.root}>
        {/* ── Left Sidebar: Root categories ── */}
        <View style={webS.sidebar}>
          <Text style={webS.sidebarTitle}>Danh mục</Text>
          {rootCategories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[webS.rootItem, selectedRootId === cat.id && webS.rootItemActive]}
              onPress={() => { setSelectedRootId(cat.id); setSelectedSubId(null); setSelectedChildId(null); }}
              activeOpacity={0.75}
            >
              {cat.image_url && (
                <Image source={{ uri: cat.image_url }} style={webS.rootItemImg} />
              )}
              <Text style={[webS.rootItemText, selectedRootId === cat.id && webS.rootItemTextActive]}>
                {cat.name_vi || cat.name}
              </Text>
              {selectedRootId === cat.id && <View style={webS.rootItemDot} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Center: Sub-categories or Product grid ── */}
        <View style={webS.main}>
          {/* Breadcrumb */}
          <View style={webS.breadcrumb}>
            <Text style={webS.breadcrumbText}>{getBreadcrumbs()}</Text>
          </View>

          {!selectedSubId ? (
            // Sub-category grid
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={webS.sectionHeading}>
                {selectedRootCat?.name_vi || selectedRootCat?.name || 'Danh mục'}
              </Text>
              <View style={webS.subGrid}>
                {subCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={webS.subCard}
                    activeOpacity={0.8}
                    onPress={() => { setSelectedSubId(cat.id); setSelectedChildId(null); }}
                  >
                    <Image
                      source={{ uri: cat.image_url || 'https://via.placeholder.com/200' }}
                      style={webS.subCardImg}
                      resizeMode="cover"
                    />
                    <View style={webS.subCardInfo}>
                      <Text style={webS.subCardName}>{cat.name_vi || cat.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            // Product list view
            <View style={{ flex: 1 }}>
              {/* Sub-cat chips + sort toolbar */}
              <View style={webS.toolbar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={webS.chipRow}>
                  <TouchableOpacity
                    style={[webS.chip, selectedChildId === null && webS.chipActive]}
                    onPress={() => setSelectedChildId(null)}
                  >
                    <Text style={[webS.chipText, selectedChildId === null && webS.chipTextActive]}>Tất cả</Text>
                  </TouchableOpacity>
                  {childCategories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[webS.chip, selectedChildId === cat.id && webS.chipActive]}
                      onPress={() => setSelectedChildId(cat.id)}
                    >
                      <Text style={[webS.chipText, selectedChildId === cat.id && webS.chipTextActive]}>
                        {cat.name_vi || cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={webS.sortRow}>
                  {SORT_CHIPS.map(opt => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[webS.sortBtn, sortBy === opt.id && webS.sortBtnActive]}
                      onPress={() => setSortBy(opt.id)}
                    >
                      <Text style={[webS.sortBtnText, sortBy === opt.id && webS.sortBtnTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Product grid header */}
              <View style={webS.gridHeader}>
                <Text style={webS.gridHeading}>
                  {selectedSubCat?.name_vi || selectedSubCat?.name}
                  <Text style={webS.gridCount}>  ({products.length} sản phẩm)</Text>
                </Text>
                <View style={webS.viewToggle}>
                  <TouchableOpacity style={[webS.toggleBtn, viewType === 'grid' && webS.toggleBtnActive]} onPress={() => setViewType('grid')}>
                    <Grid size={16} color={viewType === 'grid' ? '#0055FF' : '#6B7280'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[webS.toggleBtn, viewType === 'list' && webS.toggleBtnActive]} onPress={() => setViewType('list')}>
                    <List size={16} color={viewType === 'list' ? '#0055FF' : '#6B7280'} />
                  </TouchableOpacity>
                </View>
              </View>

              {loadingProducts && products.length === 0 ? (
                <View style={webS.loadingBox}><ActivityIndicator size="large" color="#0055FF" /></View>
              ) : (
                <FlatList
                  data={products}
                  keyExtractor={item => item.id.toString()}
                  numColumns={viewType === 'grid' ? 4 : 1}
                  key={viewType === 'grid' ? 'web-grid' : 'web-list'}
                  contentContainerStyle={webS.productGrid}
                  columnWrapperStyle={viewType === 'grid' ? webS.columnWrapper : undefined}
                  onEndReached={() => fetchProducts()}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={loadingProducts ? <ActivityIndicator size="small" color="#0055FF" style={{ marginVertical: 20 }} /> : null}
                  ListEmptyComponent={
                    !loadingProducts ? (
                      <View style={webS.emptyBox}>
                        <ShoppingBag size={48} color="#E5E7EB" />
                        <Text style={webS.emptyText}>Không tìm thấy sản phẩm</Text>
                      </View>
                    ) : null
                  }
                  renderItem={({ item }) => {
                    const isFav = wishlistIds.has(item.id);
                    if (viewType === 'list') {
                      return (
                        <TouchableOpacity
                          style={webS.listCard}
                          activeOpacity={0.8}
                          onPress={() => router.push({ pathname: '/(shop)/product/[id]', params: { id: item.id } } as any)}
                        >
                          <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300' }} style={webS.listCardImg} resizeMode="cover" />
                          <View style={webS.listCardInfo}>
                            <Text style={webS.listCardName} numberOfLines={2}>{item.name}</Text>
                            <View style={webS.listBadges}>
                              {item.is_new && <View style={[webS.badge, { backgroundColor: '#10B981' }]}><Text style={webS.badgeText}>NEW</Text></View>}
                              {item.is_sale && <View style={[webS.badge, { backgroundColor: '#EF4444' }]}><Text style={webS.badgeText}>SALE</Text></View>}
                              {item.is_out_of_stock && <View style={[webS.badge, { backgroundColor: '#9CA3AF' }]}><Text style={webS.badgeText}>HẾT HÀNG</Text></View>}
                            </View>
                            <View style={webS.listPriceRow}>
                              <Text style={webS.listPrice}>{(item.finalPrice || item.price).toLocaleString('vi-VN')} đ</Text>
                              {item.is_sale && <Text style={webS.listOldPrice}>{item.price.toLocaleString('vi-VN')} đ</Text>}
                            </View>
                          </View>
                          <View style={webS.listActions}>
                            <TouchableOpacity style={webS.actionCircle} onPress={() => toggleWishlist(item.id)}>
                              <Heart size={17} color={isFav ? '#EF4444' : '#6B7280'} fill={isFav ? '#EF4444' : 'transparent'} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[webS.actionCircle, webS.actionCircleBlue]}
                              onPress={() => { setSelectedQuickProduct(item); setQuickSize(null); setQuickColor(null); setQuickQty(1); }}
                            >
                              <ShoppingCart size={17} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <TouchableOpacity
                        style={webS.gridCard}
                        activeOpacity={0.85}
                        onPress={() => router.push({ pathname: '/(shop)/product/[id]', params: { id: item.id } } as any)}
                      >
                        <View style={webS.gridCardImgWrap}>
                          <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300' }} style={webS.gridCardImg} resizeMode="cover" />
                          <View style={webS.gridBadges}>
                            {item.is_new && <View style={[webS.badge, { backgroundColor: '#10B981' }]}><Text style={webS.badgeText}>NEW</Text></View>}
                            {item.is_sale && <View style={[webS.badge, { backgroundColor: '#EF4444' }]}><Text style={webS.badgeText}>SALE</Text></View>}
                            {item.is_out_of_stock && <View style={[webS.badge, { backgroundColor: '#9CA3AF' }]}><Text style={webS.badgeText}>HẾT HÀNG</Text></View>}
                          </View>
                          <View style={webS.gridQuickActions}>
                            <TouchableOpacity style={webS.actionCircle} onPress={() => toggleWishlist(item.id)}>
                              <Heart size={15} color={isFav ? '#EF4444' : '#6B7280'} fill={isFav ? '#EF4444' : 'transparent'} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[webS.actionCircle, webS.actionCircleBlue]}
                              onPress={() => { setSelectedQuickProduct(item); setQuickSize(null); setQuickColor(null); setQuickQty(1); }}
                            >
                              <ShoppingCart size={15} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={webS.gridCardInfo}>
                          <Text style={webS.gridCardName} numberOfLines={2}>{item.name}</Text>
                          <View style={webS.gridPriceRow}>
                            <Text style={webS.gridPrice}>{(item.finalPrice || item.price).toLocaleString('vi-VN')} đ</Text>
                            {item.is_sale && <Text style={webS.gridOldPrice}>{item.price.toLocaleString('vi-VN')} đ</Text>}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          )}
        </View>

        {/* Quick Add Modal (shared) */}
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
      </View>
    );
  }
  // ═══════════════════════════════ END WEB LAYOUT ═══════════════════════════

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {selectedSubId && (
            <TouchableOpacity 
              onPress={() => {
                setSelectedSubId(null);
                setSelectedChildId(null);
              }} 
              style={{ marginRight: 15 }}
            >
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
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Root category tabs */}
      {!selectedSubId && (
        <View style={styles.rootTabsContainer}>
          <FlatList
            horizontal showsHorizontalScrollIndicator={false}
            data={rootCategories}
            keyExtractor={item => item.id.toString()}
            renderItem={renderRootItem}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        </View>
      )}

      {/* Breadcrumb */}
      <View style={styles.breadcrumbContainer}>
        <Text style={styles.breadcrumbText}>{getBreadcrumbs()}</Text>
      </View>

      {/* Chips + Toolbar (chỉ hiện khi đang xem sản phẩm) */}
      {renderChipsBar()}

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
        )}
      </View>

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
                        <TouchableOpacity key={s} style={[styles.sizeBtn, quickSize === s && styles.variantBtnActive]} onPress={() => setQuickSize(s)}>
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

  // Root tabs
  rootTabsContainer: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6", paddingBottom: 5 },
  rootTab: { paddingHorizontal: 20, paddingVertical: 10, marginRight: 10, position: 'relative' },
  rootTabActive: {},
  rootTabText: { fontSize: 16, fontWeight: "600", color: "#9CA3AF" },
  rootTabTextActive: { color: "#000", fontWeight: "800" },
  rootTabIndicator: { position: 'absolute', bottom: 0, left: 20, right: 20, height: 3, backgroundColor: '#0055FF', borderRadius: 3 },

  // Breadcrumb
  breadcrumbContainer: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  breadcrumbText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },

  // ─── Chips Bar ────────────────────────────────────────────────────────────
  chipsScrollView: { backgroundColor: '#fff' },
  chipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#0055FF',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#0055FF',
  },

  // ─── Toolbar (Sort chips + View toggle) ──────────────────────────────────
  toolBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  sortChipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortChipActive: {
    backgroundColor: '#0055FF',
    borderColor: '#0055FF',
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  sortChipTextActive: {
    color: '#fff',
  },
  viewToggleGroup: {
    flexDirection: 'row',
    gap: 4,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#F3F4F6',
  },
  viewToggleBtn: { padding: 6, backgroundColor: '#F3F4F6', borderRadius: 8 },

  // Sub categories grid
  subCatList: { padding: 15 },
  subCatCard: { flex: 1, margin: 5, backgroundColor: '#fff', borderRadius: 15, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  subCatImg: { width: width * 0.35, height: width * 0.35, borderRadius: 12, marginBottom: 10, backgroundColor: '#F3F4F6' },
  subCatName: { fontSize: 14, fontWeight: "700", color: "#111", textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Products
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
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#000' },

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

// ==================== WEB STYLES ====================
const webS = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#F8FAFF', height: '100%' as any },

  // Left Sidebar
  sidebar: { width: 220, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#F0F0F4', paddingTop: 24, paddingHorizontal: 16 },
  sidebarTitle: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 12, paddingHorizontal: 4 },
  rootItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 10, borderRadius: 12, marginBottom: 4, position: 'relative' },
  rootItemActive: { backgroundColor: '#EEF2FF' },
  rootItemImg: { width: 28, height: 28, borderRadius: 14, marginRight: 10, backgroundColor: '#F3F4F6' },
  rootItemText: { fontSize: 14, fontWeight: '600', color: '#4B5563', flex: 1 },
  rootItemTextActive: { color: '#0055FF', fontWeight: '700' },
  rootItemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0055FF', marginLeft: 6 },

  // Main content
  main: { flex: 1, backgroundColor: '#F8FAFF', display: 'flex' as any, flexDirection: 'column' },
  breadcrumb: { paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F4', backgroundColor: '#fff' },
  breadcrumbText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  // Sub-category grid
  sectionHeading: { fontSize: 26, fontWeight: '900', color: '#111', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  subGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16, paddingBottom: 40 },
  subCard: { width: '22%' as any, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#F0F0F4' },
  subCardImg: { width: '100%', aspectRatio: 1.1 },
  subCardInfo: { padding: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  subCardName: { fontSize: 15, fontWeight: '700', color: '#1F2937', textAlign: 'center' },

  // Toolbar
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F4', gap: 12 },
  chipRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flex: 1 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
  chipActive: { backgroundColor: '#EEF2FF', borderColor: '#0055FF' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  chipTextActive: { color: '#0055FF' },
  sortRow: { flexDirection: 'row', gap: 6 },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  sortBtnActive: { backgroundColor: '#0055FF', borderColor: '#0055FF' },
  sortBtnText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  sortBtnTextActive: { color: '#fff' },

  // Grid header
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  gridHeading: { fontSize: 18, fontWeight: '800', color: '#111' },
  gridCount: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },
  viewToggle: { flexDirection: 'row', gap: 6 },
  toggleBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#EEF2FF' },

  // Product grid
  productGrid: { paddingHorizontal: 16, paddingBottom: 40 },
  columnWrapper: { gap: 14, marginBottom: 14 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyBox: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 16, color: '#9CA3AF' },

  // Grid card
  gridCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#F0F0F4' },
  gridCardImgWrap: { width: '100%', aspectRatio: 0.9, position: 'relative' },
  gridCardImg: { width: '100%', height: '100%' },
  gridBadges: { position: 'absolute', top: 10, left: 10, gap: 4 },
  gridQuickActions: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'column', gap: 6 },
  gridCardInfo: { padding: 12 },
  gridCardName: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 8, minHeight: 38 },
  gridPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gridPrice: { fontSize: 15, fontWeight: '800', color: '#0055FF' },
  gridOldPrice: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through' },

  // List card
  listCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F0F0F4', alignItems: 'center' },
  listCardImg: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#F5F5F5' },
  listCardInfo: { flex: 1, marginLeft: 16 },
  listCardName: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  listBadges: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  listPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listPrice: { fontSize: 16, fontWeight: '800', color: '#0055FF' },
  listOldPrice: { fontSize: 13, color: '#9CA3AF', textDecorationLine: 'line-through' },
  listActions: { flexDirection: 'column', gap: 8, marginLeft: 12 },

  // Shared
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  actionCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3, borderWidth: 1, borderColor: '#F0F0F4' },
  actionCircleBlue: { backgroundColor: '#0055FF', borderColor: '#0055FF' },
});

