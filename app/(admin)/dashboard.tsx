import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  Users, 
  Package, 
  Bell, 
  ArrowUpRight,
  AlertCircle
} from "lucide-react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";
import { 
  getAdminDashboardStats, 
  getRevenueChartData, 
  getRecentOrders,
  AdminStats,
  ChartData
} from "@/src/services/admin/stats";

// --- Components ---

const StatusBadge = ({ status }: { status: string }) => {
  let bgColor = "#EFF6FF";
  let textColor = "#2563EB";
  let label = status;

  if (status === "completed" || status === "Đã giao") { 
    bgColor = "#DCFCE7"; textColor = "#15803D"; label = "Đã giao";
  } else if (status === "cancelled" || status === "Đã hủy") { 
    bgColor = "#FEE2E2"; textColor = "#B91C1C"; label = "Đã hủy";
  } else if (status === "pending" || status === "Đang xử lý") {
    bgColor = "#FEF3C7"; textColor = "#B45309"; label = "Đang xử lý";
  }

  return (
    <View style={StyleSheet.flatten([styles.statusBadge, { backgroundColor: bgColor }])}>
      <Text style={StyleSheet.flatten([styles.statusBadgeText, { color: textColor }])}>{label}</Text>
    </View>
  );
};

const KPICard = ({ title, value, change, isPositive, icon: Icon, color, iconBg }: any) => (
  <View style={styles.kpiCardWrapper}>
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeader}>
        <View style={StyleSheet.flatten([styles.iconContainer, { backgroundColor: iconBg }])}>
          <Icon size={22} color={color} strokeWidth={2.5} />
        </View>
        <View style={StyleSheet.flatten([styles.changeBadge, { backgroundColor: isPositive ? '#F0FDF4' : '#FEF2F2' }])}>
          {isPositive ? <TrendingUp size={12} color="#10b981" /> : <TrendingDown size={12} color="#ef4444" />}
          <Text style={StyleSheet.flatten([styles.changeText, { color: isPositive ? '#10b981' : '#ef4444' }])}>
            {change}
          </Text>
        </View>
      </View>
      <View>
        <Text style={styles.kpiTitle}>{title}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
      </View>
    </View>
  </View>
);

