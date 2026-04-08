import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "@/src/auth/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Root Navigation Layout
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(shop)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}