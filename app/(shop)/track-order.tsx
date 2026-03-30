import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
import { useLocalSearchParams } from "expo-router";

// Bảng màu hệ thống
const COLOR = {
  blue: "#0055FF",
  white: "#FFFFFF",
  lightGray: "#F5F8FF",
  textSecondary: "#666666",
  red: "#FF4D4D",
  dark: "#1A1A1A",
  grayBadge: "#F0F0F0",
};

const TIMELINE_DATA = [
  {
    id: 1,
    title: "Đã đóng gói",
    time: "19 Tháng 4, 12:31",
    description:
      "Kiện hàng của bạn đã được đóng gói và sẽ được bàn giao cho đối tác vận chuyển của chúng tôi.",
    isCompleted: true,
  },
  {
    id: 2,
    title: "Đang trên đường đến kho vận chuyển",
    time: "19 Tháng 4, 16:20",
    description:
      "Đơn hàng đang được vận chuyển đến kho tổng để phân loại và điều phối.",
    isCompleted: true,
  },
  {
    id: 3,
    title: "Đã đến kho vận chuyển",
    time: "19 Tháng 4, 19:07",
    description:
      "Kiện hàng đã nhập kho và đang chờ xử lý để giao cho đơn vị vận chuyển địa phương.",
    isCompleted: true,
  },
  {
    id: 4,
    title: "Đã xuất kho",
    time: "20 Tháng 4, 06:15",
    description:
      "Kiện hàng đã rời khỏi kho và đang trên đường tới khu vực của bạn.",
    isCompleted: true,
  },
  {
    id: 5,
    title: "Đang giao hàng",
    time: "22 Tháng 4, 11:10",
    description: "Shipper đang mang kiện hàng đến địa chỉ của bạn.",
    isCompleted: true,
  },
  {
    id: 6,
    title: "Giao hàng không thành công",
    time: "22 Tháng 4, 12:50",
    description:
      "Nỗ lực giao kiện hàng của bạn đã không thành công. Vui lòng kiểm tra lại thông tin.",
    isError: true,
    isCompleted: false,
  },
];

export default function TrackOrderScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Ánh xạ trạng thái từ database sang tiếng Việt
  const statusMap: Record<string, string> = {
    pending: "Chờ xác nhận",
    processing: "Đang lấy hàng",
    shipping: "Đang giao hàng",
    completed: "Đã giao thành công",
    cancelled: "Đã hủy",
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
  }, [orderId]);

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
        {/* Thanh tiến trình (Progress Bar) */}
        <View style={styles.progressSection}>
          <LinearGradient
            colors={[COLOR.blue, "#C084FC", COLOR.red]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressBar}
          >
            <View style={[styles.progressDot, { left: 0 }]} />
            <View style={[styles.progressDot, { left: "50%" }]} />
            <View style={[styles.progressDot, { left: "100%" }]} />
          </LinearGradient>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Đã đóng gói</Text>
            <Text style={[styles.progressLabel, { textAlign: "center" }]}>
              Đang giao
            </Text>
            <Text style={[styles.progressLabel, { textAlign: "right" }]}>
              Thành công
            </Text>
          </View>
        </View>

        {/* Mã vận đơn (Tracking Number Card) */}
        <View style={styles.trackingNumberCard}>
          <View>
            <Text style={styles.trackingLabel}>Trạng thái hiện tại</Text>
            <Text style={styles.trackingValue}>
              {loading
                ? "Đang tải..."
                : statusMap[order?.status] || "Không xác định"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={fetchOrderDetails}
          >
            <View style={styles.copyIcon}>
              <View style={styles.copyLine} />
              <View style={[styles.copyLine, { marginTop: 4 }]} />
              <View style={[styles.copyLine, { marginTop: 4 }]} />
            </View>
          </TouchableOpacity>
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
          {/* Danh sách mốc thời gian (Timeline) */}
          <View style={styles.timelineContainer}>
            {TIMELINE_DATA.map((item, index) => (
              <View key={item.id} style={styles.timelineItem}>
                {/* Line connector */}
                {index !== TIMELINE_DATA.length - 1 && (
                  <View style={styles.timelineLine} />
                )}

                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <TouchableOpacity
                      onPress={() => item.isError && setShowErrorModal(true)}
                      activeOpacity={item.isError ? 0.7 : 1}
                      style={styles.titleContainer}
                    >
                      <Text
                        style={[
                          styles.statusTitle,
                          item.isError && styles.errorText,
                        ]}
                      >
                        {item.title}
                      </Text>
                      {item.isError && (
                        <MoveRight
                          size={18}
                          color={COLOR.blue}
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
                        {item.time}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.statusDescription}>{item.description}</Text>
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
            <Text style={styles.sheetTitle}>Giao hàng không thành công</Text>

            <View style={styles.sheetContent}>
              <Text style={styles.questionText}>Tôi nên làm gì?</Text>
              <Text style={styles.instructionText}>
                Đừng lo lắng, chúng tôi sẽ sớm liên hệ với bạn để sắp xếp thời
                gian giao hàng phù hợp hơn. Bạn cũng có thể liên hệ với chúng
                tôi qua số điện thoại{" "}
                <Text style={styles.phoneHighlight}>+84 000 000 000</Text> hoặc
                chat với bộ phận chăm sóc khách hàng của chúng tôi.
              </Text>

              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => setShowErrorModal(false)}
              >
                <Text style={styles.chatButtonText}>Chat Ngay</Text>
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
});
