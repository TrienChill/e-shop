
import { useAuth } from "@/src/auth/AuthContext";
import { getRevenueReport, RevenueReport } from "@/src/services/admin/revenue";
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
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

  // ── Derived values from RPC ──
  const TOP_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
  const revenueIn  = reportData?.revenue_in  ?? 0;
  const revenueOut = reportData?.revenue_out ?? 0;
  const profit     = reportData?.profit      ?? 0;
  const trendData  = reportData?.trend_data  ?? [];
  const topProducts = reportData?.top_products ?? [];

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
  const handleFilterChange = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRevenueReport(start, end);
      setReportData(data);
    } catch (e: any) {
      setError(e.message ?? "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleFilterChange(filter.startDate, filter.endDate);
  }, [filter.startDate, filter.endDate]);

  // ── Export state ──
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "info" | "success" | "error" }>({
    visible: false, message: "", type: "info",
  });
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: "info" | "success" | "error" = "info", duration = 2800) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ visible: true, message, type });
    toastTimeout.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), duration);
  };

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

  // 1. Revenue Trend — Smooth Line + Area
  const revenueOption = {
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
             + '<div style="font-weight:800;font-size:14px;color:#A5B4FC">' + v + '</div>';
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
        emphasis: {
          focus: "series",
          itemStyle: { color: "#4F46E5", borderWidth: 3, borderColor: "#fff", shadowBlur: 8, shadowColor: "rgba(99,102,241,0.4)" },
        },
      },
    ],
  };

  // 2. Orders Trend — Smooth Line + Area (emerald)
  const ordersOption = {
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
        data: trendData.map((r) => r.amount),
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

  // ── Permission guard ──
  if (role !== "admin") {
    return (
      <View style={styles.permCard}>
        <AlertCircle size={32} color="#EF4444" />
        <Text style={styles.permTitle}>Không có quyền truy cập</Text>
        <Text style={styles.permText}>Bạn không có quyền xem trang Quản lý Doanh thu.</Text>
      </View>
    );
  }

  const RANGE_BUTTONS: { key: TimeRange; label: string }[] = [
    { key: "day", label: "Hôm nay" },
    { key: "month", label: "Tháng này" },
    { key: "year", label: "Năm nay" },
    { key: "custom", label: "Tùy chọn" },
  ];

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

      {/* ── Period Label ── */}
      <View style={styles.periodRow}>
        <Calendar size={14} color="#6B7280" />
        <Text style={styles.periodText}>
          {formatDisplay(filter.startDate)} → {formatDisplay(filter.endDate)}
        </Text>
        {loading && <ActivityIndicator size="small" color="#6366F1" style={{ marginLeft: 8 }} />}
      </View>

      {/* ── Error ── */}
      {error && (
        <View style={styles.errorBanner}>
          <AlertCircle size={16} color="#B91C1C" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── KPI Cards ── */}
      <View style={[styles.kpiRow, isDesktop && styles.kpiRowDesktop]}>
        <View style={[styles.kpiWrap, isDesktop && styles.kpiWrapDesktop]}>
          <KPICard
            title="Doanh thu (Tiền vào)"
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
            title="Hoàn trả (Tiền ra)"
            value={formatCurrency(revenueOut)}
            subtitle="Đơn hoàn trả / hoàn tiền"
            icon={ShoppingCart}
            color="#EF4444"
            iconBg="#FEE2E2"
            isLoading={loading}
          />
        </View>
        <View style={[styles.kpiWrap, isDesktop && styles.kpiWrapDesktop]}>
          <KPICard
            title="Lợi nhuận"
            value={formatCurrency(profit)}
            subtitle="Doanh thu − Hoàn trả"
            icon={BarChart3}
            color="#10B981"
            iconBg="#D1FAE5"
            isLoading={loading}
          />
        </View>
      </View>

      {/* ── Revenue Trend Chart ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
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

      {/* ── Orders Trend Chart ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Xu hướng Đơn hàng</Text>
            <Text style={styles.cardSubtitle}>Số đơn hàng hoàn thành theo ngày</Text>
          </View>
          {loading && <ActivityIndicator size="small" color="#10B981" />}
        </View>
        {loading && trendData.length === 0 ? (
          <Shimmer width="100%" height={220} />
        ) : trendData.length > 0 ? (
          <Echarts option={ordersOption} height={220} />
        ) : (
          <View style={styles.emptyChart}>
            <ShoppingCart size={32} color="#E5E7EB" />
            <Text style={styles.emptyText}>Chưa có dữ liệu trong khoảng thời gian này</Text>
          </View>
        )}
      </View>

      {/* ── Top-5 Days Bar Chart ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Top Sản phẩm Doanh thu Cao Nhất</Text>
            <Text style={styles.cardSubtitle}>Dữ liệu từ đơn hàng hoàn thành</Text>
          </View>
          {loading && <ActivityIndicator size="small" color="#F59E0B" />}
        </View>
        {loading && topProducts.length === 0 ? (
          <Shimmer width="100%" height={220} />
        ) : topProducts.length > 0 ? (
          <Echarts option={topDaysOption} height={220} />
        ) : (
          <View style={styles.emptyChart}>
            <Package2 size={32} color="#E5E7EB" />
            <Text style={styles.emptyText}>Chưa có dữ liệu trong khoảng thời gian này</Text>
          </View>
        )}
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
});
