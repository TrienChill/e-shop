import { supabase } from "@/src/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, PencilLine, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import ReviewModal from "@/src/components/modals/ReviewModal";
import {
  ActivityIndicator,
  Alert,
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
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Review Edit states
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);

  // Nhận params
  const params = useLocalSearchParams();

  // Expo Router đôi khi đặt ID sản phẩm vào key 'id' nếu file nằm trong thư mục [id]
  // Vì vậy ta dùng một biến dự phòng (fallback)
  const productId = params.productId || params.id;
  const productName = params.productName || "Sản phẩm";

  const fetchAllReviews = async () => {
      console.log("Giá trị productId dùng để query:", productId);

      if (!productId) {
        console.error("Không tìm thấy productId để truy vấn!");
        setLoading(false);
        return;
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) setCurrentUser(userData.user);

        const { data, error } = await supabase
          .from("reviews")
          .select(
            `
            *,
            profiles (full_name, avatar_url),
            orders (time_finished)
          `,
          )
          .eq("product_id", productId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setReviews(data || []);
      } catch (error) {
        console.error("Lỗi lấy danh sách đánh giá:", error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchAllReviews();
  }, [productId]);

  const handleDeleteReview = async (reviewId: string, orderItemId: number) => {
    Alert.alert("Xác nhận xoá", "Bạn có chắc chắn muốn xoá đánh giá này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          try {
            const { error: deleteError } = await supabase.from("reviews").delete().eq("id", reviewId);
            if (deleteError) throw deleteError;

            // Update is_reviewed
            const { error: updateError } = await supabase.from("order_items").update({ is_reviewed: false }).eq("id", orderItemId);
            if (updateError) throw updateError;
            
            fetchAllReviews();
            Alert.alert("Thành công", "Đã xoá đánh giá.");
          } catch (err: any) {
            Alert.alert("Lỗi", "Không thể xoá: " + err.message);
          }
        }
      }
    ]);
  };

  const handleEditSubmit = async (data: { rating: number; comment: string; images: string[] }) => {
    if (!selectedReview) return;
    try {
      const { error } = await supabase.from("reviews").update({
        rating: data.rating,
        comment: data.comment,
        images: data.images,
        is_edited: true
      }).eq("id", selectedReview.id);
      
      if (error) throw error;
      
      Alert.alert("Thành công", "Cập nhật đánh giá thành công!");
      fetchAllReviews();
    } catch (err: any) {
      Alert.alert("Lỗi", "Không thể cập nhật: " + err.message);
    } finally {
      setModalVisible(false);
      setSelectedReview(null);
    }
  };

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

          // Check 30 days editable rule
          const isOwnReview = currentUser?.id === item.user_id;
          const timeFinished = item.orders?.time_finished || item.created_at;
          const finishDateObj = new Date(timeFinished);
          const diffTime = new Date().getTime() - finishDateObj.getTime();
          const diffDays = Math.ceil(Math.abs(diffTime) / (1000 * 60 * 60 * 24));
          const isEditable = isOwnReview && diffDays <= 30;

          return (
            <View style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                {/* 2. Thêm Image Component */}
                <Image source={{ uri: userAvatar }} style={styles.avatar} />
                <View style={styles.reviewMeta}>
                  <Text style={styles.userName}>
                    {isOwnReview ? "Bạn" : (item.profiles?.full_name || "Người dùng")}
                  </Text>
                  <Text style={styles.ratingText}>⭐ {item.rating}/5</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.date}>
                    {new Date(item.created_at).toLocaleDateString("vi-VN")}
                  </Text>
                  {isEditable && (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity onPress={() => { setSelectedReview(item); setModalVisible(true); }}>
                        <PencilLine size={16} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteReview(item.id, item.order_item_id)}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.comment}>{item.comment}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Chưa có nhận xét nào.</Text>
        }
      />
      <ReviewModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleEditSubmit}
        product={selectedReview ? {
          name: productName as string,
          variant: "",
          image: "" // fallback image if not provided
        } : null}
        initialRating={selectedReview?.rating}
        initialComment={selectedReview?.comment}
        initialImages={selectedReview?.images}
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
