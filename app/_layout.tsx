import { Stack } from 'expo-router';

// Root Navigation Layout
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(shop)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}