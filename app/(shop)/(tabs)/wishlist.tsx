import PriceDisplay from "@/src/components/common/PriceDisplay";
import RecentlyViewedSection from "@/src/components/shop/RecentlyViewedSection";
import { supabase } from "@/src/lib/supabase";
import { calculateDiscountedPrice } from "@/src/services/product";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowRight, Heart, ShoppingCart, Trash2 } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const colorTranslations: Record<string, string> = {
  Black: "Đen", White: "Trắng", Red: "Đỏ", Blue: "Xanh dương", Yellow: "Vàng",
  Green: "Xanh", Pink: "Hồng", Purple: "Tím", Orange: "Cam", Gray: "Xám",
  Brown: "Nâu", Silver: "Bạc", Gold: "Vàng kim", Beige: "Be", Navy: "Xanh đậm",
};

// Mock data cho "Recently Viewed" và "Most Popular"

export default function WishlistScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [recentViews, setRecentViews] = useState<any[]>([]);

  // States for Add to Cart Modal
  const [isModalVisible, setModalVisible] = useState(false);
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [selectedColor, setSelectedColor] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const handleToggleFavoritePopular = async (productId: string, isCurrentlyFavorited: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Vui lòng đăng nhập để lưu sản phẩm yêu thích");
        return;
      }
      
      // Toggle logic
      if (isCurrentlyFavorited) {
        await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", productId);
      } else {
        await supabase.from("wishlist").insert([{ user_id: user.id, product_id: productId }]);
      }
      
      // Cập nhật ngầm
      fetchWishlist();
      fetchPopular();
    } catch (err: any) {
      console.error(err);
      alert("Lỗi: " + err.message);
    }
  };

  const handleCartClick = (item: any) => {
    // Với Nổi tiếng nhất, data nằm ở cấu trúc khác với Wishlist, nhưng item luôn có .id và .variants
    const productData = item; 
    
    // Nếu item là từ wishlist thì product data nằm sẵn ở item (vì ta copy từ product qua)
    setActiveProduct(productData);
    setSelectedColor(null);
    setSelectedSize(null);
    setQuantity(1);
    
    const hasSizes = productData?.variants?.sizes?.length > 0;
    const hasColors = productData?.variants?.options?.length > 0;
    
    if (!hasSizes && !hasColors) {
      addToCartService(productData.id, 1, null, null);
    } else {
      setModalVisible(true);
    }
  };

  const handleConfirmModal = () => {
    const hasSizes = activeProduct?.variants?.sizes?.length > 0;
    const hasColors = activeProduct?.variants?.options?.length > 0;
    
    const isSizeSelected = !hasSizes || !!selectedSize;
    const isColorSelected = !hasColors || !!selectedColor;

    if (!isSizeSelected || !isColorSelected) {
      let message = "Vui lòng chọn đầy đủ ";
      if (!isSizeSelected && !isColorSelected) message += "màu sắc và kích cỡ!";
      else if (!isSizeSelected) message += "kích cỡ!";
      else message += "màu sắc!";
      alert(message);
      return;
    }
    addToCartService(activeProduct.id, quantity, selectedSize, selectedColor?.color || null);
  };

  const addToCartService = async (productId: string, selectedQty: number, size: string | null, color: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("Vui lòng đăng nhập!");

      const { data: existingItem } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .eq("size", size)
        .eq("color", color)
        .maybeSingle();

      if (existingItem) {
        await supabase.from("cart_items").update({ quantity: existingItem.quantity + selectedQty, updated_at: new Date() }).eq("id", existingItem.id);
      } else {
        await supabase.from("cart_items").insert([{
          user_id: user.id, product_id: productId, quantity: selectedQty, size, color, is_selected: true
        }]);
      }

      alert("Đã thêm vào giỏ hàng thành công!");
      setModalVisible(false);
    } catch(error: any) {
      alert("Lỗi: " + error.message);
    }
  };

  const fetchRecentViews = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("product_view_history")
        .select(`
          product:products (
            id,
            images
          )
        `)
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(5); // Chỉ lấy 5 cái mới nhất

      if (!error && data && data.length > 0) {
        const sortedViews = data.map((item: any) => ({
          id: item.product?.id,
          image: item.product?.images?.[0] || "https://via.placeholder.com/150",
        })).filter((i: any) => i.id);

        setRecentViews(sortedViews);
      }
    } catch (error) {
      console.error("Lỗi lấy sản phẩm đã xem:", error);
    }
  }, []);

  const fetchWishlist = useCallback(async () => {
    try {
      setLoading(true);
      // Giả sử chúng ta lấy wishlist của user hiện tại
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWishlistItems([]);
        return;
      }

      const { data, error } = await supabase
        .from("wishlist")
        .select(`
          id,
          product:products (
          *,
          product_discounts (
            id, discount_type, discount_value, is_active, start_date, end_date
          )
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const processed = (data || []).map(item => ({
        wishlistId: item.id,
        ...calculateDiscountedPrice(item.product)
      }));

      setWishlistItems(processed);
    } catch (error) {
      console.error("Lỗi lấy wishlist:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPopular = useCallback(async () => {
    try {
      // Kết nối bảng sản phẩm và số lượt yêu thích từ bảng wishlist
      const { data, error } = await supabase
        .from("products")
        .select(`*, product_discounts(id, discount_type, discount_value, is_active, start_date, end_date), wishlist:wishlist(id)`);
      if (error) throw error;

      const processed = (data || []).map((p: any) => ({
        ...calculateDiscountedPrice(p),
        heart_count: p.wishlist ? p.wishlist.length : 0
      }));

      // Sắp xếp theo số lượt yêu thích cao nhất
      const sorted = processed.sort((a, b) => b.heart_count - a.heart_count).slice(0, 4);
      setPopularProducts(sorted);
    } catch (error) {
      console.error("Lỗi lấy sản phẩm nổi tiếng:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchWishlist();
      fetchPopular();
      fetchRecentViews();
    }, [fetchWishlist, fetchPopular, fetchRecentViews])
  );

  const removeFromWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase.from("wishlist").delete().eq("id", wishlistId);
      if (error) throw error;
      setWishlistItems(prev => prev.filter(item => item.wishlistId !== wishlistId));
    } catch (error) {
      console.error("Lỗi xóa khỏi wishlist:", error);
    }
  };

  const renderRecentlyViewed = () => (
    <RecentlyViewedSection
      items={recentViews}
      onPressSeeAll={() => router.push("/(shop)/recently-viewed" as any)}
    />
  );

  const renderWishlistItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.productRow}
      activeOpacity={0.8}
      onPress={() => router.push(`/(shop)/product/${item.id}` as any)}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.images?.[0] || "https://via.placeholder.com/300" }}
          style={styles.productImage}
        />
        <TouchableOpacity
          style={styles.deleteBadge}
          onPress={() => removeFromWishlist(item.wishlistId)}
        >
          <Trash2 size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.finalPrice}>{item.finalPrice.toLocaleString('vi-VN')} đ</Text>
          {item.hasDiscount && (
            <Text style={styles.originalPrice}>{item.originalPrice.toLocaleString('vi-VN')} đ</Text>
          )}
        </View>

        <TouchableOpacity style={styles.cartBtn} onPress={() => handleCartClick(item)}>
          <ShoppingCart size={20} color="#0055FF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.heartIconCircle}>
        <View style={styles.heartDecoration} />
        <Heart size={48} color="#0055FF" fill="#0055FF" opacity={0.15} />
        <Heart size={32} color="#0055FF" style={styles.absoluteHeart} />
      </View>
      <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 20 }}>Bạn chưa có sản phẩm yêu thích nào.</Text>
    </View>
  );

  const renderPopularSection = () => (
    <View style={[styles.section, { paddingHorizontal: 20, marginTop: 40 }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nổi tiếng nhất</Text>
        <TouchableOpacity
          style={styles.seeAllContainer}
          onPress={() => router.push("/product/popular-products" as any)}
        >
          <Text style={styles.seeAllText}>Chi tiết</Text>
          <View style={styles.circleBtnSmall}>
            <ArrowRight size={14} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.popularGrid}>
        {popularProducts.map((item) => {
          const isFavorited = wishlistItems.some(w => w.id === item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.popularCardGrid}
              onPress={() => router.push(`/(shop)/product/${item.id}`)}
              activeOpacity={0.8}
            >
              <View>
                <Image
                  source={{ uri: item.images?.[0] || "https://via.placeholder.com/300" }}
                  style={styles.popularImageGrid}
                  resizeMode="cover"
                />

                {/* ── Thêm icon yêu thích trên hình ảnh ── */}
                <TouchableOpacity 
                   style={styles.favoriteBadgeGrid}
                   onPress={() => handleToggleFavoritePopular(item.id, isFavorited)}
                >
                  <Heart size={14} color={isFavorited ? "#EF4444" : "#9CA3AF"} fill={isFavorited ? "#EF4444" : "rgba(0,0,0,0.2)"} />
                </TouchableOpacity>
              </View>

              {/* Hiển thị lượt Tim và Rating */}
              <View style={styles.statsRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Heart size={12} color="#EF4444" fill="#EF4444" />
                  <Text style={styles.heartText}>
                    {item.heart_count || 0}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialIcons name="star" size={12} color="#f59e0b" />
                  <Text style={styles.ratingText}>
                    {" "}
                    {item.average_rating || 0}
                  </Text>
                </View>
              </View>

              <Text style={styles.popularNameGrid} numberOfLines={2}>
                {item.name}
              </Text>
              <PriceDisplay
                hasDiscount={item.hasDiscount}
                finalPrice={item.finalPrice}
                originalPrice={item.originalPrice}
                size="md"
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0055FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Danh sách yêu thích</Text>
            </View>
            {renderRecentlyViewed()}
          </>
        }
        data={wishlistItems}
        renderItem={renderWishlistItem}
        keyExtractor={(item) => item.wishlistId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState()}
        ListFooterComponent={renderPopularSection()}
        showsVerticalScrollIndicator={false}
      />

      {/* ══════════════ Pop-up Product Variations (Modal) ══════════════ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Image
                source={{ uri: activeProduct?.images?.[0] || "https://via.placeholder.com/300" }}
                style={styles.modalThumbnail}
              />
              <View style={styles.modalProductInfo}>
                <PriceDisplay
                  hasDiscount={activeProduct?.hasDiscount}
                  finalPrice={activeProduct?.finalPrice}
                  originalPrice={activeProduct?.originalPrice ?? 0}
                  size="sm"
                />
                <View style={styles.modalSelectedChips}>
                  <Text style={styles.modalChipText}>
                    {selectedColor?.color ? colorTranslations[selectedColor.color] || selectedColor.color : "Chưa chọn màu"}
                  </Text>
                  <Text style={styles.modalChipText}>
                    {selectedSize ? selectedSize : "Chưa chọn size"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 20, color: "#9CA3AF", fontWeight: "bold" }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Color Options */}
              {activeProduct?.variants?.options?.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Màu sắc</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {activeProduct.variants.options.map((option: any, index: number) => {
                      const isSelected = selectedColor?.color === option.color;
                      return (
                        <TouchableOpacity
                          key={index}
                          activeOpacity={0.8}
                          onPress={() => setSelectedColor(option)}
                          style={[
                            styles.modalColorOption,
                            { backgroundColor: option.hex },
                            isSelected && styles.modalColorOptionSelected,
                          ]}
                        >
                          {isSelected && (
                            <View style={styles.checkMarkBadge}>
                              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Size Options */}
              {activeProduct?.variants?.sizes?.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Kích cỡ</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {activeProduct.variants.sizes.map((size: string, index: number) => {
                      const isSelected = selectedSize === size;
                      return (
                        <TouchableOpacity
                          key={index}
                          activeOpacity={0.8}
                          onPress={() => setSelectedSize(prev => (prev === size ? null : size))}
                          style={[
                            styles.modalSizeChip,
                            isSelected && styles.modalSizeChipSelected,
                          ]}
                        >
                          <Text style={[styles.modalSizeText, isSelected && styles.modalSizeTextSelected]}>
                            {size}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Quantity Options */}
              <View style={[styles.modalSection, styles.quantityRow]}>
                <Text style={styles.modalSectionTitle}>Số lượng</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity style={styles.quantityBtn} onPress={() => setQuantity(q => (q > 1 ? q - 1 : 1))}>
                    <Text style={styles.quantityBtnText}>-</Text>
                  </TouchableOpacity>
                  <View style={styles.quantityDisplay}>
                    <Text style={styles.quantityText}>{quantity}</Text>
                  </View>
                  <TouchableOpacity style={styles.quantityBtn} onPress={() => setQuantity(q => q + 1)}>
                    <Text style={styles.quantityBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.confirmModalBtn} activeOpacity={0.85} onPress={handleConfirmModal}>
              <Text style={styles.confirmModalText}>Xác nhận & Thêm vào giỏ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingTop: 15, marginBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: "900", color: "#000" },

  section: { marginBottom: 25 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15
  },
  sectionTitle: { fontSize: 24, fontWeight: "800", color: "#111" },

  circleBtnActive: { backgroundColor: "#0055FF", width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  circleBtnSmall: { backgroundColor: "#0055FF", width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center", marginLeft: 8 },


  listContent: { paddingBottom: 100 },
  productRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: "center"
  },
  imageContainer: { width: 120, height: 140, position: "relative" },
  productImage: { width: "100%", height: "100%", borderRadius: 20 },
  deleteBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#fff",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },

  productInfo: { flex: 1, marginLeft: 15, height: 140, justifyContent: "space-between", paddingVertical: 5 },
  productName: { fontSize: 16, fontWeight: "600", color: "#4B5563" },
  priceRow: { flexDirection: "row", alignItems: "baseline" },
  finalPrice: { fontSize: 20, fontWeight: "800", color: "#000" },
  originalPrice: { fontSize: 14, color: "#EF4444", textDecorationLine: "line-through", marginLeft: 8, opacity: 0.6 },

  tagRow: { flexDirection: "row" },
  tag: { backgroundColor: "#EFF6FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  tagText: { color: "#3B82F6", fontSize: 13, fontWeight: "600" },

  cartBtn: { alignSelf: "flex-end" },

  emptyContainer: { flex: 1, alignItems: "center", paddingTop: 40 },
  heartIconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    position: "relative"
  },
  heartDecoration: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed"
  },
  absoluteHeart: { position: "absolute" },

  seeAllContainer: { flexDirection: "row", alignItems: "center" },
  seeAllText: { fontSize: 15, color: "#4B5563", fontWeight: "600" },

  // Grid Styles (thay thế cho ScrollView)
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  popularCardGrid: {
    width: "48%", // Chia đôi màn hình
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  popularImageGrid: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 8,
  },
  heartText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "bold",
    marginLeft: 4,
  },
  ratingText: {
    fontSize: 11,
    color: "#666",
  },
  popularNameGrid: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 6,
    marginBottom: 4,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  favoriteBadgeGrid: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 6,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },

  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0, 0, 0, 0.4)" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: SCREEN_HEIGHT * 0.8 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  modalThumbnail: { width: 80, height: 80, borderRadius: 12, backgroundColor: "#F3F4F6", marginRight: 16 },
  modalProductInfo: { flex: 1, justifyContent: "center" },
  modalSelectedChips: { flexDirection: "row", gap: 8, marginTop: 8 },
  modalChipText: { fontSize: 12, color: "#6B7280", backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  modalSection: { marginBottom: 24 },
  modalSectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 12 },
  modalColorOption: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", justifyContent: "center", alignItems: "center" },
  modalColorOptionSelected: { borderWidth: 2, borderColor: "#3B82F6", transform: [{ scale: 1.05 }] },
  checkMarkBadge: { position: "absolute", bottom: -2, right: -2, backgroundColor: "#3B82F6", width: 16, height: 16, borderRadius: 8, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "#fff" },
  modalSizeChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginRight: 12, backgroundColor: "#fff" },
  modalSizeChipSelected: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  modalSizeText: { fontSize: 14, color: "#4B5563", fontWeight: "600" },
  modalSizeTextSelected: { color: "#3B82F6" },
  quantityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quantityControls: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4 },
  quantityBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", borderRadius: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  quantityBtnText: { fontSize: 18, fontWeight: "600", color: "#374151" },
  quantityDisplay: { width: 40, alignItems: "center" },
  quantityText: { fontSize: 15, fontWeight: "700", color: "#111827" },
  confirmModalBtn: { backgroundColor: "#3B82F6", paddingVertical: 16, borderRadius: 16, alignItems: "center", marginTop: 8, marginBottom: 10 },
  confirmModalText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
