import { useSupabaseRealtime } from "@/src/services/useSupabaseRealtime";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, MoveRight } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// eslint-disable-next-line import/no-named-as-default
import CommonHeader from "@/src/components/layout/Header";
import { supabase } from "@/src/lib/supabase";

// Bảng màu hệ thống
const COLOR = {
  blue: "#0055FF",
  white: "#FFFFFF",
  lightGray: "#F5F8FF",
  textSecondary: "#666666",
  red: "#FF4D4D",
  dark: "#1A1A1A",
  grayBadge: "#F0F0F0",
  success: "#10B981", // Xanh lá cho trạng thái hoàn thành
  warning: "#F97316",
  warningLight: "#FFEDD5",
};

export default function TrackOrderScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useSupabaseRealtime({
    table: "orders",
    onUpdate: () => setRefreshTrigger((prev) => prev + 1),
  });

  // 1. Ánh xạ ĐẦY ĐỦ 9 trạng thái từ Database sang Tiếng Việt
  const statusMap: Record<string, string> = {
    pending: "Chờ xác nhận",
    processing: "Đang lấy hàng",
    shipping: "Đang giao hàng",
    completed: "Đã giao thành công",
    delivery_failed: "Giao hàng không thành công",
    cancelled: "Đã hủy",
    return_requested: "Yêu cầu trả hàng",
    returning: "Đang trả hàng về",
    returned: "Kho đã nhận hàng trả",
    refunded: "Đã hoàn tiền",
  };

  const fetchOrderDetails = async () => {
    try {
      if (!orderId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error("Lỗi khi lấy thông tin đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, refreshTrigger]);

  // 2. HÀM TẠO TIMELINE ĐỘNG DỰA TRÊN TRẠNG THÁI HIỆN TẠI
  const generateTimeline = () => {
    if (!order) return [];

    const status = order.status;
    const formatDate = (dateString: string) => {
      if (!dateString) return "";
      const d = new Date(dateString);
      return `${d.getDate()} Thg ${d.getMonth() + 1}, ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
    };

    const createdTime = formatDate(order.created_at);
    const updatedTime = formatDate(order.updated_at);

    // Bước mặc định đầu tiên
    let timeline = [
      {
        id: 1,
        title: "Đơn hàng đã đặt",
        time: createdTime,
        description: "Đơn hàng của bạn đã được hệ thống ghi nhận.",
        isCompleted: true,
        isError: false,
      },
    ];

    // Luồng: Hủy đơn
    if (status === "cancelled") {
      timeline.push({
        id: 2,
        title: "Đơn hàng đã hủy",
        time: updatedTime,
        description:
          "Đơn hàng đã bị hủy. Tiền sẽ được hoàn lại nếu bạn đã thanh toán trước.",
        isCompleted: false,
        isError: true,
      });
      return timeline.reverse(); // Đảo ngược để sự kiện mới nhất lên đầu
    }

    // Luồng: Bình thường (Đang xử lý -> Giao hàng -> Hoàn thành / Giao thất bại)
    const normalFlow = [
      "processing",
      "shipping",
      "completed",
      "delivery_failed",
      "return_requested",
      "returning",
      "returned",
      "refunded",
    ];
    if (normalFlow.includes(status)) {
      timeline.push({
        id: 2,
        title: "Đang xử lý & Đóng gói",
        time: status === "processing" ? updatedTime : "",
        description:
          "Kiện hàng của bạn đang được đóng gói và giao cho đối tác vận chuyển.",
        isCompleted: true,
        isError: false,
      });
    }

    if (
      [
        "shipping",
        "completed",
        "delivery_failed",
        "return_requested",
        "returning",
        "returned",
        "refunded",
      ].includes(status)
    ) {
      timeline.push({
        id: 3,
        title: "Đang giao hàng",
        time: status === "shipping" ? updatedTime : "",
        description: "Shipper đang mang kiện hàng đến địa chỉ của bạn.",
        isCompleted: true,
        isError: false,
      });
    }

    if (status === "delivery_failed") {
      timeline.push({
        id: 4,
        title: "Giao hàng không thành công",
        time: formatDate(order.delivery_failed_at) || updatedTime,
        description: "Sự cố trong quá trình giao hàng.",
        isCompleted: false,
        isError: true,
      });
    }

    if (
      [
        "completed",
        "return_requested",
        "returning",
        "returned",
        "refunded",
      ].includes(status)
    ) {
      timeline.push({
        id: 4,
        title: "Giao hàng thành công",
        time: status === "completed" ? updatedTime : "",
        description: "Kiện hàng đã được giao thành công đến bạn.",
        isCompleted: true,
        isError: false,
      });
    }

    // Luồng: Trả hàng / Hoàn tiền
    if (
      ["return_requested", "returning", "returned", "refunded"].includes(status)
    ) {
      timeline.push({
        id: 5,
        title: "Yêu cầu trả hàng",
        time: status === "return_requested" ? updatedTime : "",
        description: "Hệ thống đã ghi nhận yêu cầu trả hàng của bạn.",
        isCompleted: true,
        isError: true,
      });
    }
    if (["returning", "returned", "refunded"].includes(status)) {
      timeline.push({
        id: 6,
        title: "Đang hoàn trả",
        time: status === "returning" ? updatedTime : "",
        description: "Kiện hàng đang được vận chuyển về lại kho của cửa hàng.",
        isCompleted: true,
        isError: true,
      });
    }
    if (["returned", "refunded"].includes(status)) {
      timeline.push({
        id: 7,
        title: "Đã nhận hàng hoàn",
        time: status === "returned" ? updatedTime : "",
        description: "Kho đã nhận được kiện hàng hoàn trả và đang kiểm tra.",
        isCompleted: true,
        isError: true,
      });
    }
    if (status === "refunded") {
      timeline.push({
        id: 8,
        title: "Hoàn tiền thành công",
        time: updatedTime,
        description: "Tiền đã được hoàn trả thành công về tài khoản của bạn.",
        isCompleted: true,
        isError: false,
      });
    }

    // Đảo ngược mảng để sự kiện mới nhất (cuối cùng) nằm ở TRET CÙNG của màn hình
    return timeline.reverse();
  };

  const currentTimeline = generateTimeline();

  // 3. TÍNH TOÁN PERCENTAGE CHO THANH PROGRESS BAR
  const getProgressPercentage = () => {
    if (!order) return 0;
    const s = order.status;
    if (s === "pending") return 10;
    if (s === "processing") return 50;
    if (s === "shipping") return 75;
    if (s === "completed") return 100;
    if (s === "delivery_failed") return 100;
    if (["return_requested", "returning", "returned", "refunded"].includes(s))
      return 100; // Đã giao thì mới trả được
    return 0; // cancelled
  };

  const progress = getProgressPercentage();

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <CommonHeader
        renderLeft={() => (
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconButton}
            >
              <ChevronLeft size={24} color={COLOR.dark} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
              <Text style={styles.headerSubtitle}>
                Mã đơn: #{orderId || "N/A"}
              </Text>
            </View>
          </View>
        )}
      />

      <View style={styles.headerContent}>
        {order?.status === "delivery_failed" && (
          <>
            <View style={styles.warningBanner}>
              <Text style={styles.warningBannerText}>
                Rất tiếc! Đơn hàng đã giao không thành công.
              </Text>
            </View>
            <View style={styles.reasonCard}>
              <Text style={styles.reasonLabel}>Lý do:</Text>
              <Text style={styles.reasonText}>
                {order?.cancel_reason ||
                  "Không có lý do cụ thể từ đơn vị vận chuyển"}
              </Text>
              <TouchableOpacity
                style={styles.contactSupportButton}
                onPress={() => router.push("/(shop)/support")}
              >
                <Text style={styles.contactSupportButtonText}>
                  Liên hệ hỗ trợ ngay
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* 4. THANH PROGRESS BAR ĐỘNG */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarBackground}>
            <LinearGradient
              colors={[
                COLOR.blue,
                progress >= 100
                  ? order?.status === "delivery_failed"
                    ? COLOR.warning
                    : COLOR.success
                  : "#C084FC",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progress}%` }]}
            />
            {/* 3 Dấu chấm xác định mốc (Dots) */}
            <View
              style={[
                styles.progressDot,
                {
                  left: 0,
                  backgroundColor: progress >= 10 ? COLOR.blue : "#E5E7EB",
                },
              ]}
            />
            <View
              style={[
                styles.progressDot,
                {
                  left: "50%",
                  backgroundColor: progress >= 50 ? COLOR.blue : "#E5E7EB",
                },
              ]}
            />
            <View
              style={[
                styles.progressDot,
                {
                  left: "100%",
                  backgroundColor:
                    progress >= 100
                      ? order?.status === "completed"
                        ? COLOR.blue
                        : order?.status === "delivery_failed"
                        ? COLOR.warning
                        : COLOR.success
                      : "#E5E7EB",
                },
              ]}
            />
          </View>

          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Xác nhận</Text>
            <Text style={[styles.progressLabel, { textAlign: "center" }]}>
              Đóng gói
            </Text>
            <Text style={[styles.progressLabel, { textAlign: "right" }]}>
              Giao hàng
            </Text>
          </View>
        </View>

        {/* Mã vận đơn (Tracking Number Card) */}
        <View style={styles.trackingNumberCard}>
          <View>
            <Text style={styles.trackingLabel}>Trạng thái hiện tại</Text>
            <Text
              style={[
                styles.trackingValue,
                order?.status === "cancelled" && { color: COLOR.red },
                order?.status === "delivery_failed" && { color: COLOR.warning },
              ]}
            >
              {loading
                ? "Đang tải..."
                : statusMap[order?.status] || "Không xác định"}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLOR.blue} />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 5. VẼ DANH SÁCH TIMELINE */}
          <View style={styles.timelineContainer}>
            {currentTimeline.map((item, index) => (
              <View key={item.id} style={styles.timelineItem}>
                {/* Line connector (Không hiển thị cho item cuối cùng) */}
                {index !== currentTimeline.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      item.isError && { backgroundColor: COLOR.red },
                    ]}
                  />
                )}

                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <TouchableOpacity
                      onPress={() =>
                        item.isError && order?.status === "cancelled"
                          ? setShowErrorModal(true)
                          : null
                      }
                      activeOpacity={item.isError ? 0.7 : 1}
                      style={styles.titleContainer}
                    >
                      <View
                        style={[
                          styles.dotIndicator,
                          item.isError && { backgroundColor: COLOR.red },
                          index === 0 && {
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            marginLeft: -3,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusTitle,
                          item.isError && styles.errorText,
                          index === 0 && {
                            fontWeight: "bold",
                            color: COLOR.dark,
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                      {item.isError && order?.status === "cancelled" && (
                        <MoveRight
                          size={18}
                          color={COLOR.red}
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    </TouchableOpacity>
                    <View
                      style={[
                        styles.timeBadge,
                        item.isError && styles.errorBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeText,
                          item.isError && styles.whiteText,
                        ]}
                      >
                        {item.time || "--:--"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.statusDescription}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Modal Thông báo lỗi (Bottom Sheet) */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowErrorModal(false)}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.sheetIndicator} />
            <Text style={styles.sheetTitle}>Đơn hàng đã bị hủy</Text>
            <View style={styles.sheetContent}>
              <Text style={styles.questionText}>Tôi nên làm gì tiếp theo?</Text>
              <Text style={styles.instructionText}>
                Đơn hàng này đã bị hủy. Nếu bạn đã thanh toán trước qua thẻ/ví
                điện tử, số tiền sẽ được hoàn lại vào tài khoản của bạn trong
                vòng 3-5 ngày làm việc. Bạn có thể liên hệ tổng đài{" "}
                <Text style={styles.phoneHighlight}>+84 000 000 000</Text> để
                biết thêm chi tiết.
              </Text>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => setShowErrorModal(false)}
              >
                <Text style={styles.chatButtonText}>Đã hiểu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.white,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLOR.dark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLOR.textSecondary,
    marginTop: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: COLOR.lightGray,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  progressSection: {
    marginBottom: 24,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  progressLabel: {
    fontSize: 11,
    color: COLOR.textSecondary,
    fontWeight: "500",
    width: "33%",
  },
  progressDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLOR.white,
    borderWidth: 4,
    borderColor: "#F0F0F0",
    position: "absolute",
    transform: [{ translateX: -8 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  trackingNumberCard: {
    backgroundColor: "#F8F9FB",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  trackingLabel: {
    fontSize: 14,
    color: COLOR.textSecondary,
    marginBottom: 4,
  },
  trackingValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLOR.dark,
  },
  copyButton: {
    width: 40,
    height: 40,
    backgroundColor: COLOR.white,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  copyIcon: {
    width: 20,
    alignItems: "flex-end",
  },
  copyLine: {
    width: 18,
    height: 2,
    backgroundColor: COLOR.blue,
    borderRadius: 1,
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: "row",
    paddingBottom: 32,
  },
  timelineLine: {
    position: "absolute",
    left: -2,
    top: 24,
    bottom: 0,
    width: 2,
    backgroundColor: "#EEE",
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  dotIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E5E7EB",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLOR.dark,
  },
  errorText: {
    color: COLOR.blue,
  },
  timeBadge: {
    backgroundColor: COLOR.grayBadge,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  errorBadge: {
    backgroundColor: COLOR.red,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLOR.dark,
  },
  whiteText: {
    color: COLOR.white,
  },
  statusDescription: {
    fontSize: 14,
    color: COLOR.textSecondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: COLOR.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  sheetIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#EEE",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLOR.dark,
    marginBottom: 32,
  },
  sheetContent: {
    gap: 16,
  },
  questionText: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLOR.dark,
  },
  instructionText: {
    fontSize: 16,
    color: COLOR.textSecondary,
    lineHeight: 24,
  },
  phoneHighlight: {
    color: COLOR.dark,
    fontWeight: "bold",
  },
  chatButton: {
    backgroundColor: COLOR.blue,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  chatButtonText: {
    color: COLOR.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLOR.textSecondary,
    fontWeight: "500",
  },
  warningBanner: {
    backgroundColor: COLOR.warningLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningBannerText: {
    color: COLOR.warning,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  reasonCard: {
    backgroundColor: COLOR.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLOR.warningLight,
    shadowColor: COLOR.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLOR.dark,
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 14,
    color: COLOR.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  contactSupportButton: {
    backgroundColor: COLOR.warning,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  contactSupportButtonText: {
    color: COLOR.white,
    fontSize: 14,
    fontWeight: "bold",
  },
});
