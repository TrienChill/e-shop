// app/(admin)/_layout.tsx
import { useAuth } from "@/src/auth/AuthContext";
import { Link, Redirect, Slot } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

function debugLog(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch("http://127.0.0.1:7797/ingest/e442deb0-be17-422a-a916-36b6ffe053c6", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "763e45",
    },
    body: JSON.stringify({
      sessionId: "763e45",
      runId: "pre-fix",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

export default function AdminLayout() {
  const { session, role, roleError, loading, userId, refreshRole } = useAuth();

  // Nếu là Mobile mà lỡ vào route admin -> Hiển thị dạng Stack bình thường
  if (Platform.OS !== 'web') {
    return <Slot />;
  }

  if (loading) {
    debugLog("H4_guard_branch", "app/(admin)/_layout.tsx:loading", "guard:loading", { loading });
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    debugLog("H4_guard_branch", "app/(admin)/_layout.tsx:noSession", "guard:redirectLogin", { hasSession: false });
    return <Redirect href={"/(auth)/login" as any} />;
  }

  // If we cannot resolve role, show a diagnostic screen instead of redirecting
  // so you can see the auth UID and whether profiles lookup is failing.
  if (!role) {
    debugLog("H4_guard_branch", "app/(admin)/_layout.tsx:noRole", "guard:noRole", {
      userId,
      role,
      roleError,
      hasSession: true,
    });
    return (
      <View style={styles.diagnosticWrap}>
        <View style={styles.diagnosticCard}>
          <Text style={styles.diagnosticTitle}>Không lấy được quyền (role)</Text>
          <Text style={styles.diagnosticText}>
            auth.uid(): <Text style={styles.mono}>{userId ?? "-"}</Text>
          </Text>
          <Text style={styles.diagnosticText}>
            role hiện tại: <Text style={styles.mono}>{String(role)}</Text>
          </Text>
          {roleError ? (
            <Text style={[styles.diagnosticText, { color: "#B91C1C" }]}>
              Lỗi query profiles.role: <Text style={styles.mono}>{roleError}</Text>
            </Text>
          ) : (
            <Text style={styles.diagnosticText}>
              Không có lỗi nhưng không tìm thấy dòng trong bảng profiles khớp với UID.
            </Text>
          )}

          <Pressable style={styles.retryBtn} onPress={() => refreshRole()}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>

          <Pressable
            style={[styles.retryBtn, { backgroundColor: "#111827" }]}
            onPress={() => (window.location.href = "/(shop)/(tabs)" as any)}
          >
            <Text style={styles.retryBtnText}>Về app user</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (role !== "admin" && role !== "staff") {
    debugLog("H4_guard_branch", "app/(admin)/_layout.tsx:roleNotAllowed", "guard:redirectShop", {
      userId,
      role,
      hasSession: true,
    });
    return <Redirect href={"/(shop)/(tabs)" as any} />;
  }

  // Giao diện Admin Dashboard trên Web
  return (
    <View style={styles.container}>
      {/* SIDEBAR BÊN TRÁI */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>Backoffice</Text>

        <SidebarLink href="/(admin)/products" label="Sản phẩm" />
        <SidebarLink href="/(admin)/orders" label="Đơn hàng" />

        {role === "admin" ? (
          <>
            <SidebarLink href="/(admin)/revenue" label="Doanh thu" />
            <SidebarLink href="/(admin)/vouchers" label="Voucher" />
          </>
        ) : null}
      </View>

      {/* NỘI DUNG CHÍNH BÊN PHẢI */}
      <View style={styles.content}>
        <Slot /> {/* Các màn hình con (dashboard, products...) sẽ hiện ở đây */}
      </View>
    </View>
  );
}

function SidebarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable style={styles.menuItem}>
        <Text style={styles.menuItemText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  diagnosticWrap: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  diagnosticCard: {
    width: "100%",
    maxWidth: 720,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  diagnosticTitle: { fontSize: 16, fontWeight: "800", marginBottom: 10 },
  diagnosticText: { fontSize: 13, color: "#374151", marginBottom: 8 },
  mono: { fontFamily: Platform.select({ web: "monospace" as any, default: undefined }) },
  retryBtn: {
    marginTop: 10,
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  retryBtnText: { color: "white", fontWeight: "800" },
  container: { flex: 1, flexDirection: "row", height: "100%" },
  sidebar: { width: 260, backgroundColor: "#111827", padding: 20 },
  sidebarTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.9,
    marginBottom: 16,
  },
  content: { flex: 1, backgroundColor: "#F9FAFB", padding: 20 },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  menuItemText: { color: "white", fontSize: 14, fontWeight: "700" },
});