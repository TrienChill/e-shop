import { supabase } from "@/src/lib/supabase";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// Import PopularCard nếu bạn để nó ở file riêng, hoặc copy function vào đây
import { PopularCard } from "@/src/components/card/PopularCard";

export default function PopularProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllPopular = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            product_discounts (
              discounts (*)
            )
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false }); // Ưu tiên hàng mới

        if (error) throw error;
        
        // Import hàm tính toán từ service
        const { calculateDiscountedPrice } = require("@/src/services/product");
        const processed = (data || []).map(calculateDiscountedPrice);
        
        setProducts(processed);
      } catch (error) {
        console.error("Lỗi lấy danh sách sản phẩm:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPopular();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header điều hướng */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sản phẩm phổ biến</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2} // Hiển thị 2 cột
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <PopularCard
              item={{
                ...item,
                image: item.images?.[0] || "https://via.placeholder.com/300",
                badge: item.stock < 5 ? "Sắp hết" : "Hot",
                badgeColor: item.stock < 5 ? "#FBBF24" : "#EF4444",
              }}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

// Styles để đảm bảo giao diện lưới đẹp mắt
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  backBtn: { padding: 8 },
  listContent: { padding: 8 },
  row: {
    justifyContent: "space-between",
  },
  cardWrapper: {
    flex: 0.5, // Chia đôi màn hình
    padding: 8,
  },
});
