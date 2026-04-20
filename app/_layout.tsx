import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "@/src/auth/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WebUIProvider } from "@/src/context/WebUIContext";

// Root Navigation Layout
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <WebUIProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="(shop)" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </WebUIProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}