import CommonHeader from "@/src/components/layout/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ArrowRight, Bell, Play, Settings, Ticket } from "lucide-react-native";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Bảng màu hệ thống
const COLOR = {
  blue: "#0055FF",
  white: "#FFFFFF",
  lightGray: "#F5F5F5",
  lightBlue: "#E8EFFF",
  textSecondary: "#666666",
  red: "#FF4D4D",
  green: "#4CAF50",
  dark: "#1A1A1A",
};

// Dữ liệu mẫu cho "Đã xem gần đây"
const RECENTLY_VIEWED = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1539109132374-34fa48d3a829?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1554412930-bc96efecdc3c?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529139513477-42f4d94d8128?q=80&w=200&auto=format&fit=crop",
];

// Dữ liệu mẫu cho "Khoảnh khắc" (Stories)
const STORIES = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1529139513477-42f4d94d8128?q=80&w=400&auto=format&fit=crop",
    isLive: true,
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=400&auto=format&fit=crop",
    isLive: false,
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=400&auto=format&fit=crop",
    isLive: false,
  },
  {
    id: 4,
    image:
      "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?q=80&w=400&auto=format&fit=crop",
    isLive: false,
  },
];

export default function ProfileScreen() {
  const [activeOrderTab, setActiveOrderTab] = useState("Đang giao");

  // Hàm xử lý đăng xuất
  const logout = async () => {
    await AsyncStorage.removeItem("userToken");
    router.replace("./auth/login");
  };

  // Thành phần nút trạng thái đơn hàng (Capsule Button)
  const OrderStatusButton = ({
    title,
    hasNotification,
    onPress,
  }: {
    title: string;
    hasNotification?: boolean;
    onPress?: () => void;
  }) => {
    const isActive = activeOrderTab === title;
    return (
      <TouchableOpacity
        onPress={() => {
          setActiveOrderTab(title);
          onPress?.();
        }}
        activeOpacity={0.7}
        style={[
          styles.capsuleButton,
          { backgroundColor: isActive ? COLOR.blue : COLOR.lightBlue },
        ]}
      >
        <Text
          style={[
            styles.capsuleText,
            { color: isActive ? COLOR.white : COLOR.blue },
          ]}
        >
          {title}
        </Text>
        {hasNotification && <View style={styles.tabBadge} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Phần Header (Ảnh đại diện và các nút chức năng) */}
      <CommonHeader
        renderLeft={() => (
          <>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
              }}
              style={styles.avatar}
            />
            <TouchableOpacity
              style={styles.myActivityButton}
              activeOpacity={0.8}
            >
              <Text style={styles.myActivityText}>Hoạt động</Text>
            </TouchableOpacity>
          </>
        )}
        renderRight={() => (
          <>
            <TouchableOpacity style={styles.iconButton}>
              <Ticket size={22} color={COLOR.dark} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Bell size={22} color={COLOR.dark} />
              <View style={styles.filterBadge} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={logout}>
              <Settings size={22} color={COLOR.dark} />
            </TouchableOpacity>
          </>
        )}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Lời chào mừng */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Chào, Triển Chill!</Text>
        </View>

        {/* Khung Thông báo (Announcement Card) */}
        <TouchableOpacity style={styles.announcementCard} activeOpacity={0.9}>
          <View style={styles.announcementTextContainer}>
            <Text style={styles.announcementTitle}>Thông báo</Text>
            <Text style={styles.announcementDesc}>
              Ưu đãi đặc biệt giảm giá lên đến 50% cho tất cả các sản phẩm thời
              trang nữ trong tuần này.
            </Text>
          </View>
          <View style={styles.arrowButton}>
            <ArrowRight size={20} color="white" strokeWidth={3} />
          </View>
        </TouchableOpacity>

        {/* Danh sách sản phẩm đã xem gần đây */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đã xem gần đây</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {RECENTLY_VIEWED.map((uri, index) => (
              <View key={index} style={styles.recentViewedItemContainer}>
                <View style={styles.recentViewedItem}>
                  <Image source={{ uri }} style={styles.recentViewedImage} />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Phần trạng thái Đơn hàng của tôi */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Đơn hàng của tôi</Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/to-receive",
                  params: { status: "history" },
                })
              }
              activeOpacity={0.6}
            >
              <Text style={styles.seeHistoryText}>Lịch sử mua hàng</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.orderTabs}
          >
            <OrderStatusButton
              title="Chờ xác nhận"
              hasNotification={true}
              onPress={() =>
                router.push({
                  pathname: "/to-receive",
                  params: { status: "pending" },
                })
              }
            />
            <OrderStatusButton
              title="Chờ lấy hàng"
              hasNotification={true}
              onPress={() =>
                router.push({
                  pathname: "/to-receive",
                  params: { status: "processing" },
                })
              }
            />
            <OrderStatusButton
              title="Chờ giao hàng"
              hasNotification={true}
              onPress={() =>
                router.push({
                  pathname: "/to-receive",
                  params: { status: "shipping" },
                })
              }
            />
            <OrderStatusButton
              title="Đánh giá"
              hasNotification={true}
              // Xử lý sau
            />
          </ScrollView>
        </View>

        {/* Phần Khoảnh khắc/Stories Video */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Khoảnh khắc</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {STORIES.map((story) => (
              <TouchableOpacity
                key={story.id}
                style={styles.storyCard}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: story.image }}
                  style={styles.storyImage}
                />
                <View style={styles.storyOverlay}>
                  {story.isLive && (
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveText}>TRỰC TIẾP</Text>
                    </View>
                  )}
                  <View style={styles.playIconOverlay}>
                    <View style={styles.playBlurCircle}>
                      <Play size={20} color="white" fill="white" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Khoảng cách lề dưới cho ScrollView */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.white,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#FF7676", // Viền gradient màu hồng như trong thiết kế
  },
  myActivityButton: {
    backgroundColor: COLOR.blue,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 4,
    shadowColor: COLOR.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  myActivityText: {
    color: COLOR.white,
    fontWeight: "700",
    fontSize: 14,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    backgroundColor: COLOR.lightBlue,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00D1FF", // Chấm thông báo xanh dương nhạt
    borderWidth: 2,
    borderColor: COLOR.lightBlue,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 36,
    fontWeight: "800",
    color: COLOR.dark,
    letterSpacing: -0.5,
  },
  announcementCard: {
    backgroundColor: "#F7F8FA",
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  announcementTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  announcementTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLOR.dark,
    marginBottom: 6,
  },
  announcementDesc: {
    color: COLOR.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  arrowButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLOR.blue,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: COLOR.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLOR.dark,
    letterSpacing: -0.5,
  },
  seeHistoryText: {
    fontSize: 14,
    color: COLOR.blue,
    fontWeight: "600",
  },
  horizontalScroll: {
    gap: 16,
    paddingBottom: 10, // Tạo khoảng trống cho bóng đổ (shadow)
  },
  recentViewedItemContainer: {
    padding: 4,
  },
  recentViewedItem: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLOR.white,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
    borderWidth: 4,
    borderColor: COLOR.white,
  },
  recentViewedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 42,
  },
  orderTabs: {
    flexDirection: "row",
    gap: 12,
  },
  capsuleButton: {
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: "relative",
    minWidth: 100,
    alignItems: "center",
  },
  capsuleText: {
    fontSize: 14,
    fontWeight: "700",
  },
  tabBadge: {
    position: "absolute",
    top: 0,
    right: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLOR.red,
    borderWidth: 2.5,
    borderColor: COLOR.white,
  },
  storyCard: {
    width: 160,
    height: 240,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: COLOR.lightGray,
  },
  storyImage: {
    width: "100%",
    height: "100%",
  },
  storyOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 12,
  },
  liveBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#00E676", // Màu xanh lá sáng cho TRỰC TIẾP
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  liveText: {
    color: COLOR.white,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  playIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playBlurCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
});
