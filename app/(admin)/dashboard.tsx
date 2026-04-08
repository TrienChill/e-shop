import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
} from "react-native";
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  Users, 
  Package, 
  Bell, 
  Search,
  MoreVertical,
  ArrowUpRight
} from "lucide-react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";

// --- Types ---
interface KPICardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ElementType; // Changed to ElementType to handle size/color better
  color: string;
  iconBg: string;
}

interface OrderItem {
  id: string;
  customer: string;
  status: "Đang xử lý" | "Đã giao" | "Đã hủy";
  amount: number;
}

// --- Mock Data ---
const MOCK_REVENUE_DATA = [450, 320, 680, 500, 900, 750, 1200];
const MOCK_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const RECENT_ORDERS: OrderItem[] = [
  { id: "#ORD-8821", customer: "Trần Thế Quyền", status: "Đang xử lý", amount: 1250000 },
  { id: "#ORD-8820", customer: "Nguyễn Văn A", status: "Đã giao", amount: 2400000 },
  { id: "#ORD-8819", customer: "Lê Thị B", status: "Đã hủy", amount: 500000 },
  { id: "#ORD-8818", customer: "Phạm Minh C", status: "Đã giao", amount: 1200000 },
];

// --- Components ---

const StatusBadge = ({ status }: { status: OrderItem["status"] }) => {
  let bgColor = "bg-blue-100";
  let textColor = "text-blue-600";
  if (status === "Đã giao") { bgColor = "bg-green-100"; textColor = "text-green-600"; }
  else if (status === "Đã hủy") { bgColor = "bg-red-100"; textColor = "text-red-600"; }

  return (
    <View className={`${bgColor} px-3 py-1 rounded-full`}>
      <Text className={`${textColor} text-[10px] font-bold uppercase`}>{status}</Text>
    </View>
  );
};

