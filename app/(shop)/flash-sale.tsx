import { PriceDisplay } from "@/src/components/common/PriceDisplay";
import { getFlashSaleProducts, getMostPopularProducts } from "@/src/services/product";
import { Banner, getActiveBanners } from "@/src/services/banner";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "expo-router";
import { ArrowRight, ChevronLeft, Clock, Heart } from "lucide-react-native";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState, useRef } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 48 - 16) / 2;

// Bảng màu thiết kế
const COLORS = {
  blue: "#0055FF",
  lightBlue: "#E6F0FF",
  white: "#FFFFFF",
  dark: "#1A1A1A",
  gray: "#8E8E93",
  lightGray: "#F2F2F7",
  red: "#FF3B30",
  orange: "#FF9500",
};

// ==================== MOCK DATA ====================
const FLASH_SALE_PRODUCTS = [
  {
    id: "1",
    name: "Cotton T-Shirt Classic Premium Quality",
    price: 160000,
    originalPrice: 200000,
    discount: "-20%",
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400",
  },
  {
    id: "2",
    name: "Summer Floral Dress Fashionable",
    price: 160000,
    originalPrice: 200000,
    discount: "-20%",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
  },
  {
    id: "3",
    name: "Denim Jacket Vintage Style",
    price: 160000,
    originalPrice: 200000,
    discount: "-20%",
    image: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=400",
  },
  {
    id: "4",
    name: "Pink Velvet Sneakers Comfortable",
    price: 160000,
    originalPrice: 200000,
    discount: "-20%",
    image: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=400",
  },
  {
    id: "5",
    name: "Boho Style Bag Handcrafted",
    price: 160000,
    originalPrice: 200000,
    discount: "-20%",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400",
  },
  {
    id: "6",
    name: "White Linen Shirt Casual",
    price: 160000,
    originalPrice: 200000,
    discount: "-20%",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
  },
];

const POPULAR_PRODUCTS = [
  {
    id: "p1",
    name: "Product 1",
    price: 1780,
    label: "New",
    image: "https://images.unsplash.com/photo-15391091323rd-371bd3ef44b1?w=400",
  },
  {
    id: "p2",
    name: "Product 2",
    price: 1780,
    label: "Sale",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
  },
  {
    id: "p3",
    name: "Product 3",
    price: 1780,
    label: "Hot",
    image: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=400",
  },
  {
    id: "p4",
    name: "Product 4",
    price: 1780,
    label: "New",
    image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400",
  },
];

// ==================== SUB-COMPONENTS ====================

const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState(36 * 60 + 58); // 00:36:58

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return {
      hrs: hrs.toString().padStart(2, "0"),
      mins: mins.toString().padStart(2, "0"),
      secs: secs.toString().padStart(2, "0"),
    };
  };

  const { hrs, mins, secs } = formatTime(timeLeft);

  return (
    <View style={styles.timerContainer}>
      <Clock size={20} color={COLORS.white} strokeWidth={2.5} />
      <View style={styles.timeBox}>
        <Text style={styles.timeText}>{hrs}</Text>
      </View>
      <Text style={styles.timeSeparator}>:</Text>
      <View style={styles.timeBox}>
        <Text style={styles.timeText}>{mins}</Text>
      </View>
      <Text style={styles.timeSeparator}>:</Text>
      <View style={styles.timeBox}>
        <Text style={styles.timeText}>{secs}</Text>
      </View>
    </View>
  );
};

