import CommonHeader from "@/src/components/layout/Header";
import PriceDisplay from "@/src/components/common/PriceDisplay";
import { supabase } from "@/src/lib/supabase";
import { calculateDiscountedPrice } from "@/src/services/product";
import { router, useFocusEffect } from "expo-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleCheck,
} from "lucide-react-native";
import React, { useMemo, useState, useCallback } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 48 - 16) / 2;

// Bảng màu chuẩn theo thiết kế
const COLORS = {
  blue: "#0055FF",
  lightBlue: "#E6F0FF",
  white: "#FFFFFF",
  dark: "#1A1A1A",
  gray: "#8E8E93",
  lightGray: "#F2F2F7",
  shadow: "rgba(0, 0, 0, 0.05)",
};


export default function RecentlyViewedScreen() {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date()); 
  const [recentViews, setRecentViews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchRecentViews();
    }, [])
  );

  const fetchRecentViews = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from("product_view_history")
        .select(`
          viewed_at,
          product:products (
            id,
            name,
            images,
            price,
            product_discounts (
              id, discount_type, discount_value, is_active, start_date, end_date
            )
          )
        `)
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false });
        
      if (!error && data && data.length > 0) {
        const updatedRecentViews = data.map((item: any) => {
          const prod = item.product;
          if (!prod) return null;
          
          const realProj = calculateDiscountedPrice(prod);
          return {
            id: prod.id,
            name: realProj.name,
            image: realProj.images?.[0] || "https://via.placeholder.com/150",
            price: realProj.finalPrice,
            originalPrice: realProj.originalPrice,
            hasDiscount: realProj.hasDiscount,
            viewed_at: item.viewed_at,
          };
        }).filter(Boolean);

        setRecentViews(updatedRecentViews);
      } else {
        setRecentViews([]);
      }
    } catch (error) {
      console.error("Lỗi lấy sản phẩm đã xem:", error);
    } finally {
      setLoading(false);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isYesterday = (date: Date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    );
  };

  const filteredProducts = useMemo(() => {
    return recentViews.filter((p) => {
        const viewDate = p.viewed_at ? new Date(p.viewed_at) : new Date();
        viewDate.setHours(0, 0, 0, 0);

        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);

        if (!endDate) {
          return viewDate.getTime() === s.getTime();
        }

        const e = new Date(endDate);
        e.setHours(0, 0, 0, 0);

        const minD = s.getTime() <= e.getTime() ? s : e;
        const maxD = s.getTime() > e.getTime() ? s : e;

        return viewDate.getTime() >= minD.getTime() && viewDate.getTime() <= maxD.getTime();
    });
  }, [startDate, endDate, recentViews]);

  const getProductImageUrl = (path: string | null) => {
    if (!path) return "https://via.placeholder.com/150";
    if (path.startsWith("http")) return path;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/product-images/${path}`;
  };

  const renderProductItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.productCard}
      activeOpacity={0.8}
      onPress={() => router.push(`/(shop)/product/${item.id}`)}
    >
      <Image source={{ uri: getProductImageUrl(item.image) }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <PriceDisplay 
          originalPrice={item.originalPrice || item.price || 0}
          finalPrice={item.price || 0}
          hasDiscount={item.hasDiscount}
          size="sm"
        />
      </View>
    </TouchableOpacity>
  );

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const Calendar = () => {
    const days = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = getDaysInMonth(year, month);
    
    // Tìm ngày bắt đầu của tháng (0: CN, 1: Thứ 2...)
    const firstDay = new Date(year, month, 1).getDay();

    // Thêm các ô trống nếu tháng không bắt đầu từ Chủ Nhật (hoặc Thứ 2 tùy logic, ở đây làm đơn giản theo lưới)
    // Để giống ảnh 43, ta thấy các ngày xếp từ 01, không cần padding đầu tháng nếu layout yêu cầu gọn
    for (let i = 1; i <= totalDays; i++) {
        days.push(i);
    }

    const monthNames = [
        "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
        "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
    ];

    const changeMonth = (offset: number) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + offset);
        setCurrentMonth(newMonth);
    };

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
            <ChevronLeft size={20} color={COLORS.blue} />
          </TouchableOpacity>
          <View style={styles.monthPill}>
            <Text style={styles.monthText}>{monthNames[month]}</Text>
          </View>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
            <ChevronRight size={20} color={COLORS.blue} />
          </TouchableOpacity>
        </View>

        <View style={styles.daysGrid}>
          {days.map((day) => {
            const cellDate = new Date(year, month, day);
            cellDate.setHours(0, 0, 0, 0);
            
            const time = cellDate.getTime();
            
            const s = new Date(startDate);
            s.setHours(0, 0, 0, 0);
            const startT = s.getTime();
            
            let endT = null;
            if (endDate) {
               const e = new Date(endDate);
               e.setHours(0, 0, 0, 0);
               endT = e.getTime();
            }

            let isSelected = false;
            let isRange = false;

            if (endT) {
              const minT = Math.min(startT, endT);
              const maxT = Math.max(startT, endT);
              if (time === minT || time === maxT) isSelected = true;
              else if (time > minT && time < maxT) isRange = true;
            } else {
              isSelected = time === startT;
            }
            
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCell, 
                  isSelected && styles.selectedDayCell,
                  isRange && styles.rangeDayCell
                ]}
                onPress={() => {
                    const newDate = new Date(year, month, day);
                    newDate.setHours(0,0,0,0);
                    
                    if (startDate && endDate) {
                       setStartDate(newDate);
                       setEndDate(null);
                    } else if (startDate && !endDate) {
                       setEndDate(newDate);
                    } else {
                       setStartDate(newDate);
                    }
                }}
              >
                <Text style={[
                  styles.dayText, 
                  isSelected && styles.selectedDayText,
                  isRange && { color: COLORS.blue }
                ]}>
                  {day < 10 ? `0${day}` : day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity 
            style={styles.collapseBtn} 
            onPress={() => setIsCalendarOpen(false)}
        >
          <ChevronUp size={24} color={COLORS.blue} />
        </TouchableOpacity>
      </View>
    );
  };

  const formatDateLabel = () => {
    if (!endDate) {
      if (isToday(startDate)) return "Hôm nay";
      if (isYesterday(startDate)) return "Hôm qua";
      return `${startDate.getDate()} thg ${startDate.getMonth() + 1}`;
    }
    const start = startDate.getTime() <= endDate.getTime() ? startDate : endDate;
    const end = startDate.getTime() > endDate.getTime() ? startDate : endDate;
    return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <CommonHeader
        renderLeft={() => (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={28} color={COLORS.dark} />
          </TouchableOpacity>
        )}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Đã xem gần đây</Text>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.pillsContainer}>
          {/* Nút Hôm nay */}
          <TouchableOpacity
            style={[
              styles.pill,
              isToday(startDate) && !endDate && styles.activePill,
            ]}
            onPress={() => { setStartDate(new Date()); setEndDate(null); }}
          >
            <Text
              style={[
                styles.pillText,
                isToday(startDate) && !endDate && styles.activePillText,
              ]}
            >
              Hôm nay
            </Text>
            {isToday(startDate) && !endDate && (
              <CircleCheck size={18} color={COLORS.white} fill={COLORS.blue} />
            )}
          </TouchableOpacity>

          {!isToday(startDate) || endDate ? (
            <TouchableOpacity
              style={[styles.pill, styles.selectedPill]}
              onPress={() => setIsCalendarOpen(true)}
            >
              <Text style={[styles.pillText, styles.activePillText]}>
                {formatDateLabel()}
              </Text>
              <CircleCheck size={18} color={COLORS.white} fill={COLORS.blue} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.pill}
              onPress={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setStartDate(yesterday);
                setEndDate(null);
              }}
            >
              <Text style={styles.pillText}>Hôm qua</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.calendarTrigger}
          onPress={() => setIsCalendarOpen(!isCalendarOpen)}
        >
          {isCalendarOpen ? (
              <ChevronUp size={24} color={COLORS.white} />
          ) : (
              <ChevronDown size={24} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>

      {isCalendarOpen && <Calendar />}

      {loading ? (
        <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={COLORS.blue} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không tìm thấy sản phẩm nào đã xem vào ngày này.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  backBtn: {
    marginLeft: 24,
    marginTop: 10,
    marginBottom: 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "900", // Thổi bùng phong cách premium từ WishlistScreen
    color: COLORS.dark,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  pillsContainer: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: COLORS.lightGray,
    gap: 8,
  },
  activePill: {
    backgroundColor: COLORS.lightBlue,
  },
  selectedPill: { // Đã thêm lại style này để fix lint
    backgroundColor: COLORS.lightBlue,
  },
  pillText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#666",
  },
  activePillText: {
    color: COLORS.blue,
  },
  calendarTrigger: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.blue,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 24,
  },
  productCard: {
    width: COLUMN_WIDTH,
  },
  productImage: {
    width: "100%",
    height: COLUMN_WIDTH * 1.3,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  productInfo: {
    marginTop: 12,
  },
  productName: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
    fontWeight: "400",
  },

  calendarContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 32,
    padding: 24,
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  monthNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  monthPill: {
    backgroundColor: COLORS.lightBlue,
    paddingVertical: 10,
    paddingHorizontal: 48,
    borderRadius: 24,
  },
  monthText: {
    color: COLORS.blue,
    fontSize: 16,
    fontWeight: "bold",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  dayCell: {
    width: (width - 48 - 48) / 7, // paddingHorizontal: 24 * 2 - padding Calendar: 24 * 2
    height: (width - 48 - 48) / 7,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderRadius: 20,
  },
  selectedDayCell: {
    backgroundColor: COLORS.blue,
  },
  rangeDayCell: {
    backgroundColor: COLORS.lightBlue,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  selectedDayText: {
    color: COLORS.white,
  },
  collapseBtn: {
    alignSelf: "center",
    marginTop: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
  },
});
