import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  FlatList,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Clock, ArrowRight, Heart } from "lucide-react-native";
import { PriceDisplay } from "@/src/components/common/PriceDisplay";
import CommonHeader from "@/src/components/layout/Header";
import { getFlashSaleProducts } from "@/src/services/product";

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

const DISCOUNT_LEVELS = ["Tất cả", "10%", "20%", "30%", "40%", "50%"];

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

const DiscountTabs = ({ selected, onSelect }: { selected: string; onSelect: (val: string) => void }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      {DISCOUNT_LEVELS.map((level) => (
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

  useEffect(() => {
    const fetchFlashSale = async () => {
      const data = await getFlashSaleProducts();
      setFlashSaleData(data);
    };
    fetchFlashSale();
  }, []);

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

      <DiscountTabs selected={selectedDiscount} onSelect={setSelectedDiscount} />
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      {/* Big Sale Banner */}
      <View style={styles.bigSaleBanner}>
        <View style={styles.bannerTextContent}>
          <Text style={styles.bannerTitle}>Big Sale</Text>
          <Text style={styles.bannerSubtitle}>Lên đến 50%</Text>
          <TouchableOpacity style={styles.happeningBtn}>
            <Text style={styles.happeningText}>Đang diễn ra</Text>
          </TouchableOpacity>
        </View>
        <Image 
          source={{ uri: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400" }} 
          style={styles.bannerImage} 
        />
      </View>

      {/* Most Popular Section */}
      <View style={styles.mostPopularSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Phổ biến nhất</Text>
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
          {POPULAR_PRODUCTS.map((item) => (
            <PopularItemCard key={item.id} item={item} />
          ))}
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
  bigSaleBanner: {
    backgroundColor: "#FFD700", // Yellowish background for banner
    borderRadius: 20,
    height: 160,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 40,
  },
  bannerTextContent: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.dark,
  },
  bannerSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.dark,
    marginTop: 4,
  },
  happeningBtn: {
    backgroundColor: COLORS.blue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  happeningText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  bannerImage: {
    width: 140,
    height: 160,
    backgroundColor: COLORS.lightBlue,
  },

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