const DiscountTabs = ({ selected, onSelect, levels }: { selected: string; onSelect: (val: string) => void, levels: string[] }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      {levels.map((level) => (
        <TouchableOpacity
          key={level}
          onPress={() => onSelect(level)}
          style={[
            styles.tabItem,
            selected === level && styles.tabItemSelected,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              selected === level && styles.tabTextSelected,
            ]}
          >
            {level}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const ProductCard = ({ product }: { product: any }) => {
  const router = useRouter();

  let discountBadgeText = product.discountBadgeText || "SALE";

  return (
    <TouchableOpacity
      style={styles.productCard}
      activeOpacity={0.8}
      onPress={() => router.push(`/(shop)/product/${product.id}`)}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.images?.[0] || 'https://via.placeholder.com/400' }} style={styles.productImage} />
        <View style={styles.discountBadge}>
          <Text style={styles.discountBadgeText}>{discountBadgeText}</Text>
        </View>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <PriceDisplay
          finalPrice={product.finalPrice}
          originalPrice={product.originalPrice}
          hasDiscount={true}
          size="sm"
        />
      </View>
    </TouchableOpacity>
  );
};

const PopularItemCard = ({ item }: { item: any }) => {
  return (
    <View style={styles.popularCard}>
      <View style={styles.popularImageContainer}>
        <Image source={{ uri: item.image }} style={styles.popularImage} />
        <View style={styles.popularLabel}>
          <Text style={styles.popularLabelText}>{item.label}</Text>
        </View>
      </View>
      <View style={styles.popularInfo}>
        <View style={styles.popularPriceRow}>
          <Text style={styles.popularPrice}>{item.price.toLocaleString("vi-VN")}đ</Text>
          <Heart size={14} color={COLORS.blue} fill={COLORS.blue} />
        </View>
      </View>
    </View>
  );
};

// ==================== MAIN SCREEN ====================

export default function FlashSaleScreen() {
  const router = useRouter();
  const [selectedDiscount, setSelectedDiscount] = useState("Tất cả");
  const [flashSaleData, setFlashSaleData] = useState<any[]>([]);
  const [discountLevels, setDiscountLevels] = useState<string[]>(["Tất cả"]);

  const [banners, setBanners] = useState<Banner[]>([]);
  const bannerScrollRef = useRef<ScrollView>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);

  const fetchWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("wishlist").select("*").eq("user_id", user.id);
      if (error) throw error;
      setWishlistItems(data || []);
    } catch (e) {}
  };

  const handleToggleFavoritePopular = async (productId: string, isCurrentlyFavorited: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Vui lòng đăng nhập để lưu sản phẩm yêu thích");
        return;
      }
      if (isCurrentlyFavorited) {
        await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", productId);
      } else {
        await supabase.from("wishlist").insert([{ user_id: user.id, product_id: productId }]);
      }
      fetchWishlist();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  useEffect(() => {
    const fetchFlashSale = async () => {
      const data = await getFlashSaleProducts();
      setFlashSaleData(data);

      const levels = new Set<number>();
      data.forEach((product: any) => {
        const activeDiscount = product.product_discounts?.find(
          (d: any) => d.is_active && d.discount_type === 'percentage'
        );
        if (activeDiscount && activeDiscount.discount_value) {
          levels.add(activeDiscount.discount_value);
        }
      });
      const sorted = Array.from(levels).sort((a, b) => a - b).map(v => `${v}%`);
      setDiscountLevels(["Tất cả", ...sorted]);
    };
    const fetchBanners = async () => {
      const bData = await getActiveBanners();
      setBanners(bData);
    };
    const loadPopular = async () => {
      const data = await getMostPopularProducts();
      setPopularProducts(data);
    };
    fetchFlashSale();
    fetchBanners();
    loadPopular();
    fetchWishlist();
  }, []);

  const displayBanners = banners.length > 1 ? [...banners, banners[0]] : banners;

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      const nextIndex = activeBannerIndex + 1;
      bannerScrollRef.current?.scrollTo({ x: nextIndex * (width - 48), animated: true });
      if (nextIndex === banners.length) {
        setTimeout(() => {
          bannerScrollRef.current?.scrollTo({ x: 0, animated: false });
          setActiveBannerIndex(0);
        }, 500);
      } else {
        setActiveBannerIndex(nextIndex);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [activeBannerIndex, banners.length]);

  const handleBannerScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / (width - 48));
    if (banners.length > 1 && index === banners.length) {
      bannerScrollRef.current?.scrollTo({ x: 0, animated: false });
      setActiveBannerIndex(0);
    } else {
      setActiveBannerIndex(index);
    }
  };

  const filteredData = flashSaleData.filter((product) => {
    if (selectedDiscount === "Tất cả") return true;
    const level = parseInt(selectedDiscount); // e.g. "20%" -> 20
    const activeDiscount = product.product_discounts?.find(
      (d: any) => d.is_active && d.discount_type === 'percentage'
    );
    if (!activeDiscount) return false;
    return activeDiscount.discount_value >= level;
  });

  const renderHeader = () => (
    <View style={styles.screenHeader}>
      {/* Background shape */}
      <View style={styles.headerBackground} />

      <View style={styles.headerTopRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={28} color={COLORS.dark} />
        </TouchableOpacity>
        <CountdownTimer />
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.screenTitle}>Flash Sale</Text>
        <Text style={styles.screenSubtitle}>Chọn mức giảm giá của bạn</Text>
      </View>

      <DiscountTabs selected={selectedDiscount} onSelect={setSelectedDiscount} levels={discountLevels} />
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      {/* Banners Section */}
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
                style={[styles.bannerContent, { width: width - 48 }]}
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
                <View style={[styles.bannerTextContainer, styles.bannerTextContent]}>
                  <Text style={styles.bannerTitle}>{banner.title}</Text>
                  <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                </View>
                <Image
                  source={{ uri: banner.image_url }}
                  style={[styles.bannerImage, { height: 160 }]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.paginationContainer}>
            {banners.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  (index === activeBannerIndex || (index === 0 && activeBannerIndex === banners.length)) &&
                  styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/*  Favorite Section */}
      <View style={styles.mostPopularSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nổi tiếng nhất</Text>
          <TouchableOpacity style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>Xem tất cả</Text>
            <View style={styles.seeAllIcon}>
              <ArrowRight size={14} color={COLORS.white} />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularList}
        >
          {popularProducts.map((item) => {
            const isFavorited = wishlistItems.some(w => w.product_id === item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.popularCardGrid}
                onPress={() => router.push(`/(shop)/product/${item.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.popularImageContainer}>
                  <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300' }} style={styles.popularImageGrid} resizeMode="cover" />
                  <TouchableOpacity style={styles.popularLabel} onPress={() => handleToggleFavoritePopular(item.id, isFavorited)}>
                    <Heart size={14} color={isFavorited ? "#EF4444" : "#EF4444"} fill={isFavorited ? "#EF4444" : "rgba(255,255,255,1)"} />
                  </TouchableOpacity>
                </View>
                <View style={styles.popularInfo}>
                  <View style={styles.statsRow}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Heart size={12} color="#EF4444" fill="#EF4444" />
                      <Text style={styles.heartText}>{item.heart_count || 0}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <MaterialIcons name="star" size={12} color="#f59e0b" />
                      <Text style={styles.ratingText}> {item.average_rating || 0}</Text>
                    </View>
                  </View>
                  <Text style={styles.popularNameGrid} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <PriceDisplay
                    hasDiscount={item.hasDiscount}
                    finalPrice={item.finalPrice}
                    originalPrice={item.originalPrice}
                    size="sm"
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ProductCard product={item} />}
        numColumns={2}
        ListHeaderComponent={renderHeader()}
        ListFooterComponent={renderFooter()}
        contentContainerStyle={styles.flatListContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  flatListContent: {
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 20,
  },

  // Screen Header
  screenHeader: {
    paddingBottom: 24,
    position: "relative",
  },
  headerBackground: {
    position: "absolute",
    top: -100,
    right: -50,
    width: width * 0.8,
    height: 250,
    backgroundColor: COLORS.blue,
    borderBottomLeftRadius: 150,
    zIndex: -1,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  titleSection: {
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.dark,
  },
  screenSubtitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 4,
  },

  // Timer
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.blue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  timeBox: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 32,
    alignItems: "center",
  },
  timeText: {
    color: COLORS.blue,
    fontSize: 14,
    fontWeight: "bold",
  },
  timeSeparator: {
    color: COLORS.white,
    fontWeight: "bold",
  },

  // Tabs
  tabsContainer: {
    paddingLeft: 24,
  },
  tabsContent: {
    paddingRight: 48,
    gap: 12,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: COLORS.lightGray,
    minWidth: 70,
    alignItems: "center",
  },
  tabItemSelected: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.blue,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  tabTextSelected: {
    color: COLORS.blue,
  },

  // Product Card
  productCard: {
    width: COLUMN_WIDTH,
  },
  imageContainer: {
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: COLUMN_WIDTH * 1.3,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: COLORS.red,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  productInfo: {
    marginTop: 12,
  },
  productName: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: "500",
    marginBottom: 4,
  },

  // Footer / Banner
  footerContainer: {
    marginTop: 20,
    paddingHorizontal: 24,
  },
  bannerContent: { backgroundColor: "#ff6b35", borderRadius: 16, height: 160, flexDirection: "row", overflow: "hidden", position: "relative" },
  bannerTextContent: { flex: 1, justifyContent: "center", paddingLeft: 24 },
  bannerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  bannerSubtitle: { fontSize: 14, color: "#fff", opacity: 0.9, marginBottom: 12 },
  happeningBtn: { backgroundColor: "#fff", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  happeningText: { color: "#ff6b35", fontWeight: "bold", fontSize: 12 },
  bannerImage: { width: 140, height: 140, alignSelf: "flex-end" },

  // Added styles for dynamic banner & popular items
  bannerContainer: { marginBottom: 20 },
  bannerTextContainer: { flex: 1, paddingLeft: 24, justifyContent: "center" },
  paginationContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 12, gap: 8 },
  paginationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E5E7EB" },
  paginationDotActive: { width: 24, backgroundColor: "#0055FF" },

  popularCardGrid: { width: 160, backgroundColor: "#fff", borderRadius: 16, padding: 8, marginBottom: 16, marginRight: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 },
  popularImageGrid: { width: "100%", height: 160, borderRadius: 12, backgroundColor: "#f5f5f5" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, marginTop: 8 },
  heartText: { fontSize: 12, color: "#EF4444", fontWeight: "bold", marginLeft: 4 },
  ratingText: { fontSize: 11, color: "#666" },
  popularNameGrid: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginTop: 6, marginBottom: 4, lineHeight: 20, paddingHorizontal: 4 },

  // Most Popular
  mostPopularSection: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  seeAllText: {
    color: COLORS.blue,
    fontSize: 14,
    fontWeight: "700",
  },
  seeAllIcon: {
    backgroundColor: COLORS.blue,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  popularList: {
    gap: 16,
  },
  popularCard: {
    width: 130,
  },
  popularImageContainer: {
    position: "relative",
  },
  popularImage: {
    width: 130,
    height: 130,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  popularLabel: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  popularLabelText: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.gray,
  },
  popularInfo: {
    marginTop: 8,
  },
  popularPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  popularPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.dark,
  },
});
