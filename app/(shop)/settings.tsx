import CommonHeader from "@/src/components/layout/Header";
import { supabase } from "@/src/lib/supabase";
import { router } from "expo-router";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface SettingItemProps {
  label: string;
  value?: string;
  onPress: () => void;
  isRed?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  label,
  value,
  onPress,
  isRed = false,
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingItem,
        pressed && styles.pressedItem,
      ]}
    >
      <Text style={[styles.label, isRed && styles.redText]}>{label}</Text>
      <View style={styles.itemRight}>
        {value && <Text style={styles.value}>{value}</Text>}
        <ChevronRight size={20} color={isRed ? "#F87171" : "#94A3B8"} />
      </View>
    </Pressable>
  );
};

const SectionHeader = ({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const SettingsScreen = () => {
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.replace("/(auth)/login");
    }
  };

  const appName = "E-Shop";

  return (
    <SafeAreaView style={styles.container}>
      {/* StatusBar chỉ có ý nghĩa trên native */}
      {Platform.OS !== "web" && <StatusBar barStyle="dark-content" />}

      <CommonHeader
        renderLeft={() => <Text style={styles.headerTitle}>Cài đặt</Text>}
        renderRight={() => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color="#2563EB" />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Nhóm Cá nhân */}
        <SectionHeader title="Cá nhân" />
        <View style={styles.sectionContainer}>
          <SettingItem
            label="Hồ sơ"
            onPress={() => router.push("/edit-profile")}
          />
          <SettingItem
            label="Địa chỉ nhận hàng"
            onPress={() => router.push("/edit-address")}
          />
          <SettingItem
            label="Phương thức thanh toán"
            onPress={() => router.push("/payment-methods")}
          />
        </View>

        {/* Nhóm Tài khoản */}
        <SectionHeader title="Tài khoản" />
        <View style={styles.sectionContainer}>
          <SettingItem label="Ngôn ngữ" value="Tiếng Việt" onPress={() => {}} />
          <SettingItem label="Về E-Shop" onPress={() => {}} />
          <SettingItem label="Đăng xuất" onPress={logout} />
        </View>

        {/* Footer actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.6}>
            <Text style={styles.deleteText}>Xóa tài khoản của tôi</Text>
          </TouchableOpacity>

          <View style={styles.versionInfo}>
            <Text style={styles.brandName}>{appName}</Text>
            <Text style={styles.versionText}>Phiên bản 1.0 Tháng 4, 2026</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    // Trên web cần đảm bảo chiếm toàn màn hình
    ...(Platform.OS === "web" ? { minHeight: "100vh" as any } : {}),
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0F172A",
  },
  backBtn: {
    width: 44,
    height: 44,
    backgroundColor: "#EFF6FF",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0F172A",
  },
  sectionContainer: {
    paddingHorizontal: 24,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  pressedItem: {
    backgroundColor: "#F8FAFC",
    opacity: 0.7,
  },
  label: {
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "500",
    flex: 1, // chiếm không gian còn lại → đẩy itemRight sang phải
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0, // không bị thu nhỏ → luôn hiển thị đủ icon
    marginLeft: 8,
  },
  value: {
    fontSize: 16,
    color: "#64748B",
    marginRight: 8,
  },
  footer: {
    marginTop: 40,
    paddingHorizontal: 24,
  },
  deleteBtn: {
    paddingVertical: 12,
  },
  deleteText: {
    fontSize: 15,
    color: "#FCA3A3",
    fontWeight: "500",
  },
  versionInfo: {
    marginTop: 24,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 4,
  },
  versionText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  redText: {
    color: "#FCA3A3",
  },
});

export default SettingsScreen;
