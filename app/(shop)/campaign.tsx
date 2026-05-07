import { PriceDisplay } from "@/src/components/common/PriceDisplay";
import { supabase } from "@/src/lib/supabase";
import { calculateDiscountedPrice } from "@/src/services/product";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CampaignScreen() {
  const router = useRouter();
  const { ids, title } = useLocalSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { width: winWidth } = useWindowDimensions();
  const isWeb = Platform.OS === "web" && winWidth >= 1024;
  const numColumns = isWeb ? 4 : 2;


  useEffect(() => {
    if (ids) {
      const productIds =
        typeof ids === "string"
          ? ids
              .split(",")
              .map((id) => parseInt(id.trim(), 10))
              .filter((id) => !isNaN(id))
          : Array.isArray(ids)
            ? ids
                .map((id) => parseInt(id.trim(), 10))
                .filter((id) => !isNaN(id))
            : [];

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
        .select(
          `
          *,
          product_discounts (
            id, discount_type, discount_value, is_active, start_date, end_date
          )
        `,
        )
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
        style={styles.gridCard}
        onPress={() => router.push(`/(shop)/product/${item.id}` as any)}
      >
        <View style={styles.gridCardImgWrap}>
          <Image
            source={{
              uri:
                item.images?.[0] ||
                item.image ||
                "https://via.placeholder.com/300",
            }}
            style={styles.gridCardImg}
            resizeMode="cover"
          />
        </View>
        <View style={styles.gridCardInfo}>
          <Text style={styles.gridCardName} numberOfLines={2}>
            {item.name}
          </Text>
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
          key={numColumns}
          data={products}
          keyExtractor={(item) => item.id.toString()}
          numColumns={numColumns}
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
    borderColor: "#E5E7EB",
  },
  backBtn: { marginRight: 16, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827", flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#6B7280", fontSize: 16 },
  listContent: { padding: 8 },
  row: { justifyContent: "flex-start", gap: 12, marginBottom: 12 },
  gridCard: {
    flex: 1,
    maxWidth: Platform.OS === "web" ? "24%" : "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F0F4",
  },
  gridCardImgWrap: {
    width: "100%",
    aspectRatio: 0.75,
    position: "relative",
    backgroundColor: "#F8F8F8",
    overflow: "hidden",
  },
  gridCardImg: { width: "100%", height: "100%", resizeMode: "cover" },
  gridCardInfo: { padding: 8, gap: 4 },
  gridCardName: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "500",
    lineHeight: 16,
    minHeight: 32,
  },
});
