import CommonHeader from "@/src/components/layout/Header";
import { router } from "expo-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleCheck,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
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

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  viewedDate: Date;
}

const MOCK_DATA: Product[] = [
  {
    id: "1",
    name: "Lorem ipsum dolor sit amet consectetur",
    price: 17000,
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=500",
    viewedDate: new Date(),
  },
  {
    id: "2",
    name: "Lorem ipsum dolor sit amet consectetur",
    price: 17000,
    image: "https://images.unsplash.com/photo-1539109132381-31a1b9d5923b?q=80&w=500",
    viewedDate: new Date(),
  },
  {
    id: "3",
    name: "Lorem ipsum dolor sit amet consectetur",
    price: 17000,
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=500",
    viewedDate: new Date(new Date().setDate(new Date().getDate() - 1)),
  },
  {
    id: "4",
    name: "Lorem ipsum dolor sit amet consectetur",
    price: 17000,
    image: "https://images.unsplash.com/photo-1485230895905-ec4093e81ea2?q=80&w=500",
    viewedDate: new Date(new Date().setDate(new Date().getDate() - 1)),
  },
  {
    id: "5",
    name: "Lorem ipsum dolor sit amet consectetur",
    price: 17000,
    image: "https://images.unsplash.com/photo-1529139513065-07b2c2390598?q=80&w=500",
    viewedDate: new Date(2026, 3, 18), // 18 tháng 4
  },
  {
    id: "6",
    name: "Lorem ipsum dolor sit amet consectetur",
    price: 17000,
    image: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?q=80&w=500",
    viewedDate: new Date(2026, 3, 18),
  },
];

export default function RecentlyViewedScreen() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3, 1)); // Tháng 4, 2026

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
    return MOCK_DATA.filter(
      (p) =>
        p.viewedDate.getDate() === selectedDate.getDate() &&
        p.viewedDate.getMonth() === selectedDate.getMonth() &&
        p.viewedDate.getFullYear() === selectedDate.getFullYear()
    );
  }, [selectedDate]);

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>
          {item.price.toLocaleString("vi-VN")}đ
        </Text>
      </View>
    </View>
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
            const isSelected = 
                selectedDate.getDate() === day && 
                selectedDate.getMonth() === month && 
                selectedDate.getFullYear() === year;
            
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayCell, isSelected && styles.selectedDayCell]}
                onPress={() => {
                    const newDate = new Date(year, month, day);
                    setSelectedDate(newDate);
                }}
              >
                <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>
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

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return "Hôm nay";
    if (isYesterday(date)) return "Hôm qua";
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const months = [
        "tháng 1", "tháng 2", "tháng 3", "tháng 4", "tháng 5", "tháng 6",
        "tháng 7", "tháng 8", "tháng 9", "tháng 10", "tháng 11", "tháng 12"
    ];
    return `${day} ${months[date.getMonth()]}`;
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
              isToday(selectedDate) && styles.activePill,
            ]}
            onPress={() => setSelectedDate(new Date())}
          >
            <Text
              style={[
                styles.pillText,
                isToday(selectedDate) && styles.activePillText,
              ]}
            >
              Hôm nay
            </Text>
            {isToday(selectedDate) && (
              <CircleCheck size={18} color={COLORS.white} fill={COLORS.blue} />
            )}
          </TouchableOpacity>

          {/* Nút Hôm qua hoặc Ngày đã chọn */}
          {!isToday(selectedDate) ? (
            <TouchableOpacity
              style={[styles.pill, styles.selectedPill]}
              onPress={() => setIsCalendarOpen(true)}
            >
              <Text style={[styles.pillText, styles.activePillText]}>
                {formatDateLabel(selectedDate)}
              </Text>
              <CircleCheck size={18} color={COLORS.white} fill={COLORS.blue} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.pill}
              onPress={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setSelectedDate(yesterday);
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

      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không tìm thấy sản phẩm nào đã xem.</Text>
          </View>
        }
      />
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
  productPrice: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
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
