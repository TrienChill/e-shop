import { supabase } from "@/src/lib/supabase";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  Bell,
  Calendar,
  Filter,
  MoreVertical,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Echarts from "@/src/components/admin/EchartsWrapper";
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
} from "date-fns";

type TimeRange = "30days" | "month" | "year" | "custom";

interface FilterState {
  timeRange: TimeRange;
  startDate: Date;
  endDate: Date;
}

function computeDateRange(range: TimeRange, now = new Date()): { startDate: Date; endDate: Date } {
  switch (range) {
    case "30days": {
      const start = new Date(now);
      start.setDate(now.getDate() - 29); // 30 days including today
      return { startDate: startOfDay(start), endDate: endOfDay(now) };
    }
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

// --- Components ---

const Shimmer = ({ width, height, borderRadius = 8, style }: any) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: "#E5E7EB", opacity },
        style,
      ]}
    />
  );
};

const SegBtn = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity
    style={[styles.segBtn, active && styles.segBtnActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>{label}</Text>
  </TouchableOpacity>
);

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

const KPICard = ({ title, value, icon: Icon, color, iconBg, isLoading }: any) => (
  <View style={styles.kpiCardWrapper}>
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeader}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Icon size={24} color={color} strokeWidth={2} />
        </View>
        <TouchableOpacity>
          <MoreVertical size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
      <View>
        <Text style={styles.kpiTitle}>{title}</Text>
        {isLoading ? (
          <Shimmer width={120} height={26} style={{ marginTop: 4 }} />
        ) : (
          <Text style={styles.kpiValue}>{value}</Text>
        )}
      </View>
    </View>
  </View>
);

