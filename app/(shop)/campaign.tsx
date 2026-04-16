import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/src/lib/supabase";
import { calculateDiscountedPrice } from "@/src/services/product";
import { PriceDisplay } from "@/src/components/common/PriceDisplay";

export default function CampaignScreen() {
  const router = useRouter();
  const { ids, title } = useLocalSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids) {
      const productIds = typeof ids === "string" 
        ? ids.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
        : Array.isArray(ids) ? ids.map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)) : [];
        
      if (productIds.length > 0) {
        fetchProducts(productIds);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [ids]);

  const fetchProducts = async (productIds: number[]) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_discounts (
            id, discount_type, discount_value, is_active, start_date, end_date
          )
        `)
        .in("id", productIds)
        .eq("is_active", true);

      if (error) throw error;
      
      const processed = (data || []).map(calculateDiscountedPrice);
      setProducts(processed);
    } catch (e) {
      console.error("Lỗi lấy sản phẩm chiến dịch:", e);
    } finally {
      setLoading(false);
    }
  };

  const renderProductItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => router.push(`/(shop)/product/${item.id}` as any)}
      >
        <Image
          source={{ uri: item.images?.[0] || item.image || "https://via.placeholder.com/300" }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <PriceDisplay
            hasDiscount={item.hasDiscount}
            finalPrice={item.finalPrice}
            originalPrice={item.originalPrice}
            size="md"
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title || "Sản phẩm chiến dịch"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Không tìm thấy sản phẩm nào.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          renderItem={renderProductItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB"
  },
  backBtn: { marginRight: 16, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827", flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#6B7280", fontSize: 16 },
  listContent: { padding: 12 },
  row: { justifyContent: "space-between" },
  productCard: {
    backgroundColor: "white",
    borderRadius: 12,
    width: "48%",
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  productImage: { width: "100%", height: 160 },
  productInfo: { padding: 10, gap: 4 },
  productName: { fontSize: 13, color: "#111827", height: 36, fontWeight: "500", lineHeight: 18 },
});