const KPICard = ({ title, value, change, isPositive, icon: Icon, color, iconBg }: KPICardProps) => (
  <View className="w-full sm:w-1/2 lg:w-1/4 p-2">
    <View className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 h-full justify-between">
      <View className="flex-row justify-between items-start mb-6">
        <View className={`p-3 rounded-2xl ${iconBg}`}>
          <Icon size={22} color={color} strokeWidth={2.5} />
        </View>
        <View className={`flex-row items-center px-2 py-1 rounded-lg ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
          {isPositive ? <TrendingUp size={12} color="#10b981" /> : <TrendingDown size={12} color="#ef4444" />}
          <Text className={`ml-1 text-[10px] font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </Text>
        </View>
      </View>
      <View>
        <Text className="text-gray-400 text-xs font-medium mb-1 uppercase tracking-wider">{title}</Text>
        <Text className="text-gray-900 text-2xl font-black">{value}</Text>
      </View>
    </View>
  </View>
);

const SkeletonCard = () => (
  <View className="w-full sm:w-1/2 lg:w-1/4 p-2">
    <View className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 h-full animate-pulse">
      <View className="h-10 w-10 bg-gray-100 rounded-2xl mb-6" />
      <View className="h-4 w-20 bg-gray-100 rounded mb-2" />
      <View className="h-8 w-32 bg-gray-100 rounded" />
    </View>
  </View>
);

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const chartHeight = 220;
  const screenWidth = Dimensions.get("window").width;
  // Adjust width for web sidebar (approx 260px)
  const contentWidth = Platform.OS === 'web' ? Math.max(screenWidth - 340, 600) : screenWidth - 48;
  const chartWidth = contentWidth;
  const maxData = Math.max(...MOCK_REVENUE_DATA);
  
  const points = useMemo(() => {
    return MOCK_REVENUE_DATA.map((val, i) => {
      const x = (i / (MOCK_REVENUE_DATA.length - 1)) * chartWidth;
      const y = chartHeight - (val / maxData) * (chartHeight - 60) - 30;
      return { x, y };
    });
  }, [chartWidth, maxData]);

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
    return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
  };

  return (
    <ScrollView 
      className="flex-1 bg-gray-50/50"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 24 }}
    >
      {/* Top Bar */}
      <View className="flex-row justify-between items-center mb-8">
        <View>
          <Text className="text-gray-400 text-sm font-medium">Hệ thống quản trị</Text>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">Tổng quan</Text>
        </View>
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
            <Bell size={20} color="#1f2937" />
            <View className="absolute top-3 right-3 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center bg-white p-1 pr-4 rounded-full shadow-sm border border-gray-100">
            <Image 
              source={{ uri: "https://i.pravatar.cc/150?u=admin" }} 
              className="w-10 h-10 rounded-full mr-3"
            />
            <View className="hidden sm:flex">
              <Text className="text-gray-900 font-bold text-xs">Admin</Text>
              <Text className="text-gray-400 text-[10px]">Quản trị viên</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Grid */}
      <View className="flex-row flex-wrap -mx-2 mb-6">
        {isLoading ? (
          [1, 2, 3, 4].map(i => <SkeletonCard key={i} />)
        ) : (
          <>
            <KPICard 
              title="Doanh thu"
              value={formatCurrency(125000000)}
              change="+12.5%"
              isPositive={true}
              icon={TrendingUp}
              color="#6366f1"
              iconBg="bg-indigo-50"
            />
            <KPICard 
              title="Đơn hàng"
              value="142"
              change="+5.2%"
              isPositive={true}
              icon={ShoppingBag}
              color="#f59e0b"
              iconBg="bg-amber-50"
            />
            <KPICard 
              title="Khách hàng"
              value="1,204"
              change="+18.7%"
              isPositive={true}
              icon={Users}
              color="#10b981"
              iconBg="bg-emerald-50"
            />
            <KPICard 
              title="Tồn kho thấp"
              value="08"
              change="Cảnh báo"
              isPositive={false}
              icon={Package}
              color="#ef4444"
              iconBg="bg-rose-50"
            />
          </>
        )}
      </View>

      {/* Main Content Sections: Grid for Desktop */}
      <View className="flex-row flex-wrap -mx-3">
        {/* Left Col: Chart */}
        <View className="w-full lg:w-2/3 px-3 mb-6">
          <View className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 h-full">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-gray-900 font-black text-xl tracking-tight">Biểu đồ doanh thu</Text>
                <Text className="text-gray-400 text-xs mt-1">Dữ liệu cập nhật trong 7 ngày qua</Text>
              </View>
              <View className="bg-indigo-50 px-4 py-2 rounded-xl">
                <Text className="text-indigo-600 font-bold text-xs">Tuần này</Text>
              </View>
            </View>

            <View className="items-center">
              {isLoading ? (
                 <View className="h-[220px] w-full bg-gray-50 rounded-3xl animate-pulse items-center justify-center">
                    <Text className="text-gray-300 font-bold">Đang tải biểu đồ...</Text>
                 </View>
              ) : (
                <>
                  <Svg width={chartWidth} height={chartHeight}>
                    <Defs>
                      <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#6366f1" stopOpacity="0.15" />
                        <Stop offset="1" stopColor="#6366f1" stopOpacity="0" />
                      </LinearGradient>
                    </Defs>
                    
                    <Path d={areaPath} fill="url(#grad)" />
                    <Path
                      d={linePath}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {points.map((p, i) => (
                      <Circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="6"
                        fill="#fff"
                        stroke="#6366f1"
                        strokeWidth="3"
                      />
                    ))}
                  </Svg>
                  
                  <View className="flex-row justify-between w-full mt-6 px-2">
                    {MOCK_DAYS.map((day, i) => (
                      <Text key={i} className="text-gray-400 text-[11px] font-black uppercase text-center flex-1">
                        {day}
                      </Text>
                    ))}
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Right Col: Orders */}
        <View className="w-full lg:w-1/3 px-3 mb-6">
          <View className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-gray-900 font-black text-xl tracking-tight">Đơn hàng mới</Text>
              <TouchableOpacity>
                <Text className="text-indigo-600 font-bold text-xs">Tất cả</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              [1, 2, 3, 4].map(i => (
                <View key={i} className="mb-6 flex-row items-center animate-pulse">
                  <View className="w-12 h-12 bg-gray-100 rounded-2xl mr-4" />
                  <View className="flex-1">
                    <View className="h-4 w-24 bg-gray-100 rounded mb-2" />
                    <View className="h-3 w-16 bg-gray-100 rounded" />
                  </View>
                </View>
              ))
            ) : (
              RECENT_ORDERS.map((order, index) => (
                <View 
                  key={order.id} 
                  className="mb-5 flex-row items-center border-b border-gray-50 pb-5 last:border-0 last:pb-0"
                >
                  <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center mr-4">
                    <Text className="text-indigo-600 font-black text-xs">#{index+1}</Text>
                  </View>
                  
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>
                      {order.customer}
                    </Text>
                    <Text className="text-gray-400 text-[11px] font-medium mt-0.5">
                      {order.id} • {formatCurrency(order.amount)}
                    </Text>
                  </View>

                  <View className="items-end">
                     <StatusBadge status={order.status} />
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
