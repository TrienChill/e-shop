// eslint-disable-next-line import/no-named-as-default
import CommonHeader from "@/src/components/layout/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ArrowRight, Bell, Play, Settings, Ticket, Wallet, Package, Truck, Star } from "lucide-react-native";
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabase";
import { useFocusEffect } from "expo-router";
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const [profile, setProfile] = useState<any>(null);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else {
          setProfile(data);
        }
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  // Hàm xử lý đăng xuất
  const logout = async () => {
    await AsyncStorage.removeItem("userToken");
    router.replace("./auth/login");
  };

  // Thành phần nút trạng thái đơn hàng kiểu Shopee (Icon + Text)
  const OrderIconButton = ({
    title,
    icon: Icon,
    hasNotification,
    onPress,
  }: {
    title: string;
    icon: any;
    hasNotification?: boolean;
    onPress?: () => void;
  }) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.orderIconButton}
      >
        <View style={styles.iconContainer}>
          <Icon size={28} color={COLOR.dark} strokeWidth={1.5} />
          {hasNotification && <View style={styles.iconBadge} />}
        </View>
        <Text style={styles.orderIconText}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const getAvatarUrl = (path: string | null) => {
    if (!path)
      return "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop";
    if (path.startsWith("http")) return path;
    // Assuming 'avatars' is the bucket name as seen in reviews.tsx
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/avatars/${path}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      {/* Phần Header (Ảnh đại diện và các nút chức năng) */}
      <CommonHeader
        renderLeft={() => (
          <>
            <Image
              source={{
                uri: getAvatarUrl(profile?.avatar_url),
              }}
              style={styles.avatar}
            />
            <TouchableOpacity
              style={styles.myActivityButton}
              activeOpacity={0.8}
              onPress={() => router.push("/my-activity")}
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
          <Text style={styles.welcomeText}>Chào, {profile?.full_name || "Triển Chill"}!</Text>
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

          <View style={styles.orderGrid}>
            <OrderIconButton
              title="Chờ xác nhận"
              icon={Wallet}
              hasNotification={true}
              onPress={() =>
                router.push({
                  pathname: "/to-receive",
                  params: { status: "pending" },
                })
              }
            />
            <OrderIconButton
              title="Chờ lấy hàng"
              icon={Package}
              hasNotification={true}
              onPress={() =>
                router.push({
                  pathname: "/to-receive",
                  params: { status: "processing" },
                })
              }
            />
            <OrderIconButton
              title="Chờ giao hàng"
              icon={Truck}
              hasNotification={true}
              onPress={() =>
                router.push({
                  pathname: "/to-receive",
                  params: { status: "shipping" },
                })
              }
            />
            <OrderIconButton
              title="Đánh giá"
              icon={Star}
              hasNotification={true}
              onPress={() => {
                router.push({
                  pathname: "/reviews",
                });
              }}
            />
          </View>
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
  orderGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: COLOR.white,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  orderIconButton: {
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    position: "relative",
    marginBottom: 8,
  },
  orderIconText: {
    fontSize: 12,
    color: COLOR.dark,
    textAlign: "center",
    fontWeight: "500",
  },
  iconBadge: {
    position: "absolute",
    top: -2,
    right: -4,
    backgroundColor: COLOR.red,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
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
