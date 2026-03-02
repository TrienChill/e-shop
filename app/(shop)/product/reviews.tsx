import { supabase } from "@/src/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BASE_URL = "https://your-supabase-project.supabase.co";
const BUCKET_NAME = "avatars";

export default function AllReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Nhận params
  const params = useLocalSearchParams();

  // Expo Router đôi khi đặt ID sản phẩm vào key 'id' nếu file nằm trong thư mục [id]
  // Vì vậy ta dùng một biến dự phòng (fallback)
  const productId = params.productId || params.id;
  const productName = params.productName || "Sản phẩm";
  useEffect(() => {
    const fetchAllReviews = async () => {
      // Log để kiểm tra giá trị thực tế ngay khi vào hàm
      console.log("Giá trị productId dùng để query:", productId);

      if (!productId) {
        console.error("Không tìm thấy productId để truy vấn!");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("reviews")
          .select(
            `
            *,
            profiles (full_name, avatar_url)
          `,
          )
          .eq("product_id", productId) // Supabase sẽ tự ép kiểu nếu productId là string số
          .order("created_at", { ascending: false });

        if (error) throw error;
        setReviews(data || []);
      } catch (error) {
        console.error("Lỗi lấy danh sách đánh giá:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllReviews();
  }, [productId]);

  console.log("Dữ liệu nhận được từ Params:", { productId });
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Đánh giá: {productName}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          // 1. Xác định link Avatar (Ưu tiên avatar_url từ db, nếu không dùng ảnh mặc định)
          const userAvatar = item.profiles?.avatar_url
            ? item.profiles.avatar_url.startsWith("http")
              ? item.profiles.avatar_url
              : `${BASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${item.profiles.avatar_url}` // Nếu dùng Supabase Storage
            : `https://i.pravatar.cc/100?u=${item.user_id}`; // Fallback ảnh mặc định theo User ID

          return (
            <View style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                {/* 2. Thêm Image Component */}
                <Image source={{ uri: userAvatar }} style={styles.avatar} />
                <View style={styles.reviewMeta}>
                  <Text style={styles.userName}>
                    {item.profiles?.full_name || "Người dùng"}
                  </Text>
                  <Text style={styles.ratingText}>⭐ {item.rating}/5</Text>
                </View>
                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleDateString("vi-VN")}
                </Text>
              </View>
              <Text style={styles.comment}>{item.comment}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Chưa có nhận xét nào.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  listContent: { padding: 16 },

  userName: { fontWeight: "700", marginBottom: 4 },
  ratingText: { color: "#FBBF24", marginBottom: 8 },
  comment: { color: "#4B5563", lineHeight: 20 },
  emptyText: { textAlign: "center", color: "#9CA3AF", marginTop: 20 },

  // -- Thêm Styles mới cho Avatar --
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22, // Làm hình tròn (50% của width/height)
    backgroundColor: "#E5E7EB", // Màu nền mờ khi ảnh chưa load
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  reviewMeta: {
    flex: 1,
    gap: 2,
  },
  // -- Cập nhật lại style cũ để giao diện đẹp hơn --
  reviewItem: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  date: {
    fontSize: 11,
    color: "#9CA3AF",
    alignSelf: "flex-start",
  },
});
