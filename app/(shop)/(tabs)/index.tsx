import {
  ActivityIndicator,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import { PriceDisplay } from "@/src/components/common/PriceDisplay";
import { supabase } from "@/src/lib/supabase";
import { Banner, getActiveBanners } from "@/src/services/banner";
import {
  getFlashSaleProducts,
  getJustForYouProducts,
  getLatestProducts,
  getMostPopularProducts,
  getTopSellingProducts,
} from "@/src/services/product";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";

const { width } = Dimensions.get("window");

// ==================== MOCK DATA ====================



// Removed JUST_FOR_YOU mock data
// ==================== COMPONENTS ====================

const HomeScreen = () => {
  {
    /* ========== TOP PRODUCTS SECTION ========== */
  }
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        const data = await getTopSellingProducts();
        setTopProducts(data);
      } catch (error) {
        console.error("Lỗi lấy sản phẩm:", error);
      }
    };
    fetchTopProducts();
  }, []);

  {
    /* ========== NEW ITEMS SECTION  ========== */
  }

  const [newItems, setNewItems] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchNewItems = async () => {
      const data = await getLatestProducts();
      setNewItems(data);
    };
    fetchNewItems();
  }, []);

  {
    /* ========== MOST POPULAR SECTION  ========== */
  }
  const [popularItems, setPopularItems] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const data = await getMostPopularProducts();
      setPopularItems(data);
    };
    loadData();
  }, []);

  {
    /* ========== FLASH SALE SECTION  ========== */
  }
  const [flashSaleProducts, setFlashSaleProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchFlashSale = async () => {
      const data = await getFlashSaleProducts();
      setFlashSaleProducts(data.slice(0, 4)); // Hiển thị 4 sản phẩm
    };
    fetchFlashSale();
  }, []);

  {
    /* ========== JUST FOR YOU SECTION  ========== */
  }
  const [justForYouItems, setJustForYouItems] = useState<any[]>([]);
  const isLoadingMore = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);

  useEffect(() => {
    const fetchJustForYou = async () => {
      const data = await getJustForYouProducts(1);
      setJustForYouItems(data);
    };
    fetchJustForYou();
  }, []);

  const loadMoreJustForYou = async () => {
    if (isLoadingMore.current || !hasMoreRef.current) return;
    isLoadingMore.current = true;

    const nextPage = pageRef.current + 1;
    const moreData = await getJustForYouProducts(nextPage);

    if (moreData.length === 0) {
      hasMoreRef.current = false;
    } else {
      setJustForYouItems((prev) => {
        const existIds = new Set(prev.map(i => i.id));
        const filtered = moreData.filter(i => !existIds.has(i.id));
        return [...prev, ...filtered];
      });
      pageRef.current = nextPage;
    }

    isLoadingMore.current = false;
  };

  {
    /* ========== BANNERS SECTION  ========== */
  }
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const fetchBanners = async () => {
      const data = await getActiveBanners();
      setBanners(data);
    };
    fetchBanners();
  }, []);

  const bannerScrollRef = useRef<ScrollView>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  // Tạo danh sách banner để hỗ trợ Infinite Loop (thêm bản sao của phần tử đầu vào cuối)
  const displayBanners =
    banners.length > 1 ? [...banners, banners[0]] : banners;

  // Tự động chuyển banner sau 5 giây
  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      const nextIndex = activeBannerIndex + 1;

      // Cuộn tới index tiếp theo (có thể là bản sao của phần tử đầu)
      bannerScrollRef.current?.scrollTo({
        x: nextIndex * (width - 32),
        animated: true,
      });

      // Nếu đang ở bản sao (cuối mảng displayBanners)
      if (nextIndex === banners.length) {
        // Đợi animation cuộn xong rồi reset về 0 (không animation)
        setTimeout(() => {
          bannerScrollRef.current?.scrollTo({ x: 0, animated: false });
          setActiveBannerIndex(0);
        }, 500); // 500ms thường là thời gian animation mặc định
      } else {
        setActiveBannerIndex(nextIndex);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [activeBannerIndex, banners.length]);

  const handleBannerScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / (width - 32));

    // Nếu cuộn thủ công tới phần tử cuối (bản sao), reset về 0 ngay lập tức
    if (banners.length > 1 && index === banners.length) {
      bannerScrollRef.current?.scrollTo({ x: 0, animated: false });
      setActiveBannerIndex(0);
    } else {
      setActiveBannerIndex(index);
    }
  };

  const [cartCount, setCartCount] = useState(0);

  // Hàm lấy tổng số lượng sản phẩm trong giỏ
  const fetchCartCount = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCartCount(0);
        return;
      }

      // Đếm tổng số lượng (quantity) thay vì đếm số dòng
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

  // Cập nhật mỗi khi màn hình index được focus
  useFocusEffect(
    useCallback(() => {
      fetchCartCount();
    }, []),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>E-Shop</Text>

        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => router.push("/(shop)/(tabs)/search")}
        >
          <Text style={styles.searchText}>Tìm kiếm...</Text>
          <MaterialIcons name="photo-camera" size={24} color="#0055FF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cartButton}
          activeOpacity={0.7}
          onPress={() => router.push("/(shop)/(tabs)/cart")}
        >
          <MaterialIcons name="shopping-bag" size={28} color="#1a1a1a" />

          {/* Hiển thị Badge nếu số lượng > 0 */}
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>
                {cartCount > 99 ? "99+" : cartCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={400}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          // Tải thêm nếu cách đáy 300px
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 300) {
            loadMoreJustForYou();
          }
        }}
      >
        {/* ========== BANNER SECTION ========== */}
        {banners.length > 0 && (
          <View style={styles.bannerContainer}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleBannerScroll}
              scrollEventThrottle={16}
            >
              {displayBanners.map((banner, index) => (
                <TouchableOpacity
                  key={`${banner.id}-${index}`}
                  style={[styles.bannerContent, { width: width - 32 }]}
                  activeOpacity={0.9}
                  onPress={() => {
                    if (banner.action_type === "product") {
                      router.push(`/(shop)/product/${banner.action_value}`);
                    } else if (banner.action_type === "category") {
                      router.push({
                        pathname: "/(shop)/(tabs)/search",
                        params: { categoryId: banner.action_value },
                      });
                    }
                  }}
                >
                  <View style={styles.bannerTextContainer}>
                    <Text style={styles.bannerTitle}>{banner.title}</Text>
                    <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                  </View>
                  <Image
                    source={{
                      uri: banner.image_url,
                    }}
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Pagination Dots */}
            <View style={styles.paginationContainer}>
              {banners.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    (index === activeBannerIndex ||
                      (index === 0 && activeBannerIndex === banners.length)) &&
                    styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* ========== TOP PRODUCTS SECTION ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top sản phẩm bán chạy</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topProductsList}
          >
            {topProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.topProductItem}
                onPress={() => router.push(`/(shop)/product/${product.id}`)} // Chuyển đến chi tiết
              >
                <View style={styles.topProductBorder}>
                  <Image
                    source={{
                      uri: Array.isArray(product.images)
                        ? product.images[0]
                        : product.image,
                    }}
                    style={styles.topProductImage}
                    resizeMode="cover"
                  />
                </View>
                {/* Thông tin sản phẩm */}
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <PriceDisplay
                    hasDiscount={product.hasDiscount}
                    finalPrice={product.finalPrice}
                    originalPrice={product.originalPrice}
                    size="sm"
                    justify="center"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ========== NEW ITEMS SECTION ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sản phẩm mới</Text>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => router.push("/product/new-products" as any)}
            >
              <Text style={styles.seeAllText}>Chi tiết</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {newItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.productCard}
                onPress={() => router.push(`/(shop)/product/${item.id}`)}
              >
                <Image
                  source={{
                    // Ưu tiên lấy ảnh đầu tiên trong mảng images, nếu không có thì dùng ảnh mặc định
                    uri:
                      item.images && item.images.length > 0
                        ? item.images[0]
                        : "https://via.placeholder.com/150",
                  }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                <PriceDisplay
                  hasDiscount={item.hasDiscount}
                  finalPrice={item.finalPrice}
                  originalPrice={item.originalPrice}
                  size="md"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ========== FLASH SALE SECTION ========== */}
        <TouchableOpacity
          style={styles.section}
          activeOpacity={0.9}
          onPress={() => router.push("/(shop)/flash-sale")}
        >
          <View style={styles.flashSaleHeader}>
            <View style={styles.flashSaleTitleContainer}>
              <MaterialIcons name="access-time" size={20} color="#ef4444" />
              <Text style={styles.flashSaleTitle}>Flash Sale</Text>
            </View>
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>00:36:58</Text>
            </View>
          </View>

          <View style={styles.flashSaleGrid}>
            {flashSaleProducts.map((product) => {
              return (
                <View key={product.id} style={styles.flashSaleCard}>
                  <Image
                    source={{ uri: product.images?.[0] || 'https://via.placeholder.com/150' }}
                    style={styles.flashSaleImage}
                    resizeMode="cover"
                  />
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{product.discountBadgeText || "SALE"}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        </TouchableOpacity>

        {/* ========== MOST POPULAR SECTION ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nổi tiếng nhất</Text>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => router.push("/product/popular-products" as any)}
            >
              <Text style={styles.seeAllText}>Chi tiết</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <View style={styles.popularGrid}>
            {/* Thêm .slice(0, 4) để chỉ lấy 4 phần tử đầu tiên */}
            {popularItems.slice(0, 4).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.popularCard}
                onPress={() => router.push(`/(shop)/product/${item.id}`)}
              >
                <Image
                  source={{ uri: item.images?.[0] || item.image }}
                  style={styles.popularImage}
                  resizeMode="cover"
                />

                {/* Hiển thị Rating & Lượt xem nhỏ bên dưới ảnh */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingHorizontal: 4,
                    marginTop: 4,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialIcons name="star" size={12} color="#f59e0b" />
                    <Text style={{ fontSize: 11, color: "#666" }}>
                      {" "}
                      {item.average_rating || 0}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: "#999" }}>
                    {item.view_count || 0} lượt xem
                  </Text>
                </View>

                <Text style={styles.popularName} numberOfLines={2}>
                  {item.name}
                </Text>
                <PriceDisplay
                  hasDiscount={item.hasDiscount}
                  finalPrice={item.finalPrice}
                  originalPrice={item.originalPrice}
                  size="md"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ========== JUST FOR YOU SECTION ========== */}
        <View style={[styles.section, { marginBottom: 100 }]}>
          <View style={styles.justForYouHeader}>
            <MaterialIcons name="star" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Dành cho bạn</Text>
          </View>

          <View style={styles.justForYouGrid}>
            {justForYouItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.justForYouCard}
                onPress={() => router.push(`/(shop)/product/${item.id}`)}
              >
                <Image
                  source={{ uri: item.images?.[0] || item.image || "https://via.placeholder.com/400" }}
                  style={styles.justForYouImage}
                  resizeMode="cover"
                />
                <Text style={styles.justForYouName} numberOfLines={2}>
                  {item.name}
                </Text>
                <PriceDisplay
                  hasDiscount={item.hasDiscount}
                  finalPrice={item.finalPrice}
                  originalPrice={item.originalPrice}
                  size="md"
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Vòng quay tải thêm nằm dưới lưới Just for you */}
          {isLoadingMore.current && (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // Banner Section
  bannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 20,
  },
  bannerContent: {
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    height: 140,
    flexDirection: "row",
    overflow: "hidden",
    position: "relative",
  },
  bannerTextContainer: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: 24,
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  bannerImage: {
    width: 140,
    height: 140,
    position: "absolute",
    right: 0,
    bottom: 0,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: "#ff6b35",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1a1a1a",
  },
  searchBar: {
    flex: 1,
    height: 46,
    backgroundColor: "#F3F4F6",
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  searchText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "500",
  },
  cartButton: {
    padding: 6,
    position: "relative",
  },
  // ... các styles cũ
  cartBadge: {
    position: "absolute",
    right: 2,
    top: 2,
    backgroundColor: "#EF4444", // Màu đỏ thông báo
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF", // Viền trắng để nổi bật trên icon
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },

  // Section Common
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "600",
  },

  // Categories Grid
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryCard: {
    width: (width - 44) / 2,
    marginBottom: 12,
  },
  categoryImageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 8,
  },
  categoryGridImage: {
    width: (width - 52) / 4,
    height: (width - 52) / 4,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  categoryBadge: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryCount: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },

  // Top Products
  topProductsList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  topProductItem: {
    alignItems: "center",
  },
  topProductBorder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    padding: 3,
  },
  topProductImage: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
  },

  productInfo: {
    marginTop: 8,
    alignItems: "center",
    width: 80,
  },

  // New Items & Product Cards
  horizontalList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  productCard: {
    width: 160,
  },
  productImage: {
    width: 160,
    height: 200,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    marginBottom: 8,
  },
  productName: {
    fontSize: 13,
    color: "#4b5563",
    marginBottom: 4,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },

  // Flash Sale
  flashSaleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  flashSaleTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flashSaleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  countdownContainer: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ef4444",
  },
  flashSaleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  flashSaleCard: {
    width: (width - 44) / 2,
    position: "relative",
  },
  flashSaleImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },

  // Most Popular
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  popularCard: {
    width: (width - 44) / 2,
  },
  popularImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    marginBottom: 8,
  },
  popularName: {
    fontSize: 13,
    color: "#4b5563",
    marginBottom: 4,
    lineHeight: 18,
  },
  popularPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },

  // Just For You
  justForYouHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  justForYouGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  justForYouCard: {
    width: (width - 44) / 2,
  },
  justForYouImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    marginBottom: 8,
  },
  justForYouName: {
    fontSize: 13,
    color: "#4b5563",
    marginBottom: 4,
    lineHeight: 18,
  },
  justForYouPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
});

export default HomeScreen;
