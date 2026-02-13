import React from "react";
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

const { width } = Dimensions.get("window");

// ==================== MOCK DATA ====================

// Category Grid Data (2x2 images per category)
const CATEGORY_GRID = [
  {
    id: "1",
    name: "Watch",
    count: 212,
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200",
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=200",
      "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=200",
      "https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=200",
    ],
  },
  {
    id: "2",
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
    id: "3",
    name: "Bags",
    count: 92,
    images: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=200",
      "https://images.unsplash.com/photo-1564422170194-896b89110ef8?w=200",
      "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=200",
    ],
  },
  {
    id: "4",
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

// Top Products (circular avatars)
const TOP_PRODUCTS = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200",
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200",
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=200",
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=200",
  },
  {
    id: "5",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200",
  },
];

// New Items
const NEW_ITEMS = [
  {
    id: "1",
    name: "Lorem Ipsum is simply dummy text of the",
    price: "$24.00",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400",
  },
  {
    id: "2",
    name: "Lorem Ipsum is simply dummy text of the",
    price: "$34.00",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400",
  },
  {
    id: "3",
    name: "Lorem Ipsum is simply dummy text of the",
    price: "$42.00",
    image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400",
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

// Most Popular
const MOST_POPULAR = [
  {
    id: "1",
    name: "Lorem Ipsum is simply dummy text of the",
    price: "$26.00",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
  },
  {
    id: "2",
    name: "Lorem Ipsum is simply dummy text of the",
    price: "$29.00",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400",
  },
  {
    id: "3",
    name: "Lorem Ipsum is simply dummy text of the",
    price: "$32.00",
    image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400",
  },
  {
    id: "4",
    name: "Lorem Ipsum is simply dummy text of the",
    price: "$38.00",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400",
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
          <Text style={styles.sectionTitle}>Top Sản phẩm bán chạy</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topProductsList}
          >
            {TOP_PRODUCTS.map((product) => (
              <TouchableOpacity key={product.id} style={styles.topProductItem}>
                <View style={styles.topProductBorder}>
                  <Image
                    source={{ uri: product.image }}
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
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Chi tiết</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {NEW_ITEMS.map((item) => (
              <View key={item.id} style={styles.productCard}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.productPrice}>{item.price}</Text>
              </View>
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
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Chi tiết</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <View style={styles.popularGrid}>
            {MOST_POPULAR.map((item) => (
              <View key={item.id} style={styles.popularCard}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.popularImage}
                  resizeMode="cover"
                />
                <Text style={styles.popularName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.popularPrice}>{item.price}</Text>
              </View>
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
