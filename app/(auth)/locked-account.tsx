import { supabase } from "@/src/lib/supabase";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function LockedAccountScreen() {
  const [lockReason, setLockReason] = useState<string | null>(null);
  const [lockedAt, setLockedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLockInfo();
  }, []);

  const fetchLockInfo = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("is_locked, lock_reason, locked_at")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data?.is_locked) {
        setLockReason(data.lock_reason);
        setLockedAt(data.locked_at);
      } else {
        // Nếu không bị khóa, chuyển về trang chủ
        router.replace("/(shop)/(tabs)");
      }
    } catch (error) {
      console.error("Error fetching lock info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Đang kiểm tra trạng thái tài khoản...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.lockIconContainer}>
          <View style={styles.lockIconBg}>
            {/* Lock Icon SVG */}
            <View style={styles.lockIcon}>
              <View style={styles.lockBody} />
              <View style={styles.lockShackle} />
            </View>
          </View>
        </View>

        <Text style={styles.title}>Tài khoản của bạn đã bị khóa</Text>
        <Text style={styles.subtitle}>
          Tài khoản này không thể truy cập do vi phạm chính sách của chúng tôi
        </Text>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Thông tin khóa tài khoản</Text>
            <Text style={styles.cardSubtitle}>Vui lòng đọc kỹ thông tin dưới đây</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Lý do khóa:</Text>
          <Text style={styles.infoValue}>{lockReason || "Không có lý do cụ thể"}</Text>
        </View>

        {lockedAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời gian khóa:</Text>
            <Text style={styles.infoValue}>
              {new Date(lockedAt).toLocaleString("vi-VN")}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>🤔 Cần hỗ trợ?</Text>
          <Text style={styles.supportText}>
            Nếu bạn cho rằng đây là nhầm lẫn hoặc muốn kháng cáo, vui lòng liên hệ bộ phận hỗ trợ qua email:
          </Text>
          <Text style={styles.emailText}>support@eshop.vn</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => {
            // Mở email client
            // Linking.openURL('mailto:support@eshop.vn');
            Alert.alert("Hỗ trợ", "Vui lòng gửi email đến support@eshop.vn");
          }}
        >
          <Text style={styles.contactButtonText}>Liên hệ hỗ trợ</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2026 E-Shop. Tất cả các quy định và chính sách được áp dụng.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerSection: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: "#fef2f2",
  },
  lockIconContainer: {
    marginBottom: 24,
  },
  lockIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 8px 16px rgba(220, 38, 38, 0.3)",
    elevation: 8,
  },
  lockIcon: {
    width: 60,
    height: 70,
    position: "relative",
  },
  lockBody: {
    position: "absolute",
    bottom: 0,
    left: "50%",
    transform: [{ translateX: -25 }],
    width: 50,
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 4,
    borderColor: "#dc2626",
  },
  lockShackle: {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: [{ translateX: -20 }],
    width: 40,
    height: 30,
    borderWidth: 6,
    borderColor: "#dc2626",
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  card: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  warningIcon: {
    fontSize: 24,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 16,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#1f2937",
    lineHeight: 24,
  },
  supportSection: {
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e40af",
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 22,
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#dc2626",
  },
  actionContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  logoutButton: {
    backgroundColor: "#1f2937",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  contactButton: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#dc2626",
  },
  contactButtonText: {
    color: "#dc2626",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
  },
});
