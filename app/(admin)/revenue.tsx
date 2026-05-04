
import { useAuth } from "@/src/auth/AuthContext";
import { useRouter } from "expo-router";
import { getRevenueReport, RevenueReport, fetchAiReports, saveAiReport, deleteAiReport, AiReport } from "@/src/services/admin/revenue";
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
} from "date-fns";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  Package2,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Bot,
  X,
  BookMarked,
  Trash2,
  Clock,
  Save,
} from "lucide-react-native";
import { GoogleGenerativeAI } from "@google/generative-ai";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Echarts from "@/src/components/admin/EchartsWrapper";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type TimeRange = "day" | "month" | "year" | "custom";

interface FilterState {
  timeRange: TimeRange;
  startDate: Date;
  endDate: Date;
}

// Use the AiReport type from the service layer (Supabase-backed)
type SavedReport = AiReport;

const MAX_SAVED_REPORTS = 5;

// ─────────────────────────────────────────────
// Date-fns helpers
// ─────────────────────────────────────────────
function computeDateRange(range: TimeRange, now = new Date()): { startDate: Date; endDate: Date } {
  switch (range) {
    case "day":
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
    case "month":
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case "year":
      return { startDate: startOfYear(now), endDate: endOfYear(now) };
    default:
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
  }
}

function formatDisplay(d: Date) {
  return format(d, "dd/MM/yyyy");
}

// ─────────────────────────────────────────────
// Shimmer
// ─────────────────────────────────────────────
const Shimmer = ({ width, height, borderRadius = 8, style }: any) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: "#E5E7EB", opacity }, style]}
    />
  );
};

// ─────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────
const KPICard = ({ title, value, subtitle, icon: Icon, color, iconBg, isLoading }: any) => (
  <View style={styles.kpiCard}>
    <View style={styles.kpiCardTop}>
      <View style={[styles.kpiIcon, { backgroundColor: iconBg }]}>
        <Icon size={22} color={color} strokeWidth={2} />
      </View>
    </View>
    <Text style={styles.kpiLabel}>{title}</Text>
    {isLoading ? (
      <Shimmer width={120} height={28} style={{ marginTop: 6 }} />
    ) : (
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    )}
    {subtitle ? <Text style={styles.kpiSub}>{subtitle}</Text> : null}
  </View>
);