const SkeletonCard = () => (
  <View style={styles.kpiCardWrapper}>
    <View style={StyleSheet.flatten([styles.kpiCard, styles.skeleton])}>
      <View style={styles.skeletonIcon} />
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonValue} />
    </View>
  </View>
);

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [s, c, o] = await Promise.all([
        getAdminDashboardStats(),
        getRevenueChartData(),
        getRecentOrders(5)
      ]);

      setStats(s);
      setChartData(c);
      setRecentOrders(o);
    } catch (err: any) {
      console.log("DASHBOARD_ERROR_OBJECT:", err);
      const msg = err?.message || "Lỗi mạng hoặc phân quyền Supabase";
      const code = err?.code || "NoCode";
      setError(`Lỗi: ${msg} (Mã: ${code})`);
      
      if (Platform.OS !== 'web') {
        Alert.alert("Lỗi kết nối", msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const chartHeight = 220;
  const screenWidth = Dimensions.get("window").width;
  const contentWidth = Platform.OS === 'web' ? Math.max(screenWidth - 340, 600) : screenWidth - 48;
  const chartWidth = contentWidth;
  
  const maxRevenue = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map(d => d.revenue), 1000000);
  }, [chartData]);
  
  const points = useMemo(() => {
    if (chartData.length === 0) return [];
    return chartData.map((d, i) => {
      const x = (i / (chartData.length - 1)) * chartWidth;
      const y = chartHeight - (d.revenue / maxRevenue) * (chartHeight - 60) - 30;
      return { x, y };
    });
  }, [chartData, chartWidth, maxRevenue]);

  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, point, i) => {
      return i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
    }, "");
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const lastPoint = points[points.length - 1];
    return `${linePath} L ${lastPoint.x} ${chartHeight} L 0 ${chartHeight} Z`;
  }, [linePath, points]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (error && !isLoading) {
    return (
      <View style={styles.errorFull}>
        <AlertCircle size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Rất tiếc, đã xảy ra lỗi</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadDashboardData}
        >
          <Text style={styles.retryText}>Thử lại hệ thống</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.root}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.rootContent}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarLabel}>Hệ thống quản trị</Text>
          <Text style={styles.topBarTitle}>Tổng quan</Text>
        </View>
        <View style={styles.topBarActions}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={loadDashboardData}
          >
            <Bell size={20} color="#1f2937" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton}>
            <Image 
              source={{ uri: "https://i.pravatar.cc/150?u=admin" }} 
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Admin</Text>
              <Text style={styles.profileRole}>Quản trị viên</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        {isLoading || !stats ? (
          [1, 2, 3, 4].map(i => <SkeletonCard key={i} />)
        ) : (
          <>
            <KPICard 
              title="Doanh thu"
              value={formatCurrency(stats.totalRevenue)}
              change="+12.5%"
              isPositive={true}
              icon={TrendingUp}
              color="#6366f1"
              iconBg="#EEF2FF"
            />
            <KPICard 
              title="Đơn hàng"
              value={stats.newOrdersToday}
              change="+0%"
              isPositive={true}
              icon={ShoppingBag}
              color="#f59e0b"
              iconBg="#FFFBEB"
            />
            <KPICard 
              title="Khách hàng"
              value={stats.totalCustomers.toLocaleString()}
              change="+0%"
              isPositive={true}
              icon={Users}
              color="#10b981"
              iconBg="#ECFDF5"
            />
            <KPICard 
              title="Tồn kho thấp"
              value={stats.lowStockCount}
              change="Cần chú ý"
              isPositive={false}
              icon={Package}
              color="#ef4444"
              iconBg="#FEF2F2"
            />
          </>
        )}
      </View>

      {/* Main Content Sections */}
      <View style={styles.mainGrid}>
        {/* Left Col: Chart */}
        <View style={styles.chartCol}>
          <View style={styles.whiteCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Doanh thu 7 ngày qua</Text>
                <Text style={styles.cardSubtitle}>Dữ liệu thực tế từ Supabase</Text>
              </View>
              <View style={styles.realtimeBadge}>
                <Text style={styles.realtimeText}>Real-time</Text>
              </View>
            </View>

            <View style={styles.chartWrapper}>
              {isLoading ? (
                 <View style={styles.chartSkeleton}>
                    <Text style={styles.skeletonText}>Đang tải...</Text>
                 </View>
              ) : (
                <>
                  <Svg width={chartWidth} height={chartHeight}>
                    <Defs>
                      <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#6366f1" stopOpacity={0.15} />
                        <Stop offset="1" stopColor="#6366f1" stopOpacity={0} />
                      </LinearGradient>
                    </Defs>
                    
                    <Path d={areaPath} fill="url(#grad)" />
                    <Path
                      d={linePath}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {points.map((p, i) => (
                      <Circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={6}
                        fill="#fff"
                        stroke="#6366f1"
                        strokeWidth={3}
                      />
                    ))}
                  </Svg>
                  
                  <View style={styles.chartLabels}>
                    {chartData.map((d, i) => (
                      <Text key={i} style={styles.chartLabel}>
                        {d.day}
                      </Text>
                    ))}
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Right Col: Orders */}
        <View style={styles.ordersCol}>
          <View style={styles.whiteCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Đơn hàng mới nhất</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>Tất cả</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              [1, 2, 3, 4, 5].map(i => (
                <View key={i} style={styles.orderItemSkeleton}>
                  <View style={styles.orderIconSkeleton} />
                  <View style={styles.orderTextSkeleton}>
                    <View style={styles.skeletonLineShort} />
                    <View style={styles.skeletonLineMini} />
                  </View>
                </View>
              ))
            ) : (
              recentOrders.length > 0 ? (
                recentOrders.map((order, index) => (
                  <View 
                    key={order.id} 
                    style={styles.orderItem}
                  >
                    <View style={styles.orderIcon}>
                      <Text style={styles.orderIndexText}>#{index+1}</Text>
                    </View>
                    
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderCustomerName} numberOfLines={1}>
                        {order.profiles?.full_name || "Guest"}
                      </Text>
                      <Text style={styles.orderAmount}>
                        {formatCurrency(order.total_amount)}
                      </Text>
                    </View>

                    <View style={styles.orderStatus}>
                       <StatusBadge status={order.status} />
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Trống</Text>
                </View>
              )
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "rgba(249, 250, 251, 0.5)" },
  rootContent: { padding: 24 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  topBarLabel: { color: "#9ca3af", fontSize: 14, fontWeight: "500" },
  topBarTitle: { color: "#111827", fontSize: 30, fontWeight: "900", letterSpacing: -0.5 },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconButton: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    backgroundColor: "#6366f1",
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
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  profileImage: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  profileInfo: { display: Platform.OS === 'web' ? 'flex' : 'none' },
  profileName: { color: "#111827", fontWeight: "700", fontSize: 12 },
  profileRole: { color: "#9ca3af", fontSize: 10 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -8, marginBottom: 24 },
  kpiCardWrapper: { width: Platform.OS === 'web' ? "25%" : "100%", padding: 8 },
  kpiCard: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    justifyContent: "space-between",
    minHeight: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  kpiHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  iconContainer: { padding: 12, borderRadius: 16 },
  changeBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  changeText: { marginLeft: 4, fontSize: 10, fontWeight: "700" },
  kpiTitle: { color: "#9ca3af", fontSize: 12, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  kpiValue: { color: "#111827", fontSize: 24, fontWeight: "900" },
  mainGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -12 },
  chartCol: { width: Platform.OS === 'web' ? "66.666%" : "100%", paddingHorizontal: 12, marginBottom: 24 },
  ordersCol: { width: Platform.OS === 'web' ? "33.333%" : "100%", paddingHorizontal: 12, marginBottom: 24 },
  whiteCard: {
    backgroundColor: "white",
    padding: 32,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  cardTitle: { color: "#111827", fontWeight: "900", fontSize: 20, letterSpacing: -0.5 },
  cardSubtitle: { color: "#9ca3af", fontSize: 12, marginTop: 4 },
  realtimeBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  realtimeText: { color: "#6366f1", fontWeight: "700", fontSize: 12 },
  chartWrapper: { alignItems: "center" },
  chartSkeleton: { height: 220, width: "100%", backgroundColor: "#f9fafb", borderRadius: 24, alignItems: "center", justifyContent: "center" },
  skeletonText: { color: "#d1d5db", fontWeight: "700" },
  chartLabels: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 24, paddingHorizontal: 8 },
  chartLabel: { color: "#9ca3af", fontSize: 11, fontWeight: "900", textTransform: "uppercase", textAlign: "center", flex: 1 },
  seeAllText: { color: "#6366f1", fontWeight: "700", fontSize: 12 },
  orderItem: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f9fafb", paddingBottom: 20, marginBottom: 20 },
  orderIcon: { width: 48, height: 48, backgroundColor: "#EEF2FF", borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 16 },
  orderIndexText: { color: "#6366f1", fontWeight: "900", fontSize: 12 },
  orderInfo: { flex: 1 },
  orderCustomerName: { color: "#111827", fontWeight: "700", fontSize: 14 },
  orderAmount: { color: "#9ca3af", fontSize: 11, fontWeight: "500", marginTop: 2 },
  orderStatus: { alignItems: "flex-end" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 },
  statusBadgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  emptyContainer: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: "#9ca3af", fontStyle: "italic" },
  errorFull: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb", padding: 24 },
  errorTitle: { color: "#111827", fontWeight: "700", fontSize: 18, marginTop: 16 },
  errorMsg: { color: "#ef4444", fontSize: 14, marginTop: 8, textAlign: "center", backgroundColor: "#fef2f2", padding: 16, borderRadius: 20, borderWidth: 1, borderColor: "#fee2e2" },
  retryButton: { marginTop: 24, backgroundColor: "#6366f1", paddingHorizontal: 32, paddingVertical: 12, borderRadius: 16 },
  retryText: { color: "white", fontWeight: "700" },
  skeleton: { opacity: 0.5 },
  skeletonIcon: { height: 40, width: 40, backgroundColor: "#f3f4f6", borderRadius: 16, marginBottom: 24 },
  skeletonTitle: { height: 16, width: 80, backgroundColor: "#f3f4f6", borderRadius: 4, marginBottom: 8 },
  skeletonValue: { height: 32, width: 120, backgroundColor: "#f3f4f6", borderRadius: 4 },
  orderItemSkeleton: { marginBottom: 24, flexDirection: "row", alignItems: "center" },
  orderIconSkeleton: { width: 48, height: 48, backgroundColor: "#f3f4f6", borderRadius: 16, marginRight: 16 },
  orderTextSkeleton: { flex: 1 },
  skeletonLineShort: { height: 16, width: 96, backgroundColor: "#f3f4f6", borderRadius: 4, marginBottom: 8 },
  skeletonLineMini: { height: 12, width: 64, backgroundColor: "#f3f4f6", borderRadius: 4 },
});

