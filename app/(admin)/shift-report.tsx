import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Platform, ActivityIndicator, Pressable, ScrollView, Modal } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";
import { Redirect, useRouter } from "expo-router";
import { Download, Calendar, Package, TrendingUp, XCircle, CheckCircle2, Sparkles, Bot, X } from "lucide-react-native";
import * as XLSX from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/src/lib/supabase";
import { format, startOfDay, endOfDay } from "date-fns";
import { AdminDataWrapper } from "@/src/components/admin/AdminDataWrapper";
import { encodeOrderId } from "@/src/utils/orderId";

export default function ShiftReportScreen() {
  const { session, role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [orders, setOrders] = useState<any[]>([]);
  
  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  
  const router = useRouter();

  // Redirect non-admin/staff
  if (!authLoading && !session) return <Redirect href="/(shop)/(tabs)" />;

  const fetchShiftData = async (date: Date) => {
    setLoading(true);
    const start = startOfDay(date).toISOString();
    const end = endOfDay(date).toISOString();

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          total_amount,
          created_at,
          receiver_name,
          payment_method,
          payment_status,
          ghn_order_code
        `)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      alert("Lỗi tải báo cáo ca: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && session) {
      fetchShiftData(selectedDate);
    }
  }, [selectedDate, authLoading, session]);

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Thống kê
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === "completed").length;
  const cancelledOrders = orders.filter(o => o.status === "cancelled" || o.status === "delivery_failed").length;
  const totalRevenue = orders
    .filter(o => o.status === "completed" || o.payment_status === "paid")
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const handleExportExcel = () => {
    if (Platform.OS !== "web") {
      alert("Tính năng xuất Excel chỉ khả dụng trên Web.");
      return;
    }
    if (orders.length === 0) {
      alert("Không có dữ liệu đơn hàng trong ngày này.");
      return;
    }

    const data = orders.map(o => ({
      "Mã đơn": encodeOrderId(o.id),
      "Ngày đặt": new Date(o.created_at).toLocaleString("vi-VN"),
      "Khách hàng": o.receiver_name || "N/A",
      "Thanh toán": `${o.payment_method} - ${o.payment_status === "paid" ? "Đã TT" : "Chưa TT"}`,
      "Trạng thái": o.status,
      "Tổng tiền": o.total_amount || 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Báo cáo ca");

    const fileName = `Bao_cao_ca_${format(selectedDate, "dd-MM-yyyy")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleGenerateAIInsight = async () => {
    if (orders.length === 0) {
      alert("Không có đơn hàng nào trong ca để phân tích.");
      return;
    }
    
    setShowAiModal(true);
    setAiLoading(true);
    setAiInsight(null);
    
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Không tìm thấy Gemini API Key.");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const dateStr = format(selectedDate, "dd/MM/yyyy");
      const cancelRate = totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : "0";

      const prompt = `Bạn là trợ lý AI phân tích ca làm việc cho cửa hàng bán lẻ/thương mại điện tử.
Dưới đây là dữ liệu bán hàng của ca làm việc ngày ${dateStr}:

- Tổng số đơn hàng phát sinh: ${totalOrders} đơn
- Tổng doanh thu ước tính: ${totalRevenue.toLocaleString("vi-VN")}₫
- Đơn hàng hoàn thành: ${completedOrders} đơn
- Đơn hàng bị hủy/giao thất bại: ${cancelledOrders} đơn (Tỷ lệ: ${cancelRate}%)

Hãy viết một báo cáo ca làm việc ngắn gọn (dành cho quản lý và nhân viên trực ca) theo 2 phần:
1. **Tổng kết ca**: Đánh giá nhanh về hiệu suất ca làm việc, nhận xét về mức doanh thu và tỷ lệ thành công của đơn hàng. Đặc biệt lưu ý nếu tỷ lệ hủy đơn cao.
2. **Đề xuất chú ý**: Đưa ra 1-2 lời khuyên thực tế để nhân viên ca sau chú ý (ví dụ: cần gọi điện xác nhận kỹ hơn nếu nhiều đơn hủy, hoặc chuẩn bị hàng hóa bán chạy).

Viết bằng tiếng Việt, ngắn gọn, súc tích, văn phong chuyên nghiệp nhưng gần gũi. Không dùng markdown code block, chỉ dùng **in đậm** cho tiêu đề và dấu - cho danh sách.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      setAiInsight(text);
    } catch (err: any) {
      setAiInsight(`Đã xảy ra lỗi khi tạo báo cáo: ${err.message ?? "Lỗi không xác định"}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Báo cáo ca làm việc</Text>
          <Text style={styles.subtitle}>Thống kê đơn hàng và doanh thu theo ngày</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={[styles.btnExport, { backgroundColor: "#8B5CF6" }]} onPress={handleGenerateAIInsight}>
            <Sparkles size={18} color="#fff" />
            <Text style={styles.btnExportText}>Báo cáo AI</Text>
          </Pressable>
          <Pressable style={styles.btnExport} onPress={handleExportExcel}>
            <Download size={18} color="#fff" />
            <Text style={styles.btnExportText}>Xuất Excel</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filterSection}>
        <Pressable onPress={() => handleDateChange(-1)} style={styles.dateBtn}>
          <Text style={styles.dateBtnText}>Ngày trước</Text>
        </Pressable>
        <View style={styles.dateDisplay}>
          <Calendar size={20} color="#2563EB" />
          <Text style={styles.dateText}>{format(selectedDate, "dd/MM/yyyy")}</Text>
        </View>
        <Pressable onPress={() => handleDateChange(1)} style={styles.dateBtn} disabled={startOfDay(selectedDate) >= startOfDay(new Date())}>
          <Text style={[styles.dateBtnText, startOfDay(selectedDate) >= startOfDay(new Date()) && { opacity: 0.5 }]}>Ngày sau</Text>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: "#DBEAFE" }]}>
            <Package size={24} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.statLabel}>Tổng đơn hàng</Text>
            <Text style={styles.statValue}>{totalOrders}</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: "#D1FAE5" }]}>
            <TrendingUp size={24} color="#10B981" />
          </View>
          <View>
            <Text style={styles.statLabel}>Doanh thu ước tính</Text>
            <Text style={[styles.statValue, { color: "#10B981" }]}>
              {totalRevenue.toLocaleString("vi-VN")}₫
            </Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: "#FCE7F3" }]}>
            <XCircle size={24} color="#EF4444" />
          </View>
          <View>
            <Text style={styles.statLabel}>Đơn hủy / Thất bại</Text>
            <Text style={[styles.statValue, { color: "#EF4444" }]}>{cancelledOrders}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tableCard}>
        <Text style={styles.tableTitle}>Danh sách đơn hàng ngày {format(selectedDate, "dd/MM/yyyy")}</Text>
        
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 1 }]}>MÃ ĐƠN</Text>
          <Text style={[styles.th, { flex: 2 }]}>KHÁCH HÀNG</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>TRẠNG THÁI</Text>
          <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>TỔNG TIỀN</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 40 }} />
        ) : orders.length === 0 ? (
          <Text style={styles.emptyText}>Không có đơn hàng nào.</Text>
        ) : (
          orders.map((o) => (
            <AdminDataWrapper key={o.id} onPress={() => router.push(`/(admin)/orders/${o.id}` as any)} style={styles.row}>
              <Text style={[styles.td, { flex: 1, fontWeight: "600", color: "#374151" }]}>
                {encodeOrderId(o.id)}
              </Text>
              <Text style={[styles.td, { flex: 2 }]}>{o.receiver_name || "Khách"}</Text>
              <Text style={[styles.td, { flex: 1.5 }]}>{o.status}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right", fontWeight: "600" }]}>
                {o.total_amount?.toLocaleString("vi-VN")}₫
              </Text>
            </AdminDataWrapper>
          ))
        )}
      </View>

      {/* AI Modal */}
      <Modal visible={showAiModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.aiModalContent}>
            <View style={styles.aiModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.aiIconBadge}>
                  <Bot size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.aiModalTitle}>Báo cáo ca bằng AI</Text>
              </View>
              <Pressable onPress={() => setShowAiModal(false)} style={styles.closeBtn}>
                <X size={20} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView style={styles.aiModalBody}>
              {aiLoading ? (
                <View style={styles.aiLoadingContainer}>
                  <ActivityIndicator size="large" color="#8B5CF6" />
                  <Text style={styles.aiLoadingText}>AI đang phân tích ca làm việc ngày {format(selectedDate, "dd/MM/yyyy")}...</Text>
                </View>
              ) : (
                <Text style={styles.aiInsightText}>{aiInsight}</Text>
              )}
            </ScrollView>
            
            {!aiLoading && (
              <View style={styles.aiModalFooter}>
                 <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Báo cáo được tạo bởi Gemini AI</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  scrollContainer: { padding: 24, paddingBottom: 100 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280" },
  headerActions: { flexDirection: "row", gap: 12 },
  btnExport: { flexDirection: "row", alignItems: "center", backgroundColor: "#10B981", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8 },
  btnExportText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  filterSection: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 24, gap: 24 },
  dateBtn: { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 8 },
  dateBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  dateDisplay: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateText: { fontSize: 16, fontWeight: "700", color: "#111827" },
  statsGrid: { flexDirection: "row", gap: 16, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: "#fff", padding: 20, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  statIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  statLabel: { fontSize: 13, color: "#6B7280", fontWeight: "500", marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: "700", color: "#111827" },
  tableCard: { backgroundColor: "#fff", borderRadius: 12, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  tableTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 16 },
  tableHeader: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginBottom: 8 },
  th: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", cursor: "pointer" } as any,
  td: { fontSize: 14, color: "#4B5563" },
  emptyText: { textAlign: "center", color: "#6B7280", paddingVertical: 32 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  aiModalContent: { width: "100%", maxWidth: 600, backgroundColor: "#fff", borderRadius: 16, maxHeight: "80%", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 10 },
  aiModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  aiIconBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#EDE9FE", justifyContent: "center", alignItems: "center" },
  aiModalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  closeBtn: { padding: 4 },
  aiModalBody: { padding: 20 },
  aiLoadingContainer: { alignItems: "center", paddingVertical: 40, gap: 16 },
  aiLoadingText: { color: "#6B7280", fontSize: 15, fontWeight: "500" },
  aiInsightText: { fontSize: 15, lineHeight: 24, color: "#374151" },
  aiModalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: "#F3F4F6", alignItems: "flex-end" }
});
