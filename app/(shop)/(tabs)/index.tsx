import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import {
  getLatestProducts,
  getMostPopularProducts,
  getTopSellingProducts,
} from "@/src/services/product";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";

const { width } = Dimensions.get("window");

// ==================== MOCK DATA ====================

// Category Grid Data (2x2 images per category)
const CATEGORY_GRID = [
  {
    id: "1",
    name: "Hoodies",
    count: 148,
    images: [
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=200",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=200",
      "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=200",
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=200",
    ],
  },
  {
    id: "2",
    name: "Lingerie",
    count: 67,
    images: [
      "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=200",
      "https://images.unsplash.com/photo-1519696282848-b5fe1175b1e3?w=200",
      "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=200",
      "https://images.unsplash.com/photo-1519696282848-b5fe1175b1e3?w=200",
    ],
  },
];

// Flash Sale Products
const FLASH_SALE_PRODUCTS = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400",
    discount: "-20%",
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
    discount: "-15%",
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=400",
    discount: "-30%",
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400",
    discount: "-25%",
  },
];

// Just For You
const JUST_FOR_YOU = [
  {
    id: "1",
    name: "Lorem Ipsum is simply dummy text of the",
    price: "$2.00",
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400",
  },
  {
    id: "2",
    name: "Lorem Ipsum is simply dummy text of the",
    price: "$2.00",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
  },
  {
    id: "3",
    name: "Lorem Ipsum is simply dummy text of the",
    price: "$2.00",
    image: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=400",
  },
  {
    id: "4",
    name: "Lorem Ipsum is simply dummy text of the",
    price: "$2.00",
    image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400",
  },
];

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
        console.error("Lỗi lấy sản phẩm bán chạy:", error);
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ========== HEADER ========== */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons name="menu" size={28} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>E-Shop</Text>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons name="shopping-bag" size={28} color="#1a1a1a" />
          <View style={styles.cartBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ========== BANNER SECTION ========== */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Giảm giá</Text>
              <Text style={styles.bannerSubtitle}>Giảm đến 50%</Text>
            </View>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400",
              }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* ========== CATEGORIES SECTION ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Phân loại</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Chi tiết</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <View style={styles.categoryGrid}>
            {CATEGORY_GRID.map((category) => (
              <View key={category.id} style={styles.categoryCard}>
                <View style={styles.categoryImageGrid}>
                  {category.images.map((img, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: img }}
                      style={styles.categoryGridImage}
                      resizeMode="cover"
                    />
                  ))}
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryCount}>{category.count}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

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
              onPress={() => router.push("/(shop)/(tabs)/search")} // Chuyển sang trang tìm kiếm/lọc
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
                <Text style={styles.productPrice}>
                  {/* Định dạng tiền tệ nếu cần, ví dụ: item.price.toLocaleString() */}
                  ${item.price}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ========== FLASH SALE SECTION ========== */}
        <View style={styles.section}>
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
            {FLASH_SALE_PRODUCTS.map((product) => (
              <View key={product.id} style={styles.flashSaleCard}>
                <Image
                  source={{ uri: product.image }}
                  style={styles.flashSaleImage}
                  resizeMode="cover"
                />
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{product.discount}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ========== MOST POPULAR SECTION ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nổi tiếng nhất</Text>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => router.push("/(shop)/(tabs)/search")} // Link tới trang lọc hoặc xem tất cả
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
                <Text style={styles.popularPrice}>${item.price}</Text>
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
            {JUST_FOR_YOU.map((item) => (
              <View key={item.id} style={styles.justForYouCard}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.justForYouImage}
                  resizeMode="cover"
                />
                <Text style={styles.justForYouName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.justForYouPrice}>{item.price}</Text>
              </View>
            ))}
          </View>
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

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: 0.5,
  },
  iconButton: {
    padding: 8,
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: 8,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
    borderColor: "#fff",
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