const FilterButton = ({ label, isActive, onPress }: any) => (
  <TouchableOpacity
    style={[styles.filterButton, isActive && styles.filterButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  processing: "Đang chuẩn bị",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  refunded: "Đã hoàn tiền",
  return_requested: "Yêu cầu hoàn trả",
  returning: "Đang hoàn trả",
  returned: "Đã hoàn trả",
};

export default function AdminDashboardHome() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [chartWidth, setChartWidth] = useState(300);
  const scrollViewRef = useRef<ScrollView>(null);
  const subChartRef = useRef<View>(null);

  const ADMIN_ROUTES = [
    { id: 'dashboard', name: 'Dashboard Tổng Quan', path: '/(admin)/dashboard' },
    { id: 'orders', name: 'Quản lý Đơn hàng', path: '/(admin)/orders' },
    { id: 'returns', name: 'Yêu cầu Hoàn trả', path: '/(admin)/returns' },
    { id: 'products', name: 'Quản lý Sản phẩm', path: '/(admin)/products' },
    { id: 'categories', name: 'Danh mục Sản phẩm', path: '/(admin)/categories' },
    { id: 'revenue', name: 'Báo cáo Doanh thu', path: '/(admin)/revenue' },
    { id: 'users', name: 'Quản lý Người dùng', path: '/(admin)/users' },
    { id: 'banners', name: 'Quản lý Banners', path: '/(admin)/banners' },
    { id: 'vouchers', name: 'Quản lý Vouchers', path: '/(admin)/vouchers' },
    { id: 'reviews', name: 'Đánh giá Sản phẩm', path: '/(admin)/reviews' },
    { id: 'membership', name: 'Hạng Thành viên', path: '/(admin)/membership' },
  ];

  const filteredRoutes = ADMIN_ROUTES.filter(route => 
    route.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // States for real data
  const [summaryData, setSummaryData] = useState<any>({
    revenue: 0,
    new_orders: 3,
    new_returns: 0,
    new_customers: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  // Loading & Filtering States
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const now = new Date();
  const [filter, setFilter] = useState<FilterState>({
    timeRange: "30days",
    ...computeDateRange("30days", now),
  });

  const handleRangeChange = (range: TimeRange) => {
    if (range === "custom") {
      setFilter((f) => ({ ...f, timeRange: "custom" }));
      return;
    }
    const { startDate, endDate } = computeDateRange(range);
    setFilter({ timeRange: range, startDate, endDate });
  };

  const [chartTab, setChartTab] = useState<"revenue" | "orders" | "profit">("revenue");

  // Sub-chart States
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [subChartData, setSubChartData] = useState<any[]>([]);
  const [isSubChartLoading, setIsSubChartLoading] = useState(false);

  const filteredRevenueTotal = revenueData.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
  const filteredOrdersTotal = revenueData.reduce((sum, item) => sum + (Number(item.orders) || 0), 0);
  const filteredProfitTotal = revenueData.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);
  const filteredSubChartTotal = subChartData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const getResponsiveCardWidth = () => {
    if (isDesktop) return "25%";
    if (isTablet) return "50%";
    return "100%";
  };

  const getResponsiveChartWidth = () => {
    if (isDesktop) return "65%";
    if (isTablet) return "100%";
    return "100%";
  };

  const getResponsivePieWidth = () => {
    if (isDesktop) return "35%";
    if (isTablet) return "100%";
    return "100%";
  };

  // Initial Fetch
  useEffect(() => {
    loadOtherData(true);
  }, []);

  // Fetch Revenue when component mounts or filter changes
  useEffect(() => {
    fetchRevenueData(filter.startDate, filter.endDate, !isRefreshing);
  }, [filter.startDate, filter.endDate]);

  // Fetch Sub-chart when filter or status changes
  useEffect(() => {
    if (selectedStatus) {
      fetchSubChartData(selectedStatus, filter.startDate, filter.endDate);
    }
  }, [selectedStatus, filter.startDate, filter.endDate]);

  const handleSliceClick = (statusKey: string) => {
    setSelectedStatus(statusKey);
    // Add a small delay to allow React to render the Sub-chart view before measuring
    setTimeout(() => {
      subChartRef.current?.measureLayout(
        scrollViewRef.current?.getInnerViewNode() as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
        },
        () => console.warn("Lỗi cuộn sub-chart")
      );
    }, 400);
  };

  const fetchSubChartData = async (status: string, start: Date, end: Date) => {
    setIsSubChartLoading(true);
    try {
      const s = startOfDay(start);
      const e = endOfDay(end);

      const { data: orders, error } = await supabase
        .from("orders")
        .select("created_at")
        .eq("status", status)
        .gte("created_at", s.toISOString())
        .lte("created_at", e.toISOString());

      if (error) {
        console.warn("Lỗi fetch subchart:", error);
      }

      const dailyMap: Record<string, number> = {};
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysCount = diffDays === 0 ? 1 : diffDays;

      for (let i = 0; i < daysCount; i++) {
        const d = new Date(s);
        d.setDate(d.getDate() + i);
        if (d > e) break;
        const k = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        dailyMap[k] = 0;
      }

      if (orders && Array.isArray(orders)) {
        orders.forEach((o: any) => {
          const d = new Date(o.created_at);
          const k = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
          if (dailyMap[k] !== undefined) {
            dailyMap[k] += 1;
          }
        });
      }

      const mappedData = Object.keys(dailyMap).map((k) => ({
        value: dailyMap[k],
        label: k,
      }));
      setSubChartData(mappedData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubChartLoading(false);
    }
  };

  const loadOtherData = async (showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true);
    try {
      setErrorMsg("");

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [
        { data: summary, error: err1 },
        { data: status, error: err2 },
        { data: products, error: err3 },
        { count: newOrdersCount },
        { count: newReturnsCount },
        { count: newCustomersCount },
      ] = await Promise.all([
        supabase.rpc("get_dashboard_summary"),
        supabase.rpc("get_order_status_distribution"),
        supabase.rpc("get_top_selling_products"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("return_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
      ]);

      if (err1 || err2 || err3) {
        console.warn("Lỗi fetch RPC khác:", err1 || err2 || err3);
        setErrorMsg("Không thể tải một số dữ liệu từ máy chủ.");
      }

      // 1. Map Summary
      const sumObj = Array.isArray(summary) ? summary[0] : summary;
      
      setSummaryData({
        revenue: sumObj?.revenue ?? sumObj?.total_revenue ?? sumObj?.totalAmount ?? 0,
        new_orders: newOrdersCount ?? 0,
        new_returns: newReturnsCount ?? 0,
        new_customers: newCustomersCount ?? 0,
      });

      // 2. Map Status
      if (status && Array.isArray(status)) {
        const statusColors: any = {
          pending: "#F59E0B", // Yellow
          processing: "#8B5CF6", // Purple
          shipping: "#3B82F6", // Blue
          completed: "#10B981", // Green
          cancelled: "#EF4444", // Red
          refunded: "#64748B", // Gray
          return_requested: "#F43F5E", // Rose
          returning: "#EC4899", // Pink
          returned: "#14B8A6", // Teal
        };
        const statusLabels: any = {
          pending: "Chờ xử lý",
          processing: "Đang chuẩn bị",
          shipping: "Đang giao",
          completed: "Hoàn thành",
          cancelled: "Đã hủy",
          refunded: "Đã hoàn tiền",
          return_requested: "Yêu cầu hoàn trả",
          returning: "Đang hoàn trả",
          returned: "Đã hoàn trả",
        };

        const totalCount = status.reduce(
          (acc, curr) => acc + (Number(curr.count) || 0),
          0
        );

        const mappedStatus = status.map((s: any) => {
          const val = Number(s.count) || 0;
          return {
            value: val,
            color: statusColors[s.status] || "#9CA3AF",
            text: STATUS_LABELS[s.status] || s.status,
            label: STATUS_LABELS[s.status] || s.status,
            statusKey: s.status,
            percentage:
              totalCount > 0
                ? Math.round((val / totalCount) * 100) + "%"
                : "0%",
          };
        });
        setStatusData(mappedStatus);
      }

      // 3. Map Products
      if (products && Array.isArray(products) && products.length > 0) {
        // Hàm RPC hiện tại đang không trả về trường 'price', nên ta sẽ gọi phụ thêm để lấy giá
        const productIds = products.map((p: any) => p.product_id);
        const { data: priceData } = await supabase
          .from("products")
          .select("id, price")
          .in("id", productIds);
          
        const priceMap = new Map(priceData?.map(p => [p.id, p.price]) || []);
        
        const enrichedProducts = products.map((p: any) => ({
          ...p,
          price: priceMap.get(p.product_id) || 0,
        }));
        
        setTopProducts(enrichedProducts);
      } else {
        setTopProducts([]);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      if (showSkeleton) setIsLoading(false);
    }
  };

  const fetchRevenueData = async (start: Date, end: Date, showSpinner = false) => {
    if (showSpinner) setIsChartLoading(true);
    try {
      const s = startOfDay(start);
      const e = endOfDay(end);

      const { data: orders, error } = await supabase
        .from("orders")
        .select("created_at, total_amount, status")
        .gte("created_at", s.toISOString())
        .lte("created_at", e.toISOString());

      if (error) {
        console.warn("Lỗi fetch orders:", error);
      }

      const dailyMap: Record<string, { revenue: number; orders: number; profit: number }> = {};
      
      const diffTime = Math.abs(endOfDay(end).getTime() - startOfDay(start).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysCount = diffDays === 0 ? 1 : diffDays;

      for (let i = 0; i < daysCount; i++) {
        const d = new Date(s);
        d.setDate(d.getDate() + i);
        if (d > e) break;
        const k = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        dailyMap[k] = { revenue: 0, orders: 0, profit: 0 };
      }

      if (orders && Array.isArray(orders)) {
        orders.forEach((o: any) => {
          const d = new Date(o.created_at);
          const k = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
          if (dailyMap[k]) {
            if (o.status === "completed") {
              const amount = Number(o.total_amount) || 0;
              dailyMap[k].revenue += amount;
              dailyMap[k].profit += amount * 0.2; // Giả sử 20% biên lợi nhuận
            }
            dailyMap[k].orders += 1;
          }
        });
      }

      const mappedRevenue = Object.keys(dailyMap).map((k) => ({
        label: k,
        revenue: dailyMap[k].revenue,
        orders: dailyMap[k].orders,
        profit: dailyMap[k].profit,
      }));
      setRevenueData(mappedRevenue);
    } catch (err) {
      console.error(err);
    } finally {
      if (showSpinner) setIsChartLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadOtherData(false),
      fetchRevenueData(filter.startDate, filter.endDate, false),
    ]);
    setIsRefreshing(false);
  };

  const renderPieChart = () => {
    if (isLoading) {
      return <Shimmer width={180} height={180} borderRadius={90} />;
    }
    if (statusData.length === 0) {
      return (
        <View style={[styles.pieCenter, { height: 180 }]}>
          <Text style={{ color: "#9CA3AF" }}>Chưa có dữ liệu</Text>
        </View>
      );
    }

    const pieOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: '#1F2937',
        textStyle: { color: 'white', fontSize: 12 }
      },
      series: [
        {
          type: 'pie',
          radius: ['50%', '80%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: { show: false, position: 'center' },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              formatter: '{b}\n{d}%',
              color: '#111827'
            }
          },
          labelLine: { show: false },
          data: statusData.map((item: any) => ({
            value: item.value,
            name: item.label,
            itemStyle: { color: item.color },
            statusKey: item.statusKey
          }))
        }
      ]
    };

    return (
      <View style={{ width: 220, height: 220, alignSelf: 'center' }}>
        <Echarts
          option={pieOption}
          height={220}
          onPress={(e: any) => {
            const statusKey = e?.data?.statusKey;
            if (statusKey) {
              handleSliceClick(statusKey);
            }
          }}
        />
        {/* Fake Center Text since ECharts dynamic center label is complex */}
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }]}>
          <Text style={styles.pieCenterText}>Tổng</Text>
          <Text style={styles.pieCenterValue}>100%</Text>
        </View>
      </View>
    );
  };

  const getChartConfig = () => {
    let dataKey = 'revenue';
    let type = 'line';
    let color = '#4F46E5';
    let areaColor = 'rgba(99, 102, 241, 0.4)';
    let name = 'Doanh thu';
    let isCurrency = true;

    if (chartTab === 'orders') {
      dataKey = 'orders';
      type = 'bar';
      color = '#10B981';
      name = 'Đơn hàng';
      isCurrency = false;
    } else if (chartTab === 'profit') {
      dataKey = 'profit';
      type = 'line';
      color = '#F59E0B';
      areaColor = 'rgba(245, 158, 11, 0.4)';
      name = 'Lợi nhuận';
    }

    return { dataKey, type, color, areaColor, name, isCurrency };
  };

  const chartConfig = getChartConfig();

  const revenueOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1F2937',
      textStyle: { color: 'white' },
      formatter: `function (params) {
        let p = params[0];
        let val = ${chartConfig.isCurrency ? "Number(p.value).toLocaleString('vi-VN') + ' đ'" : "p.value + ' đơn'"};
        return '<div style="font-size:10px;color:#9CA3AF;margin-bottom:2px">' + p.name + '</div><div style="font-weight:800;font-size:12px">' + val + '</div>';
      }`
    },
    grid: { left: '2%', right: '2%', bottom: '2%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: chartConfig.type === 'bar',
      data: revenueData.map(item => item.label),
      axisLine: { lineStyle: { color: '#F3F4F6' } },
      axisLabel: { color: '#6B7280', fontSize: 10, fontWeight: '500' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'solid', color: '#F3F4F6' } },
      axisLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '600',
        formatter: `function (value) {
          if (${chartConfig.isCurrency}) {
            if (value >= 1000000000) return (value / 1000000000).toFixed(1) + "B";
            if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
            if (value >= 1000) return (value / 1000).toFixed(0) + "k";
          }
          return value.toString();
        }`
      }
    },
    series: [
      {
        type: chartConfig.type,
        smooth: true,
        data: revenueData.map(item => item[chartConfig.dataKey as keyof typeof item]),
        itemStyle: { 
          color: chartConfig.color,
          borderRadius: chartConfig.type === 'bar' ? [4, 4, 0, 0] : 0
        },
        lineStyle: chartConfig.type === 'line' ? { width: 4, color: chartConfig.color } : undefined,
        areaStyle: chartConfig.type === 'line' ? {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: chartConfig.areaColor },
              { offset: 1, color: chartConfig.areaColor.replace('0.4', '0.05') }
            ]
          }
        } : undefined,
        barMaxWidth: 20
      }
    ]
  };

  const subChartOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1F2937',
      textStyle: { color: 'white' },
      formatter: `function (params) {
        let p = params[0];
        return '<div style="font-size:10px;color:#9CA3AF;margin-bottom:2px">' + p.name + '</div><div style="font-weight:800;font-size:12px">' + p.value + ' đơn</div>';
      }`
    },
    grid: { left: '2%', right: '2%', bottom: '2%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: subChartData.map(item => item.label),
      axisLine: { lineStyle: { color: '#F3F4F6' } },
      axisLabel: { color: '#6B7280', fontSize: 10, fontWeight: '500' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'solid', color: '#F3F4F6' } },
      axisLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' }
    },
    series: [
      {
        type: 'line',
        smooth: true,
        data: subChartData.map(item => item.value),
        itemStyle: { color: '#D97706' },
        lineStyle: { width: 4, color: '#F59E0B' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.4)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.05)' }
            ]
          }
        }
      }
    ]
  };

  return (
    <View style={styles.root}>
      {/* Top Bar - Fixed Header */}
      <View style={[styles.topBar, { backgroundColor: "white", paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", zIndex: 50, marginBottom: 0 }]}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.topBarLabel}>Hệ thống quản trị</Text>
            <Text style={styles.topBarTitle}>Dashboard Tổng Quan</Text>
          </View>

          {/* Search Bar */}
          {isDesktop && (
            <View style={{ flex: 1, marginHorizontal: 24, maxWidth: 400, position: 'relative', zIndex: 60 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, height: 40 }}>
                <Search size={18} color="#9CA3AF" />
                <TextInput
                  style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#111827', outlineStyle: 'none' } as any}
                  placeholder="Tìm kiếm tính năng, quản lý..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                />
              </View>
              {isSearchFocused && searchQuery.length > 0 && (
                <View style={{ position: 'absolute', top: 48, left: 0, right: 0, backgroundColor: 'white', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, padding: 8, maxHeight: 300, overflow: 'hidden' }}>
                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {filteredRoutes.length > 0 ? (
                      filteredRoutes.map((route) => (
                        <TouchableOpacity
                          key={route.id}
                          style={{ padding: 12, borderRadius: 8, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center' }}
                          onPress={() => {
                            setSearchQuery("");
                            setIsSearchFocused(false);
                            router.push(route.path as any);
                          }}
                        >
                          <Search size={16} color="#6366F1" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 14, color: '#1F2937', fontWeight: '500' }}>{route.name}</Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={{ padding: 12, color: '#9CA3AF', textAlign: 'center' }}>Không tìm thấy kết quả</Text>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          <View style={styles.topBarActions}>
            <TouchableOpacity style={styles.iconButton} onPress={handleRefresh}>
              <RefreshCw size={20} color="#1F2937" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Bell size={20} color="#1F2937" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton}>
              <Image source={{ uri: "https://i.pravatar.cc/150?u=admin" }} style={styles.profileImage} />
              {Platform.OS === "web" && (
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>Admin</Text>
                  <Text style={styles.profileRole}>Quản trị viên</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.rootContent, { paddingTop: 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={["#6366F1"]}
            tintColor="#6366F1"
          />
        }
      >

      {/* Error Message */}
      {errorMsg ? (
        <View style={styles.errorAlert}>
          <AlertCircle size={20} color="#EF4444" />
          <Text style={styles.errorAlertText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Khu vực 1: Hàng Thẻ Thống Kê Nhanh */}
      <View style={styles.kpiGrid}>
        <View style={{ width: getResponsiveCardWidth() }}>
          <KPICard
            title="Doanh thu (Lọc theo biểu đồ)"
            value={formatCurrency(filteredRevenueTotal)}
            icon={TrendingUp}
            color="#6366F1"
            iconBg="#EEF2FF"
            isLoading={isLoading || isChartLoading}
          />
        </View>
        <View style={{ width: getResponsiveCardWidth() }}>
          <KPICard
            title="Đơn hàng mới"
            value={`${summaryData.new_orders} (Pending)`}
            icon={ShoppingBag}
            color="#F59E0B"
            iconBg="#FEF3C7"
            isLoading={isLoading}
          />
        </View>
        <View style={{ width: getResponsiveCardWidth() }}>
          <KPICard
            title="Yêu cầu hoàn trả"
            value={`${summaryData.new_returns} (Pending)`}
            icon={RotateCcw}
            color="#EF4444"
            iconBg="#FEE2E2"
            isLoading={isLoading}
          />
        </View>
        <View style={{ width: getResponsiveCardWidth() }}>
          <KPICard
            title="Khách hàng mới"
            value={summaryData.new_customers.toString()}
            icon={Users}
            color="#10B981"
            iconBg="#D1FAE5"
            isLoading={isLoading}
          />
        </View>
      </View>

      {/* ── Filter Panel ── */}
      <View style={[styles.filterPanel, { marginBottom: 24 }]}>
        <View style={styles.segGroup}>
          {[
            { key: "30days", label: "30 Ngày qua" },
            { key: "month", label: "Tháng này" },
            { key: "year", label: "Năm nay" },
            { key: "custom", label: "Tùy chọn" },
          ].map((btn) => (
            <SegBtn
              key={btn.key}
              label={btn.label}
              active={filter.timeRange === btn.key}
              onPress={() => handleRangeChange(btn.key as TimeRange)}
            />
          ))}
        </View>

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

      {/* Khu vực 2: Khu vực Biểu đồ */}
      <View style={styles.chartGrid}>
        {/* Cột 1: Biểu đồ đường (Doanh thu) */}
        <View style={[styles.chartCol, { width: getResponsiveChartWidth() }]}>
          <View style={styles.whiteCard}>
            <View style={styles.chartHeaderContainer}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
                    Thống kê 30 ngày qua
                  </Text>
                  {isChartLoading && (
                    <ActivityIndicator size="small" color="#6366F1" style={{ marginLeft: 12 }} />
                  )}
                </View>
                <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>
                  Tổng: <Text style={{ color: chartConfig.color, fontWeight: '700' }}>
                    {chartTab === 'revenue' ? formatCurrency(filteredRevenueTotal) : 
                     chartTab === 'orders' ? filteredOrdersTotal + ' đơn' : 
                     formatCurrency(filteredProfitTotal)}
                  </Text>
                </Text>
              </View>

              <View style={styles.filterGroup}>
                <FilterButton
                  label="Doanh thu"
                  isActive={chartTab === "revenue"}
                  onPress={() => setChartTab("revenue")}
                />
                <FilterButton
                  label="Đơn đặt hàng"
                  isActive={chartTab === "orders"}
                  onPress={() => setChartTab("orders")}
                />
                <FilterButton
                  label="Lợi nhuận"
                  isActive={chartTab === "profit"}
                  onPress={() => setChartTab("profit")}
                />
              </View>
            </View>

            <View
              style={styles.chartWrapper}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                setChartWidth(Math.max(width - 60, 200));
              }}
            >
              {isLoading && revenueData.length === 0 ? (
                <Shimmer width="100%" height={240} />
              ) : revenueData.length > 0 ? (
                <Echarts option={revenueOption} height={240} />
              ) : (
                <View style={[styles.chartWrapper, { height: 220 }]}>
                  <Text style={{ color: "#9CA3AF" }}>
                    Chưa có dữ liệu giao dịch
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Cột 2: Biểu đồ tròn (Tỉ lệ trạng thái) */}
        <View style={[styles.chartCol, { width: getResponsivePieWidth() }]}>
          <View style={styles.whiteCard}>
            <Text style={styles.cardTitle}>Tỉ lệ trạng thái đơn hàng</Text>
            <View style={styles.pieWrapper}>
              {renderPieChart()}

              {/* Legend */}
              {!isLoading && statusData.length > 0 && (
                <View style={styles.legendContainer}>
                  {statusData.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: item.color },
                        ]}
                      />
                      <Text style={styles.legendText}>
                        {item.label} ({item.percentage})
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Sub-chart (Drill-down) */}
      {selectedStatus && (
        <View ref={subChartRef} style={{ marginBottom: 24 }}>
          <View style={[styles.whiteCard, { width: "100%" }]}>
            <View style={styles.chartHeaderContainer}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
                    Chi tiết: {STATUS_LABELS[selectedStatus] || selectedStatus}
                  </Text>
                  {isSubChartLoading && (
                    <ActivityIndicator size="small" color="#F59E0B" style={{ marginLeft: 12 }} />
                  )}
                </View>
                <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>
                  Tổng đơn hàng: <Text style={{ color: '#F59E0B', fontWeight: '700' }}>{filteredSubChartTotal}</Text>
                </Text>
              </View>

              <View style={[styles.filterGroup, { justifyContent: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }]}>
                <Calendar size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>
                  {formatDisplay(filter.startDate)} - {formatDisplay(filter.endDate)}
                </Text>
              </View>
            </View>

            <View style={[styles.chartWrapper, { height: 240 }]}>
              {isSubChartLoading && subChartData.length === 0 ? (
                <Shimmer width="100%" height={240} />
              ) : subChartData.length > 0 ? (
                <Echarts option={subChartOption} height={240} />
              ) : (
                <View style={[styles.chartWrapper, { height: 240 }]}>
                  <Text style={{ color: "#9CA3AF" }}>
                    Không có đơn hàng nào
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Khu vực 3: Danh sách nổi bật */}
      <View style={styles.listSection}>
        <View style={styles.whiteCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Top 5 Sản Phẩm Bán Chạy Nhất</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 0.5 }]}>#</Text>
            <Text style={[styles.tableHeaderText, { flex: 3 }]}>Sản phẩm</Text>
            <Text
              style={[
                styles.tableHeaderText,
                { flex: 1.5, textAlign: "right" },
              ]}
            >
              Giá
            </Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}
            >
              Đã bán
            </Text>
          </View>

          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <View key={index} style={styles.tableRow}>
                <Shimmer width="100%" height={40} />
              </View>
            ))
          ) : topProducts.length > 0 ? (
            topProducts.map((product, index) => (
              <View key={product.product_id} style={styles.tableRow}>
                <Text
                  style={[styles.tableCellText, styles.rankText, { flex: 0.5 }]}
                >
                  {index + 1}
                </Text>
                <View style={[styles.productCell, { flex: 3 }]}>
                  <Image
                    source={{
                      uri:
                        product.image_url ||
                        "https://via.placeholder.com/60",
                    }}
                    style={styles.productImage}
                  />
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.tableCellText,
                    styles.priceText,
                    { flex: 1.5, textAlign: "right" },
                  ]}
                >
                  {formatCurrency(product.price)}
                </Text>
                <Text
                  style={[
                    styles.tableCellText,
                    styles.salesText,
                    { flex: 1, textAlign: "right" },
                  ]}
                >
                  {product.total_sold ?? product.total_sales ?? 0}
                </Text>
              </View>
            ))
          ) : (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Text style={{ color: "#9CA3AF" }}>Chưa có sản phẩm bán chạy</Text>
            </View>
          )}
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9FAFB" },
  rootContent: { padding: 24, paddingBottom: 48 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  topBarLabel: { color: "#9CA3AF", fontSize: 14, fontWeight: "500" },
  topBarTitle: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconButton: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    backgroundColor: "#EF4444",
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "white",
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 4,
    paddingRight: 16,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  profileImage: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  profileInfo: { display: "flex" },
  profileName: { color: "#111827", fontWeight: "700", fontSize: 13 },
  profileRole: { color: "#9CA3AF", fontSize: 11 },

  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  errorAlertText: { color: "#B91C1C", marginLeft: 8, fontWeight: "500" },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
    marginBottom: 24,
  },
  kpiCardWrapper: { padding: 8 },
  kpiCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 140,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconContainer: { padding: 12, borderRadius: 14 },
  kpiTitle: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 16,
    marginBottom: 4,
  },
  kpiValue: { color: "#111827", fontSize: 22, fontWeight: "800" },

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

  chartGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
    marginBottom: 24,
  },
  chartCol: { padding: 8 },
  whiteCard: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  chartHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  cardTitle: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 18,
  },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 4,
    borderRadius: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#111827",
  },
  chartWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginLeft: -10,
  },
  pieWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  pieCenter: { alignItems: "center", justifyContent: "center" },
  pieCenterText: { color: "#6B7280", fontSize: 12, fontWeight: "500" },
  pieCenterValue: { color: "#111827", fontSize: 20, fontWeight: "800" },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 24,
    gap: 16,
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: "#4B5563", fontSize: 12, fontWeight: "500" },

  listSection: { marginTop: 8 },
  seeAllText: { color: "#6366F1", fontWeight: "600", fontSize: 14 },

  tableHeader: {
    flexDirection: "row",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 12,
  },
  tableHeaderText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  tableCellText: { color: "#111827", fontSize: 14, fontWeight: "500" },
  rankText: { color: "#6B7280", fontWeight: "700" },
  productCell: { flexDirection: "row", alignItems: "center" },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#F3F4F6",
  },
  productName: { color: "#111827", fontSize: 14, fontWeight: "600", flex: 1 },
  priceText: { color: "#4B5563" },
  salesText: { color: "#10B981", fontWeight: "700" },
});