// ─────────────────────────────────────────────
// Filter Button (Segmented)
// ─────────────────────────────────────────────
const SegBtn = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity
    style={[styles.segBtn, active && styles.segBtnActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>{label}</Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────
// Simple date input (web/mobile compatible)
// ─────────────────────────────────────────────
const DateField = ({ label, value, onChange, disabled }: {
  label: string; value: Date; onChange: (d: Date) => void; disabled: boolean;
}) => {
  const str = format(value, "yyyy-MM-dd");
  return (
    <View style={[styles.dateField, disabled && styles.dateFieldDisabled]}>
      <Calendar size={14} color={disabled ? "#CBD5E1" : "#6366F1"} style={{ marginRight: 6 }} />
      <Text style={[styles.dateFieldLabel, disabled && { color: "#CBD5E1" }]}>{label}: </Text>
      {Platform.OS === "web" && !disabled ? (
        <input
          type="date"
          value={str}
          onChange={(e) => {
            const d = new Date(e.target.value);
            if (!isNaN(d.getTime())) onChange(d);
          }}
          style={{
            border: "none",
            background: "transparent",
            fontSize: 13,
            fontWeight: "600",
            color: "#111827",
            outline: "none",
            cursor: "pointer",
          }}
        />
      ) : (
        <TextInput
          editable={!disabled}
          value={formatDisplay(value)}
          style={[styles.dateFieldInput, disabled && { color: "#CBD5E1" }]}
          onChangeText={(t) => {
            const parts = t.split("/");
            if (parts.length === 3) {
              const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
              if (!isNaN(d.getTime())) onChange(d);
            }
          }}
        />
      )}
    </View>
  );
};

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
const formatCurrency = (v: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v || 0);

export default function AdminRevenueScreen() {
  const { role } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // ── Filter State ──
  const now = new Date();
  const [filter, setFilter] = useState<FilterState>({
    timeRange: "month",
    ...computeDateRange("month", now),
  });

  // ── Data State ──
  const [reportData, setReportData] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [compareMode, setCompareMode] = useState(false);
  const [prevReportData, setPrevReportData] = useState<RevenueReport | null>(null);

  // ── Derived values from RPC ──
  const TOP_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
  const revenueIn  = reportData?.revenue_in  ?? 0;
  const revenueOut = reportData?.revenue_out ?? 0;
  const profit     = reportData?.profit      ?? 0;
  const trendData  = reportData?.trend_data  ?? [];
  const topProducts = reportData?.top_products ?? [];
  const paymentMethods = reportData?.payment_methods ?? [];
  const heatmapData = reportData?.heatmap ?? [];
  
  const prevTrendData = prevReportData?.trend_data ?? [];

  const totalOrders = trendData.reduce((acc, r) => acc + (r.orders || 0), 0);
  const aovValue = totalOrders > 0 ? revenueIn / totalOrders : 0;

  // ── Change timeRange ──
  const handleRangeChange = useCallback((range: TimeRange) => {
    if (range === "custom") {
      setFilter((f) => ({ ...f, timeRange: "custom" }));
      return;
    }
    const { startDate, endDate } = computeDateRange(range);
    setFilter({ timeRange: range, startDate, endDate });
  }, []);

  // ── Fetch ──
  const handleFilterChange = useCallback(async (start: Date, end: Date, compare: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRevenueReport(start, end);
      setReportData(data);
      if (compare) {
        const diff = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - diff);
        const prevData = await getRevenueReport(prevStart, prevEnd);
        setPrevReportData(prevData);
      } else {
        setPrevReportData(null);
      }
    } catch (e: any) {
      setError(e.message ?? "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleFilterChange(filter.startDate, filter.endDate, compareMode);
  }, [filter.startDate, filter.endDate, compareMode, handleFilterChange]);

  // ── Export state ──
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "info" | "success" | "error" }>({
    visible: false, message: "", type: "info",
  });
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── AI Insight state ──
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // ── Saved Reports state ──
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);

  const showToast = (message: string, type: "info" | "success" | "error" = "info", duration = 2800) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ visible: true, message, type });
    toastTimeout.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), duration);
  };

  // ── Load saved reports từ Supabase ──
  useEffect(() => {
    fetchAiReports()
      .then(setSavedReports)
      .catch(() => {}); // Silent fail (chưa đăng nhập hoặc lỗi kết nối)
  }, []);

  // ── Lưu báo cáo AI lên Supabase ──
  const handleSaveReport = useCallback(async () => {
    if (!aiInsight) return;
    setSavingReport(true);
    try {
      const newReport = await saveAiReport({
        title: `Báo cáo ${format(filter.startDate, "dd/MM")} - ${format(filter.endDate, "dd/MM/yyyy")}`,
        period: `${format(filter.startDate, "dd/MM/yyyy")} → ${format(filter.endDate, "dd/MM/yyyy")}`,
        content: aiInsight,
        kpis: { revenueIn, revenueOut, totalOrders, aovValue },
      });
      // Supabase tự xử lý giới hạn 5, reload lại danh sách
      const updated = await fetchAiReports();
      setSavedReports(updated);
      showToast("✓ Đã lưu báo cáo AI lên Supabase!", "success");
      Alert.alert("Thành công", "Đã lưu báo cáo AI vào hệ thống.");
    } catch (err: any) {
      showToast("Lưu thất bại: " + (err?.message ?? "Lỗi kết nối"), "error");
      Alert.alert("Lỗi", "Không thể lưu báo cáo: " + (err?.message ?? "Lỗi kết nối"));
    } finally {
      setSavingReport(false);
    }
  }, [aiInsight, filter, revenueIn, revenueOut, totalOrders, aovValue]);

  // ── Xóa báo cáo khỏi Supabase ──
  const handleDeleteReport = useCallback(async (id: string) => {
    try {
      await deleteAiReport(id);
      const updated = savedReports.filter((r) => r.id !== id);
      setSavedReports(updated);
      if (selectedReport?.id === id) setSelectedReport(null);
      showToast("Đã xóa báo cáo.", "info");
    } catch (err: any) {
      showToast("Xóa thất bại: " + (err?.message ?? "Lỗi kết nối"), "error");
    }
  }, [savedReports, selectedReport]);

  // ── AI Insight ──
  const handleGenerateAIInsight = useCallback(async () => {
    if (!reportData) {
      showToast("Chưa có dữ liệu để phân tích.", "error");
      return;
    }
    setAiLoading(true);
    setAiInsight(null);
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Không tìm thấy Gemini API Key.");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const startStr = format(filter.startDate, "dd/MM/yyyy");
      const endStr   = format(filter.endDate,   "dd/MM/yyyy");
      const top3 = topProducts.slice(0, 3).map((p, i) => `${i + 1}. ${p.name} — ${formatCurrency(p.revenue)}`).join("\n");
      const cancelRate = revenueIn > 0 ? ((revenueOut / revenueIn) * 100).toFixed(1) : "0";

      const prompt = `Bạn là chuyên gia phân tích tài chính thương mại điện tử.
Dưới đây là dữ liệu bán hàng từ ${startStr} đến ${endStr}:

- Tổng doanh thu (tiền vào): ${formatCurrency(revenueIn)}
- Tiền hoàn trả/hủy đơn: ${formatCurrency(revenueOut)}
- Tỷ lệ hủy đơn quy đổi: ${cancelRate}%
- Tổng số đơn hàng hoàn thành: ${totalOrders} đơn
- Giá trị trung bình mỗi đơn (AOV): ${formatCurrency(aovValue)}
- Top 3 sản phẩm doanh thu cao nhất:
${top3 || "Không có dữ liệu"}

Hãy viết một báo cáo ngắn gọn theo 2 phần:
1. **Đánh giá hiệu suất**: Nhận xét về tình hình kinh doanh trong kỳ (tăng trưởng, điểm mạnh, điểm yếu). Đặc biệt lưu ý nếu tỷ lệ hủy đơn cao.
2. **Đề xuất hành động**: Đưa ra 3-4 hành động kinh doanh cụ thể, thực tế mà admin nên thực hiện ngay để cải thiện doanh thu.

Viết bằng tiếng Việt, ngắn gọn, súc tích, trực tiếp vào vấn đề. Không dùng markdown code block, chỉ dùng **in đậm** cho tiêu đề và dấu - cho danh sách.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      setAiInsight(text);
    } catch (err: any) {
      setAiInsight(`Đã xảy ra lỗi khi phân tích: ${err.message ?? "Lỗi không xác định"}`);
    } finally {
      setAiLoading(false);
    }
  }, [reportData, filter, revenueIn, revenueOut, totalOrders, aovValue, topProducts]);

  // ── Excel Export ──
  const handleExportExcel = useCallback(async () => {
    if (Platform.OS !== "web") {
      showToast("Tính năng xuất Excel chỉ khả dụng trên Web.", "error");
      return;
    }
    if (!reportData || trendData.length === 0) {
      showToast("Không có dữ liệu để xuất.", "error");
      return;
    }
    setExporting(true);
    showToast("Đang tạo file Excel...", "info");
    try {
      const startStr = format(filter.startDate, "dd-MM-yyyy");
      const endStr   = format(filter.endDate,   "dd-MM-yyyy");
      const fileName = `Bao_cao_doanh_thu_${startStr}_den_${endStr}.xlsx`;

      // ── Sheet 1: Tổng quan ──
      const overviewData = [
        ["Báo cáo Doanh thu", ""],
        ["Từ ngày", format(filter.startDate, "dd/MM/yyyy")],
        ["Đến ngày", format(filter.endDate, "dd/MM/yyyy")],
        ["", ""],
        ["Chỉ số", "Giá trị (₫)"],
        ["Doanh thu (Tiền vào)", revenueIn],
        ["Hoàn trả (Tiền ra)", revenueOut],
        ["Lợi nhuận", profit],
        ["Số ngày có dữ liệu", trendData.length],
      ];
      const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
      wsOverview["!cols"] = [{ wch: 30 }, { wch: 20 }];

      // ── Sheet 2: Xu hướng theo ngày ──
      const trendHeaders = ["Ngày", "Doanh thu (₫)"];
      const trendRows = trendData.map((r) => [r.date, r.amount]);
      const wsTrend = XLSX.utils.aoa_to_sheet([trendHeaders, ...trendRows]);
      wsTrend["!cols"] = [{ wch: 14 }, { wch: 20 }];

      // ── Sheet 3: Top sản phẩm ──
      const top5Headers = ["Hạng", "Tên sản phẩm", "Doanh thu (₫)"];
      const top5Rows = topProducts.map((r, i) => [i + 1, r.name, r.revenue]);
      const wsTop5 = XLSX.utils.aoa_to_sheet([top5Headers, ...top5Rows]);
      wsTop5["!cols"] = [{ wch: 8 }, { wch: 30 }, { wch: 20 }];

      // ── Build workbook ──
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsOverview, "Tổng quan");
      XLSX.utils.book_append_sheet(wb, wsTrend, "Xu hướng theo ngày");
      XLSX.utils.book_append_sheet(wb, wsTop5, "Top sản phẩm");

      XLSX.writeFile(wb, fileName);
      showToast(`✓ Đã xuất "${fileName}" thành công!`, "success", 4000);
    } catch (err: any) {
      showToast("Lỗi khi xuất file: " + (err?.message ?? "Không xác định"), "error");
    } finally {
      setExporting(false);
    }
  }, [reportData, filter, revenueIn, revenueOut, profit, trendData, topProducts]);

  // ── Chart options ──
  // trendData: [{date: "DD/MM", amount: number}] — from RPC directly
  const chartLabels = trendData.map((r) => r.date);
  const chartValues = trendData.map((r) => r.amount);

  const TOOLBOX_CONFIG = {
    show: true,
    feature: {
      magicType: { type: ["line", "bar"], title: { line: "Line", bar: "Bar" } },
      restore: { title: "Reset" },
      saveAsImage: { title: "Lưu ảnh" },
    },
  };

  // 1. Revenue Trend — Smooth Line + Area
  const revenueSeries: any[] = [
    {
      name: "Kỳ này",
      type: "line",
      smooth: true,
      data: chartValues,
      symbol: "circle",
      symbolSize: 6,
      itemStyle: { color: "#6366F1", borderWidth: 2, borderColor: "#fff" },
      lineStyle: { width: 3, color: "#6366F1" },
      areaStyle: {
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(99,102,241,0.2)" },
            { offset: 1, color: "rgba(99,102,241,0.0)" },
          ],
        },
      },
      emphasis: { focus: "series" },
    },
  ];

  if (compareMode && prevTrendData.length > 0) {
    revenueSeries.push({
      name: "Kỳ trước",
      type: "line",
      smooth: true,
      data: prevTrendData.map((r) => r.amount),
      symbol: "none",
      lineStyle: { width: 2, type: "dashed", color: "#9CA3AF" },
      itemStyle: { color: "#9CA3AF" },
    });
  }

  const revenueOption = {
    toolbox: TOOLBOX_CONFIG,
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1F2937",
      borderColor: "#374151",
      borderWidth: 1,
      textStyle: { color: "white", fontSize: 12 },
      formatter: `function(params){
        let p=params[0];
        let v=Number(p.value).toLocaleString('vi-VN')+' ₫';
        let html = '<div style="font-size:11px;color:#9CA3AF;margin-bottom:4px">' + p.name + '</div>';
        html += '<div style="font-weight:800;font-size:14px;color:' + p.color + '">' + p.seriesName + ': ' + v + '</div>';
        if (params.length > 1) {
          let p2 = params[1];
          let v2 = Number(p2.value).toLocaleString('vi-VN')+' ₫';
          html += '<div style="font-weight:600;font-size:13px;color:' + p2.color + '">' + p2.seriesName + ': ' + v2 + '</div>';
        }
        return html;
      }`,
    },
    legend: { show: compareMode, bottom: 0 },
    grid: { left: "1%", right: "1%", bottom: compareMode ? "10%" : "2%", top: "10%", containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: chartLabels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#9CA3AF", fontSize: 10, fontWeight: "500" },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { type: "dashed", color: "#F3F4F6" } },
      axisLabel: {
        color: "#9CA3AF",
        fontSize: 11,
        formatter: `function(v){
          if(v>=1000000000) return (v/1000000000).toFixed(1)+'B';
          if(v>=1000000) return (v/1000000).toFixed(1)+'M';
          if(v>=1000) return (v/1000).toFixed(0)+'k';
          return v;
        }`,
      },
    },
    series: revenueSeries,
  };

  // 2. Orders Trend — Smooth Line + Area (emerald)
  const ordersOption = {
    toolbox: TOOLBOX_CONFIG,
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1F2937",
      borderColor: "#374151",
      borderWidth: 1,
      textStyle: { color: "white", fontSize: 12 },
      formatter: `function(params){
        let p=params[0];
        return '<div style="font-size:11px;color:#9CA3AF;margin-bottom:4px">' + p.name + '</div>'
             + '<div style="font-weight:800;font-size:14px;color:#6EE7B7">' + p.value + ' đơn</div>';
      }`,
    },
    grid: { left: "1%", right: "1%", bottom: "2%", top: "10%", containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: chartLabels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#9CA3AF", fontSize: 10, fontWeight: "500" },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { type: "dashed", color: "#F3F4F6" } },
      axisLabel: { color: "#9CA3AF", fontSize: 11 },
      minInterval: 1,
    },
    series: [
      {
        type: "line",
        smooth: true,
        data: trendData.map((r) => r.orders || 0),
        symbol: "circle",
        symbolSize: 6,
        itemStyle: { color: "#10B981", borderWidth: 2, borderColor: "#fff" },
        lineStyle: { width: 3, color: "#10B981" },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(16,185,129,0.25)" },
              { offset: 1, color: "rgba(16,185,129,0.0)" },
            ],
          },
        },
        emphasis: {
          focus: "series",
          itemStyle: { color: "#059669", borderWidth: 3, borderColor: "#fff", shadowBlur: 8, shadowColor: "rgba(16,185,129,0.4)" },
        },
      },
    ],
  };

  // 3. Top-5 Days by Revenue — Multi-color Bar Chart
  const topDaysOption = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1F2937",
      borderColor: "#374151",
      borderWidth: 1,
      textStyle: { color: "white", fontSize: 12 },
      formatter: `function(params){
        let p=params[0];
        let v=Number(p.value).toLocaleString('vi-VN')+' ₫';
        return '<div style="font-size:11px;color:#9CA3AF;margin-bottom:4px">' + p.name + '</div>'
             + '<div style="font-weight:800;font-size:14px">' + v + '</div>';
      }`,
    },
    grid: { left: "1%", right: "1%", bottom: "2%", top: "10%", containLabel: true },
    xAxis: {
      type: "category",
      data: topProducts.map((r) => r.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#6B7280", fontSize: 11, fontWeight: "600" },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { type: "dashed", color: "#F3F4F6" } },
      axisLabel: {
        color: "#9CA3AF",
        fontSize: 11,
        formatter: `function(v){
          if(v>=1000000000) return (v/1000000000).toFixed(1)+'B';
          if(v>=1000000) return (v/1000000).toFixed(1)+'M';
          if(v>=1000) return (v/1000).toFixed(0)+'k';
          return v;
        }`,
      },
    },
    series: [
      {
        type: "bar",
        data: topProducts.map((r, i) => ({
          value: r.revenue,
          itemStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: TOP_COLORS[i % TOP_COLORS.length] },
                { offset: 1, color: TOP_COLORS[i % TOP_COLORS.length] + "66" },
              ],
            },
            borderRadius: [6, 6, 0, 0],
          },
        })),
        emphasis: { focus: "series" },
        barMaxWidth: 56,
      },
    ],
  };

  // 4. Payment Methods (Donut)
  const paymentOption = {
    tooltip: { trigger: "item" },
    legend: { bottom: "0%", left: "center" },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: "#fff", borderWidth: 2 },
        label: { show: false, position: "center" },
        emphasis: { label: { show: true, fontSize: 16, fontWeight: "bold" } },
        labelLine: { show: false },
        data: paymentMethods.map((pm, i) => {
          let name = pm.method;
          let color = TOP_COLORS[i % TOP_COLORS.length];
          
          if (pm.method === "VNPay") {
            name = "Thanh toán VNPay";
            color = "#2563EB"; // Blue
          } else if (pm.method === "COD") {
            name = "Thanh toán khi nhận hàng";
            color = "#10B981"; // Emerald
          } else if (!pm.method) {
            name = "Khác";
          }
          
          return {
            value: pm.amount,
            name: name,
            itemStyle: { color: color },
          };
        }),
      },
    ],
  };

  // 5. Average Order Value (AOV)
  const aovOption = {
    toolbox: TOOLBOX_CONFIG,
    tooltip: {
      trigger: "axis",
      formatter: `function(params){
        let p=params[0];
        let v=Number(p.value).toLocaleString('vi-VN')+' ₫';
        return '<div>' + p.name + '</div><div style="font-weight:800;color:#F59E0B">' + v + '/đơn</div>';
      }`,
    },
    grid: { left: "1%", right: "1%", bottom: "2%", top: "10%", containLabel: true },
    xAxis: { type: "category", data: chartLabels, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#F3F4F6" } } },
    series: [
      {
        type: "line",
        smooth: true,
        data: trendData.map((r) => r.orders && r.orders > 0 ? Math.round(r.amount / r.orders) : 0),
        itemStyle: { color: "#F59E0B" },
        lineStyle: { width: 3, color: "#F59E0B" },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "rgba(245,158,11,0.2)" }, { offset: 1, color: "rgba(245,158,11,0)" }],
          },
        },
      },
    ],
  };

  // 6. Heatmap Matrix (24x7)
  const hours = Array.from({ length: 24 }, (_, i) => i + "h");
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const maxHeatmap = Math.max(...heatmapData.map((item) => item[2]), 5);
  const heatmapOption = {
    tooltip: { position: "top" },
    grid: { height: "70%", top: "5%", bottom: "15%" },
    xAxis: { type: "category", data: hours, splitArea: { show: true } },
    yAxis: { type: "category", data: days, splitArea: { show: true } },
    visualMap: {
      min: 0, max: maxHeatmap,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: "0%",
      inRange: { color: ["#F3F4F6", "#6366F1", "#312E81"] },
    },
    series: [
      {
        name: "Đơn hàng",
        type: "heatmap",
        data: heatmapData,
        label: { show: true, fontSize: 10 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0, 0, 0, 0.5)" } },
      },
    ],
  };

  const router = useRouter();

  // ── Permission guard ──
  useEffect(() => {
    if (role && role !== "admin") {
      router.replace("/(admin)/dashboard");
    }
  }, [role]);

  if (role !== "admin") {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const RANGE_BUTTONS: { key: TimeRange; label: string }[] = [
    { key: "day", label: "Hôm nay" },
    { key: "month", label: "Tháng này" },
    { key: "year", label: "Năm nay" },
    { key: "custom", label: "Tùy chọn" },
  ];

  const renderChart = (key: string) => {
    switch (key) {
      case "revenue":
        return (
          <View style={[styles.card, { flex: 1 }]} key={key}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Xu hướng Doanh thu</Text>
                <Text style={styles.cardSubtitle}>Biểu đồ đường theo từng ngày</Text>
              </View>
              {loading && <ActivityIndicator size="small" color="#6366F1" />}
            </View>
            {loading && trendData.length === 0 ? (
              <Shimmer width="100%" height={260} />
            ) : trendData.length > 0 ? (
              <Echarts option={revenueOption} height={260} />
            ) : (
              <View style={styles.emptyChart}>
                <BarChart3 size={32} color="#E5E7EB" />
                <Text style={styles.emptyText}>Chưa có dữ liệu trong khoảng thời gian này</Text>
              </View>
            )}
          </View>
        );
      case "payment":
        return (
          <View style={[styles.card, { flex: 1 }]} key={key}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Tỷ lệ Thanh toán</Text>
                <Text style={styles.cardSubtitle}>Cơ cấu nguồn tiền thu về</Text>
              </View>
              {loading && <ActivityIndicator size="small" color="#6366F1" />}
            </View>
            {loading && paymentMethods.length === 0 ? (
              <Shimmer width="100%" height={260} />
            ) : paymentMethods.length > 0 ? (
              <Echarts option={paymentOption} height={260} />
            ) : (
              <View style={styles.emptyChart}>
                <CreditCard size={32} color="#E5E7EB" />
                <Text style={styles.emptyText}>Chưa có dữ liệu thanh toán</Text>
              </View>
            )}
          </View>
        );
      case "top":
        return (
          <View style={[styles.card, { flex: 1 }]} key={key}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Top Sản phẩm</Text>
                <Text style={styles.cardSubtitle}>Doanh thu cao nhất</Text>
              </View>
              {loading && <ActivityIndicator size="small" color="#F59E0B" />}
            </View>
            {loading && topProducts.length === 0 ? (
              <Shimmer width="100%" height={260} />
            ) : topProducts.length > 0 ? (
              <Echarts option={topDaysOption} height={260} />
            ) : (
              <View style={styles.emptyChart}>
                <Package2 size={32} color="#E5E7EB" />
                <Text style={styles.emptyText}>Chưa có dữ liệu trong khoảng thời gian này</Text>
              </View>
            )}
          </View>
        );
      case "heatmap":
        return (
          <View style={[styles.card, { flex: 1 }]} key={key}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Bản đồ nhiệt đơn hàng</Text>
                <Text style={styles.cardSubtitle}>Tần suất theo giờ & ngày</Text>
              </View>
              {loading && <ActivityIndicator size="small" color="#312E81" />}
            </View>
            {loading && heatmapData.length === 0 ? (
              <Shimmer width="100%" height={260} />
            ) : heatmapData.length > 0 ? (
              <Echarts option={heatmapOption} height={260} />
            ) : (
              <View style={styles.emptyChart}>
                <Calendar size={32} color="#E5E7EB" />
                <Text style={styles.emptyText}>Chưa có dữ liệu mua hàng</Text>
              </View>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Hệ thống quản trị</Text>
          <Text style={styles.headerTitle}>Quản lý Doanh thu</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}
            activeOpacity={0.8}
            onPress={() => setShowHistoryModal(true)}
          >
            <BookMarked size={16} color="#059669" />
            <Text style={[styles.exportBtnText, { color: "#059669" }]}>
              Đã lưu ({savedReports.length}/{MAX_SAVED_REPORTS})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: "#F5F0FF", borderColor: "#DDD6FE" }]}
            activeOpacity={0.8}
            onPress={() => {
              setShowAiModal(true);
              if (!aiInsight) handleGenerateAIInsight();
            }}
          >
            <Sparkles size={16} color="#7C3AED" />
            <Text style={[styles.exportBtnText, { color: "#7C3AED" }]}>Phân tích AI</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleExportExcel}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator size="small" color="#6366F1" />
              : <Download size={16} color="#6366F1" />}
            <Text style={styles.exportBtnText}>
              {exporting ? "Đang xuất..." : "Xuất Excel"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── AI Insight Modal ── */}
      <Modal
        visible={showAiModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAiModal(false)}
      >
        <View style={styles.aiOverlay}>
          <View style={styles.aiModal}>
            {/* Modal Header */}
            <View style={styles.aiModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.aiModalIconWrap}>
                  <Bot size={20} color="#7C3AED" />
                </View>
                <View>
                  <Text style={styles.aiModalTitle}>AI Phân tích Kinh doanh</Text>
                  <Text style={styles.aiModalSubtitle}>
                    {format(filter.startDate, "dd/MM/yyyy")} → {format(filter.endDate, "dd/MM/yyyy")}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                {!aiLoading && aiInsight && (
                  <TouchableOpacity
                    style={[styles.aiRefreshBtn, { backgroundColor: "#D1FAE5", gap: 4 }]}
                    onPress={handleSaveReport}
                    disabled={savingReport}
                  >
                    {savingReport
                      ? <ActivityIndicator size="small" color="#059669" />
                      : <Save size={13} color="#059669" />}
                    <Text style={[styles.aiRefreshBtnText, { color: "#059669" }]}>Lưu</Text>
                  </TouchableOpacity>
                )}
                {!aiLoading && (
                  <TouchableOpacity
                    style={styles.aiRefreshBtn}
                    onPress={handleGenerateAIInsight}
                  >
                    <Sparkles size={14} color="#7C3AED" />
                    <Text style={styles.aiRefreshBtnText}>Tạo lại</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.aiCloseBtn}
                  onPress={() => setShowAiModal(false)}
                >
                  <X size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.aiModalBody} showsVerticalScrollIndicator={false}>
              {aiLoading ? (
                <View style={styles.aiLoadingWrap}>
                  <View style={styles.aiLoadingSpinner}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                  </View>
                  <Text style={styles.aiLoadingTitle}>AI đang đọc báo cáo tài chính...</Text>
                  <Text style={styles.aiLoadingSubtitle}>Gemini đang phân tích dữ liệu và soạn nhận xét chuyên sâu</Text>
                </View>
              ) : aiInsight ? (
                <View style={styles.aiInsightWrap}>
                  <Text style={styles.aiInsightText}>{aiInsight}</Text>
                </View>
              ) : (
                <View style={styles.aiLoadingWrap}>
                  <Text style={styles.aiLoadingSubtitle}>Chưa có kết quả phân tích.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Saved Reports History Modal ── */}
      <Modal
        visible={showHistoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowHistoryModal(false); setSelectedReport(null); }}
      >
        <View style={styles.aiOverlay}>
          <View style={[styles.aiModal, { maxWidth: 640 }]}>
            {/* Header */}
            <View style={styles.aiModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.aiModalIconWrap, { backgroundColor: "#D1FAE5" }]}>
                  <BookMarked size={20} color="#059669" />
                </View>
                <View>
                  <Text style={styles.aiModalTitle}>Lịch sử Báo cáo AI</Text>
                  <Text style={styles.aiModalSubtitle}>
                    {savedReports.length}/{MAX_SAVED_REPORTS} báo cáo đã lưu
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.aiCloseBtn}
                onPress={() => { setShowHistoryModal(false); setSelectedReport(null); }}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Body: 2 cột nếu có selectedReport */}
            <View style={{ flexDirection: selectedReport ? "row" : "column", maxHeight: 480 }}>
              {/* Danh sách báo cáo */}
              <ScrollView
                style={[
                  styles.historyList,
                  selectedReport && { width: 220, borderRightWidth: 1, borderRightColor: "#F3F4F6" }
                ]}
                showsVerticalScrollIndicator={false}
              >
                {savedReports.length === 0 ? (
                  <View style={styles.aiLoadingWrap}>
                    <BookMarked size={36} color="#D1D5DB" />
                    <Text style={styles.aiLoadingTitle}>Chưa có báo cáo nào</Text>
                    <Text style={styles.aiLoadingSubtitle}>
                      Tạo phân tích AI rồi nhấn nút "Lưu" để lưu lại
                    </Text>
                  </View>
                ) : (
                  savedReports.map((rpt) => (
                    <TouchableOpacity
                      key={rpt.id}
                      style={[
                        styles.historyItem,
                        selectedReport?.id === rpt.id && styles.historyItemActive,
                      ]}
                      onPress={() => setSelectedReport(rpt)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyItemTitle} numberOfLines={1}>{rpt.title}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                          <Clock size={10} color="#9CA3AF" />
                          <Text style={styles.historyItemDate}>
                            {rpt.created_at ? format(new Date(rpt.created_at), "HH:mm dd/MM/yyyy") : "--"}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                          <View style={styles.historyKpiBadge}>
                            <Text style={styles.historyKpiText}>{formatCurrency(rpt.kpis.revenueIn)}</Text>
                          </View>
                          <View style={[styles.historyKpiBadge, { backgroundColor: "#D1FAE5" }]}>
                            <Text style={[styles.historyKpiText, { color: "#065F46" }]}>{rpt.kpis.totalOrders} đơn</Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteReport(rpt.id)}
                        style={styles.historyDeleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              {/* Nội dung chi tiết báo cáo được chọn */}
              {selectedReport && (
                <ScrollView style={styles.historyDetail} showsVerticalScrollIndicator={false}>
                  <Text style={styles.historyDetailPeriod}>{selectedReport.period}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    <View style={[styles.historyKpiBadge, { paddingHorizontal: 10, paddingVertical: 5 }]}>
                      <Text style={[styles.historyKpiText, { fontSize: 11 }]}>Doanh thu: {formatCurrency(selectedReport.kpis.revenueIn)}</Text>
                    </View>
                    <View style={[styles.historyKpiBadge, { backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 5 }]}>
                      <Text style={[styles.historyKpiText, { color: "#991B1B", fontSize: 11 }]}>Hoàn/Hủy: {formatCurrency(selectedReport.kpis.revenueOut)}</Text>
                    </View>
                    <View style={[styles.historyKpiBadge, { backgroundColor: "#D1FAE5", paddingHorizontal: 10, paddingVertical: 5 }]}>
                      <Text style={[styles.historyKpiText, { color: "#065F46", fontSize: 11 }]}>{selectedReport.kpis.totalOrders} đơn</Text>
                    </View>
                    <View style={[styles.historyKpiBadge, { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 5 }]}>
                      <Text style={[styles.historyKpiText, { color: "#92400E", fontSize: 11 }]}>AOV: {formatCurrency(selectedReport.kpis.aovValue)}</Text>
                    </View>
                  </View>
                  <View style={styles.aiInsightWrap}>
                    <Text style={styles.aiInsightText}>{selectedReport.content}</Text>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Filter Panel ── */}
      <View style={styles.filterPanel}>
        {/* Segmented buttons */}
        <View style={styles.segGroup}>
          {RANGE_BUTTONS.map((btn) => (
            <SegBtn
              key={btn.key}
              label={btn.label}
              active={filter.timeRange === btn.key}
              onPress={() => handleRangeChange(btn.key)}
            />
          ))}
        </View>

        {/* Date range pickers */}
        <View style={styles.dateRow}>
          <DateField
            label="Từ"
            value={filter.startDate}
            disabled={filter.timeRange !== "custom"}
            onChange={(d) => setFilter((f) => ({ ...f, startDate: d }))}
          />
          <View style={styles.dateSep} />
          <DateField
            label="Đến"
            value={filter.endDate}
            disabled={filter.timeRange !== "custom"}
            onChange={(d) => setFilter((f) => ({ ...f, endDate: d }))}
          />
        </View>
      </View>

      {/* ── Period Label & Compare Toggle ── */}
      <View style={styles.periodRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Calendar size={14} color="#6B7280" />
          <Text style={styles.periodText}>
            {formatDisplay(filter.startDate)} → {formatDisplay(filter.endDate)}
          </Text>
          {loading && <ActivityIndicator size="small" color="#6366F1" style={{ marginLeft: 8 }} />}
        </View>
        <TouchableOpacity 
          style={styles.compareToggle} 
          onPress={() => setCompareMode(!compareMode)}
        >
          <View style={[styles.checkbox, compareMode && styles.checkboxActive]}>
            {compareMode && <CheckCircle2 size={12} color="#FFF" />}
          </View>
          <Text style={styles.compareText}>So sánh với kỳ trước</Text>
        </TouchableOpacity>
      </View>

      {/* ── Error ── */}
      {error && (
        <View style={styles.errorBanner}>
          <AlertCircle size={16} color="#B91C1C" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── KPI Cards (Top Row) ── */}
      <View style={[styles.kpiRow, isDesktop && styles.kpiRowDesktop]}>
        <View style={[styles.kpiWrap, isDesktop && styles.kpiWrapDesktop]}>
          <KPICard
            title="Tổng doanh thu"
            value={formatCurrency(revenueIn)}
            subtitle={`${trendData.length} ngày trong khoảng lọc`}
            icon={TrendingUp}
            color="#6366F1"
            iconBg="#EEF2FF"
            isLoading={loading}
          />
        </View>
        <View style={[styles.kpiWrap, isDesktop && styles.kpiWrapDesktop]}>
          <KPICard
            title="Đơn hàng"
            value={`${totalOrders} đơn`}
            subtitle="Hoàn thành thành công"
            icon={Package2}
            color="#10B981"
            iconBg="#D1FAE5"
            isLoading={loading}
          />
        </View>
        <View style={[styles.kpiWrap, isDesktop && styles.kpiWrapDesktop]}>
          <KPICard
            title="Giá trị / Đơn (AOV)"
            value={formatCurrency(aovValue)}
            subtitle="Chi tiêu bình quân"
            icon={BarChart3}
            color="#F59E0B"
            iconBg="#FEF3C7"
            isLoading={loading}
          />
        </View>
        <View style={[styles.kpiWrap, isDesktop && styles.kpiWrapDesktop]}>
          <KPICard
            title="Tiền hoàn trả / Hủy"
            value={formatCurrency(revenueOut)}
            subtitle="Tỷ lệ hủy đơn (Quy đổi)"
            icon={ShoppingCart}
            color="#EF4444"
            iconBg="#FEE2E2"
            isLoading={loading}
          />
        </View>
      </View>

      {/* ── Main Row: Trend (2/3) + Donut (1/3) ── */}
      <View style={{ flexDirection: isDesktop ? "row" : "column", gap: 16 }}>
        <View style={{ flex: isDesktop ? 2 : 1 }}>
          {renderChart("revenue")}
        </View>
        <View style={{ flex: isDesktop ? 1 : 1 }}>
          {renderChart("payment")}
        </View>
      </View>

      {/* ── Bottom Row: Top Products + Heatmap ── */}
      <View style={{ flexDirection: isDesktop ? "row" : "column", gap: 16, marginTop: 16 }}>
        <View style={{ flex: 1 }}>
          {renderChart("top")}
        </View>
        <View style={{ flex: 1 }}>
          {renderChart("heatmap")}
        </View>
      </View>

      {/* ── Toast Notification ── */}
      {toast.visible && (
        <View
          style={[
            styles.toast,
            toast.type === "success" && styles.toastSuccess,
            toast.type === "error"   && styles.toastError,
          ]}
          pointerEvents="none"
        >
          {toast.type === "success" && <CheckCircle2 size={16} color="#fff" />}
          {toast.type === "error"   && <AlertCircle  size={16} color="#fff" />}
          {toast.type === "info"    && <Download     size={16} color="#fff" />}
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* ── Detail Table ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Chi tiết theo ngày</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={[styles.thText, { flex: 1.2 }]}>Ngày</Text>
          <Text style={[styles.thText, { flex: 2, textAlign: "right" }]}>Doanh thu</Text>
        </View>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={styles.tableRow}>
                <Shimmer width="100%" height={36} />
              </View>
            ))
          : trendData.length > 0
          ? trendData.map((r, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
                <Text style={[styles.tdText, { flex: 1.2 }]}>{r.date}</Text>
                <Text style={[styles.tdRevenue, { flex: 2, textAlign: "right" }]}>
                  {formatCurrency(r.amount)}
                </Text>
              </View>
            ))
          : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>Không có dữ liệu trong khoảng thời gian này</Text>
            </View>
          )}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 24, paddingBottom: 48, gap: 20 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  headerSub: { color: "#9CA3AF", fontSize: 13, fontWeight: "500" },
  headerTitle: { color: "#111827", fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  exportBtnText: { color: "#6366F1", fontWeight: "700", fontSize: 14 },

  // Filter Panel
  filterPanel: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  segGroup: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 4,
    gap: 2,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  segBtnActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segBtnText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  segBtnTextActive: { color: "#6366F1" },

  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateFieldDisabled: { backgroundColor: "#F9FAFB", borderColor: "#F3F4F6" },
  dateFieldLabel: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  dateFieldInput: { fontSize: 13, fontWeight: "600", color: "#111827", flex: 1 },
  dateSep: {
    width: 16,
    height: 1.5,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
  },

  // Period row
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -8,
  },
  periodText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },

  // Error
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: "#B91C1C", fontWeight: "500", fontSize: 14 },

  // KPI
  kpiRow: { flexDirection: "column", gap: 12 },
  kpiRowDesktop: { flexDirection: "row" },
  kpiWrap: { flex: 1 },
  kpiWrapDesktop: { flex: 1 },
  kpiCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 130,
    justifyContent: "center",
  },
  kpiCardTop: { marginBottom: 12 },
  kpiIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  kpiLabel: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  kpiValue: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  kpiSub: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },

  // Chart card
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cardSubtitle: { fontSize: 12, color: "#9CA3AF", fontWeight: "500", marginTop: 2 },
  emptyChart: { height: 160, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { color: "#9CA3AF", fontSize: 14, textAlign: "center" },

  // Table
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 4,
  },
  thText: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
  tableRowEven: { backgroundColor: "#FAFAFA", borderRadius: 8, paddingHorizontal: 4 },
  tdText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  tdRevenue: { fontSize: 13, color: "#6366F1", fontWeight: "700" },
  tdOrders: { fontSize: 13, color: "#10B981", fontWeight: "700" },

  // Export button disabled
  exportBtnDisabled: { opacity: 0.6 },

  // AI Modal
  aiOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  aiModal: {
    backgroundColor: "#fff",
    borderRadius: 24,
    width: "100%",
    maxWidth: 580,
    maxHeight: "80%",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  aiModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3E8FF",
    backgroundColor: "#FDFAFF",
  },
  aiModalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  aiModalTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  aiModalSubtitle: { fontSize: 12, color: "#9CA3AF", fontWeight: "500", marginTop: 2 },
  aiCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  aiRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  aiRefreshBtnText: { fontSize: 12, fontWeight: "700", color: "#7C3AED" },
  aiModalBody: {
    padding: 20,
    maxHeight: 480,
  },
  aiLoadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 16,
  },
  aiLoadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  aiLoadingTitle: { fontSize: 16, fontWeight: "700", color: "#111827", textAlign: "center" },
  aiLoadingSubtitle: { fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
  aiInsightWrap: {
    backgroundColor: "#FDFAFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  aiInsightText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 24,
    fontWeight: "400",
  },

  // History Modal
  historyList: {
    flex: 1,
    padding: 12,
  },
  historyItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  historyItemActive: {
    backgroundColor: "#F5F0FF",
    borderColor: "#DDD6FE",
  },
  historyItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  historyItemDate: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  historyKpiBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyKpiText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#3730A3",
  },
  historyDeleteBtn: {
    padding: 4,
    marginTop: 2,
  },
  historyDetail: {
    flex: 1,
    padding: 14,
  },
  historyDetailPeriod: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },

  // Toast
  toast: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#374151",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
    maxWidth: 420,
  },
  toastSuccess: { backgroundColor: "#059669" },
  toastError:   { backgroundColor: "#DC2626" },
  toastText: { color: "#fff", fontSize: 13, fontWeight: "600", flexShrink: 1 },

  // Permission guard
  permCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    margin: 24,
  },
  permTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  permText: { fontSize: 14, color: "#6B7280", textAlign: "center" },

  // Compare Toggle
  compareToggle: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto" },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center", backgroundColor: "#FFF" },
  checkboxActive: { backgroundColor: "#6366F1", borderColor: "#6366F1" },
  compareText: { fontSize: 13, color: "#4B5563", fontWeight: "600" },

  // Chart Controls
  chartControls: { flexDirection: "row", alignItems: "center", gap: 4 },
  moveBtn: { padding: 6, backgroundColor: "#F3F4F6", borderRadius: 8 },
  moveBtnDisabled: { opacity: 0.5 },
});
