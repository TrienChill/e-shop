import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Modal,
  Platform, // For cross-platform support styling
} from "react-native";
import { Star, Eye, EyeOff, MessageSquare, Image as ImageIcon, X, Filter } from "lucide-react-native";
import {
  AdminReview,
  fetchAdminReviews,
  toggleReviewVisibility,
  replyToReview,
} from "@/src/services/admin/review";
import { AdminDataWrapper } from "@/src/components/admin/AdminDataWrapper";

export default function AdminReviewsScreen() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [visibleFilter, setVisibleFilter] = useState<boolean | null>(null);
  const LIMIT = 10;

  // Modals States
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyModal, setReplyModal] = useState<{ isOpen: boolean; reviewId: string; content: string }>({
    isOpen: false,
    reviewId: "",
    content: "",
  });

  // Toasts
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadReviews = async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchAdminReviews({
        page,
        limit: LIMIT,
        rating: ratingFilter,
        isVisible: visibleFilter,
      });
      setReviews(data);
      setTotalCount(count);
    } catch (err) {
      showToast("Lỗi tải đánh giá", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [page, ratingFilter, visibleFilter]);

  // Handle Actions
  const handleToggleVisibility = async (review: AdminReview) => {
    try {
      await toggleReviewVisibility(review.id, review.is_visible);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id ? { ...r, is_visible: !r.is_visible } : r
        )
      );
      showToast(review.is_visible ? "Tạm ẩn đánh giá thành công" : "Hiển thị đánh giá thành công");
    } catch (err) {
      showToast("Lỗi cập nhật trạng thái", "error");
    }
  };

  const handleReplySubmit = async () => {
    if (!replyModal.content.trim()) return showToast("Nội dung không được để trống", "error");
    
    try {
      await replyToReview(replyModal.reviewId, replyModal.content.trim());
      setReviews((prev) =>
        prev.map((r) =>
          r.id === replyModal.reviewId ? { ...r, admin_reply: replyModal.content.trim() } : r
        )
      );
      setReplyModal({ isOpen: false, reviewId: "", content: "" });
      showToast("Gửi phản hồi thành công!");
    } catch (err) {
      showToast("Lỗi gửi phản hồi", "error");
    }
  };

  // Render Helpers
  const renderStars = (rating: number) => {
    return (
      <View style={styles.starContainer}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <Star
            key={idx}
            size={14}
            color={idx < rating ? "#F59E0B" : "#D1D5DB"}
            fill={idx < rating ? "#F59E0B" : "transparent"}
          />
        ))}
      </View>
    );
  };

  const totalPages = Math.ceil(totalCount / LIMIT) || 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={true}
    >
      {/* Toast */}
      {toast && (
        <View style={[styles.toast, toast.type === "error" ? styles.toastError : styles.toastSuccess]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}

      {/* Header & Filters */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Quản lý Đánh giá</Text>
          <Text style={styles.subtitle}>Tổng cộng {totalCount} đánh giá từ khách hàng</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <Filter size={18} color="#6B7280" style={{ marginRight: 8 }} />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Lọc theo sao */}
          <Pressable style={[styles.filterChip, ratingFilter === null && styles.filterChipActive]}
                     onPress={() => { setRatingFilter(null); setPage(1); }}>
            <Text style={[styles.filterChipText, ratingFilter === null && styles.filterActiveText]}>Tất cả sao</Text>
          </Pressable>
          {[5, 4, 3, 2, 1].map((star) => (
            <Pressable key={star} style={[styles.filterChip, ratingFilter === star && styles.filterChipActive]}
                       onPress={() => { setRatingFilter(star); setPage(1); }}>
              <Text style={[styles.filterChipText, ratingFilter === star && styles.filterActiveText]}>{star} Sao</Text>
            </Pressable>
          ))}

          <View style={styles.filterDivider} />

          {/* Lọc theo trạng thái */}
          <Pressable style={[styles.filterChip, visibleFilter === null && styles.filterChipActive]}
                     onPress={() => { setVisibleFilter(null); setPage(1); }}>
            <Text style={[styles.filterChipText, visibleFilter === null && styles.filterActiveText]}>Tất cả CT</Text>
          </Pressable>
          <Pressable style={[styles.filterChip, visibleFilter === true && styles.filterChipActive]}
                     onPress={() => { setVisibleFilter(true); setPage(1); }}>
            <Text style={[styles.filterChipText, visibleFilter === true && styles.filterActiveText]}>Đang hiện</Text>
          </Pressable>
          <Pressable style={[styles.filterChip, visibleFilter === false && styles.filterChipActive]}
                     onPress={() => { setVisibleFilter(false); setPage(1); }}>
            <Text style={[styles.filterChipText, visibleFilter === false && styles.filterActiveText]}>Đã ẩn</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Main List */}
      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
      ) : reviews.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageSquare size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Chưa có đánh giá nào</Text>
          <Text style={styles.emptySub}>Không tìm thấy dữ liệu phù hợp với bộ lọc hiện tại.</Text>
        </View>
      ) : (
        <>
          <View style={styles.listContainer}>
            {reviews.map((review) => (
              <AdminDataWrapper key={review.id} style={[styles.card, !review.is_visible && styles.cardHidden]}>

                {/* Cột trái: Avatar */}
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ uri: review.profile?.avatar_url || "https://via.placeholder.com/150" }}
                    style={styles.avatar}
                  />
                </View>

                {/* Cột phải: Toàn bộ nội dung */}
                <View style={styles.contentContainer}>

                  {/* Dòng 1: Tên, Sản phẩm, Ngày */}
                  <View style={styles.headerRow}>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{review.profile?.full_name || "Nhà thám hiểm ẩn danh"}</Text>
                      <Text style={styles.productName} numberOfLines={1}>SP: {review.product?.name || "Không rõ"}</Text>
                    </View>
                    <Text style={styles.dateText}>
                      {new Date(review.created_at).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </Text>
                  </View>

                  {/* Dòng 2: Rating, Comment, Gallery */}
                  <View style={styles.reviewBody}>
                    {renderStars(review.rating)}
                    <Text style={styles.commentText}>{review.comment || "Khách hàng không để lại bình luận"}</Text>

                    {review.images && review.images.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
                        {review.images.map((img, idx) => (
                          <Pressable key={idx} onPress={() => setSelectedImage(img)}>
                            <Image source={{ uri: img }} style={styles.thumbnail} />
                          </Pressable>
                        ))}
                      </ScrollView>
                    )}
                  </View>

                  {/* Dòng 3: Admin Reply */}
                  {review.admin_reply && (
                    <View style={styles.adminReplyBox}>
                      <Text style={styles.adminReplyTitle}>Admin đã phản hồi:</Text>
                      <Text style={styles.adminReplyText}>{review.admin_reply} 👍</Text>
                    </View>
                  )}

                  {/* Dòng 4: Badges + Action Buttons */}
                  <View style={styles.actionsRow}>
                    <View style={styles.badgeRow}>
                      {review.rating <= 2 ? (
                        <View style={styles.badgeDanger}><Text style={styles.badgeDangerText}>Tiêu cực</Text></View>
                      ) : review.rating === 5 ? (
                        <View style={styles.badgeSuccess}><Text style={styles.badgeSuccessText}>Tuyệt vời</Text></View>
                      ) : null}
                      {!review.is_visible && (
                        <View style={styles.badgeWarning}><Text style={styles.badgeWarningText}>Đã bị ẩn</Text></View>
                      )}
                    </View>

                    <View style={styles.actionButtons}>
                      <Pressable
                        style={[styles.actionBtn, review.is_visible ? styles.btnDanger : styles.btnSuccess]}
                        onPress={() => handleToggleVisibility(review)}
                      >
                        {review.is_visible ? <EyeOff size={15} color="#EF4444" /> : <Eye size={15} color="#10B981" />}
                        <Text style={[styles.actionBtnText, { color: review.is_visible ? "#EF4444" : "#10B981" }]}>
                          {review.is_visible ? "Ẩn bài" : "Bỏ ẩn"}
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[styles.actionBtn, styles.btnPrimary]}
                        onPress={() => setReplyModal({ isOpen: true, reviewId: review.id, content: review.admin_reply || "" })}
                      >
                        <MessageSquare size={15} color="#4F46E5" />
                        <Text style={[styles.actionBtnText, { color: "#4F46E5" }]}>
                          {review.admin_reply ? "Sửa phản hồi" : "Phản hồi"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                </View>
              </AdminDataWrapper>
            ))}
          </View>

          {/* Phân trang */}
          <View style={styles.pagination}>
            <Pressable disabled={page === 1} onPress={() => setPage((p) => p - 1)} style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}>
              <Text style={styles.pageBtnText}>Trước</Text>
            </Pressable>
            <Text style={styles.pageText}>Trang {page} / {totalPages}</Text>
            <Pressable disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)} style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}>
              <Text style={styles.pageBtnText}>Sau</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Lightbox Ảnh */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.lightboxContainer}>
          <Pressable style={styles.closeBtn} onPress={() => setSelectedImage(null)}>
            <X size={24} color="#FFF" />
          </Pressable>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.lightboxImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Modal Phản hồi */}
      <Modal visible={replyModal.isOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Phản hồi đánh giá khách hàng</Text>
            <Text style={styles.modalDesc}>Nội dung sẽ được hiển thị công khai trên gian hàng của bạn.</Text>
            
            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={4}
              placeholder="Nhập nội dung phản hồi..."
              value={replyModal.content}
              onChangeText={(text) => setReplyModal((prev) => ({ ...prev, content: text }))}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setReplyModal({ isOpen: false, reviewId: "", content: "" })}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </Pressable>
              <Pressable style={styles.modalSubmitBtn} onPress={handleReplySubmit}>
                <Text style={styles.modalSubmitText}>Gửi phản hồi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
  },
  filterChipText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  filterActiveText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 8,
  },
  listContainer: {},
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    alignItems: "flex-start",
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHidden: {
    opacity: 0.6,
    backgroundColor: "#F9FAFB",
  },
  avatarContainer: {
    width: 48,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
  },
  contentContainer: {
    flex: 1,
    flexDirection: "column",
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userInfo: {
    flex: 1,
    paddingRight: 16,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  productName: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  reviewBody: {
    flexDirection: "column",
    gap: 8,
  },
  starContainer: {
    flexDirection: "row",
  },
  commentText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  gallery: {
    flexDirection: "row",
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#E5E7EB",
  },
  adminReplyBox: {
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#22C55E",
  },
  adminReplyTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 4,
  },
  adminReplyText: {
    fontSize: 13,
    color: "#15803D",
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  badgeDanger: { backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeDangerText: { color: "#991B1B", fontSize: 11, fontWeight: "600" },
  badgeSuccess: { backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeSuccessText: { color: "#166534", fontSize: 11, fontWeight: "600" },
  badgeWarning: { backgroundColor: "#FFFBEB", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#FEF3C7" },
  badgeWarningText: { color: "#B45309", fontSize: 11, fontWeight: "600" },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  btnDanger: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  btnSuccess: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  btnPrimary: { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  pageText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  toast: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  toastSuccess: { backgroundColor: "#F0FDF4", borderLeftWidth: 4, borderLeftColor: "#22C55E" },
  toastError: { backgroundColor: "#FEF2F2", borderLeftWidth: 4, borderLeftColor: "#EF4444" },
  toastText: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
  lightboxContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "80%",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
    backgroundColor: "#F9FAFB",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  modalCancelText: {
    color: "#4B5563",
    fontWeight: "600",
  },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#4F46E5",
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
