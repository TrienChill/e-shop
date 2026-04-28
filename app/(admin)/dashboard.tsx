import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from "react-native";
import { LineChart, PieChart } from "react-native-gifted-charts";
import {
  TrendingUp,
  ShoppingBag,
  RotateCcw,
  Users,
  Bell,
  MoreVertical,
} from "lucide-react-native";

// --- Dummy Data ---
const dummySummary = {
  revenue: 125000000,
  newOrders: 42,
  returnRequests: 5,
  newCustomers: 128,
};

const dummyLineChartData = [
  { value: 15000000, label: "22/4" },
  { value: 18000000, label: "23/4" },
  { value: 12000000, label: "24/4" },
  { value: 25000000, label: "25/4" },
  { value: 22000000, label: "26/4" },
  { value: 30000000, label: "27/4" },
  { value: 35000000, label: "28/4" },
];

const dummyPieChartData = [
  { value: 40, color: "#F59E0B", text: "40%" }, // Pending
  { value: 30, color: "#3B82F6", text: "30%" }, // Shipping
  { value: 25, color: "#10B981", text: "25%" }, // Completed
  { value: 5, color: "#EF4444", text: "5%" }, // Cancelled
];

const dummyTopProducts = [
  {
    id: "1",
    name: "Áo Thun Basic Cotton",
    sales: 124,
    image: "https://via.placeholder.com/60",
    price: 150000,
  },
  {
    id: "2",
    name: "Quần Jean Nữ Cạp Cao",
    sales: 98,
    image: "https://via.placeholder.com/60",
    price: 350000,
  },
  {
    id: "3",
    name: "Váy Hoa Nhí Mùa Hè",
    sales: 85,
    image: "https://via.placeholder.com/60",
    price: 280000,
  },
  {
    id: "4",
    name: "Áo Khoác Gió Thể Thao",
    sales: 72,
    image: "https://via.placeholder.com/60",
    price: 450000,
  },
  {
    id: "5",
    name: "Giày Sneaker Unisex",
    sales: 64,
    image: "https://via.placeholder.com/60",
    price: 650000,
  },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

// --- Components ---

const KPICard = ({ title, value, icon: Icon, color, iconBg }: any) => (
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
        <Text style={styles.kpiValue}>{value}</Text>
      </View>
    </View>
  </View>
);

export default function AdminDashboardHome() {
  const { width } = useWindowDimensions();
  const [chartWidth, setChartWidth] = useState(300); // Default fallback

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
          <Text style={styles.topBarTitle}>Dashboard Tổng Quan</Text>
        </View>
        <View style={styles.topBarActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={20} color="#1F2937" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton}>
            <Image
              source={{ uri: "https://i.pravatar.cc/150?u=admin" }}
              style={styles.profileImage}
            />
            {Platform.OS === "web" && (
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>Admin</Text>
                <Text style={styles.profileRole}>Quản trị viên</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Khu vực 1: Hàng Thẻ Thống Kê Nhanh */}
      <View style={styles.kpiGrid}>
        <View style={{ width: getResponsiveCardWidth() }}>
          <KPICard
            title="Doanh thu (Tháng này)"
            value={formatCurrency(dummySummary.revenue)}
            icon={TrendingUp}
            color="#6366F1"
            iconBg="#EEF2FF"
          />
        </View>
        <View style={{ width: getResponsiveCardWidth() }}>
          <KPICard
            title="Đơn hàng mới"
            value={`${dummySummary.newOrders} (Pending)`}
            icon={ShoppingBag}
            color="#F59E0B"
            iconBg="#FEF3C7"
          />
        </View>
        <View style={{ width: getResponsiveCardWidth() }}>
          <KPICard
            title="Yêu cầu hoàn trả"
            value={`${dummySummary.returnRequests} (Pending)`}
            icon={RotateCcw}
            color="#EF4444"
            iconBg="#FEE2E2"
          />
        </View>
        <View style={{ width: getResponsiveCardWidth() }}>
          <KPICard
            title="Khách hàng mới"
            value={dummySummary.newCustomers.toString()}
            icon={Users}
            color="#10B981"
            iconBg="#D1FAE5"
          />
        </View>
      </View>

      {/* Khu vực 2: Khu vực Biểu đồ */}
      <View style={styles.chartGrid}>
        {/* Cột 1: Biểu đồ đường (Doanh thu 7 ngày) */}
        <View style={[styles.chartCol, { width: getResponsiveChartWidth() }]}>
          <View style={styles.whiteCard}>
            <Text style={styles.cardTitle}>Doanh thu 7 ngày gần nhất</Text>
            <View
              style={styles.chartWrapper}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                // Leave some margin for Y axis
                setChartWidth(width - 60);
              }}
            >
              <LineChart
                data={dummyLineChartData}
                width={chartWidth}
                height={220}
                spacing={chartWidth / dummyLineChartData.length}
                color="#6366F1"
                thickness={3}
                dataPointsColor="#6366F1"
                dataPointsRadius={5}
                hideRules
                yAxisTextStyle={{ color: "#9CA3AF", fontSize: 11 }}
                xAxisLabelTextStyle={{ color: "#9CA3AF", fontSize: 11 }}
                yAxisLabelPrefix=" "
                formatYLabel={(label) => {
                  return (parseInt(label) / 1000000).toString() + "M";
                }}
                isAnimated
              />
            </View>
          </View>
        </View>

        {/* Cột 2: Biểu đồ tròn (Tỉ lệ trạng thái) */}
        <View style={[styles.chartCol, { width: getResponsivePieWidth() }]}>
          <View style={styles.whiteCard}>
            <Text style={styles.cardTitle}>Tỉ lệ trạng thái đơn hàng</Text>
            <View style={styles.pieWrapper}>
              <PieChart
                data={dummyPieChartData}
                donut
                radius={90}
                innerRadius={60}
                centerLabelComponent={() => {
                  return (
                    <View style={styles.pieCenter}>
                      <Text style={styles.pieCenterText}>Tổng</Text>
                      <Text style={styles.pieCenterValue}>100%</Text>
                    </View>
                  );
                }}
              />
              {/* Legend */}
              <View style={styles.legendContainer}>
                {[
                  { label: "Pending", color: "#F59E0B" },
                  { label: "Shipping", color: "#3B82F6" },
                  { label: "Completed", color: "#10B981" },
                  { label: "Cancelled", color: "#EF4444" },
                ].map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: item.color }]}
                    />
                    <Text style={styles.legendText}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>

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
            <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Giá</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Đã bán</Text>
          </View>

          {dummyTopProducts.map((product, index) => (
            <View key={product.id} style={styles.tableRow}>
              <Text style={[styles.tableCellText, styles.rankText, { flex: 0.5 }]}>
                {index + 1}
              </Text>
              <View style={[styles.productCell, { flex: 3 }]}>
                <Image source={{ uri: product.image }} style={styles.productImage} />
                <Text style={styles.productName} numberOfLines={1}>
                  {product.name}
                </Text>
              </View>
              <Text style={[styles.tableCellText, styles.priceText, { flex: 1.5, textAlign: 'right' }]}>
                {formatCurrency(product.price)}
              </Text>
              <Text style={[styles.tableCellText, styles.salesText, { flex: 1, textAlign: 'right' }]}>
                {product.sales}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  cardTitle: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 16,
  },
  chartWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginLeft: -10, // Adjust label alignment
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
  productImage: { width: 40, height: 40, borderRadius: 8, marginRight: 12, backgroundColor: '#F3F4F6' },
  productName: { color: "#111827", fontSize: 14, fontWeight: "600", flex: 1 },
  priceText: { color: "#4B5563" },
  salesText: { color: "#10B981", fontWeight: "700" },
});
