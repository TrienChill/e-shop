import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Heart, ShoppingCart, Trash2, ArrowRight } from "lucide-react-native";
import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/src/lib/supabase";
import { calculateDiscountedPrice } from "@/src/services/product";

// Mock data cho "Recently Viewed" và "Most Popular"
const RECENTLY_VIEWED = [
  { id: "r1", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200" },
  { id: "r2", image: "https://images.unsplash.com/photo-1539109132382-381bb3f03045?w=200" },
  { id: "r3", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200" },
  { id: "r4", image: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=200" },
  { id: "r5", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200" },
];

export default function WishlistScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchWishlist();
    fetchPopular();
  }, []);

  const fetchWishlist = async () => {
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
              discounts (*)
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
  };

  const fetchPopular = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`*, product_discounts(discounts(*))`)
        .limit(6);
      if (error) throw error;
      setPopularProducts((data || []).map(calculateDiscountedPrice));
    } catch (error) {
      console.error("Lỗi lấy sản phẩm phổ biến:", error);
    }
  };

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
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Đã xem gần đây</Text>
        <TouchableOpacity style={styles.circleBtnActive}>
          <ArrowRight size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
        {RECENTLY_VIEWED.map(item => (
          <View key={item.id} style={styles.recentAvatarContainer}>
            <Image source={{ uri: item.image }} style={styles.recentAvatar} />
          </View>
        ))}
      </ScrollView>
    </View>
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

        <View style={styles.tagRow}>
          <View style={styles.tag}><Text style={styles.tagText}>Hồng</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>Size M</Text></View>
        </View>

        <TouchableOpacity style={styles.cartBtn}>
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

      <View style={[styles.section, { marginTop: 40 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Phổ biến nhất</Text>
          <TouchableOpacity style={styles.seeAllContainer}>
            <Text style={styles.seeAllText}>Xem tất cả</Text>
            <View style={styles.circleBtnSmall}>
              <ArrowRight size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularList}>
          {popularProducts.map(item => (
            <View key={item.id} style={styles.popularCard}>
              <Image source={{ uri: item.images?.[0] }} style={styles.popularImage} />
              <View style={styles.popularInfo}>
                <View style={styles.loveCount}>
                  <Text style={styles.loveText}>1780</Text>
                  <Heart size={14} color="#0055FF" fill="#0055FF" />
                </View>
                <View style={styles.statusBadge}>
                   <Text style={styles.statusText}>New</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
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
        showsVerticalScrollIndicator={false}
      />
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
  
  recentList: { paddingLeft: 20 },
  recentAvatarContainer: { 
    marginRight: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    paddingBottom: 10
  },
  recentAvatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: "#fff" },

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
  
  popularList: { paddingLeft: 20 },
  popularCard: { width: 140, marginRight: 15 },
  popularImage: { width: 140, height: 180, borderRadius: 15, backgroundColor: "#F3F4F6" },
  popularInfo: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, alignItems: "center" },
  loveCount: { flexDirection: "row", alignItems: "center" },
  loveText: { fontSize: 13, fontWeight: "700", marginRight: 4 },
  statusBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 11, color: "#6B7280", fontWeight: "bold" },
});
