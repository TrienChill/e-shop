// app/index.tsx
import { useAuth } from "@/src/auth/AuthContext";
import { Redirect, useRootNavigationState } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const { session, role, loading } = useAuth();

  // Chờ navigation sẵn sàng VÀ auth (session + role) đã được resolve
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

  return <Redirect href={href as any} />;
}