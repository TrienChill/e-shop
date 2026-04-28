
import { useAuth } from "@/src/auth/AuthContext";
import { getRevenueReport, RevenueReportRow } from "@/src/services/admin/revenue";
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
  Download,
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
import Echarts from "react-native-echarts-pro";

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
  const [rows, setRows] = useState<RevenueReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Derived KPIs ──
  const totalRevenue = rows.reduce((s, r) => s + r.daily_revenue, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orders_count, 0);
  const avgDaily = rows.length > 0 ? totalRevenue / rows.length : 0;

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
      setRows(data);
    } catch (e: any) {
      setError(e.message ?? "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleFilterChange(filter.startDate, filter.endDate);
  }, [filter.startDate, filter.endDate]);

  // ── Chart option ──
  const chartLabels = rows.map((r) => {
    const parts = r.date_str?.split("-") ?? [];
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : r.date_str;
  });
  const chartValues = rows.map((r) => r.daily_revenue);

  const revenueOption = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1F2937",
      textStyle: { color: "white" },
      formatter: `function(params){
        let p=params[0];
        let v=Number(p.value).toLocaleString('vi-VN')+' đ';
        return '<div style="font-size:10px;color:#9CA3AF">' + p.name + '</div><div style="font-weight:800">' + v + '</div>';
      }`,
    },
    grid: { left: "2%", right: "2%", bottom: "2%", top: "8%", containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: chartLabels,
      axisLine: { lineStyle: { color: "#F3F4F6" } },
      axisLabel: { color: "#6B7280", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { type: "solid", color: "#F3F4F6" } },
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
        data: chartValues,
        itemStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "#6366F1" },
              { offset: 1, color: "#818CF8" },
            ],
          },
          borderRadius: [6, 6, 0, 0],
        },
        emphasis: { itemStyle: { color: "#4F46E5" } },
      },
    ],
  };

  const ordersOption = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1F2937",
      textStyle: { color: "white" },
    },
    grid: { left: "2%", right: "2%", bottom: "2%", top: "8%", containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: chartLabels,
      axisLine: { lineStyle: { color: "#F3F4F6" } },
      axisLabel: { color: "#6B7280", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { type: "solid", color: "#F3F4F6" } },
      axisLabel: { color: "#9CA3AF", fontSize: 11 },
    },
    series: [
      {
        type: "line",
        smooth: true,
        data: rows.map((r) => r.orders_count),
        itemStyle: { color: "#10B981" },
        lineStyle: { width: 3, color: "#10B981" },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(16,185,129,0.35)" },
              { offset: 1, color: "rgba(16,185,129,0.02)" },
            ],
          },
        },
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
        <TouchableOpacity style={styles.exportBtn} activeOpacity={0.8}>
          <Download size={16} color="#6366F1" />
          <Text style={styles.exportBtnText}>Xuất Excel</Text>
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
            title="Tổng doanh thu"
            value={formatCurrency(totalRevenue)}
            subtitle={`${rows.length} ngày trong khoảng lọc`}
            icon={TrendingUp}
            color="#6366F1"
            iconBg="#EEF2FF"
            isLoading={loading}
          />
        </View>
        <View style={[styles.kpiWrap, isDesktop && styles.kpiWrapDesktop]}>
          <KPICard
            title="Tổng đơn hàng"
            value={totalOrders.toLocaleString()}
            subtitle="Đơn hàng hoàn thành"
            icon={ShoppingCart}
            color="#10B981"
            iconBg="#D1FAE5"
            isLoading={loading}
          />
        </View>
        <View style={[styles.kpiWrap, isDesktop && styles.kpiWrapDesktop]}>
          <KPICard
            title="Doanh thu TB / ngày"
            value={formatCurrency(avgDaily)}
            subtitle="Trung bình mỗi ngày"
            icon={BarChart3}
            color="#F59E0B"
            iconBg="#FEF3C7"
            isLoading={loading}
          />
        </View>
      </View>

      {/* ── Revenue Chart ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Biểu đồ Doanh thu theo ngày</Text>
          {loading && <ActivityIndicator size="small" color="#6366F1" />}
        </View>
        {loading && rows.length === 0 ? (
          <Shimmer width="100%" height={240} />
        ) : rows.length > 0 ? (
          <Echarts option={revenueOption} height={240} />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>Chưa có dữ liệu doanh thu</Text>
          </View>
        )}
      </View>

      {/* ── Orders Chart ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Biểu đồ Số đơn hàng theo ngày</Text>
          {loading && <ActivityIndicator size="small" color="#10B981" />}
        </View>
        {loading && rows.length === 0 ? (
          <Shimmer width="100%" height={200} />
        ) : rows.length > 0 ? (
          <Echarts option={ordersOption} height={200} />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>Chưa có dữ liệu đơn hàng</Text>
          </View>
        )}
      </View>

      {/* ── Detail Table ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Chi tiết theo ngày</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={[styles.thText, { flex: 1.2 }]}>Ngày</Text>
          <Text style={[styles.thText, { flex: 2, textAlign: "right" }]}>Doanh thu</Text>
          <Text style={[styles.thText, { flex: 1, textAlign: "right" }]}>Đơn hàng</Text>
        </View>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={styles.tableRow}>
                <Shimmer width="100%" height={36} />
              </View>
            ))
          : rows.length > 0
          ? rows.map((r, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
                <Text style={[styles.tdText, { flex: 1.2 }]}>{r.date_str}</Text>
                <Text style={[styles.tdRevenue, { flex: 2, textAlign: "right" }]}>
                  {formatCurrency(r.daily_revenue)}
                </Text>
                <Text style={[styles.tdOrders, { flex: 1, textAlign: "right" }]}>
                  {r.orders_count}
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
  emptyChart: { height: 160, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#9CA3AF", fontSize: 14 },

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
