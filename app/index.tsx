// app/index.tsx
import { useAuth } from "@/src/auth/AuthContext";
import { Redirect, useRootNavigationState } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, View } from 'react-native';

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

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const { session, role, loading, userId } = useAuth();

  // Kiểm tra xem hệ thống navigation đã sẵn sàng chưa
  if (!rootNavigationState?.key || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const href = useMemo(() => {
    if (!session) return "/(auth)/login";
    if (role === "admin" || role === "staff") return "/(admin)/orders";
    return "/(shop)/(tabs)";
  }, [session, role]);

  debugLog("H6_index_should_route_by_role", "app/index.tsx:redirect", "index:redirect", {
    hasSession: Boolean(session),
    userId: userId ?? null,
    role: role ?? null,
    href,
  });

  return <Redirect href={href as any} />;
}